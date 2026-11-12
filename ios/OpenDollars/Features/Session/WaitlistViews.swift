import OpenDollarsCore
import SwiftUI

/// T1, the client's country outside config.liveMarkets (web: NotAvailableScreen.tsx): only the
/// waitlist, with the e-mail of the account, and the way out.
struct NotAvailableView: View {
    @Environment(AppModel.self) private var model
    let me: Me

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
                VStack(alignment: .leading, spacing: ODMetric.space3) {
                    Text(Strings.waitlistTitle)
                        .odText(.title)
                        .foregroundStyle(ODColor.navy900)
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityIdentifier("waitlist.title")
                    Text(Strings.waitlistBody)
                        .odText(.body)
                        .foregroundStyle(ODColor.gray600)
                }
                WaitlistFormView(country: me.country.rawValue, initialEmail: me.email, submitTitle: Strings.waitlistSubmit)
                Button(Strings.waitlistSignOut) { Task { await model.session.signOut() } }
                    .buttonStyle(.odGhost)
                    .padding(.leading, -ODMetric.space1)
                    .accessibilityIdentifier("waitlist.signOut")
            }
            .padding(ODMetric.gutter)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(ODColor.cream50)
        .odStatusBarBackground()
    }
}

/// The e-mail and the button; after sending, the confirmation in place of the form.
struct WaitlistFormView: View {
    @Environment(AppModel.self) private var model
    let country: String
    let submitTitle: String

    @State private var form: WaitlistForm
    @State private var invalid = false
    @State private var sending = false
    @State private var failed: APIError?
    @State private var sentTo: String?

    init(country: String, initialEmail: String, submitTitle: String) {
        self.country = country
        self.submitTitle = submitTitle
        _form = State(initialValue: WaitlistForm(email: initialEmail))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space4) {
            if let sentTo {
                Notice(title: Strings.waitlistDone(email: sentTo), quiet: true)
                    .accessibilityIdentifier("waitlist.done")
            } else {
                ODTextField(
                    label: Strings.waitlistEmailLabel, text: $form.email,
                    error: invalid ? Strings.waitlistInvalidEmail : nil,
                    keyboard: .emailAddress, contentType: .emailAddress, capitalization: .never, autocorrects: false,
                    identifier: "waitlist.email")
                if let failed {
                    Notice(tone: .error, title: L10n.text(failed.code.copyKey))
                }
                Button(submitTitle) { Task { await send() } }
                    .odButtonStyle(.primary, loading: sending)
                    .accessibilityIdentifier("waitlist.submit")
            }
        }
    }

    private func send() async {
        invalid = !form.validate().isEmpty
        failed = nil
        guard !invalid else { return }
        sending = true
        defer { sending = false }
        do {
            try await model.session.joinWaitlist(email: form.email, country: country)
            sentTo = form.email.trimmingCharacters(in: .whitespaces)
        } catch {
            failed = error as? APIError ?? APIError(status: 0, code: .internal)
        }
    }
}
