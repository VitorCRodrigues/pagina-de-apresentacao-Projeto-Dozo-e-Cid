# 11 — Brazil: Tax, Custody & Card Mechanics

> [06](06-inbound-collection.md) and [07](07-complicated-cases.md) answer *"how do we legally collect and remit from Brazil"* (partner chassis). This doc answers the layer underneath: **what the customer's tax life actually looks like, what we can and can't harvest, and how the card + brokerage mechanics work.**
>
> **All figures are estimates from general knowledge, not verified counsel.** Brazilian tax law on foreign assets changed materially in 2024–2025 and has live legislative motion. Everything marked `[VERIFY-LEGAL]` needs a Brazilian tax specialist before it enters the model or any marketing copy.

---

## 1. "Do we register in the US and in every country we receive money from?"

**No — you register in two places and partner everywhere else.** That is the entire point of the chassis in [07](07-complicated-cases.md) §0.

The rule that governs this: **you need authorization where you personally perform the regulated act.** Three different perimeters, three different answers:

| Perimeter | Who must be licensed | Do *we* register? |
|---|---|---|
| **Collecting BRL / converting / remitting** (Brazil) | The Brazilian PSP + BCB-authorized FX institution / VASP | ❌ **No — the partner is the regulated party of record.** |
| **Holding securities + executing trades** (US) | The broker-dealer / custodian (IBKR, Apex, DriveWealth) — the customer is *their* client | ❌ **No — you are not the BD.** |
| **Giving investment advice / managing the account** | You | ✅ **Yes — the US RIA. This is the one license you own.** |

So the answer to "all the countries we receive money from" is: **you receive money in exactly one place — the customer's own US account.** Money is never *received by you* in Brazil; it is received by a licensed Brazilian partner and moved by that partner, on the customer's instruction, to the customer's own account abroad. You never hold it. That is what keeps the registration count at two.

⚠️ **The exception that catches people:** you generally cannot lawfully *solicit* Brazilian residents from a fully offshore shell ([06](06-inbound-collection.md) §4). Marketing in Portuguese, to people in Brazil, is soliciting. That's solved by the partner being the party of record and/or a light local contracting entity — not by incorporating further away.

**On the Florida office specifically:** having a US place of business means the RIA *must* register (SEC if eligible, otherwise Florida state). It does not create any obligation in Brazil.

---

## 2. The R$35,000 crypto exemption — it does not do what you want

**Short answer: no, we cannot use it, for four independent reasons — any one of which is fatal.**

### What the exemption actually is

Brazilian capital-gains rules exempt gains on *alienação* (disposal) of cryptoassets when the **total value of disposals in a calendar month is ≤ R$35,000** (~US$6,000–6,500 at ~5.4 BRL/USD). Above that, the whole gain is taxed on the 15% / 17.5% / 20% / 22.5% progressive ladder — **not just the excess**.

### Why it can't be harvested

| # | Reason | Consequence |
|---|---|---|
| **1** | **It is a *pessoa física* exemption.** It belongs to the individual, not to any company. | There is **zero corporate tax saving** available here. At absolute most it is a *customer-education feature*, never a structure. |
| **2** | **Buying USDT is an acquisition, not a disposal.** BRL → USDT creates no gain and therefore has nothing to exempt. | The exemption is irrelevant to our **on-ramp** — the leg we actually charge for. It only ever matters on the customer's way *out*. |
| **3** | **Once the asset is abroad, Lei 14.754/2023 likely displaces it.** From 1 Jan 2024 "aplicações financeiras no exterior" are taxed at a **flat 15%**, and the small-value monthly exemption does not apply to them. | Our entire chassis moves the money abroad **by design**. The exemption survives mainly for crypto held *on a Brazilian exchange* — the opposite of our product. `[VERIFY-LEGAL]` — whether crypto held abroad is captured as an *aplicação financeira* is the specific question to put to counsel. |
| **4** | **The operation isn't a crypto trade in the first place.** Under BCB Res. 519/520/521 ([06](06-inbound-collection.md) §1), BRL → stablecoin → abroad sits **inside the FX perimeter**. | It's an **FX operation bearing IOF**, not a crypto disposal bearing capital gains. The exemption is answering a question the transaction doesn't ask. |

