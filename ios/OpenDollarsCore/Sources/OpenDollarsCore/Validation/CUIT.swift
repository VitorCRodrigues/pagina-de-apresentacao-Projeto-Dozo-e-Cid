/// CUIT/CUIL (Argentina): 2-digit type, 8-digit number, 1 check digit.
/// The pilot opens accounts for individuals only, so company prefixes (30, 33, 34) are rejected.
public enum CUIT {
    private static let personPrefixes: Set<String> = ["20", "23", "24", "25", "26", "27"]
    private static let weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

    /// Drops dashes and whitespace only; any other character makes the value invalid.
    public static func normalize(_ value: String) -> String {
        String(value.filter { $0 != "-" && !$0.isWhitespace })
    }

    public static func isValid(_ value: String) -> Bool {
        let digits = normalize(value)
        guard digits.count == 11, digits.allSatisfy({ $0.isASCIIDigit }),
              personPrefixes.contains(String(digits.prefix(2)))
        else { return false }

        let numbers = digits.compactMap(\.wholeNumberValue)
        let sum = zip(weights, numbers).reduce(0) { $0 + $1.0 * $1.1 }
        let check = 11 - sum % 11
        if check == 10 { return false }
        return (check == 11 ? 0 : check) == numbers[10]
    }

    /// "20123456786" -> "20-12345678-6"
    public static func format(_ value: String) -> String {
        let digits = Array(normalize(value))
        guard digits.count == 11 else { return normalize(value) }
        return "\(String(digits[0..<2]))-\(String(digits[2..<10]))-\(digits[10])"
    }
}
