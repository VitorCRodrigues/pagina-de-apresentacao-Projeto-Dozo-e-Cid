import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchFlexStatement } from "../src/ibkr.ts";

const resp = (body: string, status = 200) => new Response(body, { status });
const fake = (bodies: Response[]) => { const urls: string[] = []; return { urls, fetch: (async (u: string) => { urls.push(u); return bodies.shift()!; }) as typeof fetch }; };
const sendOk = () => resp("<FlexStatementResponse><Status>Success</Status><ReferenceCode>42</ReferenceCode></FlexStatementResponse>");
const pending = () => resp("<FlexStatementResponse><Status>Warn</Status><ErrorCode>1019</ErrorCode></FlexStatementResponse>");
const opts = { token: "tok", base: "https://x", sleep: async () => {} };

test("flex: request, poll through 'generation in progress', return statement", async () => {
  const f = fake([sendOk(), pending(), pending(), resp("<FlexQueryResponse/>")]);
  assert.equal(await fetchFlexStatement("q1", { ...opts, fetch: f.fetch }), "<FlexQueryResponse/>");
  assert.match(f.urls[0], /SendRequest\?t=tok&q=q1&v=3/);
  assert.match(f.urls[1], /GetStatement\?t=tok&q=42&v=3/);
});

test("flex: non-retryable error, HTTP error, timeout, missing token", async () => {
  await assert.rejects(fetchFlexStatement("q", { ...opts, fetch: fake([resp("<ErrorCode>1012</ErrorCode>")]).fetch }), /flex_request_failed:1012/);
  await assert.rejects(fetchFlexStatement("q", { ...opts, fetch: fake([sendOk(), resp("<ErrorCode>1020</ErrorCode>")]).fetch }), /flex_statement_failed:1020/);
  await assert.rejects(fetchFlexStatement("q", { ...opts, fetch: fake([resp("", 503)]).fetch }), /flex_http_503/);
  await assert.rejects(fetchFlexStatement("q", { ...opts, tries: 2, fetch: fake([sendOk(), pending(), pending()]).fetch }), /flex_statement_timeout/);
  const saved = process.env.IBKR_FLEX_TOKEN; delete process.env.IBKR_FLEX_TOKEN;
  await assert.rejects(fetchFlexStatement("q", { base: "https://x" }), /IBKR_FLEX_TOKEN missing/);
  if (saved) process.env.IBKR_FLEX_TOKEN = saved;
});

test("flex: errors never leak the token", async () => {
  try { await fetchFlexStatement("q", { ...opts, token: "SECRET123", fetch: fake([resp("<ErrorCode>1015</ErrorCode>")]).fetch }); }
  catch (e) { assert.doesNotMatch(String(e), /SECRET123/); return; }
  assert.fail("should throw");
});

// ---------- Web API allocation orders, replaying IBKR's documented responses ----------
import { webApiIbkrGateway } from "../src/ibkr.ts";

type Call = { method: string; path: string; body: any };
function webApi(replies: unknown[]) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ method: init.method!, path: url.replace("https://gw/v1/api", ""), body: init.body ? JSON.parse(String(init.body)) : undefined });
    const r = replies.shift();
    return r instanceof Response ? r : new Response(JSON.stringify(r), { status: 200 });
  }) as typeof fetch;
  return { calls, gw: webApiIbkrGateway({ base: "https://gw/v1/api", conids: { IE00B5BMR087: 75776072 }, autoConfirm: ["o163"], fetch: f }) };
}
const order = { windowId: "2026-11", isin: "IE00B5BMR087", allocations: { DU111: { cents: 120_000, shares: 2 }, DU222: { cents: 60_000, shares: 1 } } };
const KEY = "2026-11:core:IE00B5BMR087";
const submitted = [{ order_id: "1234567890", order_status: "Submitted", encrypt_message: "1" }];
const prompt = (id: string, mid: string) => [{ id, message: ["price exceeds the Percentage constraint of 3%. Are you sure?"], isSuppressed: false, messageIds: [mid] }];

