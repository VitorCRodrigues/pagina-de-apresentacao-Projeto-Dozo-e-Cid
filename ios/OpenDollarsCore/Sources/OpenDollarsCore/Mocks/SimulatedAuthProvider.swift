import Foundation

/// The two clients of the mock data: Lucía (Argentina, the default) and Rafael (Brazil, not live).
public enum SimulatedIdentity: String, Sendable, Hashable, CaseIterable {
    case lucia, rafael

    /// The fixture's name, for the simulated provider's page (data, not copy).
    public var displayName: String {
        switch self {
        case .lucia: Fixtures.lucia.name
        case .rafael: Fixtures.rafael.name
        }
    }
}

/// Stands in for the OIDC provider until there is one (web: createMockAuthClient in api/auth.ts).
/// Like a real provider, it decides who signed in: `choose` plays its sign-in page (in the app, a
/// sheet, SimulatedSignInPage; in tests, a queue). The tokens carry the identity, so MockServer serves that
/// client's data and a refresh keeps it. TODO(fase 11): the real provider.
public struct SimulatedAuthProvider: AuthProvider {
    public enum Outcome: Sendable, Equatable {
        case identity(SimulatedIdentity)
        /// The client closed the provider's page.
        case cancelled
        /// The provider could not sign the client in.
        case failed
    }

    private let delay: Duration
    private let choose: @Sendable () async -> Outcome

    /// `delay`: the provider's round trip (the web mock waits 400 ms).
    public init(delay: Duration = .milliseconds(400), choose: @escaping @Sendable () async -> Outcome) {
        self.delay = delay
        self.choose = choose
    }

    public func signIn() async throws -> TokenPair {
        let outcome = await choose()
        if delay > .zero { try? await Task.sleep(for: delay) }
        switch outcome {
        case .identity(let identity): return Self.tokens(for: identity)
        case .cancelled: throw AuthError.cancelled
        case .failed: throw AuthError.failed
        }
    }

    /// Accepts only refresh tokens it issued, and rotates both tokens.
    public func refresh(refreshToken: String) async throws -> TokenPair {
        guard let identity = Self.identity(in: refreshToken, prefix: "sim-refresh-") else { throw AuthError.failed }
        return Self.tokens(for: identity)
    }

    public func revoke(refreshToken: String) async {}

    static func tokens(for identity: SimulatedIdentity) -> TokenPair {
        let nonce = UUID().uuidString.lowercased()
        return TokenPair(accessToken: "sim-\(identity.rawValue)-\(nonce)", refreshToken: "sim-refresh-\(identity.rawValue)-\(nonce)")
    }

    /// Whose access token this is; nil for any token the simulated provider did not issue.
    public static func identity(ofAccessToken token: String) -> SimulatedIdentity? {
        identity(in: token, prefix: "sim-")
    }

    private static func identity(in token: String, prefix: String) -> SimulatedIdentity? {
        guard token.hasPrefix(prefix) else { return nil }
        let name = token.dropFirst(prefix.count).prefix { $0 != "-" }
        return SimulatedIdentity(rawValue: String(name))
    }
}
