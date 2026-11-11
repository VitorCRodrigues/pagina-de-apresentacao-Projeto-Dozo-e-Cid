import OpenDollarsCore
import SwiftUI

/// A labelled text field, as web/src/components/Field.tsx and Input.tsx: label, the control on
/// paper with a 3:1 border, then the error (brick, with an icon) and the help. The error turns the
/// border brick and is read by VoiceOver before the help; it is announced when it appears.
/// The `amount` variant is the screen's focus: tabular figures at valueLarge, with a fixed
/// prefix such as the currency.
struct ODTextField: View {
    enum Variant: Sendable { case text, amount }

    let label: String
    @Binding var text: String
    var prompt: String?
    var help: String?
    var error: String?
    var isOptional = false
    var variant: Variant = .text
    /// Fixed text before the value, e.g. "US$".
    var leading: String?
    var keyboard: UIKeyboardType = .default

    @FocusState private var isFocused: Bool
    @Environment(\.isEnabled) private var isEnabled

    private var style: ODTextStyle { variant == .amount ? .valueLarge : .body }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            labelText
            control
            if let error {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Image(systemName: "exclamationmark.circle").accessibilityHidden(true)
                    Text(error)
                }
                .odText(.caption)
                .foregroundStyle(ODColor.brick700)
                .accessibilityHidden(true) // read as the field's hint
            }
            if let help {
                Text(help)
                    .odText(.caption)
                    .foregroundStyle(ODColor.gray600)
                    .accessibilityHidden(true) // read as the field's hint
            }
        }
        .onChange(of: error) { _, newError in
            if let newError { AccessibilityNotification.Announcement(newError).post() }
        }
    }

    private var labelText: some View {
        (Text(label) + (isOptional ? Text(verbatim: " ") + Text(verbatim: "(\(L10n.text("common.optional")))") : Text(verbatim: "")))
            .odText(.label)
            .foregroundStyle(ODColor.graphite900)
            .accessibilityHidden(true) // the field carries it
    }

    private var control: some View {
        HStack(spacing: ODMetric.space2) {
            if let leading {
                Text(verbatim: leading)
                    .odText(style)
                    .foregroundStyle(ODColor.gray600)
                    .accessibilityHidden(true)
            }
            TextField(text: $text, prompt: prompt.map { Text($0).foregroundStyle(ODColor.gray600) }) {
                Text(label)
            }
            .odText(style)
            .foregroundStyle(isEnabled ? ODColor.graphite900 : ODColor.gray500)
            .keyboardType(keyboard)
            .focused($isFocused)
            .accessibilityLabel(isOptional ? "\(label) (\(L10n.text("common.optional")))" : label)
            .accessibilityHint([error, help].compactMap { $0 }.joined(separator: ". "))
        }
        .padding(.horizontal, ODMetric.space3)
        .padding(.vertical, ODMetric.space3)
        .frame(minHeight: ODMetric.controlHeight)
        .background(RoundedRectangle(cornerRadius: ODMetric.radiusControl).fill(isEnabled ? ODColor.paper : ODColor.gray100))
        .overlay(
            RoundedRectangle(cornerRadius: ODMetric.radiusControl)
                .strokeBorder(borderColor, lineWidth: isFocused ? ODMetric.rule : ODMetric.hairline))
        .contentShape(Rectangle())
        .onTapGesture { isFocused = true }
    }

    private var borderColor: Color {
        if !isEnabled { return ODColor.gray200 }
        if error != nil { return ODColor.brick700 }
        return isFocused ? ODColor.navy900 : ODColor.gray500
    }
}

/// Sample input for previews and the catalog. The minimum is a placeholder value: the real one
/// comes from GET /config.
struct TextFieldSamples: View {
    @State private var empty = ""
    @State private var amount = MoneyFormatter.inputText(Money(cents: 5_000), locale: .es)
    @State private var wrong = "12,5,0"

    private var minimum: String { MoneyFormatter.format(Money(cents: 10_000), locale: .es) }
    private var currency: String { MoneyFormatter.currencySymbol(locale: .es) }

    var body: some View {
        ODTextField(
            label: L10n.text("deposit.amount.label"), text: $empty,
            help: L10n.format("deposit.amount.help", minimum), variant: .amount, leading: currency, keyboard: .decimalPad)
        ODTextField(
            label: L10n.text("deposit.amount.label"), text: $amount,
            error: L10n.format("deposit.amount.belowMinimum", minimum), variant: .amount, leading: currency, keyboard: .decimalPad)
        ODTextField(label: L10n.text("deposit.amount.label"), text: $wrong, error: L10n.text("deposit.amount.invalidAmount"), isOptional: true)
        ODTextField(label: L10n.text("deposit.amount.label"), text: $amount).disabled(true)
    }
}

#Preview("ES") { PreviewSurface { TextFieldSamples() } }
#Preview("ES · AX3") { PreviewSurface(dynamicTypeSize: .accessibility3) { TextFieldSamples() } }
