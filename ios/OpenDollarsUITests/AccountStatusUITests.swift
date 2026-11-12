import XCTest

/// T3 on screen: a screenshot of each of the eight statuses, and a document sent through the file
/// path. The simulator has no camera, so the scanner button does not show; `-documentFixture`
/// makes "Elegir de Archivos" hand over a file made in the app (the Files app cannot be filled
/// reliably), and everything after the picker is the real path: shrinking, metadata removal,
/// limits, progress, sending. draft, open and restricted land elsewhere; `-screen account` (DEBUG)
/// shows them on T3 (TODO(decisão) 35).
final class AccountStatusUITests: XCTestCase {
    // MARK: The eight statuses

    func testDraft() {
        let app = shootStatus("draft", "40-estado-1-draft")
        XCTAssertTrue(app.descendants(matching: .any)["account.continue"].exists)
        app.terminate()
    }

    func testSubmitted() { waitingStatus("submitted", "41-estado-2-submitted") }
    func testKYCReview() { waitingStatus("kyc_review", "42-estado-3-kyc_review") }
    func testIBKRPending() { waitingStatus("ibkr_pending", "43-estado-4-ibkr_pending") }

    func testActionRequired() {
        let app = shootStatus("action_required", "44-estado-5-action_required")
        XCTAssertTrue(app.descendants(matching: .any)["upload.choose.pend-dni-back"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["upload.choose.pend-address-proof"].exists)
        app.terminate()
    }

    func testOpen() { shootStatus("open", "45-estado-6-open").terminate() }
    func testRestricted() { shootStatus("restricted", "46-estado-7-restricted").terminate() }
    func testRejected() { shootStatus("rejected", "47-estado-8-rejected").terminate() }

    // MARK: Sending documents

    /// A phone photo through "Elegir de Archivos": chosen with its preview and size, sent with the
    /// bar, the connection drops halfway (`-failFirstUpload`), "Reintentar" sends it; then the
    /// second document, until "Recibimos todos los documentos".
    func testSendingDocumentsWithADroppedConnection() {
        let app = launchSignedOut(
            scenario: "action_required", options: ["-screen", "account", "-documentFixture", "photo"],
            flags: ["-failFirstUpload", "-slowUpload"])
        signIn(app, as: "lucia")
        _ = waitFor(app, "account.title")

        choose(app, for: "pend-dni-back")
        _ = waitFor(app, "upload.file", timeout: 20)
        attachScreenshot(app, name: "48-documento-elegido")

        tap(app, "upload.send.pend-dni-back")
        _ = waitFor(app, "upload.progress.pend-dni-back")
        attachScreenshot(app, name: "49-documento-enviando")

        _ = waitFor(app, "upload.retry.pend-dni-back", timeout: 30)
        XCTAssertTrue(app.descendants(matching: .any)["upload.problem.pend-dni-back"].exists)
        attachScreenshot(app, name: "50-envio-cortado")

        tap(app, "upload.retry.pend-dni-back")
        XCTAssertTrue(
            app.descendants(matching: .any)["upload.row.pend-dni-back"].waitForNonExistence(timeout: 30),
            "the sent document did not leave the list")

        choose(app, for: "pend-address-proof")
        _ = waitFor(app, "upload.file", timeout: 20)
        tap(app, "upload.send.pend-address-proof")
        _ = waitFor(app, "account.allSent", timeout: 30)
        attachScreenshot(app, name: "51-todos-enviados")
        app.terminate()
    }

    /// A file over 10 MB is refused before anything is sent, with the web's message.
    func testAFileOver10MBIsRefused() {
        let app = launchSignedOut(scenario: "action_required", options: ["-screen", "account", "-documentFixture", "tooBig"])
        signIn(app, as: "lucia")
        _ = waitFor(app, "account.title")
        choose(app, for: "pend-address-proof")
        _ = waitFor(app, "upload.problem.pend-address-proof", timeout: 20)
        let message = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "pesa más de 10 MB")).firstMatch
        XCTAssertTrue(message.exists, "the too-big message did not show")
        XCTAssertFalse(app.descendants(matching: .any)["upload.send.pend-address-proof"].exists)
        attachScreenshot(app, name: "52-archivo-muy-grande")
        app.terminate()
    }

    // MARK: Helpers

    @discardableResult
    private func shootStatus(_ scenario: String, _ name: String) -> XCUIApplication {
        let app = launchSignedOut(scenario: scenario, options: ["-screen", "account"])
        signIn(app, as: "lucia")
        _ = waitFor(app, "account.title")
        attachScreenshot(app, name: name)
        return app
    }

    /// submitted, kyc_review, ibkr_pending: "Suele tardar algunos días hábiles", and no deposit
    /// instruction anywhere.
    private func waitingStatus(_ scenario: String, _ name: String) {
        let app = shootStatus(scenario, name)
        let body = waitFor(app, "account.body")
        XCTAssertTrue(body.label.contains("días hábiles"), "unexpected text: \(body.label)")
        app.terminate()
    }

    private func choose(_ app: XCUIApplication, for item: String) {
        tap(app, "upload.choose.\(item)")
        tap(app, "upload.fromFiles")
    }

    private func tap(_ app: XCUIApplication, _ identifier: String) {
        waitFor(app, identifier, timeout: 10).tap()
    }
}
