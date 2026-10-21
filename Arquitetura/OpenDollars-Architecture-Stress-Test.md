# OpenDollars Architecture: Stress Test and Improvements

Draft v0.1, 2026-10-14. Companion to `OpenDollars-Money-Architecture-Plan.md` (that file is unchanged; this one records what breaks and what to change). Not legal or tax advice.

## 1. Verdict

The core choice holds up: IBKR as broker/custodian, OpenDollars as adviser, licensed local partners, client-named accounts, UCITS for the estate promise. Under stress, though, the plan has **six real breaks** that must be fixed before any client money moves:

| # | Break | Severity | Fix (section) |
| --- | --- | --- | --- |
| B1 | **Third-party funding.** IBKR generally rejects deposits not sent from an account in the client's name. A Brazilian eFX provider or FX bank usually wires from its own account abroad, so deposits can bounce | Blocks Brazil | 4.1 |
| B2 | **Money can move before the IBKR account is approved.** The funding flow did not gate on account status, so a KYC rejection after FX leaves money stranded mid-route | High | 4.2 |
| B3 | **Small recurring deposits are eaten by fixed costs.** IBKR charges the allocation minimum per sub-account; Brazil adds 1.1% IOF; Argentine SWIFT wires carry fixed bank fees | High (product economics) | 4.3, 5 |
| B4 | **No withdrawal path.** The plan only designed money in. Getting USD back to BRL needs an inbound FX leg the plan never specified | High | 4.4 |
| B5 | **Pix fraud reversals (MED).** Pix payments can be clawed back for fraud after we have converted and invested them | Medium | 4.5 |
| B6 | **Single points of failure.** One broker (IBKR), one stablecoin processor (Zerohash), one FX partner per country | Medium, rising with AUM | 4.6 |

## 2. Brazil US$10,000 cap: verification

**Status: confirmed by three independent law-firm summaries. I could not read the official text, because the Central Bank's website is blocked from this environment.**

