import XCTest

/// Phase 3 on screen: sign-in through the simulated provider, and a second client on the same
/// device who sees nothing of the first. The core tests (ClientSessionTests) check the data
/// itself; this checks the screens.
final class SessionUITests: XCTestCase {
    func testTheSecondClientSeesNothingOfTheFirst() {
        let app = launchSignedOut()

        // Lucía signs in and sees her balance.
        signIn(app, as: "lucia")
        let luciaTotal = waitFor(app, "home.total").label
        XCTAssertFalse(luciaTotal.isEmpty)

        // She signs out from Perfil.
        app.tabBars.buttons.element(boundBy: 4).tap()
        let signOut = waitFor(app, "profile.signOut")
        signOut.tap()

        // Rafael signs in on the same device: Brazil is not in the pilot, so only the waitlist
        // (decision 25), with his own e-mail.
        signIn(app, as: "rafael")
        _ = waitFor(app, "waitlist.title")
        let email = waitFor(app, "waitlist.email")
        XCTAssertEqual(email.value as? String, "rafael.souza@example.com")

        XCTAssertFalse(app.descendants(matching: .any)["home.total"].exists, "Lucía's balance is on screen")
        let luciaTexts = NSPredicate(format: "label == %@ OR label CONTAINS[c] %@", luciaTotal, "Lucía")
        XCTAssertEqual(app.descendants(matching: .any).matching(luciaTexts).count, 0, "something of Lucía is on screen")
        attachScreenshot(app, name: "08-segundo-cliente")
        app.terminate()
    }

    /// Closing the provider's page is not an error: the entry screen stays, without the error note.
    func testClosingTheProviderPageIsNotAnError() {
        let app = launchSignedOut()
        app.buttons["entry.signIn"].firstMatch.tap()
        let cancel = waitFor(app, "simulated.cancel", timeout: 10)
        cancel.tap()
        XCTAssertTrue(app.buttons["entry.signIn"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.descendants(matching: .any)["entry.signInError"].exists)
        app.terminate()
    }

    /// A provider failure shows the entry screen's error note.
    func testAFailedSignInSaysSo() {
        let app = launchSignedOut()
        let enter = waitFor(app, "entry.signIn")
        enter.tap()
        waitFor(app, "simulated.fail", timeout: 10).tap()
        _ = waitFor(app, "entry.signInError", timeout: 10)
        app.terminate()
    }
}
