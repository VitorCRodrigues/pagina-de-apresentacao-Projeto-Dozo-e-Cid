import Foundation
import Testing
@testable import OpenDollarsCore

// MARK: - Test doubles

actor FakeTransport: HTTPTransport {
    enum Reply: Sendable {
        case response(HTTPResponse)
        case failure(any Error)
    }

    private var replies: [Reply]
    private(set) var requests: [HTTPRequest] = []

    init(_ replies: [Reply]) { self.replies = replies }

    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        requests.append(request)
        guard !replies.isEmpty else { throw URLError(.badServerResponse) }
        switch replies.removeFirst() {
        case .response(let response): return response
        case .failure(let error): throw error
        }
    }
}

actor FakeTokens: SessionTokens {
    var token: String?
    var refreshedToken: String?
    private(set) var refreshCount = 0
    private(set) var expiredCount = 0

    init(token: String?, refreshedToken: String? = nil) {
        self.token = token
        self.refreshedToken = refreshedToken
    }

    func accessToken() async -> String? { token }

    func refreshAccessToken() async -> Bool {
        refreshCount += 1
        guard let refreshedToken else { return false }
        token = refreshedToken
        return true
    }

    func sessionDidExpire() async {
        expiredCount += 1
        token = nil
    }
}

final class LocaleBox: @unchecked Sendable {
    var value: AppLocale = .es
}

private func json(_ status: Int, _ body: String, headers: [String: String] = [:]) -> FakeTransport.Reply {
    .response(HTTPResponse(status: status, headers: headers, body: Data(body.utf8)))
}

