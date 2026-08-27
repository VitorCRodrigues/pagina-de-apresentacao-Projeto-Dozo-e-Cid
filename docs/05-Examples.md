# 05 — Worked Examples & Cases

> Every claim in the other docs, turned into dollars. Numbers are **illustrative** (industry-standard ranges, not quotes) — flag `[VERIFY]` before relying on any for a real decision. Rail/spread ranges move with partner and volume; taxes move with politics.
>
> **Key distinction used throughout:** every transfer has two deductions —
> **(A) Rail cost** = what it costs *us* to move the money (ours to optimize) and
> **(B) Government tax** (IOF etc.) = sovereign levy, applies on *any* rail, stablecoin or not.

---

## CASE GROUP 1 — Rail cost: why bank rails can't sell at 1%

### 1.1 — $1,000 transfer, correspondent banking (SWIFT) vs stablecoin

| Cost component | Correspondent banking | Stablecoin rails |
|---|---|---|
| FX spread | ~2.0% = $20 | on/off-ramp ~0.5–1% |
| Flat wire / SWIFT fee | $25–40 | on-chain ~$0.01–1 |
| Intermediary "lifting" fees | $10–20 | — |
| **Total COST to us** | **$55–80 = 5.5–8%** | **~$14.50 = ~1.45%** |
| Can we sell at 1%? | ❌ **No** — we'd lose $45–70/txn | ✅ Yes — charge 1–1.5%, still profit |

### 1.2 — Same comparison across ticket sizes (the flat-fee effect)

| Ticket | Bank-rail cost ($ / %) | Stablecoin cost ($ / %) | Verdict |
|---|---|---|---|
| $200 | ~$45 / **22.5%** | ~$3 / 1.5% | Bank rail absurd on small tickets |
| $500 | ~$50 / **10%** | ~$7.25 / 1.45% | Bank rail still impossible |
| $1,000 | ~$67 / **6.7%** | ~$14.50 / 1.45% | Bank rail loses money at 1% |
| $10,000 | ~$255 / **2.55%** | ~$95 / ~0.95% | Bank rail only viable on big tickets |
| $50,000 | ~$1,055 / **2.1%** | ~$425 / ~0.85% | Stablecoin wins, scales better |

**Takeaway:** flat bank fees make small-ticket retail (tourists, savers, remitters) *structurally* unservable at 1% on correspondent rails. Stablecoin cost is roughly **flat as a %**, which is exactly what a 1% retail promise needs.

### 1.3 — Why "undercut everyone to 1%" is a trap (not just hard)
- Incumbents charge 3–8% largely because the **bank rail costs that much** — same rail = same cost = you bleed.
- No cost edge → no margin → no moat. You'd be a thin reseller of an expensive pipe.
- The de-risking wall raises your *effective* bank-rail cost further (premium MSB pricing) or to ∞ (no account).
- **The only honest path to 1% is the stablecoin rail**, which also routes around the bank.

> ⚠️ **Honesty:** stablecoins cut **rail cost (A)**, NOT **government tax (B)**. Brazil already applies IOF to international Pix and is closing crypto-remittance gaps. Never market stablecoins as tax avoidance.

---

## CASE GROUP 2 — Corridors: customer's total cost + our margin

Customer total = **Gov tax + our spread + our fee**. Our gross margin = (spread + fee) − rail cost (~1.0–1.5% all-in assumed). Assume our take = **1.0% fee + 0.5% spread = 1.5%**, rail cost ~1.0%, so **our gross margin ≈ 0.5% of volume** at this pricing.

| # | Corridor / lane | Gov tax | Our take | **Customer total (us)** | Incumbent total | Customer saves | Our margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| 2.1 | Brazil — cash/card FX abroad | 3.5% | 1.5% | **5.0%** | 5–8% | ~0–3pp | 0.5% | ❌ tax swamps us |
| 2.2 | Brazil — investment abroad | 1.10% | 1.5% | **2.6%** | 2–4% | ~0–1.4pp | 0.5% | 🟡 structuring lane `[VERIFY-LEGAL]` |
| 2.3 | Into Brazil — diff-owner remittance | 0.38% | ~1.3% | **~1.7%** | WU 5–7% | **3.3–5.3pp** | 0.3–0.5% | ✅ beachhead |
| 2.4 | Argentina — individual USD | 0% | ~1.3% | **~1.3%** | bank/blue spread 3–10% | **large** | 0.3–0.5% | ✅ beachhead |
| 2.5 | Argentina — corporate | controls remain | — | — | — | — | — | ❌ don't serve |
| 2.6 | US → Mexico remittance | ~0% | ~1.3% | **~1.3%** | WU/Remitly 3–6% | 1.7–4.7pp | 0.3% | 🟡 huge TAM, brutal comp |
| 2.7 | EU/Asia → LatAm inbound (tourist) | varies | ~1.3% | **~1.3%** | bank FX 3–8% | 1.7–6.7pp | 0.3–0.5% | 🟡 episodic, low LTV |
| 2.8 | Venezuela — flight capital | sanctions (not tax) | high | opaque | opaque/high | high | high | ⚠️ OFAC/PEP — defer |

