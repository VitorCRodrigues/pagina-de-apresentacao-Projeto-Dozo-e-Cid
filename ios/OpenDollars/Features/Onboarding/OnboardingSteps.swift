import OpenDollarsCore
import SwiftUI

// The eight steps of T2 (web: features/onboarding/steps). Each binds to its form in the
// OnboardingFlow; errors come from the flow, by field.

// MARK: 1. Residence

struct ResidenceStep: View {
    @Environment(AppModel.self) private var model
    @Bindable var flow: OnboardingFlow

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space6) {
            StepHeader(step: .residence, title: Strings.onboardingResidenceTitle, lead: Strings.onboardingResidenceLead)
            PickerField(
                label: Strings.onboardingResidenceCountry, selection: flow.residence.country,
                options: Countries.options(OnboardingLists.residenceCountries(liveMarkets: model.session.config?.liveMarkets ?? [])),
                error: flow.errorText("country"), identifier: "field.country"
            ) { flow.residence.country = $0 }
            PickerField(
                label: Strings.onboardingResidenceNationality, selection: flow.residence.nationality,
                options: Countries.options(OnboardingLists.countryCodes),
                error: flow.errorText("nationality"), identifier: "field.nationality"
            ) { flow.residence.nationality = $0 }
        }
    }
}

// MARK: 2. Personal data

struct PersonalStep: View {
    @Bindable var flow: OnboardingFlow

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space6) {
            StepHeader(step: .personal, title: Strings.onboardingPersonalTitle, lead: Strings.onboardingPersonalLead)
            ODTextField(
                label: Strings.onboardingPersonalFullName, text: $flow.personal.fullName,
                help: Strings.onboardingPersonalFullNameHelp, error: flow.errorText("fullName"),
                contentType: .name, capitalization: .words, autocorrects: false, identifier: "field.fullName")
            DateField(
                label: Strings.onboardingPersonalBirthDate, date: $flow.personal.birthDate,
                error: flow.errorText("birthDate"), identifier: "field.birthDate")
            ODTextField(
                label: Strings.onboardingPersonalDni, text: $flow.personal.dni,
                help: Strings.onboardingPersonalDniHelp, error: flow.errorText("dni"),
                keyboard: .numberPad, autocorrects: false, identifier: "field.dni")
            ODTextField(
                label: Strings.onboardingPersonalCuil, text: $flow.personal.cuil,
                help: Strings.onboardingPersonalCuilHelp, error: flow.errorText("cuil"),
                keyboard: .numberPad, autocorrects: false, identifier: "field.cuil")
            ODTextField(
                label: Strings.onboardingPersonalEmail, text: $flow.personal.email, error: flow.errorText("email"),
                keyboard: .emailAddress, contentType: .emailAddress, capitalization: .never, autocorrects: false,
                identifier: "field.email")
            ODTextField(
                label: Strings.onboardingPersonalPhone, text: $flow.personal.phone,
                help: Strings.onboardingPersonalPhoneHelp, error: flow.errorText("phone"),
                keyboard: .phonePad, contentType: .telephoneNumber, autocorrects: false, identifier: "field.phone")
        }
    }
}

// MARK: 3. Address

