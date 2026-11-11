import OpenDollarsCore
import SwiftUI

/// T4, phase 0 (web/src/features/home/HomeScreen.tsx): one focus, the total on navy, with its
/// split as statement lines inside the block. The total shown is the sum of the three buckets
/// (decision 15), so it always matches the lines below it. No returns chart in the pilot.
struct HomeView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
                Text(L10n.text("home.title"))
                    .odText(.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)

                if case .loaded(let account) = model.account {
                    AccountNotes(account: account)
                }

                switch model.portfolio {
                case .idle, .loading:
                    BalanceBlockSkeleton()
                case .failed(let error):
                    ErrorState(error: error) { Task { await model.loadHome() } }
                case .loaded(let portfolio):
                    BalanceBlock(portfolio: portfolio, locale: model.locale)
                }

                CustodyNote()
            }
            .padding(ODMetric.gutter)
        }
        .background(ODColor.cream50)
        .toolbar(.hidden, for: .navigationBar)
        .task { await model.loadHome() }
        .refreshable { await model.loadHome() }
    }
}

/// The one headline figure: the total in Inter Display, cream on navy; gold only on the "Total"
/// label (decision 19). With nothing to mark yet (no balance, or a fee owed), the label stays
/// cream and the figure is not the display size, as on the web.
private struct BalanceBlock: View {
    let portfolio: Portfolio
    let locale: AppLocale

    private var total: Money { (try? portfolio.displayedTotal()) ?? portfolio.totalCents }

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space4) {
            VStack(alignment: .leading, spacing: ODMetric.space1) {
                Text(L10n.text("portfolio.total"))
                    .odText(.label)
                    .foregroundStyle(total > .zero ? ODColor.gold500 : ODColor.cream50)
                Group {
                    if total > .zero {
                        MoneyText(money: total, locale: locale, style: .valueDisplay, centsStyle: .valueCents)
                    } else {
                        MoneyText(money: total, locale: locale, style: .valueLarge)
                    }
                }
                .foregroundStyle(ODColor.cream50)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("home.total")

            Ledger(tone: .inverse) {
                LedgerRow(label: L10n.text("portfolio.bucketsShort.invested"), money: portfolio.buckets.investedCents, locale: locale)
                LedgerRow(label: L10n.text("portfolio.bucketsShort.ibkrCash"), money: portfolio.buckets.ibkrCashCents, locale: locale)
                LedgerRow(label: L10n.text("portfolio.bucketsShort.inFlight"), money: portfolio.buckets.inFlightCents, locale: locale)
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel(L10n.text("home.splitLabel"))

            Text(L10n.format("home.updatedAt", portfolio.asOf.formatted(date: .long, time: .shortened)))
                .odText(.caption)
                .foregroundStyle(ODColor.cream50)
        }
        .padding(ODMetric.space5)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: ODMetric.radiusBlock).fill(ODColor.navy900))
    }
}

/// The block before the portfolio arrives, with the same line heights, so nothing below moves.
private struct BalanceBlockSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space4) {
            Skeleton(width: 48, height: 12, color: ODColor.navy800)
            Skeleton(width: 192, height: 36, color: ODColor.navy800)
            VStack(spacing: ODMetric.space3) {
                ForEach(0..<3, id: \.self) { _ in Skeleton(height: 12, color: ODColor.navy800) }
            }
            Skeleton(width: 140, height: 12, color: ODColor.navy800)
        }
        .padding(ODMetric.space5)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: ODMetric.radiusBlock).fill(ODColor.navy900))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.text("common.loading"))
        .accessibilityIdentifier("state.loading")
    }
}

/// A restricted account keeps the navigation, with a note and the way to support (decision 14);
/// pending items are counted.
private struct AccountNotes: View {
    let account: Account

    var body: some View {
        if account.status == .restricted {
            Notice(tone: .warning, title: L10n.text("account.title.restricted"), message: L10n.text("account.body.restricted")) {
                Link(L10n.text("account.actions.contact"), destination: AppConstants.supportURL)
                    .buttonStyle(.odGhost)
            }
        }
        if !account.pending.isEmpty {
            // TODO(decisão) 13: the link to Pendientes arrives with that tab (later phase).
            Notice(title: L10n.plural("home.pending", count: account.pending.count))
        }
    }
}
