import XCTest

extension XCTestCase {
    /// Launches the app signed out, with no session left by a previous test (`-resetSession`
    /// treats the launch as the first after install, which wipes the Keychain). Key/value pairs
    /// first, bare flags last.
    func launchSignedOut(scenario: String = "open", flags: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-scenario", scenario, "-resetSession"] + flags
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

    /// Kept in the .xcresult (lifetime .keepAlways); the workflow exports it per device.
    func attachScreenshot(_ app: XCUIApplication, name: String) {
        let device = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] ?? "device"
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "\(name)-\(device.replacingOccurrences(of: " ", with: "_"))"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
