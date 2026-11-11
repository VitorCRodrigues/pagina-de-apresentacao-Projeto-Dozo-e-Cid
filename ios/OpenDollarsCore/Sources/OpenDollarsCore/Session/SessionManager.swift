import Foundation

/// The client's session. Holds the access token in memory only, keeps the refresh token in a
/// RefreshTokenStore (the Keychain on iOS), tracks inactivity, and clears everything on any exit.
/// APIClient reaches it through SessionTokens.
public actor SessionManager: SessionTokens {
    public typealias SignOutHandler = @Sendable (SignOutReason) async -> Void

    private let store: any RefreshTokenStore
    private let auth: any AuthProvider
    private let now: @Sendable () -> Date
    private let policy: SessionPolicy

    private var signedIn = false
    private var accessTokenValue: String?
    private var lastActivity: Date
    private var handlers: [SignOutHandler] = []
    private var refreshTask: Task<Bool, Never>?
    /// Bumped on every sign-out, so a refresh that finishes afterwards cannot revive the session.
    private var generation = 0

    public init(
        store: any RefreshTokenStore,
        auth: any AuthProvider,
        policy: SessionPolicy = .standard,
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.store = store
        self.auth = auth
        self.policy = policy
        self.now = now
        self.lastActivity = now()
    }

    public var isSignedIn: Bool { signedIn }

    /// Called on every sign-out, before anything else is awaited: clear caches, pending
    /// Idempotency-Keys and any screen state that holds personal data.
    public func addSignOutHandler(_ handler: @escaping SignOutHandler) {
        handlers.append(handler)
    }

    // MARK: Sign in and launch

    public func signIn(_ tokens: TokenPair) throws {
        let at = now()
        if let refreshToken = tokens.refreshToken {
            try store.save(StoredSession(refreshToken: refreshToken, lastActivity: at))
        }
        accessTokenValue = tokens.accessToken
        lastActivity = at
        signedIn = true
    }

    public func signInWithProvider() async throws {
        try signIn(try await auth.signIn())
    }

    /// At launch: a stored session comes back through a silent refresh, unless this is the first
    /// launch after install (Keychain items survive uninstalling) or the client was idle for the
    /// whole timeout while the app was closed.
    public func restore(isFirstLaunch: Bool) async -> Bool {
        if isFirstLaunch {
            try? store.delete()
            return false
        }
        guard let stored = (try? store.load()) ?? nil else { return false }
        guard now().timeIntervalSince(stored.lastActivity) < policy.inactivityTimeout else {
            try? store.delete()
            return false
        }
        lastActivity = now()
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
        lastActivity = now()
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
        let deadline = lastActivity.addingTimeInterval(policy.inactivityTimeout)
        let current = now()
        if current >= deadline {
            await signOut(.inactivity)
            return .signedOut
        }
        if current >= deadline.addingTimeInterval(-policy.warningBefore) {
            return .warning(deadline: deadline)
        }
        return .active(deadline: deadline)
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
