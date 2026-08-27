# 12 — Team Structure: Dividing Work Across Four Nationalities

> **The question:** with a Brazilian, an American, an Ecuadorian and a Guatemalan on the team, should we divide each member's work and obligations?
>
> **Short answer: yes — but along a completely different axis than nationality.** Dividing by nationality is the intuitive move and it is the wrong one: it doesn't produce the tax benefit people expect, it creates legal exposure, and it distracts from the division that actually matters (regulated vs. unregulated function).
>
> **✅ RESIDENCE RESOLVED:** the **Brazilian is in Brazil**; the **American, Ecuadorian and Guatemalan are all in the US**. §1–§8 are the framework; **[§10](#10--the-resolved-answer-3-in-the-us-1-in-brazil) is the concrete role split** and supersedes the open questions in §9.
>
> `[VERIFY-LEGAL]` throughout — employment, PE and immigration rules are country-specific and this is a framework, not counsel.

---

## 1. First: nationality is nearly irrelevant. **Residence is everything.**

This is the single most common structural error and it is worth being blunt about.

A **Brazilian national living in Miami** is a US employment, US payroll and US tax problem. Brazil is barely involved.
A **US citizen living in Montevideo** is *both* a US tax problem (citizenship-based taxation) *and* a Uruguayan employment problem.
An **Ecuadorian living in Ecuador** creates Ecuadorian employer obligations and Ecuadorian permanent-establishment exposure — regardless of what passport anyone else holds.

**What follows the passport:** immigration/work authorization, and (for Americans) worldwide tax filing.
**What follows the body:** payroll, social security, labor law, permanent establishment, and which regulator can reach you.

> **The second one is where all the money and all the risk is.** Until we have a residence map — four names, four countries of tax residence, four physical work locations — every number below is a template rather than an answer. **This is the gating input.**

### The thing not to do

Do not allocate work *by nationality* in order to chase tax or regulatory outcomes. Three reasons:

- **It doesn't work.** Obligations attach to where the person sits and what they do, not to their passport. Giving the Brazilian "the Brazil work" changes nothing about Brazilian tax if he lives in Miami — and changes everything if he lives in São Paulo, in the wrong direction (§5).
- **It's a legal problem in the US entity.** National origin is a protected characteristic. At four employees the federal 15-employee threshold isn't met yet, but that threshold arrives quickly and the habit is what gets audited later. The defensible framing is a **bona fide qualification** — "Portuguese-speaking, has operated in the Brazilian market" — not "is Brazilian." Those sound similar and are not the same thing.
- **It solves the wrong problem.** The division that determines whether this company is legal is regulated-vs-unregulated function. Nationality is noise next to it.

---

## 2. The division that actually matters

| Function | Who may perform it | Where they must sit | Risk if wrong |
|---|---|---|---|
| **Investment advice / managing client accounts** | A **registered IAR** under our RIA (Series 65 or equivalent) | Wherever the RIA's registration reaches — practically, the US | Unregistered advice; the RIA is the one license we own ([11](11-brazil-tax-and-mechanics.md) §1) |
| **BSA/AML officer** | A **named, accountable individual** | At/for the regulated entity | Personal liability; this is a role, not a task to spread around |
| **Customer-facing FX + onboarding in Brazil** | ⚠️ **The licensed partner's people — not ours** | Brazil | Us performing a regulated act without BCB authorization ([06](06-inbound-collection.md) §2) |
| **Soliciting/marketing to Brazilian residents** | Danger zone — needs the partner as party of record and/or a local contracting entity | Deliberate, not accidental | Unlawful solicitation ([06](06-inbound-collection.md) §4) |
| **Engineering, product, design, data** | Anyone | **Anywhere — lowest PE risk of any function** | Minimal |
| **Support / ops (non-advisory)** | Anyone | Anywhere, with scripts that don't drift into advice | Support answering "should I buy X?" is unregistered advice |
| **Directors/officers of a low-tax entity** | Real decision-makers, resident there | **In the substance jurisdiction** | Substance failure unwinds the structure ([01](01-jurisdiction.md) §3) |

> **Read the table again as an org chart.** With four people, the non-negotiable assignments are: **one person owns the RIA/advisory spine, one person owns compliance/AML.** Those two roles are named individuals with personal accountability. The other two are free-placement (engineering, growth). That's the division — and it is determined entirely by function, with nationality never entering it.

---

## 3. What each residence actually costs and triggers

**⚠️ Given the resolved map, only the US and Brazil rows apply.** The Ecuador and Guatemala rows are retained for reference only — those two people are in the US, so US employer burden and US tax residence govern them, not their home countries'. Keep the rows in case anyone relocates.

| | Employer burden | Notable obligations | PE risk if customer-facing |
|---|---|---|---|
| **US (Florida)** | ~1.25–1.35× salary (FICA, FUTA/SUTA, health, workers' comp). **No state income tax.** | W-2, standard | n/a — we want US presence |
| **Brazil** | **~1.7–1.8× salary** under CLT (INSS 20%, RAT, Sistema S, FGTS 8%, 13º, férias +⅓) | *Pejotização* risk on the PJ/contractor route (§4) | 🔴 **High** — and the worst place for it ([11](11-brazil-tax-and-mechanics.md) §1) |
| **Ecuador** | ~1.25–1.35× salary (IESS ~11.15% employer, décimo tercero, décimo cuarto) **+ mandatory 15% profit participation to employees** | The 15% profit share is statutory and often missed in models | 🟡 Medium |
| **Guatemala** | ~1.25–1.35× salary (IGSS ~12.67%) **+ aguinaldo + bono 14 = ~2 extra months** | Lowest absolute cost base of the four | 🟡 Medium |

Two things worth pulling out:

- **Ecuador is dollarized.** Paying an Ecuadorian costs no FX and creates no currency exposure — a genuine convenience the others don't offer.
- **Brazil is roughly 40% more expensive per head than the other three** for the same salary, and carries the highest regulatory risk. [10](10-structure-pricing.md) already reached this conclusion on cost; the PE and regulatory analysis reaches it again independently.

---

## 4. Employment vehicle — one decision per person

| Situation | Vehicle | Why |
|---|---|---|
| US person, in the US | **W-2 through the Florida entity** | Already exists ([10](10-structure-pricing.md)); no alternative worth having |
| Anyone else, anywhere | ✅ **EOR (Deel / Remote / Ontop / Velocity)** — the default | No local entity needed, payroll compliance handled, ~$600–900/mo/head. [10](10-structure-pricing.md) already recommends this over a Brazilian entity |
| Genuinely independent specialist, project-scoped | Contractor | Only where the independence is real |
| Brazil-resident, contractor route | ⚠️ **PJ, with eyes open** | *Pejotização* — Brazilian labor courts can reclassify a PJ contractor as an employee with retroactive liability. Cheaper up front, contingent liability behind it. `[VERIFY-LEGAL]` on current status; this area has active litigation |

> ⚠️ **An EOR does not cure permanent establishment.** It solves payroll and employment law. It does **not** stop a person who habitually negotiates or concludes contracts in-country from creating a taxable presence for the company there. **EOR is a payroll answer, never a PE answer.** Keep contract-concluding authority with people whose location you have chosen deliberately.

---

## 5. Permanent establishment — the thing that actually kills structures

Every person, in every country, is a potential PE. The trigger is roughly: **a fixed place of business, or a dependent agent habitually concluding contracts on the company's behalf.**

In this business the danger is specific and easy to walk into:

> A Brazil-resident team member who is customer-facing on FX or investing is not merely a PE risk. **They can constitute the company performing a regulated activity inside Brazil** — the exact activity [06](06-inbound-collection.md) says requires a BCB-authorized institution. The tax exposure is the smaller half of that problem.

Practical allocation:
- **Engineering, product, data, back-office:** place anywhere. Genuinely low risk.
- **Growth/marketing:** careful — the line between "building the brand" and "soliciting residents" is the line in [06](06-inbound-collection.md) §4.
- **Partnerships/BD (negotiating with PSPs, FX institutions, custodians):** highest PE-creating function. Decide deliberately where this person is deemed to act from, and paper it.
- **Anything customer-facing in Brazil:** belongs to the **partner**, not to us.

---

## 6. ⚠️ Three US persons, not one — the offshore structure just got materially worse

**This section was written assuming one American. With three of four people resident in the US, it scales by 3× and becomes a structural constraint rather than a footnote.**

**The trigger is US *tax residence*, not US citizenship.** Anyone who is a citizen, a green-card holder, **or** who meets the substantial-presence test is a "US person" for these purposes. On the resolved map, that is very likely **all three US-based team members**, regardless of passport. `[VERIFY]` each person's status — but plan for three.

| Consequence | Detail |
|---|---|
| **Form 5471** | Every US person who is an **officer, director, or ≥10% shareholder** of a foreign corporation files. **Penalties start at $10,000 per form, per year.** Three people × each foreign entity × every year. |
| **CFC status** | If US persons together own **>50%** of a foreign entity, it is a **controlled foreign corporation** → **GILTI-type current taxation** flows through to them personally. With three of four founders as US persons, a majority-US cap table is the default, not the exception. `[VERIFY-LEGAL]` — recently amended. |
| **Worldwide taxation** | Applies to all three. The foreign earned income exclusion (~$130k, indexed) shelters *salary*, **not** entity-level or investment income. |

> ### The decisive consequence for [10](10-structure-pricing.md) and [11](11-brazil-tax-and-mechanics.md) §8
>
> A **Swiss or Cayman entity owned by a majority-US-person cap table is a CFC.** It generates Form 5471 obligations for three people and pulls its income into current US taxation — **delivering the compliance cost of an offshore structure while forfeiting the tax benefit that justified it.** [10](10-structure-pricing.md) already found Switzerland-as-holding unjustifiable on cost ($162–254k/yr). This kills it on substance too. **Delaware topco is now clearly correct, and the §4.1 one-way door in [10](10-structure-pricing.md) should be closed in Delaware's favour.**

### The positive case nobody has costed yet: **QSBS**

**§1202 Qualified Small Business Stock excludes up to $10–15M of gain per holder** from federal tax on a sale — and it requires the issuer to be a **domestic C corporation**. `[VERIFY-LEGAL]` on the current cap and holding-period tiers (amended in 2025).

With **three US-resident founders**, that is potentially **the single largest tax number in this entire project** — plausibly larger than every operating tax saving in [10](10-structure-pricing.md) and [11](11-brazil-tax-and-mechanics.md) combined. **A Swiss or Cayman topco forfeits it entirely.** No other doc has mentioned this, and it deserves to be on the table before anyone incorporates anywhere.

### The one genuine advantage of the US concentration

The two named-individual roles the company cannot operate without — **IAR** and **BSA officer** — sit with people already in the US, with no visa timeline gating them. Note also, because it is commonly misunderstood: **there is no citizenship requirement to be an IAR.** Green-card holders and visa holders can register. The binding constraint is **employment authorization**, not the securities licence (§10.4).

---

## 7. Two things teams at this stage reliably forget

**IP assignment.** The company's main asset is software. IP does **not** vest automatically and identically across jurisdictions — and the nuance bites exactly where you'd least want it: **the cheap contractor/PJ route that saves money on labor cost is the route with the weakest automatic IP vesting.** Employment generally vests software IP in the employer; independent contracting is contract-dependent. **Every person, every jurisdiction, needs an explicit written IP assignment.** This is cheap now and unfixable later — it is the standard finding that blows up a diligence process.

**Equity.** A single US-style option plan applied to four people in four countries produces four different tax outcomes, some of them immediate and unpleasant (several jurisdictions tax grant or vesting rather than exercise). If equity is part of how these four are being compensated, **model the tax outcome per person before issuing anything.** Retrofitting is expensive.

Both belong in the founder/employee agreements alongside roles, vesting and cliff — which should exist in writing regardless of how well everyone currently gets along.

---

## 8. The strategic warning underneath the question

Four nationalities across three LatAm countries is a **temptation to open three corridors.**

[01](01-jurisdiction.md) §1 is explicit: *"pick one of these in one corridor and prove unit economics. Spreading across all five at launch is how this dies."* [07](07-complicated-cases.md) §8 sequences markets in deliberate waves for the same reason. A team assembled from Brazil, Ecuador and Guatemala will naturally generate pressure to serve Brazil, Ecuador and Guatemala at once — and with four people that is how the POC fails.

> ### ✅ Correction, now that residence is known — this warning largely dissolves
>
> The concern above assumed the team was spread across three LatAm markets. **It isn't.** With the Ecuadorian and Guatemalan **living in the US**, Ecuador and Guatemala are not corridors the team is standing in — they are passports. Nobody is in-market there, so no market pull exists.
>
> The actual shape is **three people at the destination (US) and one person in exactly one origin market (Brazil)** — which is precisely the "one corridor + the US destination" shape [01](01-jurisdiction.md) §1 asks for. **The team is already correctly concentrated.** Don't let the passports talk anyone into Ecuador or Guatemala as launch corridors; the local knowledge there is real but it is not local *presence*, and presence is the part that's hard to buy.

**One live implication for the still-open beachhead decision:** the team shape now **argues for Brazil over Argentina.** You have exactly one in-market person and he is Brazilian; you have nobody in Argentina. That cuts against [06](06-inbound-collection.md) §3, which finds Argentina structurally the friendlier market (controls lifted, no eFX stablecoin ban, existing stablecoin habit). So the trade is now concrete rather than abstract:

| | Argentina | Brazil |
|---|---|---|
| Regulatory friction | ✅ Lower — easiest LatAm on-ramp | ❌ Higher — partner stack + eFX stablecoin ban ([06](06-inbound-collection.md) §1) |
| In-market presence | ❌ None | ✅ One person, resident, native |
| TAM & stickiness | 🟡 Smaller | ✅ Larger, core market |

> **Neither factor dominates on its own.** But "we have a person there" is expensive to replicate and easy to undervalue on a spreadsheet, and Brazil was already named the core market in [07](07-complicated-cases.md) §2. This does not settle the decision — it moves it toward Brazil, and it should be weighed explicitly rather than left implicit.

---

## 9. ~~What's needed to turn this into an actual answer~~ — resolved

The blocking input (the residence map) has been supplied: **Brazilian in Brazil; American, Ecuadorian and Guatemalan in the US.** See §10. Three questions remain open and are carried forward to §10.5.

---

## 10 — The resolved answer: 3 in the US, 1 in Brazil

### 10.1 The five workstreams that exist

Derived from the critical path, not from the people:

| | Workstream | Contents |
|---|---|---|
| **A** | **RIA / advisory spine** | Register the RIA (Florida state or SEC); designate the **CCO** (required under Advisers Act Rule 206(4)-7); hold **IAR** registration; Form ADV; client advisory agreements; investment policy + model portfolios — **including the Irish-UCITS-vs-US-ETF decision** ([11](11-brazil-tax-and-mechanics.md) §5); custodian relationship (IBKR advisor master account) |
| **B** | **AML / compliance spine** | **BSA officer** (named individual); KYC/CIP program; transaction monitoring; sanctions screening; travel-rule handling on the stablecoin leg |
| **C** | **Rails & partnerships** | Beachhead PSP; BCB-authorized FX institution / licensed VASP; IBKR onboarding; stablecoin card issuer ([11](11-brazil-tax-and-mechanics.md) §6); the Phase-1 LOIs in the roadmap ([04](04-Other%20Services.md)) |
| **D** | **Product & engineering** | The app; onboarding flow; IBKR API integration; the DCA mechanic; **the IRPF/DCBE report generator** ([11](11-brazil-tax-and-mechanics.md) §4) |
| **E** | **Beachhead growth** | Portuguese content and brand; acquisition; and above all **measuring real CAC** — [05](05-Examples.md) §6 names this as the assumption the entire model hangs on |

### 10.2 Who can do what — the constraints are narrow

**Here is the useful finding: location constrains only one of the four people.**

| Person | Can do | Cannot do |
|---|---|---|
| **The three in the US** | **A, B, C, D, E — all of it.** No PE issue, no jurisdictional bar. | Nothing, on location grounds. **Subject to work authorization (§10.4).** |
| **The Brazilian, in Brazil** | **D** (engineering — zero risk anywhere), **E** (Portuguese content/brand), **partner *sourcing* and relationship management** within C, Brazil-side ops | ❌ Hold the **IAR** or give investment advice ❌ **Conclude/sign contracts** binding the company ❌ Perform the **regulated act** (FX execution, onboarding customers) ❌ Be the **solicitor of record** to Brazilian residents |

> **Which of the three US-based people takes which US workstream is a pure skills decision — the law is indifferent among them.** That is genuinely the whole answer to "how do we divide obligations": there is no legal reason to allocate A/B/C/D/E among the three in any particular way. Assign on competence and let it be.

### 10.3 Recommended split

| Workstream | Owner | Note |
|---|---|---|
| **A — RIA spine** | **US person #1** — holds **IAR + CCO** | The revenue-and-advice spine. Highest-leverage single role. |
| **C — Rails & partnerships** | **US person #2** | **Signing authority lives here**, in the US entity — this is the structural fix that keeps the Brazil role safe (§10.4) |
| **D — Product & engineering** | **US person #3**, with **the Brazilian** | The natural place for the Brazilian to carry real weight at zero regulatory risk |
| **E — Beachhead growth** | **The Brazilian** (delivery) + US person #2 (accountable owner of record) | He does the work; the accountable party sits in the US |
| **B — AML/compliance** | 🔻 **Fractional / outsourced — do not burn a headcount** | $36–96k/yr ([10](10-structure-pricing.md)); [03](03-compliance-licensing.md) already assumes fractional. Also avoids compliance reporting to the person generating revenue. |

**Net: three workstreams owned internally in the US, one split with Brazil, one bought in.** Four people, five workstreams, no gaps.

### 10.4 The three things that make this safe — or break it

**① Signing authority stays in the US, in writing.** The Brazilian can source partners, manage relationships, build product and own Portuguese content. The moment he **habitually concludes contracts** in Brazil, he risks becoming a dependent agent — creating a Brazilian PE and, far worse, potentially constituting **the company performing regulated activity inside Brazil without BCB authorization** ([06](06-inbound-collection.md) §2). The fix is one line in a delegation-of-authority document, and it costs nothing. **Do it before he talks to a single PSP.**

**② 🔴 Immigration is the real gate, and it is unresolved.** "In the US" says nothing about work authorization, and **neither Ecuador nor Guatemala has TPS**, so their status is something else — green card, H-1B, F-1/OPT, asylum-pending EAD, or none.

| If | Consequence |
|---|---|
| Green card | ✅ Clean — employ normally |
| **H-1B** | ⚠️ **Employer- and role-specific.** Cannot work for this company without a transfer; self-sponsoring at your own startup is notoriously hard (needs a board that can genuinely fire you) |
| **F-1 / OPT / STEM OPT** | ⚠️ Role must relate to the degree; STEM OPT needs an **E-Verify employer** + formal training plan. **Founding your own company on OPT is legally fraught** |
| No authorization | ❌ **You cannot employ them.** I-9 obligations and employer sanctions attach to the company |

> **This gates everything else in §10.3 and it is answerable today.** Resolve it before spending on entity formation — a role plan that assumes three employable US-based people is worthless if one of them isn't. Reminder from §6: the **securities licence is not the obstacle** — there is no citizenship requirement for an IAR. Employment authorization is.

**③ 🔴 The payroll arithmetic does not fit the envelope.** Three US heads at market rate, loaded at ~1.3×, is **~$450–600k/yr on its own** — against a **$320–400k total burn to breakeven** ([05](05-Examples.md) §6). Before rails, CAC, KYC, RIA setup, legal or product.

| Path | Consequence |
|---|---|
| **Founder-level comp** (~$40–60k each, deferred/equity-weighted) | ✅ Fits — roughly $300–320k all-in with the Brazilian on EOR, but leaves almost nothing for CAC |
| **Raise the envelope to ~$700k–1M** | 🟡 Honest, and consistent with what [10](10-structure-pricing.md) found about structure costs — but it is a different fundraise than the plan currently assumes |
| **Market salaries inside $400k** | ❌ Arithmetically impossible |

> **This is the quiet plan-killer, and it is not a structuring problem — it is an arithmetic one.** The model's ~$321k max-burn figure implicitly assumes a much smaller team than four. **Reconcile headcount and envelope in the model before anything else** — it changes the base case more than any assumption discussed so far.

### 10.5 Still open

1. **Work authorization for the Ecuadorian and the Guatemalan** (§10.4②) — blocking, and answerable immediately.
2. **Cap table shares.** If the three US persons hold >50%, any foreign entity is a **CFC** (§6). Confirm before incorporating anything outside Delaware.
3. **Equity mechanics** (§7). Now simpler than feared — three of four are on US tax rules, so a single US plan mostly works. **The Brazilian is the exception** and needs his grant modelled separately under Brazilian rules.
4. **Written IP assignment for all four** (§7) — the Brazilian's is the one that matters most, because a PJ/contractor engagement is where automatic IP vesting is weakest.
