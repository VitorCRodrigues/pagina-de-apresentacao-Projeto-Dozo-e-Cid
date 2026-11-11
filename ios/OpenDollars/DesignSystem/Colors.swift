import SwiftUI

/// Design tokens: the only place where raw colour values live (CLAUDE.md). Same values as
/// web/src/styles/tokens.css, whose contrast is checked for WCAG AA on cream-50 and paper.
enum ODColor {
    // Brand
    static let navy900 = Color(hex: 0x0B1F3A)
    static let green700 = Color(hex: 0x1F6F54)
    /// Only the "Total" label on navy; never text on cream, never a button.
    static let gold500 = Color(hex: 0xC9A227)
    static let cream50 = Color(hex: 0xF7F4EE)
    static let graphite900 = Color(hex: 0x1C1C1C)

    // Brand, derived
    static let navy800 = Color(hex: 0x162C4D)
    static let navy50 = Color(hex: 0xE6EAF0)
    /// Cards: a statement sheet on the cream desk.
    static let paper = Color(hex: 0xFCFBF8)
    static let white = Color(hex: 0xFFFFFF)

    // Warm greys
    static let gray50 = Color(hex: 0xF1EDE5)
    static let gray100 = Color(hex: 0xE9E4DA)
    /// Hairlines and card borders (decorative).
    static let gray200 = Color(hex: 0xDDD6CA)
    static let gray500 = Color(hex: 0x8A8276)
    /// Secondary text (4.5:1 on cream).
    static let gray600 = Color(hex: 0x6A6258)

    // Status
    static let amber700 = Color(hex: 0x8A5A00)
    static let amber50 = Color(hex: 0xF5EAD2)
    static let brick700 = Color(hex: 0xA23B2A)
    static let brick50 = Color(hex: 0xF5E2DC)
}

/// Radii and spacing (web: 8 px for controls, 12 px for cards and sheets).
enum ODMetric {
    static let radiusControl: CGFloat = 8
    static let radiusCard: CGFloat = 12
    /// Side gutter at the 375 pt reference width.
    static let gutter: CGFloat = 20
    static let sectionSpacing: CGFloat = 28
}

extension Color {
    fileprivate init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1)
    }
}