### One live-status warning

**MP 1.303/2025** (June 2025) proposed a flat 17.5% on crypto gains and the **outright abolition of the R$35,000 exemption**. It expired/was rejected in October 2025 without conversion into law — so the exemption survived. **But the government's intent is on record and can return as a PL at any time.** Do not build anything that depends on this exemption existing in 24 months. `[VERIFY-LEGAL]` — confirm current status; this is fast-moving and my information has a cutoff.

### Two more traps worth knowing

- **Crypto-to-crypto swaps are taxable disposals in Brazil** (RFB COSIT 214/2021) — USDT→USDC inside our app is a taxable event for the customer even with no fiat involved. **Product implication: minimize in-app swaps, or you are silently generating tax events and reporting obligations for your customer.**
- **Reporting is separate from taxation.** Crypto activity is reportable to RFB regardless of whether any tax is due.

> **Verdict:** delete the R$35,000 exemption from the business case entirely. It is a customer-side footnote, not a lever. **The real Brazilian saving is IOF lane selection (§3), and it is much larger.**

---

## 3. The IOF lane map — this is the actual money

Total IOF paid depends on the **declared purpose** of the FX operation, and the spread between lanes is enormous:

| Lane | IOF | Use |
|---|---|---|
| **Inbound to Brazil, different owner** (remittance) | **0.38%** | Family remittance into Brazil |
| **Investment abroad** | **1.10%** | ✅ **Our lane** — customer funds their own US investment account |
| **Card / cash FX abroad** | **3.5%** | What their Brazilian bank charges them on every trip |
| **Transfer to own account abroad (non-investment)** | **3.5%** | Plain expatriation of funds |

### The structural advantage, stated plainly

A Brazilian tourist using a **Brazilian bank card in the US pays 3.5% IOF on every single transaction**, because each swipe is its own câmbio operation.

A Brazilian who has already moved money abroad through the **1.10% investment lane** and holds a USD balance offshore, spending on a **USD-denominated card**, performs **no câmbio at all** — there is no BRL leg, therefore no IOF. They paid 1.10% once, at the border, and nothing thereafter.

On a US$5,000 trip: **3.5% = $175 of IOF** vs **$0**, against a one-time 1.10% already paid on money that was going abroad anyway. That is the single largest, most defensible saving available to a Brazilian customer, and it compounds across every trip.

### ⚠️ The line you cannot cross — read this twice

**The 1.10% lane is defined by *purpose*, and the FX contract carries a declared *natureza da operação* code.** Money declared as "investment abroad" and actually used as a travel-spending workaround is a **misdeclaration**, exposed to recharacterization by RFB under *simulação / abuso de forma* — with the customer, not just us, carrying the liability.

The product must therefore be built in this order and no other:

> ✅ **The customer genuinely invests. The card spends from liquidity in that same real portfolio. Card is an incidental benefit of being an investor.**
>
> ❌ **The customer routes travel money through an "investment" wrapper to dodge 3.5%.**

These produce identical transaction logs and completely different legal outcomes — the difference is whether the investment is real. **Marketing copy must never lead with the IOF saving as the reason to open an account.** Lead with the investing thesis ([05](05-Examples.md) §7); let the IOF advantage be the thing customers discover, not the thing we sell. `[VERIFY-LEGAL]` — get this reviewed before a single line of Portuguese marketing ships.

---

## 4. The Brazilian customer's ongoing tax life (and the product hiding in it)

| Obligation | Trigger | Notes |
|---|---|---|
| **15% flat on foreign financial investments** | Lei 14.754/2023, from 1 Jan 2024 | Replaced the old progressive ladder + deferral-until-repatriation regime. Gains on realization. |
| **Offshore companies taxed annually** | Lei 14.754/2023 | Brazilian-controlled offshore entities taxed on an **accrual** basis at 15% — **deferral through a PIC is dead.** Directly relevant to the Cayman question (§8). |
| **IRPF — bens e direitos no exterior** | Any foreign asset | Annual declaration, asset-by-asset, in BRL at acquisition cost. Tedious and error-prone. |
| **DCBE to the Central Bank** | Foreign assets **≥ US$1,000,000** on 31 Dec | Annual. (Quarterly above US$100M.) Threshold was raised from US$100k — most retail customers are below it. |

