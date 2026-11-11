import OpenDollarsCore
import SwiftUI

/// Design tokens: the only colours a view may use (CLAUDE.md). Values come from the core's
/// ColorToken, the same as web/src/styles/tokens.css; approved pairings and their WCAG AA
/// minimums are in ColorPairs and checked by ContrastTests.
///
/// Green and brick mark status (done, link, invested; error, returned), never a gain or a loss.
/// No screen colours a figure by whether it went up or down.
enum ODColor {
    // Brand
    /// Titles, primary button, the balance block, focus.
    static let navy900 = Color(token: ColorToken.navy900)
    /// Links, done, invested. Never "up".
    static let green700 = Color(token: ColorToken.green700)
    /// Only the "Total" label on navy. Never text on cream, never a button (decisions 10, 19).
    static let gold500 = Color(token: ColorToken.gold500)
    /// The page.
    static let cream50 = Color(token: ColorToken.cream50)
    /// Body text and the section rule of page states.
    static let graphite900 = Color(token: ColorToken.graphite900)

    // Brand, derived
    /// Primary button pressed; hairlines inside the balance block.
    static let navy800 = Color(token: ColorToken.navy800)
    /// Text selection.
    static let navy50 = Color(token: ColorToken.navy50)
    /// Fill of text fields.
    static let paper = Color(token: ColorToken.paper)
    /// Text of the destructive button.
    static let white = Color(token: ColorToken.white)

    // Warm greys
    /// Pressed fill of the secondary button.
    static let gray50 = Color(token: ColorToken.gray50)
    /// Skeleton, disabled fill.
    static let gray100 = Color(token: ColorToken.gray100)
    /// Hairlines between statement lines (decorative).
    static let gray200 = Color(token: ColorToken.gray200)
    /// Field borders (3:1), disabled text.
    static let gray500 = Color(token: ColorToken.gray500)
    /// Secondary text, placeholders (4.5:1 on cream).
    static let gray600 = Color(token: ColorToken.gray600)

    // Status
    /// Warning: quote expiring, late deposit.
    static let amber700 = Color(token: ColorToken.amber700)
    static let amber50 = Color(token: ColorToken.amber50)
    /// Error, returned.
    static let brick700 = Color(token: ColorToken.brick700)
    static let brick50 = Color(token: ColorToken.brick50)

    /// Any token by name, for the catalog's swatches.
    static func of(_ token: ColorToken) -> Color { Color(token: token) }
}

extension Color {
    fileprivate init(token: ColorToken) {
        let c = token.components
        self.init(.sRGB, red: c.red, green: c.green, blue: c.blue, opacity: 1)
    }
}
