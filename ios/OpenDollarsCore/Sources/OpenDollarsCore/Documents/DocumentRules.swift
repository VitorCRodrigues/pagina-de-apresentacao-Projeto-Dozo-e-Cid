import Foundation

// T3: the documents Interactive Brokers asks for (web: features/account/document-rules.ts).
// Checked before anything is sent; the server checks again.

/// What can be sent, recognised by the file's first bytes: a name or a picker's type is only a
/// hint. HEIC from the Photos library is converted to JPEG by the app before it gets here.
public enum DocumentType: String, Sendable, Hashable, CaseIterable {
    case jpeg, png, pdf

    public static func sniff(_ data: Data) -> DocumentType? {
        let head = [UInt8](data.prefix(8))
        if head.starts(with: [0xFF, 0xD8, 0xFF]) { return .jpeg }
        if head.starts(with: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) { return .png }
        if head.starts(with: Array("%PDF-".utf8)) { return .pdf }
        return nil
    }

    public var mimeType: String {
        switch self {
        case .jpeg: "image/jpeg"
        case .png: "image/png"
        case .pdf: "application/pdf"
        }
    }

    public var isImage: Bool { self != .pdf }

    /// The name the server receives: never the client's own file name, which can carry a name or
    /// a date (CLAUDE.md, no personal data where it is not needed).
    public var uploadFileName: String {
        switch self {
        case .jpeg: "document.jpg"
        case .png: "document.png"
        case .pdf: "document.pdf"
        }
    }
}

/// The web's codes (account.upload.*), in the web's order of checking.
public enum DocumentProblem: String, Error, Sendable, Hashable {
    case empty, wrongType, tooBig

    public var copyKey: String { "account.upload.\(rawValue)" }
}

public enum DocumentRules {
    /// TODO(decisão): the same 10 MB as the web until Interactive Brokers' limits are known.
    public static let maxBytes = 10 * 1024 * 1024

    public static func problem(_ data: Data) -> DocumentProblem? {
        if data.isEmpty { return .empty }
        if DocumentType.sniff(data) == nil { return .wrongType }
        if data.count > maxBytes { return .tooBig }
        return nil
    }
}

public struct PixelSize: Sendable, Hashable {
    public var width: Int
    public var height: Int

    public init(width: Int, height: Int) {
        self.width = width
        self.height = height
    }
}

/// Every photo, from the camera, the Photos library or Files, is shrunk and re-encoded by the app
/// before the 10 MB check, so a normal phone photo is never refused for its size. About 3000 px on
/// the longer side keeps a document legible for Interactive Brokers (TODO(decisão) 32).
public enum DocumentImagePolicy {
    public static let maxPixelSide = 3000
    public static let jpegQuality = 0.8

    /// The size to draw the photo at: the same proportions, the longer side at most `maxSide`
    /// (maxPixelSide, or a smaller step of scanPageSides).
    public static func targetSize(width: Int, height: Int, maxSide: Int = maxPixelSide) -> PixelSize {
        let longer = max(width, height)
        guard longer > maxSide, width > 0, height > 0 else { return PixelSize(width: width, height: height) }
        func scaled(_ side: Int) -> Int { max(1, Int((Double(side) * Double(maxSide) / Double(longer)).rounded())) }
        return width >= height
            ? PixelSize(width: maxSide, height: scaled(height))
            : PixelSize(width: scaled(width), height: maxSide)
    }

    /// The longer side of a scanned page, tried in order: a scan is one PDF under the same
    /// 10 MB, so a long one is built again with smaller pages (1600 px is still about 190 dpi on
    /// an A4 page) instead of being refused (TODO(decisão) 36).
    public static let scanPageSides = [maxPixelSide, 2200, 1600]

    /// The first build, side by side, that fits DocumentRules.maxBytes; when none does, the last
    /// one, so the client sees the size message. nil when a build fails.
    public static func firstThatFits(_ sides: [Int], build: (Int) -> Data?) -> Data? {
        var last: Data?
        for side in sides {
            guard let data = build(side) else { return nil }
            if data.count <= DocumentRules.maxBytes { return data }
            last = data
        }
        return last
    }
}

/// A file's size as the web shows it (Intl.NumberFormat, unit kilobyte or megabyte, at most one
/// decimal, rounded half up), computed without NumberFormatter so every platform agrees
/// (decision 2).
public enum FileSizeFormatter {
    public static func format(bytes: Int, locale: AppLocale) -> String {
        let megabytes = bytes >= 1024 * 1024
        let unit = megabytes ? 1024 * 1024 : 1024
        // Tenths of the unit, rounded half up; the web shows at least 0.1 kB.
        var tenths = (bytes * 20 + unit) / (2 * unit)
        if !megabytes { tenths = max(tenths, 1) }
        let (group, decimal) = locale == .en ? (",", ".") : (".", ",")
        let whole = grouped(tenths / 10, separator: group)
        let fraction = tenths % 10
        let number = fraction == 0 ? whole : "\(whole)\(decimal)\(fraction)"
        return "\(number) \(megabytes ? "MB" : "kB")"
    }

    private static func grouped(_ value: Int, separator: String) -> String {
        let digits = Array(String(value))
        var result = ""
        for (index, digit) in digits.enumerated() {
            if index > 0, (digits.count - index) % 3 == 0 { result += separator }
            result.append(digit)
        }
        return result
    }
}
