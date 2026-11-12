// Presentation rules with no UI framework in them, so they are tested on every platform. The app
// turns the keys into text through Localizable.xcstrings.

/// Where a signed-in client belongs (web: account-routing.ts).
public enum Landing: Sendable, Equatable {
    /// The tab bar (decision 13). Only for an account that opened; a restricted account keeps
    /// the navigation and deposits are blocked inside (decision 14).
    case tabs
    /// The onboarding (T2): the account is still a draft (TODO(decisão) 24, as the web).
    case onboarding
    /// The account status screen (T3): before the account opens, or a status this version does not
    /// know (TODO(decisão) 1), so no deposit instruction can ever show before "open".
    case accountStatus
    /// T1: the client's country is not in the pilot. Only the waitlist (web: RequireSession;
    /// TODO(decisão) 25).
    case notAvailable

    public static func `for`(_ status: AccountStatus) -> Landing {
        switch status {
        case .open, .restricted: .tabs
        case .draft: .onboarding
        default: .accountStatus
        }
    }

    /// The country comes first: outside config.liveMarkets there is only the waitlist, whatever
    /// the account's status (PRD T1).
    public static func `for`(_ me: Me, liveMarkets: [Country]) -> Landing {
        liveMarkets.contains(me.country) ? .for(me.accountStatus) : .notAvailable
    }
}

/// The opening path on the account status screen (T3; web: account-timeline.ts).
public enum AccountTimeline {
    public enum StepID: String, Sendable, CaseIterable {
        case submitted, kyc_review, ibkr_pending, open

        /// The step's label (account.json).
        public var copyKey: String { "account.timeline.\(rawValue)" }
    }

    public enum StepStatus: String, Sendable {
        case done, current, upcoming

        /// How VoiceOver reads the step's state (translation.json).
        public var copyKey: String { "timeline.status.\(rawValue)" }
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

/// What the account status screen (T3) shows for an account, for every status (web:
/// AccountStatusScreen.tsx). There is no deposit action on it at all: before "open" money never
/// moves (PRD section 5, failure B2), and at "open" the next step is the monthly plan.
public struct AccountStatusScreen: Sendable, Equatable {
    public enum Action: Sendable, Equatable {
        /// draft: back to the onboarding (T2).
        case continueOnboarding
        /// open: the monthly plan (T5).
        case createPlan
        /// rejected, restricted, or a status this version does not know.
        case contactSupport
    }

    public let titleKey: String
    public let bodyKey: String
    /// nil where the opening path does not apply.
    public let timeline: [AccountTimeline.Step]?
    /// The documents Interactive Brokers asks for: only kind "document", only in action_required.
    public let documents: [PendingItem]
    /// action_required with every document sent: "Recibimos todos los documentos."
    public let showsAllSent: Bool
    /// Only once the account is open.
    public let accountNumber: String?
    public let action: Action?

    public init(_ account: Account) {
        let status = account.status
        titleKey = AccountStatusCopy.titleKey(status)
        bodyKey = AccountStatusCopy.bodyKey(status)
        timeline = AccountTimeline.steps(for: status)
        let requested = status == .action_required ? account.pending.filter { $0.kind == .document } : []
        documents = requested
        showsAllSent = status == .action_required && requested.isEmpty
        accountNumber = status == .open ? account.ibkrAccountMasked : nil
        switch status {
        case .draft: action = .continueOnboarding
        case .open: action = .createPlan
        default: action = AccountStatusCopy.offersSupport(status) ? .contactSupport : nil
        }
    }
}

/// While the account waits on us or on Interactive Brokers, the status screen checks back every
/// minute, as the web does (useAccount poll: 60 s).
public enum AccountPolling {
    public static let interval: Duration = .seconds(60)

    public static func isWaiting(_ status: AccountStatus) -> Bool {
        switch status {
        case .submitted, .kyc_review, .ibkr_pending, .action_required: true
        default: false
        }
    }
}

extension ClientErrorCode {
    /// The UI translates errors by code, never by message (decision 12).
    public var copyKey: String { "errors.\(rawValue)" }
}