private func errorReply(_ status: Int, _ code: String, extra: String = "") -> FakeTransport.Reply {
    json(status, #"{"error":{"code":"\#(code)","message":"m"\#(extra)}}"#)
}

private let configBody = """
{"liveMarkets":["AR"],"minRecurringUsdCents":25000,"minDepositUsdCents":10000,"efxCapUsdCents":1000000,
 "railsByCountry":{"AR":["ar_usdc","ar_swift"]},"investmentWindowDay":15,"ibkrPortalUrl":"https://example.test"}
"""

private let planBody = #"{"id":"plan-1","amountCents":25000,"dayOfMonth":5,"rail":"ar_usdc","status":"active"}"#

private func makeClient(
    _ replies: [FakeTransport.Reply],
    tokens: FakeTokens = FakeTokens(token: "t1"),
    locale: LocaleBox = LocaleBox(),
    now: Date = Date(timeIntervalSince1970: 1_794_344_400)
) -> (APIClient, FakeTransport) {
    let transport = FakeTransport(replies)
    let client = APIClient(transport: transport, tokens: tokens, locale: { locale.value }, now: { now })
    return (client, transport)
}

private func expectAPIError(
    _ code: ClientErrorCode, status: Int? = nil, _ body: () async throws -> some Any,
    sourceLocation: SourceLocation = #_sourceLocation
) async -> APIError? {
    do {
        _ = try await body()
        Issue.record("expected \(code)", sourceLocation: sourceLocation)
        return nil
    } catch let error as APIError {
        #expect(error.code == code, sourceLocation: sourceLocation)
        if let status { #expect(error.status == status, sourceLocation: sourceLocation) }
        return error
    } catch {
        Issue.record("unexpected \(error)", sourceLocation: sourceLocation)
        return nil
    }
}

// MARK: - Requests

@Suite struct APIClientRequestTests {
    @Test func sendsTheBasePathLanguageAndBearerToken() async throws {
        let (client, transport) = makeClient([json(200, configBody)])
        let config = try await client.getConfig()
        #expect(config.minRecurringUsdCents == Money(cents: 25000))

        let request = try #require(await transport.requests.first)
        #expect(request.method == .GET)
        #expect(request.path == "/api/v1/config")
        #expect(request.headers["Accept"] == "application/json")
        #expect(request.headers["Accept-Language"] == "es")
        #expect(request.headers["Authorization"] == "Bearer t1")
        #expect(request.headers["Idempotency-Key"] == nil)
        #expect(request.body == nil)
    }

    @Test func followsTheCurrentLanguageAndOmitsAMissingToken() async throws {
        let locale = LocaleBox()
        locale.value = .pt
        let (client, transport) = makeClient([json(200, configBody)], tokens: FakeTokens(token: nil), locale: locale)
        _ = try await client.getConfig()
        let request = try #require(await transport.requests.first)
        #expect(request.headers["Accept-Language"] == "pt")
        #expect(request.headers["Authorization"] == nil)
    }

    @Test func sendsTheIdempotencyKeyWhenCreatingADeposit() async throws {
        let (client, transport) = makeClient([json(201, depositReplyBody)])
        let key = IdempotencyKey(rawValue: "key-1")
        _ = try await client.createDeposit(CreateDepositRequest(quoteId: "q1", rail: .ar_usdc), idempotencyKey: key)

        let request = try #require(await transport.requests.first)
        #expect(request.method == .POST)
        #expect(request.path == "/api/v1/deposits")
        #expect(request.headers["Idempotency-Key"] == "key-1")
        #expect(request.headers["Content-Type"] == "application/json")
        #expect(String(decoding: try #require(request.body), as: UTF8.self) == #"{"quoteId":"q1","rail":"ar_usdc"}"#)
    }

    @Test func sendsTheIdempotencyKeyWhenCreatingAPlan() async throws {
        let (client, transport) = makeClient([json(201, planBody)])
        let plan = try await client.createPlan(
            CreatePlanRequest(amountCents: Money(cents: 25000), dayOfMonth: 5, rail: .ar_usdc),
            idempotencyKey: IdempotencyKey(rawValue: "key-2"))
        #expect(plan.id == "plan-1")
        let request = try #require(await transport.requests.first)
        #expect(request.path == "/api/v1/plans")
        #expect(request.headers["Idempotency-Key"] == "key-2")
    }

    @Test func aQuoteCarriesNoIdempotencyKey() async throws {
        let (client, transport) = makeClient([json(200, quoteReplyBody)])
        _ = try await client.createQuote(QuoteRequest(amountCents: Money(cents: 50000)))
        let request = try #require(await transport.requests.first)
        #expect(request.path == "/api/v1/deposits/quote")
        #expect(request.headers["Idempotency-Key"] == nil)
        #expect(String(decoding: try #require(request.body), as: UTF8.self) == #"{"amountCents":50000}"#)
    }

    @Test func buildsTheDepositsQuery() async throws {
        let (client, transport) = makeClient([json(200, #"{"items":[]}"#)])
        _ = try await client.getDeposits(states: [.invested, .returned], cursor: "c 1", limit: 2)
        let request = try #require(await transport.requests.first)
        #expect(request.path == "/api/v1/deposits?state=invested,returned&cursor=c%201&limit=2")
    }

    @Test func escapesAPathIdentifier() async throws {
        let (client, transport) = makeClient([json(200, depositReplyBody)])
        _ = try await client.getDeposit(id: "dep/1")
        #expect(await transport.requests.first?.path == "/api/v1/deposits/dep%2F1")
    }

    @Test func acceptsANoContentReply() async throws {
        let (client, transport) = makeClient([.response(HTTPResponse(status: 204, headers: [:], body: Data()))])
        try await client.sendDepositSentNotice(depositId: "dep-1")
        #expect(await transport.requests.first?.path == "/api/v1/deposits/dep-1/sent-notice")
    }
}

// MARK: - Errors

@Suite struct APIClientErrorTests {
    @Test func translatesAKnownCodeWithItsStatusAndFields() async {
        let (client, _) = makeClient([errorReply(422, "validation_failed", extra: #","fields":{"rail":"invalid"}"#)])
        let error = await expectAPIError(.validation_failed, status: 422) { try await client.getConfig() }
        #expect(error?.fields == ["rail": "invalid"])
    }

    @Test func mapsAnUnknownCodeToInternal() async {
        let (client, _) = makeClient([errorReply(409, "brand_new_code")])
        _ = await expectAPIError(.internal, status: 409) { try await client.getConfig() }
    }

    @Test func mapsANonJSONErrorToInternal() async {
        let (client, _) = makeClient([json(502, "<html>Bad gateway</html>")])
        _ = await expectAPIError(.internal, status: 502) { try await client.getConfig() }
    }

    @Test func mapsATransportFailureToNetwork() async {
        let (client, _) = makeClient([.failure(URLError(.notConnectedToInternet))])
        _ = await expectAPIError(.network, status: 0) { try await client.getConfig() }
    }

    @Test func letsCancellationThrough() async {
        let (client, _) = makeClient([.failure(CancellationError())])
        await #expect(throws: CancellationError.self) { try await client.getConfig() }
    }

    @Test func mapsABrokenContractToInvalidResponse() async {
        let (client, _) = makeClient([json(200, #"{"liveMarkets":["AR"],"minRecurringUsdCents":250.5}"#)])
        _ = await expectAPIError(.invalid_response, status: 200) { try await client.getConfig() }
    }

    @Test func readsTheMaintenanceWindowFromTheBody() async {
        let (client, _) = makeClient([errorReply(503, "maintenance", extra: #","until":"2026-11-10T21:30:00Z""#)])
        let error = await expectAPIError(.maintenance, status: 503) { try await client.getConfig() }
        #expect(error?.until == Date(timeIntervalSince1970: 1_794_346_200))
    }

    @Test func fallsBackToRetryAfterForTheMaintenanceWindow() async {
        let reply = json(503, #"{"error":{"code":"maintenance","message":""}}"#, headers: ["Retry-After": "600"])
        let (client, _) = makeClient([reply], now: Date(timeIntervalSince1970: 1_794_344_400))
        let error = await expectAPIError(.maintenance) { try await client.getConfig() }
        #expect(error?.until == Date(timeIntervalSince1970: 1_794_345_000))
    }

    @Test func clientCodesCoverEveryAPICode() {
        for code in ApiErrorCode.allCases {
            #expect(ClientErrorCode(rawValue: code.rawValue) != nil)
        }
    }
}

// MARK: - Session expiry and refresh

@Suite struct APIClientSessionTests {
    @Test func refreshesOnceAndRetriesWithTheNewToken() async throws {
        let tokens = FakeTokens(token: "old", refreshedToken: "new")
        let (client, transport) = makeClient([errorReply(401, "session_expired"), json(200, configBody)], tokens: tokens)
        _ = try await client.getConfig()

        let requests = await transport.requests
        #expect(requests.map { $0.headers["Authorization"] } == ["Bearer old", "Bearer new"])
        #expect(await tokens.refreshCount == 1)
        #expect(await tokens.expiredCount == 0)
    }

    @Test func endsTheSessionWhenTheRefreshFails() async {
        let tokens = FakeTokens(token: "old", refreshedToken: nil)
        let (client, transport) = makeClient([errorReply(401, "session_expired")], tokens: tokens)
        _ = await expectAPIError(.session_expired, status: 401) { try await client.getConfig() }
        #expect(await transport.requests.count == 1)
        #expect(await tokens.expiredCount == 1)
    }

    @Test func neverRefreshesTwiceForOneRequest() async {
        let tokens = FakeTokens(token: "old", refreshedToken: "new")
        let (client, transport) = makeClient(
            [errorReply(401, "session_expired"), errorReply(401, "session_expired")], tokens: tokens)
        _ = await expectAPIError(.session_expired) { try await client.getConfig() }
        #expect(await transport.requests.count == 2)
        #expect(await tokens.refreshCount == 1)
        #expect(await tokens.expiredCount == 1)
    }

    @Test func keepsTheSameIdempotencyKeyOnTheRetry() async throws {
        let tokens = FakeTokens(token: "old", refreshedToken: "new")
        let (client, transport) = makeClient([errorReply(401, "session_expired"), json(201, depositReplyBody)], tokens: tokens)
        _ = try await client.createDeposit(
            CreateDepositRequest(quoteId: "q1", rail: .ar_usdc), idempotencyKey: IdempotencyKey(rawValue: "k"))
        #expect(await transport.requests.map { $0.headers["Idempotency-Key"] } == ["k", "k"])
    }
}

// MARK: - Device clock vs server clock (api-gaps.md, item 8)

@Suite struct ClockOffsetTests {
    @Test func parsesTheHTTPDateHeader() {
        #expect(HTTPDate.parse("Tue, 10 Nov 2026 21:00:00 GMT") == Date(timeIntervalSince1970: 1_794_344_400))
        #expect(HTTPDate.parse("Tue, 10 Nov 2026 21:00:00 UTC") == nil)
        #expect(HTTPDate.parse("not a date") == nil)
        #expect(HTTPDate.parse("Tue, 31 Feb 2026 21:00:00 GMT") == nil)
    }

    @Test func measuresTheOffsetIgnoringLessThanASecond() {
        let received = Date(timeIntervalSince1970: 1_794_344_400)
        #expect(ClockOffset.offset(dateHeader: "Tue, 10 Nov 2026 21:00:10 GMT", receivedAt: received) == 10)
        #expect(ClockOffset.offset(dateHeader: "Tue, 10 Nov 2026 20:59:55 GMT", receivedAt: received) == -5)
        #expect(ClockOffset.offset(dateHeader: "Tue, 10 Nov 2026 21:00:00 GMT", receivedAt: received.addingTimeInterval(0.6)) == 0)
        #expect(ClockOffset.offset(dateHeader: nil, receivedAt: received) == 0)
        #expect(ClockOffset.offset(dateHeader: "garbage", receivedAt: received) == 0)
    }

    @Test func theClientKeepsTheLatestOffset() async throws {
        let now = Date(timeIntervalSince1970: 1_794_344_400)
        let (client, _) = makeClient(
            [json(200, configBody, headers: ["date": "Tue, 10 Nov 2026 21:00:30 GMT"])], now: now)
        #expect(await client.clockOffset == 0)
        _ = try await client.getConfig()
        #expect(await client.clockOffset == 30)
        #expect(await client.serverNow() == now.addingTimeInterval(30))
    }
}

// MARK: - One key per intention

@Suite struct IdempotencyKeyTrackerTests {
    private struct Intent: Equatable, Sendable {
        var quoteId: String
        var rail: Rail
    }

    @Test func keepsTheKeyWhileTheIntentIsTheSame() {
        var tracker = IdempotencyKeyTracker<Intent>()
        let first = tracker.key(for: Intent(quoteId: "q1", rail: .ar_usdc))
        #expect(tracker.key(for: Intent(quoteId: "q1", rail: .ar_usdc)) == first)
    }

    @Test func changesTheKeyWhenTheIntentChanges() {
        var tracker = IdempotencyKeyTracker<Intent>()
        let first = tracker.key(for: Intent(quoteId: "q1", rail: .ar_usdc))
        #expect(tracker.key(for: Intent(quoteId: "q1", rail: .ar_swift)) != first)
    }

    @Test func resetGivesTheNextIntentAFreshKey() {
        var tracker = IdempotencyKeyTracker<Intent>()
        let intent = Intent(quoteId: "q1", rail: .ar_usdc)
        let first = tracker.key(for: intent)
        tracker.reset()
        #expect(tracker.key(for: intent) != first)
    }

    @Test func keysAreUUIDs() {
        #expect(UUID(uuidString: IdempotencyKey().rawValue) != nil)
    }
}

// MARK: - Bodies

let depositReplyBody = """
{"id":"dep-1","rail":"ar_usdc","state":"deposit_notified","amountCents":50000,"costs":[],
 "history":[{"state":"deposit_notified","at":"2026-11-10T21:00:00Z"}],"isFirstDeposit":false,
 "createdAt":"2026-11-10T21:00:00Z"}
"""

let quoteReplyBody = """
{"id":"q1","amountCents":50000,"expiresAt":"2026-11-10T21:05:00Z","options":[
 {"rail":"ar_usdc","recommended":true,"costs":[],"totalCostCents":150,"netToInvestCents":49850,
  "expectedDays":{"min":0,"max":1}}]}
"""
