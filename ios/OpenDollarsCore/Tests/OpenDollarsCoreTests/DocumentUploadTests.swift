import Foundation
import Testing
@testable import OpenDollarsCore

// T3: sending a requested document (POST /account/documents, api-gaps.md), the account status
// screen for every status, and the account checked again while it waits.

private func uploadRequest(item: String, document: PreparedDocument, key: String = "key-1", token: String = "sim-lucia-t") -> HTTPRequest {
    var body = MultipartBody(boundary: "b-test")
    body.addField(name: "pendingItemId", value: item)
    body.addFile(name: "file", fileName: document.type.uploadFileName, contentType: document.type.mimeType, data: document.data)
    return HTTPRequest(
        method: .POST, path: OpenDollarsCore.apiBasePath + "/account/documents",
        headers: ["Authorization": "Bearer \(token)", "Content-Type": body.contentType, "Idempotency-Key": key, "Accept-Language": "es"],
        body: body.data)
}

private func account(_ response: HTTPResponse) throws -> Account {
    try JSONCoding.makeDecoder().decode(Account.self, from: response.body)
}

private func pdfDocument() throws -> PreparedDocument {
    try PreparedDocument.prepare(DocumentFixtures.pdf, displayName: "factura.pdf").get()
}

private final class ProgressLog: @unchecked Sendable {
    private let lock = NSLock()
    private var values: [Double] = []
    var fractions: [Double] { lock.withLock { values } }
    func add(_ value: Double) { lock.withLock { values.append(value) } }
}

private final class SleepRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var values: [Duration] = []
    var durations: [Duration] { lock.withLock { values } }
    func add(_ duration: Duration) { lock.withLock { values.append(duration) } }
}

// MARK: - MockServer

@Suite struct MockDocumentsTests {
    @Test func aSentDocumentLeavesThePendingList() async throws {
        let server = MockServer(scenario: .action_required, sleep: { _ in })
        let document = try pdfDocument()
        let response = try await server.send(uploadRequest(item: "pend-dni-back", document: document))
        #expect(response.status == 200)
        #expect(try account(response).pending.map(\.id) == ["pend-address-proof"])
        let received = await server.receivedDocuments(for: .lucia)
        #expect(received.map(\.pendingItemId) == ["pend-dni-back"])
        #expect(received.first?.data == document.data)
        #expect(received.first?.contentType == "application/pdf")
    }

    @Test func missingPartsAndUnknownItemsAreRefused() async throws {
        let server = MockServer(scenario: .action_required, sleep: { _ in })
        var noFile = try uploadRequest(item: "pend-dni-back", document: pdfDocument())
        var body = MultipartBody(boundary: "b-test")
        body.addField(name: "pendingItemId", value: "pend-dni-back")
        noFile.body = body.data
        #expect(try await server.send(noFile).status == 422)
        #expect(try await server.send(uploadRequest(item: "pend-nope", document: pdfDocument())).status == 404)
        #expect(await server.receivedDocuments(for: .lucia).isEmpty)
    }

    // TODO(api) (docs/decisions.md): the mock follows the proposal to the backend, the same
    // Idempotency-Key for the same pending item records the document once.
    @Test func theSameKeyTwiceRecordsTheDocumentOnce() async throws {
        let server = MockServer(scenario: .action_required, sleep: { _ in })
        let document = try pdfDocument()
        let first = try await server.send(uploadRequest(item: "pend-dni-back", document: document, key: "k-1"))
        let again = try await server.send(uploadRequest(item: "pend-dni-back", document: document, key: "k-1"))
        #expect(first.status == 200 && again.status == 200)
        #expect(try account(again) == account(first))
        #expect(await server.receivedDocuments(for: .lucia).count == 1)
    }

    @Test func theUploadReportsProgressUpToTheEnd() async throws {
        let server = MockServer(scenario: .action_required, sleep: { _ in })
        let log = ProgressLog()
        let response = try await server.upload(uploadRequest(item: "pend-dni-back", document: pdfDocument())) { log.add($0) }
        #expect(response.status == 200)
        #expect(log.fractions.count >= 3)
        #expect(log.fractions == log.fractions.sorted())
        #expect(log.fractions.last == 1)
    }