### Worked numbers behind two beachheads

**2.3 — Brazilian family receives $500/mo from US relative (diff-owner lane)**
- Gov tax 0.38% = $1.90 · our take ~1.3% = $6.50 → **customer gets ~$491.60 worth** vs Western Union (~5–7% → ~$465–475).
- **Customer saves ~$17–27/transfer**; we earn ~$6.50 revenue, ~$2.50 gross margin. Monthly + sticky → strong LTV.

**2.4 — Argentine saver buys $2,000 USD to hold**
- Gov tax 0% (individuals, post-Apr-2025) · our take ~1.3% = $26 → costs **$2,026 all-in**.
- Bank/official + spread or blue-market friction easily 3–10% = $60–200. **Customer saves $34–174.** We earn $26, ~$10 gross margin. Argentines already use stablecoins → low friction.

---

## CASE GROUP 3 — Starting-capital scenarios

| # | Path | Capital | Time | What you get | Stage |
|---|---|---|---|---|---|
| 3.1 | **Lean agent pilot** | **$50–150k** | weeks | Prove 1 corridor, real money, fractional compliance | POC |
| 3.2 | **Agent → break-even** | **$250–500k** | ~18 mo (model) | Run to cash-positive; ~$321k max burn (base case) | POC→scale |
| 3.3 | **Panama op entity** | **$100–300k** + cap reqs `[VERIFY-LEGAL]` | months | Owned offshore entity, real substance | Scale |
| 3.4 | **Lithuania EMI** | **€600–750k** (€350k cap + €250–400k yr1) | 6–12 mo | EU/EEA passport (30 countries) | If EU core |
| 3.5 | **Own US multi-state MTLs** | **$1–3M+** (+ bonds $50–500k/state, min net worth) | 1–3 yr | Full US licensure | Funded scale |
| 3.6 | **Puerto Rico Act 273 IFE** | **$10M paid-in + 8 staff** | 6–12 mo | 4% tax + US rails + 0% on non-PR distributions | Series A+ |

**Hidden capital most plans forget (budget separately from opex):**
- **Surety bonds / minimum net worth** for money transmission — required even in agent models (the principal holds them).
- **Pre-funded float** at ramp/BaaS partners — settlement working capital, even on fast stablecoin rails.
- **Security deposits** some partners require to onboard.

> **Bottom line:** genuine minimum to *test viability* = **$50–150k**; to *reach break-even* = **$250–500k**. Owned licenses = **$600k–$10M+**.

---

## CASE GROUP 4 — The "hedge fund that does everything" question

You can't legally run FX + cards + a fund + US-stock allocation in **one entity** — three regimes, no shared chassis. Here's each path mapped:

| # | Structure | Regime(s) | Who you can serve | Cost | Verdict |
|---|---|---|---|---|---|
| 4.1 | **One merged "hedge fund that does it all"** | MSB **+** Advisers Act **+** (BD) all in one entity | nobody (un-bankable) | — | ❌ legally incoherent; banks/custodians reject |
| 4.2 | **Retail investing via RIA + custodian** | Investment Advisers Act (RIA) + custodian (Apex/DriveWealth/Alpaca) | **retail** — managed accounts, fractional US stocks | RIA setup ~$10–30k + ongoing | ✅ serves the core base |
| 4.3 | **White-label / "RIA-in-a-box"** | partner holds RIA | retail | rev-share, low upfront | ✅ fastest investing launch |
| 4.4 | **Real hedge fund (pooled)** | Advisers Act (RIA or <$150M exemption) + Securities Act Reg D + ICA 3(c)(1)/3(c)(7) | **accredited / qualified investors only**, privately solicited | fund admin+audit+legal **~$50–150k/yr** standing | 🟡 separate, later, HNW line |
| 4.5 | **Become a broker-dealer (execute trades)** | FINRA + SEC | anyone, but heavy | high, slow | ❌ unnecessary — use a custodian |

