import OpenDollarsCore
import SwiftUI

/// T3. Where the opening stands, told calmly. Never a deposit instruction here: money only moves
/// once the account is open (PRD section 5, failure B2). An unknown status gets generic text and
/// the support action (TODO(decisão) 1).
struct AccountStatusView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            switch model.session.account {
            case .idle, .loading:
                StatePage { LoadingState(shape: .timeline) }
            case .failed(let error):
                StatePage { ErrorState(error: error, titleSize: .title) { Task { await model.session.loadAccount() } } }
            case .loaded(let account):
                ScrollView {
                    AccountStatusContent(account: account)
                        .padding(ODMetric.gutter)
                }
                .odStatusBarBackground()
            }
        }
        .background(ODColor.cream50)
        .toolbar(.hidden, for: .navigationBar)
        .task { await model.session.loadAccount() }
        .refreshable { await model.session.loadAccount() }
    }
}

private struct AccountStatusContent: View {
    let account: Account

    private var documents: [PendingItem] { account.pending.filter { $0.kind == .document } }

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
            VStack(alignment: .leading, spacing: ODMetric.space3) {
                Text(L10n.text(AccountStatusCopy.titleKey(account.status)))
                    .odText(.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("account.title")
                Text(L10n.text(AccountStatusCopy.bodyKey(account.status)))
                    .odText(.body)
                    .foregroundStyle(ODColor.gray600)
            }

            if let steps = AccountTimeline.steps(for: account.status) {
                OpeningTimeline(steps: steps)
            }

            // TODO(decisão): document upload (camera, files) arrives with the onboarding phase.
            if account.status == .action_required, !documents.isEmpty {
                VStack(alignment: .leading, spacing: ODMetric.space3) {
                    SectionHeader(title: Strings.accountDocuments)
                    Ledger {
                        ForEach(documents) { item in
                            LedgerItem {
                                VStack(alignment: .leading, spacing: ODMetric.space1) {
                                    Text(item.title).odText(.body).foregroundStyle(ODColor.graphite900)
                                    Text(item.description).odText(.caption).foregroundStyle(ODColor.gray600)
                                }
                                .accessibilityElement(children: .combine)
                            }
                        }
                    }
                }
            }

            if account.status == .open, let masked = account.ibkrAccountMasked {
                Ledger {
                    LedgerRow(label: Strings.accountAccountNumber) { Text(masked) }
                }
            }

            if AccountStatusCopy.offersSupport(account.status) {
                Link(Strings.accountActionsContact, destination: AppConstants.supportURL)
                    .buttonStyle(.odSecondary)
            }

            CustodyNote()
        }
    }
}

/// The opening path, readable by VoiceOver as "label, status".
private struct OpeningTimeline: View {
    let steps: [AccountTimeline.Step]

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space4) {
            SectionHeader(title: Strings.accountTimelineLabel)
            ForEach(steps) { step in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: symbol(step.status))
                        .foregroundStyle(color(step.status))
                        .font(.title3)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(L10n.text(step.id.copyKey))
                            .odText(step.status == .current ? .label : .body)
                            .foregroundStyle(step.status == .upcoming ? ODColor.gray600 : ODColor.graphite900)
                        if step.needsDocuments {
                            Text(Strings.accountTimelineActionNote)
                                .odText(.caption)
                                .foregroundStyle(ODColor.amber700)
                        }
                    }
                }
                .accessibilityElement(children: .combine)
                .accessibilityValue(L10n.text(step.status.copyKey))
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
