import Foundation
import OpenDollarsCore
import os

/// Text lookup in the app's language, which is not always the system's: a choice on this device,
/// then the account's language, then the system's (LocalePreference). Screens use the generated
/// `Strings` accessors (Generated/Strings.generated.swift); `text(_:)` with a computed key is only
/// for keys the core builds (AccountStatusCopy, AccountTimeline, ClientErrorCode.copyKey), which
/// DynamicKeyTests checks against the catalog.
enum L10n {
    private static let current = OSAllocatedUnfairLock(initialState: AppLocale.default)

    /// The language texts, formatting and Accept-Language use. Readable from any thread.
    static var locale: AppLocale { current.withLock { $0 } }

    static func use(_ locale: AppLocale) {
        current.withLock { $0 = locale }
    }

    /// Foundation's locale for the app's language: number punctuation and plural rules.
    static var foundationLocale: Locale {
        switch locale {
        case .es: Locale(identifier: "es_AR")
        case .pt: Locale(identifier: "pt_BR")
        case .en: Locale(identifier: "en_US")
        }
    }

    private static func bundle(_ locale: AppLocale) -> Bundle {
        Bundle.main.path(forResource: locale.rawValue, ofType: "lproj").flatMap(Bundle.init(path:)) ?? .main
    }

    static func text(_ key: String) -> String {
        bundle(locale).localizedString(forKey: key, value: nil, table: nil)
    }

    /// A text with placeholders, in the order the generated accessor passes them. Plural
    /// variations are resolved for the app's language.
    static func format(_ key: String, _ arguments: any CVarArg...) -> String {
        String(format: text(key), locale: foundationLocale, arguments: arguments)
    }
}

enum AppConstants {
    // TODO(decisão): the pilot's support channel. Email only for now (same as web/src/lib/support.ts).
    static let supportEmail = "soporte@opendollars.com"
    static let supportURL = URL(string: "mailto:\(supportEmail)")!
}