### Why merging fails — the two killers
- **Commingling:** money-transmitter customer funds must sit in *safe, liquid permissible investments* and **cannot be invested**; fund/investor money must be **segregated and custodied**. Mixing transmission money with investment money = enforcement risk.
- **Customer mismatch:** a hedge fund (Reg D) serves **accredited US investors**, not retail tourists/savers — a different customer entirely. And **cross-border solicitation** (marketing the fund in LatAm/EU/Asia) triggers *each* country's securities law.

### The "US investor who invests with us AND travels" — done right (4.6)
- Allocates **$50,000** to US stocks via your **RIA + custodian** (managed account). RIA earns, say, **0.5–1% AUM = $250–500/yr**.
- Same person uses your **multi-currency card** on a LatAm/Europe trip, spending **$3,000** abroad at ~1.3% vs a bank's 3–8% → **saves ~$50–200** per trip; you earn interchange.
- This is a **bundle across separate-but-affiliated entities** (one HoldCo, one brand family) — **not** one merged license. Exactly the brand-firewall pattern extended.
- ⚠️ Serving **US investors** pulls you **onshore** (US RIA/SEC) — in tension with the offshore money/VPN entities. That fork is real: the investing line is the piece that drags you back to US jurisdiction.

### 4.7 — "Direct FX gains into the hedge fund / RIA" — the right way vs the commingling trap
Your instinct is correct *if* "gains" means the **company's profit** or the **customer relationship** — and illegal if it means the **customer's cash**. Three readings:

| Reading | Legal? | What it actually means |
|---|---|---|
| **Funnel** — convert FX *customers* into RIA clients | ✅ **This is the gold** | FX acquires cheaply (0.3–0.5% margin, high frequency); investing monetizes (recurring 0.5–1%/yr AUM, high LTV). The "gain" that flows is the *relationship*, not the cash. |
| **Capitalization** — use FX *company profit* to seed the RIA / GP-commit the fund | ✅ Fine | That's just your own retained earnings. |
| **Sweep** — auto-route a *customer's* FX dollars into the fund/investments | ❌ **Illegal** | MSB customer funds must be safeguarded in permissible liquid assets and **cannot be invested**. Moving them into securities needs the customer's **explicit advisory agreement + custody + investor suitability/KYC**. Automatic = commingling + unregistered advice + fiduciary breach. |

> **Worked (the funnel):** Argentine saver buys $2,000 USD via FX (we earn ~$10 once). 30 days later she *opts in* to a $1,500 USD managed portfolio → RIA earns ~0.75% = **$11.25/yr recurring, compounding, sticky**. The FX txn was the on-ramp; the AUM is the business.

### 4.8 — Pensions / retirement for employees & tourists — what's actually possible
| Target | US IRA / 401(k)? | What you CAN offer |
|---|---|---|
| **Tourists / LatAm retail (non-resident aliens)** | ❌ No — needs **US earned income**; investment profits don't qualify | ✅ **Taxable USD managed account via the RIA**, marketed as long-term/retirement savings. (HNW: offshore retirement/insurance wrappers — complex, defer.) |
| **Your own staff** | ✅ Standard 401(k) | A benefit/cost, **not a product** |
| **Other companies' employees (B2B2C)** | local pension regime | Regulated recordkeeper/TPA + local law (MX AFORE, BR previdência) — **heavy, defer** |

> The realistic, powerful product is a **USD retirement-style managed account** (the RIA again), which leans straight on the demand thesis (**Case Group 7** below). Just **don't call it a US IRA** — it isn't one.

---

## CASE GROUP 5 — Customer journey examples (personas, in dollars)

