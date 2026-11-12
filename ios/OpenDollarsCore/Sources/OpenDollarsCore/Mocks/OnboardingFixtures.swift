// Mocks exist only in DEBUG builds (TODO(fase 11)): a Release build has no simulated provider
// or in-memory API, and the app refuses to build without the real ones (AppModel.live).
#if DEBUG

import Foundation

// Onboarding data for the mock, the same as web/src/mocks/fixtures.ts.
enum OnboardingFixtures {
    /// Lucía's step 2. CUIL 27-30123456-8 has a valid check digit.
    static let luciaPersonal: [String: JSONValue] = [
        "fullName": .string("Lucía Fernández"), "birthDate": .string("1987-04-12"), "dni": .string("30123456"),
        "cuil": .string("27301234568"), "email": .string("lucia.fernandez@example.com"), "phone": .string("+54 9 11 5555-0142"),
    ]

    static let luciaAddress: [String: JSONValue] = [
        "street": .string("Av. Corrientes 1234, 5° B"), "city": .string("Buenos Aires"),
        "province": .string("C"), "postalCode": .string("C1043AAZ"),
    ]

    /// The web's draft scenario resumes at the address (step 3); after it, at the review.
    static func draft(for status: AccountStatus) -> OnboardingDraft {
        var steps: [OnboardingStep: [String: JSONValue]] = [
            .residence: ["country": .string("AR"), "nationality": .string("AR")],
            .personal: luciaPersonal,
        ]
        if status != .draft { steps[.address] = luciaAddress }
        return OnboardingDraft(currentStep: status == .draft ? .address : .review, steps: steps)
    }

    /// Rafael's own draft, empty: the web seeds Lucía's personal data there too (TODO(decisão) 25).
    static let emptyDraft = OnboardingDraft(currentStep: .residence, steps: [:])

    struct Question: Sendable {
        let id: String
        let kind: Questionnaire.Kind
        let label: Localized
        let options: [(value: String, label: Localized)]
    }

    static let questionnaireVersion = "2026-10"

    private static func option(_ value: String, _ es: String, _ pt: String, _ en: String) -> (value: String, label: Localized) {
        (value, Localized(es: es, pt: pt, en: en))
    }

    // Suitability questions (PRD T2). TODO(compliance): wording owned by legal; served by the API.
    static let questions: [Question] = [
        Question(id: "goal", kind: .single, label: Localized(es: "¿Para qué vas a usar este dinero?", pt: "Para que você vai usar este dinheiro?", en: "What is this money for?"), options: [
            option("retirement", "Jubilación", "Aposentadoria", "Retirement"),
            option("savings", "Ahorro de largo plazo", "Poupança de longo prazo", "Long-term savings"),
            option("education", "Educación de mis hijos", "Educação dos filhos", "Children's education"),
        ]),
        Question(id: "horizon", kind: .single, label: Localized(es: "¿En cuánto tiempo pensás usarlo?", pt: "Em quanto tempo pretende usar?", en: "When do you plan to use it?"), options: [
            option("lt5", "En menos de 5 años", "Em menos de 5 anos", "In less than 5 years"),
            option("5to10", "Entre 5 y 10 años", "Entre 5 e 10 anos", "In 5 to 10 years"),
            option("gt10", "En más de 10 años", "Em mais de 10 anos", "In more than 10 years"),
        ]),
        Question(id: "income", kind: .single, label: Localized(es: "¿Cuánto ganás por mes, aproximadamente?", pt: "Quanto você ganha por mês, aproximadamente?", en: "Roughly how much do you earn a month?"), options: [
            option("lt1k", "Menos de US$ 1.000", "Menos de US$ 1.000", "Under US$1,000"),
            option("1k3k", "De US$ 1.000 a 3.000", "De US$ 1.000 a 3.000", "US$1,000 to 3,000"),
            option("3k10k", "De US$ 3.000 a 10.000", "De US$ 3.000 a 10.000", "US$3,000 to 10,000"),
            option("gt10k", "Más de US$ 10.000", "Mais de US$ 10.000", "Over US$10,000"),
        ]),
        Question(id: "netWorth", kind: .single, label: Localized(es: "¿Cuál es tu patrimonio aproximado?", pt: "Qual é o seu patrimônio aproximado?", en: "What is your approximate net worth?"), options: [
            option("lt25k", "Menos de US$ 25.000", "Menos de US$ 25.000", "Under US$25,000"),
            option("25k100k", "De US$ 25.000 a 100.000", "De US$ 25.000 a 100.000", "US$25,000 to 100,000"),
            option("100k500k", "De US$ 100.000 a 500.000", "De US$ 100.000 a 500.000", "US$100,000 to 500,000"),
            option("gt500k", "Más de US$ 500.000", "Mais de US$ 500.000", "Over US$500,000"),
        ]),
        Question(id: "experience", kind: .multi, label: Localized(es: "¿En qué invertiste antes?", pt: "Em que você já investiu?", en: "What have you invested in before?"), options: [
            option("deposits", "Plazo fijo", "Renda fixa", "Fixed deposits"),
            option("funds", "Fondos comunes", "Fundos de investimento", "Mutual funds"),
            option("stocks", "Acciones", "Ações", "Stocks"),
            option("none", "Nunca invertí", "Nunca investi", "I have never invested"),
        ]),
        Question(id: "risk", kind: .single, label: Localized(es: "Si tu inversión baja 20% en un año, ¿qué hacés?", pt: "Se seu investimento cair 20% em um ano, o que você faz?", en: "If your investment falls 20% in a year, what do you do?"), options: [
            option("sell", "Vendo todo", "Vendo tudo", "Sell everything"),
            option("hold", "Espero", "Espero", "Wait"),
            option("add", "Sigo aportando", "Continuo aportando", "Keep depositing"),
        ]),
    ]

    static func questionnaire(_ lang: AppLocale) -> Questionnaire {
        Questionnaire(version: questionnaireVersion, questions: questions.map { question in
            Questionnaire.Question(
                id: question.id, kind: question.kind, label: question.label[lang],
                options: question.options.map { Questionnaire.Option(value: $0.value, label: $0.label[lang]) })
        })
    }

    static let termsVersion = "2026-10"

    static let terms: [(id: String, kind: TermsKind, title: Localized)] = [
        ("terms-advisory", .advisory_agreement, Localized(es: "Contrato de asesoría", pt: "Contrato de consultoria", en: "Advisory agreement")),
        ("terms-costs", .cost_disclosure, Localized(es: "Detalle de costos", pt: "Detalhamento de custos", en: "Cost disclosure")),
        ("terms-privacy", .privacy_policy, Localized(es: "Política de privacidad", pt: "Política de privacidade", en: "Privacy policy")),
        ("terms-ibkr-consent", .ibkr_data_consent, Localized(
            es: "Consentimiento para enviar tus datos a Interactive Brokers", pt: "Consentimento para enviar seus dados à Interactive Brokers",
            en: "Consent to send your data to Interactive Brokers")),
    ]

    // TODO(compliance): drafts; real documents pending legal review (PRD section 10).
    static func termsDocuments(_ lang: AppLocale) -> [TermsDocument] {
        terms.map { TermsDocument(id: $0.id, kind: $0.kind, version: termsVersion, title: $0.title[lang], url: "#terms/\($0.kind.rawValue)") }
    }
}

#endif
