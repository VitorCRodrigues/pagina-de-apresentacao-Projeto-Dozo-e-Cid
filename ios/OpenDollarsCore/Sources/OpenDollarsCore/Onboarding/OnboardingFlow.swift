import Foundation
import Observation

/// The onboarding wizard (PRD T2): eight steps with the draft saved on the server, resumed at the
/// first unsaved step (api-gaps.md, item 2). The forms hold what the client typed and has not
/// saved yet, so Volver and Continuar keep it (web: draft-memory.ts). The flow belongs to the
/// ClientSession, which drops it on every exit with the rest of the client's data; an answer that
/// arrives after the exit writes nothing back (TODO(decisão) 29).
@MainActor
@Observable
public final class OnboardingFlow {
    public enum LoadState: Equatable, Sendable {
        case loading
        case ready
        case failed(APIError)
    }

    public static let steps = OnboardingStep.allCases

    public private(set) var loadState: LoadState = .loading
    public private(set) var draft: OnboardingDraft?
    public private(set) var questionnaire: Questionnaire?
    public private(set) var terms: [TermsDocument] = []
    /// The step on screen.
    public private(set) var step: OnboardingStep = .residence
    /// The current step's field errors, from the client or the server.
    public private(set) var errors: FieldErrors = [:]
    /// A save or submit that failed without field errors (network, server).
    public private(set) var saveError: APIError?
    public private(set) var isSaving = false
    public private(set) var isSubmitting = false
    /// Step 1 named a country outside the pilot: the step shows the waitlist (PRD T2, step 1).
    public private(set) var waitlistCountry: String?
    public private(set) var isVerifyingIdentity = false
    public private(set) var identityOutcome: IdentityResult?

    // What the client typed, saved or not.
    public var residence = ResidenceForm()
    public var personal = PersonalForm()
    public var address = AddressForm()
    public var suitability = SuitabilityForm()
    public var funds = FundsForm()
    public var identity = IdentityForm()
    public var termsForm = TermsForm()

    /// "Paso n de 8".
    public var position: Int { (Self.steps.firstIndex(of: step) ?? 0) + 1 }

    @ObservationIgnored private let client: APIClient
    @ObservationIgnored private let isCurrent: @MainActor () -> Bool
    @ObservationIgnored private let now: @Sendable () -> Date
    @ObservationIgnored private let liveMarkets: @MainActor () -> [Country]
    @ObservationIgnored private let onSubmitted: @MainActor () async -> Void

    init(
        client: APIClient, isCurrent: @escaping @MainActor () -> Bool, now: @escaping @Sendable () -> Date,
        liveMarkets: @escaping @MainActor () -> [Country], onSubmitted: @escaping @MainActor () async -> Void
    ) {
        self.client = client
        self.isCurrent = isCurrent
        self.now = now
        self.liveMarkets = liveMarkets
        self.onSubmitted = onSubmitted
    }

    // MARK: Loading and resuming

    public func load() async {
        loadState = .loading
        do {
            async let fetchingDraft = client.getOnboarding()
            async let fetchingQuestionnaire = client.getQuestionnaire()
            async let fetchingTerms = client.getTerms()
            let (loadedDraft, loadedQuestionnaire, loadedTerms) = try await (fetchingDraft, fetchingQuestionnaire, fetchingTerms)
            guard isCurrent() else { return }
            guard loadedQuestionnaire.canRender else {
                loadState = .failed(APIError(status: 200, code: .invalid_response, message: "Questionnaire cannot be drawn"))
                return
            }
            questionnaire = loadedQuestionnaire
            terms = loadedTerms
            apply(loadedDraft)
            step = loadedDraft.currentStep
            loadState = .ready
        } catch {
            guard isCurrent() else { return }
            loadState = .failed(error as? APIError ?? APIError(status: 0, code: .internal))
        }
    }

    /// The forms take the saved steps; a step the client is still typing in keeps its text.
    private func apply(_ saved: OnboardingDraft) {
        draft = saved
        let steps = saved.steps
        residence = ResidenceForm(draft: steps[.residence])
        personal = PersonalForm(draft: steps[.personal])
        address = AddressForm(draft: steps[.address])
        if let questionnaire { suitability = SuitabilityForm(questionnaire: questionnaire, draft: steps[.suitability]) }
        funds = FundsForm(draft: steps[.funds])
        identity = IdentityForm(draft: steps[.identity])
        termsForm = TermsForm(docs: terms, draft: steps[.terms])
    }

