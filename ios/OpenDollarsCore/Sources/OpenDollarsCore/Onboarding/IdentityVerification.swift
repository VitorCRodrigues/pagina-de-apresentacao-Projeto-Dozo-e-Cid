/// The result of the identity vendor's flow (document photo and liveness, PRD T2 step 6).
public enum IdentityResult: Sendable, Equatable {
    case approved(reference: String)
    /// The client closed the vendor's flow.
    case cancelled
    case failed
}

/// The seam for the identity vendor (web: identity-provider.ts). TODO(fase 11): Sumsub, Persona or
/// Onfido; its SDK goes behind this protocol, with the camera permission (decision 17), and
/// nothing else in the app talks to the vendor (TODO(decisão) 28). Cancelling the calling task cancels the flow.
public protocol IdentityVerifier: Sendable {
    func verify(locale: AppLocale) async -> IdentityResult
}
