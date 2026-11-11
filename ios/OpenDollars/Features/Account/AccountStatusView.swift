import OpenDollarsCore
import SwiftUI

/// T3. Where the opening stands, told calmly. Never a deposit instruction here: money only moves
/// once the account is open (PRD section 5, failure B2). An unknown status gets generic text and
/// the support action (TODO(decisão) 1).
struct AccountStatusView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            switch model.account {
            case .idle, .loading:
                LoadingStateView()
            case .failed(let error):
                ErrorStateView(error: error) { Task { await model.loadAccount() } }
            case .loaded(let account):
                ScrollView {
                    AccountStatusContent(account: account)
                        .padding(ODMetric.gutter)
                }
            }
        }
        .background(ODColor.cream50)
        .toolbar(.hidden, for: .navigationBar)
        .task { await model.loadAccount() }
        .refreshable { await model.loadAccount() }
    }
}

private struct AccountStatusContent: View {
    let account: Account

    private var documents: [PendingItem] { account.pending.filter { $0.kind == .document } }

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
            VStack(alignment: .leading, spacing: 12) {
                Text(L10n.text(AccountStatusCopy.titleKey(account.status)))
                    .font(ODFont.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("account.title")
                Text(L10n.text(AccountStatusCopy.bodyKey(account.status)))
                    .font(ODFont.body)
                    .foregroundStyle(ODColor.gray600)
            }

            if let steps = AccountTimeline.steps(for: account.status) {
                OpeningTimeline(steps: steps)
            }

            // TODO(decisão): document upload (camera, files) arrives with the onboarding phase.
            if account.status == .action_required, !documents.isEmpty {
                Card {
                    Text(L10n.text("account.documents"))
                        .font(ODFont.label)
                        .foregroundStyle(ODColor.gray600)
                    ForEach(documents) { item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title).font(ODFont.body).foregroundStyle(ODColor.graphite900)
                            Text(item.description).font(ODFont.caption).foregroundStyle(ODColor.gray600)
                        }
                    }
                }
            }

            if account.status == .open, let masked = account.ibkrAccountMasked {
                Card {
                    HStack {
                        Text(L10n.text("account.accountNumber")).font(ODFont.body)
                        Spacer()
                        Text(masked).font(ODFont.value)
                    }
                    .foregroundStyle(ODColor.graphite900)
                }
            }

            if AccountStatusCopy.offersSupport(account.status) {
                Link(L10n.text("account.actions.contact"), destination: AppConstants.supportURL)
                    .buttonStyle(SecondaryButtonStyle())
            }

            CustodyNote()
        }
    }
}

/// The opening path, readable by VoiceOver as "label, status".
private struct OpeningTimeline: View {
    let steps: [AccountTimeline.Step]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.text("account.timeline.label"))
                .font(ODFont.label)
                .foregroundStyle(ODColor.gray600)
                .accessibilityAddTraits(.isHeader)
            ForEach(steps) { step in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: symbol(step.status))
                        .foregroundStyle(color(step.status))
                        .font(.system(size: 20))
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(L10n.text("account.timeline.\(step.id.rawValue)"))
                            .font(step.status == .current ? ODFont.label : ODFont.body)
                            .foregroundStyle(step.status == .upcoming ? ODColor.gray600 : ODColor.graphite900)
                        if step.needsDocuments {
                            Text(L10n.text("account.timeline.actionNote"))
                                .font(ODFont.caption)
                                .foregroundStyle(ODColor.amber700)
                        }
                    }
                }
                .accessibilityElement(children: .combine)
                .accessibilityValue(L10n.text("timeline.status.\(step.status.rawValue)"))
            }
        }
    }

    private func symbol(_ status: AccountTimeline.StepStatus) -> String {
        switch status {
        case .done: "checkmark.circle.fill"
        case .current: "circle.inset.filled"
        case .upcoming: "circle"
        }
    }

    private func color(_ status: AccountTimeline.StepStatus) -> Color {
        switch status {
        case .done: ODColor.green700
        case .current: ODColor.navy900
        case .upcoming: ODColor.gray500
        }
    }
}
