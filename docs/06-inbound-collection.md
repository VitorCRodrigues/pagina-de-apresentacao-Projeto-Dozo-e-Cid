# 06 — Inbound Collection & Local Presence

> **The question:** how do we *receive* money from people in their own country (Pix in Brazil, transfers in Argentina) and move it into US investing — and do we need offices in São Paulo / Buenos Aires?
>
> **The locked constraint (yours):** *all investing goes to the US. We never invest in South America — the only reason to touch a SA country is to collect money / receive investments.* This is a **strength**, not a limitation: it keeps every SA entity out of the heaviest regime (local asset management / securities issuance) and confines SA activity to **payment + FX collection**, which is lighter and partnerable. In Brazil it also lands you in the **favorable 1.10% IOF "investment abroad" lane** (see [05 §2.2](05-Examples.md)).

---

## 1. The crux: the rail is easy, the *act* is regulated

"Brazilian pays Pix → we convert to stablecoin → send to the US" — the **Pix rail is trivial**. The regulated part is the *act underneath it*: **taking a resident's money to invest it abroad** touches three perimeters at once — **payments** (collecting local currency), **FX** (converting + remitting cross-border), and **securities distribution** (offering foreign investments to residents). You don't get to skip any of them by using crypto. In fact —

> ⚠️ **Brazil just closed the exact shortcut you described.** The BCB **barred electronic-FX (eFX) providers from settling cross-border remittances in stablecoins/crypto** (effective **Oct 1, 2025** `[VERIFY-date]`) — explicitly targeting the Pix→stablecoin→abroad model (**Nomad** and **Braza Bank** were named). Stablecoins are now *inside* the FX perimeter, usable only by a **licensed VASP (SPSAV)** under BCB Resolutions **519/520/521** (in force **Feb 2, 2026**): minimum capital, governance, **FX integration with a USD 100k/transaction limit** (pure VASP) / USD 500k (FX-authorized FI), travel-rule/AML, and **only auditable-reserve stablecoins** (algorithmic banned).

So the stablecoin leg is still usable — but as a **licensed/partnered activity**, not a loophole. Plan accordingly.

---

## 2. Brazil — what it actually takes

| Layer | Requirement | Capital-light path (POC) | Owned path (scale = "São Paulo office") |
|---|---|---|---|
| **Collect BRL (Pix)** | BCB **Payment Institution** authorization; Brazil is now **"authorization-first"** (no threshold grace) per BCB Rule #495/2025 + Joint Rule #14/2025 | Use a **licensed local PSP/acquirer** to collect Pix | Own Brazilian PI entity |
| **Convert + remit (eFX)** | Restricted to **BCB-authorized FX institutions**; stablecoin settlement only via **licensed VASP** | Partner with an **authorized FX institution / VASP** | Own VASP (SPSAV) + FX authorization |
| **Offer US securities to residents** | Foreign securities may be offered **only on a private basis** — individual identification/assessment, **no public solicitation** | Customer self-directs into their **own** US account (Avenue/Nomad model) | Locally registered distribution + US broker |
| **Tax** | **1.10% IOF** on investment abroad (our lane); 10% WHT on dividends remitted abroad from Jan 2026 (minor for our flow) | Pass IOF through transparently | same |

**Bottom line (Brazil):** you cannot "just collect Pix and ship it." You need **either** (A) a stack of **licensed local partners** (PSP + FX/VASP + US broker), **or** (B) your **own Brazilian entity** carrying PI + VASP/FX authorizations — which *is* the "São Paulo office." (A) for the POC, (B) at scale.

---

## 3. Argentina — what it actually takes

| Item | Status (2026) | Implication |
|---|---|---|
| **Impuesto PAIS** | **Eliminated Dec 23, 2024** | Big tailwind — the punitive FX-purchase tax is gone |
| **Individual USD access** | Controls **lifted for individuals** (Apr 2025) | Retail can legally buy USD to invest abroad |
| **Residual withholding** | A **~30% advance** income/personal-assets withholding may still apply to certain FX purchases — **creditable, not final** | A cash-flow drag, not a true cost `[VERIFY-LEGAL]` |
| **Local rails** | CBU/CVU transfers, Transferencias 3.0 / interoperable QR; **stablecoin usage is enormous** | Easiest LatAm market for a stablecoin on-ramp |
| **Offering foreign securities** | CNV-regulated; local alternative is **CEDEARs** (US stocks in ARS, money never leaves) | Self-directed foreign brokerage via an **ALYC**, or partner |

**Bottom line (Argentina):** structurally the friendliest market right now. POC via **partner/self-directed**; a **Buenos Aires entity** (registered ALYC or partner-of-record) is the scale move, not the start.

