import Foundation

/// How far the device clock is from the server's, from a response's Date header
/// (api-gaps.md, item 8). The header has whole seconds, so differences under one second are
/// noise. The server's 409 quote_expired stays the final word; this only keeps the quote
/// countdown honest on a device whose clock is off.
public enum ClockOffset {
    /// Seconds to add to the device clock to get the server's; 0 without a usable header.
    public static func offset(dateHeader: String?, receivedAt: Date) -> TimeInterval {
        guard let dateHeader, let server = HTTPDate.parse(dateHeader) else { return 0 }
        let offset = server.timeIntervalSince(receivedAt)
        return abs(offset) < 1 ? 0 : offset
    }
}

/// The HTTP date format (IMF-fixdate, RFC 9110): "Tue, 10 Nov 2026 21:00:00 GMT".
/// Parsed by hand, so it never depends on the device's locale or calendar settings.
public enum HTTPDate {
    private static let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    public static func parse(_ text: String) -> Date? {
        let parts = text.split(separator: " ")
        guard parts.count == 6, parts[0].hasSuffix(","), parts[5] == "GMT",
              let day = Int(parts[1]), let monthIndex = months.firstIndex(of: String(parts[2])),
              let year = Int(parts[3])
        else { return nil }
        let time = parts[4].split(separator: ":")
        guard time.count == 3, let hour = Int(time[0]), let minute = Int(time[1]), let second = Int(time[2]),
              (0..<24).contains(hour), (0..<60).contains(minute), (0...60).contains(second),
              (1...CalendarDate.daysIn(month: monthIndex + 1, year: year)).contains(day)
        else { return nil }

        let days = daysSinceEpoch(year: year, month: monthIndex + 1, day: day)
        return Date(timeIntervalSince1970: TimeInterval(days * 86_400 + hour * 3_600 + minute * 60 + second))
    }

    private static let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    /// Whole seconds, always GMT, English names whatever the device's locale.
    public static func format(_ date: Date) -> String {
        let seconds = Int(date.timeIntervalSince1970.rounded(.down))
        let days = Int((Double(seconds) / 86_400).rounded(.down))
        let secondOfDay = seconds - days * 86_400
        let (year, month, day) = civil(fromDays: days)
        let weekday = weekdays[((days % 7) + 7 + 4) % 7] // 1970-01-01 was a Thursday
        func two(_ value: Int) -> String { value < 10 ? "0\(value)" : "\(value)" }
        return "\(weekday), \(two(day)) \(months[month - 1]) \(year) "
            + "\(two(secondOfDay / 3_600)):\(two(secondOfDay % 3_600 / 60)):\(two(secondOfDay % 60)) GMT"
    }

    /// The civil date of a day count since 1970-01-01 (inverse of daysSinceEpoch).
    static func civil(fromDays days: Int) -> (year: Int, month: Int, day: Int) {
        let shifted = days + 719_468
        let era = (shifted >= 0 ? shifted : shifted - 146_096) / 146_097
        let dayOfEra = shifted - era * 146_097
        let yearOfEra = (dayOfEra - dayOfEra / 1_460 + dayOfEra / 36_524 - dayOfEra / 146_096) / 365
        let dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100)
        let shiftedMonth = (5 * dayOfYear + 2) / 153
        let day = dayOfYear - (153 * shiftedMonth + 2) / 5 + 1
        let month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9
        return (yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day)
    }

    /// Days from 1970-01-01 to the given civil date (proleptic Gregorian), no calendar API.
    static func daysSinceEpoch(year: Int, month: Int, day: Int) -> Int {
        let y = month <= 2 ? year - 1 : year
        let era = (y >= 0 ? y : y - 399) / 400
        let yearOfEra = y - era * 400
        let shiftedMonth = month > 2 ? month - 3 : month + 9
        let dayOfYear = (153 * shiftedMonth + 2) / 5 + day - 1
        let dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear
        return era * 146_097 + dayOfEra - 719_468
    }
}
