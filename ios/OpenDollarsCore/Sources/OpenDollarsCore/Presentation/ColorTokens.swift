import Foundation

/// The brand's colour tokens as sRGB hex values: the same names and values as
/// web/src/styles/tokens.css (checked by TokenParityTests). The app's ODColor builds its SwiftUI
/// colours from these, so the contrast tests check the exact colours the app draws.
///
/// Green and brick are status colours (done, link, invested; error, returned). Neither ever
/// signals a gain or a loss.
public enum ColorToken: String, CaseIterable, Sendable, CustomStringConvertible {
    // Brand
    case navy900, green700, gold500, cream50, graphite900
    // Brand, derived
    case navy800, navy50, paper, white
    // Warm greys
    case gray50, gray100, gray200, gray500, gray600
    // Status
    case amber700, amber50, brick700, brick50

    public var hex: UInt32 {
        switch self {
        case .navy900: 0x0B1F3A
        case .green700: 0x1F6F54
        case .gold500: 0xC9A227
        case .cream50: 0xF7F4EE
        case .graphite900: 0x1C1C1C
        case .navy800: 0x162C4D
        case .navy50: 0xE6EAF0
        case .paper: 0xFCFBF8
        case .white: 0xFFFFFF
        case .gray50: 0xF1EDE5
        case .gray100: 0xE9E4DA
        case .gray200: 0xDDD6CA
        case .gray500: 0x8A8276
        case .gray600: 0x6A6258
        case .amber700: 0x8A5A00
        case .amber50: 0xF5EAD2
        case .brick700: 0xA23B2A
        case .brick50: 0xF5E2DC
        }
    }

    /// The web's token name (navy900 → "navy-900", paper → "paper").
    public var webName: String {
        guard let digit = rawValue.firstIndex(where: \.isNumber) else { return rawValue }
        return rawValue[..<digit] + "-" + rawValue[digit...]
    }

    /// sRGB channels from 0 to 1.
    public var components: (red: Double, green: Double, blue: Double) {
        (Double((hex >> 16) & 0xFF) / 255, Double((hex >> 8) & 0xFF) / 255, Double(hex & 0xFF) / 255)
    }

    public var description: String { rawValue }
}

/// WCAG 2.1 contrast ratio.
public enum Contrast {
    public static func ratio(_ a: UInt32, _ b: UInt32) -> Double {
        let (high, low) = (max(luminance(a), luminance(b)), min(luminance(a), luminance(b)))
        return (high + 0.05) / (low + 0.05)
    }

    static func luminance(_ hex: UInt32) -> Double {
        func channel(_ value: UInt32) -> Double {
            let c = Double(value & 0xFF) / 255
            return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(hex >> 16) + 0.7152 * channel(hex >> 8) + 0.0722 * channel(hex)
    }
}

public struct ContrastPair: Sendable, CustomStringConvertible {
    public enum Minimum: Sendable, Equatable {
        /// 4.5:1, normal text.
        case text
        /// 3:1, large text (24 pt, or 18.66 pt bold) and boundaries of controls.
        case nonText

        public var ratio: Double { self == .text ? 4.5 : 3 }
    }

    public let foreground: ColorToken
    public let background: ColorToken
    public let minimum: Minimum
    public let use: String

    public var description: String { "\(foreground) on \(background)" }
}

/// The approved foreground/background pairings (web/src/styles/contrast.ts). A pairing not in
/// this list is not used. Gold appears only on navy: never as text on cream (decisions 10, 19).
public enum ColorPairs {
    public static let approved: [ContrastPair] = [
        pair(.graphite900, .cream50, .text, "Body text"),
        pair(.graphite900, .paper, .text, "Body text on paper"),
        pair(.navy900, .cream50, .text, "Titles, secondary button"),
        pair(.navy900, .gray50, .text, "Secondary button, pressed"),
        pair(.gray600, .cream50, .text, "Secondary text, placeholder"),
        pair(.gray600, .paper, .text, "Secondary text on a field"),
        pair(.gray600, .gray50, .text, "Countdown, running"),
        pair(.gray500, .cream50, .nonText, "Input border"),
        pair(.gray500, .paper, .nonText, "Input border on the field fill"),
        // Disabled controls (gray500 on gray100) are exempt from contrast (WCAG 1.4.3), as on the web.
        pair(.green700, .cream50, .text, "Links, done, invested"),
        pair(.green700, .paper, .text, "Links on paper"),
        pair(.amber700, .cream50, .text, "Warning note title"),
        pair(.amber700, .amber50, .text, "Countdown, last minute"),
        pair(.brick700, .cream50, .text, "Error note title, field error, returned"),
        pair(.brick700, .paper, .text, "Field error on the field fill"),
        pair(.brick700, .brick50, .text, "Countdown, expired"),
        pair(.graphite900, .navy50, .text, "Selected text"),
        pair(.cream50, .navy900, .text, "Primary button, total balance"),
        pair(.cream50, .navy800, .text, "Primary button, pressed"),
        pair(.gold500, .navy900, .text, "Total label on the balance block"),
        pair(.white, .brick700, .text, "Destructive button"),
        pair(.navy900, .cream50, .nonText, "Focus ring"),
    ]

    private static func pair(_ fg: ColorToken, _ bg: ColorToken, _ minimum: ContrastPair.Minimum, _ use: String) -> ContrastPair {
        ContrastPair(foreground: fg, background: bg, minimum: minimum, use: use)
    }
}
