import XCTest

extension XCTestCase {
    /// Launches the app signed out, with no session left by a previous test (`-resetSession`
    /// treats the launch as the first after install, which wipes the Keychain). Key/value pairs
    /// first (`options`, e.g. ["-screen", "account"]), bare flags last.
    func launchSignedOut(scenario: String = "open", options: [String] = [], flags: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-scenario", scenario] + options + ["-resetSession"] + flags
        app.launch()
        return app
    }

    /// "Entrar" on the entry screen, then the simulated provider's page picks who signs in.
    func signIn(_ app: XCUIApplication, as identity: String) {
        let enter = app.buttons["entry.signIn"]
        XCTAssertTrue(enter.waitForExistence(timeout: 30), "the entry screen did not appear")
        enter.tap()
        let choice = app.buttons["simulated.\(identity)"]
        XCTAssertTrue(choice.waitForExistence(timeout: 10), "the simulated provider's page did not open")
        choice.tap()
    }

    func waitFor(_ app: XCUIApplication, _ identifier: String, timeout: TimeInterval = 30) -> XCUIElement {
        let element = app.descendants(matching: .any)[identifier]
        XCTAssertTrue(element.waitForExistence(timeout: timeout), "\(identifier) did not appear")
        return element
    }

    /// Swipes `container` up until `identifier` exists and can be tapped. A lazy List (the country
    /// sheet) creates rows only when they come near the screen, and a tap on a button still under
    /// a scroll's deceleration can land nowhere; this brings it on screen first. Fails like
    /// `waitFor` when it never shows.
    @discardableResult
    func scrollTo(_ app: XCUIApplication, _ identifier: String, in container: XCUIElement, maxSwipes: Int = 15) -> XCUIElement {
        let element = app.descendants(matching: .any)[identifier]
        var swipes = 0
        while !(element.exists && element.isHittable), swipes < maxSwipes {
            container.swipeUp(velocity: .slow)
            swipes += 1
        }
        XCTAssertTrue(element.exists && element.isHittable, "\(identifier) did not come on screen after \(swipes) swipes")
        return element
    }

    /// Kept in the .xcresult (lifetime .keepAlways); the workflow exports it per device.
    func attachScreenshot(_ app: XCUIApplication, name: String) {
        let device = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] ?? "device"
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "\(name)-\(device.replacingOccurrences(of: " ", with: "_"))"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
