# 07 — Solving the Complicated Markets

> From the [country matrix (05 §8)](05-Examples.md): we **drop the impossible markets** and **solve the friction (🟡) ones**. The payoff below is the headline — *they almost all have the same solution.*

## 0. The one insight: it's a single reusable chassis

Working each complicated case individually reveals they are **the same problem with a different local partner bolted on.** Every one is solved by the same four-part structure — only the *licensed partner* and the *tax/limit to engineer around* change:

```
 [1] Local collection partner   →  [2] Local outbound-FX partner   →  [3] Customer's OWN US account   →  [4] Your US RIA
     (licensed PSP / EMI)            (authorized FX inst / VASP /        (custodian: Apex/DriveWealth;       (manages it;
     collect home-currency on         IMC / CASP / AD-bank — the          money NEVER pools → fits            revenue = FX margin
     the local instant rail)          legal cross-border leg)             "private basis", no commingling)    on inflow + recurring AUM)
```

**Two levers solve ~everything:**
1. **"Customer's own account, never pooled"** — legal in every market (it's the customer's own outbound investment, not a fund you sell). Kills the commingling + local-fund-offering problems at once.
2. **Lead with the small, recurring retirement/DCA product** — because it *naturally fits under every country's limit*: TCS-free in India, inside Turkey's $5k/mo cap, sub-quota everywhere. The product that drives LTV ([05 §7](05-Examples.md)) is *also* the one that threads every regulatory needle. That is not a coincidence to waste.

So "solve each case" = **plug the right licensed partner into the chassis, and engineer around one tax/limit.** Below, per market.

---

## 1. ❌ Dropped as impossible (forget these)
| Market | Why it's dead | 
|---|---|
| **China** (retail investing) | Overseas equity investment is **not a permitted use** of the $50k quota — "strictly restricted," tightening 2026. (Only travel-FX survives, not worth the ops.) |
| **Bolivia** | De-facto USD shortage / controls — can't reliably source dollars |
| **Venezuela** | OFAC sanctions + PEP exposure — toxic, see [02](02-risks.md) |
| **Russia** | Sanctions — do not serve |
| **Vietnam** (retail outbound) | Strict outbound FX controls make retail US-investing impractical |

We do not spend another minute on these. Everything below is **solvable.**

---

## 2. 🟡 Brazil — the big one
- **Obstacle:** Pix collection needs a PI; cross-border is **eFX restricted to authorized institutions**; **stablecoin only via a licensed VASP** (USD 100k/txn); foreign securities to residents **only on a private basis**; **1.10% IOF** on investment abroad.
- **Solve:** ① collect Pix via a **licensed local PSP/acquirer**; ② convert + remit via a **BCB-authorized FX institution or licensed VASP (SPSAV)**; ③ land in the **customer's own US managed account** (private basis ✓, no pooling ✓); ④ pass the **1.10% IOF** through transparently — and note that's the *favorable* lane vs 3.5% card/cash.
- **Partners:** Brazilian eFX/bank partner (the rails Avenue/Nomad-type players use) + licensed VASP for the stablecoin leg + US custodian + your RIA. Light local contracting entity likely needed (not a full own-license).
- **Residual risk:** VASP USD 100k/txn cap (fine for retail), active BCB regulatory drift, partner dependency.
- **Verdict:** ✅ **Solve now via partners** — it's the core market. Own Brazilian entity only at scale.

## 3. 🟡 Colombia — the IMC channel
- **Obstacle:** foreign investment **must be channeled through an authorized intermediary (IMC)** / the official FX market; worldwide taxation + mandatory foreign-asset reporting.
- **Solve:** partner with a **licensed Colombian IMC** (bank / *comisionista de bolsa*) to run the outbound-FX leg legally; collect via **PSE / Bre-B**; route to the customer's own US account; hand the customer the **registration/reporting documentation** they need.
- **Partners:** Colombian IMC + local PSP + US custodian + RIA.
- **Residual risk:** formal-channel cost/friction (no stablecoin shortcut), reporting burden on the customer.
- **Verdict:** ✅ Solvable, **second wave** (after AR/BR). The IMC requirement makes it strictly partner-dependent.