> **The product hiding here:** Brazilians with foreign assets universally hate this paperwork, and most get it wrong. **"We generate your IRPF foreign-asset schedule and your DCBE"** is a concrete, high-retention feature that costs us a report generator and buys real switching cost. [08](08-competitors-differentiation.md) says there's no moat at launch — *compliance convenience is one of the few honest ones available*, and it's cheap.

---

## 5. ⚠️ The US estate tax trap — the biggest thing in this document

**This is not in any of the other docs, and it is the most consequential item here.**

A Brazilian is a **non-resident alien (NRA)** for US tax, and **Brazil has no income tax treaty and no estate tax treaty with the US.** That produces two very different outcomes:

| | Brazilian NRA holding **US-domiciled** assets |
|---|---|
| **Capital gains** | ✅ **Not taxed by the US** (NRA exemption) — the good news |
| **Dividends** | ❌ **30% US withholding**, no treaty reduction available |
| **Estate tax exemption** | ❌ **US$60,000** — versus ~$14M for a US person |
| **Estate tax rate above that** | ❌ **Up to 40%** |

### What that means concretely

A Brazilian client dies holding **US$500,000 of VOO** (US-domiciled S&P 500 ETF) in a US brokerage account. US-situs assets above the $60,000 threshold are exposed → **roughly US$140,000–155,000 of US estate tax.** The custodian is separately required to obtain an IRS **transfer certificate** before releasing the assets — commonly a **9–18 month** freeze on the family's money.

**Avenue and Nomad both put Brazilians into US-domiciled securities through US broker-dealers. Their clients are sitting on this exact cliff.** ([08](08-competitors-differentiation.md) lists both as competitors.)

### The fix, and why it's a real differentiator

**Irish-domiciled UCITS ETFs** solve both problems at once:

| | Direct US ETF (VOO/SPY) | Irish UCITS ETF (e.g. accumulating S&P 500) |
|---|---|---|
| US estate tax situs | ❌ US-situs → $60k cliff, 40% | ✅ **Non-US situs → no US estate tax at all** |
| Dividend withholding | ❌ 30% (no treaty) | ✅ **15% at fund level** (Ireland–US treaty), nothing further |
| Distributions | Paid out, taxable event | ✅ **Accumulating** — no distribution, simpler Brazilian reporting |

On a ~1.3%-yield index that's roughly **0.20%/yr of recovered dividend drag** — modest. **The estate tax difference is not modest; it is the whole inheritance.**

> **This is a genuine, structural differentiator that Avenue/Nomad cannot easily match**, because it requires access to LSE/Euronext/Xetra listings — which US-BD-based platforms generally do not offer. It is also *exactly* on-message for the retirement/legacy framing in [08](08-competitors-differentiation.md). **Consider making it the headline of the investing product.**

**Two caveats before betting on it:**
- **Situs follows the asset, not the broker.** US shares held at an Irish broker are still US-situs; Irish UCITS held at a US broker are still non-US-situs. **The ETF choice is what matters** — do not let anyone confuse this.
- **Fractional shares are the open question.** A US$200/month DCA product needs fractional execution. Fractional support is strong on US-listed ETFs and **patchy-to-absent on LSE-listed UCITS.** `[VERIFY]` with the custodian directly — if fractional isn't available on the UCITS line, the estate-tax-optimal asset and the DCA mechanic are in direct tension, and that changes the product. **This is the single most important operational question to resolve before building.**

---

## 6. The debit card for tourists in the US

Three routes, in increasing order of practicality:

| Route | How | Verdict |
|---|---|---|
| **US-issued card to an NRA** | US BIN via program manager (Marqeta/Lithic/Highnote) + sponsor bank. **Legally possible** — US CIP rules expressly permit a passport + country of issuance in place of an SSN for non-US persons. | 🟡 **Legal but gated by sponsor-bank appetite**, which is exactly the de-risking wall from [02](02-risks.md). Don't make the POC depend on it. |
| **Non-US-issued USD card** | Card issued outside the US, denominated in **USD**, spent in the US. Works on Visa/MC rails identically. | ✅ **Much easier, and the tax mechanics are better** — USD account + USD card + USD purchase = no câmbio = no IOF (§3). |
| **Stablecoin-collateralized Visa** | Issuers in this space specifically serve non-US cardholders, drawing against a USDC balance. | ✅ **Most on-thesis for the POC** — it is the same stablecoin balance the rails already produce, and issuance happens outside the US. |

