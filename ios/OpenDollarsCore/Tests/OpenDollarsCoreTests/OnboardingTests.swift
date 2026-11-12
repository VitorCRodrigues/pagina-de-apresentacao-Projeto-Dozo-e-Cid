import Foundation
import Testing
@testable import OpenDollarsCore

// Phase 4: T2 onboarding. Ports of web/src/features/onboarding/schemas.test.ts, steps.test.ts,
// resume.test.tsx and the onboarding routes of web/src/mocks/handlers.ts.

private let today = CalendarDate(year: 2026, month: 10, day: 29)

private func lucia() -> PersonalForm {
    PersonalForm(
        fullName: "Lucía Fernández", birthDate: CalendarDate(year: 1987, month: 4, day: 12),
        dni: "30123456", cuil: "27301234568", email: "lucia.fernandez@example.com", phone: "+54 9 11 5555-0142")
}

// MARK: - Validation (schemas.ts)

@Suite struct ResidenceValidationTests {
    @Test func requiresTwoCountries() {
        #expect(ResidenceForm(country: "AR", nationality: "UY").validate().isEmpty)
        // A choice, not something to type: "Elegí una opción" (web D14).
        #expect(ResidenceForm(country: "", nationality: "AR").validate() == ["country": .pickOne])
    }
}

@Suite struct PersonalValidationTests {
    private func errors(_ change: (inout PersonalForm) -> Void) -> FieldErrors {
        var form = lucia()
        change(&form)
        return form.validate(today: today)
    }

    @Test func acceptsLucia() {
        #expect(errors { _ in }.isEmpty)
    }

    @Test func asksForTheFullNameAsInTheDocument() {
        #expect(errors { $0.fullName = "Lucía" } == ["fullName": .nameTwoWords])
        #expect(errors { $0.fullName = "Lucía F3rnández" } == ["fullName": .invalidName])
        #expect(errors { $0.fullName = "María José O'Connor-Peña" }.isEmpty)
        #expect(errors { $0.fullName = "  " } == ["fullName": .required])
    }

    @Test func checksTheCUILCheckDigit() {
        #expect(errors { $0.cuil = "27301234560" } == ["cuil": .cuitCheckDigit])
        #expect(errors { $0.cuil = "2730" } == ["cuil": .invalidCuit])
    }

    @Test func rejectsAValidCUILOfAnotherDNI() {
        #expect(errors { $0.dni = "30123457" } == ["cuil": .cuitDniMismatch])
    }

    @Test func acceptsADNIWithDotsAndACUILWithDashes() {
        #expect(errors { $0.dni = "30.123.456"; $0.cuil = "27-30123456-8" }.isEmpty)
        #expect(errors { $0.dni = "123" } == ["dni": .invalidDni])
    }

    @Test func needsEighteenFullYearsCountingTheBirthdayItself() {
        #expect(errors { $0.birthDate = CalendarDate(year: 2008, month: 10, day: 30) } == ["birthDate": .underage])
        #expect(errors { $0.birthDate = CalendarDate(year: 2008, month: 10, day: 29) }.isEmpty)
        #expect(errors { $0.birthDate = CalendarDate(year: 1900, month: 1, day: 1) } == ["birthDate": .invalidDate])
        #expect(errors { $0.birthDate = CalendarDate(year: 2027, month: 1, day: 1) } == ["birthDate": .invalidDate])
    }

    // The date field starts empty ("Elegir fecha"): nothing is valid until the client picks.
    @Test func anUnpickedBirthDateIsRequired() {
        #expect(errors { $0.birthDate = nil } == ["birthDate": .required])
    }

    @Test func validatesEmailAndPhone() {
        #expect(errors { $0.email = "not-an-email" } == ["email": .invalidEmail])
        #expect(errors { $0.phone = "12345" } == ["phone": .invalidPhone])
        #expect(errors { $0.phone = "+54 9 11 abc" } == ["phone": .invalidPhone])
    }

