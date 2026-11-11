import CoreText
import SwiftUI
import UIKit

/// The type scale of web/src/styles/typography.css, all in Inter (decision 19). One variable
/// file, InterVariable.ttf (axes wght 100–900, opsz 14–32): display, title and the headline
/// figure pin opsz 32, the Inter Display cut; the rest let Core Text match the optical size to
/// the point size. Value styles set tabular, lining figures, so columns of amounts line up.
enum ODTextStyle: CaseIterable, Sendable {
    case display, title, heading, body, label, caption
    case value, valueCaption, valueLarge, valueDisplay, valueCents

    struct Spec {
        let size: CGFloat
        let lineHeight: CGFloat
        let weight: CGFloat
        /// In em, as on the web (Inter Display is drawn for negative tracking at large sizes).
        var tracking: CGFloat = 0
        var opticalSize: CGFloat?
        var tabular = false
        let textStyle: UIFont.TextStyle
    }

    var spec: Spec {
        switch self {
        case .display: Spec(size: 40, lineHeight: 44, weight: 600, tracking: -0.028, opticalSize: 32, textStyle: .largeTitle)
        case .title: Spec(size: 28, lineHeight: 34, weight: 600, tracking: -0.02, opticalSize: 32, textStyle: .title1)
        case .heading: Spec(size: 20, lineHeight: 28, weight: 600, tracking: -0.012, textStyle: .title3)
        case .body: Spec(size: 16, lineHeight: 24, weight: 400, textStyle: .body)
        case .label: Spec(size: 14, lineHeight: 20, weight: 600, textStyle: .subheadline)
        case .caption: Spec(size: 13, lineHeight: 18, weight: 400, textStyle: .footnote)
        // On the web type-value takes the size of its line; on iOS it sits in body-size lines.
        case .value: Spec(size: 16, lineHeight: 24, weight: 600, tabular: true, textStyle: .body)
        // Amounts in caption-size lines (the split inside the balance block).
        case .valueCaption: Spec(size: 13, lineHeight: 18, weight: 400, tabular: true, textStyle: .footnote)
        case .valueLarge: Spec(size: 20, lineHeight: 28, weight: 600, tabular: true, textStyle: .title3)
        // 44 pt keeps US$ 1.234.567,89 inside the balance block at 375 pt (same as the web).
        case .valueDisplay: Spec(size: 44, lineHeight: 48, weight: 560, tracking: -0.03, opticalSize: 32, tabular: true, textStyle: .largeTitle)
        // The cents beside the balance: same baseline, smaller and lighter, never superscript.
        case .valueCents: Spec(size: 26, lineHeight: 30, weight: 420, tracking: -0.015, opticalSize: 32, tabular: true, textStyle: .title2)
        }
    }
}

@MainActor
enum ODFont {
    private static let postScriptName = "InterVariable"
    private static let weightAxis = 0x7767_6874 // 'wght'
    private static let opticalSizeAxis = 0x6F70_737A // 'opsz'

    private struct CacheKey: Hashable {
        let style: ODTextStyle
        let dynamicTypeSize: DynamicTypeSize
        let boldText: Bool
    }

    /// Fonts are built once per style, size and Bold Text setting, not on every body evaluation.
    private static var cache: [CacheKey: UIFont] = [:]

    /// The style at the given Dynamic Type size. Scaled by the style's UIFont.TextStyle, from the
    /// SwiftUI environment rather than the app's trait collection, so previews and any view with
    /// `.dynamicTypeSize(_:)` get the size they ask for. Bold Text adds weight.
    static func uiFont(_ style: ODTextStyle, dynamicTypeSize: DynamicTypeSize, boldText: Bool = false) -> UIFont {
        let key = CacheKey(style: style, dynamicTypeSize: dynamicTypeSize, boldText: boldText)
        if let cached = cache[key] { return cached }
        let font = makeFont(style, dynamicTypeSize: dynamicTypeSize, boldText: boldText)
        cache[key] = font
        return font
    }

    private static func makeFont(_ style: ODTextStyle, dynamicTypeSize: DynamicTypeSize, boldText: Bool) -> UIFont {
        let spec = style.spec
        let traits = UITraitCollection(preferredContentSizeCategory: UIContentSizeCategory(dynamicTypeSize))
        let size = UIFontMetrics(forTextStyle: spec.textStyle).scaledValue(for: spec.size, compatibleWith: traits)

        var axes: [NSNumber: NSNumber] = [
            NSNumber(value: weightAxis): NSNumber(value: Double(min(spec.weight + (boldText ? 100 : 0), 900))),
        ]
        if let opticalSize = spec.opticalSize {
            axes[NSNumber(value: opticalSizeAxis)] = NSNumber(value: Double(opticalSize))
        }
        var attributes: [UIFontDescriptor.AttributeName: Any] = [
            .name: postScriptName,
            UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String): axes,
        ]
        if spec.tabular {
            attributes[.featureSettings] = [
                [UIFontDescriptor.FeatureKey.type: kNumberSpacingType, UIFontDescriptor.FeatureKey.selector: kMonospacedNumbersSelector],
                [UIFontDescriptor.FeatureKey.type: kNumberCaseType, UIFontDescriptor.FeatureKey.selector: kUpperCaseNumbersSelector],
            ]
        }
        return UIFont(descriptor: UIFontDescriptor(fontAttributes: attributes), size: size)
    }

    static func font(_ style: ODTextStyle, dynamicTypeSize: DynamicTypeSize, boldText: Bool = false) -> Font {
        Font(uiFont(style, dynamicTypeSize: dynamicTypeSize, boldText: boldText) as CTFont)
    }
}

/// Sets a text style: font, tracking and the web's line height, all scaled with Dynamic Type.
private struct ODTextModifier: ViewModifier {
    let style: ODTextStyle
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.legibilityWeight) private var legibilityWeight

    func body(content: Content) -> some View {
        let font = ODFont.uiFont(style, dynamicTypeSize: dynamicTypeSize, boldText: legibilityWeight == .bold)
        let scale = font.pointSize / style.spec.size
        content
            .font(Font(font as CTFont))
            .tracking(style.spec.tracking * font.pointSize)
            .lineSpacing(max(0, style.spec.lineHeight * scale - font.lineHeight))
    }
}

extension View {
    func odText(_ style: ODTextStyle) -> some View {
        modifier(ODTextModifier(style: style))
    }
}
