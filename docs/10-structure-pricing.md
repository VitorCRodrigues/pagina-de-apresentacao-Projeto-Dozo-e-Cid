# 10 — Structure Pricing: Cid's Switzerland+Florida vs. the Panama Agent-Light Split

> Source of the question: `meeting with cid.txt` — *"implement European holding in switzerland and florida, open office there to hire brazilians and Americans."*
>
> **All figures below are estimates from general market knowledge, not quotes.** Every line marked `[VERIFY]` needs a real number from a provider before it goes in the model. The purpose here is to establish **order of magnitude vs. the $320–400k burn envelope** ([05](05-Examples.md) Case Group 3/6) — not to be precise.

## 0. What was actually proposed (and the ambiguity)

The note is terse and reads two ways:

| Reading | Structure |
|---|---|
| **A** (priced here) | Swiss holding on top → Florida operating/commercial sub → Brazil office for staff. One topco, two operating footprints. |
| **B** | Two separate holdings (one CH, one FL) under no common parent, or under the existing Delaware idea. |

Reading **A** is the one that matches "European holding in Switzerland" + "open office there." It is also the more expensive of the two, so pricing it gives the ceiling. **Confirm with Cid which was meant** — the answer changes the tax and visa analysis materially, and one of the two is effectively irreversible (§4).

---

## 1. Year-1 cost, Cid structure as written

### Swiss layer

| Line | Yr-1 USD | Note |
|---|---|---|
| GmbH share capital (CHF 20k, fully paid) | **~$22k** | *Capital, not expense* — recoverable, but locked. AG instead = CHF 100k nominal / CHF 50k min paid-in (~$55k). |
| Formation: notary + commercial register | $3–6k | |
| Cross-border structuring counsel (CH–US–BR) | $20–40k | Not optional with three jurisdictions. |
| Resident director w/ signing authority | $6–17k/yr | **Legally required** (CO Art. 814 §3 for GmbH / 718 §4 for AG). Fiduciary service if no CH-resident principal. |
| Registered domicile + bookkeeping | $8–16k/yr | |
| SRO/VQF AML membership + annual AML audit | $10–25k/yr | Only if the CH entity is a *financial intermediary* under AMLA. A pure passive holding may escape this — `[VERIFY-LEGAL]`, and it's the single biggest swing factor in the Swiss column. |
| **Substance employee (1 FTE in CH)** | **$115–150k/yr** | The tax story does not survive challenge without it ([01](01-jurisdiction.md) §3 "Substance is not optional"). CHF 90–110k salary + ~15% employer social. |
| **Swiss subtotal (opex)** | **$162–254k/yr** | + ~$22k locked capital |
| *Swiss subtotal without the substance FTE* | *$47–104k/yr* | ⚠️ brass-plate risk — see §3 |

### Florida layer

| Line | Yr-1 USD | Note |
|---|---|---|
| FL entity + registered agent + annual report | $1–2k | Trivially cheap. |
| Miami office, 4–6 desks | $36–84k/yr | Coworking private suite (Brickell/Doral) at the low end; Class-A lease at the high end. |
| US tax + **transfer-pricing study** | $25–50k | Mandatory once CH↔US↔BR intercompany charges exist. |
| RIA registration (FL state) setup | $10–30k | Compliance consultant, Form ADV, policies, Series 65. |
| RIA ongoing compliance + E&O | $15–40k/yr | |
| US hires ×2 (compliance + eng), loaded | $300–430k/yr | Salary × ~1.3. Fractional/outsourced BSA officer instead = $36–96k/yr. |
| **Florida subtotal** | **$387–636k/yr** | |
| *Florida subtotal, fractional compliance + 1 eng* | *$253–392k/yr* | |

### Brazil layer

| Line | Yr-1 USD | Note |
|---|---|---|
| Ltda formation + CNPJ + local accountant | $8–18k/yr | |
| 2 CLT employees, loaded | $115–170k/yr | BR employer burden ≈ **1.7–1.8×** salary (INSS 20%, RAT, Sistema S, FGTS 8%, 13º, férias +⅓). |
| **Brazil subtotal (own entity)** | **$123–188k/yr** | |
| *Same 2 people via EOR / PJ contractors* | *$70–105k/yr* | No entity, no nexus. See §3. |