    // MARK: Moving between steps

    /// Only up to the first unsaved step.
    public func canVisit(_ target: OnboardingStep) -> Bool {
        guard let current = draft?.currentStep,
              let targetIndex = Self.steps.firstIndex(of: target), let currentIndex = Self.steps.firstIndex(of: current)
        else { return false }
        return targetIndex <= currentIndex
    }

    public func go(to target: OnboardingStep) {
        guard canVisit(target) else { return }
        step = target
        errors = [:]
        saveError = nil
        waitlistCountry = nil
    }

    /// Volver: nothing is saved or lost.
    public func back() {
        guard let index = Self.steps.firstIndex(of: step), index > 0 else { return }
        go(to: Self.steps[index - 1])
    }

    // MARK: Saving

    public func validate(_ step: OnboardingStep) -> FieldErrors {
        switch step {
        case .residence: residence.validate()
        case .personal: personal.validate(today: CalendarDate(now()))
        case .address: address.validate()
        case .suitability: questionnaire.map(suitability.validate) ?? [:]
        case .funds: funds.validate()
        case .identity: identity.validate()
        case .terms: termsForm.validate(terms)
        case .review: [:]
        }
    }

    private func draftValue(_ step: OnboardingStep) -> [String: JSONValue] {
        switch step {
        case .residence: residence.draftValue
        case .personal: personal.draftValue
        case .address: address.draftValue
        case .suitability: suitability.draftValue
        case .funds: funds.draftValue
        case .identity: identity.draftValue
        case .terms: termsForm.draftValue(terms)
        case .review: [:]
        }
    }

    /// Continuar: validates, saves the step, and moves on. After an edit from the review, back
    /// to the review (the server keeps currentStep there).
    public func saveAndContinue() async {
        guard step != .review, !isSaving else { return }
        let saving = step
        errors = validate(saving)
        saveError = nil
        guard errors.isEmpty else { return }

        // PRD T2, step 1: a residence outside the pilot ends with the waitlist; nothing is saved.
        if saving == .residence, !liveMarkets().contains(where: { $0.rawValue == residence.country }) {
            waitlistCountry = residence.country
            return
        }

        isSaving = true
        defer { isSaving = false }
        do {
            let saved = try await client.saveOnboardingStep(saving, draftValue(saving))
            guard isCurrent() else { return }
            draft = saved
            guard let index = Self.steps.firstIndex(of: saving) else { return }
            step = saved.currentStep == .review ? .review : Self.steps[min(index + 1, Self.steps.count - 1)]
        } catch let error as APIError {
            guard isCurrent() else { return }
            let fieldErrors = error.fields.compactMapValues(OnboardingError.init(rawValue:))
            if fieldErrors.isEmpty {
                saveError = error
            } else {
                errors = fieldErrors
            }
        } catch {
            guard isCurrent() else { return }
            saveError = APIError(status: 0, code: .internal)
        }
    }

    // MARK: Step 6: identity

    public func verifyIdentity(with verifier: any IdentityVerifier, locale: AppLocale = .default) async {
        guard !isVerifyingIdentity else { return }
        isVerifyingIdentity = true
        defer { isVerifyingIdentity = false }
        let result = await verifier.verify(locale: locale)
        guard isCurrent() else { return }
        identityOutcome = result
        if case .approved(let reference) = result {
            identity.reference = reference
            errors = [:]
        }
    }

    // MARK: Step 7: terms

    /// Ticking records when; unticking forgets it.
    public func toggleTerm(_ id: String) {
        if termsForm.checked[id] == nil {
            termsForm.checked[id] = now()
        } else {
            termsForm.checked[id] = nil
        }
    }

    // MARK: Step 8: review and submit

    public func submit() async {
        guard step == .review, !isSubmitting else { return }
        isSubmitting = true
        defer { isSubmitting = false }
        saveError = nil
        do {
            _ = try await client.submitOnboarding()
            guard isCurrent() else { return }
            await onSubmitted()
        } catch {
            guard isCurrent() else { return }
            saveError = error as? APIError ?? APIError(status: 0, code: .internal)
        }
    }
}
