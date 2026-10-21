-- OpenDollars pilot schema (Postgres 13+). IBKR is the book of record; this mirrors it plus in-flight state.
-- All money is integer US cents.
CREATE TABLE clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country      char(2) NOT NULL CHECK (country IN ('AR','BR')),
  kyc_status   text NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','passed','rejected','edd')),
  sanctioned   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL UNIQUE REFERENCES clients(id),
  ibkr_account text UNIQUE,
  ibkr_status  text NOT NULL DEFAULT 'pending' CHECK (ibkr_status IN ('pending','open','restricted','closed')),
  model_id     text,
  CHECK (ibkr_status = 'pending' OR ibkr_account IS NOT NULL)
);

CREATE TABLE deposits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES accounts(id),
  lane          text NOT NULL CHECK (lane IN ('ar_usdc','ar_swift','br_efx','br_fxbank')),
  amount_cents  bigint NOT NULL CHECK (amount_cents > 0),
  state         text NOT NULL DEFAULT 'kyc_passed' CHECK (state IN ('kyc_passed','ibkr_open','deposit_notified',
                  'partner_collected','fx_executed','wire_sent','broker_credited','invested','returned')),
  idem_key      text NOT NULL UNIQUE,
  collected_at  timestamptz,
  credited_cents bigint CHECK (credited_cents > 0), -- what IBKR actually credited; gross minus this = route costs
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Res. BCB 561: the eFX lane never carries more than US$10,000 in one operation.
  CHECK (lane <> 'br_efx' OR amount_cents <= 1000000)
);

-- Append-only audit trail of every state change.
CREATE TABLE deposit_events (
  id          bigserial PRIMARY KEY,
  deposit_id  uuid NOT NULL REFERENCES deposits(id),
  from_state  text NOT NULL,
  to_state    text NOT NULL,
  at          timestamptz NOT NULL DEFAULT now()
);

-- Double-entry cash ledger. Every txn_id must sum to zero at commit (trigger below).
CREATE TABLE ledger_entries (
  id          bigserial PRIMARY KEY,
  txn_id      uuid NOT NULL,
  account_id  uuid NOT NULL REFERENCES accounts(id),
  bucket      text NOT NULL,           -- client_bank | in_flight | ibkr_cash | invested | fees:<name>
  cents       bigint NOT NULL CHECK (cents <> 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_txn ON ledger_entries (txn_id);

CREATE FUNCTION ledger_txn_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COALESCE(SUM(cents), 0) FROM ledger_entries WHERE txn_id = NEW.txn_id) <> 0 THEN
    RAISE EXCEPTION 'ledger txn % does not balance', NEW.txn_id;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER ledger_balanced AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_txn_balanced();

-- The ledger is append-only: corrections are new reversing entries.
CREATE FUNCTION ledger_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'ledger_entries is append-only'; END $$;
CREATE TRIGGER ledger_no_update BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();
CREATE TRIGGER deposit_events_no_update BEFORE UPDATE OR DELETE ON deposit_events
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();

-- Outbox: every external call is written here in the same transaction as the state change,
-- then sent by a worker. idem_key is also sent to the provider so retries are safe.
CREATE TABLE outbox (
  id          bigserial PRIMARY KEY,
  idem_key    text NOT NULL UNIQUE,
  target      text NOT NULL,           -- 'ibkr' | 'partner:<name>'
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  attempts    int NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error  text
);
CREATE INDEX outbox_unsent ON outbox (created_at) WHERE sent_at IS NULL;

-- Share quantities per account, from fills. Append-only; source makes fill import idempotent.
CREATE TABLE position_events (
  id          bigserial PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES accounts(id),
  isin        text NOT NULL CHECK (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  qty         numeric(20,8) NOT NULL CHECK (qty <> 0),
  source      text NOT NULL,           -- order idem_key or corporate-action id
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, account_id, isin)
);
CREATE TRIGGER position_events_no_update BEFORE UPDATE OR DELETE ON position_events
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();

-- Cash movements IBKR reports that we did not originate (client withdrawals in IBKR's portal, interest, fees).
CREATE TABLE ibkr_cash_events (
  ibkr_txn_id text PRIMARY KEY,         -- IBKR transactionID: re-importing a statement is a no-op
  account_id  uuid NOT NULL REFERENCES accounts(id),
  kind        text NOT NULL CHECK (kind IN ('withdrawal','interest','fee','other')),
  cents       bigint NOT NULL CHECK (cents <> 0),
  imported_at timestamptz NOT NULL DEFAULT now()
);

-- Reconciliation breaks; first_seen drives the one-business-day alert. One open break per key.
CREATE TABLE recon_breaks (
  id          bigserial PRIMARY KEY,
  account_ref text NOT NULL,
  key         text NOT NULL,
  ours        numeric NOT NULL,
  ibkr        numeric NOT NULL,
  first_seen  timestamptz NOT NULL,
  resolved_at timestamptz
);
CREATE UNIQUE INDEX recon_breaks_open ON recon_breaks (account_ref, key) WHERE resolved_at IS NULL;

-- Allocation orders sent from the advisor master. Unfilled orders reserve the cash they allocate.
CREATE TABLE orders (
  idem_key    text PRIMARY KEY,         -- <window>:<model>:<isin>; re-running a window is a no-op
  window_id   text NOT NULL,
  isin        text NOT NULL,
  allocations jsonb NOT NULL,           -- { account_id: { cents, shares? } }
  created_at  timestamptz NOT NULL DEFAULT now(),
  filled_at   timestamptz
);

-- Four-eyes record for every manual money action by operations. Append-only.
CREATE TABLE ops_approvals (
  id          bigserial PRIMARY KEY,
  subject     text NOT NULL,
  recorded_by text NOT NULL,
  approved_by text NOT NULL,
  at          timestamptz NOT NULL,
  CHECK (recorded_by <> approved_by)
);
CREATE TRIGGER ops_approvals_no_update BEFORE UPDATE OR DELETE ON ops_approvals
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();
