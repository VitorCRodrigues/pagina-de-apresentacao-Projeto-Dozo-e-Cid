# 08 — Sequencing Roadmap

> Capital-light, validation-first. Each phase has a **kill gate** — a question that, if answered "no," stops the spend. This is a *scan*, so the early phases cost mostly time, not money.

## Phase 0 — Desk validation (now → ~4 weeks) · cost: ~$0

- Finalize this analysis; flex the [model](../model/) across corridors/scenarios.
- Pick the **single beachhead corridor** ([09](02-risks.md#09--open-decisions) Q1) and the **agent-vs-own** stance (Q3).
- One paid hour with (a) a money-transmission/fintech attorney and (b) a cross-border tax specialist to clear the top `[VERIFY-LEGAL]` items.
- **Kill gate:** does any corridor clear ~1% all-in *and* a legal rail? If no → stop.

## Phase 1 — Rails pilot (weeks 4–12) · cost: low

- Sign LOIs/sandbox with on/off-ramp + BaaS partners (Bitso/dLocal/Pomelo, regional PSPs).
- Move **real test money** end-to-end in the beachhead corridor; measure true all-in cost & time.
- Stand up minimal KYC/AML; name (even fractional) BSA officer.
- **Kill gate:** real all-in cost ≤ target and legally clean? If no → stop (R1/R2 retired here).

## Phase 2 — Thin MVP, one corridor (months 3–6) · cost: medium

- Waitlist + landing + a barebones app for the one corridor, one segment.
- 20–50 real users moving real money. Measure CAC, retention, ARPU, support load.
- **Kill gate:** unit economics positive at small scale & CAC payback sane? If no → pivot corridor or stop.

## Phase 3 — Card + second corridor (months 6–12)

- Add **Pomelo** debit card to drive daily active use & stickiness.
- Add a second corridor only after the first is healthy.
- Decide: stay agent-model or begin **Panama op entity** / pursue **PR Act 273** (needs capital).

## Phase 4 — Investing line (months 12+)

- White-label RIA / clearing partner (Apex, DriveWealth). Keep content educational until registered.

## Phase 5 — VPN (parallel, deferred)

- Separate entity (Panama/CH), MoR billing, small server fleet. Only after money POC traction.

## Phase 6 — B2B US (the genuine "later")

- KYB replaces high-volume retail KYC → simpler compliance on the chassis you've built. Real margin, larger tickets.

## What to NOT do early (anti-roadmap)

- ❌ Apply for 50-state US money-transmitter licenses ($1–3M) before traction.
- ❌ Fund a $10M PR Act 273 IFE before Series A.
- ❌ Launch all corridors / all products at once.
- ❌ Build the VPN first (or let it distract).
- ❌ Serve Venezuela/corporate-Argentina early (sanctions/controls risk).
- ❌ Promise "1%" in marketing before the model + pilot confirm it holds.

# 1— Card & FX services for tourists

# 2— Hedge Fund & international allocations to in emerging markets

# 3— VPN (Separate Entity)

VPN = sells anonymity. MoneyCo = legally must de-anonymize (KYC/OFAC/SARs). Shared brand poisons both: customer confusion + the money program's bank underwriting flags "privacy tool." **Separate entity, separate brand, common owners.** See the [executive summary](00-resumo-executivo-PT.md).

**Outside US reach**: **Panama** (off FATF grey list, privacy-reasonable)

- **Protocols:** WireGuard baseline; OpenVPN/IKEv2 for compatibility; an obfuscated transport only if targeting censored markets.
- **RAM-only / diskless servers** — makes log retention technically impossible (the credible no-logs posture).
- **Clients:** start with the platforms your LatAm-diaspora audience actually uses (Android-heavy, iOS, then desktop). Don't build router firmware on day one.
- **Server fleet:** rent first (don't own metal); ~10–20 locations to start, not 100.
- **Billing:** **Merchant-of-Record** (Paddle/FastSpring) — offloads global VAT/GST, PCI, chargebacks. Add crypto pay for the privacy-conscious (adds AML nuance).
- **Trust levers:** transparent ownership, third-party no-logs audit (Cure53-style), warrant canary, transparency report.

## Markets to avoid

| Market                                | Status (2026)                                                    | Action                                  |
| ------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| **Russia**                      | Actively hostile; targeting infra/hosting; 469+ VPNs blocked     | Don't serve                             |
| **China**                       | Foreign consumer VPNs not licensable; app-store removals         | Closed                                  |
| **India**                       | CERT-In 5-yr KYC retention; anonymous reg banned                 | RAM-only virtual server outside India |
| **UAE/Gulf**                    | VPN-for-offense broadly illegal                                  | High exposure; deprioritize             |
| **(Iran/Cuba/NK/Syria/Russia)** | OFAC; note internet-freedom general licenses for Iran/Cuba comms | Geofence; legal review                  |

The VPN is optionality (shared LatAm-diaspora audience, diversified revenue) but it is **not** synergistic with busines' core.

# 4— ESIM Card with AT&T partnership for tourists

The ESIM is optionality (shared LatAm-diaspora audience, diversified revenue) but it is **not** synergistic with busines core.

# 5— Parnerships with hotels and arline companies

Later optionality bundle (LatAm, Europe & Asia) but it is **not** synergistic with busines' core.
