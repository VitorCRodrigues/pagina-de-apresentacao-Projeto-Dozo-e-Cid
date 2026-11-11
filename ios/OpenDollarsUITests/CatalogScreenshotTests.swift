import XCTest

/// Screenshots of the design system catalog (DesignCatalogView, DEBUG builds, `-catalog`), page by
/// page, at the default text size and at Accessibility L. The workflow runs this on the iPhone 15
/// and the iPhone SE (375 pt) in es-AR and exports the attachments from the .xcresult.
final class CatalogScreenshotTests: XCTestCase {
    func testCatalogAtTheDefaultTextSize() {
        shootCatalog(name: "10-catalogo", contentSize: nil)
    }

    func testCatalogAtAccessibilityLarge() {
        shootCatalog(name: "11-catalogo-AX-L", contentSize: "UICTContentSizeCategoryAccessibilityL")
    }

    private func shootCatalog(name: String, contentSize: String?) {
        continueAfterFailure = false
        let app = XCUIApplication()
        // Key/value pairs first and the bare flag last, so the argument domain never reads
        // "-catalog" as a key whose value is the next argument.
        app.launchArguments = []
        if let contentSize {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", contentSize]
        }
        app.launchArguments.append("-catalog")
        app.launch()

        XCTAssertTrue(app.descendants(matching: .any)["catalog.title"].waitForExistence(timeout: 30), "the catalog did not open")
        let end = app.descendants(matching: .any)["catalog.end"]
        let scrollView = app.scrollViews.firstMatch
        let device = (ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] ?? "device").replacingOccurrences(of: " ", with: "_")

        // Page down until the last section's bottom is on screen; a cap keeps a broken layout from
        // looping forever (Accessibility L makes the page several times taller).
        var page = 1
        while true {
            let attachment = XCTAttachment(screenshot: app.screenshot())
            attachment.name = String(format: "%@-%02d-%@", name, page, device)
            attachment.lifetime = .keepAlways
            add(attachment)

            if end.exists, end.frame.maxY <= app.windows.firstMatch.frame.maxY { break }
            guard page < 40 else {
                XCTFail("the end of the catalog was not reached after \(page) pages")
                break
            }
            scrollView.swipeUp(velocity: .slow)
            page += 1
        }
        app.terminate()
    }
}
