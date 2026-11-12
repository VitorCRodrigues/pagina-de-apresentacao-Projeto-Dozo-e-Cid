/// Why the client cannot start a deposit, and what the screen offers instead (web: accountBlock in
/// features/deposits/rules.ts). Decision 14: a restricted account keeps the navigation; Início and
/// Aportar say why deposits stop. The backend enforces every block; this only guides the client.
/// TODO(decisão) 21: the order and the fallbacks for restricted and unknown reasons.
public struct AccountBlock: Sendable, Equatable {
    public enum Action: Sendable, Equatable {
        /// Wait for the opening to finish (see pending items).
        case followUp
        /// Only support can help.
        case support
        /// The country is not live yet.
        case waitlist
    }

    public let reason: BlockReason
    public let action: Action

    public init(reason: BlockReason, action: Action) {
        self.reason = reason
        self.action = action
    }

    /// Account-level reasons, most serious first. quote_expired belongs to a quote and
    /// pix_med_hold to a deposit; neither blocks the whole account.
    static let accountReasons: [(BlockReason, Action)] = [
        (.ibkr_restricted, .support),
        (.compliance_hold, .support),
        (.ibkr_not_open, .followUp),
        (.market_not_live, .waitlist),
    ]

    public static func of(_ account: Account) -> AccountBlock? {
        if let (reason, action) = accountReasons.first(where: { account.blockReasons.contains($0.0) }) {
            return AccountBlock(reason: reason, action: action)
        }
        // A reason this version does not know: for money, unknown means blocked (TODO(decisão) 1).
        if let unknown = account.blockReasons.first(where: { if case .unknown = $0 { true } else { false } }) {
            return AccountBlock(reason: unknown, action: .support)
        }
        // Restricted without a reason the app knows still stops deposits.
        if account.status == .restricted {
            return AccountBlock(reason: .ibkr_restricted, action: .support)
        }
        return nil
    }

    private var keyStem: String {
        if case .unknown = reason { return "blockReason.unknown" }
        return "blockReason.\(reason.rawValue)"
    }

    public var messageKey: String { "\(keyStem).message" }
    public var actionKey: String { "\(keyStem).action" }
}
