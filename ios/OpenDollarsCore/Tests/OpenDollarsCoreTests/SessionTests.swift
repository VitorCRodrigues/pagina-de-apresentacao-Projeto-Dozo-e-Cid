import Foundation
import Testing
@testable import OpenDollarsCore

// MARK: - Test doubles

/// Two clocks, like the device: the wall clock (Date, which the client can change in Settings)
/// and the monotonic uptime (ContinuousClock, which only moves forward, sleep included).
final class TestClock: @unchecked Sendable {
    private let lock = NSLock()
    private var current: Date
    private var elapsed: Duration = .zero

    init(_ start: Date = Date(timeIntervalSince1970: 1_794_344_400)) { current = start }

    var now: Date { lock.withLock { current } }
    var uptime: Duration { lock.withLock { elapsed } }

    /// Time passes: both clocks move.
    func advance(_ seconds: TimeInterval) {
        lock.withLock {
            current = current.addingTimeInterval(seconds)
            elapsed += .milliseconds(Int64(seconds * 1000))
        }
    }

    /// The client changes the date in Settings: only the wall clock moves.
    func moveWallClock(_ seconds: TimeInterval) { lock.withLock { current = current.addingTimeInterval(seconds) } }
}

final class MemoryTokenStore: RefreshTokenStore, @unchecked Sendable {
    private let lock = NSLock()
    private var stored: StoredSession?
    var failOnDelete = false

    init(_ stored: StoredSession? = nil) { self.stored = stored }

    var current: StoredSession? { lock.withLock { stored } }

    func load() throws -> StoredSession? { lock.withLock { stored } }
    func save(_ session: StoredSession) throws { lock.withLock { stored = session } }
    func delete() throws {
        try lock.withLock {
            stored = nil
            if failOnDelete { throw StoreFailure() }
        }
    }

    struct StoreFailure: Error {}
}

actor FakeAuth: AuthProvider {
    var nextRefresh: Result<TokenPair, AuthFailure> = .success(TokenPair(accessToken: "a2", refreshToken: "r2"))
    private(set) var refreshCalls: [String] = []
    private(set) var revoked: [String] = []
    private var gate: CheckedContinuation<Void, Never>?
    private var holdRefresh = false

    func setNextRefresh(_ result: Result<TokenPair, AuthFailure>) { nextRefresh = result }

    /// Refreshes wait until `release()`, to test concurrent and interrupted refreshes.
    func hold() { holdRefresh = true }
    func release() {
        holdRefresh = false
        gate?.resume()
        gate = nil
    }

    func signIn() async throws -> TokenPair { TokenPair(accessToken: "a1", refreshToken: "r1") }

    func refresh(refreshToken: String) async throws -> TokenPair {
        refreshCalls.append(refreshToken)
        if holdRefresh { await withCheckedContinuation { gate = $0 } }
        return try nextRefresh.get()
    }

    func revoke(refreshToken: String) async { revoked.append(refreshToken) }
}

struct AuthFailure: Error, Equatable {}

actor ReasonLog {
    private(set) var reasons: [SignOutReason] = []
    func add(_ reason: SignOutReason) { reasons.append(reason) }
}

private func makeSession(
    store: MemoryTokenStore = MemoryTokenStore(), auth: FakeAuth = FakeAuth(), clock: TestClock = TestClock()
) -> SessionManager {
    SessionManager(store: store, auth: auth, now: { clock.now }, uptime: { clock.uptime })
}

// MARK: - Sign in and where tokens live

@Suite struct SessionStorageTests {
    @Test func keepsTheAccessTokenInMemoryAndOnlyTheRefreshTokenInTheStore() async throws {
        let store = MemoryTokenStore()
        let clock = TestClock()
        let session = makeSession(store: store, clock: clock)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))

        #expect(await session.accessToken() == "a1")
        #expect(await session.isSignedIn)
        #expect(store.current == StoredSession(refreshToken: "r1", lastActivity: clock.now))
    }

    @Test func persistsTheLastActivityForTheNextLaunch() async throws {
        let store = MemoryTokenStore()
        let clock = TestClock()
        let session = makeSession(store: store, clock: clock)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        clock.advance(120)
        await session.recordActivity()
        await session.persistActivity()
        #expect(store.current?.lastActivity == clock.now)
    }

    @Test func policyMatchesTheWeb() {
        #expect(SessionPolicy.standard.inactivityTimeout == 15 * 60)
        #expect(SessionPolicy.standard.warningBefore == 60)
    }
}

