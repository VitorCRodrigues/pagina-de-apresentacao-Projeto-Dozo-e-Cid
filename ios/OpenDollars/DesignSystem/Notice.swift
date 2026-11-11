import SwiftUI

enum NoticeTone: Sendable { case info, warning, error }

/// A margin note on the statement (web/src/components/Banner.tsx): a 2 pt side rule and text, no
/// tinted box. The tone lives in the rule and the title colour; the title itself always says what
/// happened, so the colour is never the only signal. An error is announced to VoiceOver when it
/// appears. `quiet`: the title reads as body text (plain information).
struct Notice<Action: View>: View {
    var tone: NoticeTone = .info
    let title: String
    var message: String?
    var quiet = false
    @ViewBuilder var action: Action

    @State private var announced = false

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space1) {
            Text(title)
                .odText(quiet ? .body : .label)
                .foregroundStyle(quiet ? ODColor.graphite900 : titleColor)
            if let message {
                Text(message)
                    .odText(.caption)
                    .foregroundStyle(ODColor.graphite900)
            }
            action
                .padding(.leading, -ODMetric.space1) // the ghost's own padding
        }
        .padding(.vertical, ODMetric.space1)
        .padding(.leading, ODMetric.space4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .leading) {
            Rectangle().fill(ruleColor).frame(width: ODMetric.rule).accessibilityHidden(true)
        }
        .accessibilityElement(children: .contain)
        .onAppear {
            guard tone == .error, !announced else { return }
            announced = true
            AccessibilityNotification.Announcement(title).post()
        }
    }

    private var ruleColor: Color {
        switch tone {
        case .info: ODColor.navy900
        case .warning: ODColor.amber700
        case .error: ODColor.brick700
        }
    }

    private var titleColor: Color { ruleColor }
}

extension Notice where Action == EmptyView {
    init(tone: NoticeTone = .info, title: String, message: String? = nil, quiet: Bool = false) {
        self.init(tone: tone, title: title, message: message, quiet: quiet) { EmptyView() }
    }
}

/// "Your account is opened at Interactive Brokers, in your name" (PRD section 10), under a rule.
struct CustodyNote: View {
    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space4) {
            Rule()
            Text(L10n.text("custody.note"))
                .odText(.caption)
                .foregroundStyle(ODColor.gray600)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// Samples shared by the previews and the catalog.
struct NoticeSamples: View {
    var body: some View {
        Notice(title: L10n.plural("home.pending", count: 2)) {
            Button(L10n.text("home.pendingAction")) {}.buttonStyle(.odGhost)
        }
        Notice(tone: .warning, title: L10n.text("blockReason.quote_expired.message")) {
            Button(L10n.text("blockReason.quote_expired.action")) {}.buttonStyle(.odGhost)
        }
        Notice(tone: .error, title: L10n.text("states.error.title"), message: L10n.text("states.error.body"))
        Notice(title: L10n.text("portfolio.asOf"), quiet: true)
        CustodyNote()
    }
}

#Preview("ES") { PreviewSurface { NoticeSamples() } }
#Preview("ES · AX3") { PreviewSurface(dynamicTypeSize: .accessibility3) { NoticeSamples() } }
