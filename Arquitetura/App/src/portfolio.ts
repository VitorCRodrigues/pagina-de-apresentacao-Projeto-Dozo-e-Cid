import { config as defaults, type Config } from "./config.ts";

export type Sleeve = { exposure: string; primary: string; substitute: string; weight: number };
export type Model = { id: string; sleeves: Sleeve[] };
export type Account = { id: string; cashCents: number; ibkrStatus: string; sanctioned?: boolean };
export type Order = {
  idemKey: string; windowId: string; isin: string;
  cents: number; shares?: number;                    // shares only in whole-share mode
  allocations: Record<string, { cents: number; shares?: number }>;
};

// Estate promise: the core portfolio must hold no US-situs funds. US ISINs belong only in the opt-in sleeve.
const US_SITUS = /^US/;

export function preTradeCheck(next: Model, prev?: Model, cfg: Config = defaults): void {
  if (next.sleeves.length === 0) throw new Error("empty_model");
  if (next.sleeves.some((s) => !(s.weight > 0))) throw new Error("bad_weight");
  const total = next.sleeves.reduce((s, x) => s + x.weight, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error("weights_not_100");
  if (next.sleeves.some((s) => s.weight > cfg.maxWeight)) throw new Error("max_weight");
  if (next.sleeves.some((s) => US_SITUS.test(s.primary) || US_SITUS.test(s.substitute))) throw new Error("us_situs_in_core");
  if (new Set(next.sleeves.map((s) => s.exposure)).size !== next.sleeves.length) throw new Error("duplicate_exposure");
  if (prev) {
    const w = (m: Model, e: string) => m.sleeves.find((s) => s.exposure === e)?.weight ?? 0;
    const exps = new Set([...next.sleeves, ...prev.sleeves].map((s) => s.exposure));
    const turnover = [...exps].reduce((t, e) => t + Math.abs(w(next, e) - w(prev, e)), 0) / 2;
    if (turnover > cfg.maxTurnover + 1e-9) throw new Error("max_turnover");
  }
}

// Monthly execution window. A missed window is not replayed: cash simply rolls into the next one.
export const windowId = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// One allocation order per instrument per window, from the advisor master. IBKR allocates to sub-accounts.
// prices (USD cents per share) switch on whole-share mode, used if IBKR cannot allocate UCITS fractions.
export function aggregate(o: { model: Model; accounts: Account[]; when: Date; killSwitch: boolean;
  unavailable?: Set<string>; pricesCents?: Record<string, number> }, cfg: Config = defaults): Order[] {
  if (o.killSwitch) return [];
  preTradeCheck(o.model, undefined, cfg);
  const win = windowId(o.when);
  const tradable = o.accounts.filter((a) => a.ibkrStatus === "open" && !a.sanctioned && a.cashCents > 0);
  const orders = new Map<string, Order>();
  for (const s of o.model.sleeves) {
    const isin = !o.unavailable?.has(s.primary) ? s.primary
      : !o.unavailable.has(s.substitute) ? s.substitute
      : (() => { throw new Error(`no_instrument:${s.exposure}`); })();
    const price = o.pricesCents?.[isin];
    if (o.pricesCents && !(price! > 0)) throw new Error(`no_price:${isin}`);
    const ord = orders.get(isin) ?? { idemKey: `${win}:${o.model.id}:${isin}`, windowId: win, isin, cents: 0, allocations: {} };
    for (const a of tradable) {
      const budget = Math.floor(a.cashCents * s.weight); // floor: never allocate more cash than the account has
      const shares = price ? Math.floor(budget / price) : undefined;
      const cents = price ? shares! * price : budget;
      if (cents === 0) continue;
      const prev = ord.allocations[a.id]; // two sleeves can land on one ISIN when a substitute is in use
      ord.allocations[a.id] = { cents: (prev?.cents ?? 0) + cents, ...(price && { shares: (prev?.shares ?? 0) + shares! }) };
      ord.cents += cents;
      if (price) ord.shares = (ord.shares ?? 0) + shares!;
    }
    if (ord.cents > 0) orders.set(isin, ord);
  }
  return [...orders.values()];
}