## 4. 🟡 India — the 20% TCS, neutralized by the core product
- **Obstacle:** **LRS $250k/yr**, but **20% TCS** on investment remittances **above ~₹10 lakh (~$12k)/yr**; remittance must go through an **AD (authorized dealer) bank**.
- **Solve:** ① the **retirement/DCA product stays UNDER ₹10 lakh/yr → ZERO TCS** (a $150–800/mo plan never crosses it) — the friction simply doesn't apply to our core product; ② for larger tickets, educate that **TCS is creditable/refundable** against income tax (not a lost cost); ③ remit via an **LRS-authorized AD-bank/partner** (the rails Vested/INDmoney-type players use); collect via **UPI**.
- **Partners:** LRS/AD-bank remittance partner + UPI collection + US custodian + RIA.
- **Residual risk:** TCS friction on lump sums; RBI scrutiny. (India's VPN/CERT-In rules are a *separate-company* issue — irrelevant here.)
- **Verdict:** ✅ **Frontier worth taking** — huge TAM, and the sub-₹10-lakh retirement product **sidesteps the only real friction by design.**

## 5. 🟡 Turkey — stablecoin-native, limit-capped
- **Obstacle:** lira instability drives massive USD demand; crypto is now **CMB-licensed (Law 7518, 2024)**; crypto-for-payments banned; **stablecoin transfers capped at $3k/day, $5k/mo**; banks report FX > $50k.
- **Solve:** lean into the **stablecoin on-ramp via a licensed Turkish CASP** (Turks are among the world's heaviest stablecoin users); collect via local instant (FAST); the **$5k/mo cap fits the recurring-contribution product perfectly** (it only blocks lump sums); route to the customer's own US account.
- **Partners:** CMB-licensed Turkish CASP + local PSP + US custodian + RIA.
- **Residual risk:** lira volatility, fast-moving crypto rules, the monthly cap limits big tickets.
- **Verdict:** ✅ **High-intent, solve after the LatAm core.** The DCA product is the right wedge given the transfer cap.

## 6. 🟡 Philippines — the open SE-Asia entry
- **Obstacle:** outbound flows go through BSP-regulated rails; VASP licensing had a moratorium (to ~Sept 2025); EMI applications reopened.
- **Solve:** partner with a **BSP-licensed EMI + VASP**; collect via **InstaPay/PESONet**; route to the customer's own US account. BSP outbound rules bite mainly when the *issuer is Philippine* — investing in *US* issuers is comparatively open.
- **Partners:** BSP-licensed EMI/VASP + US custodian + RIA.
- **Residual risk:** evolving VASP licensing; standard AML.
- **Verdict:** ✅ **The SE-Asia beachhead** — large diaspora + remittance culture + investing appetite. Indonesia/Thailand = same chassis, later, via local licensed partners (more controls). Vietnam stays dropped.

## 7. 🟡 Paraguay — free add-on
- **Obstacle:** small market, but open.
- **Solve:** reuse the **exact Argentina stablecoin/partner stack** — near-zero incremental work.
- **Verdict:** ✅ Low priority; bolt on once the AR rail exists.

---

## 8. Priority order (solve in this sequence)
| Wave | Markets | Rationale |
|---|---|---|
| **1 — Beachhead** | **Argentina** (easy, [05 §8.1](05-Examples.md)), **Brazil** (core, partner-solved) | Biggest demand × largest TAM |
| **2 — Expand LatAm** | **Mexico, Chile, Peru, Uruguay, Ecuador, Panama** (easy) + **Colombia** (IMC) + Paraguay | Same chassis, mostly low-friction |
| **3 — High-intent frontier** | **India** (DCA = TCS-free), **Turkey** (CASP + DCA), **Philippines** (BSP) | Huge demand; one tax/limit each to engineer around |
| **4 — Convenience/bundle** | **Eurozone, UK, Switzerland, Singapore, HK, Japan, Korea, UAE** | Frictionless but low-intent — sell travel-FX + bundle, not "access" |

**The whole point:** there is **one architecture**, deployed wave by wave. Each "complicated" market is a config of (local collection partner, local FX/VASP partner, one tax rule). The recurring-contribution retirement product is the master key that fits them all.

---

## Sources
- Brazil VASP / eFX / private-basis: see [06](06-inbound-collection.md) sources.
- India LRS $250k + 20% TCS > ₹10 lakh: [Razorpay – TCS rules 2026](https://razorpay.com/blog/outward-remittance-limit-india-tcs-rules/), [RBI – LRS FAQ](https://www.rbi.org.in/Commonperson/english/Scripts/FAQs.aspx?Id=1834)
- Turkey CASP framework (Law 7518) + $3k/day, $5k/mo stablecoin transfer caps: [Chambers – Blockchain 2025 Turkey](https://practiceguides.chambers.com/practice-guides/blockchain-2025/turkey/trends-and-developments), [Sumsub – Turkey crypto 2025](https://sumsub.com/blog/crypto-regulations-turkey/)
- Philippines BSP EMI/VASP + outward investment FAQ: [BSP – Outward Investments FAQ (Dec 2025)](https://www.bsp.gov.ph/Lists/Download%20Section/Attachments/140/Inward_and_Outward_Foreign_Investments_FAQs.pdf), [ICLG – Philippines Fintech 2025-26](https://iclg.com/practice-areas/fintech-laws-and-regulations/philippines)
- All figures `[VERIFY-LEGAL]` with in-country counsel before committing.
