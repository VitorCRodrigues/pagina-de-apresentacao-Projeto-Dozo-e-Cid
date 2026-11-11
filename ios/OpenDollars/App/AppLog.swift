import os

/// The only logging in the app (CLAUDE.md): os.Logger, never print. Log codes and counts only;
/// any value that came from the API goes with `privacy: .private`, and personal data, tokens and
/// amounts are never logged at all.
enum AppLog {
    static let app = Logger(subsystem: "com.opendollars.app", category: "app")
    static let api = Logger(subsystem: "com.opendollars.app", category: "api")
    static let session = Logger(subsystem: "com.opendollars.app", category: "session")
}
