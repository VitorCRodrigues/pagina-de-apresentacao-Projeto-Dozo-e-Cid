import OpenDollarsCore
import SwiftUI

// The states every screen has (web: PageState): loading, error, maintenance, signed out.

struct LoadingStateView: View {
    var body: some View {
        VStack(spacing: 12) {
            ProgressView().tint(ODColor.navy900)
            Text(L10n.text("states.loading"))
                .font(ODFont.caption)
                .foregroundStyle(ODColor.gray600)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ODColor.cream50)
        .accessibilityElement(children: .combine)
    }
}

struct ErrorStateView: View {
    let error: APIError
    let retry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.text("states.error.title"))
                .font(ODFont.title)
                .foregroundStyle(ODColor.navy900)
                .accessibilityAddTraits(.isHeader)
            // Translated by code, never by message (decision 12).
            Text(L10n.text(error.code.copyKey))
                .font(ODFont.body)
                .foregroundStyle(ODColor.gray600)
            Button(L10n.text("common.retry"), action: retry)
                .buttonStyle(PrimaryButtonStyle())
        }
        .padding(ODMetric.gutter)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .background(ODColor.cream50)
        .accessibilityIdentifier("state.error")
    }
}

struct MaintenanceView: View {
    let until: Date?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.text("states.maintenance.title"))
                .font(ODFont.title)
                .foregroundStyle(ODColor.navy900)
                .accessibilityAddTraits(.isHeader)
            Text(L10n.text("states.maintenance.body"))
                .font(ODFont.body)
                .foregroundStyle(ODColor.gray600)
            if let until {
                Text(L10n.format("states.maintenance.until", until.formatted(date: .omitted, time: .shortened)))
                    .font(ODFont.body)
                    .foregroundStyle(ODColor.graphite900)
            }
        }
        .padding(ODMetric.gutter)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .background(ODColor.cream50)
        .accessibilityIdentifier("state.maintenance")
    }
}

struct SignedOutView: View {
    let reason: SignOutReason?
    let signIn: () -> Void

    /// Inactivity and an expired session get the "your session ended" explanation; the client's
    /// own sign-out does not need one.
    private var explains: Bool { reason == .inactivity || reason == .sessionExpired }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(L10n.text(explains ? "states.sessionExpired.title" : "app.name"))
                .font(ODFont.title)
                .foregroundStyle(ODColor.navy900)
                .accessibilityAddTraits(.isHeader)
            if explains {
                Text(L10n.text("states.sessionExpired.body"))
                    .font(ODFont.body)
                    .foregroundStyle(ODColor.gray600)
            }
            Button(L10n.text("states.sessionExpired.action"), action: signIn)
                .buttonStyle(PrimaryButtonStyle())
        }
        .padding(ODMetric.gutter)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .background(ODColor.cream50)
        .accessibilityIdentifier("state.signedOut")
    }
}