// MARK: - Every exit clears everything

@Suite struct SessionSignOutTests {
    @Test(arguments: [SignOutReason.userRequested, .inactivity, .sessionExpired])
    func clearsTokensStoreAndRegisteredDataOnEveryExit(reason: SignOutReason) async throws {
        let store = MemoryTokenStore()
        let session = makeSession(store: store)
        let log = ReasonLog()
        await session.addSignOutHandler { await log.add($0) }
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))

        await session.signOut(reason)

        #expect(await session.accessToken() == nil)
        #expect(await !session.isSignedIn)
        #expect(store.current == nil)
        #expect(await log.reasons == [reason])
    }

    @Test func clearsMemoryEvenWhenTheStoreFailsToDelete() async throws {
        let store = MemoryTokenStore()
        store.failOnDelete = true
        let session = makeSession(store: store)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        await session.signOut(.userRequested)
        #expect(await session.accessToken() == nil)
        #expect(await !session.isSignedIn)
    }

    @Test func revokesTheRefreshTokenWhenTheClientSignsOut() async throws {
        let auth = FakeAuth()
        let session = makeSession(auth: auth)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        await session.signOut(.userRequested)
        #expect(await auth.revoked == ["r1"])
    }

    @Test func doesNotRevokeATokenTheServerAlreadyRejected() async throws {
        let auth = FakeAuth()
        let session = makeSession(auth: auth)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        await session.sessionDidExpire()
        #expect(await auth.revoked.isEmpty)
    }

    @Test func theAPIsSessionExpiredSignsOutWithThatReason() async throws {
        let session = makeSession()
        let log = ReasonLog()
        await session.addSignOutHandler { await log.add($0) }
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        await session.sessionDidExpire()
        #expect(await log.reasons == [.sessionExpired])
    }

    @Test func signingOutTwiceNotifiesOnce() async throws {
        let session = makeSession()
        let log = ReasonLog()
        await session.addSignOutHandler { await log.add($0) }
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        await session.signOut(.userRequested)
        await session.sessionDidExpire()
        #expect(await log.reasons == [.userRequested])
    }
}

// MARK: - Silent refresh

@Suite struct SessionRefreshTests {
    @Test func refreshesWithTheStoredTokenAndKeepsTheRotatedOne() async throws {
        let store = MemoryTokenStore()
        let auth = FakeAuth()
        let session = makeSession(store: store, auth: auth)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))

        #expect(await session.refreshAccessToken())
        #expect(await auth.refreshCalls == ["r1"])
        #expect(await session.accessToken() == "a2")
        #expect(store.current?.refreshToken == "r2")
    }

    @Test func aFailedRefreshAnswersFalseAndLeavesTheDecisionToTheCaller() async throws {
        let auth = FakeAuth()
        await auth.setNextRefresh(.failure(AuthFailure()))
        let session = makeSession(auth: auth)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        #expect(await !session.refreshAccessToken())
    }

    @Test func doesNotRefreshWhenSignedOut() async {
        let auth = FakeAuth()
        let session = makeSession(auth: auth)
        #expect(await !session.refreshAccessToken())
        #expect(await auth.refreshCalls.isEmpty)
    }

    @Test func concurrentRefreshesShareOneCall() async throws {
        let auth = FakeAuth()
        let session = makeSession(auth: auth)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        await auth.hold()

        async let first = session.refreshAccessToken()
        async let second = session.refreshAccessToken()
        while await auth.refreshCalls.isEmpty { await Task.yield() }
        await auth.release()

        #expect(await first)
        #expect(await second)
        #expect(await auth.refreshCalls == ["r1"])
    }

    @Test func aRefreshThatEndsAfterSignOutDoesNotRestoreTheSession() async throws {
        let store = MemoryTokenStore()
        let auth = FakeAuth()
        let session = makeSession(store: store, auth: auth)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        await auth.hold()

        async let refreshed = session.refreshAccessToken()
        while await auth.refreshCalls.isEmpty { await Task.yield() }
        await session.signOut(.userRequested)
        await auth.release()

        #expect(await !refreshed)
        #expect(await session.accessToken() == nil)
        #expect(store.current == nil)
    }
}

