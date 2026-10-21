// Rates and limits live here, not in logic (stress test 3.5: IOF can change overnight).
// All money is integer US cents. Every value marked (assumed) must be replaced with a signed quote in Phase 0.
export const config = {
  minMonthlyDepositCents: 250_00,
  brEfxCapCents: 10_000_00,       // Res. BCB 561, per operation. Counsel to confirm per-operation vs per-client.
  liveMarkets: ["AR"] as string[], // BR stays off until IBKR accepts partner-sent wires (B1) and a partner is signed.
  brIofInvestment: 0.011,          // investment-nature FX; 3.5% if booked wrong
  brPartnerSpread: 0.0075,         // (assumed)
  usdcFeeRate: 0.003, usdcFeeMinCents: 1_00, // IBKR/Zerohash
  usdtSwapSpread: 0.003,           // (assumed) client's exchange, shown for information
  arSwiftFeeCents: 35_00,          // (assumed) Argentine bank outgoing wire
  usdcDepegPauseBps: 50,
  pixMedHoldDays: 7,               // (assumed) new BR clients: hold at partner until the MED window passes
  newClientDays: 90,
  // IBKR Web API: cash-quantity stock orders round down to whole shares (docs, 2026-10). Orders go out in shares.
  wholeShareOrders: true,
  maxWeight: 0.6,
  maxTurnover: 0.3,
};
export type Config = typeof config;
