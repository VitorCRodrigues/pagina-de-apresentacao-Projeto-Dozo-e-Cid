import Foundation

/// What the client types in an amount field, read in their locale: "1.234,5" in es/pt,
/// "1,234.50" in en. Anything ambiguous or out of range is nil, never a guess.
/// Same grammar as the web's parseAmountToCents: an optional currency symbol and spaces anywhere,
/// a whole part (plain digits, or 1–3 digits followed by groups of exactly 3), and an optional
/// fraction of 1 or 2 digits. No sign: an amount to send is never negative.
public enum AmountParser {
    public static func cents(from input: String, locale: AppLocale) -> Money? {
        let style = NumberStyle.of(locale)
        let text = String(
            input
                .replacingOccurrences(of: "US$", with: "")
                .replacingOccurrences(of: "$", with: "")
                .filter { !$0.isWhitespace })
        if text.isEmpty { return nil }

        let halves = text.split(separator: style.decimalSeparator, omittingEmptySubsequences: false)
        guard halves.count <= 2 else { return nil }
        let wholeText = halves[0]
        let fraction = halves.count == 2 ? halves[1] : ""

        if halves.count == 2 {
            guard (1...2).contains(fraction.count), fraction.allSatisfy({ $0.isASCIIDigit }) else { return nil }
        }
        guard let whole = wholeDigits(wholeText, groupSeparator: style.groupSeparator) else { return nil }

        let digits = whole + fraction + String(repeating: "0", count: 2 - fraction.count)
        guard let cents = Int64(digits) else { return nil }
        return try? Money(validating: cents)
    }

    /// "1.234" (es) -> "1234"; "1234" -> "1234"; "1.23" or "" -> nil.
    private static func wholeDigits(_ text: Substring, groupSeparator: Character) -> String? {
        let groups = text.split(separator: groupSeparator, omittingEmptySubsequences: false)
        guard groups.allSatisfy({ !$0.isEmpty && $0.allSatisfy({ $0.isASCIIDigit }) }) else { return nil }
        if groups.count > 1 {
            guard groups[0].count <= 3, groups.dropFirst().allSatisfy({ $0.count == 3 }) else { return nil }
        }
        return groups.joined()
    }
}

extension Character {
    var isASCIIDigit: Bool { isASCII && isNumber }
}
