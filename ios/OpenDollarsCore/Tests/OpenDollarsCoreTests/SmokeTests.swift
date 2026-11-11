import Testing
@testable import OpenDollarsCore

@Test func apiBasePathMatchesTheContract() {
    // PRD section 8: base /api/v1.
    #expect(OpenDollarsCore.apiBasePath == "/api/v1")
}
