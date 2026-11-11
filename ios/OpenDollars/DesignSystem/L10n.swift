import Foundation

/// Localized text from Localizable.xcstrings. Keys are the web's i18n keys (scripts/sync-strings-from-web.py).
enum L10n {
    static func text(_ key: String) -> String {
        String(localized: String.LocalizationValue(key))
    }

    static func format(_ key: String, _ arguments: any CVarArg...) -> String {
        String(format: text(key), locale: .current, arguments: arguments)
    }

    /// Keys with plural variations (one / other).
    static func plural(_ key: String, count: Int) -> String {
        String.localizedStringWithFormat(NSLocalizedString(key, comment: ""), count)
    }
}

enum AppConstants {
    // TODO(decisão): the pilot's support channel. Email only for now (same as web/src/lib/support.ts).
    static let supportEmail = "soporte@opendollars.com"
    static let supportURL = URL(string: "mailto:\(supportEmail)")!
}
