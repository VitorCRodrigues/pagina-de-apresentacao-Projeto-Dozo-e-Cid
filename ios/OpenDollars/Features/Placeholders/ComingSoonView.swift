import SwiftUI

/// Phase 0 skeleton: a tab whose screens arrive in later phases. Never shipped to clients.
struct ComingSoonView: View {
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space3) {
            Text(title)
                .odText(.title)
                .foregroundStyle(ODColor.navy900)
                .accessibilityAddTraits(.isHeader)
            Text(Strings.devComingSoonTitle)
                .odText(.label)
                .foregroundStyle(ODColor.gray600)
            Text(Strings.devComingSoonBody)
                .odText(.body)
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
            ComingSoonView(title: Strings.navProfile).frame(maxHeight: 200)
            Button(Strings.sessionTimeoutSignOut) {
                Task { await model.signOut() }
            }
            .buttonStyle(.odSecondary)
            .accessibilityIdentifier("profile.signOut")
            .padding(.horizontal, ODMetric.gutter)
            Spacer()
        }
        .background(ODColor.cream50)
        .toolbar(.hidden, for: .navigationBar)
    }
}
