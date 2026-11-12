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
                Text(Strings.homeTitle)
                    .odText(.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)

                if case .loaded(let account) = model.session.account {
                    AccountNotes(account: account)
                }

                switch model.session.portfolio {
                case .idle, .loading:
                    BalanceBlockSkeleton()
                case .failed(let error):
                    ErrorState(error: error) { Task { await model.session.loadHome() } }
                case .loaded(let portfolio):
                    BalanceBlock(portfolio: portfolio, locale: model.locale)
                }

                CustodyNote()
            }
            .padding(ODMetric.gutter)
        }
        .background(ODColor.cream50)
        .odStatusBarBackground()
        .toolbar(.hidden, for: .navigationBar)
        .task { await model.session.loadHome() }
        .refreshable { await model.session.loadHome() }
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
                Text(Strings.portfolioTotal)
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
                LedgerRow(label: Strings.portfolioBucketsShortInvested, money: portfolio.buckets.investedCents, locale: locale)
                LedgerRow(label: Strings.portfolioBucketsShortIbkrCash, money: portfolio.buckets.ibkrCashCents, locale: locale)
                LedgerRow(label: Strings.portfolioBucketsShortInFlight, money: portfolio.buckets.inFlightCents, locale: locale)
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel(Strings.homeSplitLabel)

            Text(Strings.homeUpdatedAt(date: portfolio.asOf.formatted(Date.FormatStyle(date: .long, time: .shortened).locale(L10n.foundationLocale))))
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
        .accessibilityLabel(Strings.commonLoading)
        .accessibilityIdentifier("state.loading")
    }
}

/// A blocked account keeps the navigation, with the block's note (decision 14, AccountBlock);
/// pending items are counted.
private struct AccountNotes: View {
    let account: Account

    var body: some View {
        if let block = AccountBlock.of(account) {
            AccountBlockNote(block: block)
        }
        if !account.pending.isEmpty {
            // TODO(decisão) 13: the link to Pendientes arrives with that tab (later phase).
            Notice(title: Strings.homePending(count: account.pending.count))
        }
    }
}
