/// The contract's `Locale` ("es" | "pt" | "en"), renamed so it does not shadow Foundation.Locale.
/// ES is the default (CLAUDE.md).
public enum AppLocale: String, Sendable, Hashable, Codable, CaseIterable {
    case es, pt, en

    public static let `default`: AppLocale = .es

    /// A language tag ("pt-BR", "en", nil) to a supported locale; ES otherwise.
    public init(languageTag: String?) {
        let primary = languageTag?.split(whereSeparator: { $0 == "-" || $0 == "_" }).first.map(String.init)
        self = primary.flatMap(AppLocale.init(rawValue:)) ?? .default
    }
}

/// Number punctuation per locale, as Intl writes it for es-AR, pt-BR and en-US (PRD section 9).
struct NumberStyle: Sendable {
    let groupSeparator: Character
    let decimalSeparator: Character
    let currencySymbol: String
    /// Between the symbol and the figures: a no-break space in es/pt, nothing in en.
    let currencySpacing: String

    static func of(_ locale: AppLocale) -> NumberStyle {
        switch locale {
        case .es, .pt:
            NumberStyle(groupSeparator: ".", decimalSeparator: ",", currencySymbol: "US$", currencySpacing: "\u{00A0}")
        case .en:
            NumberStyle(groupSeparator: ",", decimalSeparator: ".", currencySymbol: "$", currencySpacing: "")
        }
    }

    /// "1234567" -> ["1", "234", "567"]
    static func groups(of integerDigits: String) -> [Substring] {
        var groups: [Substring] = []
        var end = integerDigits.endIndex
        while end > integerDigits.startIndex {
            let start = integerDigits.index(end, offsetBy: -3, limitedBy: integerDigits.startIndex) ?? integerDigits.startIndex
            groups.insert(integerDigits[start..<end], at: 0)
            end = start
        }
        return groups.isEmpty ? ["0"] : groups
    }
}
