// Mocks exist only in DEBUG builds (TODO(fase 11)): a Release build has no simulated provider
// or in-memory API, and the app refuses to build without the real ones (AppModel.live).
#if DEBUG

import Foundation

/// The API in memory, for development, previews, UI tests and screenshots. Follows
/// web/docs/api-gaps.md, section 10, with the phase 0 scope: GET /config, /me, /account,
/// /portfolio, the deposit routes (quote, create with idempotency 201/200/409, list with filter and
/// cursor, detail, sent notice) and the error envelope. Any other route answers 404 not_found.
/// Every reply carries a Date header, like a real server. Each simulated client has its own data:
/// a request is served from the database of whoever owns its bearer token (SimulatedAuthProvider).
/// No token, or one the simulated provider did not issue, gets 401 session_expired. The scenario
/// shapes Lucía's data; Rafael's is always the not-yet-live Brazilian client.
public actor MockServer: HTTPTransport {
    private var databases: [SimulatedIdentity: MockDatabase]
    /// The database of the request being served. Set after the last await of `send`, so two
    /// requests never mix their clients.
    private var db: MockDatabase
    private let now: @Sendable () -> Date
    private let sleep: @Sendable (Duration) async throws -> Void
    private let decoder = JSONCoding.makeDecoder()
    private let encoder = JSONCoding.makeEncoder()

    public init(
        scenario: Scenario = .default,
        now: @escaping @Sendable () -> Date = { Date() },
        sleep: @escaping @Sendable (Duration) async throws -> Void = { try await Task.sleep(for: $0) }
    ) {
        let lucia = MockBuilder.build(scenario, now: now())
        self.databases = [.lucia: lucia, .rafael: MockBuilder.build(.market_not_live, now: now())]
        self.db = lucia
        self.now = now
        self.sleep = sleep
    }

    public func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        guard request.path.hasPrefix(OpenDollarsCore.apiBasePath) else { return notFound() }
        let target = request.path.dropFirst(OpenDollarsCore.apiBasePath.count)
        let pieces = target.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
        let segments = pieces[0].split(separator: "/").map { String($0).removingPercentEncoding ?? String($0) }
        let query = Self.parseQuery(pieces.count > 1 ? String(pieces[1]) : "")
        let lang = AppLocale(languageTag: request.headers["Accept-Language"])
        let bearer = request.headers["Authorization"].flatMap { $0.hasPrefix("Bearer ") ? String($0.dropFirst(7)) : nil }
        let identity = bearer.flatMap(SimulatedAuthProvider.identity(ofAccessToken:))
        let client = identity ?? .lucia

        if let latency = databases[client]?.latency, latency > .zero { try await sleep(latency) }
        // No await from here on: this request owns `db` until it returns.
        db = databases[client] ?? db
        defer { databases[client] = db }
        if let failure = db.failure {
            return error(failure.status, failure.code.rawValue, "Mock \(failure.code.rawValue)", until: failure.until)
        }

        let method = request.method
        // The config is public: the app needs it before sign-in (api-gaps.md, item 9).
        if method == .GET, segments == ["config"] { return json(200, db.config) }

        guard identity != nil else {
            return error(401, "session_expired", "Missing or expired bearer token")
        }

        switch (method, segments.first, segments.count) {
        case (.GET, "me", 1):
            return json(200, db.me)
        case (.GET, "onboarding", 1):
            return json(200, db.onboarding)
        case (.GET, "onboarding", 2) where segments[1] == "questionnaire":
            return json(200, OnboardingFixtures.questionnaire(lang))
        case (.PUT, "onboarding", 2):
            return saveOnboardingStep(segments[1], request, lang)
        case (.POST, "onboarding", 2) where segments[1] == "submit":
            // api-gaps.md, item 7: only from draft; the account comes back submitted.
            guard db.accountStatus == .draft else { return error(422, "validation_failed", "Already submitted") }
            db.accountStatus = .submitted
            db.me.accountStatus = .submitted
            return json(200, db.accountPayload(lang))
        case (.POST, "account", 2) where segments[1] == "documents":
            return receiveDocument(request, lang)
        case (.GET, "account", 2) where segments[1] == "terms":
            return json(200, OnboardingFixtures.termsDocuments(lang))
        case (.POST, "waitlist", 1):
            return joinWaitlist(request)
        case (.GET, "account", 1):
            return json(200, db.accountPayload(lang))
        case (.GET, "portfolio", 1):
            return json(200, db.portfolioPayload(lang))
        case (.POST, "deposits", 2) where segments[1] == "quote":
            return createQuote(request)
        case (.POST, "deposits", 1):
            return createDeposit(request, lang)
        case (.GET, "deposits", 1):
            return listDeposits(query, lang)
        case (.GET, "deposits", 2):
            guard let found = db.deposits.first(where: { $0.deposit.id == segments[1] }) else { return notFound() }
            return json(200, db.depositPayload(found, lang))
        case (.POST, "deposits", 3) where segments[2] == "sent-notice":
            // "Ya envié" tells support only; the state does not change (PRD section 6).
            let known = db.deposits.contains { $0.deposit.id == segments[1] }
            return known ? HTTPResponse(status: 204, headers: headers()) : notFound()
        default:
            return notFound()
        }
    }

    /// Sending a document reports progress in steps over about 1.5 s, so the bar is seen in
    /// development and in the screenshots; then the request is answered as any other.
    public func upload(_ request: HTTPRequest, progress: @escaping @Sendable (Double) -> Void) async throws -> HTTPResponse {
        let drops = dropNextUpload
        dropNextUpload = false
        for step in 1...4 {
            try await sleep(uploadStep)
            if drops, step == 3 { throw URLError(.networkConnectionLost) }
            progress(Double(step) / 4)
        }
        return try await send(request)
    }

    private var dropNextUpload = false
    private var uploadStep: Duration = .milliseconds(375)

    /// Each of the four progress steps takes this long (`-slowUpload`, DEBUG: a screenshot while
    /// the bar moves).
    public func setUploadStep(_ step: Duration) { uploadStep = step }

    /// The next upload drops halfway, as on a weak connection (`-failFirstUpload`, DEBUG): the
    /// app's "Reintentar" can be seen and tested. Nothing is recorded.
    public func failNextUpload() { dropNextUpload = true }

    // MARK: Test and development hooks

    /// The documents this client sent, oldest first.
    public func receivedDocuments(for identity: SimulatedIdentity) -> [ReceivedDocument] {
        databases[identity]?.receivedDocuments ?? []
    }

    /// The account moves on, as when Interactive Brokers answers (T3 checks back every minute).
    public func setAccountStatus(_ status: AccountStatus, for identity: SimulatedIdentity) {
        guard var changed = databases[identity] else { return }
        changed.accountStatus = status
        changed.me.accountStatus = status
        if status == .open { changed.ibkrAccountMasked = "U****4821"; changed.blockReasons = [] }
        if status != .action_required { changed.pending.removeAll { $0.kind == .document } }
        databases[identity] = changed
    }

    // MARK: Documents

    /// POST /account/documents (api-gaps.md): multipart with `pendingItemId` and `file`; answers
    /// the account without that pending item. TODO(api) 2: as proposed to the backend, the same
    /// Idempotency-Key for the same item answers again without recording the document twice.
    private func receiveDocument(_ request: HTTPRequest, _ lang: AppLocale) -> HTTPResponse {
        let key = request.headers["Idempotency-Key"].flatMap { $0.isEmpty ? nil : $0 }
        guard let contentType = request.headers["Content-Type"],
              let parts = MultipartBody.parts(of: request.body ?? Data(), contentType: contentType)
        else { return error(422, "validation_failed", "Invalid multipart body", fields: ["body": "invalid"]) }
        let itemId = parts.first { $0.name == "pendingItemId" }.map { String(decoding: $0.data, as: UTF8.self) }
        let file = parts.first { $0.name == "file" && !$0.data.isEmpty }
        var fields: [String: String] = [:]
        if itemId?.isEmpty ?? true { fields["pendingItemId"] = "invalid" }
        if file == nil { fields["file"] = "invalid" }
        guard let itemId, let file, fields.isEmpty else {
            return error(422, "validation_failed", "pendingItemId and file are required", fields: fields)
        }
        if let key, let previous = db.documentsByKey[key] {
            guard previous == itemId else { return error(409, "idempotency_conflict", "Key reused") }
            return json(200, db.accountPayload(lang))
        }
        guard db.pending.contains(where: { $0.id == itemId && $0.kind == .document }) else { return notFound() }
        db.receivedDocuments.append(ReceivedDocument(pendingItemId: itemId, fileName: file.fileName, contentType: file.contentType, data: file.data))
        if let key { db.documentsByKey[key] = itemId }
        db.pending.removeAll { $0.id == itemId }
        return json(200, db.accountPayload(lang))
    }

    // MARK: Onboarding

    /// PUT /onboarding/{step}: the same forms as the app validate the body, so the server's field
    /// errors carry the same codes. currentStep moves to the step after the saved one and never
    /// back (editing from the review keeps the review).
    private func saveOnboardingStep(_ name: String, _ request: HTTPRequest, _ lang: AppLocale) -> HTTPResponse {
        guard let step = OnboardingStep(rawValue: name) else { return notFound() }
        guard let data = request.body, let body = try? decoder.decode([String: JSONValue].self, from: data) else {
            return error(422, "validation_failed", "Invalid request body", fields: ["body": "invalid"])
        }
        let errors: FieldErrors
        switch step {
        case .residence: errors = ResidenceForm(draft: body).validate()
        case .personal: errors = PersonalForm(draft: body).validate(today: CalendarDate(now()))
        case .address: errors = AddressForm(draft: body).validate()
        case .suitability:
            let questionnaire = OnboardingFixtures.questionnaire(lang)
            errors = SuitabilityForm(questionnaire: questionnaire, draft: body).validate(questionnaire)
        case .funds: errors = FundsForm(draft: body).validate()
        case .identity: errors = IdentityForm(draft: body).validate()
        case .terms:
            let docs = OnboardingFixtures.termsDocuments(lang)
            errors = TermsForm(docs: docs, draft: body).validate(docs)
        case .review: errors = [:]
        }
        guard errors.isEmpty else {
            return error(422, "validation_failed", "Invalid step", fields: errors.mapValues(\.rawValue))
        }
        let steps = OnboardingStep.allCases
        let saved = steps.firstIndex(of: step) ?? 0
        let current = steps.firstIndex(of: db.onboarding.currentStep) ?? 0
        db.onboarding.steps[step] = body
        db.onboarding.currentStep = steps[max(current, min(saved + 1, steps.count - 1))]
        return json(200, db.onboarding)
    }

    /// POST /waitlist: { email, country } with any ISO 3166-1 alpha-2 country (api-gaps.md).
    private func joinWaitlist(_ request: HTTPRequest) -> HTTPResponse {
        guard let data = request.body, let body = try? decoder.decode(WaitlistRequest.self, from: data) else {
            return error(422, "validation_failed", "Invalid request body", fields: ["body": "invalid"])
        }
        var fields: [String: String] = [:]
        if !WaitlistForm(email: body.email).validate().isEmpty { fields["email"] = OnboardingError.invalidEmail.rawValue }
        if !Patterns.matches(body.country, "^[A-Z]{2}$") { fields["country"] = OnboardingError.pickOne.rawValue }
        guard fields.isEmpty else { return error(422, "validation_failed", "Invalid waitlist request", fields: fields) }
        return HTTPResponse(status: 204, headers: headers())
    }

    // MARK: Deposits

    /// Deposits need a live country and an opened, unrestricted account.
    private func fundingRefusal() -> HTTPResponse? {
        if !db.config.liveMarkets.contains(db.me.country) { return error(403, "market_not_live", "Country not live") }
        if db.accountStatus == .restricted { return error(409, "account_restricted", "Account restricted") }
        if db.accountStatus != .open { return error(409, "account_not_open", "Account not open") }
        return nil
    }

    private func createQuote(_ request: HTTPRequest) -> HTTPResponse {
        if let refusal = fundingRefusal() { return refusal }
        if let code = db.quoteRefusal { return error(409, code.rawValue, "Deposits on hold") }

        let body: QuoteRequest
        switch decodeBody(QuoteRequest.self, request, fields: ["amountCents": Self.isInteger, "planId": Self.isOptionalString]) {
        case .success(let decoded): body = decoded
        case .failure(let reply): return reply.response
        }
        if body.amountCents < db.config.minDepositUsdCents {
            return self.error(422, "below_minimum", "Below the one-off minimum")
        }

        let options = (db.config.railsByCountry[db.me.country] ?? []).map { rail in
            let costs = MockBuilder.costs(for: rail, amount: body.amountCents)
            let total = MockBuilder.cents(costs.map(\.amountCents))
            return RailOption(
                rail: rail, recommended: rail == .ar_usdc, costs: costs, totalCostCents: total,
                netToInvestCents: Money(cents: body.amountCents.cents - total.cents),
                expectedDays: rail == .ar_usdc ? DayRange(min: 0, max: 1) : DayRange(min: 1, max: 3))
        }
        let quote = Quote(
            id: "q-\(Self.shortID())", amountCents: body.amountCents, options: options,
            expiresAt: now().addingTimeInterval(db.quoteTTL))
        db.quotes[quote.id] = quote
        return json(200, quote)
    }

    private func createDeposit(_ request: HTTPRequest, _ lang: AppLocale) -> HTTPResponse {
        guard let key = request.headers["Idempotency-Key"], !key.isEmpty else {
            return error(422, "validation_failed", "Missing Idempotency-Key", fields: ["Idempotency-Key": "invalid"])
        }
        if let refusal = fundingRefusal() { return refusal }

        let body: CreateDepositRequest
        switch decodeBody(CreateDepositRequest.self, request, fields: ["quoteId": Self.isString, "rail": Self.isString]) {
        case .success(let decoded): body = decoded
        case .failure(let reply): return reply.response
        }

        // Same key: the original answer, or a conflict when the body changed (PRD section 8).
        let canonical = (try? encoder.encode(body)) ?? Data()
        if let previous = db.depositsByKey[key] {
            guard previous.body == canonical else { return error(409, "idempotency_conflict", "Key reused") }
            guard let existing = db.deposits.first(where: { $0.deposit.id == previous.depositId }) else { return notFound() }
            return json(200, db.depositPayload(existing, lang))
        }

        let quote = db.quotes[body.quoteId]
        if db.depositRefusal != nil || (quote.map { $0.expiresAt <= now() } ?? false) {
            return error(409, "quote_expired", "Quote expired")
        }
        guard let quote else { return notFound() }
        guard let option = quote.options.first(where: { $0.rail == body.rail }) else {
            return error(422, "validation_failed", "Rail not quoted", fields: ["rail": "invalid"])
        }

        let at = now()
        var created = MockBuilder.deposit(
            "dep-\(Self.shortID())", .deposit_notified, body.rail, quote.amountCents,
            start: at, now: at, windowDay: db.config.investmentWindowDay)
        created.deposit.costs = option.costs
        created.deposit.quote = DepositQuoteRef(id: quote.id, rateDescription: nil, createdAt: at)
        db.deposits.insert(created, at: 0)
        db.depositsByKey[key] = (canonical, created.deposit.id)
        return json(201, db.depositPayload(created, lang))
    }

    /// api-gaps.md, item 2: `state` takes one state or a comma-separated list (empty = no filter),
    /// `limit` defaults to 20, `cursor` is an opaque offset.
    private func listDeposits(_ query: [String: String], _ lang: AppLocale) -> HTTPResponse {
        var states: [DepositState]?
        if let raw = query["state"], !raw.isEmpty {
            let parsed = raw.split(separator: ",", omittingEmptySubsequences: false).map { DepositState(rawValue: String($0)) }
            guard !parsed.contains(where: \.isUnknown) else {
                return error(422, "validation_failed", "Unknown state", fields: ["state": "invalid"])
            }
            states = parsed
        }
        let limit = query["limit"].flatMap(Int.init) ?? 20
        let offset = query["cursor"].flatMap(Int.init) ?? 0
        let matching = states.map { wanted in db.deposits.filter { wanted.contains($0.deposit.state) } } ?? db.deposits
        let page = matching.dropFirst(offset).prefix(limit)
        let next = offset + limit < matching.count ? String(offset + limit) : nil
        return json(200, DepositsPage(items: page.map { db.depositPayload($0, lang) }, nextCursor: next))
    }

    // MARK: Replies

    private func headers() -> [String: String] {
        ["Content-Type": "application/json", "Date": HTTPDate.format(now())]
    }

    private func json(_ status: Int, _ value: some Encodable) -> HTTPResponse {
        HTTPResponse(status: status, headers: headers(), body: (try? encoder.encode(value)) ?? Data())
    }

    private func error(_ status: Int, _ code: String, _ message: String, fields: [String: String]? = nil, until: Date? = nil) -> HTTPResponse {
        json(status, ApiErrorBody(error: .init(code: code, message: message, fields: fields, until: until)))
    }

    private func notFound() -> HTTPResponse { error(404, "not_found", "Not found") }

    struct Rejection: Error { let response: HTTPResponse }

    /// Validates the body field by field, like the web mock's Zod schemas, so a bad field is named
    /// in error.fields ({ field: "invalid" }) on every platform. JSONDecoder's own errors do not
    /// name the field on Linux.
    private func decodeBody<T: Decodable>(
        _ type: T.Type, _ request: HTTPRequest, fields: [String: @Sendable (JSONValue?) -> Bool]
    ) -> Result<T, Rejection> {
        let data = request.body ?? Data()
        guard case let .object(object)? = try? decoder.decode(JSONValue.self, from: data) else {
            return .failure(Rejection(response: error(422, "validation_failed", "Invalid request body", fields: ["body": "invalid"])))
        }
        let bad = fields.filter { !$0.value(object[$0.key]) }.map(\.key).sorted()
        if !bad.isEmpty {
            let reasons = Dictionary(uniqueKeysWithValues: bad.map { ($0, "invalid") })
            return .failure(Rejection(response: error(422, "validation_failed", "Invalid request body", fields: reasons)))
        }
        guard let decoded = try? decoder.decode(T.self, from: data) else {
            return .failure(Rejection(response: error(422, "validation_failed", "Invalid request body", fields: ["body": "invalid"])))
        }
        return .success(decoded)
    }

    private static let isInteger: @Sendable (JSONValue?) -> Bool = {
        guard case let .number(value)? = $0 else { return false }
        return value.rounded() == value && abs(value) <= Double(Money.maxMagnitude)
    }

    private static let isString: @Sendable (JSONValue?) -> Bool = {
        if case .string? = $0 { return true }
        return false
    }

    private static let isOptionalString: @Sendable (JSONValue?) -> Bool = {
        switch $0 {
        case nil, .null?, .string?: true
        default: false
        }
    }

    private static func parseQuery(_ text: String) -> [String: String] {
        var result: [String: String] = [:]
        for pair in text.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            let key = String(parts[0]).removingPercentEncoding ?? String(parts[0])
            let value = parts.count > 1 ? (String(parts[1]).removingPercentEncoding ?? String(parts[1])) : ""
            result[key] = value
        }
        return result
    }

    private static func shortID() -> String {
        String(UUID().uuidString.lowercased().prefix(8))
    }
}

#endif