    // `-failFirstUpload` (DEBUG): the first upload drops halfway, as on a weak connection, so the
    // app's "Reintentar" can be seen and tested; the next one goes through.
    @Test func aDroppedUploadCanBeSimulatedOnce() async throws {
        let server = MockServer(scenario: .action_required, sleep: { _ in })
        await server.failNextUpload()
        let log = ProgressLog()
        await #expect(throws: URLError.self) {
            _ = try await server.upload(uploadRequest(item: "pend-dni-back", document: pdfDocument())) { log.add($0) }
        }
        #expect(log.fractions.last.map { $0 > 0 && $0 < 1 } == true)
        #expect(await server.receivedDocuments(for: .lucia).isEmpty)
        let retry = try await server.upload(uploadRequest(item: "pend-dni-back", document: pdfDocument())) { _ in }
        #expect(retry.status == 200)
    }

    // `-slowUpload` (DEBUG): long enough steps for a screenshot while the bar moves.
    @Test func theUploadStepsCanBeSlowedDown() async throws {
        let sleeps = SleepRecorder()
        let server = MockServer(scenario: .action_required, sleep: { sleeps.add($0) })
        _ = try await server.upload(uploadRequest(item: "pend-dni-back", document: pdfDocument())) { _ in }
        #expect(sleeps.durations == Array(repeating: .milliseconds(375), count: 4))
        await server.setUploadStep(.seconds(2))
        _ = try await server.upload(uploadRequest(item: "pend-address-proof", document: pdfDocument())) { _ in }
        #expect(sleeps.durations.suffix(4) == Array(repeating: .seconds(2), count: 4))
    }

    @Test func eachClientsDocumentsAreTheirOwn() async throws {
        let server = MockServer(scenario: .action_required, sleep: { _ in })
        _ = try await server.send(uploadRequest(item: "pend-dni-back", document: pdfDocument()))
        #expect(await server.receivedDocuments(for: .rafael).isEmpty)
    }
}

// MARK: - APIClient

