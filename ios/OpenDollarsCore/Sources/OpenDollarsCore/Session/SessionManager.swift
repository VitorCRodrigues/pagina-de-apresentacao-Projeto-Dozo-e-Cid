import Foundation

/// The client's session. Holds the access token in memory only, keeps the refresh token in a
/// RefreshTokenStore (the Keychain on iOS), tracks inactivity, and clears everything on any exit.
/// APIClient reaches it through SessionTokens.
public actor SessionManager: SessionTokens {
    public typealias SignOutHandler = @Sendable (SignOutReason) async -> Void

    private let store: any RefreshTokenStore
    private let auth: any AuthProvider
    private let now: @Sendable () -> Date
    private let uptime: @Sendable () -> Duration
    private let policy: SessionPolicy

    private var signedIn = false
    private var accessTokenValue: String?
    /// When the client last interacted, on the wall clock: stored for the next launch.
    private var lastActivity: Date
    /// The same moment on the monotonic clock: idle time inside a run is measured here, so moving
    /// the date in Settings cannot stretch the session (TODO(decisão) 18).
    private var lastActivityUptime: Duration
    private var handlers: [SignOutHandler] = []
    private var refreshTask: Task<Bool, Never>?
    /// Bumped on every sign-out, so a refresh that finishes afterwards cannot revive the session.
    private var generation = 0

    /// Time since this process started, on a clock that never goes back and counts sleep.
    public static let processUptime: @Sendable () -> Duration = {
        let start = ContinuousClock.now
        return { ContinuousClock.now - start }
    }()

    public init(
        store: any RefreshTokenStore,
        auth: any AuthProvider,
        policy: SessionPolicy = .standard,
        now: @escaping @Sendable () -> Date = { Date() },
        uptime: @escaping @Sendable () -> Duration = SessionManager.processUptime
    ) {
        self.store = store
        self.auth = auth
        self.policy = policy
        self.now = now
        self.uptime = uptime
        self.lastActivity = now()
        self.lastActivityUptime = uptime()
    }

    private func markActivity() {
        lastActivity = now()
        lastActivityUptime = uptime()
    }

    public var isSignedIn: Bool { signedIn }

    /// Called on every sign-out, before anything else is awaited: clear caches, pending
    /// Idempotency-Keys and any screen state that holds personal data.
    public func addSignOutHandler(_ handler: @escaping SignOutHandler) {
        handlers.append(handler)
    }

    // MARK: Sign in and launch

    public func signIn(_ tokens: TokenPair) throws {
        markActivity()
        if let refreshToken = tokens.refreshToken {
            try store.save(StoredSession(refreshToken: refreshToken, lastActivity: lastActivity))
        }
        accessTokenValue = tokens.accessToken
        signedIn = true
    }

    public func signInWithProvider() async throws {
        try signIn(try await auth.signIn())
    }

    /// At launch: a stored session comes back through a silent refresh, unless this is the first
    /// launch after install (Keychain items survive uninstalling) or the client was idle for the
    /// whole timeout while the app was closed. Only the wall clock spans launches: a last activity
    /// further in the future than a network time sync could explain means the date was moved back
    /// since, so that session does not return either.
    public func restore(isFirstLaunch: Bool) async -> Bool {
        if isFirstLaunch {
            try? store.delete()
            return false
        }
        guard let stored = (try? store.load()) ?? nil else { return false }
        let idle = now().timeIntervalSince(stored.lastActivity)
        guard idle >= -policy.clockStepBackTolerance, idle < policy.inactivityTimeout else {
            try? store.delete()
            return false
        }
        markActivity()
        if await performRefresh(generation: generation) {
            signedIn = true
            return true
        }
        try? store.delete()
        return false
    }

    // MARK: Activity

    /// Any interaction of the client (the app forwards taps and scrolls).
    public func recordActivity() {
        guard signedIn else { return }
        markActivity()
    }

    /// The app calls this when it goes to the background, so a relaunch knows how long it was idle.
    public func persistActivity() {
        guard signedIn, let stored = (try? store.load()) ?? nil else { return }
        try? store.save(StoredSession(refreshToken: stored.refreshToken, lastActivity: lastActivity))
    }

    /// Checked by the app on a timer and when it comes back to the foreground. Past the deadline,
    /// signs out with `.inactivity`.
    public func checkInactivity() async -> InactivityStatus {
        guard signedIn else { return .signedOut }
        let idle = Self.seconds(uptime() - lastActivityUptime)
        if idle >= policy.inactivityTimeout {
            await signOut(.inactivity)
            return .signedOut
        }
        // For the warning's countdown, on the wall clock the screen shows.
        let deadline = now().addingTimeInterval(policy.inactivityTimeout - idle)
        if idle >= policy.inactivityTimeout - policy.warningBefore {
            return .warning(deadline: deadline)
        }
        return .active(deadline: deadline)
    }

    private static func seconds(_ duration: Duration) -> TimeInterval {
        let (seconds, attoseconds) = duration.components
        return TimeInterval(seconds) + TimeInterval(attoseconds) / 1e18
    }

    // MARK: Sign out

    /// Clears the access token, the stored refresh token and everything registered with
    /// addSignOutHandler. Memory is cleared even when the store fails.
    public func signOut(_ reason: SignOutReason) async {
        guard signedIn else {
            try? store.delete()
            return
        }
        generation += 1
        signedIn = false
        accessTokenValue = nil
        refreshTask = nil
        let stored = (try? store.load()) ?? nil
        try? store.delete()

        for handler in handlers { await handler(reason) }

        // The server already rejected the token on sessionExpired; otherwise revoke it.
        if reason != .sessionExpired, let refreshToken = stored?.refreshToken {
            await auth.revoke(refreshToken: refreshToken)
        }
    }

    // MARK: SessionTokens

    public func accessToken() async -> String? {
        signedIn ? accessTokenValue : nil
    }

    /// One refresh at a time: concurrent 401s share the same call.
    public func refreshAccessToken() async -> Bool {
        guard signedIn else { return false }
        if let refreshTask { return await refreshTask.value }

        let task = Task { await self.performRefresh(generation: self.generation) }
        refreshTask = task
        let result = await task.value
        if refreshTask == task { refreshTask = nil }
        return result
    }

    public func sessionDidExpire() async {
        await signOut(.sessionExpired)
    }

    private func performRefresh(generation expected: Int) async -> Bool {
        guard let stored = (try? store.load()) ?? nil else { return false }
        guard let tokens = try? await auth.refresh(refreshToken: stored.refreshToken) else { return false }
        guard generation == expected else { return false }
        do {
            try store.save(StoredSession(refreshToken: tokens.refreshToken ?? stored.refreshToken, lastActivity: lastActivity))
        } catch {
            return false
        }
        accessTokenValue = tokens.accessToken
        return true
    }
}