    @Test func savesDNIAndCUILAsDigitsWhateverWasTyped() {
        var form = lucia()
        form.dni = "30.123.456"
        form.cuil = "27-30123456-8"
        let saved = form.draftValue
        #expect(saved["dni"] == .string("30123456"))
        #expect(saved["cuil"] == .string("27301234568"))
        #expect(saved["birthDate"] == .string("1987-04-12"))
        #expect(PersonalForm(draft: saved) == PersonalForm(
            fullName: form.fullName, birthDate: form.birthDate, dni: "30123456", cuil: "27301234568",
            email: form.email, phone: form.phone))
    }

    @Test func aResumedDraftShowsTheSavedDate() {
        #expect(PersonalForm(draft: lucia().draftValue).birthDate == CalendarDate(year: 1987, month: 4, day: 12))
        #expect(PersonalForm(draft: nil).birthDate == nil)
    }
}

@Suite struct AddressValidationTests {
    private func form(_ postalCode: String, province: String = "C") -> AddressForm {
        AddressForm(street: "Av. Corrientes 1234", unit: "", city: "Buenos Aires", province: province, postalCode: postalCode)
    }

    @Test func acceptsACPAAndAFourDigitPostalCode() {
        #expect(form("C1043AAZ").validate().isEmpty)
        #expect(form("1043").validate().isEmpty)
    }

    @Test func rejectsAShortPostalCodeAndAnUnknownProvince() {
        #expect(form("C104").validate() == ["postalCode": .invalidPostalCode])
        #expect(form("1043", province: "XX").validate() == ["province": .pickOne])
    }

    @Test func leavesAnEmptyUnitOutOfTheDraft() {
        #expect(form("1043").draftValue["unit"] == nil)
    }
}

@Suite struct FundsValidationTests {
    @Test func requiresThePEPRoleOnlyForAPEP() {
        var funds = FundsForm(occupation: "employee", sourceOfFunds: "salary", isPep: false, pepRole: "")
        #expect(funds.validate().isEmpty)
        funds.isPep = true
        #expect(funds.validate() == ["pepRole": .required])
        funds.pepRole = "Concejal"
        #expect(funds.validate().isEmpty)
    }

    @Test func requiresAnAnswerToThePEPQuestion() {
        #expect(FundsForm(occupation: "employee", sourceOfFunds: "salary", isPep: nil, pepRole: "").validate() == ["isPep": .pickOne])
    }

    @Test func onlyListedOccupationsAndSources() {
        #expect(FundsForm(occupation: "astronaut", sourceOfFunds: "salary", isPep: false, pepRole: "").validate() == ["occupation": .pickOne])
    }
}

@Suite struct TermsValidationTests {
    private let docs = [
        TermsDocument(id: "terms-advisory", kind: .advisory_agreement, version: "2", title: "A", url: "#a"),
        TermsDocument(id: "terms-ibkr-consent", kind: .ibkr_data_consent, version: "1", title: "B", url: "#b"),
    ]
    private let at = Date(timeIntervalSince1970: 1_793_278_800)

    @Test func needsEveryDocumentCheckedTheIBKRConsentIncluded() {
        #expect(TermsForm(checked: ["terms-advisory": at, "terms-ibkr-consent": at]).validate(docs).isEmpty)
        #expect(TermsForm(checked: ["terms-advisory": at]).validate(docs) == ["terms-ibkr-consent": .termsRequired])
    }

    @Test func savesIdVersionAndAcceptedAtForEachDocument() throws {
        let draft = TermsForm(checked: ["terms-advisory": at, "terms-ibkr-consent": at]).draftValue(docs)
        guard case .array(let accepted)? = draft["accepted"] else {
            Issue.record("no accepted list")
            return
        }
        #expect(accepted.count == 2)
        #expect(TermsForm(docs: docs, draft: draft).checked == ["terms-advisory": at, "terms-ibkr-consent": at])
    }