struct AddressStep: View {
    @Bindable var flow: OnboardingFlow

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space6) {
            StepHeader(step: .address, title: Strings.onboardingAddressTitle, lead: Strings.onboardingAddressLead)
            ODTextField(
                label: Strings.onboardingAddressStreet, text: $flow.address.street, error: flow.errorText("street"),
                contentType: .streetAddressLine1, capitalization: .words, autocorrects: false, identifier: "field.street")
            ODTextField(
                label: Strings.onboardingAddressUnit, text: $flow.address.unit, isOptional: true,
                contentType: .streetAddressLine2, autocorrects: false, identifier: "field.unit")
            ODTextField(
                label: Strings.onboardingAddressCity, text: $flow.address.city, error: flow.errorText("city"),
                contentType: .addressCity, capitalization: .words, autocorrects: false, identifier: "field.city")
            PickerField(
                label: Strings.onboardingAddressProvince, selection: flow.address.province,
                options: OnboardingLists.provinces.map { ChoiceOption(value: $0.code, label: $0.name) },
                error: flow.errorText("province"), identifier: "field.province"
            ) { flow.address.province = $0 }
            // CPA: a letter, four digits, three letters. Numbers first, letters one tap away
            // (TODO(decisão) 30).
            ODTextField(
                label: Strings.onboardingAddressPostalCode, text: $flow.address.postalCode,
                help: Strings.onboardingAddressPostalCodeHelp, error: flow.errorText("postalCode"),
                keyboard: .numbersAndPunctuation, contentType: .postalCode, capitalization: .characters, autocorrects: false,
                identifier: "field.postalCode")
        }
    }
}

// MARK: 4. Investor profile (questions from the API)

struct SuitabilityStep: View {
    @Bindable var flow: OnboardingFlow

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space8) {
            StepHeader(step: .suitability, title: Strings.onboardingSuitabilityTitle, lead: Strings.onboardingSuitabilityLead)
            ForEach(flow.questionnaire?.questions ?? []) { question in
                let options = question.options.map { ChoiceOption(value: $0.value, label: $0.label) }
                switch question.kind {
                case .single:
                    SingleChoiceList(
                        label: question.label, options: options, selection: single(question.id),
                        error: flow.errorText(question.id), identifier: "question.\(question.id)"
                    ) { flow.suitability.answers[question.id] = .single($0) }
                case .multi:
                    MultiChoiceList(
                        label: question.label, hint: Strings.onboardingSuitabilityMultiHint, options: options,
                        selection: multi(question.id), error: flow.errorText(question.id), identifier: "question.\(question.id)"
                    ) { value in
                        var picked = multi(question.id)
                        if let index = picked.firstIndex(of: value) { picked.remove(at: index) } else { picked.append(value) }
                        flow.suitability.answers[question.id] = .multi(picked)
                    }
                }
            }
        }
    }

    private func single(_ id: String) -> String? {
        if case .single(let value)? = flow.suitability.answers[id] { return value }
        return nil
    }

    private func multi(_ id: String) -> [String] {
        if case .multi(let values)? = flow.suitability.answers[id] { return values }
        return []
    }
}

// MARK: 5. Funds and occupation

struct FundsStep: View {
    @Bindable var flow: OnboardingFlow

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space8) {
            StepHeader(step: .funds, title: Strings.onboardingFundsTitle, lead: Strings.onboardingFundsLead)
            SingleChoiceList(
                label: Strings.onboardingFundsOccupation,
                options: OnboardingLists.occupations.map { ChoiceOption(value: $0, label: L10n.text(OnboardingLists.occupationKey($0))) },
                selection: flow.funds.occupation.isEmpty ? nil : flow.funds.occupation,
                error: flow.errorText("occupation"), identifier: "field.occupation"
            ) { flow.funds.occupation = $0 }
            SingleChoiceList(
                label: Strings.onboardingFundsSource, hint: Strings.onboardingFundsSourceWhy,
                options: OnboardingLists.fundSources.map { ChoiceOption(value: $0, label: L10n.text(OnboardingLists.fundSourceKey($0))) },
                selection: flow.funds.sourceOfFunds.isEmpty ? nil : flow.funds.sourceOfFunds,
                error: flow.errorText("sourceOfFunds"), identifier: "field.sourceOfFunds"
            ) { flow.funds.sourceOfFunds = $0 }
            SingleChoiceList(
                label: Strings.onboardingFundsPep, hint: Strings.onboardingFundsPepWhy,
                options: [ChoiceOption(value: "yes", label: Strings.onboardingFundsYes), ChoiceOption(value: "no", label: Strings.onboardingFundsNo)],
                selection: flow.funds.isPep.map { $0 ? "yes" : "no" },
                error: flow.errorText("isPep"), identifier: "field.isPep"
            ) { flow.funds.isPep = $0 == "yes" }
            if flow.funds.isPep == true {
                ODTextField(
                    label: Strings.onboardingFundsPepRole, text: $flow.funds.pepRole, error: flow.errorText("pepRole"),
                    capitalization: .sentences, identifier: "field.pepRole")
            }
        }
    }
}

