import Foundation
import Testing
@testable import OpenDollarsCore

// Phase 3: sign-in behind AuthProvider, the client's data in ClientSession, and everything an
// exit (button, 15 minutes idle, session expired) must leave behind: nothing. Ports of
// web/src/features/session/session-end.test.tsx and features/deposits/rules.ts (accountBlock).

// MARK: - Test doubles

/// The identity provider's answers, in order (the simulated provider asks who signs in).
actor OutcomeQueue {
    private var outcomes: [SimulatedAuthProvider.Outcome]
    init(_ outcomes: [SimulatedAuthProvider.Outcome]) { self.outcomes = outcomes }
    func next() -> SimulatedAuthProvider.Outcome { outcomes.isEmpty ? .failed : outcomes.removeFirst() }
}

/// The mock server, with the power to hold one route until `release()`: an answer that arrives
/// after the session ended.
actor GatedTransport: HTTPTransport {
    private let server: MockServer
    private var heldRoute: String?
    private var waiting: [CheckedContinuation<Void, Never>] = []
    private var revoked = false
    private(set) var requests: [HTTPRequest] = []

    init(_ server: MockServer) { self.server = server }

    func hold(_ route: String) { heldRoute = route }

    /// The server revoked the session: every authenticated request answers 401 session_expired.
    func revokeSession() { revoked = true }

    func release() {
        heldRoute = nil
        waiting.forEach { $0.resume() }
        waiting = []
    }

    var waitingCount: Int { waiting.count }

    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        requests.append(request)
        if let heldRoute, request.path.hasSuffix(heldRoute) {
            await withCheckedContinuation { waiting.append($0) }
        }
        if revoked, request.headers["Authorization"] != nil {
            return HTTPResponse(status: 401, body: Data(#"{"error":{"code":"session_expired","message":"Revoked"}}"#.utf8))
        }
        return try await server.send(request)
    }
}

@MainActor
final class Harness {
    let clock: TestClock
    let store: MemoryTokenStore
    let transport: GatedTransport
    let session: SessionManager
    let model: ClientSession
    private(set) var wipes = 0

    init(_ outcomes: [SimulatedAuthProvider.Outcome] = [.identity(.lucia)], scenario: Scenario = .open,
         stored: StoredSession? = nil, isFirstLaunch: Bool = false) {
        let clock = TestClock()
        self.clock = clock
        store = MemoryTokenStore(stored)
        transport = GatedTransport(MockServer(scenario: scenario, now: { clock.now }, sleep: { _ in }))
        let queue = OutcomeQueue(outcomes)
        let auth = SimulatedAuthProvider(delay: .zero) { await queue.next() }
        session = SessionManager(store: store, auth: auth, now: { clock.now }, uptime: { clock.uptime })
        let client = APIClient(transport: transport, tokens: session, locale: { .es }, now: { clock.now })
        model = ClientSession(session: session, client: client, isFirstLaunch: isFirstLaunch)
        model.addWipeHandler { [unowned self] in self.wipes += 1 }
    }

    /// Waits for the work a sign-out handler or a held request started.
    func settle() async {
        for _ in 0..<50 { await Task.yield() }
    }
}

// MARK: - Simulated identity provider

@Suite struct SimulatedAuthProviderTests {
    @Test func theTokensCarryWhoSignedIn() async throws {
        let auth = SimulatedAuthProvider(delay: .zero) { .identity(.rafael) }
        let tokens = try await auth.signIn()
        #expect(tokens.accessToken.hasPrefix("sim-rafael-"))
        #expect(tokens.refreshToken?.hasPrefix("sim-refresh-rafael-") == true)
    }

    @Test func aRefreshKeepsTheIdentityAndRotatesTheTokens() async throws {
        let auth = SimulatedAuthProvider(delay: .zero) { .identity(.lucia) }
        let first = try await auth.signIn()
        let refreshed = try await auth.refresh(refreshToken: try #require(first.refreshToken))
        #expect(refreshed.accessToken.hasPrefix("sim-lucia-"))
        #expect(refreshed.accessToken != first.accessToken)
        #expect(refreshed.refreshToken != first.refreshToken)
    }

    @Test func aRefreshTokenItDidNotIssueIsRefused() async {
        let auth = SimulatedAuthProvider(delay: .zero) { .identity(.lucia) }
        await #expect(throws: AuthError.failed) { try await auth.refresh(refreshToken: "something-else") }
    }

    @Test func theClientCanCancelOrTheProviderFail() async {
        await #expect(throws: AuthError.cancelled) { try await SimulatedAuthProvider(delay: .zero) { .cancelled }.signIn() }
        await #expect(throws: AuthError.failed) { try await SimulatedAuthProvider(delay: .zero) { .failed }.signIn() }
    }

    @Test func tokensNeverShowInDescriptionsOrMirrors() {
        let tokens = TokenPair(accessToken: "sim-lucia-secret", refreshToken: "sim-refresh-lucia-secret")
        let stored = StoredSession(refreshToken: "sim-refresh-lucia-secret", lastActivity: Date())
        for text in [String(describing: tokens), String(reflecting: tokens), String(describing: stored), String(reflecting: stored)] {
            #expect(!text.contains("secret"), "\(text)")
        }
        #expect(Mirror(reflecting: tokens).children.isEmpty)
    }
}

@Suite struct MockServerIdentityTests {
    private func me(bearer: String) async throws -> Me {
        let server = MockServer(sleep: { _ in })
        let response = try await server.send(HTTPRequest(
            method: .GET, path: OpenDollarsCore.apiBasePath + "/me", headers: ["Authorization": "Bearer \(bearer)"]))
        return try JSONCoding.makeDecoder().decode(Me.self, from: response.body)
    }

    @Test func servesTheClientTheTokenBelongsTo() async throws {
        #expect(try await me(bearer: "sim-lucia-1").name == "Lucía Fernández")
        #expect(try await me(bearer: "sim-rafael-1").name == "Rafael Souza")
    }

    @Test func anyOtherTokenIsTheDefaultClient() async throws {
        #expect(try await me(bearer: "mock-1").name == "Lucía Fernández")
    }
}

// MARK: - Clocks

@Suite struct SessionClockTests {
    private func signedIn(_ clock: TestClock, store: MemoryTokenStore = MemoryTokenStore()) throws -> SessionManager {
        SessionManager(store: store, auth: FakeAuth(), now: { clock.now }, uptime: { clock.uptime })
    }

    // Moving the date back in Settings must not stretch the session: idle time is monotonic.
    @Test func turningTheWallClockBackDoesNotExtendTheSession() async throws {
        let clock = TestClock()
        let session = try signedIn(clock)
        try await session.signIn(TokenPair(accessToken: "a", refreshToken: "r"))
        clock.advance(15 * 60)
        clock.moveWallClock(-60 * 60)
        #expect(await session.checkInactivity() == .signedOut)
    }

    @Test func turningTheWallClockForwardDoesNotEndAnActiveSession() async throws {
        let clock = TestClock()
        let session = try signedIn(clock)
        try await session.signIn(TokenPair(accessToken: "a", refreshToken: "r"))
        clock.advance(60)
        clock.moveWallClock(24 * 60 * 60)
        guard case .active = await session.checkInactivity() else {
            Issue.record("a session active a minute ago ended")
            return
        }
    }

    // Across launches only the wall clock exists; a last activity in the future means the date
    // was moved back after it, so the session does not come back.
    @Test func aStoredActivityInTheFutureIsNotRestored() async {
        let clock = TestClock()
        let store = MemoryTokenStore(StoredSession(refreshToken: "r", lastActivity: clock.now.addingTimeInterval(3600)))
        let session = SessionManager(store: store, auth: FakeAuth(), now: { clock.now }, uptime: { clock.uptime })
        #expect(await session.restore(isFirstLaunch: false) == false)
        #expect(store.current == nil)
    }

    @Test func theStoredActivityIsTheWallTimeOfTheLastInteraction() async throws {
        let clock = TestClock()
        let store = MemoryTokenStore()
        let session = SessionManager(store: store, auth: FakeAuth(), now: { clock.now }, uptime: { clock.uptime })
        try await session.signIn(TokenPair(accessToken: "a", refreshToken: "r"))
        let interaction = clock.now
        await session.recordActivity()
        clock.advance(120)
        await session.persistActivity()
        #expect(store.current?.lastActivity == interaction)
    }
}

// MARK: - Deposit blocks (decision 14)

@Suite struct AccountBlockTests {
    private func account(_ reasons: [BlockReason], status: AccountStatus = .open) -> Account {
        Account(status: status, ibkrAccountMasked: nil, pending: [], blockReasons: reasons)
    }

    @Test func noReasonNoBlock() {
        #expect(AccountBlock.of(account([])) == nil)
    }

    @Test func theMostSeriousReasonWins() {
        let block = AccountBlock.of(account([.market_not_live, .ibkr_not_open, .compliance_hold, .ibkr_restricted]))
        #expect(block == AccountBlock(reason: .ibkr_restricted, action: .support))
    }

    @Test(arguments: [
        (BlockReason.ibkr_restricted, AccountBlock.Action.support),
        (.compliance_hold, .support),
        (.ibkr_not_open, .followUp),
        (.market_not_live, .waitlist),
    ])
    func eachAccountReasonHasItsAction(reason: BlockReason, action: AccountBlock.Action) {
        #expect(AccountBlock.of(account([reason])) == AccountBlock(reason: reason, action: action))
    }

    // A quote or a deposit reason never blocks the whole account (web: rules.ts).
    @Test func quoteAndDepositReasonsDoNotBlockTheAccount() {
        #expect(AccountBlock.of(account([.quote_expired, .pix_med_hold])) == nil)
    }

    @Test func aRestrictedAccountWithoutAReasonStillBlocks() {
        #expect(AccountBlock.of(account([], status: .restricted)) == AccountBlock(reason: .ibkr_restricted, action: .support))
    }

    // CLAUDE.md: an unknown value shows a generic state. For money, unknown means blocked.
    @Test func anUnknownReasonBlocksWithSupport() {
        #expect(AccountBlock.of(account([.unknown("frozen")])) == AccountBlock(reason: .unknown("frozen"), action: .support))
    }

    @Test func everyBlockHasItsTextKeys() throws {
        let keys = try StringCatalogs.keys()
        for reason in BlockReason.knownCases + [.unknown("frozen")] {
            let block = AccountBlock(reason: reason, action: .support)
            #expect(keys.contains(block.messageKey), "\(block.messageKey)")
            #expect(keys.contains(block.actionKey), "\(block.actionKey)")
        }
    }
}

// MARK: - Files the session leaves

@Suite struct SessionFilesTests {
    private func sandbox() throws -> (tmp: URL, caches: URL) {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("od-tests-\(UUID().uuidString)")
        let tmp = root.appendingPathComponent("tmp"), caches = root.appendingPathComponent("Caches")
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: caches, withIntermediateDirectories: true)
        return (tmp, caches)
    }

    @Test func wipesOnlyWhatTheAppCreated() throws {
        let (tmp, caches) = try sandbox()
        let files = SessionFiles(temporaryDirectory: tmp, cachesDirectory: caches)
        let ours = try files.directory(.temporary).appendingPathComponent("document.jpg")
        let ourCache = try files.directory(.caches).appendingPathComponent("statement.pdf")
        let notOurs = caches.appendingPathComponent("com.apple.something")
        for url in [ours, ourCache, notOurs] { try Data("x".utf8).write(to: url) }

        files.wipe()

        #expect(!FileManager.default.fileExists(atPath: ours.path))
        #expect(!FileManager.default.fileExists(atPath: ourCache.path))
        #expect(FileManager.default.fileExists(atPath: notOurs.path))
    }

    @Test func wipingWhenNothingWasCreatedIsFine() throws {
        let (tmp, caches) = try sandbox()
        SessionFiles(temporaryDirectory: tmp, cachesDirectory: caches).wipe()
    }
}

// MARK: - ClientSession

@MainActor
@Suite struct ClientSessionSignInTests {
    // T1 now exists: nothing stored means the entry screen, never an automatic sign-in.
    @Test func withoutAStoredSessionTheClientSeesTheEntryScreen() async {
        let harness = Harness()
        await harness.model.start()
        #expect(harness.model.phase == .signedOut(nil))
        #expect(await harness.transport.requests.isEmpty)
    }

    @Test func aRecentStoredSessionComesBackWithoutTheEntryScreen() async {
        let clock = TestClock()
        let harness = Harness(stored: StoredSession(refreshToken: "sim-refresh-lucia-1", lastActivity: clock.now))
        await harness.model.start()
        guard case .ready(let me) = harness.model.phase else {
            Issue.record("not restored: \(harness.model.phase)")
            return
        }
        #expect(me.name == "Lucía Fernández")
    }

    @Test func signingInLoadsTheClientAndTheAccountsLanguage() async {
        let harness = Harness([.identity(.rafael)])
        await harness.model.start()
        await harness.model.signIn()
        guard case .ready(let me) = harness.model.phase else {
            Issue.record("not signed in: \(harness.model.phase)")
            return
        }
        #expect(me.name == "Rafael Souza")
        #expect(harness.model.accountLocale == .pt)
        #expect(harness.model.config != nil)
        #expect(harness.store.current != nil)
    }

    // The app sets the text language before the screens redraw: told on arrival and on exit.
    @Test func reportsTheAccountsLanguageAsItComesAndGoes() async {
        let harness = Harness([.identity(.rafael)])
        var seen: [AppLocale?] = []
        harness.model.onAccountLocaleChange = { seen.append($0) }
        await harness.model.start()
        await harness.model.signIn()
        await harness.model.signOut()
        await harness.settle()
        #expect(seen == [.pt, nil])
    }

    @Test func cancellingTheProviderIsNotAnError() async {
        let harness = Harness([.cancelled])
        await harness.model.start()
        await harness.model.signIn()
        #expect(harness.model.phase == .signedOut(nil))
        #expect(harness.model.signInFailed == false)
        #expect(harness.model.isSigningIn == false)
    }

    @Test func aFailedSignInSaysSo() async {
        let harness = Harness([.failed, .identity(.lucia)])
        await harness.model.start()
        await harness.model.signIn()
        #expect(harness.model.signInFailed)
        await harness.model.signIn()
        #expect(harness.model.signInFailed == false)
    }
}

@MainActor
@Suite struct ClientSessionExitTests {
    private func signedInWithData(_ harness: Harness) async {
        await harness.model.start()
        await harness.model.signIn()
        await harness.model.loadHome()
        _ = harness.model.depositKeys.key(for: CreateDepositRequest(quoteId: "q1", rail: .ar_usdc))
    }

    @Test(arguments: [SignOutReason.userRequested, .inactivity, .sessionExpired])
    func everyExitLeavesNothingBehind(reason: SignOutReason) async throws {
        let harness = Harness()
        await signedInWithData(harness)
        let generation = harness.model.generation
        let pendingKey = harness.model.depositKeys.key(for: CreateDepositRequest(quoteId: "q1", rail: .ar_usdc))
        guard case .loaded = harness.model.portfolio else {
            Issue.record("the home did not load")
            return
        }

        switch reason {
        case .userRequested: await harness.model.signOut()
        case .inactivity:
            harness.clock.advance(15 * 60)
            await harness.model.checkInactivity()
        case .sessionExpired: await harness.session.sessionDidExpire()
        }
        await harness.settle()

        #expect(harness.model.phase == .signedOut(reason))
        #expect(harness.store.current == nil)
        #expect(await harness.session.accessToken() == nil)
        #expect(harness.model.config == nil)
        #expect(harness.model.account == .idle)
        #expect(harness.model.portfolio == .idle)
        #expect(harness.model.accountLocale == nil)
        #expect(harness.model.inactivityDeadline == nil)
        #expect(harness.model.generation == generation + 1)
        #expect(harness.wipes == 1)
        // The same intent after the exit gets a new key: the old one was dropped.
        #expect(harness.model.depositKeys.key(for: CreateDepositRequest(quoteId: "q1", rail: .ar_usdc)) != pendingKey)
    }

    // web: session-end.test.tsx, "an answer arriving after the session ended writes nothing back".
    @Test func anAnswerArrivingAfterTheSessionEndedWritesNothingBack() async {
        let harness = Harness()
        await harness.model.start()
        await harness.model.signIn()
        await harness.transport.hold("/portfolio")

        let loading = Task { await harness.model.loadHome() }
        while await harness.transport.waitingCount == 0 { await Task.yield() }
        await harness.model.signOut()
        await harness.transport.release()
        await loading.value

        #expect(harness.model.portfolio == .idle)
        #expect(harness.model.account == .idle)
        #expect(harness.model.phase == .signedOut(.userRequested))
    }

    @Test func the401SessionExpiredFromAnyRequestSignsOut() async {
        let harness = Harness()
        await harness.model.start()
        await harness.model.signIn()
        // The server revoked the session and the provider refuses the silent refresh.
        await harness.transport.revokeSession()
        try? harness.store.save(StoredSession(refreshToken: "revoked", lastActivity: harness.clock.now))
        await harness.model.loadAccount()
        await harness.settle()
        #expect(harness.model.phase == .signedOut(.sessionExpired))
        #expect(harness.model.account == .idle)
    }
}

@MainActor
@Suite struct SecondClientOnTheSameDeviceTests {
    @Test func theSecondClientSeesNothingOfTheFirst() async throws {
        let harness = Harness([.identity(.lucia), .identity(.rafael)])
        await harness.model.start()

        // Lucía signs in, loads everything, starts a deposit and signs out.
        await harness.model.signIn()
        await harness.model.loadHome()
        await harness.model.loadAccount()
        let luciaKey = harness.model.depositKeys.key(for: CreateDepositRequest(quoteId: "q1", rail: .ar_usdc))
        guard case .loaded(let luciaAccount) = harness.model.account, case .loaded(let luciaPortfolio) = harness.model.portfolio else {
            Issue.record("Lucía's data did not load")
            return
        }
        let luciaRefresh = try #require(harness.store.current?.refreshToken)
        await harness.model.signOut()
        await harness.settle()

        // Rafael signs in on the same device.
        let requestsBefore = await harness.transport.requests.count
        await harness.model.signIn()
        await harness.model.loadAccount()
        await harness.model.loadHome()

        guard case .ready(let me) = harness.model.phase else {
            Issue.record("Rafael is not signed in: \(harness.model.phase)")
            return
        }
        #expect(me.name == "Rafael Souza")
        #expect(me.email != "lucia.fernandez@example.com")
        #expect(harness.model.accountLocale == .pt)
        if case .loaded(let account) = harness.model.account {
            #expect(account != luciaAccount)
            #expect(account.ibkrAccountMasked != luciaAccount.ibkrAccountMasked)
        } else {
            Issue.record("Rafael's account did not load")
        }
        if case .loaded(let portfolio) = harness.model.portfolio {
            #expect(portfolio.totalCents != luciaPortfolio.totalCents)
        }
        #expect(harness.store.current?.refreshToken != luciaRefresh)
        #expect(harness.store.current?.refreshToken.hasPrefix("sim-refresh-rafael-") == true)
        #expect(await harness.session.accessToken()?.hasPrefix("sim-rafael-") == true)
        #expect(harness.model.depositKeys.key(for: CreateDepositRequest(quoteId: "q1", rail: .ar_usdc)) != luciaKey)

        // Every request of Rafael's session carried Rafael's token, never Lucía's.
        let rafaelRequests = await harness.transport.requests.dropFirst(requestsBefore)
        #expect(!rafaelRequests.isEmpty)
        for request in rafaelRequests {
            if let authorization = request.headers["Authorization"] {
                #expect(authorization.hasPrefix("Bearer sim-rafael-"), "\(request.path)")
            }
        }
    }
}

// MARK: - Privacy cover and coming back

@MainActor
@Suite struct PrivacyCoverTests {
    @Test func coversTheScreenAsSoonAsTheAppIsNotActive() async {
        let harness = Harness()
        await harness.model.start()
        await harness.model.signIn()
        #expect(harness.model.isCovered == false)
        await harness.model.sceneChanged(.inactive)
        #expect(harness.model.isCovered)
        await harness.model.sceneChanged(.background)
        #expect(harness.model.isCovered)
    }

    @Test func uncoversOnlyAfterCheckingInactivity() async {
        let harness = Harness()
        await harness.model.start()
        await harness.model.signIn()
        await harness.model.sceneChanged(.background)
        await harness.model.sceneChanged(.active)
        #expect(harness.model.isCovered == false)
        guard case .ready = harness.model.phase else {
            Issue.record("a short trip to the background ended the session")
            return
        }
    }

    // Back after 15 minutes: the balance never shows again, the entry screen does.
    @Test func comingBackAfterFifteenMinutesSignsOutBeforeUncovering() async {
        let harness = Harness()
        await harness.model.start()
        await harness.model.signIn()
        await harness.model.loadHome()
        await harness.model.sceneChanged(.background)
        harness.clock.advance(16 * 60)
        await harness.model.sceneChanged(.active)
        await harness.settle()
        #expect(harness.model.phase == .signedOut(.inactivity))
        #expect(harness.model.portfolio == .idle)
        #expect(harness.model.isCovered == false)
    }

    @Test func goingToTheBackgroundStoresTheLastActivity() async throws {
        let harness = Harness()
        await harness.model.start()
        await harness.model.signIn()
        let signedInAt = try #require(harness.store.current?.lastActivity)
        harness.clock.advance(30)
        harness.model.recordActivity()
        await harness.settle()
        await harness.model.sceneChanged(.background)
        #expect(try #require(harness.store.current?.lastActivity) > signedInAt)
    }
}
