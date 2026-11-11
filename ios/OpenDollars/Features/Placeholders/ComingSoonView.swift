import SwiftUI

/// Phase 0 skeleton: a tab whose screens arrive in later phases. Never shipped to clients.
struct ComingSoonView: View {
    let titleKey: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.text(titleKey))
                .font(ODFont.title)
                .foregroundStyle(ODColor.navy900)
                .accessibilityAddTraits(.isHeader)
            Text(L10n.text("comingSoon.title"))
                .font(ODFont.label)
                .foregroundStyle(ODColor.gray600)
            Text(L10n.text("comingSoon.body"))
                .font(ODFont.body)
                .foregroundStyle(ODColor.gray600)
            Spacer()
        }
        .padding(ODMetric.gutter)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ODColor.cream50)
        .toolbar(.hidden, for: .navigationBar)
    }
}

/// Profile (T12) arrives later; phase 0 already has the sign-out button, one of the three exits
/// that clear the session.
struct ProfilePlaceholderView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
            ComingSoonView(titleKey: "nav.profile").frame(maxHeight: 200)
            Button(L10n.text("session.timeout.signOut")) {
                Task { await model.signOut() }
            }
            .buttonStyle(SecondaryButtonStyle())
            .padding(.horizontal, ODMetric.gutter)
            Spacer()
        }
        .background(ODColor.cream50)
        .toolbar(.hidden, for: .navigationBar)
    }
}
