// TODO(api): CostLine.percent arrives as a Double (0.011 = 1.1%). Propose to Dozo that it comes
// in integer basis points instead (ios/docs/decisions.md, TODO(api) 1). Until then the ratio is
// display-only and never enters a computation.

/// Display-only ratios as percentages, as Intl writes them: "1,1%" in es/pt, "0.3%" in en.
///
/// Rounding works on the shortest decimal text of the Double ("0.12345"), not on the binary
/// value (0.1234499…), and rounds half away from zero, like Intl. So the output matches the web
/// on every platform.
public enum PercentFormatter {
    /// `digits` fixes the decimals (a column that must line up); by default 1 to 2 decimals.
    public static func format(_ ratio: Double, locale: AppLocale, digits: Int? = nil) -> String {
        // JSON cannot carry NaN or infinity, so a non-finite ratio never comes from the API.
        guard ratio.isFinite else { return "" }
        let minDigits = digits ?? 1
        let maxDigits = digits ?? 2
        let style = NumberStyle.of(locale)

        var (integer, fraction) = shiftedDecimal(ratio.magnitude, by: 2)
        if fraction.count > maxDigits {
            let roundUp = fraction[fraction.index(fraction.startIndex, offsetBy: maxDigits)] >= "5"
            var kept = integer + fraction.prefix(maxDigits)
            if roundUp { kept = incremented(kept) }
            integer = String(kept.dropLast(maxDigits))
            fraction = String(kept.suffix(maxDigits))
        }
        while fraction.count > minDigits, fraction.hasSuffix("0") { fraction.removeLast() }
        fraction += String(repeating: "0", count: max(0, minDigits - fraction.count))

        integer = String(integer.drop(while: { $0 == "0" }))
        if integer.isEmpty { integer = "0" }
        let grouped = NumberStyle.groups(of: integer).joined(separator: String(style.groupSeparator))
        let isZero = (integer + fraction).allSatisfy { $0 == "0" }
        let sign = ratio < 0 && !isZero ? "-" : ""
        let body = fraction.isEmpty ? grouped : "\(grouped)\(style.decimalSeparator)\(fraction)"
        return "\(sign)\(body)%"
    }

    /// The decimal digits of a non-negative Double with the point moved `places` to the right:
    /// 0.011 by 2 -> ("1", "1"); 1e-05 by 2 -> ("0", "001").
    private static func shiftedDecimal(_ value: Double, by places: Int) -> (String, String) {
        let text = value.description // shortest round-trip form: "0.011", "1e-05", "1.5e+20"
        let parts = text.split(separator: "e")
        let mantissa = parts[0]
        let exponent = parts.count > 1 ? Int(parts[1]) ?? 0 : 0

        let mantissaPieces = mantissa.split(separator: ".", omittingEmptySubsequences: false)
        let digits = mantissaPieces.joined()
        let point = mantissaPieces[0].count + exponent + places

        if point <= 0 {
            return ("0", String(repeating: "0", count: -point) + digits)
        }
        if point >= digits.count {
            return (digits + String(repeating: "0", count: point - digits.count), "")
        }
        let index = digits.index(digits.startIndex, offsetBy: point)
        return (String(digits[..<index]), String(digits[index...]))
    }

    /// "0999" -> "1000"; "99" -> "100".
    private static func incremented(_ digits: String) -> String {
        var result = Array(digits)
        var index = result.count - 1
        while index >= 0 {
            if result[index] == "9" {
                result[index] = "0"
                index -= 1
            } else {
                result[index] = Character(String(result[index].wholeNumberValue! + 1))
                return String(result)
            }
        }
        return "1" + String(result)
    }
}
