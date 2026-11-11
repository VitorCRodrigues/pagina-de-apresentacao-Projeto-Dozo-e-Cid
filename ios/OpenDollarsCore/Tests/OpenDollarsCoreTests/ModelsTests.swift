import Foundation
import Testing
@testable import OpenDollarsCore

private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
    try JSONCoding.makeDecoder().decode(type, from: Data(json.utf8))
}

private func encodeToString<T: Encodable>(_ value: T) throws -> String {
    String(decoding: try JSONCoding.makeEncoder().encode(value), as: UTF8.self)
}

// MARK: - Enums from the API: exact raw values, unknown values kept

@Suite struct OpenEnumTests {
    // Same lists, same order, as web/src/api/schemas.ts.
    @Test func railRawValuesMatchTheContract() {
        #expect(Rail.knownCases.map(\.rawValue) == ["ar_usdc", "ar_swift", "br_efx", "br_fxbank"])
    }

    @Test func depositStateRawValuesMatchTheContract() {
        #expect(DepositState.knownCases.map(\.rawValue) == [
            "kyc_passed", "ibkr_open", "deposit_notified", "partner_collected", "fx_executed",
            "wire_sent", "broker_credited", "invested", "returned",
        ])
    }

    @Test func accountStatusRawValuesMatchTheContract() {
        #expect(AccountStatus.knownCases.map(\.rawValue) == [
            "draft", "submitted", "kyc_review", "ibkr_pending", "action_required", "open",
            "restricted", "rejected",
        ])
    }

    @Test func blockReasonRawValuesMatchTheContract() {
        #expect(BlockReason.knownCases.map(\.rawValue) == [
            "ibkr_not_open", "ibkr_restricted", "compliance_hold", "quote_expired", "pix_med_hold",
            "market_not_live",
        ])
    }

    // TODO(decisão) 1: an older app must survive a value the backend added later.
    @Test func decodesAnUnknownValueAndKeepsItForTheRoundTrip() throws {
        #expect(try decode(DepositState.self, #""on_hold""#) == .unknown("on_hold"))
        #expect(try decode(AccountStatus.self, #""frozen""#) == .unknown("frozen"))
        #expect(try decode(BlockReason.self, #""new_reason""#) == .unknown("new_reason"))
        #expect(try decode(Rail.self, #""uy_wire""#) == .unknown("uy_wire"))
        #expect(try encodeToString(DepositState.unknown("on_hold")) == #""on_hold""#)
        #expect(try encodeToString(Rail.ar_usdc) == #""ar_usdc""#)
    }

    @Test func aKnownRawValueNeverBecomesUnknown() {
        #expect(Rail(rawValue: "ar_usdc") == .ar_usdc)
        #expect(DepositState(rawValue: "returned") == .returned)
        #expect(!DepositState.returned.isUnknown)
        #expect(DepositState.unknown("x").isUnknown)
    }

    @Test func stillRejectsANonString() {
        #expect(throws: (any Error).self) { try decode(DepositState.self, "3") }
    }
}

// MARK: - Display rules that belong to the domain

@Suite struct DepositDisplayRuleTests {
    // PRD section 6: for ar_usdc hide fx_executed and wire_sent.
    @Test func usdcHidesTheFXAndWireSteps() {
        #expect(!DepositState.fx_executed.isShown(on: .ar_usdc))
        #expect(!DepositState.wire_sent.isShown(on: .ar_usdc))
        #expect(DepositState.partner_collected.isShown(on: .ar_usdc))
        #expect(DepositState.fx_executed.isShown(on: .ar_swift))
        #expect(DepositState.wire_sent.isShown(on: .br_efx))
    }

    @Test func theDepositTimelineFollowsFundingAdvance() {
        #expect(DepositState.timeline(for: .ar_usdc) == [
            .deposit_notified, .partner_collected, .broker_credited, .invested,
        ])
        #expect(DepositState.timeline(for: .ar_swift) == [
            .deposit_notified, .partner_collected, .fx_executed, .wire_sent, .broker_credited, .invested,
        ])
    }

    @Test func onlyDepositNotifiedAsksTheClientToAct() {
        #expect(DepositState.knownCases.filter(\.needsClientAction) == [.deposit_notified])
        #expect(!DepositState.unknown("x").needsClientAction)
    }
}

