# OpenDollars: Money Movement and Investing Architecture

Draft v0.1, 2026-10-14. Prepared for the founding team. Not legal or tax advice; every regulatory point below needs counsel sign-off before it is relied on.

## 1. What we are building (from the documents in this folder)

Sources read: `OpenDollars/index.html` + `script.js` (public site and FAQ), `OpenDollars/DEPLOYMENT.md` (launch plan and broker boundary), `Research/OpenDollars_Investor_Research_Template.docx`, `Oasis/docs/LICENSING-GATES.md`, `Pitch/OpenDollars_Initiation_Pitch_Deck.pdf`.

The product promises, as published on the site, are the requirements this architecture must honour:

| Promise on the site | Architectural consequence |
| --- | --- |
| Recurring USD investment account, held for decades | Scheduled deposits, auto-invest, fractional orders, long-term custody |
| Account opened in the US **in the client's own name**; "OpenDollars never pools client funds" | Fully disclosed / advisor-linked accounts, not an omnibus. OpenDollars never holds client money |
| Local currency moves through a **licensed partner in the client's country** | One FX/payments partner per country, funds flow partner to broker directly |
| Simple currency exchange | FX at the partner (local currency to USD) and at the broker (USD to other majors) |
| USD debit card | Separate card-issuing partner (the broker card is not the answer, see 4.6) |
| Advisory through a US-registered investment team | OpenDollars (or an affiliate) registers as an investment adviser |
| Automatic home-country tax reporting | Tax-reporting service per country, fed by the broker's statements |
| Estate protection: avoid the US$60k non-resident estate-tax cliff, lower dividend withholding | The default portfolio must hold **non-US-situs** instruments (see 3) |
| Launch markets: Brazil and Argentina, then the rest of LatAm | Country adapters; compliance designed per jurisdiction |

DEPLOYMENT.md already sets the right boundary: only a private, US-based broker-integration service may call custody, KYC, funding, FX or trading APIs, never the browser. This plan keeps that boundary and fills in what sits behind it.

## 2. Recommendation in one paragraph

