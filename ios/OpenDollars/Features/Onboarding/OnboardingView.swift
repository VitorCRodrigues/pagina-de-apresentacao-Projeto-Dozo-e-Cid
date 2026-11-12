import OpenDollarsCore
import SwiftUI

/// T2 (web: features/onboarding): eight steps with the draft saved on the server, resumed at the
/// first unsaved step. The wizard's state lives in the core's OnboardingFlow, owned by the
/// session, so any exit drops what was typed and not saved.
struct OnboardingView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            if let flow = model.session.onboarding {
                OnboardingContent(flow: flow)
            } else {
                StatePage { LoadingState(shape: .form) }
            }
        }
        .task {
            let flow = model.session.openOnboarding()
            if flow.loadState != .ready { await flow.load() }
        }
    }
}

private struct OnboardingContent: View {
    @Environment(AppModel.self) private var model
    @Bindable var flow: OnboardingFlow

    var body: some View {
        switch flow.loadState {
        case .loading:
            StatePage { LoadingState(shape: .form) }
        case .failed(let error):
            StatePage { ErrorState(error: error, titleSize: .title) { Task { await flow.load() } } }
        case .ready:
            ScrollView {
                VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
                    ODStepper(current: flow.position, total: OnboardingFlow.steps.count)
                    if let country = flow.waitlistCountry {
                        ResidenceWaitlist(flow: flow, country: country)
                    } else {
                        step
                        if let error = flow.saveError {
                            Notice(tone: .error, title: Strings.statesErrorTitle, message: L10n.text(error.code.copyKey))
                        }
                        footer
                    }
                    // Not on the web (a tab is closed instead): the only way out of the wizard
                    // besides inactivity (TODO(decisão) 26).
                    Button(Strings.sessionTimeoutSignOut) { Task { await model.session.signOut() } }
                        .buttonStyle(.odGhost)
                        .padding(.leading, -ODMetric.space1)
                        .accessibilityIdentifier("onboarding.signOut")
                }
                .padding(ODMetric.gutter)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            // A new step starts at the top.
            .id(flow.step)
            .scrollDismissesKeyboard(.interactively)
            .background(ODColor.cream50)
            .odStatusBarBackground()
        }
    }

    @ViewBuilder
    private var step: some View {
        switch flow.step {
        case .residence: ResidenceStep(flow: flow)
        case .personal: PersonalStep(flow: flow)
        case .address: AddressStep(flow: flow)
        case .suitability: SuitabilityStep(flow: flow)
        case .funds: FundsStep(flow: flow)
        case .identity: IdentityStep(flow: flow)
        case .terms: TermsStep(flow: flow)
        case .review: ReviewStep(flow: flow)
        }
    }

    /// One primary action (Continuar, or Enviar on the review), and Volver from step 2 on.
    private var footer: some View {
        VStack(spacing: ODMetric.space3) {
            if flow.step == .review {
                Button(Strings.onboardingActionsSubmit) { Task { await flow.submit() } }
                    .odButtonStyle(.primary, loading: flow.isSubmitting)
                    .accessibilityIdentifier("onboarding.submit")
            } else {
                Button(Strings.onboardingActionsContinue) { Task { await flow.saveAndContinue() } }
                    .odButtonStyle(.primary, loading: flow.isSaving)
                    .accessibilityIdentifier("onboarding.continue")
            }
            if flow.step != .residence {
                Button(Strings.onboardingActionsBack) { flow.back() }
                    .buttonStyle(.odSecondary)
                    .accessibilityIdentifier("onboarding.back")
            }
        }
    }
}

/// The title and the lead of a step; the title identifies the step for UI tests.
struct StepHeader: View {
    let step: OnboardingStep
    let title: String
    let lead: String

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space3) {
            Text(title)
                .odText(.title)
                .foregroundStyle(ODColor.navy900)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("onboarding.step.\(step.rawValue)")
            Text(lead)
                .odText(.body)
                .foregroundStyle(ODColor.gray600)
        }
    }
}

/// PRD T2, step 1: a residence outside the pilot ends with the waitlist.
private struct ResidenceWaitlist: View {
    @Environment(AppModel.self) private var model
    let flow: OnboardingFlow
    let country: String

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.sectionSpacing) {
            VStack(alignment: .leading, spacing: ODMetric.space3) {
                Text(Strings.onboardingResidenceWaitlistTitle(country: Countries.name(country)))
                    .odText(.title)
                    .foregroundStyle(ODColor.navy900)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("onboarding.waitlist")
                Text(Strings.onboardingResidenceWaitlistBody)
                    .odText(.body)
                    .foregroundStyle(ODColor.gray600)
            }
            WaitlistFormView(country: country, initialEmail: email, submitTitle: Strings.onboardingActionsJoinWaitlist)
            Button(Strings.onboardingResidenceChangeCountry) { flow.go(to: .residence) }
                .buttonStyle(.odSecondary)
        }
    }

    private var email: String {
        if !flow.personal.email.isEmpty { return flow.personal.email }
        if case .ready(let me) = model.session.phase { return me.email }
        return ""
    }
}

/// Country names in the client's language, from the system (web: Intl.DisplayNames).
enum Countries {
    static func name(_ code: String) -> String {
        L10n.foundationLocale.localizedString(forRegionCode: code) ?? code
    }

    static func options(_ codes: [String]) -> [ChoiceOption] {
        codes.map { ChoiceOption(value: $0, label: name($0)) }
            .sorted { $0.label.localizedStandardCompare($1.label) == .orderedAscending }
    }
}

/// The error of a field, translated by code (the same codes as the web).
extension OnboardingFlow {
    func errorText(_ field: String) -> String? {
        errors[field].map { L10n.text($0.copyKey) }
    }
}
