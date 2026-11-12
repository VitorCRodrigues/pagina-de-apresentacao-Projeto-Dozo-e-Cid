import OpenDollarsCore
import SwiftUI

/// T3. Where the opening stands, told calmly, for every status (AccountStatusScreen in the core).
/// Never a deposit instruction here: money only moves once the account is open (PRD section 5,
/// failure B2). An unknown status gets generic text and the support action (TODO(decisão) 1).
/// While the account waits, the screen checks back every minute (AccountPolling), and the routing
/// follows a new status.
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
                    AccountStatusContent(screen: AccountStatusScreen(account))
                        .padding(ODMetric.gutter)
                }
                .odStatusBarBackground()
                .task(id: account.status) { await checkBack(while: account.status) }
            }
        }
        .background(ODColor.cream50)
        .toolbar(.hidden, for: .navigationBar)
        .task { await model.session.loadAccount() }
        .refreshable { await model.session.refreshAccount() }
    }

    /// Cancelled with the view, and restarted when the status changes.
    private func checkBack(while status: AccountStatus) async {
        guard AccountPolling.isWaiting(status) else { return }
        while !Task.isCancelled {
            try? await Task.sleep(for: AccountPolling.interval)
            guard !Task.isCancelled else { return }
            await model.session.refreshAccount()
        }
    }
}

private struct AccountStatusContent: View {
    @Environment(AppModel.self) private var model
    let screen: AccountStatusScreen

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
            VStack(alignment: .leading, spacing: ODMetric.space3) {
                Text(L10n.text(screen.titleKey))
                    .odText(.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("account.title")
                Text(L10n.text(screen.bodyKey))
                    .odText(.body)
                    .foregroundStyle(ODColor.gray600)
                    .accessibilityIdentifier("account.body")
            }

            if screen.action == .continueOnboarding {
                Button(Strings.accountActionsContinue) { model.leaveAccountStatus() }
                    .buttonStyle(.odPrimary)
                    .accessibilityIdentifier("account.continue")
            }

            if let steps = screen.timeline {
                OpeningTimeline(steps: steps)
            }

            if !screen.documents.isEmpty {
                VStack(alignment: .leading, spacing: ODMetric.space3) {
                    SectionHeader(title: Strings.accountDocuments)
                    Ledger {
                        ForEach(screen.documents) { item in
                            LedgerItem { DocumentUploadRow(item: item) }
                        }
                    }
                }
            }

            if screen.showsAllSent {
                Notice(title: Strings.accountAllSent, quiet: true)
                    .accessibilityIdentifier("account.allSent")
            }

            if let number = screen.accountNumber {
                Ledger {
                    LedgerRow(label: Strings.accountAccountNumber) { Text(number) }
                }
            }

            // TODO(decisão): "Crear plan mensual" arrives with the plan screen (T5); until then an
            // open account lands on the tabs and this screen only shows here with -screen account.

            if screen.action == .contactSupport {
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
