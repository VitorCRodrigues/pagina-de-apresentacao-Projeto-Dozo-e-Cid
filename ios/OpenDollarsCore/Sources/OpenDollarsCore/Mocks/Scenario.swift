/// A mock data set, picked with the launch argument `-scenario <id>` (the web's `?scenario=<id>`).
/// One per AccountStatus, DepositState and BlockReason, plus network conditions. The ids, and
/// their order, are the web's (web/src/mocks/scenarios.ts), so a bug report names the same scenario
/// on both apps.
public enum Scenario: String, Sendable, Hashable, CaseIterable {
    // AccountStatus
    case draft, submitted, kyc_review, ibkr_pending, action_required, open, restricted, rejected
    // DepositState
    case kyc_passed, ibkr_open, deposit_notified, partner_collected, fx_executed, wire_sent
    case broker_credited, invested, returned
    // BlockReason
    case ibkr_not_open, ibkr_restricted, compliance_hold, quote_expired, pix_med_hold, market_not_live
    // Network and data conditions
    case slow, server_error, empty, in_flight_only, plan_paused, plan_reminder, terms_update, maintenance

    public static let `default`: Scenario = .open

    public enum Group: String, Sendable, CaseIterable {
        case account, deposit, block, network
    }

    public var group: Group {
        if AccountStatus.known(rawValue) != nil { return .account }
        if DepositState.known(rawValue) != nil { return .deposit }
        if BlockReason.known(rawValue) != nil { return .block }
        return .network
    }

    public static func cases(in group: Group) -> [Scenario] {
        allCases.filter { $0.group == group }
    }

    /// `-scenario <id>` from the process arguments; nil when absent or unknown.
    public init?(arguments: [String]) {
        guard let flag = arguments.firstIndex(of: "-scenario"), arguments.indices.contains(flag + 1),
              let scenario = Scenario(rawValue: arguments[flag + 1])
        else { return nil }
        self = scenario
    }
}