### Group

| Line | Yr-1 USD |
|---|---|
| 3-jurisdiction consolidation + audit + intercompany agreements | $15–35k/yr |

### Total

| Version | Yr-1 opex | + locked capital |
|---|---|---|
| **Cid as written** (CH substance FTE, FL office + 2 FTE, BR entity + 2 CLT) | **$687k – $1,113k** | ~$22–55k |
| **Cid, leanest defensible** (no CH FTE, fractional compliance, EOR Brazil) | **$385k – $636k** | ~$22k |

> **Against the envelope:** the base-case plan reaches cash-positive on **~$321k max cumulative burn** ([05](05-Examples.md) 6). The Cid structure spends **2–3.5× that entire envelope on corporate scaffolding in year one — before one dollar of CAC, rails, KYC, product, or float.** Even the leanest defensible version consumes the whole envelope and delivers zero customers.

---

## 2. The Panama agent-light baseline, same basis

| Line | Yr-1 USD |
|---|---|
| Delaware C-Corp + registered agent + franchise tax | $1–3k |
| Agent/BaaS partner onboarding + legal review | $15–40k |
| Fractional BSA/AML officer + KYC tooling | $36–96k |
| Legal/regulatory counsel (1 jurisdiction + 1 corridor) | $20–50k |
| Eng (founder + 1 contractor) | $60–140k |
| Panama op entity | **$0 — deferred** until volume justifies ([05](05-Examples.md) 3.3: $100–300k when triggered) |
| Office | $0–12k (remote/coworking desk) |
| **Total** | **$132–341k/yr** |

Fits the envelope. That is the whole point of the agent model — it converts fixed structural cost into deferred cost, paid out of traction.

---

## 3. Where Cid is right, where he's wrong

| Component | Verdict | Reasoning |
|---|---|---|
| **Florida presence** | ✅ **Right, and already the plan** | [01](01-jurisdiction.md) §4 already says people/offices in Miami. And the **RIA must be onshore US** — [05](05-Examples.md) 4.6 flags this as the one piece that drags you back to US jurisdiction. Florida is the correct home for it: no state income tax, LatAm talent, and the RIA needs no MTL. **Do not** put money transmission in the FL entity — that walks straight into the de-risking wall and a 1–2 yr, $50k-bond MTL process for nothing. |
| **Hiring Americans in Miami** | 🟡 **Right people, wrong count, wrong time** | 2 FTEs at $300–430k loaded is the single largest line in the whole structure. Fractional BSA officer ($36–96k) is what [03](03-compliance-licensing.md) already assumes and is sufficient through Phase 1. |
| **Swiss entity as the *holding*** | ❌ **Wrong** | Delaware already does holding/cap-table better *and* cheaper, and it's what US VCs price. A Swiss topco is known deal friction. The Swiss holding privilege was **abolished in 2020** (TRAF) — what remains is the participation exemption, which gets you near-0 on subsidiary dividends, but you have no dividends at POC. You'd pay $162–254k/yr for a tax benefit that activates years from now. Pillar Two / the 15% Swiss QDMTT is **not** a concern here — it only bites groups above €750M revenue. |
| **Swiss entity as the *rail/banking* entity** | 🟡 **Genuinely interesting — but later, and it competes with El Salvador** | Switzerland's real asset is **crypto-native banking that actually onboards this profile** (Sygnum, AMINA, Bank Frick in LI) plus a clear DLT/VASP regime. That is a direct answer to **R1, the banking wall** — the top existential risk in [02](02-risks.md). But [01](01-jurisdiction.md) §2 already nominates **El Salvador** for exactly this job at roughly a tenth of the cost. Switzerland is the *premium* version of the same bet: buy it only if the El Salvador/Panama banking route is actually tested and fails. Treat it as **priced insurance against R1 (~$100–200k/yr), not as the default.** |
| **Brazil office + entity** | ❌ **Wrong now** | A BR entity creates permanent-establishment and tax nexus in the one market [06](06-inbound-collection.md) identifies as the most hostile (stablecoin/eFX restrictions). It costs $123–188k/yr and buys nothing a contractor can't do. **EOR or PJ contractors get you the same Brazilians for ~$70–105k/yr with no nexus.** Revisit only if Brazil becomes the beachhead *and* you need a licensed local presence. |

