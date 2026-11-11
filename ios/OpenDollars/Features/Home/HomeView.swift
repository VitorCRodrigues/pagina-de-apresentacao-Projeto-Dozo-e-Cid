import OpenDollarsCore
import SwiftUI

/// T4, phase 0: the total balance and how it is split. The total shown is the sum of the three
/// buckets (decision 15), so it always matches the lines below it.
struct HomeView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
                Text(L10n.text("home.title"))
                    .font(ODFont.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)

                switch model.portfolio {
                case .idle, .loading:
                    LoadingStateView().frame(minHeight: 240)
                case .failed(let error):
                    ErrorStateView(error: error) { Task { await model.loadHome() } }
                        .frame(minHeight: 320)
                case .loaded(let portfolio):
                    PortfolioSummary(portfolio: portfolio, locale: model.locale)
                    if case .loaded(let account) = model.account {
                        AccountNotes(account: account)
                    }
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

private struct PortfolioSummary: View {
    let portfolio: Portfolio
    let locale: AppLocale

    private var total: Money { (try? portfolio.displayedTotal()) ?? portfolio.totalCents }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Cream on navy; gold only on the "Total" label (decision 19).
            VStack(alignment: .leading, spacing: 8) {
                Text(L10n.text("portfolio.total"))
                    .font(ODFont.label)
                    .foregroundStyle(ODColor.gold500)
                MoneyText(money: total, locale: locale, font: ODFont.valueDisplay, centsFont: ODFont.valueDisplayCents)
                    .foregroundStyle(ODColor.cream50)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: ODMetric.radiusCard).fill(ODColor.navy900))
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("home.total")

            Card {
                Text(L10n.text("home.splitLabel"))
                    .font(ODFont.label)
                    .foregroundStyle(ODColor.gray600)
                BucketRow(labelKey: "portfolio.bucketsShort.invested", money: portfolio.buckets.investedCents, locale: locale)
                Divider().overlay(ODColor.gray200)
                BucketRow(labelKey: "portfolio.bucketsShort.ibkrCash", money: portfolio.buckets.ibkrCashCents, locale: locale)
                Divider().overlay(ODColor.gray200)
                BucketRow(labelKey: "portfolio.bucketsShort.inFlight", money: portfolio.buckets.inFlightCents, locale: locale)
            }

            Text(L10n.format("home.updatedAt", portfolio.asOf.formatted(date: .long, time: .omitted)))
                .font(ODFont.caption)
                .foregroundStyle(ODColor.gray600)
        }
    }
}

private struct BucketRow: View {
    let labelKey: String
    let money: Money
    let locale: AppLocale

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(L10n.text(labelKey))
                .font(ODFont.body)
                .foregroundStyle(ODColor.graphite900)
            Spacer(minLength: 12)
            MoneyText(money: money, locale: locale)
                .foregroundStyle(ODColor.graphite900)
        }
        .accessibilityElement(children: .combine)
    }
}

/// A restricted account keeps the navigation, with a note (decision 14); pending items are counted.
private struct AccountNotes: View {
    let account: Account

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if account.status == .restricted {
                Card {
                    Text(L10n.text("account.title.restricted"))
                        .font(ODFont.label)
                        .foregroundStyle(ODColor.amber700)
                    Text(L10n.text("account.body.restricted"))
                        .font(ODFont.body)
                        .foregroundStyle(ODColor.graphite900)
                    Link(L10n.text("account.actions.contact"), destination: AppConstants.supportURL)
                        .buttonStyle(SecondaryButtonStyle())
                }
            }
            if !account.pending.isEmpty {
                Text(L10n.plural("home.pending", count: account.pending.count))
                    .font(ODFont.body)
                    .foregroundStyle(ODColor.navy900)
            }
        }
    }
}
