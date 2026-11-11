import CoreText
import SwiftUI
import UIKit

/// One family, Inter, as one variable file (InterVariable.ttf, axes wght 100–900 and opsz 14–32).
/// Headline styles and the isolated balance pin opsz 32, the Inter Display cut; the rest lets
/// Core Text pick the optical size from the point size. Every style scales with Dynamic Type.
/// Values in a column use tabular figures (`.monospacedDigit()`).
enum ODFont {
    private static let postScriptName = "InterVariable"
    private static let weightAxis = 0x7767_6874 // 'wght'
    private static let opticalSizeAxis = 0x6F70_737A // 'opsz'

    static func inter(size: CGFloat, weight: CGFloat, opticalSize: CGFloat? = nil, relativeTo style: UIFont.TextStyle) -> Font {
        var axes: [NSNumber: NSNumber] = [NSNumber(value: weightAxis): NSNumber(value: Double(weight))]
        if let opticalSize {
            axes[NSNumber(value: opticalSizeAxis)] = NSNumber(value: Double(opticalSize))
        }
        let descriptor = UIFontDescriptor(fontAttributes: [
            .name: postScriptName,
            UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String): axes,
        ])
        let base = UIFont(descriptor: descriptor, size: size)
        let scaled = UIFontMetrics(forTextStyle: style).scaledFont(for: base)
        return Font(scaled as CTFont)
    }

    /// Screen titles (type-title).
    static var title: Font { inter(size: 26, weight: 600, opticalSize: 32, relativeTo: .title1) }
    /// The isolated headline number: the total balance (type-value-display).
    static var valueDisplay: Font { inter(size: 40, weight: 500, opticalSize: 32, relativeTo: .largeTitle).monospacedDigit() }
    /// Cents next to the balance: same baseline, smaller and lighter, never superscript.
    static var valueDisplayCents: Font { inter(size: 24, weight: 400, opticalSize: 32, relativeTo: .title2).monospacedDigit() }
    /// Values in rows and columns.
    static var value: Font { inter(size: 17, weight: 500, relativeTo: .body).monospacedDigit() }
    static var body: Font { inter(size: 16, weight: 400, relativeTo: .body) }
    static var label: Font { inter(size: 14, weight: 500, relativeTo: .subheadline) }
    static var caption: Font { inter(size: 13, weight: 400, relativeTo: .footnote) }
    static var button: Font { inter(size: 16, weight: 600, relativeTo: .headline) }
}
