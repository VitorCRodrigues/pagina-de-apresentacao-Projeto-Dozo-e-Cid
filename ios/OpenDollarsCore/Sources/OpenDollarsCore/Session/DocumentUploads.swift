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
    /// item is being sent, and after the session that made this object ended (a photo still being
    /// shrunk when the client signed out must not reach the next client).
    public func choose(_ data: Data, displayName: String, for pendingItemId: String) {
        guard isCurrent() else { return }
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
        // Progress arrives on URLSession's queue; a stream keeps it in order on the main actor,
        // and waiting for it to drain before the result means no late fraction lands on a
        // retry's bar.
        let (fractions, reporter) = AsyncStream.makeStream(of: Double.self)
        let shown = Task {
            for await fraction in fractions { progressed(pendingItemId, document.id, fraction) }
        }
        do {
            let account = try await client.uploadDocument(pendingItemId: pendingItemId, document: document) { reporter.yield($0) }
            reporter.finish()
            await shown.value
            guard isCurrent() else { return }
            states[pendingItemId] = nil
            await onSent(account)
        } catch is CancellationError {
            reporter.finish()
            await shown.value
            guard isCurrent() else { return }
            states[pendingItemId] = .chosen(document)
        } catch {
            reporter.finish()
            await shown.value
            guard isCurrent() else { return }
            states[pendingItemId] = .failed(document, error as? APIError ?? APIError(status: 0, code: .network))
        }
    }

    /// Only for the send still under way, and only when the whole percent changes (a 10 MB
    /// upload reports every few kilobytes). It may go back: after a renewed token the APIClient
    /// sends the file again from the start, and the bar follows that upload.
    private func progressed(_ pendingItemId: String, _ documentId: UUID, _ fraction: Double) {
        guard case .sending(let document, let current)? = states[pendingItemId], document.id == documentId else { return }
        let fraction = min(max(fraction, 0), 1)
        guard (fraction * 100).rounded(.down) != (current * 100).rounded(.down) else { return }
        states[pendingItemId] = .sending(document, progress: fraction)
    }

    /// Another file, or the row went away.
    public func discard(_ pendingItemId: String) {
        if case .sending? = states[pendingItemId] { return }
        states[pendingItemId] = nil
    }

    /// Every exit: the chosen files go with the session.
    func clear() { states = [:] }
}
