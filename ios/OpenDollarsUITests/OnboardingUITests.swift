import XCTest

/// T2 on screen, in the web's "draft" scenario: Lucía's draft resumes at the address (step 3)
/// with steps 1 and 2 saved. Screenshots of every step, the resume in the middle, the waitlist of
/// step 1 and of T1, and the keyboard closed before the app switcher's snapshot.
final class OnboardingUITests: XCTestCase {
    func testTheWholeFlowWithAScreenshotOfEveryStep() {
        let app = launchSignedOut(scenario: "draft")
        signIn(app, as: "lucia")
        _ = waitFor(app, "onboarding.step.address")

        // Steps 1 and 2 are saved: Volver shows them filled.
        tap(app, "onboarding.back")
        _ = waitFor(app, "onboarding.step.personal")
        attachScreenshot(app, name: "21-onboarding-2-datos")
        tap(app, "onboarding.back")
        _ = waitFor(app, "onboarding.step.residence")
        attachScreenshot(app, name: "20-onboarding-1-residencia")
        tap(app, "onboarding.continue")
        _ = waitFor(app, "onboarding.step.personal")
        tap(app, "onboarding.continue")

        _ = waitFor(app, "onboarding.step.address")
        attachScreenshot(app, name: "22-onboarding-3-domicilio")
        fillAddress(app)
        tap(app, "onboarding.continue")

        _ = waitFor(app, "onboarding.step.suitability")
        attachScreenshot(app, name: "23-onboarding-4-perfil")
        answerQuestionnaire(app)
        tap(app, "onboarding.continue")

        _ = waitFor(app, "onboarding.step.funds")
        attachScreenshot(app, name: "24-onboarding-5-fondos")
        tap(app, "field.occupation.employee")
        tap(app, "field.sourceOfFunds.salary")
        tap(app, "field.isPep.no")
        tap(app, "onboarding.continue")

        _ = waitFor(app, "onboarding.step.identity")
        attachScreenshot(app, name: "25-onboarding-6-identidad")
        tap(app, "identity.start")
        _ = waitFor(app, "identity.approved", timeout: 15)
        tap(app, "onboarding.continue")

        _ = waitFor(app, "onboarding.step.terms")
        attachScreenshot(app, name: "26-onboarding-7-terminos")
        for id in ["terms-advisory", "terms-costs", "terms-privacy", "terms-ibkr-consent"] {
            tap(app, "terms.\(id)")
        }
        tap(app, "onboarding.continue")

        _ = waitFor(app, "onboarding.step.review")
        attachScreenshot(app, name: "27-onboarding-8-revision")
        tap(app, "onboarding.submit")

        // Submitted: the account status screen takes over.
        _ = waitFor(app, "account.title")
        attachScreenshot(app, name: "28-onboarding-enviado")
        app.terminate()
    }

    /// The draft lives on the server: signing out in the middle and back in resumes at the first
    /// unsaved step, with what was saved.
    func testResumesInTheMiddleAfterSigningOutAndIn() {
        let app = launchSignedOut(scenario: "draft")
        signIn(app, as: "lucia")
        _ = waitFor(app, "onboarding.step.address")
        fillAddress(app)
        tap(app, "onboarding.continue")
        _ = waitFor(app, "onboarding.step.suitability")
        answerQuestionnaire(app)
        tap(app, "onboarding.continue")
        _ = waitFor(app, "onboarding.step.funds")

        tap(app, "onboarding.signOut")
        signIn(app, as: "lucia")

        _ = waitFor(app, "onboarding.step.funds")
        attachScreenshot(app, name: "29-onboarding-retomada")
        tap(app, "onboarding.back")
        tap(app, "onboarding.back")
        let street = waitFor(app, "field.street")
        XCTAssertEqual(street.value as? String, "Av. Corrientes 1234")
        app.terminate()
    }

    /// PRD T2, step 1: a residence outside the pilot ends with the waitlist.
    func testAResidenceOutsideThePilotEndsInTheWaitlist() {
        let app = launchSignedOut(scenario: "draft")
        signIn(app, as: "lucia")
        _ = waitFor(app, "onboarding.step.address")
        tap(app, "onboarding.back")
        tap(app, "onboarding.back")
        _ = waitFor(app, "onboarding.step.residence")
        tap(app, "field.country")
        tap(app, "field.country.UY")
        tap(app, "onboarding.continue")
        _ = waitFor(app, "onboarding.waitlist")
        attachScreenshot(app, name: "30-onboarding-lista-de-espera")
        tap(app, "waitlist.submit")
        _ = waitFor(app, "waitlist.done")
        app.terminate()
    }

    /// T1: a client whose country is not in the pilot sees only the waitlist.
    func testAClientOutsideThePilotSeesOnlyTheWaitlist() {
        let app = launchSignedOut()
        signIn(app, as: "rafael")
        _ = waitFor(app, "waitlist.title")
        attachScreenshot(app, name: "31-no-disponible")
        tap(app, "waitlist.submit")
        _ = waitFor(app, "waitlist.done")
        app.terminate()
    }

    /// Item 8 of the plan: the keyboard sits above any app window, so the privacy shield closes it
    /// when the app leaves; back in the app, no keyboard is up.
    func testTheKeyboardIsClosedWhenTheAppLeaves() {
        let app = launchSignedOut(scenario: "draft")
        signIn(app, as: "lucia")
        _ = waitFor(app, "onboarding.step.address")
        tap(app, "field.street")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10), "the keyboard did not open")

        XCUIDevice.shared.press(.home)
        app.activate()
        _ = waitFor(app, "onboarding.step.address")
        XCTAssertFalse(app.keyboards.firstMatch.waitForExistence(timeout: 3), "the keyboard was still up after the app left")
        app.terminate()
    }

    // MARK: Helpers

    private func tap(_ app: XCUIApplication, _ identifier: String) {
        waitFor(app, identifier, timeout: 10).tap()
    }

    private func enter(_ app: XCUIApplication, _ identifier: String, _ text: String) {
        let field = waitFor(app, identifier, timeout: 10)
        field.tap()
        field.typeText(text)
    }

    private func fillAddress(_ app: XCUIApplication) {
        enter(app, "field.street", "Av. Corrientes 1234")
        enter(app, "field.city", "Buenos Aires")
        tap(app, "field.province")
        tap(app, "field.province.C")
        enter(app, "field.postalCode", "C1043AAZ")
    }

    private func answerQuestionnaire(_ app: XCUIApplication) {
        for (question, option) in [("goal", "savings"), ("horizon", "gt10"), ("income", "1k3k"), ("netWorth", "25k100k"), ("experience", "funds"), ("risk", "hold")] {
            tap(app, "question.\(question).\(option)")
        }
    }
}
