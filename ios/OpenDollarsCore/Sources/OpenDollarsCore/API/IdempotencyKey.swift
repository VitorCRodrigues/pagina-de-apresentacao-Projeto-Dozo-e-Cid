import Foundation

/// The Idempotency-Key header of POST /deposits and POST /plans (PRD section 8).
public struct IdempotencyKey: Sendable, Hashable, RawRepresentable {
    public let rawValue: String

    public init(rawValue: String) { self.rawValue = rawValue }

    /// A new random UUID, lower case like the web's crypto.randomUUID().
    public init() { self.rawValue = UUID().uuidString.lowercased() }
}

/// One key per intention, not per tap (PRD section 8). The key stays the same while the intent
/// (quote, rail, amount...) is the same, so a double tap or a retry after a timeout resends it
/// and the server answers the original result. It changes when the intent changes, and after
/// `reset()`, which the flow calls once the deposit or plan was created. The flow holds the
/// tracker in its state, so leaving the flow (or the session ending) drops pending keys.
public struct IdempotencyKeyTracker<Intent: Equatable & Sendable>: Sendable {
    private var intent: Intent?
    private var current = IdempotencyKey()

    public init() {}

    public mutating func key(for intent: Intent) -> IdempotencyKey {
        if let previous = self.intent, previous != intent {
            current = IdempotencyKey()
        }
        self.intent = intent
        return current
    }

    public mutating func reset() {
        intent = nil
        current = IdempotencyKey()
    }
}
