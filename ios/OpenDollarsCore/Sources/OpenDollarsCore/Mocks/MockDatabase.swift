import Foundation

// The mock's data per scenario, ported from web/src/mocks/db.ts (phase 0 scope: config, me,
// account, portfolio and deposits). Amounts are fixture-sized, so plain Int64 sums of cents are
// exact; floating point only appears in display ratios the real API also sends as numbers.

struct MockPending: Sendable {
    var id: String
    var kind: PendingKind
    var title: Localized
    var description: Localized
    var depositId: String?
}

struct MockPosition: Sendable {
    var position: Position
    var description: Localized
}

struct MockDeposit: Sendable {
    /// isFirstDeposit and returnReason are filled per request (depositPayload).
    var deposit: Deposit
    var returnReason: Localized?
}

struct MockFailure: Sendable {
    var status: Int
    var code: ApiErrorCode
    var until: Date?
}

struct MockPortfolio: Sendable {
    var totalCents: Money
    var buckets: Buckets
    var positions: [MockPosition]
    var asOf: Date
}

struct MockDatabase: Sendable {
    var config: AppConfig
    var me: Me
    var accountStatus: AccountStatus
    var ibkrAccountMasked: String?
    var pending: [MockPending]
    var blockReasons: [BlockReason]
    var portfolio: MockPortfolio
    /// Newest first.
    var deposits: [MockDeposit]
    var latency: Duration = .zero
    var failure: MockFailure?
    var quoteTTL: TimeInterval = 300
    /// Route-level refusals a scenario forces (compliance_hold on quotes, quote_expired on create).
    var quoteRefusal: ApiErrorCode?
    var depositRefusal: ApiErrorCode?
    var quotes: [String: Quote] = [:]
    var depositsByKey: [String: (body: Data, depositId: String)] = [:]

    // MARK: Payloads, in the language the request asked for

    func accountPayload(_ lang: AppLocale) -> Account {
        Account(
            status: accountStatus, ibkrAccountMasked: ibkrAccountMasked,
            pending: pending.map {
                PendingItem(id: $0.id, kind: $0.kind, title: $0.title[lang], description: $0.description[lang], dueAt: nil, depositId: $0.depositId)
            },
            blockReasons: blockReasons)
    }

    func portfolioPayload(_ lang: AppLocale) -> Portfolio {
        Portfolio(
            totalCents: portfolio.totalCents, buckets: portfolio.buckets,
            positions: portfolio.positions.map {
                var position = $0.position
                position.description = $0.description[lang]
                return position
            },
            asOf: portfolio.asOf)
    }

    /// isFirstDeposit (api-gaps.md, item 6): no earlier deposit that was not returned. The list is
    /// newest first, so on a createdAt tie the one further down came first.
    func depositPayload(_ item: MockDeposit, _ lang: AppLocale) -> Deposit {
        let position = deposits.firstIndex { $0.deposit.id == item.deposit.id } ?? 0
        let earlier = deposits.enumerated().contains { index, other in
            other.deposit.id != item.deposit.id && other.deposit.state != .returned
                && (other.deposit.createdAt < item.deposit.createdAt
                    || (other.deposit.createdAt == item.deposit.createdAt && index > position))
        }
        var deposit = item.deposit
        deposit.isFirstDeposit = !earlier
        deposit.returnReason = item.returnReason?[lang]
        return deposit
    }
}

// MARK: - Builders

enum MockBuilder {
    static let cash = Money(cents: 31200)

    /// The order a deposit walks through (funding.ts advance()); returned can follow any later step.
    static let statePath: [DepositState] = [
        .kyc_passed, .ibkr_open, .deposit_notified, .partner_collected, .fx_executed, .wire_sent,
        .broker_credited, .invested,
    ]

    static func days(_ count: Double, from date: Date) -> Date { date.addingTimeInterval(count * 86_400) }

    static func cents(_ values: [Money]) -> Money { Money(cents: values.reduce(0) { $0 + $1.cents }) }

    /// This month's window while its day has not passed, else next month's, at 14:00 UTC.
    static func nextWindow(_ now: Date, windowDay: Int) -> Date {
        let today = HTTPDate.civil(fromDays: Int((now.timeIntervalSince1970 / 86_400).rounded(.down)))
        var (year, month) = (today.year, today.month)
        if today.day > windowDay {
            month += 1
            if month > 12 { (year, month) = (year + 1, 1) }
        }
        let days = HTTPDate.daysSinceEpoch(year: year, month: month, day: windowDay)
        return Date(timeIntervalSince1970: TimeInterval(days * 86_400 + 14 * 3_600))
    }

    /// Today at 06:00 UTC: the daily reconciliation with the IBKR Flex statement.
    static func reconciliation(_ now: Date) -> Date {
        let days = Int((now.timeIntervalSince1970 / 86_400).rounded(.down))
        return Date(timeIntervalSince1970: TimeInterval(days * 86_400 + 6 * 3_600))
    }

