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
                Text(Strings.devCatalogTitle)
                    .odText(.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("catalog.title")

                section(Strings.devCatalogColors) { ColorSwatches() }
                section(Strings.devCatalogType) { TypeSamples() }
                section(Strings.devCatalogButtons) { ButtonSamples() }
                section(Strings.devCatalogFields) { TextFieldSamples() }
                section(Strings.devCatalogLedger) {
                    SectionHeaderSamples()
                    LedgerSamples()
                }
                section(Strings.devCatalogNotices) { NoticeSamples() }
                section(Strings.devCatalogStates) {
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
        .odStatusBarBackground()
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: ODMetric.space5) {
            Text(title)
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
            sample(.display) { Text(Strings.portfolioTotal) }
            sample(.title) { Text(Strings.homeTitle) }
            sample(.heading) { Text(Strings.accountTimelineLabel) }
            sample(.body) { Text(Strings.portfolioAsOf) }
            sample(.label) { Text(Strings.depositAmountLabel) }
            sample(.caption) { Text(Strings.custodyNote) }
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
