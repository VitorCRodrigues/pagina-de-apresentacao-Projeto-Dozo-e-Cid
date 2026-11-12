import Foundation

// TODO(decisão) 3 (ios/docs/decisions.md): access token only in memory; refresh token only in
// the Keychain with ThisDeviceOnly; every exit (button, 15 min of inactivity, session expired)
// clears everything.
// TODO(fase 11): the real OIDC provider (PRD section 12) behind AuthProvider, with
// ASWebAuthenticationSession and PKCE. Until then the app signs in with SimulatedAuthProvider.

/// Tokens from the identity provider. Never logged: description and reflection hide them.
public struct TokenPair: Sendable, Equatable, CustomStringConvertible, CustomReflectable {
    public var accessToken: String
    /// nil when the provider did not rotate it (refresh) or gave none (sign-in).
    public var refreshToken: String?

    public init(accessToken: String, refreshToken: String?) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
    }

    public var description: String { "TokenPair(<redacted>)" }
    public var customMirror: Mirror { Mirror(self, children: [:]) }
}

/// What survives a relaunch, in the Keychain: the refresh token and when the client was last
/// active, so a session idle for 15 minutes is not restored after the app was closed.
public struct StoredSession: Sendable, Equatable, Codable, CustomStringConvertible, CustomReflectable {
    public var refreshToken: String
    public var lastActivity: Date

    public init(refreshToken: String, lastActivity: Date) {
        self.refreshToken = refreshToken
        self.lastActivity = lastActivity
    }

    public var description: String { "StoredSession(<redacted>)" }
    public var customMirror: Mirror { Mirror(self, children: [:]) }
}

/// Where the refresh token lives between launches. On iOS: KeychainRefreshTokenStore.
public protocol RefreshTokenStore: Sendable {
    func load() throws -> StoredSession?
    func save(_ session: StoredSession) throws
    func delete() throws
}

/// Why a sign-in did not happen. The entry screen says nothing on `cancelled` (the client closed
/// the provider's page) and shows its error note on `failed`.
public enum AuthError: Error, Sendable, Equatable {
    case cancelled
    case failed
}

/// The identity provider (OIDC). The app only knows sign-in, refresh and revoke.
public protocol AuthProvider: Sendable {
    /// Throws AuthError.cancelled when the client closes the provider's page.
    func signIn() async throws -> TokenPair
    func refresh(refreshToken: String) async throws -> TokenPair
    /// Best effort (api-gaps.md, item 1: POST /auth/logout); failures are ignored.
    func revoke(refreshToken: String) async
}

public enum SignOutReason: String, Sendable, Hashable {
    /// The client tapped "Cerrar sesión".
    case userRequested
    /// 15 minutes without interaction.
    case inactivity
    /// The API answered 401 session_expired and a silent refresh did not help.
    case sessionExpired

    /// An exit the client did not choose: the "your session ended" screen explains it.
    public var needsExplanation: Bool { self != .userRequested }
}

public enum InactivityStatus: Sendable, Equatable {
    case signedOut
    case active(deadline: Date)
    /// Inside the last minute: the app shows the "your session is about to end" warning.
    case warning(deadline: Date)
}

/// PRD section 9 (security): the session ends after 15 minutes without interaction, with a
/// warning before. Same values as the web (useIdleTimeout.ts). After it the client signs in again;
/// TODO(decisão) 22: Face ID unlock while the refresh token is valid, a possible later change.
public struct SessionPolicy: Sendable, Equatable {
    public var inactivityTimeout: TimeInterval
    public var warningBefore: TimeInterval
    /// How far the wall clock may have stepped back between launches (network time sync) and a
    /// stored last activity "in the future" still counts as recent (TODO(decisão) 18).
    public var clockStepBackTolerance: TimeInterval

    public static let standard = SessionPolicy(inactivityTimeout: 15 * 60, warningBefore: 60)

    public init(inactivityTimeout: TimeInterval, warningBefore: TimeInterval, clockStepBackTolerance: TimeInterval = 2 * 60) {
        self.inactivityTimeout = inactivityTimeout
        self.warningBefore = warningBefore
        self.clockStepBackTolerance = clockStepBackTolerance
    }
}
