// Business rules the app reflects in the UI (PRD section 5). The backend enforces them too; the
// app only guides the client. Every amount comes from AppConfig, never from a constant here.

/// Field names as the API reports them in error.fields.
public enum RuleField: String, Sendable, Hashable {
    case amountCents, dayOfMonth, rail
}

public enum RuleViolation: String, Sendable, Hashable {
    case below_minimum, invalid, required
}

/// A monthly plan as the client fills it in, before it becomes a CreatePlanRequest.
public struct PlanDraft: Sendable, Equatable {
    public var amountCents: Money
    public var dayOfMonth: Int
    public var rail: Rail?

    public init(amountCents: Money, dayOfMonth: Int, rail: Rail?) {
        self.amountCents = amountCents
        self.dayOfMonth = dayOfMonth
        self.rail = rail
    }
}

public enum PlanRules {
    /// Decision 16 (web/docs/decisions.md): a plan day from 1 to 28, so every month has it.
    public static let dayRange = 1...28

    public static func violations(of draft: PlanDraft, country: Country, config: AppConfig) -> [RuleField: RuleViolation] {
        var result: [RuleField: RuleViolation] = [:]
        if draft.amountCents < config.minRecurringUsdCents {
            result[.amountCents] = .below_minimum
        }
        if !dayRange.contains(draft.dayOfMonth) {
            result[.dayOfMonth] = .invalid
        }
        if let rail = draft.rail {
            if !config.railsOnOffer(for: country).contains(rail) { result[.rail] = .invalid }
        } else {
            result[.rail] = .required
        }
        return result
    }
}

public enum DepositRules {
    /// A one-off deposit below config.minDepositUsdCents is refused (api-gaps.md, item 9).
    public static func amountViolation(_ amount: Money, config: AppConfig) -> RuleViolation? {
        amount < config.minDepositUsdCents ? .below_minimum : nil
    }
}