// MARK: - 15 minutes of inactivity, warned 60 s before

@Suite struct SessionInactivityTests {
    @Test func warnsOneMinuteBeforeAndSignsOutAtFifteenMinutes() async throws {
        let clock = TestClock()
        let store = MemoryTokenStore()
        let session = makeSession(store: store, clock: clock)
        let log = ReasonLog()
        await session.addSignOutHandler { await log.add($0) }
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        let deadline = clock.now.addingTimeInterval(15 * 60)

        clock.advance(14 * 60 - 1)
        #expect(await session.checkInactivity() == .active(deadline: deadline))
        clock.advance(1)
        #expect(await session.checkInactivity() == .warning(deadline: deadline))
        clock.advance(60)
        #expect(await session.checkInactivity() == .signedOut)
        #expect(await log.reasons == [.inactivity])
        #expect(store.current == nil)
    }

    @Test func activityPushesTheDeadline() async throws {
        let clock = TestClock()
        let session = makeSession(clock: clock)
        try await session.signIn(TokenPair(accessToken: "a1", refreshToken: "r1"))
        clock.advance(14 * 60)
        await session.recordActivity()
        clock.advance(10 * 60)
        #expect(await session.checkInactivity() == .active(deadline: clock.now.addingTimeInterval(5 * 60)))
    }

    @Test func signedOutStaysSignedOut() async {
        #expect(await makeSession().checkInactivity() == .signedOut)
    }
}

// MARK: - App launch

@Suite struct SessionRestoreTests {
    @Test func restoresARecentSessionWithASilentRefresh() async {
        let clock = TestClock()
        let store = MemoryTokenStore(StoredSession(refreshToken: "r1", lastActivity: clock.now.addingTimeInterval(-10 * 60)))
        let session = makeSession(store: store, clock: clock)
        #expect(await session.restore(isFirstLaunch: false))
        #expect(await session.accessToken() == "a2")
        #expect(await session.checkInactivity() == .active(deadline: clock.now.addingTimeInterval(15 * 60)))
    }

    @Test func dropsASessionIdleForFifteenMinutesOrMore() async {
        let clock = TestClock()
        let store = MemoryTokenStore(StoredSession(refreshToken: "r1", lastActivity: clock.now.addingTimeInterval(-15 * 60)))
        let auth = FakeAuth()
        let session = makeSession(store: store, auth: auth, clock: clock)
        #expect(await !session.restore(isFirstLaunch: false))
        #expect(store.current == nil)
        #expect(await auth.refreshCalls.isEmpty)
    }

    // Keychain items survive uninstalling the app; a fresh install must not inherit them.
    @Test func wipesTheStoreOnTheFirstLaunchAfterInstall() async {
        let clock = TestClock()
        let store = MemoryTokenStore(StoredSession(refreshToken: "r1", lastActivity: clock.now))
        let session = makeSession(store: store, clock: clock)
        #expect(await !session.restore(isFirstLaunch: true))
        #expect(store.current == nil)
    }

    @Test func aRefreshRejectedAtLaunchClearsTheStore() async {
        let clock = TestClock()
        let store = MemoryTokenStore(StoredSession(refreshToken: "r1", lastActivity: clock.now))
        let auth = FakeAuth()
        await auth.setNextRefresh(.failure(AuthFailure()))
        let session = makeSession(store: store, auth: auth, clock: clock)
        #expect(await !session.restore(isFirstLaunch: false))
        #expect(store.current == nil)
    }

    @Test func nothingStoredMeansSignedOut() async {
        #expect(await !makeSession().restore(isFirstLaunch: false))
    }
}
