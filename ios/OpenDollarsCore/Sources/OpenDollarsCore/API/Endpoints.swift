// One function per route of PRD section 8 used in phase 0, plus the api-gaps.md ones the deposit
// flow needs. Creations require an Idempotency-Key by signature, so none can be sent without one.
// The remaining routes (onboarding, terms, notifications, preferences) arrive with their screens.

extension APIClient {
    public func getConfig() async throws -> AppConfig {
        try await request(.GET, "/config")
    }

    public func getMe() async throws -> Me {
        try await request(.GET, "/me")
    }

    public func getAccount() async throws -> Account {
        try await request(.GET, "/account")
    }

    public func getPortfolio() async throws -> Portfolio {
        try await request(.GET, "/portfolio")
    }

    /// api-gaps.md, item 2: most recent first; `states` filters (comma-separated on the wire).
    public func getDeposits(states: [DepositState] = [], cursor: String? = nil, limit: Int? = nil) async throws -> DepositsPage {
        var query: [(String, String)] = []
        if !states.isEmpty { query.append(("state", states.map(\.rawValue).joined(separator: ","))) }
        if let cursor { query.append(("cursor", cursor)) }
        if let limit { query.append(("limit", String(limit))) }
        return try await request(.GET, "/deposits", query: query)
    }

    public func getDeposit(id: String) async throws -> Deposit {
        try await request(.GET, "/deposits/\(Self.segment(id))")
    }

    /// Available rails and the cost preview. The response's Date header updates `clockOffset`,
    /// which the countdown of `Quote.expiresAt` uses.
    public func createQuote(_ body: QuoteRequest) async throws -> Quote {
        try await request(.POST, "/deposits/quote", body: body)
    }

    /// The response already carries the instructions (api-gaps.md, item 2).
    public func createDeposit(_ body: CreateDepositRequest, idempotencyKey: IdempotencyKey) async throws -> Deposit {
        try await request(.POST, "/deposits", body: body, idempotencyKey: idempotencyKey)
    }

    /// "Ya envié": only tells support; the deposit state does not change (api-gaps.md, item 1).
    public func sendDepositSentNotice(depositId: String) async throws {
        try await requestNoContent(.POST, "/deposits/\(Self.segment(depositId))/sent-notice")
    }

    public func getPlans() async throws -> [Plan] {
        try await request(.GET, "/plans")
    }

    public func createPlan(_ body: CreatePlanRequest, idempotencyKey: IdempotencyKey) async throws -> Plan {
        try await request(.POST, "/plans", body: body, idempotencyKey: idempotencyKey)
    }

    public func updatePlan(id: String, _ body: UpdatePlanRequest) async throws -> Plan {
        try await request(.PATCH, "/plans/\(Self.segment(id))", body: body)
    }
}