test("web api: shares allocation group, then one order for the total with cOID = idempotency key", async () => {
  const { calls, gw } = webApi([{ success: true }, submitted]);
  await gw.placeAllocationOrder(order, KEY);
  assert.deepEqual(calls[0], { method: "POST", path: "/iserver/account/allocation/group", body: {
    name: "OD_2026_11_core_IE00B5BMR087", accounts: [{ name: "DU111", amount: 2 }, { name: "DU222", amount: 1 }], default_method: "S" } });
  assert.equal(calls[1].path, "/iserver/account/OD_2026_11_core_IE00B5BMR087/orders");
  assert.deepEqual(calls[1].body.orders[0], { acctId: "OD_2026_11_core_IE00B5BMR087", conid: 75776072, orderType: "MKT",
    side: "BUY", tif: "DAY", quantity: 3, cOID: KEY, manualIndicator: false });
});

test("web api: retry finds the group already there and overwrites it to match", async () => {
  const { calls, gw } = webApi([{ success: false }, { success: true }, submitted]);
  await gw.placeAllocationOrder(order, KEY);
  assert.deepEqual(calls.map((c) => c.method), ["POST", "PUT", "POST"]);
  assert.equal(calls[1].body.default_method, "S");
  const { gw: bad } = webApi([{ success: false }, { success: false }]);
  await assert.rejects(bad.placeAllocationOrder(order, KEY), /ibkr_group_not_set/);
});

test("web api: allow-listed prompt confirmed (even twice), unknown prompt left unanswered", async () => {
  const ok = webApi([{ success: true }, prompt("r1", "o163"), prompt("r2", "o163"), submitted]);
  await ok.gw.placeAllocationOrder(order, KEY);
  assert.deepEqual(ok.calls.slice(2).map((c) => [c.path, c.body]), [["/iserver/reply/r1", { confirmed: true }], ["/iserver/reply/r2", { confirmed: true }]]);
  const no = webApi([{ success: true }, prompt("r1", "o354")]);
  await assert.rejects(no.gw.placeAllocationOrder(order, KEY), /ibkr_prompt:o354/);
  assert.equal(no.calls.length, 2); // never confirmed
  const loop = webApi([{ success: true }, ...Array.from({ length: 7 }, (_, i) => prompt(`r${i}`, "o163"))]);
  await assert.rejects(loop.gw.placeAllocationOrder(order, KEY), /ibkr_too_many_prompts/);
});

test("web api: rejection, duplicate cOID on retry, HTTP and malformed responses", async () => {
  await assert.rejects(webApi([{ success: true }, { error: "We cannot accept an order at the limit price you selected." }]).gw
    .placeAllocationOrder(order, KEY), /ibkr_rejected:We cannot accept/);
  await webApi([{ success: true }, { error: "Duplicate order id: local order id already used" }]).gw.placeAllocationOrder(order, KEY);
  await assert.rejects(webApi([new Response("", { status: 401 })]).gw.placeAllocationOrder(order, KEY), /ibkr_http_401/);
  await assert.rejects(webApi([{ success: true }, [{ weird: true }]]).gw.placeAllocationOrder(order, KEY), /ibkr_unexpected_response/);
});

test("web api: refuses fractional or missing shares, unknown ISIN, empty order, missing base; deposit notice pending", async () => {
  const { calls, gw } = webApi([]);
  await assert.rejects(gw.placeAllocationOrder({ ...order, allocations: { DU111: { cents: 100 } } }, KEY), /whole_shares_required/);
  await assert.rejects(gw.placeAllocationOrder({ ...order, allocations: { DU111: { cents: 100, shares: 1.5 } } }, KEY), /whole_shares_required/);
  await assert.rejects(gw.placeAllocationOrder({ ...order, isin: "IE00BKM4GZ66" }, KEY), /no_conid/);
  await assert.rejects(gw.placeAllocationOrder({ ...order, allocations: {} }, KEY), /empty_order/);
  assert.equal(calls.length, 0); // nothing reached IBKR
  const saved = process.env.IBKR_WEB_API_URL; delete process.env.IBKR_WEB_API_URL;
  await assert.rejects(webApiIbkrGateway({ conids: { IE00B5BMR087: 1 } }).placeAllocationOrder(order, KEY), /IBKR_WEB_API_URL missing/);
  if (saved) process.env.IBKR_WEB_API_URL = saved;
  await assert.rejects(gw.notifyDeposit({ ibkrAccount: "DU1", amountCents: 1, currency: "USD", reference: "r", lane: "ar_usdc" }, "k"), /ibkr_api_access_pending/);
});
