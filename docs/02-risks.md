
## Path (sequenced, capital-light first)

1. **FX/remittance core** on stablecoin rails via partners (agent/BaaS model — *don't* build 50-state licenses first). Start with **one corridor** where 1% genuinely wins.
2. **Debit card** via **Pomelo** (LatAm-native) once FX flow is real.
3. **Investing/consulting** via white-label RIA / clearing partner (Apex, DriveWealth) — defer in-house registration.
4. **VPN** stood up separately, low capital, Merchant-of-Record billing (Paddle/FastSpring) to offload tax/PCI.
5. **B2B US** as the genuine "later" growth move (KYB replaces high-volume retail KYC; simpler).

# Risks

| #   | Risk                                                                                       | L | I | Kills it?     | Mitigation                                                                                                             |
| --- | ------------------------------------------------------------------------------------------ | - | - | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| R1  | **Can't get banked / ramped** (de-risking wall)                                      | 4 | 5 | **Yes** | Stablecoin rails + agent/BaaS model + pristine AML; multiple ramp partners, no single point of failure                 |
| R2  | **Stablecoin regulatory clampdown** in launch jurisdiction                           | 3 | 5 | **Yes** | Choose permissive base (El Salvador/Panama); monitor US GENIUS Act, EU MiCA; keep fiat-rail fallback`[VERIFY-LEGAL]` |
| R3  | **Government tax/control reversal** (Brazil IOF hike, Argentina re-imposes controls) | 4 | 4 | Partial       | Multi-corridor; don't bet the company on one policy regime; Argentina history = real reversal risk                     |
| R4  | **OFAC/sanctions breach** via Venezuela/PEP flight capital                           | 3 | 5 | **Yes** | Airtight SDN screening + EDD; consider*not* serving Venezuela early; named BSA officer                               |
| R5  | **Incumbents already own the market** (DolarApp, Bitso, Wise, Nubank, Remitly)       | 4 | 4 | Partial       | Win a*specific* underserved niche/corridor, not "all LatAm"; service/trust edge; bundle                              |
| R6  | **Thin agent-model margin + partner dependency**                                     | 3 | 3 | No            | Use traction to migrate to own license/rails; negotiate multi-partner                                                  |
| R7  | **Tax structure unwound for lack of substance**                                      | 2 | 4 | Partial       | Real substance in op jurisdiction; cross-border tax counsel before committing                                          |
| R8  | **CAC > LTV** (privacy/fintech CAC is high)                                          | 3 | 4 | Partial       | Diaspora/affiliate channels, referral loops; model payback before scaling spend                                        |
| R9  | **VPN distracts from money POC**                                                     | 3 | 3 | No            | Defer VPN; separate P&L; tiny parallel experiment at most                                                              |
| R10 | **Fraud / chargebacks**                                                              | 3 | 3 | No            | KYC + fraud ops early; stablecoin leg reduces card-style chargebacks                                                   |
| R11 | **App-store / distribution gatekeeping** (mainly VPN)                                | 2 | 3 | No            | MoR + web distribution fallback; affects VPN more than money app                                                       |
| R12 | **Key-person / founder bandwidth** (solo founder, many fronts)                       | 4 | 4 | Partial       | Sequence ruthlessly; one corridor, one product first; hire BSA officer early                                           |

## Top 3 to retire first (these decide go/no-go)

1. **R1 — banking/rails:** can you actually move money for ~1% via partners in your chosen corridor? *Prove with a pilot before anything else.*
2. **R2 — stablecoin posture:** is the rail legal and durable in your launch base? *Get `[VERIFY-LEGAL]` sign-off.*
3. **R5 — differentiation:** what do you do that DolarApp/Bitso don't? *Answer before building (see [09](02-risks.md#09--open-decisions) Q1).*

If R1–R3 don't resolve favorably, the honest call is **no-go** — and that's a cheap, fast thing to find out, which is the entire point of doing this as a scan first.

# 09 — Open Decisions

> The things that actually determine whether and how this gets built. Each needs **Felipe's input** and most need a **licensed professional** before execution. Nothing downstream is committed until these resolve.

| #             | Decision                                                               | Why it's the fork                                                                                   | Options                                                                                                                                                                     | Owner                |
| ------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Q1**  | **What's the beachhead corridor + underserved niche?**           | Everything (jurisdiction, partners, marketing) keys off this. "All LatAm" = dead.                   | (a) Argentina individual USD (fast PMF, existing stablecoin behavior) · (b) Into-Brazil 0.38% remittance (bigger, stickier, more competitive) · (c) US→MX (huge, brutal) | Felipe               |
| **Q2**  | **What do we do that DolarApp / Bitso / Wise / Nubank don't?**   | If there's no real answer, it's me-too → no-go.                                                    | Niche segment / corridor / service / bundle / trust                                                                                                                         | Felipe               |
| **Q3**  | **Agent/BaaS model vs own license — to start?**                 | Decides cost, speed, margin, defensibility.                                                         | Agent (recommended for POC) vs own (scale)                                                                                                                                  | Felipe + attorney    |
| **Q4**  | **Operating-entity jurisdiction**                                | Tax, banking, substance cost.                                                                       | Panama (lead) · PR Act 273 (if funded) · El Salvador (rail) · agent-only (defer)                                                                                         | Felipe + tax counsel |
| **Q5**  | **Starting capital envelope?**                                   | Gates Q3/Q4 directly: $10M PR cap vs agent-model-on-a-shoestring are different universes. | $ range | **Felipe**                                                                                                                                                            |                      |
| **Q6**  | **Stablecoin posture** in launch base — legal & durable?        | If the rail isn't legal/durable, the whole 1% thesis fails.                                         | `[VERIFY-LEGAL]` per jurisdiction                                                                                                                                         | Attorney             |
| **Q7**  | **Do we serve Venezuela / flight capital at all (early)?**       | High margin vs existential OFAC risk.                                                               | Defer (recommended) vs serve-with-EDD                                                                                                                                       | Felipe + compliance  |
| **Q8**  | **VPN: now, later, or never?**                                   | Focus vs optionality.                                                                               | Defer (recommended) · tiny parallel · drop                                                                                                                                | Felipe               |
| **Q9**  | **Brand / name** for each entity                                 | Two brands needed (money + VPN).                                                                    | TBD                                                                                                                                                                         | Felipe               |
| **Q10** | **Is this a fundable startup or a lifestyle/cashflow business?** | Changes structure (DE C-corp + VC vs lean LLC) and risk appetite.                                   | TBD                                                                                                                                                                         | Felipe               |

## Recommended defaults (my opinion, to accept or override)

- **Q1:** Argentina individual USD **or** Brazil-inbound 0.38% — pick by appetite (fast PMF vs bigger TAM).
- **Q3:** **Agent/BaaS** to start. Own licenses only when traction funds them.
- **Q4:** **Agent-only for POC**, **Panama** as first owned op entity, **PR Act 273** as the funded end-state.
- **Q7 / Q8:** **Defer both.** Venezuela = sanctions risk; VPN = focus risk.

## Next concrete step

Answer **Q1, Q3, Q5** (the three that unlock the rest), then book the two `[VERIFY-LEGAL]` calls in [Phase 0](04-Other%20Services.md#phase-0--desk-validation-now--4-weeks--cost-0). Everything else can wait behind those.
