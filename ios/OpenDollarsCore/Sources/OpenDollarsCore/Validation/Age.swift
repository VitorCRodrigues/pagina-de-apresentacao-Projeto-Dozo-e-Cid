/// Minimum age check for onboarding (PRD T2: 18 years).
public enum Age {
    /// `birthDate` is "YYYY-MM-DD". Compared by calendar date, never as an instant.
    /// A 29 February birthday comes of age on 1 March in common years.
    public static func isAtLeast(birthDate: String, minAge: Int = 18, today: CalendarDate) -> Bool {
        guard let birth = CalendarDate(iso: birthDate) else { return false }
        let year = birth.year + minAge
        let comesOfAge = birth.month == 2 && birth.day == 29 && !CalendarDate.isLeap(year)
            ? CalendarDate(year: year, month: 3, day: 1)
            : CalendarDate(year: year, month: birth.month, day: birth.day)
        return comesOfAge <= today
    }
}
