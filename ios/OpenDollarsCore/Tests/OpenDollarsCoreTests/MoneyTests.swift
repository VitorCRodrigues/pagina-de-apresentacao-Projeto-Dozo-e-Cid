import Foundation
import Testing
@testable import OpenDollarsCore

// Port of web/src/lib/money.test.ts. Expected strings are byte for byte the web's:
// "US$\u{00A0}1.234,56" has a no-break space (as Intl writes it) and "−" is U+2212.

@Suite struct MoneyFormattingTests {
    @Test func formatsUSDPerLocaleAsInPRDSection9() {
        #expect(MoneyFormatter.format(Money(cents: 123456), locale: .es) == "US$\u{00A0}1.234,56")
        #expect(MoneyFormatter.format(Money(cents: 123456), locale: .pt) == "US$\u{00A0}1.234,56")
        #expect(MoneyFormatter.format(Money(cents: 123456), locale: .en) == "$1,234.56")
    }

    @Test func convertsCentsToADecimalStringWithoutDivision() {
        #expect(Money(cents: 0).decimalString == "0.00")
        #expect(Money(cents: 5).decimalString == "0.05")
        #expect(Money(cents: -12345).decimalString == "-123.45")
        #expect(Money(cents: 9_007_199_254_740_991).decimalString == "90071992547409.91")
    }

    @Test func writesANegativeAmountWithTheMinusSignNotAHyphen() {
        #expect(MoneyFormatter.format(Money(cents: -500), locale: .es) == "−US$\u{00A0}5,00")
        #expect(MoneyFormatter.format(Money(cents: -500), locale: .en) == "−$5.00")
        let sign = MoneyFormatter.parts(Money(cents: -500), locale: .pt).first { $0.kind == .minusSign }
        #expect(sign?.value == "−")
    }

    @Test func formatsTheSmallestAmountsExactly() {
        #expect(MoneyFormatter.format(Money(cents: 1), locale: .es) == "US$\u{00A0}0,01")
        #expect(MoneyFormatter.format(Money(cents: -1), locale: .en) == "−$0.01")
        #expect(MoneyFormatter.format(Money(cents: 99), locale: .pt) == "US$\u{00A0}0,99")
        #expect(MoneyFormatter.format(Money(cents: 100), locale: .en) == "$1.00")
    }

    @Test func groupsLargeAmounts() {
        #expect(MoneyFormatter.format(Money(cents: 123_456_789_00), locale: .es) == "US$\u{00A0}123.456.789,00")
        #expect(MoneyFormatter.format(Money(cents: 100_000_00), locale: .en) == "$100,000.00")
    }

    @Test func splitsIntoPartsSoTheUICanStyleTheCents() {
        let parts = MoneyFormatter.parts(Money(cents: 123456), locale: .es)
        #expect(parts.map(\.kind) == [.currency, .literal, .integer, .group, .integer, .decimal, .fraction])
        #expect(parts.map(\.value).joined() == "US$\u{00A0}1.234,56")
    }

    @Test func writesASavedAmountTheWayTheClientTypesItAndTheLocalesDollarSign() {
        #expect(MoneyFormatter.inputText(Money(cents: 50000), locale: .es) == "500,00")
        #expect(MoneyFormatter.inputText(Money(cents: 125050), locale: .en) == "1250.50")
        #expect(MoneyFormatter.currencySymbol(locale: .es) == "US$")
        #expect(MoneyFormatter.currencySymbol(locale: .en) == "$")
    }
}

@Suite struct MoneyArithmeticTests {
    @Test func sumsIntegersExactlyWhereFloatsWouldDrift() throws {
        #expect(0.1 + 0.2 != 0.3)
        #expect(try Money.sum([Money(cents: 10), Money(cents: 20)]) == Money(cents: 30))
        #expect(try Money.sum([]) == .zero)
    }

