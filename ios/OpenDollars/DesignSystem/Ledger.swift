import OpenDollarsCore
import SwiftUI

/// Statement lines (web/src/components/Ledger.tsx): hairlines between lines and a rule above and
/// below, no card. Each line draws the rule above itself; the ledger draws the one below the last.
/// `inverse` is for lines on the navy balance block: navy-800 rules and cream caption text.
enum LedgerTone: Sendable { case standard, inverse }

struct Ledger<Content: View>: View {
    var tone: LedgerTone = .standard
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            content
            Rule(color: tone.ruleColor)
        }
        .environment(\.ledgerTone, tone)
    }
}

/// One line of a ledger with any content (a document request, a step). LedgerRow is the
/// label/value line built on it.
struct LedgerItem<Content: View>: View {
    @ViewBuilder var content: Content
    @Environment(\.ledgerTone) private var tone

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rule(color: tone.ruleColor)
            content
                .padding(.vertical, tone == .inverse ? 6 : ODMetric.space3)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// Label on the left, tabular value on the right. The label does not wrap beside the value; when
/// both do not fit (long text, large Dynamic Type), the value moves to the next line, whole and
/// right-aligned. VoiceOver reads "label, value".
struct LedgerRow<Value: View>: View {
    let label: String
    @ViewBuilder var value: Value
    @Environment(\.ledgerTone) private var tone

    var body: some View {
        LedgerItem {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline, spacing: ODMetric.space4) {
                    labelText.fixedSize(horizontal: true, vertical: false)
                    Spacer(minLength: 0)
                    styledValue.fixedSize(horizontal: true, vertical: false)
                }
                VStack(alignment: .leading, spacing: ODMetric.space1) {
                    labelText.fixedSize(horizontal: false, vertical: true)
                    styledValue
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .accessibilityElement(children: .combine)
        }
    }

    private var labelText: some View {
        Text(label)
            .odText(tone == .inverse ? .caption : .body)
            .foregroundStyle(tone.textColor)
    }

    private var styledValue: some View {
        value
            .odText(tone.valueStyle)
            .foregroundStyle(tone.textColor)
    }
}

extension LedgerRow where Value == LedgerAmount {
    /// An amount line, in the ledger's tone.
    init(label: String, money: Money, locale: AppLocale) {
        self.label = label
        self.value = LedgerAmount(money: money, locale: locale)
    }
}

/// MoneyText sets its own fonts, so it cannot take the row's style from .odText: it reads the
/// ledger's tone itself.
struct LedgerAmount: View {
    let money: Money
    let locale: AppLocale
    @Environment(\.ledgerTone) private var tone

    var body: some View {
        MoneyText(money: money, locale: locale, style: tone.valueStyle)
    }
}

extension LedgerTone {
    var ruleColor: Color { self == .inverse ? ODColor.navy800 : ODColor.gray200 }
    var textColor: Color { self == .inverse ? ODColor.cream50 : ODColor.graphite900 }
    /// Tabular in both tones: amounts in a column line up digit by digit.
    var valueStyle: ODTextStyle { self == .inverse ? .valueCaption : .value }
}

private struct LedgerToneKey: EnvironmentKey {
    static let defaultValue: LedgerTone = .standard
}

extension EnvironmentValues {
    fileprivate var ledgerTone: LedgerTone {
        get { self[LedgerToneKey.self] }
        set { self[LedgerToneKey.self] = newValue }
    }
}

/// Samples shared by the previews and the catalog.
struct LedgerSamples: View {
    var body: some View {
        Ledger {
            LedgerRow(label: Strings.portfolioBucketsShortInvested, money: Money(cents: 1_190_050), locale: .es)
            LedgerRow(label: Strings.portfolioBucketsShortIbkrCash, money: Money(cents: 58_000), locale: .es)
            LedgerRow(label: Strings.portfolioBucketsShortInFlight, money: Money(cents: 0), locale: .es)
            LedgerRow(label: Strings.accountAccountNumber) { Text(verbatim: "U•••4821") }
        }
    }
}

#Preview("ES") { PreviewSurface { LedgerSamples() } }
#Preview("ES · AX3") { PreviewSurface(dynamicTypeSize: .accessibility3) { LedgerSamples() } }
