import SwiftUI

/// The heading of a block of the statement (web: HomeSection's h2, type-heading in navy), with an
/// optional ghost action. The action moves under the title when both do not fit on one line.
struct SectionHeader: View {
    let title: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline, spacing: ODMetric.space4) {
                heading.fixedSize(horizontal: true, vertical: false)
                Spacer(minLength: 0)
                actionButton
            }
            VStack(alignment: .leading, spacing: 0) {
                heading.fixedSize(horizontal: false, vertical: true)
                actionButton
            }
        }
    }

    private var heading: some View {
        Text(title)
            .odText(.heading)
            .foregroundStyle(ODColor.navy900)
            .accessibilityAddTraits(.isHeader)
    }

    @ViewBuilder
    private var actionButton: some View {
        if let actionTitle, let action {
            Button(actionTitle, action: action)
                .buttonStyle(.odGhost)
                .padding(.leading, -ODMetric.space1) // the ghost's own padding: its text lines up with the title
        }
    }
}

/// Samples shared by the previews and the catalog.
struct SectionHeaderSamples: View {
    var body: some View {
        SectionHeader(title: L10n.text("account.timeline.label"))
        SectionHeader(title: L10n.text("home.splitLabel"), actionTitle: L10n.text("home.pendingAction")) {}
    }
}

#Preview("ES") { PreviewSurface { SectionHeaderSamples() } }
#Preview("ES · AX3") { PreviewSurface(dynamicTypeSize: .accessibility3) { SectionHeaderSamples() } }
