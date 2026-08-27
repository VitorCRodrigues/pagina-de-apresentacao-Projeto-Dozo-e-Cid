# 01 — Business Model & Wedge

## 1. Who actually pays us

| Segment                                       | Need                                                                        | Why they switch to us                                                 | Margin quality                    |
| --------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| **SA individual investors / savers**    | Get out of soft local currency (ARS, BRL) into USD-denominated value safely | Cheaper + faster than banks/casas de cambio; USD card to spend abroad | High (recurring, larger tickets)  |
| **SA tourists**                         | Spend abroad without 3–8% bank/card FX gouging                             | Transparent ~1% + good rate at point of travel                        | Medium (episodic)                 |
| **Expats / families (remittance)**      | Send money home / receive from abroad                                       | Beat Western Union/banks on the*right* corridor lane                | Medium-high (recurring, sticky)   |
| **EU/Asia inbound travelers/investors** | Convert into USD/local for LatAm travel or investment                       | Convenience + rate                                                    | Low-medium (episodic)             |
| **(Later) US B2B / SMBs**               | Pay LatAm suppliers / contractors                                           | Cheaper cross-border B2B than banks                                   | High (large tickets, KYB not KYC) |

**Primary wedge for the POC:** pick **one** of these in **one** corridor and prove unit economics. Spreading across all five at launch is how this dies. Candidate beachheads ranked in [04](01-jurisdiction.md#04--corridor-economics).

## 2. Revenue lines

| Line                             | Mechanic                                                    | Realistic take             | Notes                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **FX / transfer**          | ~1% fee**+** FX spread (~0.3–0.8%)                         | **1.3–1.8% all-in** | The headline "1%" is the visible fee; spread is where real margin hides. Be transparent or competitors will out-transparency you. |
| **Debit card**             | Interchange share via Pomelo BaaS                           | ~0.5–1.5% of card spend   | Recurring, sticky, drives daily active use                                                                                        |
| **Investing / consulting** | AUM fee or flat advisory; or rev-share with white-label RIA | 0.25–1% AUM, or flat      | Defer in-house; partner first                                                                                                     |
| **Float / yield**          | Yield on stablecoin/USD balances held                       | Variable                   | **`[VERIFY-LEGAL]`** — holding customer funds + earning yield can itself trigger licensing/securities treatment          |
| **VPN (separate co.)**     | Subscription                                                | $3–10/mo                  | Own P&L, own brand — see [VPN](04-Other%20Services.md#3-vpn-separate-entity)                                                        |

## 4. What "1%" really means to the customer

The pitch is **total cost to destination**, not a single fee. A customer comparing us to a bank cares about: our fee + our spread + any government tax they'd pay anyway. Our marketing math must show the **all-in delivered amount** vs. the bank's all-in delivered amount, per corridor — because in some corridors (Brazil cash/card) the government tax makes us look identical to everyone, and in others (Argentina retail, US→BR remittance) we look dramatically better. Pricing copy is therefore **corridor-specific**, never global.

## 5. Why bundle the VPN at all (the strategic logic, kept honest)

The only real reasons to own both: (1) **shared LatAm-diaspora audience and acquisition channels**; (2) **diversified revenue** across a privacy-conscious base; (3) optionality to cross-sell *later* via referral. The VPN is **not** a synergy with the money rails — it's a separate bet that happens to share a founder and a target demographic. Treat it as such. If it distracts from proving the money POC, it waits.

# 02 — Jurisdiction & **Split Structure Base**

| Layer                               | Recommended (POC assumption)                                                                                                  | Why                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Holding / cap table                 | US Delaware C-Corp                                                                                                            | VC-standard; future fundraising                                                                      |
| Money-services operating entity     | Panama (off FATF grey list since Oct 2023, fully dollarized, intl banking center) — or a BaaS-agent model to defer licensing | USD-native, privacy-reasonable, no 50-state US licensing slog.[VERIFY-LEGAL]                         |
| Tax-advantaged alt for US footprint | Puerto Rico Act 273 IFE (4% tax)                                                                                              | If we want US rails + US credibility; gated by $10M paid-in capital + 8 staff —later-stage, not POC |
| EU/Asia inbound chassis (optional)  | Lithuania EMI (€350k cap, EEA passport)                                                                                      | Only if Europe inbound becomes a real line                                                           |
| VPN entity                          | Panama                                                                                                                        | Privacy-credible, outside US subpoena reach                                                          |
| Settlement rail                     | USDC/USDT stablecoin + regional on/off-ramp partners                                                                          | The actual cost and de-risking solution                                                              |
|                                     |                                                                                                                               |                                                                                                      |
|                                     |                                                                                                                               |                                                                                                      |

## 1. The framing: it's a stack, not a country

No single jurisdiction is best at all four jobs you need: (a) **holding/cap table** for fundraising, (b) **a licensed money-services operating entity**, (c) **a privacy-credible home for the VPN**, (d) **tax efficiency**. Trying to force one country to do all four is the classic mistake. Market leaders run **split structures** (Nord → Panama op + holding elsewhere; Kape, Wise, Revolut all multi-entity). So should we.

## 2. Options matrix — money-services operating entity

| Jurisdiction                           | Tax                                                                                                                                        | Capital / staff burden                                                                                                             | Banking & rails reality                                                                                                     | USD-native?  | Fit for us                                                                              | Verdict                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **US — Florida/Delaware MSB**   | FL 0% state income; fed C-corp                                                                                                             | Per-state money-transmitter licenses + FinCEN MSB;**50-state ≈ $1–3M, 1–3 yrs**                                           | **De-risking wall** — banks exit exactly our profile. Strong BaaS ecosystem (Marqeta, Unit, Synctera) but US-centric | Yes          | Credibility + US rails, but slow/expensive and banking-hostile to our profile           | ⚠️ Only via**agent/BaaS model**, not own 50-state |
| **Puerto Rico — Act 273 IFE**   | **4% on IFE income; 0% distributions to non-PR owners; 6% to PR owners** (Act 60, extended to 2055; new-applicant changes from 2026) | **$10M paid-in capital**, **8 FT staff** (2 compliance), $5k license fee                                               | US territory → US banking rails**and** US subpoena/CLOUD Act reach                                                   | Yes (USD)    | Huge tax win + US rails**if** you can fund $10M cap                               | 🟡**Later-stage**, not POC (capital gate)           |
| **Panama**                       | Territorial; foreign-source income largely untaxed                                                                                         | Lighter than US/PR; Superintendencia de Bancos / MEF regime**`[VERIFY-LEGAL]`**                                                  | **Off FATF grey list since Oct 27 2023**; fully **dollarized**; established intl banking center                 | Yes (USD)    | USD-native, privacy-reasonable, no 50-state slog, LatAm-proximate                       | ✅**Lead candidate for op entity**                  |
| **Curaçao**                     | E-zone ~2% historically                                                                                                                    | Known for**gaming**, *not* money transmission; FX/EMI regime thin                                                          | **Caribbean correspondent-banking access is hard** — the opposite of what we need                                    | Uses ANG/USD | Tax looks nice, banking reality undermines it for money services                        | ❌ Avoid for op entity (maybe IP/holding only)            |
| **Lithuania — EMI**             | EU corp tax 15%                                                                                                                            | **€350k capital** (unrestricted); state fee ~€1,463; legal prep €20–25k; **first-yr all-in €250–400k**; 6–12 mo | **EU/EEA passport to 30 countries**; 180+ EMIs licensed; PSD3/PSR in force 2027                                       | EUR          | Real "chassis"**if EU/Asia inbound becomes core**; overkill for a LatAm-first POC | 🟡 Optional, EU-line only                                 |
| **El Salvador**                  | Crypto-friendly; digital-asset income incentives                                                                                           | LEAD law (2023), Special AML Law (Oct 2025), DASP licensing                                                                        | Dollarized;**most permissive LatAm crypto/stablecoin stance**                                                         | Yes (USD)    | Cheap dollarized base**for the stablecoin leg**; reputational/PR optics to manage | 🟡 Wildcard — strong for the*rail* entity              |
| **Mexico — IFPE (Ley Fintech)** | MX corp tax                                                                                                                                | IFPE license (electronic payment funds)                                                                                            | Needed to touch MXN domestically; excludes crypto-as-tender                                                                 | MXN          | Only if**Mexico corridor** (huge US→MX remittance) is the beachhead              | 🟡 Corridor-specific                                      |

### Read-through

- **For a capital-light LatAm-first POC:** don't own a license at all yet → **agent/BaaS model** (ride a partner's licenses; see [03](03-compliance-licensing.md)). Stand up a **Panama** op entity when volume justifies it.
- **Puerto Rico Act 273** is the *aspirational* end-state if you raise real capital and want US rails + 4% tax — but $10M paid-in + 8 staff makes it a Series-A+ move, not a garage POC.
- **El Salvador** is the interesting cost-cutter specifically for the **stablecoin rail entity** — most permissive, dollarized, cheap.

## 3. Recommended split structure (POC → scale)

```
                    ┌─────────────────────────────┐
                    │  HoldCo — Delaware C-Corp     │  ← cap table, fundraising, IP*
                    └───────────────┬──────────────┘
                 ┌──────────────────┼───────────────────┐
                 ▼                  ▼                    ▼
   ┌───────────────────────┐  ┌──────────────┐  ┌────────────────────┐
   │ MoneyCo (operating)   │  │ RailCo        │  │ VPNCo (sep. brand) │
   │ POC: BaaS-agent model │  │ stablecoin    │  │ Panama or          │
   │ Scale: Panama op      │  │ on/off-ramp   │  │ Switzerland        │
   │ (PR Act 273 if funded)│  │ El Salvador?  │  │ (no US subpoena)   │
   └───────────────────────┘  └──────────────┘  └────────────────────┘
```

\* IP can sit in a separate low-tax entity (BVI/Cayman) for licensing efficiency — *only worth it at scale; ignore for POC.*

## 4. The Miami question, answered directly

Miami is **fine as the commercial / talent / exec HQ** (no FL state income tax, LatAm connectivity, Spanish/Portuguese talent, time zone). It is **wrong as the licensed money-services entity** because US jurisdiction = the de-risking wall + CLOUD Act reach (toxic for the VPN side). So: **people and offices in Miami, the regulated money entity and the rails entity offshore (Panama / agent-model), the VPN entity offshore.** This is exactly the Nord/Kape pattern, adapted.

## 5. Cost/tax cutting levers (summary — detail in [05](01-jurisdiction.md#05--cost--tax-strategy))

1. **Stablecoin rails** — the biggest cost cut (3–5% → ~1% on the cross-border leg) *and* the de-risking workaround.
2. **Agent/BaaS model first** — avoid $1–3M of US licensing until volume justifies owning licenses.
3. **Territorial/low-tax op base** (Panama territorial; PR Act 273 4%; El Salvador) instead of mainland US corp + state taxes.
4. **Merchant-of-Record for the VPN** (Paddle/FastSpring) — offloads global VAT/GST/PCI/chargebacks entirely.
5. **Split IP entity** — defer; only matters at scale.

## Sources

- Puerto Rico Act 273 IFE: [Lexology](https://www.lexology.com/library/detail.aspx?g=3e065b4d-6ae7-497b-8784-7a66318c1f78), [2022 Act Society](https://www.the2022actsociety.org/tax-incentives/act-273/), [Act 273 text (OGP PR)](https://docs.pr.gov/files/OCIF/LEYES-REGLAMENTOS-CARTAS-CIRCULARES/Leyes%20Administrativas/Act%20No.%20273-2012%20--%20International%20Financial%20Center%20Regulatory%20Act.pdf)
- Panama off FATF grey list (Oct 2023), dollarized: [FATF – Panama](https://www.fatf-gafi.org/en/countries/detail/Panama.html), [Inter-American Dialogue](https://thedialogue.org/analysis/why-is-panama-back-on-the-fatfs-gray-list)
- Lithuania EMI cost/capital/passport: [Crassula – Lithuania EMI 2026](https://crassula.io/guides/licenses/lithuania-emi/), [Bank of Lithuania](https://www.lb.lt/en/authorisation-of-electronic-money-institutions)
- El Salvador digital-asset regime: [Gofaizen-Sherle – El Salvador](https://gofaizen-sherle.com/crypto-license/el-salvador), [Chambers Tech M&amp;A 2026 – El Salvador](https://practiceguides.chambers.com/practice-guides/technology-ma-2026/el-salvador/trends-and-developments)
- Mexico IFPE / Ley Fintech: [ReadyCorp – IFPE](https://www.readycorp.co/blog/ifpe-mexico), [Legal Paradox – Fintech Law](https://www.legalparadox.com/fintech-law)
- US money transmitter cost/roadmap: [Finextra – MTL 2026](https://www.finextra.com/blogposting/30783/money-transmitter-license-in-2026-requirements-costs-and-a-practical-roadmap-for-fintechs)

# 04 — Corridor Economics

> **1% fee is irrelevant in some corridors and a killer advantage in others.** Price per corridor or die.

## 1. The mental model

Total cost to the customer = **government tax** (fixed, you can't touch it) **+ FX spread** (yours) **+ your fee** (yours). You only have a real edge where the government tax is *low* and incumbents' spread+fee is *high*. Where the government tax is high (Brazil cash/card), everyone looks the same and you can't win on price — so don't fight there.

## 2. Corridor scorecard

| Corridor / lane                                     | Gov tax (the part you can't beat)                            | Incumbent all-in (bank/WU)     | Our all-in target     | Edge?            | Verdict                                           |
| --------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | --------------------- | ---------------- | ------------------------------------------------- |
| **Brazil — cash/card FX abroad**             | **3.5% IOF** (STF 16/07/2025)                          | ~5–8%                         | 3.5% + ~1.5% = ~5%    | Marginal         | ❌ Tax swamps us; don't lead here                 |
| **Brazil — investment abroad**               | **1.10% IOF**                                          | 2–4%                          | 1.10% + ~1.5% = ~2.6% | Yes              | 🟡 Structuring lane —`[VERIFY-LEGAL]`          |
| **Into Brazil — different-owner remittance** | **0.38% IOF**                                          | WU ~5–7%                      | 0.38% + ~1.3% = ~1.7% | **Strong** | ✅**Beachhead candidate**                   |
| **Argentina — individual USD purchase**      | Controls**lifted for individuals (Apr 14 2025)**       | Blue/MEP friction, bank spread | ~1.3% all-in          | **Strong** | ✅**Beachhead candidate** (retail only)     |
| **Argentina — corporate**                    | Corporate controls**remain**; 90-day cross-restriction | n/a                            | —                    | No               | ❌ Don't plan corporate AR                        |
| **US → Mexico remittance**                   | Low                                                          | WU/Remitly 3–6%               | ~1.3% all-in          | Yes (scale)      | 🟡 Huge volume (~$65B mkt) but brutal competition |
| **Venezuela — flight capital**               | Sanctions, not tax                                           | Opaque, high                   | High margin possible  | Yes, but…       | ⚠️ OFAC/PEP minefield — see [Risks](02-risks.md#risks) |
| **EU/Asia → LatAm inbound (tourist)**        | Varies                                                       | Bank FX 3–8%                  | ~1.3% all-in          | Yes              | 🟡 Episodic, low LTV                              |

## 3. The two cleanest beachheads

### A) Into-Brazil different-owner remittance (0.38% IOF lane)

- Government takes only **0.38%**, so our ~1.3–1.7% all-in genuinely beats Western Union's 5–7%.
- Large, recurring, sticky (families send monthly).
- **Risk:** competitive (Wise, Remitly, Nubank); margin thin; must nail on/off-ramp.

### B) Argentina individual USD access (post-April-2025 liberalization)

- Controls lifted for **individuals** → legal, growing demand to hold USD.
- Stablecoin model is *perfect* here (Argentines already heavy stablecoin users).
- **Risk:** policy reversibility (Argentina's history); **individuals only** — no corporate.

> **Recommendation:** prove **one** of these two in the POC. Argentina if you want fastest product-market fit on existing stablecoin behavior; Brazil-inbound if you want a larger, stickier TAM and can stomach the competition.

## 4. Why stablecoins change the corridor math

On correspondent-banking rails, the **spread + fee** floor is ~3–5% no matter the corridor — so even in a 0.38% tax lane you couldn't credibly hit 1.7% all-in. **Stablecoin rails drop the cross-border leg to ~0.5–1%**, which is the *only* reason the "our all-in target" column above is achievable. The corridor edge and the rail choice are the same decision.

## 5. What the model lets you flex

[`model/corridor-model.xlsx`](../model/) makes these inputs editable so you can pressure-test:

- take rate (fee), FX spread, government tax per corridor
- monthly active customers, average ticket, transactions/customer/month
- on/off-ramp cost, BaaS/card cost, compliance fixed cost
- → outputs: gross margin per corridor, blended ARPU, CAC payback, breakeven volume, 3-yr P&L.

## Sources

- Brazil IOF 2026 (3.5% / 1.10% / 0.38%, STF 16/07/2025): [CLM Controller – IOF 2026](https://clmcontroller.com.br/en/taxes/iof-tax-on-financial-transactions-complete-guide/), [BDO – IOF overturned/retained](https://www.bdo.global/en-gb/insights/tax/indirect-tax/brazil-changes-to-financial-transactions-tax-rates-overturned-but-other-measures-retained), [PagBrasil – IOF on intl Pix](https://www.pagbrasil.com/blog/pix/understanding-iof-tax-on-financial-operations-on-international-pix-payments/)
- Argentina controls lifted for individuals (Apr 2025): widely reported; **`[VERIFY-LEGAL]`** current status before launch.

# 05 — Cost & Tax Strategy

> You asked specifically for "ways to cut costs and taxes, even if we base in Curaçao or else." Here's the honest ranking — biggest lever first.

## 1. Cost levers, ranked by impact

| # | Lever                                                                                        | Saves                                                              | Catch                                                                        |
| - | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1 | **Stablecoin rails** (USDC/USDT) for the cross-border leg                              | 3–5% → ~0.5–1% on the FX leg;*and* dodges the de-risking wall | Needs VASP/DASP posture + on/off-ramp partners; regulatory`[VERIFY-LEGAL]` |
| 2 | **Agent / BaaS model** instead of owning licenses                                      | $1–3M (US) or $10M cap (PR) deferred until traction funds it      | Thinner margin, partner dependency                                           |
| 3 | **Low-tax operating base** (Panama territorial / PR Act 273 4% / El Salvador)          | Mainland US corp + state tax → near-0–4%                         | PR needs $10M cap + 8 staff; Panama needs real substance`[VERIFY-LEGAL]`   |
| 4 | **Merchant-of-Record for VPN** (Paddle/FastSpring/Lemon Squeezy)                       | Eliminates global VAT/GST registration, PCI scope, chargeback ops  | MoR takes ~5% of VPN revenue                                                 |
| 5 | **Shared services across entities** (one compliance/eng team, intercompany agreements) | Headcount duplication                                              | Needs clean transfer-pricing`[VERIFY-LEGAL]`                               |
| 6 | **Split IP entity** (BVI/Cayman) licensing IP to op entities                           | Tax efficiency at scale                                            | Only worth it at scale; ignore for POC                                       |

## 2. Tax structuring — the realistic version

- **Holding:** Delaware C-Corp (not for tax savings — for fundraising standardization). US worldwide rules mean the *holding* won't be a tax shelter; the savings come from where **operating income** is booked.
- **Operating income** booked in a **territorial / low-rate** jurisdiction (Panama territorial; PR Act 273 **4%**; El Salvador incentives) — this is the real tax lever, and it requires **genuine substance** there (staff, decisions, servers), not a brass plate. Empty shells get pierced.
- **Puerto Rico Act 273** is the standout *if funded*: 4% on IFE income, **0% on distributions to non-PR owners** — but $10M paid-in capital + 8 FT staff is a Series-A gate, not POC.
- **Curaçao:** the low e-zone tax is real but **irrelevant if you can't get correspondent banking** — and Caribbean money-services banking is exactly the hard part. Use Curaçao (if at all) for a passive IP/holding layer, **not** the operating money entity.
- **El Salvador:** genuinely cheap + dollarized + most permissive on stablecoins — the interesting home for the **rail entity** specifically.

## 3. Substance is not optional

Every low-tax structure above only survives audit/challenge with **real economic substance** in that jurisdiction — local staff, local decision-making, local infrastructure. The plan must budget for that (e.g., PR's literal 8-employee requirement). "Set it in Curaçao to pay 2%" without substance is how you get the structure unwound and back-taxed. `[VERIFY-LEGAL]` with a cross-border tax specialist before committing.

## 4. The cost stack the model prices

Fixed (annual, lean POC):

- BSA/AML officer + compliance tooling
- KYC/identity verification (per-check variable too)
- Legal/regulatory setup + ongoing counsel
- Core eng / app
- Substance cost in op jurisdiction (local staff/office)

Variable (per transaction / per customer):

- On/off-ramp + stablecoin network cost (~0.5–1%)
- BaaS/card processing (Pomelo) + interchange share
- KYC check per new customer
- Support
- CAC (affiliate/paid/referral)

→ All editable in [`model/corridor-model.xlsx`](../model/).

## 5. The honest caveat on "1%"

Hitting a **1% headline fee and still profiting** requires *all* of: stablecoin rails (lever 1) **and** a low-tax base (lever 3) **and** disciplined CAC. Drop any one and the math needs a higher take rate (1.5–2%) or larger tickets to work. The model shows exactly where the line is — use it before committing to "1%" in marketing.v
