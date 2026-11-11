import OpenDollarsCore
import SwiftUI

/// Localized text from Localizable.xcstrings. Keys are the web's i18n keys (scripts/sync-strings-from-web.py).
enum L10n {
    static func text(_ key: String) -> String {
        String(localized: String.LocalizationValue(key))
    }

    static func format(_ key: String, _ arguments: any CVarArg...) -> String {
        String(format: text(key), locale: .current, arguments: arguments)
    }

    /// Keys with plural variations (one / other).
    static func plural(_ key: String, count: Int) -> String {
        String.localizedStringWithFormat(NSLocalizedString(key, comment: ""), count)
    }
}

/// An amount with its cents styled apart (same baseline, smaller), formatted by the core's
/// MoneyFormatter so every platform writes the same string. VoiceOver reads the whole amount.
struct MoneyText: View {
    let money: Money
    let locale: AppLocale
    var font: Font = ODFont.value
    var centsFont: Font?

    var body: some View {
        let parts = MoneyFormatter.parts(money, locale: locale)
        parts.reduce(Text(verbatim: "")) { text, part in
            let isCents = part.kind == .decimal || part.kind == .fraction
            return text + Text(verbatim: part.value).font(isCents ? (centsFont ?? font) : font)
        }
        .accessibilityLabel(MoneyFormatter.format(money, locale: locale))
    }
}

/// The one primary action of a screen: navy, never gold (decision 10).
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(ODFont.button)
            .foregroundStyle(ODColor.white)
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(
                RoundedRectangle(cornerRadius: ODMetric.radiusControl)
                    .fill(configuration.isPressed ? ODColor.navy800 : ODColor.navy900))
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(ODFont.button)
            .foregroundStyle(ODColor.navy900)
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(
                RoundedRectangle(cornerRadius: ODMetric.radiusControl)
                    .fill(configuration.isPressed ? ODColor.gray50 : ODColor.paper))
            .overlay(
                RoundedRectangle(cornerRadius: ODMetric.radiusControl)
                    .stroke(ODColor.gray500, lineWidth: 1))
    }
}

/// A paper card on the cream background.
struct Card<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: ODMetric.radiusCard).fill(ODColor.paper))
            .overlay(RoundedRectangle(cornerRadius: ODMetric.radiusCard).stroke(ODColor.gray200, lineWidth: 1))
    }
}

/// "Your account is opened at Interactive Brokers, in your name" (PRD section 10).
struct CustodyNote: View {
    var body: some View {
        Text(L10n.text("custody.note"))
            .font(ODFont.caption)
            .foregroundStyle(ODColor.gray600)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 16)
            .overlay(alignment: .top) { Rectangle().fill(ODColor.gray200).frame(height: 1) }
    }
}

enum AppConstants {
    // TODO(decisão): the pilot's support channel. Email only for now (same as web/src/lib/support.ts).
    static let supportEmail = "soporte@opendollars.com"
    static let supportURL = URL(string: "mailto:\(supportEmail)")!
}