@Suite struct UploadDocumentClientTests {
    private func accountReply(pending: String = "[]") -> FakeTransport.Reply {
        .response(HTTPResponse(status: 200, body: Data(#"{"status":"action_required","pending":\#(pending),"blockReasons":["ibkr_not_open"]}"#.utf8)))
    }

    @Test func sendsMultipartWithTheKeyAndReturnsTheAccount() async throws {
        let transport = FakeTransport([accountReply()])
        let client = APIClient(transport: transport, tokens: FakeTokens(token: "t1"), locale: { .es })
        let document = try pdfDocument()
        let result = try await client.uploadDocument(pendingItemId: "pend-dni-back", document: document) { _ in }
        #expect(result.status == .action_required)

        let request = try #require(await transport.requests.first)
        #expect(request.method == .POST)
        #expect(request.path == "/api/v1/account/documents")
        #expect(request.headers["Authorization"] == "Bearer t1")
        #expect(request.headers["Accept-Language"] == "es")
        #expect(request.headers["Idempotency-Key"] == document.idempotencyKey.rawValue)
        let contentType = try #require(request.headers["Content-Type"])
        #expect(contentType.hasPrefix("multipart/form-data; boundary="))
        let parts = try #require(MultipartBody.parts(of: request.body ?? Data(), contentType: contentType))
        #expect(parts.first { $0.name == "pendingItemId" }.map { String(decoding: $0.data, as: UTF8.self) } == "pend-dni-back")
        #expect(parts.first { $0.name == "file" }?.fileName == "document.pdf")
        #expect(parts.first { $0.name == "file" }?.data == document.data)
    }

    @Test func afterARenewedTokenTheSameBodyAndKeyAreSentAgain() async throws {
        let expired = FakeTransport.Reply.response(HTTPResponse(status: 401, body: Data(#"{"error":{"code":"session_expired","message":"m"}}"#.utf8)))
        let transport = FakeTransport([expired, accountReply()])
        let tokens = FakeTokens(token: "t1", refreshedToken: "t2")
        let client = APIClient(transport: transport, tokens: tokens, locale: { .es })
        _ = try await client.uploadDocument(pendingItemId: "pend-dni-back", document: pdfDocument()) { _ in }
        let requests = await transport.requests
        #expect(requests.count == 2)
        #expect(requests[1].headers["Authorization"] == "Bearer t2")
        #expect(requests[1].body == requests[0].body)
        #expect(requests[1].headers["Idempotency-Key"] == requests[0].headers["Idempotency-Key"])
        #expect(await tokens.refreshCount == 1)
    }

    @Test func aConnectionThatDropsIsANetworkError() async throws {
        for failure in [URLError(.networkConnectionLost), URLError(.timedOut), URLError(.notConnectedToInternet)] {
            let client = APIClient(transport: FakeTransport([.failure(failure)]), tokens: FakeTokens(token: "t1"), locale: { .es })
            await #expect(throws: APIError(status: 0, code: .network, message: "Network request failed")) {
                try await client.uploadDocument(pendingItemId: "pend-dni-back", document: pdfDocument()) { _ in }
            }
        }
    }
}

// MARK: - The session: choose, send, retry

@MainActor
private func signedIn(_ scenario: Scenario = .action_required) async -> Harness {
    let harness = Harness(scenario: scenario)
    await harness.model.start()
    await harness.model.signIn()
    await harness.model.loadAccount()
    return harness
}

@MainActor
@Suite struct DocumentUploadsTests {
    // The request of this phase: a phone photo with its position, sent as the client chose it,
    // reaches the server without EXIF and without GPS.
    @Test func aPhotoWithAPositionReachesTheServerWithoutIt() async throws {
        let harness = await signedIn()
        let uploads = harness.model.documents
        uploads.choose(DocumentFixtures.jpegWithGPS, displayName: "IMG_0042.jpg", for: "pend-dni-back")
        await uploads.send("pend-dni-back")

        let received = try #require(await harness.transport.server.receivedDocuments(for: .lucia).first)
        #expect(received.pendingItemId == "pend-dni-back")
        #expect(received.contentType == "image/jpeg")
        #expect(received.fileName == "document.jpg")
        #expect(!jpegSegments(received.data).contains { $0.marker == 0xE1 })
        #expect(received.data.range(of: Data("Exif".utf8)) == nil)
        #expect(received.data.range(of: Data("SampleMaker".utf8)) == nil)
        #expect(jpegScan(received.data) == jpegScan(DocumentFixtures.jpegWithGPS))
    }

    @Test func aSentDocumentUpdatesTheAccountAndClearsItsRow() async throws {
        let harness = await signedIn()
        let uploads = harness.model.documents
        uploads.choose(DocumentFixtures.pdf, displayName: "factura.pdf", for: "pend-address-proof")
        guard case .chosen(let document)? = uploads.state(of: "pend-address-proof") else {
            Issue.record("not chosen: \(String(describing: uploads.state(of: "pend-address-proof")))")
            return
        }
        #expect(document.displayName == "factura.pdf")
        await uploads.send("pend-address-proof")
        #expect(uploads.state(of: "pend-address-proof") == nil)
        guard case .loaded(let account) = harness.model.account else {
            Issue.record("account not loaded")
            return
        }
        #expect(account.pending.map(\.id) == ["pend-dni-back"])
    }

    @Test func aRefusedFileIsNeverSent() async {
        let harness = await signedIn()
        let uploads = harness.model.documents
        uploads.choose(DocumentFixtures.text, displayName: "notes.txt", for: "pend-dni-back")
        #expect(uploads.state(of: "pend-dni-back") == .rejected(.wrongType))
        await uploads.send("pend-dni-back")
        #expect(await harness.transport.server.receivedDocuments(for: .lucia).isEmpty)
    }

    @Test func aDroppedConnectionKeepsTheFileForReintentarWithTheSameKey() async throws {
        let harness = await signedIn()
        let uploads = harness.model.documents
        await harness.transport.failNextUpload(with: URLError(.networkConnectionLost))
        uploads.choose(DocumentFixtures.pdf, displayName: "factura.pdf", for: "pend-address-proof")
        await uploads.send("pend-address-proof")
        guard case .failed(let kept, let error)? = uploads.state(of: "pend-address-proof") else {
            Issue.record("not failed: \(String(describing: uploads.state(of: "pend-address-proof")))")
            return
        }
        #expect(error.code == .network)
        #expect(kept.displayName == "factura.pdf")

        await uploads.send("pend-address-proof")  // Reintentar
        #expect(uploads.state(of: "pend-address-proof") == nil)
        let keys = await harness.transport.requests
            .filter { $0.path.hasSuffix("/account/documents") }
            .map { $0.headers["Idempotency-Key"] }
        #expect(keys.count == 2)
        #expect(keys[0] != nil && keys[0] == keys[1])
        #expect(await harness.transport.server.receivedDocuments(for: .lucia).count == 1)
    }

    @Test func choosingAnotherFileAfterAFailureIsANewIntent() async throws {
        let harness = await signedIn()
        let uploads = harness.model.documents
        await harness.transport.failNextUpload(with: URLError(.timedOut))
        uploads.choose(DocumentFixtures.pdf, displayName: "a.pdf", for: "pend-address-proof")
        await uploads.send("pend-address-proof")
        uploads.choose(DocumentFixtures.jpegWithGPS, displayName: "b.jpg", for: "pend-address-proof")
        await uploads.send("pend-address-proof")
        let keys = await harness.transport.requests
            .filter { $0.path.hasSuffix("/account/documents") }
            .compactMap { $0.headers["Idempotency-Key"] }
        #expect(keys.count == 2)
        #expect(keys[0] != keys[1])
    }

    @Test func aSecondTapWhileSendingDoesNothing() async throws {
        let harness = await signedIn()
        let uploads = harness.model.documents
        await harness.transport.hold("/account/documents")
        uploads.choose(DocumentFixtures.pdf, displayName: "a.pdf", for: "pend-address-proof")
        let first = Task { await uploads.send("pend-address-proof") }
        await harness.settle()
        guard case .sending? = uploads.state(of: "pend-address-proof") else {
            Issue.record("not sending")
            return
        }
        await uploads.send("pend-address-proof")
        await harness.transport.release()
        await first.value
        let posts = await harness.transport.requests.filter { $0.path.hasSuffix("/account/documents") }
        #expect(posts.count == 1)
    }

    @Test func signingOutDropsChosenFilesAndAnAnswerArrivingLaterWritesNothing() async throws {
        let harness = await signedIn()
        let uploads = harness.model.documents
        uploads.choose(DocumentFixtures.pdf, displayName: "a.pdf", for: "pend-dni-back")
        await harness.transport.hold("/account/documents")
        uploads.choose(DocumentFixtures.pdf, displayName: "b.pdf", for: "pend-address-proof")
        let sending = Task { await uploads.send("pend-address-proof") }
        await harness.settle()

        await harness.model.signOut()
        await harness.transport.release()
        await sending.value
        #expect(uploads.state(of: "pend-dni-back") == nil)
        #expect(uploads.state(of: "pend-address-proof") == nil)
        #expect(harness.model.documents !== uploads)
        #expect(harness.model.documents.isEmpty)
        #expect(harness.model.account == .idle)
    }

    // Any exit cancels the sends under way. Client A leaves while a document is on its way and
    // client B signs in; the server then answers A's upload with 401. Nothing of A may be sent
    // again with B's token.
    @Test func aSendUnderWayWhenTheClientLeavesIsCancelledAndNeverResentWithTheNextClientsToken() async throws {
        let harness = Harness([.identity(.lucia), .identity(.rafael)], scenario: .action_required)
        await harness.model.start()
        await harness.model.signIn()
        await harness.model.loadAccount()
        let uploads = harness.model.documents
        await harness.transport.hold("/account/documents")
        await harness.transport.expireNext("/account/documents")
        uploads.choose(DocumentFixtures.pdf, displayName: "a.pdf", for: "pend-address-proof")
        let sending = Task { await uploads.send("pend-address-proof") }
        await harness.settle()
        #expect(await harness.transport.waitingCount == 1)

        await harness.model.signOut()
        await harness.model.signIn()
        guard case .ready(let me) = harness.model.phase else {
            Issue.record("client B did not sign in: \(harness.model.phase)")
            return
        }
        #expect(me.id == Fixtures.rafael.id)

        await harness.transport.release()
        await sending.value
        await harness.settle()
        let posts = await harness.transport.requests.filter { $0.path.hasSuffix("/account/documents") }
        #expect(posts.count == 1)
        #expect(await harness.transport.server.receivedDocuments(for: .rafael).isEmpty)
        #expect(await harness.transport.server.receivedDocuments(for: .lucia).isEmpty)
        #expect(uploads.state(of: "pend-address-proof") == nil)
        #expect(harness.model.documents.isEmpty)
    }

    // A photo still being shrunk when the session ends: the file must not reach the next client.
    @Test func aFileReadyAfterTheExitGoesNowhere() async {
        let harness = await signedIn()
        let previous = harness.model.documents
        await harness.model.signOut()
        previous.choose(DocumentFixtures.pdf, displayName: "a.pdf", for: "pend-address-proof")
        #expect(previous.state(of: "pend-address-proof") == nil)
        #expect(harness.model.documents.isEmpty)
    }
}

/// Uploads that report fractions, then answer; one marked `holds` waits for release().
private actor ScriptedUploads: HTTPTransport {
    struct Attempt: Sendable {
        let fractions: [Double]
        let response: HTTPResponse
        var holds = false
    }

    private var attempts: [Attempt]
    private var waiting: CheckedContinuation<Void, Never>?
    private(set) var started = 0

    init(_ attempts: [Attempt]) { self.attempts = attempts }

    func send(_ request: HTTPRequest) async throws -> HTTPResponse { try await upload(request) { _ in } }

    func upload(_ request: HTTPRequest, progress: @escaping @Sendable (Double) -> Void) async throws -> HTTPResponse {
        let attempt = attempts.removeFirst()
        started += 1
        attempt.fractions.forEach(progress)
        if attempt.holds { await withCheckedContinuation { waiting = $0 } }
        return attempt.response
    }

    func release() {
        waiting?.resume()
        waiting = nil
    }
}

@MainActor
@Suite struct UploadProgressTests {
    private let accountJSON = HTTPResponse(status: 200, body: Data(#"{"status":"action_required","pending":[],"blockReasons":["ibkr_not_open"]}"#.utf8))
    private let expired = HTTPResponse(status: 401, body: Data(#"{"error":{"code":"session_expired","message":"m"}}"#.utf8))

    /// Sends with the scripted attempts and returns the progress shown while the held one waits.
    private func progressWhileHeld(_ attempts: [ScriptedUploads.Attempt]) async -> Double? {
        let transport = ScriptedUploads(attempts)
        let client = APIClient(transport: transport, tokens: FakeTokens(token: "t1", refreshedToken: "t2"), locale: { .es })
        let uploads = DocumentUploads(client: client, isCurrent: { true }, onSent: { _ in })
        uploads.choose(DocumentFixtures.pdf, displayName: "a.pdf", for: "pend-address-proof")
        let sending = Task { await uploads.send("pend-address-proof") }
        var spins = 0
        while await transport.started < attempts.count, spins < 1000 {
            await Task.yield()
            spins += 1
        }
        for _ in 0..<100 { await Task.yield() }
        var shown: Double?
        if case .sending(_, let progress)? = uploads.state(of: "pend-address-proof") { shown = progress }
        await transport.release()
        await sending.value
        #expect(uploads.state(of: "pend-address-proof") == nil)
        return shown
    }

    // The token expired after the whole file went up (100 %): the second upload starts over,
    // and the bar follows it instead of sitting at 100 % while it runs.
    @Test func afterARenewedTokenTheBarFollowsTheSecondUpload() async {
        let shown = await progressWhileHeld([
            .init(fractions: [0.5, 1], response: expired),
            .init(fractions: [0.25], response: accountJSON, holds: true),
        ])
        #expect(shown == 0.25)
    }

    @Test func theBarMovesInOrder() async {
        let shown = await progressWhileHeld([.init(fractions: [0.1, 0.4, 0.7], response: accountJSON, holds: true)])
        #expect(shown == 0.7)
    }

    // A 10 MB upload reports every few kilobytes; the row changes only when the whole percent does.
    @Test func theBarChangesOnlyByWholePercents() async {
        let shown = await progressWhileHeld([.init(fractions: [0.301, 0.304, 0.309], response: accountJSON, holds: true)])
        #expect(shown == 0.301)
    }
}

// MARK: - T3 for every status

@Suite struct AccountStatusScreenTests {
    private func screen(_ status: AccountStatus, pending: [PendingItem] = [], masked: String? = nil) -> AccountStatusScreen {
        AccountStatusScreen(Account(status: status, ibkrAccountMasked: masked, pending: pending, blockReasons: []))
    }

    private let documentItem = PendingItem(id: "pend-dni-back", kind: .document, title: "DNI", description: "d", dueAt: nil, depositId: nil)
    private let depositItem = PendingItem(id: "pend-deposit", kind: .deposit_action, title: "Aporte", description: "d", dueAt: nil, depositId: "dep-1")

    @Test func theEightStatusesAndAnUnknownOne() {
        #expect(screen(.draft).action == .continueOnboarding)
        #expect(screen(.draft).timeline == nil)
        for status in [AccountStatus.submitted, .kyc_review, .ibkr_pending] {
            #expect(screen(status).bodyKey == "account.body.waiting")  // "Suele tardar algunos días hábiles."
            #expect(screen(status).timeline != nil)
            #expect(screen(status).action == nil)
        }
        #expect(screen(.action_required, pending: [documentItem]).documents == [documentItem])
        #expect(screen(.action_required, pending: [documentItem]).showsAllSent == false)
        #expect(screen(.action_required).showsAllSent)
        #expect(screen(.open, masked: "U****4821").accountNumber == "U****4821")
        #expect(screen(.open).action == .createPlan)
        #expect(screen(.rejected).action == .contactSupport)
        #expect(screen(.rejected).timeline == nil)
        #expect(screen(.restricted).action == .contactSupport)
        #expect(screen(.unknown("frozen")).action == .contactSupport)
        #expect(screen(.unknown("frozen")).titleKey == "account.title.unknown")
    }

    // PRD T3 and failure B2: no deposit instruction before the account is open. The screen has no
    // deposit action at all, shows only document requests, and only while documents are asked.
    @Test func noStatusEverOffersADeposit() {
        let statuses: [AccountStatus] = [.draft, .submitted, .kyc_review, .ibkr_pending, .action_required, .open, .restricted, .rejected, .unknown("frozen")]
        for status in statuses {
            let shown = screen(status, pending: [documentItem, depositItem], masked: "U****4821")
            #expect(!shown.documents.contains { $0.kind != .document })
            #expect(shown.documents.isEmpty || status == .action_required)
            #expect([nil, .continueOnboarding, .createPlan, .contactSupport].contains(shown.action))
            #expect(shown.accountNumber == nil || status == .open)
        }
    }
}

// MARK: - Checking back while waiting

@MainActor
@Suite struct AccountRefreshTests {
    @Test func onlyWaitingStatusesAreCheckedEveryMinute() {
        #expect(AccountPolling.interval == .seconds(60))
        #expect([AccountStatus.submitted, .kyc_review, .ibkr_pending, .action_required].allSatisfy(AccountPolling.isWaiting))
        #expect(![AccountStatus.draft, .open, .restricted, .rejected, .unknown("x")].contains(where: AccountPolling.isWaiting))
    }

    @Test func whenTheStatusMovesTheClientIsReloadedAndRoutingFollows() async throws {
        let harness = await signedIn(.ibkr_pending)
        await harness.transport.server.setAccountStatus(.open, for: .lucia)
        await harness.model.refreshAccount()
        guard case .ready(let me) = harness.model.phase else {
            Issue.record("not ready: \(harness.model.phase)")
            return
        }
        #expect(me.accountStatus == .open)
        #expect(Landing.for(me, liveMarkets: harness.model.config?.liveMarkets ?? []) == .tabs)
    }

    @Test func anUnchangedStatusDoesNotReloadTheClient() async {
        let harness = await signedIn(.ibkr_pending)
        let before = await harness.transport.requests.filter { $0.path.hasSuffix("/me") }.count
        await harness.model.refreshAccount()
        let after = await harness.transport.requests.filter { $0.path.hasSuffix("/me") }.count
        #expect(after == before)
    }

    // The screen's check runs in a task tied to the status on screen; the new status cancels it
    // while GET /me is still on its way. The routing must still follow.
    @Test func aCheckCancelledWhileTheClientReloadsStillMovesTheRouting() async {
        let harness = await signedIn(.ibkr_pending)
        await harness.transport.server.setAccountStatus(.open, for: .lucia)
        await harness.transport.hold("/me")
        let check = Task { await harness.model.refreshAccount() }
        await waitUntilHeld(harness)
        check.cancel()
        await harness.transport.release()
        await check.value
        await harness.settle()
        guard case .ready(let me) = harness.model.phase else {
            Issue.record("not ready: \(harness.model.phase)")
            return
        }
        #expect(me.accountStatus == .open)
    }

    // Leaving the screen cancels the check: that is not a failed request.
    @Test func aCancelledCheckIsNotReportedAsAFailure() async {
        let harness = await signedIn(.ibkr_pending)
        var events: [ClientSessionEvent] = []
        harness.model.onEvent = { events.append($0) }
        await harness.transport.hold("/account")
        let check = Task { await harness.model.refreshAccount() }
        await waitUntilHeld(harness)
        check.cancel()
        await harness.transport.release()
        await check.value
        #expect(events.isEmpty)
        guard case .loaded(let account) = harness.model.account else {
            Issue.record("the account was lost: \(harness.model.account)")
            return
        }
        #expect(account.status == .ibkr_pending)
    }

    private func waitUntilHeld(_ harness: Harness) async {
        var spins = 0
        while await harness.transport.waitingCount == 0, spins < 1000 {
            await Task.yield()
            spins += 1
        }
    }
}
