import OpenDollarsCore
import SwiftUI

/// T1 (web: EntryScreen.tsx). Left-aligned like a statement: what the product is, a rule, then
/// where the money lives; the language, the one action, and the closed pilot.
/// TODO(compliance): headline and pilot line pending legal review (PRD section 10).
struct EntryView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // TODO(marca): the name in Inter Display stands in for the official vector logo
                // (pilot list, item 21).
                Text(Strings.appName)
                    .odText(.heading)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)

                VStack(alignment: .leading, spacing: ODMetric.space8) {
                    Text(Strings.entryHeadline)
                        .odText(.display)
                        .foregroundStyle(ODColor.navy900)
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityIdentifier("entry.headline")
                    VStack(alignment: .leading, spacing: ODMetric.space4) {
                        Rule(color: ODColor.graphite900)
                        Text(Strings.entryCustody)
                            .odText(.body)
                            .foregroundStyle(ODColor.graphite900)
                    }
                }
                .padding(.vertical, 56)

                VStack(alignment: .leading, spacing: ODMetric.space5) {
                    if model.signInFailed {
                        Notice(tone: .error, title: Strings.entrySignInError)
                            .accessibilityIdentifier("entry.signInError")
                    }
                    LanguagePicker(selection: model.locale) { model.chooseLocale($0) }
                    Button(Strings.entrySignIn) { Task { await model.signIn() } }
                        .odButtonStyle(.primary, loading: model.isSigningIn)
                        .accessibilityIdentifier("entry.signIn")
                    VStack(alignment: .leading, spacing: 0) {
                        Text(Strings.entryPilot)
                            .odText(.caption)
                            .foregroundStyle(ODColor.gray600)
                        // TODO(compliance): the terms' link once the text exists (as on the web).
                        Button(Strings.entryTerms) {}
                            .buttonStyle(.odGhost)
                            .padding(.leading, -ODMetric.space1)
                    }
                }
            }
            .padding(.horizontal, ODMetric.space6)
            .padding(.vertical, ODMetric.space8)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(ODColor.cream50)
    }
}
