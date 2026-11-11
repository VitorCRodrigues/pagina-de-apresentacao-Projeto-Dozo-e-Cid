import Foundation

// TODO(decisão): formatting lives in the core and is deterministic, without NumberFormatter,
// whose ICU data differs between Linux, Windows and iOS (ios/docs/decisions.md, item 2). The
// output is byte for byte what Intl gives the web for es-AR, pt-BR and en-US.

/// A piece of a formatted amount, so the UI can style the cents apart (same baseline, smaller).
/// Kinds follow Intl.NumberFormat's formatToParts.
public struct MoneyPart: Sendable, Equatable {
    public enum Kind: Sendable, Equatable {
        case minusSign, currency, literal, integer, group, decimal, fraction
    }

    public let kind: Kind
    public let value: String
}

public enum MoneyFormatter {
    /// The true minus sign (U+2212), as wide as the figures, so a negative value lines up in a
    /// tabular column. Intl writes a hyphen-minus; the web swaps it the same way.
    public static let minusSign = "\u{2212}"

    /// "US$ 1.234,56" in es/pt (no-break space), "$1,234.56" in en, "−US$ 5,00" when negative.
    public static func format(_ money: Money, locale: AppLocale) -> String {
        parts(money, locale: locale).map(\.value).joined()
    }

    public static func parts(_ money: Money, locale: AppLocale) -> [MoneyPart] {
        let style = NumberStyle.of(locale)
        let decimal = money.decimalString
        let unsigned = decimal.hasPrefix("-") ? String(decimal.dropFirst()) : decimal
        let pieces = unsigned.split(separator: ".")
        let integerDigits = String(pieces[0])
        let fraction = String(pieces[1])

        var result: [MoneyPart] = []
        if money.cents < 0 { result.append(MoneyPart(kind: .minusSign, value: minusSign)) }
        result.append(MoneyPart(kind: .currency, value: style.currencySymbol))
        if !style.currencySpacing.isEmpty {
            result.append(MoneyPart(kind: .literal, value: style.currencySpacing))
        }
        for (index, group) in NumberStyle.groups(of: integerDigits).enumerated() {
            if index > 0 { result.append(MoneyPart(kind: .group, value: String(style.groupSeparator))) }
            result.append(MoneyPart(kind: .integer, value: String(group)))
        }
        result.append(MoneyPart(kind: .decimal, value: String(style.decimalSeparator)))
        result.append(MoneyPart(kind: .fraction, value: fraction))
        return result
    }

    /// A saved amount as the client would type it (no symbol, no grouping), so AmountParser
    /// reads it back: 50000 -> "500,00" in es/pt, "500.00" in en.
    public static func inputText(_ money: Money, locale: AppLocale) -> String {
        let style = NumberStyle.of(locale)
        return money.decimalString.replacingOccurrences(of: ".", with: String(style.decimalSeparator))
    }

    /// "US$" in es and pt, "$" in en.
    public static func currencySymbol(locale: AppLocale) -> String {
        NumberStyle.of(locale).currencySymbol
    }
}
