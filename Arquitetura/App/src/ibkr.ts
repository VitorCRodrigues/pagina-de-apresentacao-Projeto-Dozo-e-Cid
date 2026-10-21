import type { IbkrGateway } from "./gateways.ts";

// The ONLY module allowed to hold IBKR credentials. Point IBKR_FLEX_URL at the paper account during the pilot.
const BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";
const RETRYABLE = new Set(["1018", "1019", "1021"]); // too many requests / generation in progress / try again

type Opts = { token?: string; base?: string; fetch?: typeof fetch; sleep?: (ms: number) => Promise<void>; tries?: number };

export async function fetchFlexStatement(queryId: string, o: Opts = {}): Promise<string> {
  const token = o.token ?? process.env.IBKR_FLEX_TOKEN;
  if (!token) throw new Error("IBKR_FLEX_TOKEN missing");
  const base = o.base ?? process.env.IBKR_FLEX_URL ?? BASE;
  const get = o.fetch ?? fetch;
  const sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const call = async (url: string) => {
    const res = await get(url);
    if (!res.ok) throw new Error(`flex_http_${res.status}`);
    return res.text();
  };
  const req = await call(`${base}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`);
  const ref = req.match(/<ReferenceCode>(\d+)<\/ReferenceCode>/)?.[1];
  if (!ref) throw new Error(`flex_request_failed:${req.match(/<ErrorCode>(\d+)/)?.[1] ?? "unknown"}`);
  for (let i = 0, tries = o.tries ?? 6; i < tries; i++) {
    const body = await call(`${base}/GetStatement?t=${encodeURIComponent(token)}&q=${ref}&v=3`);
    if (body.includes("<FlexQueryResponse")) return body;
    const code = body.match(/<ErrorCode>(\d+)/)?.[1] ?? "unknown";
    if (!RETRYABLE.has(code)) throw new Error(`flex_statement_failed:${code}`);
    await sleep(2_000 * 2 ** i);
  }
  throw new Error("flex_statement_timeout");
}
// ponytail: deposit notifications and allocation orders added once IBKR grants advisor/paper API access.

// ---------- Client Portal Web API (advisor orders) ----------
// Built against IBKR's published reference (docs/web-api/v1/endpoints, read 2026-10-14). To be verified on the paper
// account. Runs through a logged-in Client Portal Gateway or OAuth session at IBKR_WEB_API_URL (e.g. .../v1/api).
//  - One allocation group per order, method S (Shares): each client gets an exact whole-share count.
//    API cash-quantity stock orders round down to whole shares, so the window must run in whole-share mode.
//  - cOID = our idempotency key, so IBKR itself refuses a second copy of the same order.
//  - Warning prompts must be answered immediately; only allow-listed message ids are confirmed, anything else
//    is left unanswered (IBKR then drops the order) and surfaces as an error for operations.
type WebApiOpts = { base?: string; conids: Record<string, number>; autoConfirm?: string[];
  fetch?: typeof fetch; maxReplies?: number };

export function webApiIbkrGateway(o: WebApiOpts): IbkrGateway {
  const base = o.base ?? process.env.IBKR_WEB_API_URL;
  const get = o.fetch ?? fetch;
  const call = async (method: string, path: string, body?: unknown) => {
    if (!base) throw new Error("IBKR_WEB_API_URL missing");
    const res = await get(`${base}${path}`, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) throw new Error(`ibkr_http_${res.status}`);
    return res.json();
  };
  return {
    async notifyDeposit() { throw new Error("ibkr_api_access_pending"); }, // Account Management API, needs IBKR approval
    async placeAllocationOrder(order, idemKey) {
      const conid = o.conids[order.isin];
      if (!conid) throw new Error(`no_conid:${order.isin}`);
      const accounts = Object.entries(order.allocations).map(([name, a]) => {
        if (!Number.isInteger(a.shares) || a.shares! <= 0) throw new Error("whole_shares_required");
        return { name, amount: a.shares! };
      });
      if (!accounts.length) throw new Error("empty_order");
      const quantity = accounts.reduce((s, a) => s + a.amount, 0);
      const group = `OD_${idemKey.replace(/[^A-Za-z0-9]/g, "_")}`;
      const spec = { name: group, accounts, default_method: "S" };
      const created = await call("POST", "/iserver/account/allocation/group", spec);
      if (created?.success !== true) { // already exists from an earlier attempt: make it match this order exactly
        const updated = await call("PUT", "/iserver/account/allocation/group", spec);
        if (updated?.success !== true) throw new Error("ibkr_group_not_set");
      }
      let res = await call("POST", `/iserver/account/${encodeURIComponent(group)}/orders`, { orders: [{
        acctId: group, conid, orderType: "MKT", side: "BUY", tif: "DAY", quantity, cOID: idemKey, manualIndicator: false }] });
      for (let i = 0; ; i++) {
        if (!Array.isArray(res) && res?.error) {
          if (/duplicate|already (been )?(used|exists)/i.test(res.error)) return; // cOID seen before: already placed
          throw new Error(`ibkr_rejected:${String(res.error).slice(0, 200)}`);
        }
        const first = Array.isArray(res) ? res[0] : undefined;
        if (first?.order_id) return;
        if (!first?.id || !Array.isArray(first.messageIds)) throw new Error("ibkr_unexpected_response");
        const unknown = first.messageIds.filter((m: string) => !(o.autoConfirm ?? []).includes(m));
        if (unknown.length) throw new Error(`ibkr_prompt:${unknown.join(",")}`);
        if (i >= (o.maxReplies ?? 5)) throw new Error("ibkr_too_many_prompts");
        res = await call("POST", `/iserver/reply/${encodeURIComponent(first.id)}`, { confirmed: true });
      }
    },
  };
}