> **Recommendation: route 3 for the POC, route 2 as the fallback. Do not chase a US BIN for non-residents at this stage** — it is the hardest possible version of the hardest existing risk. Note that [01](01-jurisdiction.md) names **Pomelo**, which issues in LatAm, not in the US; the doc's card assumption should be re-checked against whichever issuer actually supports our cardholder base.

---

## 7. Interactive Brokers — yes, and it's probably the right choice

**Can we use IBKR to manage his money?** Yes. IBKR supports an **advisor master account with client sub-accounts**: the account is opened **in the client's own name**, the RIA holds trading authority, and the RIA's fee is billed through IBKR. That maps exactly onto the [07](07-complicated-cases.md) chassis requirement — *customer's own US account, never pooled.* NRAs onboard with a W-8BEN. There is also API access and white-branding, so the app can be the front end.

**Why IBKR over DriveWealth/Apex/Alpaca:** IBKR gives access to LSE/Euronext/Xetra-listed **Irish UCITS ETFs** (§5). The US-focused custodians generally do not. Given the estate tax finding, **that single capability may be the deciding factor.**

### "Can he trade the stocks he wants, and the ETFs we offer?"

This is a genuine legal fork, and the answer is *both — but they must be structured as two different things in the same account*:

| Mode | What it is | Who's regulated | Our revenue |
|---|---|---|---|
| **Managed sleeve** | RIA has discretion; we choose the portfolio | **Our RIA** | ✅ **AUM fee (asset-based)** |
| **Self-directed sleeve** | Customer picks and executes their own trades | **IBKR — the customer is IBKR's brokerage client**; our app is a front end | ✅ Nothing directly, and that is deliberate |

> ⚠️ **The trap that turns you into a broker-dealer:** taking **transaction-based compensation** — a cut of commissions, spread, or per-trade fees on the self-directed side — is the classic BD registration trigger. **Charge asset-based advisory fees only.** [05](05-Examples.md) 4.5 already rules out becoming a BD; this is the specific way people accidentally become one anyway.

**On "ETFs offered through our app" — the Brazilian constraint bites here.** A public, marketed list of "our ETFs" aimed at Brazilian residents is a **public offering of foreign securities in Brazil**, which is not permitted — foreign securities may be offered to residents **only on a private basis, with individual identification and assessment** ([06](06-inbound-collection.md) §2). Curating and presenting a list *is* a recommendation.

The compliant shape is the one [06](06-inbound-collection.md) §5 already describes: an identified, assessed, onboarded customer accesses **their own account**, and advice is delivered inside that relationship — not broadcast on a public Portuguese-language site. **The website sells the thesis; the securities appear only after onboarding.**

---

## 8. Switzerland, Cayman, Uruguay, Paraguay — in this specific context

### Switzerland
Verdict unchanged from [10](10-structure-pricing.md): **wrong as the holding** ($162–254k/yr for a benefit that activates years out; VC friction; the holding privilege was abolished in 2020). Its real asset is **crypto-native banking that will actually onboard this profile** — which is insurance against R1, the banking wall. Buy it **only if the El Salvador/Panama banking route is tested and fails.** Nothing in the Brazil analysis changes this.

### Cayman
| Use | Verdict |
|---|---|
| Fund domicile (the pooled vehicle, [05](05-Examples.md) 4.4) | 🟡 Correct vehicle — but that's an accredited-investor product for later, not the LatAm retail core |
| HNW private investment company for estate-tax blocking | 🟡 Works (non-US-situs shares) — **but Irish UCITS ETFs achieve the same estate-tax result for free** (§5) |
| Tax deferral for Brazilian clients | ❌ **Dead.** Lei 14.754/2023 taxes Brazilian-controlled offshore entities annually on accrual. The deferral that used to justify a Cayman PIC no longer exists. |

> **Verdict: not at POC.** Adding it now is ~$15–40k/yr of scaffolding for a benefit the ETF selection already delivers.

