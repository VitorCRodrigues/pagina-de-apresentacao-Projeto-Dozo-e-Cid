import Foundation
import Testing
@testable import OpenDollarsCore

// Port of the in-scope cases of web/src/mocks/handlers.test.ts and scenarios.test.ts.

private struct Reply {
    let status: Int
    let headers: [String: String]
    let data: Data

    func decode<T: Decodable>(_ type: T.Type) throws -> T {
        try JSONCoding.makeDecoder().decode(type, from: data)
    }

    var errorCode: String? { (try? decode(ApiErrorBody.self))?.error.code }
    var errorFields: [String: String]? { (try? decode(ApiErrorBody.self))?.error.fields }
}

private final class SleepLog: @unchecked Sendable {
    private let lock = NSLock()
    private var values: [Duration] = []
    var durations: [Duration] { lock.withLock { values } }
    func add(_ duration: Duration) { lock.withLock { values.append(duration) } }
}

private func server(_ scenario: Scenario = .open, clock: TestClock = TestClock(), sleeps: SleepLog = SleepLog()) -> MockServer {
    MockServer(scenario: scenario, now: { clock.now }, sleep: { sleeps.add($0) })
}

private func call(
    _ server: MockServer, _ method: HTTPMethod, _ path: String,
    body: String? = nil, key: String? = nil, lang: AppLocale = .es, token: Bool = true
) async throws -> Reply {
    var headers = ["Accept-Language": lang.rawValue]
    if token { headers["Authorization"] = "Bearer test" }
    if let key { headers["Idempotency-Key"] = key }
    if body != nil { headers["Content-Type"] = "application/json" }
    let response = try await server.send(HTTPRequest(
        method: method, path: "/api/v1\(path)", headers: headers, body: body.map { Data($0.utf8) }))
    return Reply(status: response.status, headers: response.headers, data: response.body)
}

