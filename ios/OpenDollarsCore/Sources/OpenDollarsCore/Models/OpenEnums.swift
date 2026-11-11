// TODO(decisão) 1 (ios/docs/decisions.md): DepositState, AccountStatus, BlockReason and Rail
// decode an unknown value to .unknown(String) instead of failing, because older versions of the
// app stay in use for weeks after the backend adds a value. The UI shows a generic state or label
// for .unknown, and an unknown rail is never offered for a new deposit. Money stays strict.
//
// Case names are the contract's names exactly (PRD section 8), so one grep finds them in web/ and ios/.

/// An enum from the API that keeps values it does not know. Codable through the standard
/// library's RawRepresentable support: decoding never fails on a string, encoding writes the
/// original string back.
public protocol OpenEnum: RawRepresentable, Codable, Hashable, Sendable where RawValue == String {
    /// Every value this version of the app knows, in the contract's order.
    static var knownCases: [Self] { get }
    init(rawValue: String)
}

extension OpenEnum {
    public var isUnknown: Bool { !Self.knownCases.contains(self) }

    static func known(_ rawValue: String) -> Self? {
        knownCases.first { $0.rawValue == rawValue }
    }
}

// MARK: - Rail

public enum Rail: OpenEnum {
    case ar_usdc, ar_swift, br_efx, br_fxbank
    case unknown(String)

    public static let knownCases: [Rail] = [.ar_usdc, .ar_swift, .br_efx, .br_fxbank]

    public init(rawValue: String) { self = Self.known(rawValue) ?? .unknown(rawValue) }

    public var rawValue: String {
        switch self {
        case .ar_usdc: "ar_usdc"
        case .ar_swift: "ar_swift"
        case .br_efx: "br_efx"
        case .br_fxbank: "br_fxbank"
        case .unknown(let raw): raw
        }
    }
}

// MARK: - DepositState

/// The steps of a deposit, in the order of funding.ts advance() (PRD section 6).
public enum DepositState: OpenEnum {
    case kyc_passed, ibkr_open, deposit_notified, partner_collected, fx_executed, wire_sent
    case broker_credited, invested, returned
    case unknown(String)

    public static let knownCases: [DepositState] = [
        .kyc_passed, .ibkr_open, .deposit_notified, .partner_collected, .fx_executed, .wire_sent,
        .broker_credited, .invested, .returned,
    ]

    public init(rawValue: String) { self = Self.known(rawValue) ?? .unknown(rawValue) }

    public var rawValue: String {
        switch self {
        case .kyc_passed: "kyc_passed"
        case .ibkr_open: "ibkr_open"
        case .deposit_notified: "deposit_notified"
        case .partner_collected: "partner_collected"
        case .fx_executed: "fx_executed"
        case .wire_sent: "wire_sent"
        case .broker_credited: "broker_credited"
        case .invested: "invested"
        case .returned: "returned"
        case .unknown(let raw): raw
        }
    }

    /// For ar_usdc the backend still walks through fx_executed and wire_sent, which make no sense
    /// for USDC: the app hides them and never depends on them (PRD section 6).
    public func isShown(on rail: Rail) -> Bool {
        switch (rail, self) {
        case (.ar_usdc, .fx_executed), (.ar_usdc, .wire_sent): false
        default: true
        }
    }

    /// The deposit's own steps on a rail. kyc_passed and ibkr_open are account steps, and
    /// returned can follow any step after deposit_notified, so none of them is listed here.
    public static func timeline(for rail: Rail) -> [DepositState] {
        [.deposit_notified, .partner_collected, .fx_executed, .wire_sent, .broker_credited, .invested]
            .filter { $0.isShown(on: rail) }
    }

    /// deposit_notified is the only state where the client has to do something (send the money).
    public var needsClientAction: Bool { self == .deposit_notified }
}

// MARK: - AccountStatus

public enum AccountStatus: OpenEnum {
    case draft, submitted, kyc_review, ibkr_pending, action_required, open, restricted, rejected
    case unknown(String)

    public static let knownCases: [AccountStatus] = [
        .draft, .submitted, .kyc_review, .ibkr_pending, .action_required, .open, .restricted, .rejected,
    ]

    public init(rawValue: String) { self = Self.known(rawValue) ?? .unknown(rawValue) }

    public var rawValue: String {
        switch self {
        case .draft: "draft"
        case .submitted: "submitted"
        case .kyc_review: "kyc_review"
        case .ibkr_pending: "ibkr_pending"
        case .action_required: "action_required"
        case .open: "open"
        case .restricted: "restricted"
        case .rejected: "rejected"
        case .unknown(let raw): raw
        }
    }
}

// MARK: - BlockReason

public enum BlockReason: OpenEnum {
    case ibkr_not_open, ibkr_restricted, compliance_hold, quote_expired, pix_med_hold, market_not_live
    case unknown(String)

    public static let knownCases: [BlockReason] = [
        .ibkr_not_open, .ibkr_restricted, .compliance_hold, .quote_expired, .pix_med_hold, .market_not_live,
    ]

    public init(rawValue: String) { self = Self.known(rawValue) ?? .unknown(rawValue) }

    public var rawValue: String {
        switch self {
        case .ibkr_not_open: "ibkr_not_open"
        case .ibkr_restricted: "ibkr_restricted"
        case .compliance_hold: "compliance_hold"
        case .quote_expired: "quote_expired"
        case .pix_med_hold: "pix_med_hold"
        case .market_not_live: "market_not_live"
        case .unknown(let raw): raw
        }
    }
}
