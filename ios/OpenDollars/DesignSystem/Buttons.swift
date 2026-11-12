import SwiftUI

/// Buttons, as web/src/components/Button.tsx:
/// - primary: the one action of a screen. Navy with cream text, never gold (decision 10).
/// - secondary: navy outline.
/// - ghost: reads as a green underlined text link; everything that is not the primary action.
/// Loading keeps the variant's colours (the action is in progress, not unavailable) and ignores
/// taps; disabled turns grey. Primary and secondary fill the width at 48 pt; ghost hugs its text
/// with a 44 pt tap target.
struct ODButtonStyle: ButtonStyle {
    enum Variant: Sendable { case primary, secondary, ghost }

    let variant: Variant
    var isLoading = false

    func makeBody(configuration: Configuration) -> some View {
        ODButtonBody(configuration: configuration, variant: variant, isLoading: isLoading)
    }
}

extension ButtonStyle where Self == ODButtonStyle {
    static var odPrimary: ODButtonStyle { ODButtonStyle(variant: .primary) }
    static var odSecondary: ODButtonStyle { ODButtonStyle(variant: .secondary) }
    static var odGhost: ODButtonStyle { ODButtonStyle(variant: .ghost) }

}

extension View {
    /// A button that can be loading: the style keeps the variant's colours and shows progress,
    /// and the button is disabled, so no tap, VoiceOver activation, Switch Control or keyboard
    /// press can run the action twice (CLAUDE.md: the button disables after the tap).
    func odButtonStyle(_ variant: ODButtonStyle.Variant, loading: Bool) -> some View {
        buttonStyle(ODButtonStyle(variant: variant, isLoading: loading)).disabled(loading)
    }
}

private struct ODButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let variant: ODButtonStyle.Variant
    let isLoading: Bool

    @Environment(\.isEnabled) private var isEnabled

    /// Disabled wins only when the button is not loading, as on the web.
    private var looksDisabled: Bool { !isEnabled && !isLoading }

    var body: some View {
        switch variant {
        case .primary, .secondary: block
        case .ghost: ghost
        }
    }

    private var block: some View {
        HStack(spacing: ODMetric.space2) {
            if isLoading {
                ProgressView().tint(foreground).accessibilityHidden(true)
            }
            configuration.label
        }
        .odText(.label)
        .multilineTextAlignment(.center)
        .foregroundStyle(foreground)
        .padding(.horizontal, ODMetric.space5)
        .padding(.vertical, ODMetric.space2)
        .frame(maxWidth: .infinity, minHeight: ODMetric.controlHeight)
        .background(RoundedRectangle(cornerRadius: ODMetric.radiusControl).fill(fill))
        .overlay {
            if variant == .secondary && !looksDisabled {
                RoundedRectangle(cornerRadius: ODMetric.radiusControl)
                    .strokeBorder(ODColor.navy900, lineWidth: ODMetric.hairline)
            }
        }
        .contentShape(RoundedRectangle(cornerRadius: ODMetric.radiusControl))
        .accessibilityValue(isLoading ? Strings.commonLoading : "")
    }

    private var ghost: some View {
        configuration.label
            .odText(.label)
            .underline(!looksDisabled, color: ODColor.green700)
            .foregroundStyle(looksDisabled ? ODColor.gray500 : ODColor.green700)
            .opacity(configuration.isPressed ? 0.7 : 1)
            .padding(.horizontal, ODMetric.space1)
            .frame(minHeight: ODMetric.minTapTarget)
            .contentShape(Rectangle())
    }

    private var foreground: Color {
        if looksDisabled { return ODColor.gray500 }
        return variant == .primary ? ODColor.cream50 : ODColor.navy900
    }

    private var fill: Color {
        if looksDisabled { return ODColor.gray100 }
        switch variant {
        case .primary: return configuration.isPressed ? ODColor.navy800 : ODColor.navy900
        case .secondary: return configuration.isPressed ? ODColor.gray50 : ODColor.cream50
        case .ghost: return ODColor.cream50
        }
    }
}

/// Samples shared by the previews and the catalog.
struct ButtonSamples: View {
    var body: some View {
        Button(Strings.portfolioEmptyAction) {}.buttonStyle(.odPrimary)
        Button(Strings.portfolioEmptyAction) {}.odButtonStyle(.primary, loading: true)
        Button(Strings.portfolioEmptyAction) {}.buttonStyle(.odPrimary).disabled(true)
        Button(Strings.accountActionsContact) {}.buttonStyle(.odSecondary)
        Button(Strings.accountActionsContact) {}.buttonStyle(.odSecondary).disabled(true)
        Button(Strings.homePendingAction) {}.buttonStyle(.odGhost)
        Button(Strings.homePendingAction) {}.buttonStyle(.odGhost).disabled(true)
    }
}

#Preview("ES") { PreviewSurface { ButtonSamples() } }
#Preview("ES · AX3") { PreviewSurface(dynamicTypeSize: .accessibility3) { ButtonSamples() } }