| # | Persona | What they do | They pay us | They save vs incumbent | Our gross margin | Notes |
|---|---|---|---|---|---|---|
| 5.1 | **Argentine saver** | Buys $2,000 USD to hold | $26 (1.3%) | $34–174 | ~$10 | Existing stablecoin habit = low friction |
| 5.2 | **Brazilian family** | Receives $500/mo from US | $6.50/mo (1.3%) | $17–27/mo | ~$2.50/mo | Recurring + sticky = best LTV |
| 5.3 | **LatAm tourist** | Spends $1,500 in Europe on card | ~$20 (1.3%) | $25–105 | interchange | Episodic; card drives daily use |
| 5.4 | **US investor + traveler** | $50k managed + $3k card spend abroad | $250–500/yr AUM + interchange | $50–200/trip | AUM + interchange | Bundle, separate RIA entity (4.6) |
| 5.5 | **Mexican worker (US→MX)** | Sends $300/mo home | ~$4/mo (1.3%) | $5–14/mo | ~$1/mo | Huge TAM, brutal competition |
| 5.6 | **EM saver → US stocks** | Moves $5,000 savings into a USD S&P managed account | $65 FX once + ~0.75% AUM | escapes the ~10x wealth gap (Grp 7) | ~$10 once + **$37.50/yr recurring** | **The high-LTV core** — FX on-ramp → RIA |
| 5.7 | **Retirement saver** | $200/mo into a USD retirement-style managed account | ~$2.60/mo FX + AUM | local pension/market destroys value | FX margin + recurring AUM | Sticky, compounding; **not** a US IRA (4.8) |
| 5.8 | **VPN subscriber** | $6/mo plan | $6/mo | n/a | ~$3.30/mo after MoR + server | **Separate entity/brand** (see [Other Services](04-Other%20Services.md)) |

---

## CASE GROUP 6 — Unit economics (ties to `model/corridor-model.xlsx`)

Base-case placeholder assumptions (flex them in the model):

| Metric | Value | Note |
|---|---|---|
| ARPU / customer / month | **$20.40** | FX $18.00 + card $2.40 |
| Gross profit / customer / month | **$11.50** | after rail + support |
| Customer lifetime | 25 mo | at 4% monthly churn |
| LTV | **$287.50** | gross-profit basis |
| CAC + KYC | $26.50 | ⚠️ optimistic — fintech CAC often $50–200 |
| **LTV / CAC** | **10.85x** | ⚠️ inflated by low CAC assumption |
| CAC payback | **2.3 mo** | ⚠️ same caveat |
| First profitable month | **18** | base case |
| Max cumulative burn | **~$321k** | ≈ capital needed to cash-positive |
| Year-3 revenue / op profit | **~$3.33M / ~$976k (29%)** | base case |

> The model's value isn't prediction — it's showing **which inputs the business is most sensitive to**. Push **CAC** to $100 and watch LTV/CAC and payback degrade: that's the assumption the Phase-1 pilot must measure.

---

## CASE GROUP 7 — The demand thesis: why EM investors need US access (the real core)

This reframes the whole business: **FX/remittance is the acquisition funnel; US-market investing is the product.**

### 7.1 — The wealth-destruction gap (why anyone switches)
| Measure (in USD terms) | Since 2008 |
|---|---|
| Brazil equities (EWZ, proxy for IBOV) | ATH **$102.21 (May 2008)** → ~$30–50 today = **down ~50–70%** |
| S&P 500 | **≈ +300–400% (~4x)** |
| Relative divergence | **≈ 10x** |

A dollar a Brazilian put in their home index in 2008 is worth ~**$0.35** today; the same dollar in the S&P 500 is ~**$4+**. Argentina (Merval in USD) was worse for most of the period. **This gap is the entire reason the business exists** — the customer isn't shopping for a cheaper remittance, they're seeking *escape from a wealth-destroying currency and market.* In local-currency terms IBOV prints "record highs," which masks the destruction — measuring in USD is the unlock.

### 7.2 — Strategic implication: the funnel
| Layer | Role | Margin shape |
|---|---|---|
| **FX / remittance** | cheap, high-frequency **acquisition + on-ramp** | thin (0.3–0.5%), one-shot |
| **Investing (RIA)** | the **margin + retention engine** — the actual product | recurring 0.5–1%/yr AUM, **high LTV** |
| **Card** | daily utility + travel savings (keeps them active) | interchange |
| **VPN** | unrelated side bet | separate entity |

⚠️ This pulls the center of gravity **onshore** (US RIA/SEC + custodian) — the opposite jurisdiction logic from the money/VPN entities. **Embrace the split:** offshore money rails, **onshore investing entity**.