private func quote(_ server: MockServer, amountCents: Int = 50000) async throws -> Quote {
    try await call(server, .POST, "/deposits/quote", body: #"{"amountCents":\#(amountCents)}"#).decode(Quote.self)
}

// MARK: - Routes

@Suite struct MockServerRouteTests {
    @Test func rejectsRequestsWithoutATokenWith401SessionExpired() async throws {
        let reply = try await call(server(), .GET, "/account", token: false)
        #expect(reply.status == 401)
        #expect(reply.errorCode == "session_expired")
    }

    @Test func servesTheConfigWithoutASession() async throws {
        let reply = try await call(server(), .GET, "/config", token: false)
        #expect(reply.status == 200)
        let config = try reply.decode(AppConfig.self)
        #expect(config.liveMarkets == [.AR])
        #expect(config.minRecurringUsdCents == Money(cents: 25000))
        #expect(config.minDepositUsdCents == Money(cents: 10000))
    }

    @Test func answersEditorialContentInTheRequestedLanguage() async throws {
        let mock = server()
        let es = try await call(mock, .GET, "/portfolio", lang: .es).decode(Portfolio.self)
        let pt = try await call(mock, .GET, "/portfolio", lang: .pt).decode(Portfolio.self)
        #expect(es.positions.first?.description.hasPrefix("Sigue al S&P 500") == true)
        #expect(pt.positions.first?.description.hasPrefix("Acompanha o S&P 500") == true)
    }

    @Test func stampsEveryReplyWithTheServerDate() async throws {
        let reply = try await call(server(), .GET, "/config")
        #expect(reply.headers["date"] == "Tue, 10 Nov 2026 21:00:00 GMT")
    }

    @Test func quotesTheARRailsWithIntegerCostsAndAFiveMinuteExpiry() async throws {
        let clock = TestClock()
        let reply = try await call(server(clock: clock), .POST, "/deposits/quote", body: #"{"amountCents":50000}"#)
        #expect(reply.status == 200)
        let quote = try reply.decode(Quote.self)
        let usdc = try #require(quote.options.first { $0.rail == .ar_usdc })
        #expect(usdc.recommended)
        #expect(usdc.totalCostCents == Money(cents: 150))
        #expect(usdc.netToInvestCents == Money(cents: 49850))
        #expect(quote.options.map(\.rail) == [.ar_usdc, .ar_swift])
        #expect(quote.expiresAt.timeIntervalSince(clock.now) == 300)
    }

    @Test func refusesAQuoteBelowTheOneOffMinimum() async throws {
        let reply = try await call(server(), .POST, "/deposits/quote", body: #"{"amountCents":9999}"#)
        #expect(reply.status == 422)
        #expect(reply.errorCode == "below_minimum")
    }

    @Test func refusesAFractionalAmount() async throws {
        let reply = try await call(server(), .POST, "/deposits/quote", body: #"{"amountCents":500.5}"#)
        #expect(reply.status == 422)
        #expect(reply.errorFields == ["amountCents": "invalid"])
    }

    @Test func returnsTheSameDepositForARepeatedIdempotencyKey() async throws {
        let mock = server()
        let quote = try await quote(mock)
        let body = #"{"quoteId":"\#(quote.id)","rail":"ar_usdc"}"#
        let first = try await call(mock, .POST, "/deposits", body: body, key: "k-1")
        let again = try await call(mock, .POST, "/deposits", body: body, key: "k-1")

        #expect(first.status == 201)
        #expect(again.status == 200)
        let created = try first.decode(Deposit.self)
        #expect(try again.decode(Deposit.self).id == created.id)
        #expect(created.state == .deposit_notified)
        #expect(!created.isFirstDeposit)
        guard case let .usdc(usdc) = created.instructions else {
            Issue.record("expected USDC instructions")
            return
        }
        #expect(usdc.token == "USDC")

        let list = try await call(mock, .GET, "/deposits").decode(DepositsPage.self)
        #expect(list.items.filter { $0.id == created.id }.count == 1)
    }

    @Test func rejectsAReusedKeyWithADifferentBodyWith409IdempotencyConflict() async throws {
        let mock = server()
        let quote = try await quote(mock)
        _ = try await call(mock, .POST, "/deposits", body: #"{"quoteId":"\#(quote.id)","rail":"ar_usdc"}"#, key: "k-2")
        let conflict = try await call(mock, .POST, "/deposits", body: #"{"quoteId":"\#(quote.id)","rail":"ar_swift"}"#, key: "k-2")
        #expect(conflict.status == 409)
        #expect(conflict.errorCode == "idempotency_conflict")
    }

    @Test func requiresAnIdempotencyKeyToCreateADeposit() async throws {
        let mock = server()
        let quote = try await quote(mock)
        let reply = try await call(mock, .POST, "/deposits", body: #"{"quoteId":"\#(quote.id)","rail":"ar_usdc"}"#)
        #expect(reply.status == 422)
        #expect(reply.errorCode == "validation_failed")
    }

    @Test func refusesARailTheQuoteDoesNotOffer() async throws {
        let mock = server()
        let quote = try await quote(mock)
        let reply = try await call(mock, .POST, "/deposits", body: #"{"quoteId":"\#(quote.id)","rail":"br_efx"}"#, key: "k-r")
        #expect(reply.status == 422)
        #expect(reply.errorFields == ["rail": "invalid"])
    }

    @Test func aQuoteExpiresAfterFiveMinutes() async throws {
        let clock = TestClock()
        let mock = server(clock: clock)
        let quote = try await quote(mock)
        clock.advance(300)
        let reply = try await call(mock, .POST, "/deposits", body: #"{"quoteId":"\#(quote.id)","rail":"ar_usdc"}"#, key: "k-e")
        #expect(reply.status == 409)
        #expect(reply.errorCode == "quote_expired")
    }

    @Test func anUnknownQuoteIsNotFound() async throws {
        let reply = try await call(server(), .POST, "/deposits", body: #"{"quoteId":"q-nope","rail":"ar_usdc"}"#, key: "k-n")
        #expect(reply.status == 404)
        #expect(reply.errorCode == "not_found")
    }

    @Test func filtersAndPaginatesGetDeposits() async throws {
        let mock = server(.returned)
        let returned = try await call(mock, .GET, "/deposits?state=returned").decode(DepositsPage.self)
        #expect(returned.items.map(\.state) == [.returned])

        // api-gaps.md, item 2: a comma-separated list of states.
        let finished = try await call(mock, .GET, "/deposits?state=invested,returned").decode(DepositsPage.self)
        #expect(finished.items.count > 1)
        #expect(Set(finished.items.map(\.state.rawValue)) == ["invested", "returned"])
        let invalid = try await call(mock, .GET, "/deposits?state=invested,nope")
        #expect(invalid.status == 422)
        #expect(invalid.errorFields == ["state": "invalid"])
        #expect(try await call(mock, .GET, "/deposits?state=").status == 200)

        let first = try await call(mock, .GET, "/deposits?limit=2").decode(DepositsPage.self)
        #expect(first.items.count == 2)
        let cursor = try #require(first.nextCursor)
        let second = try await call(mock, .GET, "/deposits?limit=2&cursor=\(cursor)").decode(DepositsPage.self)
        #expect(second.items.count == 2)
        #expect(second.nextCursor == nil)
    }

    @Test func answers404ForAnUnknownDepositAndAnUnservedRoute() async throws {
        let mock = server()
        let deposit = try await call(mock, .GET, "/deposits/nope")
        #expect(deposit.status == 404)
        #expect(deposit.errorCode == "not_found")
        #expect(try await call(mock, .GET, "/notifications").status == 404)
    }

    @Test func acknowledgesTheSentNotice() async throws {
        let mock = server()
        #expect(try await call(mock, .POST, "/deposits/dep-2026-10/sent-notice").status == 204)
        #expect(try await call(mock, .POST, "/deposits/nope/sent-notice").status == 404)
    }

    @Test func marksOnlyTheOldestNonReturnedDepositAsTheFirst() async throws {
        let page = try await call(server(), .GET, "/deposits").decode(DepositsPage.self)
        #expect(page.items.map(\.isFirstDeposit) == [false, false, true])
    }
}

// MARK: - Scenarios

@Suite struct MockScenarioTests {
    @Test func has31UniqueScenariosInTheWebsOrder() {
        #expect(Scenario.allCases.count == 31)
        #expect(Scenario.allCases.map(\.rawValue) == [
            "draft", "submitted", "kyc_review", "ibkr_pending", "action_required", "open", "restricted", "rejected",
            "kyc_passed", "ibkr_open", "deposit_notified", "partner_collected", "fx_executed", "wire_sent",
            "broker_credited", "invested", "returned",
            "ibkr_not_open", "ibkr_restricted", "compliance_hold", "quote_expired", "pix_med_hold", "market_not_live",
            "slow", "server_error", "empty", "in_flight_only", "plan_paused", "plan_reminder", "terms_update", "maintenance",
        ])
        #expect(Scenario.default == .open)
    }

    @Test func groupsEveryScenarioExactlyOnce() {
        let grouped = Scenario.Group.allCases.flatMap { Scenario.cases(in: $0) }
        #expect(grouped.sorted { $0.rawValue < $1.rawValue } == Scenario.allCases.sorted { $0.rawValue < $1.rawValue })
        #expect(Scenario.cases(in: .account).map(\.rawValue) == AccountStatus.knownCases.map(\.rawValue))
        #expect(Scenario.cases(in: .deposit).map(\.rawValue) == DepositState.knownCases.map(\.rawValue))
        #expect(Scenario.cases(in: .block).map(\.rawValue) == BlockReason.knownCases.map(\.rawValue))
    }

    @Test func readsTheLaunchArgument() {
        #expect(Scenario(arguments: ["OpenDollars", "-scenario", "ibkr_pending"]) == .ibkr_pending)
        #expect(Scenario(arguments: ["OpenDollars", "-scenario", "nope"]) == nil)
        #expect(Scenario(arguments: ["OpenDollars"]) == nil)
    }

    @Test(arguments: Scenario.allCases)
    func everyScenarioServesPayloadsTheModelsDecodeInEveryLanguage(scenario: Scenario) async throws {
        guard scenario != .server_error, scenario != .maintenance else { return }
        let mock = server(scenario)
        for lang in AppLocale.allCases {
            _ = try await call(mock, .GET, "/config", lang: lang).decode(AppConfig.self)
            _ = try await call(mock, .GET, "/me", lang: lang).decode(Me.self)
            _ = try await call(mock, .GET, "/account", lang: lang).decode(Account.self)
            let portfolio = try await call(mock, .GET, "/portfolio", lang: lang).decode(Portfolio.self)
            #expect(try portfolio.totalMatchesBuckets())
            _ = try await call(mock, .GET, "/deposits", lang: lang).decode(DepositsPage.self)
        }
    }

    @Test(arguments: DepositState.knownCases.map(\.rawValue))
    func aDepositScenarioPutsThatStateFirst(raw: String) async throws {
        let scenario = try #require(Scenario(rawValue: raw))
        let page = try await call(server(scenario), .GET, "/deposits").decode(DepositsPage.self)
        #expect(page.items.first?.id == "dep-scenario")
        #expect(page.items.first?.state.rawValue == raw)
    }

    @Test func depositNotifiedAsksTheClientToSendTheMoney() async throws {
        let account = try await call(server(.deposit_notified), .GET, "/account").decode(Account.self)
        #expect(account.pending.map(\.kind) == [.deposit_action])
        #expect(account.pending.first?.depositId == "dep-scenario")
    }

    @Test func usesSWIFTForTheFXAndWireScenarios() async throws {
        let page = try await call(server(.wire_sent), .GET, "/deposits").decode(DepositsPage.self)
        #expect(page.items.first?.rail == .ar_swift)
    }

    @Test func blocksDepositsBeforeTheAccountOpensWhileRestrictedAndOutsideLiveMarkets() async throws {
        let body = #"{"amountCents":50000}"#
        #expect(try await call(server(.ibkr_pending), .POST, "/deposits/quote", body: body).errorCode == "account_not_open")
        #expect(try await call(server(.restricted), .POST, "/deposits/quote", body: body).errorCode == "account_restricted")
        let notLive = try await call(server(.market_not_live), .POST, "/deposits/quote", body: body)
        #expect(notLive.status == 403)
        #expect(notLive.errorCode == "market_not_live")
    }

    @Test func complianceHoldRefusesQuotes() async throws {
        let reply = try await call(server(.compliance_hold), .POST, "/deposits/quote", body: #"{"amountCents":50000}"#)
        #expect(reply.status == 409)
        #expect(reply.errorCode == "compliance_hold")
    }

    @Test func quoteExpiredScenarioRefusesTheDeposit() async throws {
        let mock = server(.quote_expired)
        let quote = try await quote(mock)
        let reply = try await call(mock, .POST, "/deposits", body: #"{"quoteId":"\#(quote.id)","rail":"ar_usdc"}"#, key: "k-3")
        #expect(reply.status == 409)
        #expect(reply.errorCode == "quote_expired")
    }

    @Test func serverErrorAnswers500OnEveryRoute() async throws {
        let mock = server(.server_error)
        for path in ["/config", "/me", "/account", "/portfolio", "/deposits"] {
            let reply = try await call(mock, .GET, path)
            #expect(reply.status == 500, "\(path)")
            #expect(reply.errorCode == "internal", "\(path)")
        }
    }

    @Test func maintenanceAnswers503WithTheExpectedEnd() async throws {
        let clock = TestClock()
        let reply = try await call(server(.maintenance, clock: clock), .GET, "/portfolio")
        #expect(reply.status == 503)
        #expect(try reply.decode(ApiErrorBody.self).error.until == clock.now.addingTimeInterval(30 * 60))
    }

    @Test func emptyScenarioHasNoDepositsOrPositions() async throws {
        let mock = server(.empty)
        #expect(try await call(mock, .GET, "/deposits").decode(DepositsPage.self).items.isEmpty)
        #expect(try await call(mock, .GET, "/portfolio").decode(Portfolio.self).positions.isEmpty)
    }

    @Test func slowScenarioWaitsThreeSecondsPerResponse() async throws {
        let sleeps = SleepLog()
        _ = try await call(server(.slow, sleeps: sleeps), .GET, "/config")
        #expect(sleeps.durations == [.seconds(3)])
    }

    @Test func actionRequiredListsTheDocumentsInTheClientsLanguage() async throws {
        let account = try await call(server(.action_required), .GET, "/account", lang: .pt).decode(Account.self)
        #expect(account.pending.map(\.title) == ["Comprovante de endereço", "Foto do verso do DNI"])
        #expect(account.blockReasons == [.ibkr_not_open])
    }

    @Test func inFlightOnlyHasMoneyOnTheWayAndNothingElse() async throws {
        let portfolio = try await call(server(.in_flight_only), .GET, "/portfolio").decode(Portfolio.self)
        #expect(portfolio.buckets.inFlightCents == Money(cents: 50000))
        #expect(try portfolio.displayedTotal() == Money(cents: 50000))
    }
}

// MARK: - The real client against the mock

@Suite struct MockEndToEndTests {
    @Test func createsADepositThroughTheClientWithOneKeyPerIntent() async throws {
        let clock = TestClock()
        let session = SessionManager(store: MemoryTokenStore(), auth: SimulatedAuthProvider(delay: .zero) { .identity(.lucia) }, now: { clock.now })
        try await session.signInWithProvider()
        let client = APIClient(transport: server(clock: clock), tokens: session, locale: { .es }, now: { clock.now })

        let portfolio = try await client.getPortfolio()
        #expect(try portfolio.displayedTotal() > .zero)

        let quote = try await client.createQuote(QuoteRequest(amountCents: Money(cents: 50000)))
        var tracker = IdempotencyKeyTracker<CreateDepositRequest>()
        let request = CreateDepositRequest(quoteId: quote.id, rail: .ar_usdc)
        let first = try await client.createDeposit(request, idempotencyKey: tracker.key(for: request))
        let retry = try await client.createDeposit(request, idempotencyKey: tracker.key(for: request))
        #expect(retry.id == first.id)
        #expect(await client.clockOffset == 0)
    }

    @Test func theClientSeesTheMockErrorsByCode() async throws {
        let session = SessionManager(store: MemoryTokenStore(), auth: SimulatedAuthProvider(delay: .zero) { .identity(.lucia) })
        try await session.signInWithProvider()
        let client = APIClient(transport: server(.restricted), tokens: session, locale: { .es })
        do {
            _ = try await client.createQuote(QuoteRequest(amountCents: Money(cents: 50000)))
            Issue.record("expected account_restricted")
        } catch let error as APIError {
            #expect(error.code == .account_restricted)
        }
    }
}

@Suite struct HTTPDateFormatTests {
    @Test func writesTheIMFFixdate() {
        #expect(HTTPDate.format(Date(timeIntervalSince1970: 1_794_344_400)) == "Tue, 10 Nov 2026 21:00:00 GMT")
        #expect(HTTPDate.format(Date(timeIntervalSince1970: 0)) == "Thu, 01 Jan 1970 00:00:00 GMT")
        #expect(HTTPDate.format(Date(timeIntervalSince1970: 951_782_400)) == "Tue, 29 Feb 2000 00:00:00 GMT")
    }

    @Test func roundTrips() {
        let date = Date(timeIntervalSince1970: 1_800_000_123)
        #expect(HTTPDate.parse(HTTPDate.format(date)) == date)
    }
}
