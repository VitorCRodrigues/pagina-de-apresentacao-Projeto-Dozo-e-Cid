import OpenDollarsCore
import SwiftUI

/// T6, phase 3: Aportar. A blocked account (decision 14) sees why deposits stop and nothing that
/// starts one; the deposit flow itself arrives in a later phase.
struct DepositTabView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
                Text(Strings.depositTitle)
                    .odText(.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)

                switch model.session.account {
                case .idle, .loading:
                    InlineLoading()
                case .failed:
                    InlineError { Task { await model.session.loadAccount() } }
                case .loaded:
                    if let block = model.session.accountBlock {
                        AccountBlockNote(block: block)
                    } else {
                        // TODO(decisão): the new-deposit flow (T6 to T8) arrives in a later phase.
                        VStack(alignment: .leading, spacing: ODMetric.space3) {
                            Text(Strings.devComingSoonTitle)
                                .odText(.label)
                                .foregroundStyle(ODColor.gray600)
                            Text(Strings.devComingSoonBody)
                                .odText(.body)
                                .foregroundStyle(ODColor.gray600)
                        }
                    }
                }
            }
            .padding(ODMetric.gutter)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(ODColor.cream50)
        .odStatusBarBackground()
        .toolbar(.hidden, for: .navigationBar)
        .task { await model.session.loadAccount() }
        .refreshable { await model.session.loadAccount() }
    }
}