Use **Interactive Brokers as the broker, custodian and FX engine**, with OpenDollars as a **registered investment adviser on IBKR's advisor platform** (client accounts in each client's own name, linked to the OpenDollars advisor master, white-branded). Bring money in through **one licensed local partner per country** (a Central Bank-authorized FX institution in Brazil; the client's own USD bank account or a CNV-registered crypto provider in Argentina). Use **stablecoins as a funding rail, not as a product we custody**: IBKR now accepts USDC deposits 24/7 and converts them to USD. Build a thin OpenDollars platform around it: onboarding orchestration, a shadow ledger with daily reconciliation, a portfolio engine that batches orders, compliance monitoring, and tax reporting. The decisive reason IBKR wins over the alternatives is the estate promise: IBKR gives access to Irish-domiciled UCITS ETFs that track US stocks, which removes US estate-tax exposure and halves dividend withholding, and most US-only Broker APIs cannot offer that.

## 3. The estate and tax structure drives the broker choice

A non-resident alien who directly holds US stocks or US-domiciled ETFs has US-situs assets: estate tax above a US$60,000 exemption at rates up to 40%, and 30% dividend withholding (Brazil and Argentina have no income-tax treaty with the US).

Three ways to deliver the "estate protection built into every account" promise:

| Option | How it works | Cost and complexity | Fit |
| --- | --- | --- | --- |
| **A. Irish UCITS ETFs (recommended default)** | Portfolio holds Ireland-domiciled ETFs tracking US indices (S&P 500, total market, sectors). Not US-situs, so no US estate tax; the fund suffers 15% US withholding under the US–Ireland treaty instead of 30% at the client | Cheap, per-client, no entities. Needs a broker with LSE/Xetra/Euronext access | Matches the promise; works for every LatAm country |
| B. Per-client offshore holding company | Client owns a non-US company that owns US stocks | Expensive formation and upkeep, CFC rules in Brazil (Law 14.754/2023) and Argentina may tax it anyway | Only for high-net-worth tier later |
| C. Direct US stocks with disclosure | Hold US stocks, disclose estate exposure, suggest TOD beneficiaries | Simple but breaks the site's promise | Optional "single stock" sleeve, opt-in, capped |

Recommendation: A as the core portfolio, C as an opt-in satellite sleeve with an explicit estate-exposure warning, B parked. This needs a written opinion from US and Brazilian/Argentine tax counsel before the site copy stays as is.

## 4. Component-by-component choice with alternatives

### 4.1 Brokerage, custody and execution

| Provider | Model | Strengths | Weaknesses for us |
| --- | --- | --- | --- |
| **Interactive Brokers (recommended)** | Advisor (RIA) accounts or Introducing Broker (fully disclosed), white-branding, Web API / FIX, account-management API for onboarding | Onboards residents of ~200 countries incl. BR and AR; client-named accounts; global exchanges so UCITS ETFs are available; FX at near-interbank cost across ~25 currencies; fractional shares; USDC funding via Zerohash; scale is not our problem | Onboarding UX is heavier than a pure fintech API; less control over the account-opening screens; API rate limits mean we must batch orders; IBKR's own KYC decision is final |
| Alpaca Broker API | Fully disclosed or omnibus, API-first | Excellent developer experience, popular with LatAm fintechs, local-currency features | US securities only, so no UCITS route to the estate promise |
| DriveWealth | Omnibus/fully disclosed, fractional US equities | Long LatAm track record, B2B2C embedded investing | US securities only; omnibus models conflict with "never pools" |
| Apex Fintech Solutions | Clearing for fintech brokers | Mature clearing and custody | Mostly US-person focus; needs OpenDollars to be a broker-dealer |
| Local players' US arms (Avenue/Itaú, XP, BTG, Nomad partners) | They are distribution competitors, not infrastructure | | Not a neutral supplier |

Volume: IBKR executes and clears billions of trades a year, so throughput limits sit in our API usage, not in their capacity. The design therefore aggregates orders (see 5) and uses allocation orders from the advisor master instead of one API call per client per trade.

Regulatory posture options on IBKR, in order of realism:
1. **Advisor (recommended now):** OpenDollars Advisers LLC registers with the SEC (the internet-adviser exemption or state registration until AUM qualifies for SEC) and opens an IBKR advisor master. Clients open their own IBKR accounts linked to it; we charge an advisory fee billed through IBKR. No broker-dealer licence, no FINRA membership, no money transmission because we never touch funds.
2. Introducing Broker later: requires OpenDollars (or an affiliate) to become a broker-dealer or a foreign regulated broker. Gives full white-label and more revenue lines (commissions, FX markup). Worth it only past meaningful AUM.
3. Pure referral/software: lowest regulatory load but kills "advisory through our US-registered team" and most revenue.

### 4.2 Payments in (local currency to USD)

| Corridor | Recommended rail | Alternatives | Notes |
| --- | --- | --- | --- |
| **Brazil (BRL)** | Pix collection by a **BCB-authorized FX institution** (eFX provider or FX bank), which buys USD and wires it to the client's own IBKR account with the client as remitter, FX nature "investment abroad" | Ebanx, dLocal, Braza Bank, Ouribank, Banco Rendimento, Travelex Bank, Ebury/Remessa Online, Wise Brazil. Pick on spread, API, KYC reuse and willingness to do investment-purpose FX | **Resolution BCB 561 (in force 1 Oct 2026)** bars eFX providers from settling with stablecoins and, per secondary reporting, caps investment-related eFX transfers at US$10,000 per transaction. Above that, route through a full FX bank. Confirm the text. |
| **Argentina (ARS / USD)** | Client wires USD from their own Argentine bank USD account (MEP dollars) to IBKR; ARS-only clients buy MEP dollars at their bank first | CNV-registered ALyC partner; stablecoin path (4.3) | Individual FX restrictions were largely lifted in April 2025; confirm current BCRA rules for outbound transfers before launch |
| Mexico, Colombia, Chile, Peru (next) | Local payins + FX partner per country (SPEI, PSE, etc.) | dLocal or Ebanx cover several countries with one contract | Each needs its own securities-solicitation analysis |
| Countries whose currency IBKR accepts (EUR, GBP, CAD, MXN, etc.) | Client wires directly to IBKR in local currency; IBKR converts | | Cheapest path, no partner needed |

Rule: money always moves **client bank → licensed partner → client's IBKR account**, named to the client. OpenDollars sends instructions and receives status webhooks; it never receives funds. This is what keeps us out of money-transmitter licensing in the US and payment-institution licensing in Brazil.

### 4.3 Stablecoin rails

What the user can mean by "convert to stable dollars", and the recommendation:

| Role | Description | Recommendation |
| --- | --- | --- |
| **Funding rail** | Client sends USDC from their own wallet (or from a local exchange) to the IBKR/Zerohash deposit address; IBKR converts to USD (reported fee 0.30%, min US$1) and credits their account 24/7 | **Yes, launch in Argentina.** Argentines already hold USDC/USDT at CNV-registered providers (Ripio, Lemon, Belo, Bitso). Cheapest and fastest path there |
| Stablecoin balance as a product | We hold USDC for clients in a wallet we control or via a custodian (Bridge, Paxos, Zerohash, Circle) | **Not at launch.** Makes us a custodian/VASP in each country, conflicts with "never pools", and brings travel-rule and GENIUS Act obligations. Revisit with a licensed custodian partner after launch |
| Off-ramp for other countries | Circle Mint, Bridge, BVNK, Zerohash convert USDC to USD wires | Use only through IBKR's native route unless a corridor needs it |

Brazil: do not build a BRL → stablecoin → IBKR path. Resolution BCB 561 blocks eFX providers from using stablecoins for the offshore leg, and BCB 519–521 regulate VASPs separately (authorization transition deadline 30 Oct 2026). A Brazilian client may still fund IBKR from their own self-custodied USDC, but OpenDollars should not arrange that conversion.

### 4.4 FX ("convert to any currency")

- Local currency to USD: at the country partner (4.2). This is where most of the spread is.
- USD to other majors (EUR, GBP, CHF, JPY, etc.): inside IBKR at near-interbank rates. No other provider we could use comes close on cost.
- Revenue: as an adviser we cannot mark up IBKR's FX; FX revenue comes from a negotiated revenue share with the local partner, disclosed to the client.

### 4.5 KYC, AML and sanctions

Two layers, because IBKR's KYC covers the brokerage account but not our own obligations or the local leg:

- **OpenDollars onboarding (before IBKR):** identity document + liveness (Sumsub, Persona or Onfido; Unico or idwall for Brazilian CPF and biometrics; RENAPER check for Argentine DNI), tax ID validation (CPF, CUIL/CUIT), PEP and sanctions screening (ComplyAdvantage, LSEG World-Check, Dow Jones), source of funds, suitability/risk profile for advice.
- **Hand-off:** submit the application to IBKR via its account-management API with the collected data and documents so the client does not repeat it; IBKR runs its own CIP and approves.
- **Local partner KYC:** negotiate KYC reliance or data sharing so the client is verified once.
- **Ongoing:** transaction monitoring across deposits, withdrawals and trades (Unit21, Hummingbird, Sardine), case management, reporting to FinCEN (via our AML programme; the FinCEN adviser AML rule's effective date moved to 1 Jan 2028, but build it now because IBKR and partners will require it), COAF in Brazil and UIF in Argentina where we are an obliged entity, OFAC screening on every payout.
- **Travel Rule** for any stablecoin flow we touch (Notabene or Sumsub Travel Rule), only needed if we move beyond the IBKR-native USDC route.

### 4.6 USD debit card

IBKR's debit card is not available to most non-US residents, so this needs a separate issuer. Options: a stablecoin-backed card programme (Rain, Kast-style issuers via Visa/Mastercard), or a US BaaS issuer that onboards non-residents. It also pulls money out of the investment account, so it is a Phase 3 item. Recommend deferring and saying "coming later" on the site.

### 4.7 Tax reporting

- Brazil: annual DIRPF data and the Law 14.754/2023 regime for offshore financial investments (15% on realised gains and income, annual adjustment), plus BCB CBE declaration when offshore assets exceed US$1m.
- Argentina: Ganancias and Bienes Personales data.
- Source: IBKR Flex Query statements (trades, dividends, withholding, FX) → our tax service → per-country reports in PT/ES.

## 5. Platform architecture

```
           Clients (web, iOS, Android) — PT / ES / EN
                         │
        Cloudflare edge (existing www Worker; app.opendollars.org)
                         │  OAuth2/OIDC, WAF, rate limits
 ┌───────────────────────┴────────────────────────────────────────┐
 │  OpenDollars core (US region, private network)                 │
 │                                                                │
 │  Identity & Onboarding ──► KYC vendors, sanctions/PEP          │
 │        │                                                        │
 │  Account Service ─────────► Broker Adapter ──► IBKR (account   │
 │        │                    (only service with   API, Web API, │
 │        │                     broker creds)       Flex Queries) │
 │  Funding Orchestrator ────► Country Adapters ──► BR FX partner │
 │   (state machine,           (Pix/eFX, AR wire,   AR bank/PSAV  │
 │    idempotency)              USDC via IBKR)      others later  │
 │        │                                                        │
 │  Portfolio Engine ────────► Order Aggregator ──► IBKR alloc.   │
 │   (models, recurring plans,  (batches, fractional,  orders     │
 │    rebalancing, UCITS map)    cut-off windows)                 │
 │        │                                                        │
 │  Shadow Ledger (double-entry, Postgres) ◄── Reconciliation     │
 │        │                                  (daily vs IBKR Flex  │
 │        │                                   + partner reports)  │
 │  Compliance: monitoring, cases, SAR/COAF/UIF, audit log        │
 │  Tax Reporting: BR / AR outputs                                │
 │  Notifications, statements, support tooling                    │
 └────────────────────────────────────────────────────────────────┘
        Event bus (queue) between services; immutable audit store
```

Design rules:
- **Non-custodial ledger.** IBKR is the book of record. Our ledger mirrors it plus in-flight states (deposit initiated, FX done, wire sent, credited, invested). Breaks found at daily reconciliation open an operations case.
- **Funding state machine** per deposit: `requested → partner_collected → fx_executed → wire_sent → broker_credited → invested`, with timeouts, retries and client-visible status. Every external call carries an idempotency key.
- **Order aggregation.** Recurring plans settle into a few daily execution windows. The aggregator nets buys and sells per instrument across clients, sends one allocation order per instrument from the advisor master, and IBKR allocates to sub-accounts. This keeps us far under API limits at any realistic scale.
- **Secrets and access.** Broker and partner credentials live only in the broker/country adapters (KMS/HSM), with mutual TLS or OAuth. Separation of duties: no engineer can both change a payout destination and approve it.
- **Data residency.** Brazilian personal data under LGPD with a documented international-transfer basis (standard contractual clauses); Argentina under Law 25.326. Keep KYC documents encrypted, in-region copies if counsel requires.
- **Separation from OASIS.** Per DEPLOYMENT.md, OASIS shares no sessions, databases or secrets with this stack.
- **Stack suggestion:** TypeScript or Python services on a managed container platform in a US region (AWS or GCP; the team already has GCP staging docs in Oasis), Postgres for ledger and state, a managed queue (SQS/PubSub), Temporal or equivalent for long-running funding workflows.

## 6. Licensing and compliance by region

| Jurisdiction | What OpenDollars needs | What partners cover |
| --- | --- | --- |
| **United States** | Delaware C-corp + adviser entity; SEC (or state) investment-adviser registration, Form ADV, Chief Compliance Officer, compliance manual, Marketing Rule, Reg S-P privacy, code of ethics, books and records; AML/OFAC programme; FinCEN MSB registration **not** needed if we never touch funds (confirm) | IBKR: broker-dealer, custody, SIPC, CIP |
| **Brazil** | Legal opinion on offering foreign investment services to Brazilian residents (CVM has acted against unregistered foreign intermediaries soliciting locally); for advice to Brazilians, likely CVM registration as securities consultant (Res. CVM 19) or a partnership with a CVM-registered firm; LGPD controller duties, DPO; consumer-code disclosures in Portuguese; COAF obligations if applicable | FX partner: BCB authorization, FX contract, BCB reporting under Res. 561 |
| **Argentina** | CNV analysis: likely registration as Agente Asesor Global de Inversión (AAGI) or a partner ALyC for advice/solicitation; UIF AML obligations; data-protection registration | Banks/ALyCs for USD; CNV-registered PSAVs for stablecoins |
| **Next markets** | Same three questions each time: can a foreign adviser solicit, who does FX, what data rules apply | dLocal/Ebanx-type multi-country partners |

## 7. Phased plan

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 0. Foundations | Entities, counsel, adviser registration filed, IBKR advisor application, Brazil FX partner and Argentina rails selected, estate/tax opinion, KYC vendor, AML policies | Signed IBKR and partner agreements; counsel-approved site copy |
| 1. Closed pilot (Argentina first) | Onboarding → IBKR account → USD wire or USDC funding → UCITS model portfolio → recurring buys → statements | 50 friends-and-family accounts, zero reconciliation breaks over 30 days |
| 2. Brazil | Pix → eFX partner → IBKR; BRL tax reporting; under-$10k-per-transfer path plus FX-bank path for larger | Partner sandbox to production checklist (DEPLOYMENT.md gates) passed |
| 3. Expansion | Debit card partner, Mexico/Colombia/Chile, optional stablecoin balance with licensed custodian, consider Introducing Broker status | AUM and unit economics justify |

Argentina first is recommended because clients already hold USD and USDC, no local FX partner contract is required to start, and IBKR's USDC route works now. Brazil follows once the FX partner is signed and Res. 561 compliance is confirmed.

## 8. What is still missing

1. **Legal entity and team for OpenDollars.** The investor template still has placeholders for entity, raise and contacts, and `Pitch/OpenDollars_Initiation_Pitch_Deck.pdf` actually contains the Veratori pre-seed deck, so there is no OpenDollars pitch deck yet.
2. **Counsel** in the US (adviser registration, securities, tax), Brazil (CVM, BCB, tax) and Argentina (CNV, BCRA, tax).
3. **Written estate/withholding opinion** confirming the UCITS structure for Brazilian and Argentine residents before the site keeps its "$60,000" claims.
4. **Investment-adviser registration** and a named Chief Compliance Officer.
5. **IBKR relationship:** advisor (or introducing broker) application, white-branding, API access, fee schedule and their country eligibility list.
6. **Country partners:** a signed Brazil FX institution (with investment-purpose FX and Res. 561 compliance), confirmed Argentina outbound-USD process.
7. **Vendors:** KYC/biometrics, sanctions/PEP, transaction monitoring, and a card issuer (later).
8. **Policies:** AML/KYC, sanctions, privacy (EN/PT/ES, counsel-approved; `privacy.html` is still a draft), complaints, incident response, business continuity.
9. **Business model numbers:** advisory fee, FX revenue share, minimums, CAC; the investor template's financial tables are blank.
10. **Engineering:** the `App/` folder is empty; nothing of the platform in section 5 exists yet. The waitlist Worker and domain are the only live pieces.
11. **Consistency fixes:** the site uses `hello@opendollars.com` while DEPLOYMENT.md plans `opendollars.org`; the FAQ says "Yes" to "Is this legal where I live?" before any licensing is in place.

## 9. Open decisions (recommended option first)

1. **Regulatory posture:** (a) RIA on IBKR's advisor platform *(recommended)*; (b) become a broker-dealer and IBKR introducing broker; (c) software/referral only.
2. **Estate structure:** (a) Irish UCITS ETFs as default with opt-in US stocks *(recommended)*; (b) per-client offshore entity; (c) direct US stocks with disclosure.
3. **Stablecoins:** (a) funding rail only via IBKR's USDC route *(recommended)*; (b) hold USDC balances for clients through a licensed custodian; (c) none at launch.
4. **First market:** (a) Argentina pilot, Brazil next *(recommended)*; (b) Brazil first; (c) both together as the site says.

## Sources checked for time-sensitive facts

- IBKR USDC funding via Zerohash, 24/7, 0.30% fee: [The Block, 2026-01-15](https://www.theblock.co/news/business/2026-01-15-interactive-brokers-usdc-ripple-paypal-stablecoins-385837)
- Brazil Resolution BCB 561, effective 2026-10-01: [Spark research summary](https://www.spark.money/research/brazil-stablecoin-cross-border-ban), [Cointelegraph](https://cointelegraph.com/news/brazil-central-bank-crypto-rules-stablecoins-foreign-exchange). Read the BCB text before relying on the US$10,000 cap.
- FinCEN adviser AML rule postponed to 2028: [Cooley](https://www.cooley.com/news/insight/2025/2025-07-22-fincen-to-postpone-investment-adviser-anti-money-laundering-rule), [fintech.global](https://fintech.global/2026/02/05/fincen-delays-investment-adviser-aml-rule-to-2028/)
- Everything else (IBKR country coverage and account models, UCITS situs treatment, Argentina FX rules, Brazilian Law 14.754) is from prior knowledge and must be confirmed in diligence.
