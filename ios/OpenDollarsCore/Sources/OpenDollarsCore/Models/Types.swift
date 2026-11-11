import Foundation

// Types of PRD section 8, with the field names of the contract. Money fields are Money
// (integer cents); dates are Date (ISO 8601 UTC on the wire). Types proposed in api-gaps.md
// live in ProposedTypes.swift.

public enum Country: String, Sendable, Hashable, Codable, CaseIterable, CodingKeyRepresentable {
    case AR, BR
}

// MARK: - Config

public struct AppConfig: Sendable, Equatable, Codable {
    public var liveMarkets: [Country]
    public var minRecurringUsdCents: Money
    public var minDepositUsdCents: Money
    public var efxCapUsdCents: Money
    public var railsByCountry: [Country: [Rail]]
    public var investmentWindowDay: Int
    public var ibkrPortalUrl: String
    /// api-gaps.md, item 8: the next window computed by the server, for the home screen.
    public var nextInvestmentWindow: Date?

    /// Rails a client of `country` may pick for a new deposit or plan: the country must be live,
    /// and a rail this app version does not know is never offered.
    public func railsOnOffer(for country: Country) -> [Rail] {
        guard liveMarkets.contains(country) else { return [] }
        return (railsByCountry[country] ?? []).filter { !$0.isUnknown }
    }

    private enum CodingKeys: String, CodingKey {
        case liveMarkets, minRecurringUsdCents, minDepositUsdCents, efxCapUsdCents, railsByCountry
        case investmentWindowDay, ibkrPortalUrl, nextInvestmentWindow
    }

    init(
        liveMarkets: [Country], minRecurringUsdCents: Money, minDepositUsdCents: Money,
        efxCapUsdCents: Money, railsByCountry: [Country: [Rail]], investmentWindowDay: Int,
        ibkrPortalUrl: String, nextInvestmentWindow: Date? = nil
    ) {
        self.liveMarkets = liveMarkets
        self.minRecurringUsdCents = minRecurringUsdCents
        self.minDepositUsdCents = minDepositUsdCents
        self.efxCapUsdCents = efxCapUsdCents
        self.railsByCountry = railsByCountry
        self.investmentWindowDay = investmentWindowDay
        self.ibkrPortalUrl = ibkrPortalUrl
        self.nextInvestmentWindow = nextInvestmentWindow
    }

    // A country this version does not know is dropped (it cannot serve that market anyway), so a
    // new market on the backend never stops an older app from loading its config.
    // TODO(decisão) 1: extension of the open-enum rule to Country inside the config.
    public init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        liveMarkets = try c.decode([String].self, forKey: .liveMarkets).compactMap(Country.init(rawValue:))
        minRecurringUsdCents = try c.decode(Money.self, forKey: .minRecurringUsdCents)
        minDepositUsdCents = try c.decode(Money.self, forKey: .minDepositUsdCents)
        efxCapUsdCents = try c.decode(Money.self, forKey: .efxCapUsdCents)
        let rails = try c.decode([String: [Rail]].self, forKey: .railsByCountry)
        railsByCountry = Dictionary(uniqueKeysWithValues: rails.compactMap { key, value in
            Country(rawValue: key).map { ($0, value) }
        })
        investmentWindowDay = try c.decode(Int.self, forKey: .investmentWindowDay)
        ibkrPortalUrl = try c.decode(String.self, forKey: .ibkrPortalUrl)
        nextInvestmentWindow = try c.decodeIfPresent(Date.self, forKey: .nextInvestmentWindow)
    }

    public func encode(to encoder: any Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(liveMarkets, forKey: .liveMarkets)
        try c.encode(minRecurringUsdCents, forKey: .minRecurringUsdCents)
        try c.encode(minDepositUsdCents, forKey: .minDepositUsdCents)
        try c.encode(efxCapUsdCents, forKey: .efxCapUsdCents)
        try c.encode(railsByCountry, forKey: .railsByCountry)
        try c.encode(investmentWindowDay, forKey: .investmentWindowDay)
        try c.encode(ibkrPortalUrl, forKey: .ibkrPortalUrl)
        try c.encodeIfPresent(nextInvestmentWindow, forKey: .nextInvestmentWindow)
    }
}

// MARK: - Client and account

public struct Me: Sendable, Equatable, Codable {
    public var id: String
    public var name: String
    public var email: String
    public var country: Country
    public var locale: AppLocale
    public var accountStatus: AccountStatus
}

public enum PendingKind: String, Sendable, Hashable, Codable {
    case document, deposit_action, terms, notice
}

public struct PendingItem: Sendable, Equatable, Codable, Identifiable {
    public var id: String
    public var kind: PendingKind
    /// Editorial text, already translated by the API (decision 12).
    public var title: String
    public var description: String
    public var dueAt: Date?
    public var depositId: String?
}

public struct Account: Sendable, Equatable, Codable {
    public var status: AccountStatus
    /// e.g. "U****1234"; never credentials.
    public var ibkrAccountMasked: String?
    public var pending: [PendingItem]
    /// api-gaps.md, item 8: only account-level reasons here; deposit-level ones on Deposit.
    public var blockReasons: [BlockReason]
}

// MARK: - Quotes and costs

public enum CostKind: String, Sendable, Hashable, Codable {
    case iof, fx_spread, rail_fee, allocation_min, advisory_fee
}