// MARK: 6. Identity

/// The vendor's flow behind IdentityVerifier (TODO(fase 11): its SDK). Leaving the step cancels
/// a verification still running.
struct IdentityStep: View {
    @Environment(AppModel.self) private var model
    @Bindable var flow: OnboardingFlow
    @State private var running: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space6) {
            StepHeader(step: .identity, title: Strings.onboardingIdentityTitle, lead: Strings.onboardingIdentityLead)
            if flow.identity.reference != nil {
                Notice(title: Strings.onboardingIdentityApproved, quiet: true)
                    .accessibilityIdentifier("identity.approved")
            } else if flow.isVerifyingIdentity {
                VStack(alignment: .leading, spacing: ODMetric.space2) {
                    InlineLoading()
                    Text(Strings.onboardingIdentityRunning).odText(.body).foregroundStyle(ODColor.graphite900)
                }
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("identity.running")
            } else {
                Text(Strings.onboardingIdentityNeed).odText(.body).foregroundStyle(ODColor.graphite900)
                if flow.identityOutcome == .failed || flow.identityOutcome == .cancelled {
                    Notice(tone: .error, title: Strings.onboardingIdentityFailed)
                }
                if let error = flow.errorText("identity") { FieldError(text: error) }
                Button(Strings.onboardingIdentityStart) { start() }
                    .buttonStyle(.odSecondary)
                    .accessibilityIdentifier("identity.start")
            }
        }
        .onDisappear { running?.cancel() }
    }

    private func start() {
        running = Task { await flow.verifyIdentity(with: model.identityVerifier, locale: model.locale) }
    }
}

// MARK: 7. Terms

