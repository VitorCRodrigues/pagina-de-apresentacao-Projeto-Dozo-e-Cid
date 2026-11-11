import OpenDollarsCore
import SwiftUI

/// An amount formatted by the core's MoneyFormatter, so every platform writes the same string.
/// The cents can take their own style (the balance: same baseline, smaller, lighter). Tabular
/// figures, scaled with Dynamic Type. VoiceOver reads the whole amount once.
struct MoneyText: View {
    let money: Money
    let locale: AppLocale
    var style: ODTextStyle = .value
    var centsStyle: ODTextStyle?

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.legibilityWeight) private var legibilityWeight

    var body: some View {
        let bold = legibilityWeight == .bold
        let main = ODFont.uiFont(style, dynamicTypeSize: dynamicTypeSize, boldText: bold)
        let cents = centsStyle.map { ODFont.uiFont($0, dynamicTypeSize: dynamicTypeSize, boldText: bold) } ?? main
        let centsTracking = (centsStyle ?? style).spec.tracking

        MoneyFormatter.parts(money, locale: locale).reduce(Text(verbatim: "")) { text, part in
            let isCents = part.kind == .decimal || part.kind == .fraction
            let font = isCents ? cents : main
            return text + Text(verbatim: part.value)
                .font(Font(font as CTFont))
                .tracking((isCents ? centsTracking : style.spec.tracking) * font.pointSize)
        }
        .accessibilityLabel(MoneyFormatter.format(money, locale: locale))
    }
}

#Preview("ES") {
    PreviewSurface {
        MoneyText(money: Money(cents: 1_248_050), locale: .es)
        MoneyText(money: Money(cents: 123_456_789), locale: .es, style: .valueDisplay, centsStyle: .valueCents)
    }
}

#Preview("ES · AX3") {
    PreviewSurface(dynamicTypeSize: .accessibility3) {
        MoneyText(money: Money(cents: 1_248_050), locale: .es)
        MoneyText(money: Money(cents: 123_456_789), locale: .es, style: .valueDisplay, centsStyle: .valueCents)
    }
}
