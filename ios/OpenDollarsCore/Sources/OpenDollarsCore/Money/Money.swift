/// An amount of US dollars in integer cents (PRD section 8: `amountCents: number`, as in the
/// backend's ledger.ts). Floating point never touches an amount: sums and percentages stay in
/// integers, and text goes through `decimalString` or `MoneyFormatter`.
///
/// Decoding is strict: a JSON value that is not an integer (`250.5`, `"25000"`, `null`) or that
/// lies outside the range the TypeScript backend can send exactly fails the whole response.
public struct Money: Sendable, Hashable, Comparable, Codable, CustomStringConvertible {
    /// `Number.MAX_SAFE_INTEGER`: the largest integer a TypeScript backend sends exactly.
    public static let maxMagnitude: Int64 = 9_007_199_254_740_991

    public static let zero = Money(cents: 0)

    public let cents: Int64

    /// For values known to be in range (literals, results of checked arithmetic).
    public init(cents: Int64) {
        precondition(Money.isInRange(cents), "Money out of range: \(cents)")
        self.cents = cents
    }

    /// For values from outside (a parser, a computation): throws instead of trapping.
    public init(validating cents: Int64) throws {
        guard Money.isInRange(cents) else { throw MoneyError.outOfRange }
        self.cents = cents
    }

    static func isInRange(_ cents: Int64) -> Bool {
        cents.magnitude <= UInt64(maxMagnitude)
    }

    // MARK: Arithmetic, in integers only

    public static func sum<S: Sequence>(_ values: S) throws -> Money where S.Element == Money {
        var total: Int64 = 0
        for value in values {
            let (result, overflow) = total.addingReportingOverflow(value.cents)
            guard !overflow else { throw MoneyError.outOfRange }
            total = result
        }
        return try Money(validating: total)
    }

    public func adding(_ other: Money) throws -> Money {
        try Money.sum([self, other])
    }

    public func subtracting(_ other: Money) throws -> Money {
        try Money.sum([self, Money(cents: -other.cents)])
    }

    /// A percentage of this amount, rounded half up, in integers only (30 bp = 0.30%).
    /// Same rule as the web's applyBasisPoints: floor((cents × bp + 5000) / 10000).
    public func applyingBasisPoints(_ basisPoints: Int64) throws -> Money {
        let (product, overflow) = cents.multipliedReportingOverflow(by: basisPoints)
        guard !overflow else { throw MoneyError.outOfRange }
        let (shifted, overflow2) = product.addingReportingOverflow(5000)
        guard !overflow2 else { throw MoneyError.outOfRange }
        return try Money(validating: Money.floorDivide(shifted, by: 10000))
    }

    private static func floorDivide(_ a: Int64, by b: Int64) -> Int64 {
        let quotient = a / b
        return (a % b != 0 && (a < 0) != (b < 0)) ? quotient - 1 : quotient
    }

    public static func < (lhs: Money, rhs: Money) -> Bool { lhs.cents < rhs.cents }

    // MARK: Text

    /// 12345 -> "123.45", -5 -> "-0.05". String work only, no division of the amount.
    public var decimalString: String {
        let digits = String(cents.magnitude)
        let padded = String(repeating: "0", count: max(0, 3 - digits.count)) + digits
        let sign = cents < 0 ? "-" : ""
        return "\(sign)\(padded.dropLast(2)).\(padded.suffix(2))"
    }

    /// Debug text without personal context; never a formatted amount for the client.
    public var description: String { "Money(\(decimalString))" }

    // MARK: Codable: a plain JSON integer

    public init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        let cents = try container.decode(Int64.self)
        guard Money.isInRange(cents) else {
            throw DecodingError.dataCorruptedError(
                in: container, debugDescription: "Money out of the contract's integer range")
        }
        self.cents = cents
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(cents)
    }
}

public enum MoneyError: Error, Equatable, Sendable {
    case outOfRange
}