// MARK: - Config and rails on offer

private let configJSON = """
{
  "liveMarkets": ["AR"],
  "minRecurringUsdCents": 25000,
  "minDepositUsdCents": 10000,
  "efxCapUsdCents": 1000000,
  "railsByCountry": { "AR": ["ar_usdc", "ar_swift"], "BR": ["br_efx", "br_fxbank"] },
  "investmentWindowDay": 15,
  "ibkrPortalUrl": "https://www.interactivebrokers.com/portal",
  "nextInvestmentWindow": "2026-11-15T14:00:00Z"
}
"""

@Suite struct AppConfigTests {
    @Test func decodesTheContract() throws {
        let config = try decode(AppConfig.self, configJSON)
        #expect(config.liveMarkets == [.AR])
        #expect(config.minRecurringUsdCents == Money(cents: 25000))
        #expect(config.railsByCountry[.AR] == [.ar_usdc, .ar_swift])
        #expect(config.investmentWindowDay == 15)
        #expect(config.nextInvestmentWindow == Date(timeIntervalSince1970: 1_794_751_200))
    }

    // An older app cannot serve a market it does not know: the country is ignored, the rest of
    // the config still loads (TODO(decisão) 1).
    @Test func ignoresAnUnknownCountry() throws {
        let json = configJSON
            .replacingOccurrences(of: #""liveMarkets": ["AR"]"#, with: #""liveMarkets": ["AR", "UY"]"#)
            .replacingOccurrences(of: #""BR": ["br_efx", "br_fxbank"]"#, with: #""BR": ["br_efx"], "UY": ["uy_wire"]"#)
        let config = try decode(AppConfig.self, json)
        #expect(config.liveMarkets == [.AR])
        #expect(config.railsByCountry.keys.sorted { $0.rawValue < $1.rawValue } == [.AR, .BR])
    }

    @Test func offersOnlyKnownRailsOfALiveMarket() throws {
        var config = try decode(AppConfig.self, configJSON)
        #expect(config.railsOnOffer(for: .AR) == [.ar_usdc, .ar_swift])
        #expect(config.railsOnOffer(for: .BR) == []) // BR is not in liveMarkets

        config.railsByCountry[.AR] = [.ar_usdc, .unknown("ar_new")]
        #expect(config.railsOnOffer(for: .AR) == [.ar_usdc])
    }

    @Test func failsOnAFractionalMinimum() {
        let json = configJSON.replacingOccurrences(of: "25000", with: "250.5")
        #expect(throws: (any Error).self) { try decode(AppConfig.self, json) }
    }
}

// MARK: - Deposits

private let usdcInstructionsJSON = """
{ "type": "usdc", "token": "USDC", "network": "Ethereum (ERC-20)",
  "address": "0x52908400098527886E0F7030069857D2E4169EE7", "scope": "account" }
"""

private let wireInstructionsJSON = """
{ "type": "wire", "beneficiaryName": "Test Client", "accountNumber": "U****4821",
  "bankName": "Citibank N.A., New York", "swiftBic": "CITIUS33", "reference": "OD-123", "scope": "deposit" }
"""

private let usdcDepositJSON = depositJSON(instructions: usdcInstructionsJSON)

private func depositJSON(instructions: String) -> String { """
{
  "id": "dep-1",
  "rail": "ar_usdc",
  "state": "deposit_notified",
  "amountCents": 50000,
  "costs": [
    { "kind": "rail_fee", "label": "", "amountCents": 150, "percent": 0.003, "estimated": false },
    { "kind": "allocation_min", "label": "", "amountCents": 0, "percent": 0, "estimated": false }
  ],
  "history": [{ "state": "deposit_notified", "at": "2026-10-27T12:00:00.123Z" }],
  "expectedBy": "2026-10-29T12:00:00Z",
  "instructions": \(instructions),
  "isFirstDeposit": true,
  "createdAt": "2026-10-27T12:00:00Z"
}
"""
}

@Suite struct DepositDecodingTests {
    @Test func decodesAUsdcDeposit() throws {
        let deposit = try decode(Deposit.self, usdcDepositJSON)
        #expect(deposit.rail == .ar_usdc)
        #expect(deposit.state == .deposit_notified)
        #expect(deposit.amountCents == Money(cents: 50000))
        #expect(deposit.costs.first?.kind == .rail_fee)
        #expect(deposit.costs.first?.amountCents == Money(cents: 150))
        #expect(deposit.isFirstDeposit)
        guard case let .usdc(usdc) = deposit.instructions else {
            Issue.record("expected USDC instructions")
            return
        }
        #expect(usdc.token == "USDC")
        #expect(usdc.network == "Ethereum (ERC-20)")
        #expect(usdc.scope == .account)
        #expect(usdc.memo == nil)
    }

    @Test func acceptsDatesWithAndWithoutFractionalSeconds() throws {
        let deposit = try decode(Deposit.self, usdcDepositJSON)
        let at = try #require(deposit.history.first?.at)
        #expect(abs(at.timeIntervalSince1970 - 1_793_102_400.123) < 0.0005)
        #expect(deposit.createdAt == Date(timeIntervalSince1970: 1_793_102_400))
    }

    @Test func decodesWireInstructions() throws {
        let deposit = try decode(Deposit.self, depositJSON(instructions: wireInstructionsJSON))
        guard case let .wire(wire) = deposit.instructions else {
            Issue.record("expected wire instructions")
            return
        }
        #expect(wire.reference == "OD-123")
        #expect(wire.scope == .deposit)
    }

    @Test func anUnknownStateStillDecodesTheDeposit() throws {
        let json = usdcDepositJSON.replacingOccurrences(of: #""state": "deposit_notified""#, with: #""state": "on_hold""#)
        #expect(try decode(Deposit.self, json).state == .unknown("on_hold"))
    }

    @Test func aFractionalAmountFailsTheWholeDeposit() {
        let json = usdcDepositJSON.replacingOccurrences(of: #""amountCents": 50000"#, with: #""amountCents": 250.5"#)
        #expect(throws: (any Error).self) { try decode(Deposit.self, json) }
    }

    @Test func aDepositsPageCarriesTheCursor() throws {
        let page = try decode(DepositsPage.self, #"{ "items": [\#(usdcDepositJSON)], "nextCursor": "c2" }"#)
        #expect(page.items.count == 1)
        #expect(page.nextCursor == "c2")
    }
}

// MARK: - Portfolio

@Suite struct PortfolioTests {
    private let json = """
    {
      "totalCents": 160000,
      "buckets": { "inFlightCents": 50000, "ibkrCashCents": 10000, "investedCents": 100000, "feesPaidCents": 450 },
      "positions": [{
        "isin": "IE00B5BMR087", "name": "iShares Core S&P 500 UCITS ETF", "shares": 3,
        "valueCents": 100000, "weight": 1, "targetWeight": 0.6, "description": "Sigue al S&P 500."
      }],
      "asOf": "2026-10-28T06:00:00Z"
    }
    """

    // Decision 15: invested + cash + in transit; fees paid stay out of the total.
    @Test func theDisplayedTotalIsTheSumOfTheThreeBuckets() throws {
        let portfolio = try decode(Portfolio.self, json)
        #expect(try portfolio.displayedTotal() == Money(cents: 160000))
        #expect(try portfolio.totalMatchesBuckets())
    }

    @Test func detectsATotalThatDisagreesWithTheBuckets() throws {
        let portfolio = try decode(Portfolio.self, json.replacingOccurrences(of: "160000", with: "160450"))
        #expect(try !portfolio.totalMatchesBuckets())
        #expect(try portfolio.displayedTotal() == Money(cents: 160000))
    }
}

// MARK: - Account, errors and requests

@Suite struct AccountAndErrorTests {
    @Test func decodesAnAccountWithPendingItems() throws {
        let account = try decode(Account.self, """
        { "status": "action_required", "ibkrAccountMasked": "U****1234", "blockReasons": ["ibkr_not_open"],
          "pending": [{ "id": "p1", "kind": "document", "title": "Comprobante", "description": "Subí...", "dueAt": "2026-11-01T00:00:00Z" }] }
        """)
        #expect(account.status == .action_required)
        #expect(account.blockReasons == [.ibkr_not_open])
        #expect(account.pending.first?.kind == .document)
    }

    @Test func decodesTheErrorEnvelope() throws {
        let body = try decode(ApiErrorBody.self, """
        { "error": { "code": "maintenance", "message": "down", "until": "2026-11-10T21:00:00Z", "fields": { "rail": "invalid" } } }
        """)
        #expect(body.error.code == "maintenance")
        #expect(body.error.until == Date(timeIntervalSince1970: 1_794_344_400))
        #expect(body.error.fields == ["rail": "invalid"])
    }

    @Test func encodesRequestsWithContractNamesAndIntegerCents() throws {
        let plan = CreatePlanRequest(amountCents: Money(cents: 25000), dayOfMonth: 5, rail: .ar_usdc)
        #expect(try encodeToString(plan) == #"{"amountCents":25000,"dayOfMonth":5,"rail":"ar_usdc"}"#)
        let acceptance = TermsAcceptance(id: "t1", version: "2026-10", acceptedAt: Date(timeIntervalSince1970: 1_793_102_400))
        #expect(try encodeToString(acceptance) == #"{"acceptedAt":"2026-10-27T12:00:00Z","id":"t1","version":"2026-10"}"#)
    }

    @Test func keepsFreeFormOnboardingAnswers() throws {
        let draft = try decode(OnboardingDraft.self, """
        { "currentStep": "address", "steps": { "residence": { "country": "AR" }, "personal": { "cuit": "20123456786", "pep": false } } }
        """)
        #expect(draft.currentStep == .address)
        #expect(draft.steps[.residence]?["country"] == .string("AR"))
        #expect(draft.steps[.personal]?["pep"] == .bool(false))
    }
}

// MARK: - Plan and deposit rules (values from AppConfig, never constants)

@Suite struct RulesTests {
    private func config() throws -> AppConfig { try decode(AppConfig.self, configJSON) }

    @Test func acceptsAValidPlan() throws {
        let draft = PlanDraft(amountCents: Money(cents: 25000), dayOfMonth: 28, rail: .ar_swift)
        #expect(try PlanRules.violations(of: draft, country: .AR, config: config()).isEmpty)
    }

    @Test func requiresTheRecurringMinimumFromConfig() throws {
        var config = try config()
        let draft = PlanDraft(amountCents: Money(cents: 24999), dayOfMonth: 5, rail: .ar_usdc)
        #expect(PlanRules.violations(of: draft, country: .AR, config: config) == [.amountCents: .below_minimum])
        config.minRecurringUsdCents = Money(cents: 20000)
        #expect(PlanRules.violations(of: draft, country: .AR, config: config).isEmpty)
    }

    // Decision 16: day 1 to 28, rail required.
    @Test(arguments: [0, 29, 31])
    func rejectsADayOutside1To28(day: Int) throws {
        let draft = PlanDraft(amountCents: Money(cents: 25000), dayOfMonth: day, rail: .ar_usdc)
        #expect(try PlanRules.violations(of: draft, country: .AR, config: config()) == [.dayOfMonth: .invalid])
    }

    @Test func requiresARailOnOffer() throws {
        let missing = PlanDraft(amountCents: Money(cents: 25000), dayOfMonth: 5, rail: nil)
        #expect(try PlanRules.violations(of: missing, country: .AR, config: config()) == [.rail: .required])
        let unknown = PlanDraft(amountCents: Money(cents: 25000), dayOfMonth: 5, rail: .unknown("ar_new"))
        #expect(try PlanRules.violations(of: unknown, country: .AR, config: config()) == [.rail: .invalid])
        let otherCountry = PlanDraft(amountCents: Money(cents: 25000), dayOfMonth: 5, rail: .br_efx)
        #expect(try PlanRules.violations(of: otherCountry, country: .AR, config: config()) == [.rail: .invalid])
    }

    @Test func aOneOffDepositUsesTheOneOffMinimum() throws {
        #expect(try DepositRules.amountViolation(Money(cents: 9999), config: config()) == .below_minimum)
        #expect(try DepositRules.amountViolation(Money(cents: 10000), config: config()) == nil)
        #expect(try DepositRules.amountViolation(Money(cents: 0), config: config()) == .below_minimum)
    }
}