struct TermsStep: View {
    @Bindable var flow: OnboardingFlow

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space6) {
            StepHeader(step: .terms, title: Strings.onboardingTermsTitle, lead: Strings.onboardingTermsLead)
            Ledger {
                ForEach(flow.terms) { doc in
                    LedgerItem {
                        VStack(alignment: .leading, spacing: ODMetric.space2) {
                            ODCheckbox(
                                label: Strings.onboardingTermsAccept(title: doc.title), isOn: flow.termsForm.checked[doc.id] != nil,
                                toggle: { flow.toggleTerm(doc.id) }, error: flow.errorText(doc.id), identifier: "terms.\(doc.id)")
                            if doc.kind == .ibkr_data_consent {
                                Text(Strings.onboardingTermsIbkrConsent).odText(.caption).foregroundStyle(ODColor.gray600)
                            }
                            // TODO(compliance): the documents' full text, as on the web (drafts pending review).
                            if let url = URL(string: doc.url), url.scheme != nil {
                                Link(Strings.onboardingTermsRead, destination: url)
                                    .buttonStyle(.odGhost)
                                    .padding(.leading, -ODMetric.space1)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: 8. Review

struct ReviewStep: View {
    @Environment(AppModel.self) private var model
    let flow: OnboardingFlow

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space8) {
            StepHeader(step: .review, title: Strings.onboardingReviewTitle, lead: Strings.onboardingReviewLead)
            section(.residence, Strings.onboardingStepsResidence) {
                row(Strings.onboardingResidenceCountry, Countries.name(flow.residence.country))
                row(Strings.onboardingResidenceNationality, Countries.name(flow.residence.nationality))
            }
            section(.personal, Strings.onboardingStepsPersonal) {
                row(Strings.onboardingPersonalFullName, flow.personal.fullName)
                row(Strings.onboardingPersonalBirthDate, flow.personal.birthDate.map(DateField.format) ?? "")
                row(Strings.onboardingPersonalDni, PersonalFormDisplay.dni(flow.personal.dni))
                row(Strings.onboardingPersonalCuil, CUIT.format(flow.personal.cuil))
                row(Strings.onboardingPersonalEmail, flow.personal.email)
                row(Strings.onboardingPersonalPhone, flow.personal.phone)
            }
            section(.address, Strings.onboardingStepsAddress) {
                row(Strings.onboardingAddressStreet, flow.address.street)
                if !flow.address.unit.isEmpty { row(Strings.onboardingAddressUnit, flow.address.unit) }
                row(Strings.onboardingAddressCity, flow.address.city)
                row(Strings.onboardingAddressProvince, OnboardingLists.provinces.first { $0.code == flow.address.province }?.name ?? "")
                row(Strings.onboardingAddressPostalCode, flow.address.postalCode.uppercased())
            }
            section(.suitability, Strings.onboardingStepsSuitability) {
                ForEach(flow.questionnaire?.questions ?? []) { question in
                    row(question.label, answerLabels(question))
                }
            }
            section(.funds, Strings.onboardingStepsFunds) {
                row(Strings.onboardingFundsOccupation, L10n.text(OnboardingLists.occupationKey(flow.funds.occupation)))
                row(Strings.onboardingFundsSource, L10n.text(OnboardingLists.fundSourceKey(flow.funds.sourceOfFunds)))
                row(Strings.onboardingFundsPep, flow.funds.isPep == true ? Strings.onboardingFundsYes : Strings.onboardingFundsNo)
                if flow.funds.isPep == true { row(Strings.onboardingFundsPepRole, flow.funds.pepRole) }
            }
            section(.identity, Strings.onboardingStepsIdentity) {
                row(Strings.onboardingStepsIdentity, Strings.onboardingReviewVerified)
            }
            section(.terms, Strings.onboardingStepsTerms) {
                row(Strings.onboardingStepsTerms, Strings.onboardingReviewTermsAccepted(count: flow.termsForm.checked.count))
            }
            Text(Strings.onboardingReviewAfter).odText(.body).foregroundStyle(ODColor.gray600)
        }
    }

    private func section<Rows: View>(_ step: OnboardingStep, _ title: String, @ViewBuilder rows: () -> Rows) -> some View {
        VStack(alignment: .leading, spacing: ODMetric.space3) {
            SectionHeader(title: title, actionTitle: Strings.onboardingActionsEdit) { flow.go(to: step) }
                .accessibilityHint(Strings.onboardingReviewEditSection(section: title))
            Ledger { rows() }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("review.\(step.rawValue)")
    }

    private func row(_ label: String, _ value: String) -> some View {
        LedgerItem {
            VStack(alignment: .leading, spacing: ODMetric.space1) {
                Text(label).odText(.caption).foregroundStyle(ODColor.gray600)
                Text(value).odText(.body).foregroundStyle(ODColor.graphite900)
            }
            .accessibilityElement(children: .combine)
        }
    }

    private func answerLabels(_ question: Questionnaire.Question) -> String {
        let picked: [String]
        switch flow.suitability.answers[question.id] {
        case .single(let value)?: picked = [value]
        case .multi(let values)?: picked = values
        case nil: picked = []
        }
        return question.options.filter { picked.contains($0.value) }.map(\.label).joined(separator: ", ")
    }
}

/// "30123456" -> "30.123.456", as the DNI is printed.
enum PersonalFormDisplay {
    static func dni(_ value: String) -> String {
        let digits = Array(value.filter(\.isNumber))
        guard (7...8).contains(digits.count) else { return value }
        var groups: [String] = []
        var end = digits.count
        while end > 0 {
            let start = max(0, end - 3)
            groups.insert(String(digits[start..<end]), at: 0)
            end = start
        }
        return groups.joined(separator: ".")
    }
}