public struct CostLine: Sendable, Equatable, Codable {
    public var kind: CostKind
    /// Not shown: the app translates `kind` (decision 12).
    public var label: String
    public var amountCents: Money
    /// Display-only ratio (0.011 = 1.1%). TODO(api) 1: propose integer basis points.
    public var percent: Double
    /// true when the value is an assumption from the config, not a known fee.
    public var estimated: Bool
}

public struct DayRange: Sendable, Equatable, Codable {
    public var min: Int
    public var max: Int
}

public struct RailOption: Sendable, Equatable, Codable {
    public var rail: Rail
    public var recommended: Bool
    public var costs: [CostLine]
    public var totalCostCents: Money
    public var netToInvestCents: Money
    public var expectedDays: DayRange
}

public struct Quote: Sendable, Equatable, Codable, Identifiable {
    public var id: String
    public var amountCents: Money
    public var options: [RailOption]
    public var expiresAt: Date
}

// MARK: - Deposits

/// api-gaps.md, item 7: whether the instructions are the account's or only this deposit's.
public enum InstructionScope: String, Sendable, Hashable, Codable {
    case account, deposit
}

public struct UsdcInstructions: Sendable, Equatable, Codable {
    /// Always "USDC"; the network comes from the API, never fixed in the app.
    public var token: String
    public var network: String
    public var address: String
    public var memo: String?
    public var scope: InstructionScope
}

public struct WireInstructions: Sendable, Equatable, Codable {
    public var beneficiaryName: String
    public var accountNumber: String
    public var bankName: String
    public var swiftBic: String
    /// Mandatory on the transfer.
    public var reference: String
    public var scope: InstructionScope
}

/// `DepositInstructionsUsdc | DepositInstructionsWire`, told apart by "type".
public enum DepositInstructions: Sendable, Equatable, Codable {
    case usdc(UsdcInstructions)
    case wire(WireInstructions)

    private enum TypeKey: String, CodingKey { case type }

    public init(from decoder: any Decoder) throws {
        let type = try decoder.container(keyedBy: TypeKey.self).decode(String.self, forKey: .type)
        switch type {
        case "usdc": self = .usdc(try UsdcInstructions(from: decoder))
        case "wire": self = .wire(try WireInstructions(from: decoder))
        default:
            throw DecodingError.dataCorrupted(.init(
                codingPath: decoder.codingPath, debugDescription: "Unknown instructions type"))
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: TypeKey.self)
        switch self {
        case .usdc(let usdc):
            try container.encode("usdc", forKey: .type)
            try usdc.encode(to: encoder)
        case .wire(let wire):
            try container.encode("wire", forKey: .type)
            try wire.encode(to: encoder)
        }
    }
}

public struct StateEvent: Sendable, Equatable, Codable {
    public var state: DepositState
    public var at: Date
}

/// api-gaps.md, item 5: the quote a deposit was created from.
public struct DepositQuoteRef: Sendable, Equatable, Codable {
    public var id: String
    public var rateDescription: String?
    public var createdAt: Date
}

/// A deposit as the API sends it: section 8's Deposit plus the api-gaps.md fields (items 5–8),
/// the shape the web calls DepositDetail.
public struct Deposit: Sendable, Equatable, Codable, Identifiable {
    public var id: String
    public var rail: Rail
    public var state: DepositState
    public var amountCents: Money
    public var costs: [CostLine]
    public var creditedCents: Money?
    public var investedCents: Money?
    public var history: [StateEvent]
    /// When the current state is expected to end; past it, the app shows a soft warning.
    public var expectedBy: Date?
    public var nextInvestmentWindow: Date?
    public var instructions: DepositInstructions?
    /// Editorial text, already translated by the API.
    public var returnReason: String?
    public var createdAt: Date
    /// api-gaps.md, item 6: computed by the backend; returned deposits do not count.
    public var isFirstDeposit: Bool
    public var quote: DepositQuoteRef?
    public var blockReason: BlockReason?
}

// MARK: - Portfolio

public struct Position: Sendable, Equatable, Codable {
    /// UCITS, never starts with "US".
    public var isin: String
    public var name: String
    /// Whole shares only.
    public var shares: Int
    public var valueCents: Money
    public var weight: Double
    public var targetWeight: Double
    /// Editorial text, already translated by the API.
    public var description: String
}

public struct Buckets: Sendable, Equatable, Codable {
    public var inFlightCents: Money
    public var ibkrCashCents: Money
    public var investedCents: Money
    public var feesPaidCents: Money
}

public struct Portfolio: Sendable, Equatable, Codable {
    public var totalCents: Money
    public var buckets: Buckets
    public var positions: [Position]
    /// Last reconciliation with IBKR.
    public var asOf: Date

    /// Decision 15: invested + cash + in transit, without fees paid. The app shows this sum so the
    /// total always matches the lines on screen.
    public func displayedTotal() throws -> Money {
        try Money.sum([buckets.investedCents, buckets.ibkrCashCents, buckets.inFlightCents])
    }

    /// false when the API's total disagrees with the buckets (reported without values, api-gaps 8).
    public func totalMatchesBuckets() throws -> Bool {
        try displayedTotal() == totalCents
    }
}

// MARK: - Plans

public enum PlanStatus: String, Sendable, Hashable, Codable {
    case active, paused, cancelled
}

public struct Plan: Sendable, Equatable, Codable, Identifiable {
    public var id: String
    public var amountCents: Money
    public var dayOfMonth: Int
    public var rail: Rail
    public var status: PlanStatus
    public var nextRunAt: Date?
}
