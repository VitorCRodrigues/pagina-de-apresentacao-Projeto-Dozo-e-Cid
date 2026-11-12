import Foundation

/// Which language the app speaks (web: locale-preference.ts): a choice made on this device > the
/// account's language (GET /me) > the system's (which on iOS includes the per-app language set in
/// Settings).
public enum LocalePreference {
    public static func resolve(explicit: AppLocale?, account: AppLocale?, system: AppLocale) -> AppLocale {
        explicit ?? account ?? system
    }
}

/// The language chosen on this device, and only that: what was detected is never stored. A UI
/// preference, not personal data, so it lives in UserDefaults and survives signing out, like the
/// web's localStorage (TODO(decisão) 15). The key is the web's.
public struct LocaleChoiceStore {
    public static let key = "od.locale.choice"

    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    public func read() -> AppLocale? {
        defaults.string(forKey: Self.key).flatMap(AppLocale.init(rawValue:))
    }

    /// nil clears the choice, so the account's or the system's language applies again.
    public func save(_ locale: AppLocale?) {
        if let locale {
            defaults.set(locale.rawValue, forKey: Self.key)
        } else {
            defaults.removeObject(forKey: Self.key)
        }
    }
}