- Resolution BCB 561 was published on 30 Apr 2026 and amends Res. BCB 277/2022. It took effect on **1 Oct 2026**.
- It widens eFX to transfers tied to financial and capital-market investments, in Brazil or abroad, **capped at US$10,000** ([Machado Meyer](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/bancario-seguros-e-financeiro-ij/banco-central-altera-regras-do-efx), [Demarest](https://www.demarest.com.br/en/banco-central-promove-alteracoes-nas-regras-relativas-ao-servico-de-pagamento-e-transferencia-internacional-efx/), [Lefosse](https://lefosse.com/noticias/alerta/banco-central-do-brasil-publica-resolucao-que-atualiza-o-servico-de-pagamento-ou-transferencia-internacional-efx/)). One analysis reads it as **per operation** and warns that splitting a transfer to dodge the cap may be treated as evasion ([Merc Group](https://www.mercgroup.com.br/insights/bcb-561-efx-investimentos-exterior-vigencia-outubro)).
- The eFX provider must settle with its foreign counterparty only through an FX operation or a non-resident BRL account. **Virtual assets, including stablecoins, and netting are prohibited.** The rule does not ban stablecoins in the wider FX market.
- Client funds must sit in a segregated account used only for eFX. Unauthorized providers must file for authorization by 31 May 2027.
- **Still open:** whether the cap counts per operation or per client per period. Brazilian counsel must confirm this from the BCB text.

Design consequence: Brazil needs **two lanes**. Up to US$10k per operation goes through the eFX partner. Above that, the transfer goes through a bank authorized to operate in FX, under a regular FX contract. The router must never split one client instruction into several sub-$10k transfers.

## 3. Failure-mode walkthrough

Each row: what happens, how the current plan copes, and where it breaks.

### 3.1 Providers and infrastructure

| Scenario | Plan today | Gap | Improvement |
| --- | --- | --- | --- |
| IBKR API outage or degraded during an execution window | Orders aggregated into daily windows | No defined retry or missed-window policy | Orders are idempotent and carry a window id. If a window is missed, the next window absorbs the order and clients are told. Never place orders manually outside the aggregator |
| IBKR terminates or restricts the OpenDollars advisor relationship | Not covered | All clients lose advice at once | Clients keep their own IBKR accounts and assets, which is the big benefit of client-named accounts. Add a client-communication runbook and a **warm-standby second broker** (4.6) |
| IBKR restricts an individual client (KYC refresh, suspicious activity) | Not covered | Recurring plan keeps pulling money | Account-status webhook/poll pauses the funding schedule automatically and alerts operations |
| Brazil FX partner outage or loses its licence | One partner | No fallback; Brazil stops | Contract a second authorized partner before Brazil general availability. Keep the funding router partner-agnostic |
| Zerohash/USDC route paused (depeg, Zerohash sale, chain halt) | USDC is a funding rail only | Argentina's main rail stops | The SWIFT USD wire stays as fallback. Never hold USDC balances, so exposure lasts minutes |
| Cloud region outage at OpenDollars | Single US region | Clients cannot see status | Funds are never at risk because IBKR is the book of record. Multi-AZ Postgres and daily backups are enough at this stage. Multi-region is not worth it yet |

### 3.2 Onboarding and KYC

| Scenario | Plan today | Gap | Improvement |
| --- | --- | --- | --- |
| Client passes our KYC, IBKR rejects | Two-layer KYC | **B2**: funding could already have started | Hard gate: no funding instruction is issued until IBKR status = Open. Show a "pending approval" state |
| IBKR asks for extra documents | Not covered | Client stuck | Pending-items queue in the app, mirroring IBKR's document requests |
| Partner KYC rejects a client IBKR approved | Not covered | Account open but cannot fund | Offer the other rail (USDC in Argentina, second partner in Brazil). Otherwise close politely and record the reason |
| PEP or high-risk client | Screening listed | No enhanced due diligence (EDD) flow | Add an EDD tier: source-of-wealth evidence, senior sign-off, lower limits |

### 3.3 Money movement

| Scenario | Plan today | Gap | Improvement |
| --- | --- | --- | --- |
| Deposit arrives at IBKR from the partner's account, not the client's | Assumed to work | **B1**: may be returned as third-party | 4.1 |
| Wire arrives without a matching IBKR deposit notification | Not covered | IBKR expects a deposit notification for wires; unmatched funds are delayed or returned | The broker adapter creates the deposit notification via API before the partner sends the wire, with amount, currency and reference |
| Wire returned (wrong details, compliance reject) | Not covered | Money lost in limbo; FX already done | A `returned` state. The partner refunds BRL at the reverse rate, and the FX loss policy is agreed in the contract |
| Pix fraud claim (MED) after investment | Not covered | **B5** | 4.5 |
| Client sends USDT instead of USDC, or uses the wrong chain | Not covered | IBKR's route accepts USDC (plus RLUSD and PYUSD), not USDT; funds can be lost | The app shows the deposit address only with chain and token locked; it tells the client to convert USDT to USDC at their exchange first, and shows a test-send prompt for first deposits |
| Withdrawal back to local currency | Not covered | **B4** | 4.4 |
| Client tries to split a large BRL deposit into sub-$10k pieces | Not covered | Regulatory evasion risk | Router sends anything over US$10k (and repeated same-day pieces) to the FX-bank lane |

### 3.4 Market, FX and stablecoin risk

| Scenario | Plan today | Gap | Improvement |
| --- | --- | --- | --- |
| BRL or ARS moves sharply between quote and execution | Partner FX | No quote lock | Use partner quotes with an explicit validity window; reprice if expired |
| USDC depeg | Rail only | IBKR may convert below par or pause | Pause the USDC lane automatically if the peg deviates beyond a threshold (e.g. 50 bps) on a market-data feed |
| UCITS ETF closes or merges | Not covered | Model breaks | Model portfolios hold a primary and a substitute ETF per exposure |
| Deposit lands after LSE close | Not covered | Cash drag a day | Accept it; the next window invests. Hold USD-denominated share classes, so no GBP FX is needed |

### 3.5 Compliance and regulatory change

| Scenario | Plan today | Gap | Improvement |
| --- | --- | --- | --- |
| Sanctions hit on an existing client | OFAC screening | No freeze procedure | Stop the funding schedule, block advice actions, escalate to the CCO, file reports. IBKR handles any asset freeze |
| CVM treats our marketing as unregistered solicitation | Legal opinion listed | Launch could precede the opinion | The opinion is a gate before any Brazil-facing marketing, including the current waitlist copy |
| Brazil raises IOF again (it did in 2025) | Not covered | Fees jump overnight | Show the full cost before every deposit. The fee engine reads the tax rates from config, not code |
| Argentina re-imposes FX controls | Not covered | USD route may close | Existing offshore assets are unaffected. Keep both the USDC and USD lanes; pause new funding if needed |
| US adviser registration wrong (SEC vs state) | Listed as RIA | With no AUM, SEC registration usually needs the internet-adviser exemption; otherwise register in the state of the principal office | Decide in Phase 0 with counsel. The likely path is state registration (Texas or Georgia), then SEC at scale |
| Estate/tax opinion fails | Option C fallback | Site claims would be false | Remove the "$60,000" and "avoid entirely" claims until the opinion is signed; this is cheap to do now |

### 3.6 Tax structure

- **Irish CAT:** UCITS units held by non-Irish-resident, non-domiciled persons are generally exempt from Irish inheritance tax. Confirm this in the opinion; it is the second half of the estate claim.
- **Accumulating share classes improve the plan.** Brazil (Law 14.754/2023) and Argentina tax realised foreign income. An accumulating ETF pays no dividends, so there is no annual tax event until sale. That compounds better and simplifies reporting. **Recommend accumulating USD share classes as the default.**
- **Brazil IOF:** a transfer that is clearly an investment pays 1.10%; other own-account transfers pay 3.5% ([Safra](https://oespecialista.safra.com.br/iof-no-cambio-remessas-exterior-2026/)). The partner must book the FX with the investment nature code. Getting it wrong costs clients 2.4 points.

### 3.7 Scale and operations

| Area | Limit | Handling |
| --- | --- | --- |
| IBKR API rate limits | Per-session request caps | One allocation order per instrument per window, not per client. Even 100k clients stay within a few hundred orders a day |
| Account opening throughput | IBKR review queue | Not controllable. Capacity planning: show realistic approval times |
| Reconciliation | Daily Flex Query | Add intraday checks for cash movements, and alert on any break older than one business day |
| Corporate actions | Not covered | Read from Flex statements into the ledger; reconciliation catches gaps |
| Operations staffing | Not covered | Returned wires, document requests and MED claims are manual. Budget one operations person per few thousand active depositors early on |

### 3.8 Security

- **Account takeover:** an attacker in the OpenDollars app should never be able to move money out. Withdrawals stay inside IBKR's own flow with IBKR 2FA, and go only to client-named bank accounts. The app can show withdrawals but not initiate them to new destinations.
- **Insider risk:** separation of duties already planned; add four-eyes approval on any change to partner bank details or broker credentials.
- **Advice-engine error:** a wrong model allocation hits every client at once. Add pre-trade checks (max turnover, max weight, dry run against the previous model) and a kill switch.

## 4. Fixes for the six breaks

### 4.1 Third-party funding (B1)
Ask IBKR in the first call whether it can approve the chosen Brazil partner as a recognised funding source for advisor clients. Ask the same for the FX bank lane, with the client named as ordering customer in the SWIFT message. If IBKR says no, the fallbacks are (a) a partner that sends from a named sub-account per client, or (b) the client receives USD in their own Brazilian USD account (several banks offer these) and wires from there. **This is the single question that can invalidate the Brazil design, so ask it before anything else.**

### 4.2 Funding gate (B2)
State machine becomes: `kyc_passed → ibkr_open → deposit_notified → partner_collected → fx_executed → wire_sent → broker_credited → invested`, with no transition into `partner_collected` before `ibkr_open`.

### 4.3 Small-ticket economics (B3)
IBKR applies the allocation minimum to **each sub-account** and by default charges it to the client, unless the advisor master elects to pay it ([IBKR allocation minimums](https://www.interactivebrokers.co.uk/en/accounts/allocation-minimums.php)). That page covers US stocks; LSE UCITS minimums and fractional allocation for UCITS must be confirmed with IBKR. Levers:
- One execution per client per month for recurring plans (not weekly).
- A minimum recurring deposit (see question 1).
- Prefer low-priced accumulating USD share classes, so whole-share allocations work even if fractional UCITS allocation is unavailable.
- Argentina: make USDC the default lane (0.30%, min US$1) instead of SWIFT, whose fixed bank fees are high on small tickets.

### 4.4 Withdrawals (B4)
- Argentina: IBKR wires USD to the client's Argentine USD account. Simple.
- Brazil: IBKR wires USD to the partner's inbound FX product (or the client's Brazilian USD account), which converts to BRL and pays by Pix. Contract it with the same partner, and test it in the sandbox before launch.
- Always show expected time and costs before the client confirms.

### 4.5 Pix MED (B5)
For first-time and recently onboarded clients, hold funds at the partner until the main fraud window passes or a risk score clears, with lower limits for new accounts. The partner contract must say who bears MED losses after conversion; the default should be the partner, with our KYC as the control.

### 4.6 Concentration (B6)
- Broker: identify a second broker with UCITS access that onboards Brazilian and Argentine residents (candidates to diligence: Saxo, Swissquote). Sign before AUM reaches a level where a forced migration would hurt. Because accounts are in clients' names, there is nothing to migrate in a hurry, only advice to re-point.
- Stablecoin: USD wire stays live as the backup lane.
- FX: two Brazil partners by general availability.

## 5. Illustrative entry cost per deposit (assumptions, not quotes)

| Corridor, deposit | Taxes | FX/route | Broker | All-in |
| --- | --- | --- | --- | --- |
| Brazil, US$250 via eFX | IOF 1.10% | Partner spread ~0.5–1.0% (assumed) | Allocation min ~US$1–2 (assumed for LSE) | **~2.0–2.9%** |
| Brazil, US$1,000 via eFX | 1.10% | ~0.5–1.0% | ~0.1–0.2% | **~1.7–2.3%** |
| Argentina, US$250 via USDC | none at our level | 0.30% + USDT→USDC swap ~0.1–0.5% (assumed) | ~0.4–0.8% | **~0.8–1.6%** |
| Argentina, US$250 via SWIFT | | Bank wire fee often US$20–50 (assumed) | ~0.4–0.8% | **~8–20%** |

Takeaway: monthly cadence, a minimum ticket around US$250, and USDC as Argentina's default bring entry cost down a lot. The advisory fee then has to stay modest (for example 0.5–0.75% a year) for the product to beat a do-it-yourself IBKR account. Replace the assumptions with partner and IBKR quotes in Phase 0.

## 6. Other optimizations

1. **Re-order Phase 0** so the cheapest-to-learn, plan-killing questions come first: IBKR on third-party funding and UCITS fractional allocation; Brazilian counsel on the US$10k cap and CVM solicitation; the tax opinion. Entities and vendors come after.
2. **Simplify the first build.** A Postgres-backed workflow table with an outbox replaces Temporal for the pilot; the Flex Web Service feeds the ledger. Add heavier workflow tooling only when volume needs it.
3. **Use IBKR's own client portal for the first pilot** (statements, withdrawals). Build only onboarding, the funding router, the portfolio engine and reconciliation. That cuts the first build roughly in half.
4. **Fix the site copy now:** remove "Yes" from "Is this legal where I live?", and qualify the estate claims until the opinion is signed. This costs nothing and removes regulatory exposure.
5. **Fee transparency screen** before every deposit (IOF, spread, broker, advisory). It doubles as a compliance control for Brazilian consumer law and the US Marketing Rule.

## 7. Decisions for you (recommended first)

1. **Minimum recurring deposit:** (a) US$250 a month, executed monthly *(recommended)*; (b) US$100 a month, accepting ~3–4% entry cost; (c) US$500 a month.
2. **Brazil deposits above US$10k:** (a) separate FX-bank lane from day one *(recommended)*; (b) cap Brazil at US$10k per transfer for the pilot; (c) Brazil pilot later, once a bank partner is signed.
3. **Backup broker:** (a) diligence now, sign after the pilot *(recommended)*; (b) sign before launch; (c) IBKR only.
4. **Who pays IBKR allocation minimums:** (a) OpenDollars pays during the pilot, then the client pays *(recommended)*; (b) always the client; (c) always OpenDollars.

I am proceeding with the recommended options above unless you choose otherwise.