    /// Per api-gaps.md (item 8) a history starts at deposit_notified; only the scenarios named after
    /// kyc_passed and ibkr_open show the account steps.
    static func history(_ target: DepositState, start: Date) -> [StateEvent] {
        let until: DepositState = target == .returned ? .partner_collected : target
        let untilIndex = statePath.firstIndex(of: until) ?? 0
        let from = untilIndex < statePath.firstIndex(of: .deposit_notified)! ? 0 : 2
        let steps = Array(statePath[from...untilIndex])
        let at = { (i: Int) in start.addingTimeInterval(TimeInterval(i) * 3_600) }
        var events = steps.enumerated().map { StateEvent(state: $1, at: at($0)) }
        if target == .returned { events.append(StateEvent(state: .returned, at: at(steps.count))) }
        return events
    }

    /// Cost lines per rail. Ratios are display-only; amounts stay integer cents.
    static func costs(for rail: Rail, amount: Money) -> [CostLine] {
        // The pilot pays the IBKR allocation minimum on the client's behalf (PRD section 12).
        let allocation = CostLine(kind: .allocation_min, label: "", amountCents: .zero, percent: 0, estimated: false)
        let fee: Money
        let estimated: Bool
        if rail == .ar_swift {
            fee = Money(cents: 3500) // fixed bank fees, known only roughly in advance
            estimated = true
        } else {
            // USDC -> USD inside IBKR via Zerohash: 0.30%, minimum US$1 (PRD section 3).
            fee = max((try? amount.applyingBasisPoints(30)) ?? .zero, Money(cents: 100))
            estimated = false
        }
        let ratio = amount.cents > 0 ? Double(fee.cents) / Double(amount.cents) : 0
        return [CostLine(kind: .rail_fee, label: "", amountCents: fee, percent: ratio, estimated: estimated), allocation]
    }

    static func deposit(_ id: String, _ state: DepositState, _ rail: Rail, _ amount: Money, start: Date, now: Date, windowDay: Int) -> MockDeposit {
        let costs = costs(for: rail, amount: amount)
        let net = Money(cents: amount.cents - cents(costs.map(\.amountCents)).cents)
        let stateIndex = statePath.firstIndex(of: state)
        let reached = { (s: DepositState) in (stateIndex ?? -1) >= (statePath.firstIndex(of: s) ?? 0) }
        let open = state != .invested && state != .returned

        var deposit = Deposit(
            id: id, rail: rail, state: state, amountCents: amount, costs: costs,
            creditedCents: nil, investedCents: nil, history: history(state, start: start),
            expectedBy: nil, nextInvestmentWindow: nil, instructions: nil, returnReason: nil,
            createdAt: start, isFirstDeposit: false, quote: nil, blockReason: nil)
        if open && reached(.broker_credited) { deposit.creditedCents = net }
        if state == .invested {
            deposit.creditedCents = net
            deposit.investedCents = net
        }
        if open { deposit.expectedBy = days(3, from: now) }
        if state == .broker_credited { deposit.nextInvestmentWindow = nextWindow(now, windowDay: windowDay) }
        if state == .deposit_notified {
            deposit.instructions = rail == .ar_swift
                ? Fixtures.wireInstructions(reference: "OD-\(id.uppercased())")
                : Fixtures.usdcInstructions()
        }
        return MockDeposit(deposit: deposit, returnReason: state == .returned ? Fixtures.returnReasonThirdParty : nil)
    }

    static func pastDeposits(_ now: Date, windowDay: Int) -> [MockDeposit] {
        [
            deposit("dep-2026-10", .invested, .ar_usdc, Money(cents: 50000), start: days(-26, from: now), now: now, windowDay: windowDay),
            deposit("dep-2026-09", .invested, .ar_usdc, Money(cents: 50000), start: days(-56, from: now), now: now, windowDay: windowDay),
            deposit("dep-2026-08", .invested, .ar_swift, Money(cents: 100000), start: days(-87, from: now), now: now, windowDay: windowDay),
        ]
    }

    static func heldPositions() -> [MockPosition] {
        let values = Fixtures.etfs.map { Money(cents: Int64($0.shares) * $0.price.cents) }
        let invested = Double(cents(values).cents)
        return zip(Fixtures.etfs, values).map { etf, value in
            MockPosition(
                position: Position(
                    isin: etf.isin, name: etf.name, shares: etf.shares, valueCents: value,
                    weight: (Double(value.cents) / invested * 1000).rounded() / 1000,
                    targetWeight: etf.targetWeight, description: ""),
                description: etf.description)
        }
    }