---

## 4. The office decision — directly

| | **A. Partner / rails model (no own office)** | **B. Own local entity (São Paulo + BA)** |
|---|---|---|
| Speed | Weeks–months | 12–24 months |
| Cost | Low (rev-share, partner fees/tariffs) | High (authorizations, capital, local staff, audits) |
| Compliance burden | Sits with the partner | Yours (PI + VASP/FX + securities, per country) |
| Control / margin | Lower / thinner | Full / fuller |
| Trust & brand locally | Borrowed | Strong (local presence) |
| Verdict | ✅ **POC and early scale** | 🟡 **Later, when volume funds it** |

> ⚠️ Even Option A usually needs **some local legal nexus** — you generally **cannot lawfully solicit residents from a fully offshore shell**. That's solved by (i) the local *partner* being the regulated party of record, or (ii) a **light local marketing/contracting entity**. A full *licensed* office (Option B) is a separate, later step. `[VERIFY-LEGAL]`

---

## 5. The cleanest structure (and why it self-reinforces)

**Money path:** customer → **licensed local on-ramp** (PSP + authorized FX/VASP) → the **customer's OWN US managed account** at a US custodian → **RIA** manages it (discretionary). 

Why this specific shape:
- ✅ Fits Brazil's **"private basis, no public solicitation"** rule for foreign securities (it's the customer's own outbound investment, not a publicly-marketed fund).
- ✅ Avoids **pooling/commingling** — the money is never in a fund you control (the 4.7 trap).
- ✅ Satisfies your **"all investing in the US"** rule perfectly.
- ✅ Puts you in Brazil's **1.10% IOF** lane, not the 3.5% one.
- ❗ **Implication for the hedge fund:** a *pooled* fund **cannot be publicly fed with SA retail money** (solicitation banned). So the **retail RIA + managed-accounts-in-the-customer's-name** model is the core LatAm product; the **pooled hedge fund is a separate, accredited-investor product** — best aimed at **US / qualified investors**, not LatAm retail. This is the same conclusion the brand-firewall and 4.4 reached, now reinforced by the inbound rules.

### Worked flow — Brazilian investing $1,000/mo into US stocks
1. Pays **R$** via **Pix** to a **licensed local PSP** (partner).
2. **Authorized FX/VASP** converts → **1.10% IOF** ($11) + **our take ~1%** ($10) → ~$979 lands.
3. Funds the customer's **own US managed account** at the custodian.
4. **RIA** invests in US assets; we earn the **FX margin on the inflow + recurring AUM fee**.
- Fully compliant, US-destination, no pooling. Repeats monthly → compounding AUM → the engine ([05 §7](05-Examples.md)).

---

## Sources
- Brazil bans stablecoin/crypto settlement in cross-border eFX (Nomad/Braza named): [CoinDesk](https://www.coindesk.com/policy/2026/05/02/brazil-s-central-bank-bans-stablecoin-and-crypto-settlement-in-cross-border-payments), [Ledger Insights](https://www.ledgerinsights.com/brazil-imposes-partial-ban-on-stablecoins-crypto-for-cross-border-payments-and-fx/)
- Brazil VASP framework (Res 519/520/521, eff Feb 2 2026; USD 100k/500k FX limits; algo-stablecoin ban; travel rule): [BDO](https://www.bdo.global/en-gb/insights/tax/world-wide-tax/brazil-central-bank-unveils-regulatory-framework-for-the-virtual-asset-market), [Global Legal Insights – Brazil 2026](https://www.globallegalinsights.com/practice-areas/blockchain-cryptocurrency-laws-and-regulations/brazil/)
- Foreign securities to Brazil residents "private basis only": [DLA Piper – Brazil investment rules](https://www.dlapiperintelligence.com/investmentrules/countries/handbook.pdf?c=BR)
- Brazil payment-institution "authorization-first" (Rule #495/2025, Joint Rule #14/2025): [Licks Attorneys](https://www.lickslegal.com/post/requirements-for-payment-institutions-in-brazil-following-the-recent-publications-of-bcb-rule-495-2025-and-joint-rule-14-2025/)
- Argentina eliminates Impuesto PAIS (Dec 23 2024): [VATupdate](https://www.vatupdate.com/2025/01/08/argentina-eliminates-the-impuesto-pais/), [Orbitax](https://orbitax.com/news/archive.php/Argentina-eliminates-the-Impue_a95d2aaa-c45f-4613-8932-e1c494127f53)
- All figures `[VERIFY-LEGAL]` with in-country counsel before committing.
