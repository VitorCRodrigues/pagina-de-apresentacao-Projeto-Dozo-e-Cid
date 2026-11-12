// Mocks exist only in DEBUG builds (TODO(fase 11)): a Release build has no simulated provider
// or in-memory API, and the app refuses to build without the real ones (AppModel.live).
#if DEBUG

import Foundation

/// Approves after `delay`, as the PRD asks of the mock (2 seconds), unless the calling task is
/// cancelled first (the client left the step). TODO(fase 11): the vendor's SDK.
public struct SimulatedIdentityVerifier: IdentityVerifier {
    private let delay: Duration

    public init(delay: Duration = .seconds(2)) {
        self.delay = delay
    }

    public func verify(locale: AppLocale) async -> IdentityResult {
        do {
            try await Task.sleep(for: delay)
        } catch {
            return .cancelled
        }
        if Task.isCancelled { return .cancelled }
        return .approved(reference: "sim-idv-\(UUID().uuidString.lowercased().prefix(8))")
    }
}

#endif