### Uruguay — **the genuine find, and it's missing from [01](01-jurisdiction.md)**
Uruguay is a credible competitor to Panama for the LatAm operating entity, and nothing in the jurisdiction matrix currently reflects it:
- **Free zones** (Zonamerica, Aguada Park, WTC): **0% corporate income tax, 0% net worth tax, 0% dividend withholding to non-residents** on offshore-facing activity — better than Panama's territorial regime, not worse.
- **No exchange controls**, USD freely held, real private-banking infrastructure and correspondent relationships.
- **Employer social burden ~12–13%** versus Brazil's ~70–80% — the same Brazilian-adjacent talent at a fraction of the loaded cost, which speaks directly to the hiring question in [10](10-structure-pricing.md).
- **Brazil-adjacent** commercially and culturally; Montevideo is where Brazilian offshore wealth already goes, so the brand association is a tailwind rather than something to explain.
- Free-zone status requires a **local hiring quota and real substance** — which is a feature, since [01](01-jurisdiction.md) §3 already insists substance is non-negotiable. `[VERIFY-LEGAL]` on the current service-company quota and the post-2023 substance rules.

> **Recommendation: add Uruguay to the [01](01-jurisdiction.md) options matrix and price it head-to-head against Panama.** On this evidence it may win.

### Paraguay
- 10% corporate tax, territorial, USD accounts available — the headline looks fine.
- **But correspondent banking is the weak point**, and the tri-border region carries AML baggage that attracts enhanced scrutiny from exactly the US correspondent banks we depend on.
- **R1 (the banking wall) is our top existential risk. Paraguay makes R1 worse, not better.**

> ⚠️ **Do not confuse two different Paraguay questions.** [07](07-complicated-cases.md) §7 treats Paraguay as a *market* (customers, via the Argentina stack) — that stays fine. Using Paraguayan *banks* for group treasury is a separate and much worse idea. **Uruguay does that job properly; Paraguay does not.**

### The error to avoid with all four

> **Banking somewhere else does not move the regulatory perimeter.** The perimeter follows **where the customer is and where you solicit** — not where your bank account sits. A Montevideo account does not make a BRL→USD conversion for a Brazilian resident stop being a Brazilian FX operation requiring a BCB-authorized counterparty. **UY/PY/CH/KY are treasury and structuring answers. They are never a substitute for the Brazilian licensed partner in [06](06-inbound-collection.md).**

---

## 9. What to verify before any of this is load-bearing

**Blocking — the product design changes depending on the answer:**
1. **Fractional-share availability on Irish-domiciled UCITS ETFs** at the chosen custodian. If unavailable, the estate-tax-optimal asset and the DCA mechanic conflict (§5).
2. **Whether crypto held abroad is an "aplicação financeira no exterior"** under Lei 14.754/2023 — determines whether the R$35,000 exemption has any residual life at all (§2).
3. **The IOF-lane purpose question** (§3): confirm with Brazilian counsel where legitimate investing-with-incidental-spending ends and misdeclaration begins. **Nothing ships in Portuguese until this is answered.**

**Important, not blocking:**
4. Current status of crypto capital-gains rules post-MP-1.303 — whether a successor PL has passed.
5. Whether IBKR (or the alternative) will onboard our target NRA profile at POC ticket sizes, and the operating economics of $200/mo accounts.
6. Stablecoin-card issuer coverage for Brazilian cardholders, and whether [01](01-jurisdiction.md)'s Pomelo assumption survives.
7. Uruguay free-zone service-company hiring quota and post-2023 substance requirements (§8).

---

## Cross-doc corrections this raises

- **[01](01-jurisdiction.md)** — options matrix has no Uruguay row; it should, and it may outrank Panama. The Pomelo card assumption needs re-checking against a US-spend use case.
- **[05](05-Examples.md)** — Case Group 9 (insurance/PPLI) is framed as an HNW wrapper play. **The $60k NRA estate tax exemption is the actual driver behind that entire section**, and it goes unnamed. Worth stating explicitly, because Irish UCITS solve the same problem far lower down the wealth curve.
- **[08](08-competitors-differentiation.md)** — "no moat at launch" is too pessimistic. **Estate-tax-aware asset selection plus Brazilian tax reporting are two real, cheap, structural differentiators** that the US-BD-based incumbents cannot easily copy.