### 7.3 — LTV reframed (why this matters more than the FX margin)
A pure-FX customer (Group 6) is worth ~**$287 LTV**. Convert that *same* customer into a $5,000 USD managed account at 0.75% AUM and you add ~**$37.50/yr recurring** — and investing customers churn far less (money parked in US assets is sticky). **FX keeps CAC low; the investing conversion multiplies LTV.** That is the business; the 1% FX promise is the hook that opens the door.

---

## CASE GROUP 8 — Country-by-country inbound matrix (how each market funds us → US)

> Two use cases per country: **(T) Tourist** — convert home currency to spend cheaply in the US (a *payment/travel* use); **(I) Investor** — move money to invest in the US through us (a *capital* use). The capital use is where controls/taxes bite; the travel use is viable almost everywhere that isn't capital-controlled.
> **Legend:** ✅ viable · 🟡 works with friction / only via a regulated channel · ❌ avoid. All thresholds `[VERIFY-LEGAL]`.

### 8.1 — Latin America (the core market)
| Country | Local rail (how they pay us) | Controls / tax on money leaving | T: Tourist→USD | I: Invest→US | Verdict |
|---|---|---|---|---|---|
| **Argentina** | CBU/CVU, Transferencias 3.0, QR | Controls **lifted for individuals** (Apr 2025); **PAIS tax eliminated** (Dec 2024); ~30% *creditable* WHT residual | ✅ | ✅ huge stablecoin use | ✅ **Beachhead** — friendliest |
| **Brazil** | **Pix** | eFX restricted to authorized institutions; **stablecoin only via licensed VASP** (USD 100k/txn); IOF **1.10%** invest / 3.5% card-cash / 0.38% remit | 🟡 (3.5% IOF on card) | ✅ via licensed partner (1.10% lane) | ✅ **Core**, needs local partner ([06](06-inbound-collection.md)) |
| **Mexico** | **SPEI**, CoDi/DiMo | Open, no real controls | ✅ | ✅ | ✅ Huge, US-adjacent |
| **Chile** | Transferencias (CLP) | Open; CMF/BCCh reporting; worldwide tax | ✅ | ✅ | ✅ Higher-income, clean |
| **Peru** | Local transfers; **USD widely used** | Open, no controls; partly dollarized | ✅ | ✅ | ✅ Dollar-friendly, easy |
| **Colombia** | PSE, **Bre-B** (instant) | **Must channel via authorized intermediary (IMC)** / official FX market; worldwide tax + reporting | 🟡 | 🟡 (regulated channel only) | 🟡 Doable via IMC |
| **Uruguay** | Local | Very open, stable, USD-friendly | ✅ | ✅ | ✅ Small but pristine |
| **Ecuador** | Local (**USD economy**) | **Dollarized** — no FX needed | ✅ (no FX) | ✅ pure investing | ✅ Unique: USD-native |
| **Panama** | Local (**USD**) | Dollarized; low tax | ✅ | ✅ | ✅ USD hub (also an op-base candidate) |
| **Paraguay** | Local | Open, small market | ✅ | 🟡 | 🟡 Minor |
| **Bolivia** | Local | **Severe USD shortage / de-facto controls** | 🟡 | ❌ | ❌ USD crisis |
| **Venezuela** | Informal | **Sanctions / OFAC**; controls | ⚠️ | ⚠️ | ❌ Defer (OFAC/PEP, see [02](02-risks.md)) |

### 8.2 — Europe (EU members share MiCA + PSD2 + free capital movement)
| Country | Local rail | Controls / tax on money leaving | T: Tourist→USD | I: Invest→US | Verdict |
|---|---|---|---|---|---|
| **Eurozone** (DE, FR, ES, IT, PT, NL, IE…) | **SEPA / SEPA Instant** | Free capital movement; home-country cap-gains tax | ✅ | ✅ | ✅ but **incumbent-saturated** (IBKR, Trade Republic) |
| **United Kingdom** | Faster Payments | Free; FCA-regulated | ✅ | ✅ | ✅ Mature, competitive |
| **Switzerland** | SIC / local | Free | ✅ | ✅ | ✅ Wealthy (also a VPN-entity base) |
| **Non-euro EU / Nordics** (PL-BLIK, SE-Swish, DK, CZ…) | Local instant | Free (EU) | ✅ | ✅ | ✅ Easy |
| **Turkey** | Local (FAST) | Lira instability → strong USD demand; some FX friction | ✅ | 🟡 | 🟡 High demand, watch controls |
| **Russia** | — | **Sanctions** | ❌ | ❌ | ❌ Do not serve |

