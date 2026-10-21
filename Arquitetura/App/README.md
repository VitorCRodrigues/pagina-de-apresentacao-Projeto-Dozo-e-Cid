# OpenDollars App (pilot core)

Implements the pilot scope of `../OpenDollars-Money-Architecture-Plan.md` as corrected by `../OpenDollars-Architecture-Stress-Test.md`. Node 23+ runs the TypeScript directly. One runtime dependency: `pg`.

```
npm install
npm test          # unit + Postgres integration + end-to-end (throwaway cluster via initdb; skipped if absent)
npm run typecheck
npm run paper     # IBKR paper account: IBKR_FLEX_TOKEN, IBKR_FLEX_QUERY_ID, optional DATABASE_URL
                  # optional order test: PAPER_ORDER=1 IBKR_WEB_API_URL PAPER_ACCOUNTS=DU... PAPER_ISIN PAPER_CONID
```

| File | What it guarantees |
| --- | --- |
| `src/funding.ts` | One instruction → one lane, never split; Brazil off until B1 is resolved; nothing moves before IBKR opens the account (B2); Pix MED hold for new BR clients (B5); sanctions freeze (refunds too); FX quote expiry; USDC depeg falls back to SWIFT; itemised cost preview |
| `src/portfolio.ts` | One allocation order per ISIN per monthly window, with an idempotency key; no US-situs ISINs in core models; weight/turnover limits; kill switch; substitute ETFs; whole-share mode if IBKR can't allocate UCITS fractions |
| `src/db.ts` | Each state change + ledger postings + outbound messages commit atomically; row locks make duplicate webhooks harmless; partner collection refused until IBKR has the deposit notice; outbox retries with the same key (max 10, then ops); unfilled orders reserve cash; fills idempotent; statement import mirrors portal withdrawals (B4), interest and fees once; four-eyes acknowledgement for unexpected cash |
| `src/recon.ts` | Ledger vs IBKR Flex positions and cash; one open break per key; overdue after one business day |
| `src/ibkr.ts` | Only holder of IBKR credentials. Flex Web Service with retries. Advisor orders via the Client Portal Web API: one shares-method (S) allocation group per order, `cOID` = idempotency key, only allow-listed warning prompts confirmed. Deposit notices fail loudly until IBKR grants Account Management API access |
| `db/schema.sql` | Same rules in Postgres: balanced, append-only ledger and audit tables; eFX cap; idempotency keys; four-eyes check |

All money is integer US cents. Rates marked *(assumed)* in `src/config.ts` must be replaced with signed quotes.

**Finding from IBKR's docs (2026-10-14):** Web API stock orders by cash amount round down to whole shares, and anything under one share is rejected. So orders go out in whole shares (`wholeShareOrders` in config), the window needs a price per ETF, and leftover cash rolls into the next window. This closes the stress test's open question on fractional UCITS allocation, at least for the API route. The Shares-method allocation and the `cOID` duplicate handling are built from the published reference and must be confirmed on the paper account.

**Withdrawals (B4):** by design the app never initiates one. Clients withdraw in IBKR's portal (IBKR 2FA, client-named destinations only), and the daily statement import mirrors it.

**Waiting on outside answers, not code:** a paper-account run of `npm run paper` (statement, recon, one test order); IBKR Account Management API access for deposit notices; the Brazil partner adapter (B1 and the contract; the `PartnerGateway` contract is ready and exercised in tests); the KYC vendor; the inbound FX leg for Brazilian withdrawals; tax reports; the debit card.
