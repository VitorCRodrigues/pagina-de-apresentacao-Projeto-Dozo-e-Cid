import XCTest

/// Screenshots of the phase 0 screens, run in Spanish (the workflow passes -testLanguage es
/// -testRegion AR) on each simulator of the workflow. Every image is kept as an XCTAttachment
/// (lifetime .keepAlways); the workflow exports them from the .xcresult.
final class ScreenshotTests: XCTestCase {
    func testHomeWithAnOpenAccount() {
        shoot(scenario: "open", name: "01-inicio-open", waitFor: "home.total")
    }

    func testAccountStatusWhileIBKRReviews() {
        shoot(scenario: "ibkr_pending", name: "02-estado-ibkr_pending", waitFor: "account.title")
    }

    func testAccountStatusWithDocumentsRequested() {
        shoot(scenario: "action_required", name: "03-estado-action_required", waitFor: "account.title")
    }

    func testHomeWithARestrictedAccount() {
        shoot(scenario: "restricted", name: "04-inicio-restricted", waitFor: "home.total")
    }

    private func shoot(scenario: String, name: String, waitFor identifier: String) {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-scenario", scenario]
        app.launch()

        let element = app.descendants(matching: .any)[identifier]
        XCTAssertTrue(element.waitForExistence(timeout: 30), "\(identifier) did not appear for scenario \(scenario)")

        let device = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] ?? "device"
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "\(name)-\(device.replacingOccurrences(of: " ", with: "_"))"
        attachment.lifetime = .keepAlways
        add(attachment)
        app.terminate()
    }
}