> **Europe reality:** near-zero regulatory friction, but **low margin and saturated** — Europeans already have cheap US-market access. The pitch here is **travel-to-US FX savings + the bundle**, *not* "access to America." Lower priority than LatAm.

### 8.3 — Asia & Middle East
| Country | Local rail | Controls / tax on money leaving | T: Tourist→USD | I: Invest→US | Verdict |
|---|---|---|---|---|---|
| **China** | Alipay/WeChat (domestic only) | **$50k/yr quota; overseas equity investment NOT a permitted use — strictly restricted**; tightening 2026 (KYC > RMB 5k, anti-smurfing) | 🟡 (travel within quota) | ❌ effectively closed | ❌ Don't build retail outbound investing |
| **India** | **UPI** | **LRS $250k/yr**; **20% TCS** on investment remit > ~₹10 lakh (creditable); travel 2% | 🟡 (TCS) | 🟡 legal but 20% TCS drag | 🟡 Big TAM, tax friction (VPN-side India rules differ — separate co.) |
| **Singapore** | **PayNow** | Free; financial hub | ✅ | ✅ | ✅ Easy, wealthy |
| **Hong Kong** | **FPS** | Free (despite mainland) | ✅ | ✅ | ✅ Hub |
| **Japan** | Zengin / local | Free; residents invest abroad freely | ✅ | ✅ | ✅ Large conservative savers |
| **South Korea** | Local instant | Open **with BoK reporting** over thresholds | ✅ | ✅ (reporting) | ✅ Via reporting |
| **UAE / Gulf** | Local (AED) | Free, no controls; 0% income tax | ✅ | ✅ | ✅ Wealthy & free (VPN-side Gulf rules harsh — separate co.) |
| **Indonesia / Philippines / Vietnam / Thailand** | Local instant (PH InstaPay, etc.) | Varying controls (e.g., ID holding periods) | ✅/🟡 | 🟡 emerging | 🟡 Case-by-case |

### 8.4 — Synthesis (where to point effort)
| Tier | Markets | Why |
|---|---|---|
| ✅ **Easy + high-intent** (free capital, weak home market = real demand) | **Argentina, Peru, Uruguay, Ecuador, Panama, Chile, Mexico** | Free-ish rails **and** the wealth-escape demand thesis (Group 7) |
| 🟡 **Big but frictioned** | **Brazil** (licensed partner), **Colombia** (IMC channel), **India** (20% TCS), **Turkey**, **SE Asia** | Large TAM, real demand, but a regulatory/tax toll to engineer around |
| 🟢 **Easy but low-intent** | **Eurozone, UK, Switzerland, Singapore, HK, Japan, Korea, UAE** | Frictionless, wealthy — but they already have US access; sell **travel FX + bundle**, not "access" |
| ❌ **Avoid** | **China** (retail outbound investing banned), **Bolivia** (USD crisis), **Venezuela / Russia** (sanctions) | Closed or toxic |

**Strategic read:** the demand thesis (escape a wealth-destroying market/currency) is strongest in **LatAm + India + Turkey + parts of SE Asia** — that's where "invest in America through us" is a *need*, not a convenience. Developed Europe/Asia is a **travel-FX + bundle** play, not an investing-access play. **China retail outbound investing is off the table.** Tourist-FX, by contrast, works almost everywhere outside hard capital controls.

> ➡️ Each friction (🟡) market is turned into an actionable playbook in **[07 — Solving the Complicated Markets](07-complicated-cases.md)** — which shows they all share one reusable solution.

---

## CASE GROUP 9 — Insurance / annuity wrapper for high-value businesses (the "Buffett float" question)

> The idea: premiums → the hedge fund → slow, Buffett-style compounding, **corporate / high-value clients only**. That's **Berkshire's float model** — and the fork below is the whole answer.

