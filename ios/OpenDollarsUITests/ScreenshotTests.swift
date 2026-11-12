import XCTest

/// Screenshots of the screens so far, run in Spanish (the workflow passes -testLanguage es
/// -testRegion AR) on each simulator of the workflow. Every image is kept as an XCTAttachment
/// (lifetime .keepAlways); the workflow exports them from the .xcresult.
final class ScreenshotTests: XCTestCase {
    func testHomeWithAnOpenAccount() {
        shootSignedIn(scenario: "open", name: "01-inicio-open", waitFor: "home.total")
    }

    // 02 and 03 (ibkr_pending, action_required) moved to AccountStatusUITests (40 to 52), with
    // the other T3 statuses and the document upload.

    func testHomeWithARestrictedAccount() {
        shootSignedIn(scenario: "restricted", name: "04-inicio-restricted", waitFor: "account.block")
    }

    func testEntryScreen() {
        let app = launchSignedOut()
        _ = waitFor(app, "entry.headline")
        attachScreenshot(app, name: "05-entrada")
        app.terminate()
    }

    /// What the app switcher shows: the brand, never the balance. XCUITest cannot read the system's
    /// snapshot, so `-privacyCover` shows the cover the app puts up when it stops being active.
    func testPrivacyCover() {
        let app = launchSignedOut(flags: ["-privacyCover"])
        signIn(app, as: "lucia")
        _ = waitFor(app, "privacy.cover")
        attachScreenshot(app, name: "06-capa")
        app.terminate()
    }

    /// Decision 14: a restricted account keeps the tabs, and Aportar shows the block instead of
    /// anything that starts a deposit.
    func testDepositTabOfARestrictedAccount() {
        let app = launchSignedOut(scenario: "restricted")
        signIn(app, as: "lucia")
        _ = waitFor(app, "home.total")
        app.tabBars.buttons.element(boundBy: 1).tap()
        _ = waitFor(app, "account.block")
        attachScreenshot(app, name: "07-aportar-restricted")
        app.terminate()
    }

    private func shootSignedIn(scenario: String, name: String, waitFor identifier: String) {
        let app = launchSignedOut(scenario: scenario)
        signIn(app, as: "lucia")
        _ = waitFor(app, identifier)
        attachScreenshot(app, name: name)
        app.terminate()
    }
}
