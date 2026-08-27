# 03 — Compliance & Licensing

> D**eferring** every license you can via partners until volume justifies owning it.

## 1. License stack by product line

| Product                          | What it legally requires                                                                                       | Fast/cheap path (POC)                                                                                          | Own-it path (scale)                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **FX / remittance**        | Money-transmitter authority in each market you serve + AML/BSA program + named compliance officer              | **Agent / authorized delegate** of a licensed transmitter, **or** BaaS partner that holds licenses | Panama op entity; or US 50-state ($1–3M); or PR Act 273 IFE |
| **Stablecoin on/off-ramp** | VASP/DASP registration in many markets; in US,**GENIUS Act** stablecoin regime (2025) `[VERIFY-LEGAL]` | Partner with licensed ramps (Bitso, regional PSPs) —**don't custody yourself**                          | DASP license (El Salvador permissive; EU MiCA)               |
| **Debit card**             | Sponsor/issuing bank + card network + program manager                                                          | **Pomelo** (LatAm-native BaaS, BIN sponsorship)                                                          | Own BIN + bank sponsor                                       |
| **Investing / consulting** | "Advice for a fee" → registered IA (state or SEC >$100M AUM); execution → broker-dealer (FINRA)              | **White-label RIA** / clearing partner (Apex, DriveWealth); keep content "educational"                   | Own RIA registration                                         |
| **VPN**                    | No "VPN license" in West; encryption export (BIS/EAR, ECCN 5D002), OFAC geofencing, DMCA agent                 | Merchant-of-Record handles tax; self-classify encryption                                                       | Same, in-house                                               |

## 2. The de-risking problem (the real gate) and the workaround

**Why banks say no to our profile:** Miami/LatAm cross-border retail FX + flight capital = high BSA/AML exam risk + chargeback exposure + "privacy" adjacency. Banks have spent a decade *closing* these accounts rather than carrying the risk. **This kills more Miami LatAm fintechs than any regulator does.**

**How we route around it:**

1. **Stablecoin rails** — the cross-border value transfer doesn't ride correspondent banking at all. You still need fiat on/off-ramp banking *locally*, but you partner for that (Bitso, dLocal, regional PSPs) rather than needing one US bank to bless the whole flow.
2. **Agent model** — operate under a partner's existing, already-banked license.
3. **Pristine compliance from day one** — a named **BSA/AML officer** (often personally liable) is hire #1, not a later cleanup. Clean OFAC screening is what eventually gets you your *own* banking relationship.
4. **Keep VPN entirely separate** — so its "privacy" flag never lands on the money program's underwriting file.

## 3. AML / KYC / sanctions — table stakes, build first

- **BSA/AML program** with written policies, risk assessment, transaction monitoring, SAR filing, and a **named BSA Officer**.
- **KYC** onboarding (ID verification, PEP screening) — and **EDD** for the flight-capital segment (Venezuela exposure = real PEP/SDN-adjacency risk, see [Risks](02-risks.md#risks)).
- **OFAC SDN screening** on every counterparty, real-time, not a checkbox. Geofence sanctioned jurisdictions.
- **Data retention** that *contradicts* the VPN's no-logs ethos — another reason the entities can't share a brand.

## 4. The agent-vs-own-license decision (the big early fork)

|                | Agent / BaaS model                  | Own licenses                    |
| -------------- | ----------------------------------- | ------------------------------- |
| Time to launch | Weeks–months                       | 1–3 years                      |
| Upfront cost   | Low (rev-share)                     | $1–3M (US) / $10M cap (PR IFE) |
| Margin         | Thinner (partner takes a cut)       | Fuller                          |
| Defensibility  | Low (dependent on partner)          | High                            |
| Risk           | Partner can drop you / change terms | You carry exam risk             |

**POC recommendation:** **agent/BaaS model.** Prove the corridor and unit economics on someone else's rails *before* spending a dollar on owning a license. Owning licenses is a scale decision, financed by traction — not a prerequisite. This is captured as a live decision in [09](02-risks.md#09--open-decisions) Q3.

## 5. Compliance hires (in order)

1. **BSA/AML Compliance Officer** (named, non-negotiable, hire #1).
2. KYC/KYB onboarding + fraud ops.
3. Chief Compliance Officer for the investment line (separate function) — only when that line launches.
4. Regulatory-affairs tracking (corridor rules shift monthly — esp. Brazil IOF, Argentina controls).

## Sources

- US MTL roadmap/cost: [Finextra – MTL 2026](https://www.finextra.com/blogposting/30783/money-transmitter-license-in-2026-requirements-costs-and-a-practical-roadmap-for-fintechs), [V-Comply MTL guide](https://www.v-comply.com/blog/money-transmitter-compliance-guide/)
- Pomelo BaaS / BIN sponsorship: [Pomelo](https://pomelo.la/en), [Insight Partners – Series C](https://www.insightpartners.com/ideas/pomelo-raises-55-million-series-c-to-accelerate-the-modernization-of-payments-infrastructure/)
- PR Act 273 AML/OFAC obligation: [Lexology](https://www.lexology.com/library/detail.aspx?g=3e065b4d-6ae7-497b-8784-7a66318c1f78)