### 9.1 — The honest fork
- **Real float** (Buffett's actual edge) = you *hold the insurance liability* → you **are the insurer** → capital-heavy.
- **The lazy ~90% version** = a **PPLI / IDF wrapper**: the hedge fund sits *inside an existing carrier's* policy, you're the **investment manager**, premiums compound **tax-deferred**, and it's legally **accredited/qualified-buyer only** — which *is* the "high-value businesses" constraint, for free. You do **not** become an insurer.

### 9.2 — How much it needs
| Path | What you are | Setup | Ongoing | Verdict |
|---|---|---|---|---|
| **PPLI / IDF manager** | manager inside a partner carrier's policy | ≈ the RIA ($10–30k) + IDF legal/admin | shared with the fund (~$50–150k/yr) | ✅ **Do this** — mostly already in the hedge-fund budget |
| **Offshore captive insurer** | the carrier (you hold float + liability) | **$0.5–2M+ + reserves scaling with liabilities** + actuary | actuarial / audit / reserves | 🟡 the *true* Buffett-float path — defer |
| **US licensed insurer** | onshore carrier | **$10M+ risk-based capital** + state licenses | very heavy | ❌ No |

### 9.3 — The line you cannot cross
**"Credible return" = expected / disclosed / track-record. NEVER guaranteed.** A guaranteed return funded by equities without insurer reserves is either an insurer obligation (needs the capital above) or — without it — a **Ponzi / securities-fraud profile**. Market it as *"managed, tax-advantaged, historically X,"* not *"we guarantee Y."* `[VERIFY-LEGAL]`

### 9.4 — Why it fits the rest of the plan
- Feeds the **hedge fund** (Case Group 4.4) and the **all-investing-goes-to-US** rule — the wrapper just makes the compounding tax-advantaged.
- Natural extension of the **B2B2C / high-value-client** channel ([08 §4.2](08-competitors-differentiation.md)).
- IDF must satisfy IRC **§817(h) diversification** + the **investor-control** doctrine — get insurance/tax counsel before structuring. `[VERIFY-LEGAL]`

**Verdict:** ✅ Possible and on-thesis — but as a **PPLI wrapper on the hedge fund** (manager, not carrier). The captive (real float) is a later, capital-heavy chapter; an own US insurer is never the early move.

---

## Sources (corridor taxes)
- Brazil IOF 2026 (3.5% / 1.10% / 0.38%, STF 16/07/2025): [CLM Controller](https://clmcontroller.com.br/en/taxes/iof-tax-on-financial-transactions-complete-guide/), [BDO](https://www.bdo.global/en-gb/insights/tax/indirect-tax/brazil-changes-to-financial-transactions-tax-rates-overturned-but-other-measures-retained), [PagBrasil – intl Pix IOF](https://www.pagbrasil.com/blog/pix/understanding-iof-tax-on-financial-operations-on-international-pix-payments/)
- Argentina controls lifted for individuals (Apr 2025): widely reported; `[VERIFY-LEGAL]` current status before launch.
- Brazil equities in USD (EWZ ATH $102.21 May 2008, never recovered): [AvaTrade – MSCI Brazil / EWZ](https://www.avatrade.com/trading-info/financial-instruments-index/etfs/msci-brazil-index-fund); IBOV history: [Macrotrends – Bovespa 1993–2025](https://www.macrotrends.net/2597/bovespa-index-brazil-historical-chart-data)
- Non-resident aliens & US IRAs (need US earned income; investing alone doesn't qualify): [Blacktower – NRA 401k/IRA](https://www.blacktowerus.com/news/non-resident-management-of-401k-and-ira-accounts/), [Terms.law – Foreigners & retirement accounts 2026](https://terms.law/Invest-USA/stocks-trading/retirement-accounts.html)
- India LRS $250k/yr + 20% TCS on investment remittances: [Razorpay – Outward remittance & TCS 2026](https://razorpay.com/blog/outward-remittance-limit-india-tcs-rules/), [RBI – LRS FAQ](https://www.rbi.org.in/Commonperson/english/Scripts/FAQs.aspx?Id=1834)
- China $50k/yr forex quota, overseas equity investment restricted, 2026 tightening: [Sino-blawg – China tightening FX control 2026](https://www.sinoblawg.com/china-is-tightening-foreign-exchange-control/), [Harris Sliwoski – China $50k limit](https://harris-sliwoski.com/chinalawblog/chinas-50000-yearly-funds-transfer-limit/)
- Colombia must channel foreign investment via authorized intermediary (IMC): [ICLG – Colombia Corporate Tax 2026](https://iclg.com/practice-areas/corporate-tax-laws-and-regulations/colombia), [PwC – Colombia individual other taxes](https://taxsummaries.pwc.com/colombia/individual/other-taxes)
- Rail-cost, capital, and securities-structure figures are **illustrative industry ranges** — `[VERIFY]` with partners/counsel before committing.
