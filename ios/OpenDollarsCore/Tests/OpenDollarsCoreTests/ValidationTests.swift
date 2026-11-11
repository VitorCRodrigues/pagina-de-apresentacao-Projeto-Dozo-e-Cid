import Testing
@testable import OpenDollarsCore

// Port of web/src/lib/cuit.test.ts.
@Suite struct CUITTests {
    @Test func acceptsAValidNumberWithOrWithoutSeparators() {
        #expect(CUIT.isValid("20-12345678-6"))
        #expect(CUIT.isValid("20123456786"))
        #expect(CUIT.isValid("20 12345678 6"))
    }

    @Test func rejectsAWrongCheckDigit() {
        #expect(!CUIT.isValid("20123456780"))
    }

    @Test func rejectsCompanyPrefixesThePilotOpensAccountsForIndividualsOnly() {
        #expect(!CUIT.isValid("30123456781"))
    }

    @Test func rejectsTheWrongLengthAndStrayCharacters() {
        #expect(!CUIT.isValid("2012345678"))
        #expect(!CUIT.isValid("201234567861"))
        #expect(!CUIT.isValid("20-1234567a-6"))
        #expect(!CUIT.isValid(""))
        #expect(!CUIT.isValid("２0123456786")) // full-width digit
    }

    @Test func rejectsARemainderThatGivesCheckDigit10() {
        // 20-00000001-?: the weighted sum is 12, remainder 1, so no single digit is valid.
        for digit in 0...9 {
            #expect(!CUIT.isValid("2000000001\(digit)"))
        }
    }

    @Test func normalizesAndFormats() {
        #expect(CUIT.normalize(" 20-12345678-6 ") == "20123456786")
        #expect(CUIT.format("20123456786") == "20-12345678-6")
    }
}

// Port of web/src/lib/age.test.ts. "Today" is a calendar date, never an instant, so the result
// does not depend on the device's time zone.
@Suite struct AgeTests {
    let today = CalendarDate(year: 2026, month: 10, day: 27)

    @Test func countsThe18thBirthdayItselfAsOldEnough() {
        #expect(Age.isAtLeast(birthDate: "2008-10-27", minAge: 18, today: today))
        #expect(!Age.isAtLeast(birthDate: "2008-10-28", minAge: 18, today: today))
    }

    @Test func defaultsTo18Years() {
        #expect(Age.isAtLeast(birthDate: "2008-10-27", today: today))
    }

    @Test func treatsA29FebruaryBirthdayAs1MarchInCommonYears() {
        #expect(!Age.isAtLeast(birthDate: "2008-02-29", minAge: 18, today: CalendarDate(year: 2026, month: 2, day: 28)))
        #expect(Age.isAtLeast(birthDate: "2008-02-29", minAge: 18, today: CalendarDate(year: 2026, month: 3, day: 1)))
    }

    @Test func rejectsFutureAndImpossibleDates() {
        #expect(!Age.isAtLeast(birthDate: "2030-01-01", minAge: 18, today: today))
        #expect(!Age.isAtLeast(birthDate: "2008-13-01", minAge: 18, today: today))
        #expect(!Age.isAtLeast(birthDate: "2007-02-30", minAge: 18, today: today))
        #expect(!Age.isAtLeast(birthDate: "27/10/2008", minAge: 18, today: today))
        #expect(!Age.isAtLeast(birthDate: "2008-1-27", minAge: 18, today: today))
    }
}

@Suite struct CalendarDateTests {
    @Test func parsesOnlyRealISODates() {
        #expect(CalendarDate(iso: "2024-02-29") == CalendarDate(year: 2024, month: 2, day: 29))
        #expect(CalendarDate(iso: "2023-02-29") == nil)
        #expect(CalendarDate(iso: "1900-02-29") == nil) // century, not a leap year
        #expect(CalendarDate(iso: "2000-02-29") != nil) // divisible by 400
        #expect(CalendarDate(iso: "2026-04-31") == nil)
    }

    @Test func ordersByCalendar() {
        #expect(CalendarDate(year: 2026, month: 1, day: 31) < CalendarDate(year: 2026, month: 2, day: 1))
    }
}