    @Test func doesNotCarryOverTheAcceptanceOfAnOldVersion() {
        let old = TermsForm(checked: ["terms-advisory": at, "terms-ibkr-consent": at])
            .draftValue([TermsDocument(id: "terms-advisory", kind: .advisory_agreement, version: "1", title: "A", url: "#a"), docs[1]])
        #expect(TermsForm(docs: docs, draft: old).checked == ["terms-ibkr-consent": at])
        #expect(TermsForm(docs: docs, draft: nil).checked.isEmpty)
    }
}

@Suite struct SuitabilityValidationTests {
    private let questionnaire = Questionnaire(version: "test", questions: [
        .init(id: "q1", kind: .single, label: "Q1", options: [.init(value: "a", label: "A"), .init(value: "b", label: "B")]),
        .init(id: "q2", kind: .multi, label: "Q2", options: [.init(value: "x", label: "X"), .init(value: "y", label: "Y")]),
    ])

    @Test func oneAnswerPerAPIQuestion() {
        #expect(SuitabilityForm(answers: ["q1": .single("a"), "q2": .multi(["x", "y"])]).validate(questionnaire).isEmpty)
    }

    @Test func rejectsAnUnansweredMultiAndAnOptionTheAPIDidNotSend() {
        #expect(SuitabilityForm(answers: ["q1": .single("c"), "q2": .multi([])]).validate(questionnaire) == ["q1": .pickOne, "q2": .pickOne])
        #expect(SuitabilityForm(answers: ["q1": .single("a"), "q2": .multi(["z"])]).validate(questionnaire) == ["q2": .pickOne])
    }

    @Test func roundTripsThroughTheDraft() {
        let form = SuitabilityForm(answers: ["q1": .single("a"), "q2": .multi(["y", "x"])])
        #expect(SuitabilityForm(questionnaire: questionnaire, draft: form.draftValue).answers == form.answers)
    }

    // web: question-guard.ts. A question the client cannot draw makes the step show its error.
    @Test func aQuestionWithoutOptionsCannotBeDrawn() {
        let empty = Questionnaire(version: "t", questions: [.init(id: "q", kind: .single, label: "Q", options: [])])
        #expect(questionnaire.canRender)
        #expect(empty.canRender == false)
    }

    @Test func anUnknownQuestionKindFailsTheQuestionnaire() {
        let json = #"{"version":"t","questions":[{"id":"q","kind":"slider","label":"Q","options":[{"value":"a","label":"A"}]}]}"#
        #expect(throws: (any Error).self) { try JSONCoding.makeDecoder().decode(Questionnaire.self, from: Data(json.utf8)) }
    }

    @Test func errorsHaveTheirTextKeys() throws {
        let keys = try StringCatalogs.keys()
        for error in OnboardingError.allCases { #expect(keys.contains(error.copyKey), "\(error.copyKey)") }
    }
}

// MARK: - Lists (countries.ts)

@Suite struct OnboardingListsTests {
    @Test func theSameListsAsTheWeb() {
        #expect(OnboardingLists.provinces.count == 24)
        #expect(OnboardingLists.provinces.first?.code == "C")
        #expect(OnboardingLists.occupations == ["employee", "self_employed", "business_owner", "retired", "student", "other"])
        #expect(OnboardingLists.fundSources == ["salary", "business", "savings", "investments", "inheritance", "property_sale", "other"])
        #expect(OnboardingLists.countryCodes.count == 20)
    }