    // The web rejects non-integer cents at run time; here the type rules them out, so the
    // remaining failure is leaving the range the TypeScript backend can send exactly.
    @Test func rejectsSumsOutsideTheContractRange() {
        #expect(throws: MoneyError.outOfRange) {
            try Money.sum([Money(cents: Money.maxMagnitude), Money(cents: 1)])
        }
        #expect(throws: MoneyError.outOfRange) {
            try Money(validating: Money.maxMagnitude + 1)
        }
    }

    @Test func appliesBasisPointsWithIntegerRounding() throws {
        #expect(try Money(cents: 50000).applyingBasisPoints(30) == Money(cents: 150)) // 0.30% of US$500
        #expect(try Money(cents: 16667).applyingBasisPoints(30) == Money(cents: 50)) // 50.001 -> 50
        #expect(try Money(cents: 16684).applyingBasisPoints(30) == Money(cents: 50)) // 50.052 -> 50
        #expect(try Money(cents: 16834).applyingBasisPoints(30) == Money(cents: 51)) // 50.502 -> 51
        #expect(throws: MoneyError.outOfRange) {
            try Money(cents: Money.maxMagnitude).applyingBasisPoints(20000)
        }
    }

    @Test func comparesByCents() {
        #expect(Money(cents: 24999) < Money(cents: 25000))
    }
}

@Suite struct MoneyDecodingTests {
    private struct Body: Decodable { let amountCents: Money }

    private func decode(_ json: String) throws -> Money {
        try JSONDecoder().decode(Body.self, from: Data(json.utf8)).amountCents
    }

    @Test func decodesAnIntegerNumber() throws {
        #expect(try decode(#"{"amountCents": 25000}"#) == Money(cents: 25000))
        #expect(try decode(#"{"amountCents": -150}"#) == Money(cents: -150))
    }

    @Test(arguments: [
        #"{"amountCents": 250.5}"#,
        #"{"amountCents": "25000"}"#,
        #"{"amountCents": null}"#,
        #"{"amountCents": 9007199254740992}"#,
    ])
    func rejectsAnythingButAnIntegerInRange(json: String) {
        #expect(throws: (any Error).self) { try decode(json) }
    }

    @Test func encodesAsAPlainInteger() throws {
        let data = try JSONEncoder().encode(Money(cents: 49850))
        #expect(String(decoding: data, as: UTF8.self) == "49850")
    }
}

@Suite struct AmountParserTests {
    @Test func parsesTypedAmountsPerLocaleIntoCents() {
        #expect(AmountParser.cents(from: "250", locale: .es) == Money(cents: 25000))
        #expect(AmountParser.cents(from: "1.234,5", locale: .es) == Money(cents: 123450))
        #expect(AmountParser.cents(from: "1,234.50", locale: .en) == Money(cents: 123450))
        #expect(AmountParser.cents(from: "US$ 0,01", locale: .pt) == Money(cents: 1))
        #expect(AmountParser.cents(from: " 250,00 ", locale: .es) == Money(cents: 25000))
        #expect(AmountParser.cents(from: "US$\u{00A0}1.234,56", locale: .es) == Money(cents: 123456))
    }

    @Test(arguments: [
        ("1.234,5", AppLocale.en),
        ("0,001", .es),
        ("-10", .es),
        ("", .es),
        ("abc", .en),
        ("1,2,3", .en),
        ("99999999999999999", .es),
        ("1.23.456", .es),
        (",50", .es),
        ("1,", .es),
    ])
    func rejects(input: String, locale: AppLocale) {
        #expect(AmountParser.cents(from: input, locale: locale) == nil)
    }

    @Test func readsBackWhatInputTextWrites() {
        for locale in AppLocale.allCases {
            let money = Money(cents: 125050)
            #expect(AmountParser.cents(from: MoneyFormatter.inputText(money, locale: locale), locale: locale) == money)
        }
    }
}

@Suite struct PercentFormatterTests {
    @Test func formatsDisplayOnlyRatiosAsPercentages() {
        #expect(PercentFormatter.format(0.011, locale: .es) == "1,1%")
        #expect(PercentFormatter.format(0.003, locale: .en) == "0.3%")
    }

    @Test func canFixTheNumberOfDecimalsSoAColumnOfSharesLinesUp() {
        #expect(PercentFormatter.format(0.9809, locale: .es, digits: 2) == "98,09%")
        #expect(PercentFormatter.format(0, locale: .es, digits: 2) == "0,00%")
        #expect(PercentFormatter.format(0.561, locale: .es, digits: 1) == "56,1%")
        #expect(PercentFormatter.format(0.6, locale: .es, digits: 1) == "60,0%")
    }

    @Test func keepsOneToTwoDecimalsByDefault() {
        #expect(PercentFormatter.format(0.25, locale: .pt) == "25,0%")
        #expect(PercentFormatter.format(0.12345, locale: .en) == "12.35%")
    }
}