---

## 4. Two one-way doors — decide before incorporating

1. **Delaware → Swiss topco is expensive to reverse into.** Starting Delaware and later flipping it under a Swiss parent triggers §7874 anti-inversion scrutiny and a taxable outbound transfer under §367. The sequencing is effectively one-way: **if Switzerland is ever going to be the topco, it has to be topco from day one.** That makes this a now-decision, not a later-decision — which is the only genuinely urgent thing in Cid's note. `[VERIFY-LEGAL]`

2. **Foreign parent over a US RIA adds custodian friction.** Form ADV ownership disclosure plus enhanced diligence from Apex/DriveWealth/Alpaca on foreign-controlled advisers. Not a blocker; is a delay. Budget diligence time, not just money.

---

## 5. The visa question (probably the unstated driver)

"Open office there to hire brazilians and Americans" reads like a mobility plan as much as an org plan. If so, the mechanics matter more than the structure:

| Route | Works? |
|---|---|
| **E-2 treaty investor** | ❌ for Brazilian nationals — **Brazil is not an E-2 treaty country.** Switzerland *is*, but E-2 keys off the **person's** nationality, not the company's — a Swiss GmbH owned by Brazilians confers nothing. |
| **L-1 intracompany transfer** | ✅ **This is the realistic path — and it's what the Brazil (or Swiss) entity is actually good for.** Requires a qualifying foreign affiliate where the person worked **1 continuous year in the preceding 3**. Meaning: the foreign entity must exist and employ the person **12 months before** the US move pays off. |
| **O-1** | 🟡 Possible, evidence-heavy, no entity prerequisite. |

> If mobility is the real goal, say so — it reframes the whole thing. An entity stood up as an **L-1 anchor** is a defensible $8–18k/yr expense with a 12-month clock. An entity stood up as a *tax structure* is a $162–254k/yr expense with no payoff at this stage. Same entity, completely different budget and completely different urgency.

---

## 6. Recommendation

**Cid's structure does not survive the $320–400k envelope.** It spends 2–3.5× the entire runway on scaffolding before acquiring a customer. Do not build it as written.

But three of its instincts are salvageable, each at a different time:

| Do now (fits envelope) | Do at traction | Do only if forced |
|---|---|---|
| Delaware HoldCo + **Florida RIA + commercial HQ** (Cid's Florida instinct, correctly scoped) | Panama op entity ([05](05-Examples.md) 3.3, $100–300k) | Swiss **rail** entity as R1 banking insurance ($100–200k/yr) — only after El Salvador/Panama banking is tested and fails |
| Fractional compliance, not 2 FTEs | Second US hire | |
| Brazilians via **EOR/PJ**, not a BR entity | BR entity **only** if Brazil is the beachhead *or* an L-1 anchor is wanted (start the 12-month clock early — that's cheap) | |

**The one thing to settle this week:** whether the topco is Delaware or Swiss (§4.1) — it is a one-way door and everything else can be deferred, but that cannot.

---

## Open `[VERIFY]` items before any of this enters the model

- Whether a CH holding that owns a rail entity is itself a "financial intermediary" under AMLA (drives the $10–25k/yr SRO line, and possibly much more)
- Real quotes: Swiss fiduciary director, Miami coworking suite, FL RIA compliance consultant, EOR per-head (Deel/Remote) for Brazil
- §7874/§367 confirmation on the Delaware→Swiss flip cost, from a US international tax specialist
- Whether Sygnum/AMINA/Bank Frick would actually onboard this profile at POC scale — the entire Swiss argument rests on this, and it is answerable with two phone calls before spending anything