    @Test func everyCodeHasItsText() throws {
        let keys = try StringCatalogs.keys()
        for code in OnboardingLists.occupations { #expect(keys.contains(OnboardingLists.occupationKey(code)), "\(code)") }
        for code in OnboardingLists.fundSources { #expect(keys.contains(OnboardingLists.fundSourceKey(code)), "\(code)") }
    }

    // "Nothing of BR in the interface today" (web decision 5): product markets not live yet stay
    // off the list; other countries lead to the waitlist.
    @Test func residenceHidesProductMarketsThatAreNotLive() {
        let codes = OnboardingLists.residenceCountries(liveMarkets: [.AR])
        #expect(codes.contains("AR"))
        #expect(codes.contains("UY"))
        #expect(!codes.contains("BR"))
        #expect(OnboardingLists.residenceCountries(liveMarkets: [.AR, .BR]).contains("BR"))
    }
}

// MARK: - Where a signed-in client lands (account-routing.ts and RequireSession.tsx)

@Suite struct LandingWithConfigTests {
    private func me(_ status: AccountStatus, _ country: Country = .AR) -> Me {
        Me(id: "u", name: "N", email: "e@x.com", country: country, locale: .es, accountStatus: status)
    }

    @Test func aCountryOutsideThePilotGoesToTheWaitlistFirst() {
        #expect(Landing.for(me(.open, .BR), liveMarkets: [.AR]) == .notAvailable)
        #expect(Landing.for(me(.draft, .BR), liveMarkets: [.AR]) == .notAvailable)
    }

    @Test func aDraftGoesToOnboarding() {
        #expect(Landing.for(me(.draft), liveMarkets: [.AR]) == .onboarding)
    }

    @Test func theRestAsBefore() {
        #expect(Landing.for(me(.open), liveMarkets: [.AR]) == .tabs)
        #expect(Landing.for(me(.restricted), liveMarkets: [.AR]) == .tabs)
        #expect(Landing.for(me(.submitted), liveMarkets: [.AR]) == .accountStatus)
        #expect(Landing.for(me(.unknown("x")), liveMarkets: [.AR]) == .accountStatus)
    }
}

// MARK: - The mock's routes

@Suite struct MockOnboardingRouteTests {
    private func send(_ server: MockServer, _ method: HTTPMethod, _ path: String, body: String? = nil, lang: AppLocale = .es, token: String = "sim-lucia-t") async throws -> HTTPResponse {
        var headers = ["Authorization": "Bearer \(token)", "Accept-Language": lang.rawValue]
        if body != nil { headers["Content-Type"] = "application/json" }
        return try await server.send(HTTPRequest(method: method, path: OpenDollarsCore.apiBasePath + path, headers: headers, body: body.map { Data($0.utf8) }))
    }

    private func decode<T: Decodable>(_ type: T.Type, _ response: HTTPResponse) throws -> T {
        try JSONCoding.makeDecoder().decode(type, from: response.body)
    }

    @Test func theDraftScenarioResumesAtTheAddressWithStepsOneAndTwoSaved() async throws {
        let server = MockServer(scenario: .draft, sleep: { _ in })
        let draft = try decode(OnboardingDraft.self, try await send(server, .GET, "/onboarding"))
        #expect(draft.currentStep == .address)
        #expect(draft.steps[.residence]?["country"] == .string("AR"))
        #expect(draft.steps[.personal]?["fullName"] == .string("Lucía Fernández"))
    }

    // Rafael's draft is his own: the web's mock seeds Lucía's personal data there (decision 25).
    @Test func rafaelsDraftHoldsNothingOfLucia() async throws {
        let server = MockServer(scenario: .draft, sleep: { _ in })
        let draft = try decode(OnboardingDraft.self, try await send(server, .GET, "/onboarding", token: "sim-rafael-t"))
        #expect(draft.currentStep == .residence)
        #expect(draft.steps.isEmpty)
    }

    @Test func savingAStepAdvancesCurrentStepAndNeverBack() async throws {
        let server = MockServer(scenario: .draft, sleep: { _ in })
        let address = #"{"street":"Av. Corrientes 1234","city":"Buenos Aires","province":"C","postalCode":"C1043AAZ"}"#
        var draft = try decode(OnboardingDraft.self, try await send(server, .PUT, "/onboarding/address", body: address))
        #expect(draft.currentStep == .suitability)
        draft = try decode(OnboardingDraft.self, try await send(server, .PUT, "/onboarding/residence", body: #"{"country":"AR","nationality":"UY"}"#))
        #expect(draft.currentStep == .suitability)
        #expect(draft.steps[.residence]?["nationality"] == .string("UY"))
    }

    @Test func refusesAnInvalidStepWithItsFields() async throws {
        let server = MockServer(scenario: .draft, sleep: { _ in })
        let body = #"{"fullName":"Lucía Fernández","birthDate":"1987-04-12","dni":"30123456","cuil":"27301234560","email":"lucia@example.com","phone":"+54 9 11 5555-0142"}"#
        let response = try await send(server, .PUT, "/onboarding/personal", body: body)
        #expect(response.status == 422)
        let error = APIError.from(response, decoder: JSONCoding.makeDecoder(), now: Date())
        #expect(error.fields == ["cuil": "cuitCheckDigit"])
        #expect(try await send(server, .PUT, "/onboarding/nonsense", body: "{}").status == 404)
    }

    @Test func servesTheQuestionnaireAndTheTermsInTheClientsLanguage() async throws {
        let server = MockServer(scenario: .draft, sleep: { _ in })
        let questionnaire = try decode(Questionnaire.self, try await send(server, .GET, "/onboarding/questionnaire", lang: .pt))
        #expect(questionnaire.version == "2026-10")
        #expect(questionnaire.questions.map(\.id) == ["goal", "horizon", "income", "netWorth", "experience", "risk"])
        #expect(questionnaire.questions[0].label == "Para que você vai usar este dinheiro?")
        let terms = try decode([TermsDocument].self, try await send(server, .GET, "/account/terms"))
        #expect(terms.map(\.id) == ["terms-advisory", "terms-costs", "terms-privacy", "terms-ibkr-consent"])
        #expect(terms.allSatisfy { $0.version == "2026-10" })
    }

    @Test func submittingOpensTheReviewOnlyFromDraft() async throws {
        let server = MockServer(scenario: .draft, sleep: { _ in })
        let account = try decode(Account.self, try await send(server, .POST, "/onboarding/submit", body: "{}"))
        #expect(account.status == .submitted)
        let me = try decode(Me.self, try await send(server, .GET, "/me"))
        #expect(me.accountStatus == .submitted)
        #expect(try await send(server, .POST, "/onboarding/submit", body: "{}").status == 422)
    }

    @Test func theWaitlistTakesAnEmailAndACountry() async throws {
        let server = MockServer(scenario: .market_not_live, sleep: { _ in })
        #expect(try await send(server, .POST, "/waitlist", body: #"{"email":"rafael@example.com","country":"BR"}"#, token: "sim-rafael-t").status == 204)
        #expect(try await send(server, .POST, "/waitlist", body: #"{"email":"nope","country":"BR"}"#, token: "sim-rafael-t").status == 422)
        #expect(try await send(server, .POST, "/waitlist", body: #"{"email":"r@example.com","country":"Brazil"}"#, token: "sim-rafael-t").status == 422)
    }
}

// MARK: - Waitlist and identity

@Suite struct WaitlistFormTests {
    @Test func needsAValidEmail() {
        #expect(WaitlistForm(email: "rafael@example.com").validate().isEmpty)
        #expect(WaitlistForm(email: "rafael").validate() == ["email": .invalidEmail])
    }
}

@Suite struct SimulatedIdentityVerifierTests {
    @Test func approvesAfterTheDelayWithAReference() async {
        let result = await SimulatedIdentityVerifier(delay: .zero).verify(locale: .es)
        guard case .approved(let reference) = result else {
            Issue.record("not approved: \(result)")
            return
        }
        #expect(!reference.isEmpty)
    }

    @Test func aCancelledTaskIsACancelledVerification() async {
        let task = Task { await SimulatedIdentityVerifier(delay: .seconds(60)).verify(locale: .es) }
        task.cancel()
        #expect(await task.value == .cancelled)
    }
}

// MARK: - The flow

/// The identity vendor's answers, scripted.
struct ScriptedVerifier: IdentityVerifier {
    let result: IdentityResult
    func verify(locale: AppLocale) async -> IdentityResult { result }
}

@MainActor
private func draftHarness(_ outcomes: [SimulatedAuthProvider.Outcome] = [.identity(.lucia)]) async -> (Harness, OnboardingFlow) {
    let harness = Harness(outcomes, scenario: .draft)
    await harness.model.start()
    await harness.model.signIn()
    let flow = harness.model.openOnboarding()
    await flow.load()
    return (harness, flow)
}

@MainActor
@Suite struct OnboardingFlowTests {
    @Test func resumesAtTheFirstUnsavedStepWithTheSavedSteps() async {
        let (harness, flow) = await draftHarness()
        defer { withExtendedLifetime(harness) {} }
        #expect(flow.loadState == .ready)
        #expect(flow.step == .address)
        #expect(flow.position == 3)
        #expect(flow.residence == ResidenceForm(country: "AR", nationality: "AR"))
        #expect(flow.personal.fullName == "Lucía Fernández")
        #expect(flow.personal.birthDate == CalendarDate(year: 1987, month: 4, day: 12))
    }

    @Test func visitsOnlyUpToTheCurrentStep() async {
        let (harness, flow) = await draftHarness()
        defer { withExtendedLifetime(harness) {} }
        #expect(flow.canVisit(.residence))
        #expect(flow.canVisit(.address))
        #expect(!flow.canVisit(.suitability))
        flow.go(to: .review)
        #expect(flow.step == .address)
    }

    // Volver then Continuar keeps what was typed and not saved (web: draft-memory.ts).
    @Test func goingBackKeepsWhatWasTypedAndNotSaved() async {
        let (harness, flow) = await draftHarness()
        flow.address.street = "Av. Santa Fe 900"
        flow.back()
        #expect(flow.step == .personal)
        let requests = await harness.transport.requests.count
        flow.go(to: .address)
        #expect(flow.address.street == "Av. Santa Fe 900")
        #expect(await harness.transport.requests.count == requests)
    }

    @Test func aStepThatDoesNotValidateIsNotSent() async {
        let (harness, flow) = await draftHarness()
        flow.address = AddressForm(street: "Av. Corrientes 1234", unit: "", city: "Buenos Aires", province: "C", postalCode: "C104")
        let requests = await harness.transport.requests.count
        await flow.saveAndContinue()
        #expect(flow.errors == ["postalCode": .invalidPostalCode])
        #expect(flow.step == .address)
        #expect(await harness.transport.requests.count == requests)
    }

    @Test func savingSendsTheNormalizedStepAndMovesOn() async throws {
        let (harness, flow) = await draftHarness()
        flow.address = AddressForm(street: "Av. Corrientes 1234", unit: "", city: "Buenos Aires", province: "C", postalCode: "C1043AAZ")
        await flow.saveAndContinue()
        #expect(flow.errors.isEmpty)
        #expect(flow.step == .suitability)
        let request = try #require(await harness.transport.requests.last)
        #expect(request.method == .PUT)
        #expect(request.path.hasSuffix("/onboarding/address"))
    }

    // The server has the last word: its field errors show on the step like the client's.
    @Test func showsTheServersFieldErrors() async {
        let (harness, flow) = await draftHarness()
        flow.go(to: .personal)
        // Valid for the client, refused by the server (it has the last word).
        await harness.transport.rejectNext("/onboarding/personal", fields: ["cuil": "cuitCheckDigit"])
        await flow.saveAndContinue()
        #expect(flow.step == .personal)
        #expect(flow.errors == ["cuil": .cuitCheckDigit])
    }

    @Test func editingFromTheReviewGoesBackToTheReview() async {
        let (harness, flow) = await draftHarness()
        defer { withExtendedLifetime(harness) {} }
        await fillToReview(flow)
        #expect(flow.step == .review)
        flow.go(to: .address)
        flow.address.unit = "5° B"
        await flow.saveAndContinue()
        #expect(flow.step == .review)
    }

    // PRD T2, step 1: residence outside the pilot ends with the waitlist, and nothing is saved.
    @Test func residenceOutsideThePilotEndsInTheWaitlist() async {
        let (harness, flow) = await draftHarness()
        flow.go(to: .residence)
        flow.residence.country = "UY"
        let requests = await harness.transport.requests.count
        await flow.saveAndContinue()
        #expect(flow.waitlistCountry == "UY")
        #expect(flow.step == .residence)
        #expect(await harness.transport.requests.count == requests)
    }

    @Test func tickingATermRecordsWhenAndUntickingForgets() async {
        let (harness, flow) = await draftHarness()
        flow.toggleTerm("terms-advisory")
        #expect(flow.termsForm.checked["terms-advisory"] == harness.clock.now)
        flow.toggleTerm("terms-advisory")
        #expect(flow.termsForm.checked["terms-advisory"] == nil)
    }

    @Test func identityComesFromTheVerifier() async {
        let (harness, flow) = await draftHarness()
        defer { withExtendedLifetime(harness) {} }
        await flow.verifyIdentity(with: ScriptedVerifier(result: .cancelled))
        #expect(flow.identity.reference == nil)
        #expect(flow.identityOutcome == .cancelled)
        await flow.verifyIdentity(with: ScriptedVerifier(result: .approved(reference: "idv-1")))
        #expect(flow.identity.reference == "idv-1")
        #expect(flow.identity.validate().isEmpty)
    }

    @Test func submittingSendsTheClientToTheAccountStatus() async {
        let (harness, flow) = await draftHarness()
        await fillToReview(flow)
        await flow.submit()
        await harness.settle()
        guard case .ready(let me) = harness.model.phase else {
            Issue.record("not ready: \(harness.model.phase)")
            return
        }
        #expect(me.accountStatus == .submitted)
        #expect(Landing.for(me, liveMarkets: harness.model.config?.liveMarkets ?? []) == .accountStatus)
    }

    @Test func anAnswerArrivingAfterTheSessionEndedWritesNothingBack() async {
        let (harness, flow) = await draftHarness()
        flow.address = AddressForm(street: "Av. Corrientes 1234", unit: "", city: "Buenos Aires", province: "C", postalCode: "C1043AAZ")
        await harness.transport.hold("/onboarding/address")
        let saving = Task { await flow.saveAndContinue() }
        while await harness.transport.waitingCount == 0 { await Task.yield() }
        await harness.model.signOut()
        await harness.transport.release()
        await saving.value
        #expect(flow.step == .address)
        #expect(harness.model.onboarding == nil)
    }
}

@MainActor
func fillToReview(_ flow: OnboardingFlow) async {
    flow.go(to: .address)
    flow.address = AddressForm(street: "Av. Corrientes 1234", unit: "", city: "Buenos Aires", province: "C", postalCode: "C1043AAZ")
    await flow.saveAndContinue()
    for question in flow.questionnaire?.questions ?? [] {
        let first = question.options[0].value
        flow.suitability.answers[question.id] = question.kind == .multi ? .multi([first]) : .single(first)
    }
    await flow.saveAndContinue()
    flow.funds = FundsForm(occupation: "employee", sourceOfFunds: "salary", isPep: false, pepRole: "")
    await flow.saveAndContinue()
    await flow.verifyIdentity(with: ScriptedVerifier(result: .approved(reference: "idv-1")))
    await flow.saveAndContinue()
    for doc in flow.terms { flow.toggleTerm(doc.id) }
    await flow.saveAndContinue()
}

// MARK: - A second client on the same device

@MainActor
@Suite struct OnboardingSecondClientTests {
    @Test func theUnsavedDraftOfTheFirstClientIsGoneForTheSecond() async {
        let (harness, flow) = await draftHarness([.identity(.lucia), .identity(.rafael)])
        flow.go(to: .personal)
        flow.personal.fullName = "Lucía Escrita Sin Guardar"
        flow.address.street = "Calle Sin Guardar 1"

        await harness.model.signOut()
        await harness.settle()
        #expect(harness.model.onboarding == nil)

        await harness.model.signIn()
        let rafael = harness.model.openOnboarding()
        await rafael.load()
        #expect(rafael !== flow)
        #expect(rafael.personal.fullName.isEmpty)
        #expect(rafael.address.street.isEmpty)
        #expect(rafael.step == .residence)
        #expect(!rafael.personal.fullName.contains("Lucía"))
    }
}