    /// Decision 15: invested + cash + in flight, without fees.
    static func portfolio(_ positions: [MockPosition], cash: Money, inFlight: Money, now: Date) -> MockPortfolio {
        let invested = cents(positions.map(\.position.valueCents))
        return MockPortfolio(
            totalCents: cents([invested, cash, inFlight]),
            buckets: Buckets(
                inFlightCents: inFlight, ibkrCashCents: cash, investedCents: invested,
                feesPaidCents: Money(cents: positions.isEmpty ? 0 : 450)),
            positions: positions,
            asOf: reconciliation(now))
    }

    static func base(_ status: AccountStatus, now: Date) -> MockDatabase {
        let opened = status == .open || status == .restricted
        let config = Fixtures.config
        var me = Fixtures.lucia
        me.accountStatus = status
        let pending: [MockPending] = status == .action_required
            ? Fixtures.documentRequests.map { MockPending(id: $0.id, kind: .document, title: $0.title, description: $0.description) }
            : []
        let blocks: [BlockReason] = status == .restricted ? [.ibkr_restricted] : opened ? [] : [.ibkr_not_open]
        return MockDatabase(
            config: config, me: me, accountStatus: status,
            ibkrAccountMasked: opened ? "U****4821" : nil, pending: pending, blockReasons: blocks,
            portfolio: opened
                ? portfolio(heldPositions(), cash: cash, inFlight: .zero, now: now)
                : portfolio([], cash: .zero, inFlight: .zero, now: now),
            deposits: opened ? pastDeposits(now, windowDay: config.investmentWindowDay) : [])
    }

    /// Puts "dep-scenario" first, in the given state, and moves the money buckets to match.
    static func withScenarioDeposit(_ db: MockDatabase, _ state: DepositState, now: Date) -> MockDatabase {
        var db = db
        let rail: Rail = state == .fx_executed || state == .wire_sent ? .ar_swift : .ar_usdc
        let current = deposit("dep-scenario", state, rail, Money(cents: 50000), start: days(-1, from: now), now: now, windowDay: db.config.investmentWindowDay)
        let inFlight = [.partner_collected, .fx_executed, .wire_sent].contains(state) ? current.deposit.amountCents : .zero
        let cashNow = state == .broker_credited ? cents([cash, current.deposit.creditedCents ?? .zero]) : cash
        if state == .deposit_notified {
            db.pending.append(MockPending(
                id: "pend-deposit", kind: .deposit_action, title: Fixtures.depositAction.title,
                description: Fixtures.depositAction.description, depositId: current.deposit.id))
        }
        db.deposits.insert(current, at: 0)
        db.portfolio = portfolio(heldPositions(), cash: cashNow, inFlight: inFlight, now: now)
        return db
    }

    static func build(_ scenario: Scenario, now: Date) -> MockDatabase {
        if let status = AccountStatus.known(scenario.rawValue) { return base(status, now: now) }
        if let state = DepositState.known(scenario.rawValue) { return withScenarioDeposit(base(.open, now: now), state, now: now) }

        var db = base(.open, now: now)
        switch scenario {
        case .ibkr_not_open:
            return base(.ibkr_pending, now: now)
        case .ibkr_restricted:
            return base(.restricted, now: now)
        case .market_not_live:
            db = base(.draft, now: now)
            db.me = Fixtures.rafael
        case .compliance_hold:
            db.blockReasons = [.compliance_hold]
            db.quoteRefusal = .compliance_hold
        case .quote_expired:
            db.quoteTTL = 10
            db.depositRefusal = .quote_expired
        case .pix_med_hold:
            // Brazil only: meaningful once BR is live; kept so the hold UI can be built.
            db = withScenarioDeposit(db, .partner_collected, now: now)
            db.blockReasons = [.pix_med_hold]
            db.deposits[0].deposit.rail = .br_efx
            db.deposits[0].deposit.blockReason = .pix_med_hold
        case .slow:
            db.latency = .seconds(3)
        case .server_error:
            db.failure = MockFailure(status: 500, code: .internal)
        case .maintenance:
            db.failure = MockFailure(status: 503, code: .maintenance, until: now.addingTimeInterval(30 * 60))
        case .empty:
            db.deposits = []
            db.portfolio = portfolio([], cash: .zero, inFlight: .zero, now: now)
        case .in_flight_only:
            // A new client's first deposit on its way: nothing invested or in cash yet.
            let first = deposit("dep-first", .partner_collected, .ar_usdc, Money(cents: 50000), start: days(-1, from: now), now: now, windowDay: db.config.investmentWindowDay)
            db.deposits = [first]
            db.portfolio = portfolio([], cash: .zero, inFlight: first.deposit.amountCents, now: now)
        case .plan_paused, .plan_reminder, .terms_update:
            // Plans, notifications and terms are outside the phase 0 mock: same data as "open".
            break
        default:
            break
        }
        return db
    }
}
