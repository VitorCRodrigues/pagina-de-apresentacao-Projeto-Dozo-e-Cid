import Foundation

// Types proposed in web/docs/api-gaps.md, pending confirmation with Dozo. Same names as
// web/src/api/proposed-types.ts.

// MARK: - Errors (api-gaps.md, item 3)

public enum ApiErrorCode: String, Sendable, Hashable, Codable, CaseIterable {
    case validation_failed, quote_expired, below_minimum, account_not_open, account_restricted
    case compliance_hold, market_not_live, idempotency_conflict, not_found, session_expired
    case maintenance, rate_limited, `internal`
}

public struct ApiErrorBody: Sendable, Equatable, Codable {
    public struct Detail: Sendable, Equatable, Codable {
        /// Kept as a string: the client maps an unknown code to `internal`.
        public var code: String
        /// For logs only; the UI translates by `code`.
        public var message: String
        public var fields: [String: String]?
        /// 503 maintenance: when the service is expected back (api-gaps.md, item 4).
        public var until: Date?

        public init(code: String, message: String = "", fields: [String: String]? = nil, until: Date? = nil) {
            self.code = code
            self.message = message
            self.fields = fields
            self.until = until
        }

        private enum CodingKeys: String, CodingKey { case code, message, fields, until }

        public init(from decoder: any Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            code = try c.decode(String.self, forKey: .code)
            message = (try? c.decodeIfPresent(String.self, forKey: .message)) ?? ""
            fields = try? c.decodeIfPresent([String: String].self, forKey: .fields)
            until = try? c.decodeIfPresent(Date.self, forKey: .until)
        }
    }

    public var error: Detail

    public init(error: Detail) { self.error = error }
}

// MARK: - Requests

public struct QuoteRequest: Sendable, Equatable, Codable {
    public var amountCents: Money
    public var planId: String?

    public init(amountCents: Money, planId: String? = nil) {
        self.amountCents = amountCents
        self.planId = planId
    }
}

public struct CreateDepositRequest: Sendable, Equatable, Codable {
    public var quoteId: String
    public var rail: Rail

    public init(quoteId: String, rail: Rail) {
        self.quoteId = quoteId
        self.rail = rail
    }
}

public struct CreatePlanRequest: Sendable, Equatable, Codable {
    public var amountCents: Money
    public var dayOfMonth: Int
    public var rail: Rail

    public init(amountCents: Money, dayOfMonth: Int, rail: Rail) {
        self.amountCents = amountCents
        self.dayOfMonth = dayOfMonth
        self.rail = rail
    }
}

/// Partial update; cancelling is `status: .cancelled`.
public struct UpdatePlanRequest: Sendable, Equatable, Codable {
    public var amountCents: Money?
    public var dayOfMonth: Int?
    public var rail: Rail?
    public var status: PlanStatus?

    public init(amountCents: Money? = nil, dayOfMonth: Int? = nil, rail: Rail? = nil, status: PlanStatus? = nil) {
        self.amountCents = amountCents
        self.dayOfMonth = dayOfMonth
        self.rail = rail
        self.status = status
    }
}

/// Any ISO 3166-1 alpha-2 code: onboarding step 1 offers countries outside Country.
public struct WaitlistRequest: Sendable, Equatable, Codable {
    public var email: String
    public var country: String

    public init(email: String, country: String) {
        self.email = email
        self.country = country
    }
}

public struct UpdateMeRequest: Sendable, Equatable, Codable {
    public var locale: AppLocale

    public init(locale: AppLocale) { self.locale = locale }
}

// MARK: - Deposits page

public struct DepositsPage: Sendable, Equatable, Codable {
    public var items: [Deposit]
    public var nextCursor: String?
}

// MARK: - Onboarding

public enum OnboardingStep: String, Sendable, Hashable, Codable, CaseIterable, CodingKeyRepresentable {
    case residence, personal, address, suitability, funds, identity, terms, review
}

public struct OnboardingDraft: Sendable, Equatable, Codable {
    public var currentStep: OnboardingStep
    public var steps: [OnboardingStep: [String: JSONValue]]
}

public struct Questionnaire: Sendable, Equatable, Codable {
    public struct Option: Sendable, Equatable, Codable {
        public var value: String
        public var label: String
    }

    public enum Kind: String, Sendable, Hashable, Codable { case single, multi }

    public struct Question: Sendable, Equatable, Codable, Identifiable {
        public var id: String
        public var kind: Kind
        public var label: String
        public var options: [Option]
    }

    public var version: String
    public var questions: [Question]
}

// MARK: - Terms

public struct TermsAcceptance: Sendable, Equatable, Codable {
    public var id: String
    public var version: String
    /// When the client ticked the box.
    public var acceptedAt: Date

    public init(id: String, version: String, acceptedAt: Date) {
        self.id = id
        self.version = version
        self.acceptedAt = acceptedAt
    }
}

public enum TermsKind: String, Sendable, Hashable, Codable {
    case advisory_agreement, cost_disclosure, privacy_policy, ibkr_data_consent
}

public struct TermsRecord: Sendable, Equatable, Codable {
    public var version: String
    public var acceptedAt: Date
}

public struct TermsDocument: Sendable, Equatable, Codable, Identifiable {
    public var id: String
    public var kind: TermsKind
    public var version: String
    public var title: String
    public var url: String
    public var acceptedAt: Date?
    public var acceptances: [TermsRecord]?
}

// MARK: - Notifications, suitability, preferences

/// A PendingItem plus the fields of api-gaps.md, item 1 (GET /notifications).
public struct AppNotification: Sendable, Equatable, Codable, Identifiable {
    public var id: String
    public var kind: PendingKind
    public var title: String
    public var description: String
    public var dueAt: Date?
    public var depositId: String?
    public var createdAt: Date
    public var readAt: Date?
    /// The monthly plan's reminder; the amount is read from GET /plans, never from a URL.
    public var planId: String?
    public var termsId: String?
}

public struct SuitabilityRecord: Sendable, Equatable, Codable {
    public var questionnaireVersion: String
    public var answers: [String: JSONValue]
    public var completedAt: Date?
}

public struct SaveSuitabilityRequest: Sendable, Equatable, Codable {
    public var questionnaireVersion: String
    public var answers: [String: JSONValue]

    public init(questionnaireVersion: String, answers: [String: JSONValue]) {
        self.questionnaireVersion = questionnaireVersion
        self.answers = answers
    }
}

public struct NotificationPrefs: Sendable, Equatable, Codable {
    public var email: Bool
    public var push: Bool

    public init(email: Bool, push: Bool) {
        self.email = email
        self.push = push
    }
}

// MARK: - Free-form JSON

/// Onboarding answers and other free-form values (`Record<string, unknown>` on the web).
/// Never used for money: amounts always have their own Money field.
public enum JSONValue: Sendable, Hashable, Codable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    public init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        }
    }
}
