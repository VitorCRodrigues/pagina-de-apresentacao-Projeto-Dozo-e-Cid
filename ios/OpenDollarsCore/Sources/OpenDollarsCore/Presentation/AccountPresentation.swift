// Presentation rules with no UI framework in them, so they are tested on every platform. The app
// turns the keys into text through Localizable.xcstrings.

/// Where a signed-in client belongs (web: account-routing.ts).
public enum Landing: Sendable, Equatable {
    /// The tab bar (decision 13). Only for an account that opened; a restricted account keeps
    /// the navigation and deposits are blocked inside (decision 14).
    case tabs
    /// The account status screen (T3): before the account opens, or a status this version does not
    /// know (TODO(decisão) 1), so no deposit instruction can ever show before "open".
    case accountStatus

    public static func `for`(_ status: AccountStatus) -> Landing {
        switch status {
        case .open, .restricted: .tabs
        default: .accountStatus
        }
    }
}

/// The opening path on the account status screen (T3; web: account-timeline.ts).
public enum AccountTimeline {
    public enum StepID: String, Sendable, CaseIterable {
        case submitted, kyc_review, ibkr_pending, open
    }

    public enum StepStatus: String, Sendable {
        case done, current, upcoming
    }

    public struct Step: Sendable, Equatable, Identifiable {
        public let id: StepID
        public let status: StepStatus
        /// "Documents are missing" under the current step (action_required).
        public let needsDocuments: Bool
    }

    /// nil when the opening path does not apply: an unfinished draft, a rejected or restricted
    /// account, or an unknown status (neutral text, no timeline).
    public static func steps(for status: AccountStatus) -> [Step]? {
        // action_required mirrors a request from Interactive Brokers, so it sits on their step as
        // the current one, not as an error.
        let position: StepID
        switch status {
        case .submitted: position = .submitted
        case .kyc_review: position = .kyc_review
        case .ibkr_pending, .action_required: position = .ibkr_pending
        case .open: position = .open
        default: return nil
        }
        let current = StepID.allCases.firstIndex(of: position)!
        return StepID.allCases.enumerated().map { index, id in
            let done = index < current || status == .open
            return Step(
                id: id,
                status: done ? .done : index == current ? .current : .upcoming,
                needsDocuments: status == .action_required && index == current)
        }
    }
}

/// Text keys for the account status screen (same keys as web/src/i18n/locales/*/account.json).
public enum AccountStatusCopy {
    public static func titleKey(_ status: AccountStatus) -> String {
        status.isUnknown ? "account.title.unknown" : "account.title.\(status.rawValue)"
    }

    public static func bodyKey(_ status: AccountStatus) -> String {
        switch status {
        case .submitted, .kyc_review, .ibkr_pending: "account.body.waiting"
        case .unknown: "account.body.unknown"
        default: "account.body.\(status.rawValue)"
        }
    }

    /// The client cannot move on alone: show the support action.
    public static func offersSupport(_ status: AccountStatus) -> Bool {
        switch status {
        case .rejected, .restricted, .unknown: true
        default: false
        }
    }
}

extension ClientErrorCode {
    /// The UI translates errors by code, never by message (decision 12).
    public var copyKey: String { "errors.\(rawValue)" }
}
