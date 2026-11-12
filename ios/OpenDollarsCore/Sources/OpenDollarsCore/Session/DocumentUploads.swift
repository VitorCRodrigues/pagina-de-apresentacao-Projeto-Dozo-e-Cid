import Foundation
import Observation

/// The documents being sent on the account status screen (T3), one state per pending item. The
/// chosen files live here, in memory, and nowhere else; the session drops this object, files
/// included, on every exit, and an answer that arrives after the exit writes nothing.
@MainActor
@Observable
public final class DocumentUploads {
    public enum State: Sendable, Equatable {
        /// Picked and checked, waiting for "Enviar documento".
        case chosen(PreparedDocument)
        /// Being sent; progress from 0 to 1.
        case sending(PreparedDocument, progress: Double)
        /// The send failed (a dropped connection, a timeout, the server): the file stays for
        /// "Reintentar", which resends it with the same Idempotency-Key.
        case failed(PreparedDocument, APIError)
        /// The file was refused before sending (type, size, empty).
        case rejected(DocumentProblem)
    }

    private var states: [String: State] = [:]

    public var isEmpty: Bool { states.isEmpty }

    public func state(of pendingItemId: String) -> State? { states[pendingItemId] }

    @ObservationIgnored private let client: APIClient
    @ObservationIgnored private let isCurrent: @MainActor () -> Bool
    @ObservationIgnored private let onSent: @MainActor (Account) async -> Void

    init(client: APIClient, isCurrent: @escaping @MainActor () -> Bool, onSent: @escaping @MainActor (Account) async -> Void) {
        self.client = client
        self.isCurrent = isCurrent
        self.onSent = onSent
    }

    /// A file from the scanner, the Photos library or Files. The app has already shrunk photos
    /// (DocumentImagePolicy); here metadata is removed and the limits checked. Ignored while that
    /// item is being sent.
    public func choose(_ data: Data, displayName: String, for pendingItemId: String) {
        if case .sending? = states[pendingItemId] { return }
        switch PreparedDocument.prepare(data, displayName: displayName) {
        case .success(let document): states[pendingItemId] = .chosen(document)
        case .failure(let problem): states[pendingItemId] = .rejected(problem)
        }
    }

    /// "Enviar documento", and "Reintentar" after a failure. A second tap while sending does
    /// nothing.
    public func send(_ pendingItemId: String) async {
        let document: PreparedDocument
        switch states[pendingItemId] {
        case .chosen(let chosen)?, .failed(let chosen, _)?: document = chosen
        default: return
        }
        states[pendingItemId] = .sending(document, progress: 0)
        do {
            let account = try await client.uploadDocument(pendingItemId: pendingItemId, document: document) { [weak self] fraction in
                Task { @MainActor in self?.progressed(pendingItemId, document.id, fraction) }
            }
            guard isCurrent() else { return }
            states[pendingItemId] = nil
            await onSent(account)
        } catch is CancellationError {
            guard isCurrent() else { return }
            states[pendingItemId] = .chosen(document)
        } catch {
            guard isCurrent() else { return }
            states[pendingItemId] = .failed(document, error as? APIError ?? APIError(status: 0, code: .network))
        }
    }

    /// Progress only moves forward, and only for the send still under way.
    private func progressed(_ pendingItemId: String, _ documentId: UUID, _ fraction: Double) {
        guard case .sending(let document, let current)? = states[pendingItemId], document.id == documentId, fraction > current else { return }
        states[pendingItemId] = .sending(document, progress: min(fraction, 1))
    }

    /// Another file, or the row went away.
    public func discard(_ pendingItemId: String) {
        if case .sending? = states[pendingItemId] { return }
        states[pendingItemId] = nil
    }

    /// Every exit: the chosen files go with the session.
    func clear() { states = [:] }
}
