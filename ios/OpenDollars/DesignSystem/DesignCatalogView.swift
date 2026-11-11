#if DEBUG
import OpenDollarsCore
import SwiftUI

/// Every design system component on one scrolling page, with real copy, for review and for the
/// screenshot test (OpenDollarsUITests/CatalogScreenshotTests). DEBUG builds only; opened with the
/// `-catalog` launch argument. Token and style names are code identifiers, shown verbatim.
struct DesignCatalogView: View {
    static let launchArgument = "-catalog"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ODMetric.space10) {
                Text(L10n.text("devCatalog.title"))
                    .odText(.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("catalog.title")

                section("devCatalog.colors") { ColorSwatches() }
                section("devCatalog.type") { TypeSamples() }
                section("devCatalog.buttons") { ButtonSamples() }
                section("devCatalog.fields") { TextFieldSamples() }
                section("devCatalog.ledger") {
                    SectionHeaderSamples()
                    LedgerSamples()
                }
                section("devCatalog.notices") { NoticeSamples() }
                section("devCatalog.states") {
                    StateSamples()
                    LoadingState(shape: .form)
                    LoadingState(shape: .timeline)
                }
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("catalog.end")
            }
            .padding(ODMetric.gutter)
        }
        .background(ODColor.cream50)
    }

    private func section<Content: View>(_ key: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: ODMetric.space5) {
            Text(L10n.text(key))
                .odText(.label)
                .foregroundStyle(ODColor.gray600)
                .accessibilityAddTraits(.isHeader)
            content()
        }
    }
}

private struct ColorSwatches: View {
    var body: some View {
        Ledger {
            ForEach(ColorToken.allCases, id: \.self) { token in
                LedgerItem {
                    HStack(spacing: ODMetric.space3) {
                        RoundedRectangle(cornerRadius: ODMetric.radiusControl)
                            .fill(ODColor.of(token))
                            .frame(width: 32, height: 32)
                            .overlay(RoundedRectangle(cornerRadius: ODMetric.radiusControl).strokeBorder(ODColor.gray200, lineWidth: ODMetric.hairline))
                        Text(verbatim: token.rawValue)
                            .odText(.body)
                            .foregroundStyle(ODColor.graphite900)
                        Spacer(minLength: 0)
                        Text(verbatim: "#" + String(format: "%06X", token.hex))
                            .odText(.value)
                            .foregroundStyle(ODColor.gray600)
                    }
                }
            }
        }
    }
}

private struct TypeSamples: View {
    private func name(_ style: ODTextStyle) -> String { String(describing: style) }

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space4) {
            sample(.display) { Text(L10n.text("portfolio.total")) }
            sample(.title) { Text(L10n.text("home.title")) }
            sample(.heading) { Text(L10n.text("account.timeline.label")) }
            sample(.body) { Text(L10n.text("portfolio.asOf")) }
            sample(.label) { Text(L10n.text("deposit.amount.label")) }
            sample(.caption) { Text(L10n.text("custody.note")) }
            money(.value)
            money(.valueLarge)
            VStack(alignment: .leading, spacing: ODMetric.space1) {
                styleName("valueDisplay + valueCents")
                MoneyText(money: Money(cents: 123_456_789), locale: .es, style: .valueDisplay, centsStyle: .valueCents)
                    .foregroundStyle(ODColor.graphite900)
            }
        }
    }

    private func sample(_ style: ODTextStyle, @ViewBuilder text: () -> Text) -> some View {
        VStack(alignment: .leading, spacing: ODMetric.space1) {
            styleName(name(style))
            text().odText(style).foregroundStyle(ODColor.navy900)
        }
    }

    private func money(_ style: ODTextStyle) -> some View {
        VStack(alignment: .leading, spacing: ODMetric.space1) {
            styleName(name(style))
            // Tabular figures: the two amounts line up digit by digit.
            MoneyText(money: Money(cents: 1_111_111), locale: .es, style: style)
            MoneyText(money: Money(cents: 9_888_890), locale: .es, style: style)
        }
        .foregroundStyle(ODColor.graphite900)
    }

    private func styleName(_ name: String) -> some View {
        Text(verbatim: name).odText(.caption).foregroundStyle(ODColor.gray600)
    }
}

#Preview("ES") { DesignCatalogView().environment(\.locale, Locale(identifier: "es_AR")) }
#Preview("ES · AX3") { DesignCatalogView().environment(\.locale, Locale(identifier: "es_AR")).dynamicTypeSize(.accessibility3) }
#endif
