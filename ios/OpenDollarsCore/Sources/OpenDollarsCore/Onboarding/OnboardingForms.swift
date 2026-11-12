import Foundation

// One form per onboarding step (PRD T2), ported from web/src/features/onboarding/schemas.ts.
// A form holds what the client typed; `validate` answers field → error code, the same codes as
// the web, which screens translate with onboarding.errors.<code>. `draftValue` is the body of
// PUT /onboarding/{step} (api-gaps.md, item 2), and `init(draft:)` reads a saved step back.

public enum OnboardingError: String, Sendable, Hashable, CaseIterable {
    case required, pickOne, invalidName, nameTwoWords, invalidDate, underage, invalidDni, invalidCuit
    case cuitCheckDigit, cuitDniMismatch, invalidEmail, invalidPhone, invalidPostalCode
    case termsRequired, identityRequired

    public var copyKey: String { "onboarding.errors.\(rawValue)" }
}

/// Field name → error. Field names are the draft's keys (a document id for terms).
public typealias FieldErrors = [String: OnboardingError]

enum Patterns {
    static func matches(_ text: String, _ pattern: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return false }
        return regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil
    }

    static func isBlank(_ text: String) -> Bool { text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    static func isEmail(_ text: String) -> Bool {
        matches(text.trimmingCharacters(in: .whitespaces), #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#)
    }

    static func string(_ draft: [String: JSONValue]?, _ key: String) -> String {
        if case .string(let value)? = draft?[key] { return value }
        return ""
    }
}

// MARK: - 1. Residence

public struct ResidenceForm: Sendable, Equatable {
    public var country: String
    public var nationality: String

    public init(country: String = "", nationality: String = "") {
        self.country = country
        self.nationality = nationality
    }

    public init(draft: [String: JSONValue]?) {
        self.init(country: Patterns.string(draft, "country"), nationality: Patterns.string(draft, "nationality"))
    }

    public func validate() -> FieldErrors {
        var errors: FieldErrors = [:]
        // Any ISO 3166-1 alpha-2 code: outside the pilot leads to the waitlist, not an error.
        if !Patterns.matches(country, "^[A-Z]{2}$") { errors["country"] = .pickOne }
        if !Patterns.matches(nationality, "^[A-Z]{2}$") { errors["nationality"] = .pickOne }
        return errors
    }

    public var draftValue: [String: JSONValue] { ["country": .string(country), "nationality": .string(nationality)] }
}

// MARK: - 2. Personal data

public struct PersonalForm: Sendable, Equatable {
    public var fullName: String
    /// Empty until the client picks a date ("Elegir fecha"); a resumed draft shows the saved one.
    public var birthDate: CalendarDate?
    public var dni: String
    public var cuil: String
    public var email: String
    public var phone: String

    public static let minimumAge = 18
    static let maximumAge = 120

    public init(fullName: String = "", birthDate: CalendarDate? = nil, dni: String = "", cuil: String = "", email: String = "", phone: String = "") {
        self.fullName = fullName
        self.birthDate = birthDate
        self.dni = dni
        self.cuil = cuil
        self.email = email
        self.phone = phone
    }

    public init(draft: [String: JSONValue]?) {
        self.init(
            fullName: Patterns.string(draft, "fullName"), birthDate: CalendarDate(iso: Patterns.string(draft, "birthDate")),
            dni: Patterns.string(draft, "dni"), cuil: Patterns.string(draft, "cuil"),
            email: Patterns.string(draft, "email"), phone: Patterns.string(draft, "phone"))
    }

    static func dniDigits(_ dni: String) -> String {
        dni.replacingOccurrences(of: ".", with: "").trimmingCharacters(in: .whitespaces)
    }

    public func validate(today: CalendarDate) -> FieldErrors {
        var errors: FieldErrors = [:]
        let name = fullName.trimmingCharacters(in: .whitespaces)
        if name.isEmpty {
            errors["fullName"] = .required
        } else if !Patterns.matches(name, #"^\p{L}+(?:(?:\s+|['-])\p{L}+)*$"#) {
            errors["fullName"] = .invalidName
        } else if name.split(whereSeparator: \.isWhitespace).count < 2 {
            errors["fullName"] = .nameTwoWords
        }

        if let birthDate {
            let iso = birthDate.isoString
            // At least 0 years: not in the future. More than 120: a typo, not a client.
            if !Age.isAtLeast(birthDate: iso, minAge: 0, today: today) || Age.isAtLeast(birthDate: iso, minAge: Self.maximumAge + 1, today: today) {
                errors["birthDate"] = .invalidDate
            } else if !Age.isAtLeast(birthDate: iso, minAge: Self.minimumAge, today: today) {
                errors["birthDate"] = .underage
            }
        } else {
            errors["birthDate"] = .required
        }

        let dniValue = Self.dniDigits(dni)
        let dniOK = Patterns.matches(dniValue, #"^\d{7,8}$"#)
        if !dniOK { errors["dni"] = .invalidDni }

        let cuilDigits = CUIT.normalize(cuil)
        if !Patterns.matches(cuilDigits, #"^\d{11}$"#) {
            errors["cuil"] = .invalidCuit
        } else if !CUIT.isValid(cuil) {
            errors["cuil"] = .cuitCheckDigit
        } else if dniOK, String(cuilDigits.dropFirst(2).prefix(8)) != String(repeating: "0", count: 8 - dniValue.count) + dniValue {
            // A CUIL carries the DNI in digits 3 to 10: a valid CUIL of someone else is still wrong.
            errors["cuil"] = .cuitDniMismatch
        }

        if !Patterns.isEmail(email) { errors["email"] = .invalidEmail }
        let phoneDigits = phone.filter(\.isASCIIDigit)
        if !Patterns.matches(phone, #"^\+?[\d\s()-]+$"#) || !(8...15).contains(phoneDigits.count) {
            errors["phone"] = .invalidPhone
        }
        return errors
    }

    /// DNI and CUIL saved as digits only, whatever punctuation was typed.
    public var draftValue: [String: JSONValue] {
        var value: [String: JSONValue] = [
            "fullName": .string(fullName.trimmingCharacters(in: .whitespaces)),
            "dni": .string(Self.dniDigits(dni)),
            "cuil": .string(CUIT.normalize(cuil)),
            "email": .string(email.trimmingCharacters(in: .whitespaces)),
            "phone": .string(phone.trimmingCharacters(in: .whitespaces)),
        ]
        if let birthDate { value["birthDate"] = .string(birthDate.isoString) }
        return value
    }
}

// MARK: - 3. Address

public struct AddressForm: Sendable, Equatable {
    public var street: String
    public var unit: String
    public var city: String
    /// ISO 3166-2:AR code (OnboardingLists.provinces).
    public var province: String
    public var postalCode: String

    public init(street: String = "", unit: String = "", city: String = "", province: String = "", postalCode: String = "") {
        self.street = street
        self.unit = unit
        self.city = city
        self.province = province
        self.postalCode = postalCode
    }

    public init(draft: [String: JSONValue]?) {
        self.init(
            street: Patterns.string(draft, "street"), unit: Patterns.string(draft, "unit"), city: Patterns.string(draft, "city"),
            province: Patterns.string(draft, "province"), postalCode: Patterns.string(draft, "postalCode"))
    }

    public func validate() -> FieldErrors {
        var errors: FieldErrors = [:]
        if Patterns.isBlank(street) { errors["street"] = .required }
        if Patterns.isBlank(city) { errors["city"] = .required }
        if !OnboardingLists.provinces.contains(where: { $0.code == province }) { errors["province"] = .pickOne }
        let code = postalCode.trimmingCharacters(in: .whitespaces)
        if code.isEmpty {
            errors["postalCode"] = .required
        } else if !Patterns.matches(code, #"^(?:[A-Za-z]\d{4}[A-Za-z]{3}|\d{4})$"#) {
            // CPA (C1043AAZ) or the older 4-digit code.
            errors["postalCode"] = .invalidPostalCode
        }
        return errors
    }

    public var draftValue: [String: JSONValue] {
        var value: [String: JSONValue] = [
            "street": .string(street.trimmingCharacters(in: .whitespaces)),
            "city": .string(city.trimmingCharacters(in: .whitespaces)),
            "province": .string(province),
            "postalCode": .string(postalCode.trimmingCharacters(in: .whitespaces).uppercased()),
        ]
        let unit = unit.trimmingCharacters(in: .whitespaces)
        if !unit.isEmpty { value["unit"] = .string(unit) }
        return value
    }
}

// MARK: - 4. Investor profile (questions from the API)

public enum SuitabilityAnswer: Sendable, Equatable {
    case single(String)
    case multi([String])
}

public struct SuitabilityForm: Sendable, Equatable {
    public var answers: [String: SuitabilityAnswer]

    public init(answers: [String: SuitabilityAnswer] = [:]) {
        self.answers = answers
    }

    /// Only answers to the questions this questionnaire asks, of the kind it asks them.
    public init(questionnaire: Questionnaire, draft: [String: JSONValue]?) {
        var answers: [String: SuitabilityAnswer] = [:]
        for question in questionnaire.questions {
            switch (question.kind, draft?[question.id]) {
            case (.single, .string(let value)?): answers[question.id] = .single(value)
            case (.multi, .array(let values)?):
                answers[question.id] = .multi(values.compactMap { if case .string(let v) = $0 { v } else { nil } })
            default: break
            }
        }
        self.init(answers: answers)
    }

    /// Built from the API questionnaire: nothing about the questions is fixed in the client.
    public func validate(_ questionnaire: Questionnaire) -> FieldErrors {
        var errors: FieldErrors = [:]
        for question in questionnaire.questions {
            let values = Set(question.options.map(\.value))
            switch (question.kind, answers[question.id]) {
            case (.single, .single(let value)?) where values.contains(value): break
            case (.multi, .multi(let picked)?) where !picked.isEmpty && picked.allSatisfy(values.contains): break
            default: errors[question.id] = .pickOne
            }
        }
        return errors
    }

    public var draftValue: [String: JSONValue] {
        answers.mapValues { answer in
            switch answer {
            case .single(let value): .string(value)
            case .multi(let values): .array(values.map(JSONValue.string))
            }
        }
    }
}

extension Questionnaire {
    /// web: question-guard.ts. A question without options cannot be drawn, so the step shows its
    /// error state instead of a broken question. An unknown kind already fails decoding.
    public var canRender: Bool { questions.allSatisfy { !$0.options.isEmpty } }
}

// MARK: - 5. Funds and occupation

public struct FundsForm: Sendable, Equatable {
    public var occupation: String
    public var sourceOfFunds: String
    /// nil until the client answers.
    public var isPep: Bool?
    public var pepRole: String

    public init(occupation: String = "", sourceOfFunds: String = "", isPep: Bool? = nil, pepRole: String = "") {
        self.occupation = occupation
        self.sourceOfFunds = sourceOfFunds
        self.isPep = isPep
        self.pepRole = pepRole
    }

    public init(draft: [String: JSONValue]?) {
        var isPep: Bool?
        if case .bool(let value)? = draft?["isPep"] { isPep = value }
        self.init(
            occupation: Patterns.string(draft, "occupation"), sourceOfFunds: Patterns.string(draft, "sourceOfFunds"),
            isPep: isPep, pepRole: Patterns.string(draft, "pepRole"))
    }

    public func validate() -> FieldErrors {
        var errors: FieldErrors = [:]
        if !OnboardingLists.occupations.contains(occupation) { errors["occupation"] = .pickOne }
        if !OnboardingLists.fundSources.contains(sourceOfFunds) { errors["sourceOfFunds"] = .pickOne }
        if isPep == nil { errors["isPep"] = .pickOne }
        if isPep == true, Patterns.isBlank(pepRole) { errors["pepRole"] = .required }
        return errors
    }

    public var draftValue: [String: JSONValue] {
        var value: [String: JSONValue] = [
            "occupation": .string(occupation), "sourceOfFunds": .string(sourceOfFunds), "isPep": .bool(isPep ?? false),
        ]
        if isPep == true { value["pepRole"] = .string(pepRole.trimmingCharacters(in: .whitespaces)) }
        return value
    }
}

// MARK: - 6. Identity

public struct IdentityForm: Sendable, Equatable {
    /// The vendor's reference once approved.
    public var reference: String?

    public init(reference: String? = nil) {
        self.reference = reference
    }

    public init(draft: [String: JSONValue]?) {
        let approved = Patterns.string(draft, "status") == "approved"
        let reference = Patterns.string(draft, "reference")
        self.init(reference: approved && !reference.isEmpty ? reference : nil)
    }

    public func validate() -> FieldErrors {
        reference == nil ? ["identity": .identityRequired] : [:]
    }

    public var draftValue: [String: JSONValue] {
        ["status": .string("approved"), "reference": .string(reference ?? "")]
    }
}

// MARK: - 7. Terms

public struct TermsForm: Sendable, Equatable {
    /// Document id → when the client ticked its box. Unticked documents are absent.
    public var checked: [String: Date]

    public init(checked: [String: Date] = [:]) {
        self.checked = checked
    }

    /// Acceptances still valid for the current versions; a new version must be accepted again.
    public init(docs: [TermsDocument], draft: [String: JSONValue]?) {
        var checked: [String: Date] = [:]
        if case .array(let items)? = draft?["accepted"] {
            let current = Dictionary(uniqueKeysWithValues: docs.map { ($0.id, $0.version) })
            for case .object(let item) in items {
                let id = Patterns.string(item, "id")
                if current[id] == Patterns.string(item, "version"), let at = Self.date(Patterns.string(item, "acceptedAt")) {
                    checked[id] = at
                }
            }
        }
        self.init(checked: checked)
    }

    public func validate(_ docs: [TermsDocument]) -> FieldErrors {
        var errors: FieldErrors = [:]
        for doc in docs where checked[doc.id] == nil { errors[doc.id] = .termsRequired }
        return errors
    }

    /// One { id, version, acceptedAt } per ticked document (api-gaps.md, item 2).
    public func draftValue(_ docs: [TermsDocument]) -> [String: JSONValue] {
        ["accepted": .array(docs.compactMap { doc in
            checked[doc.id].map { .object(["id": .string(doc.id), "version": .string(doc.version), "acceptedAt": .string(Self.iso($0))]) }
        })]
    }

    static func iso(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }

    static func date(_ text: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: text) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: text)
    }
}

// MARK: - Waitlist (T1 and step 1)

public struct WaitlistForm: Sendable, Equatable {
    public var email: String

    public init(email: String = "") {
        self.email = email
    }

    public func validate() -> FieldErrors {
        Patterns.isEmail(email) ? [:] : ["email": .invalidEmail]
    }
}

// MARK: - Lists (web: features/onboarding/countries.ts)

public enum OnboardingLists {
    // TODO(decisão): short list of countries for residence and nationality; names come from the
    // system in the client's language. Anything outside liveMarkets goes to the waitlist.
    public static let countryCodes = [
        "AR", "BO", "BR", "CL", "CO", "CR", "DE", "EC", "ES", "FR", "GB", "IT", "MX", "PA", "PE", "PT", "PY", "US", "UY", "VE",
    ]

    /// ISO 3166-2:AR. Proper names, not translated.
    public static let provinces: [(code: String, name: String)] = [
        ("C", "Ciudad Autónoma de Buenos Aires"), ("B", "Buenos Aires"), ("K", "Catamarca"), ("H", "Chaco"),
        ("U", "Chubut"), ("X", "Córdoba"), ("W", "Corrientes"), ("E", "Entre Ríos"), ("P", "Formosa"),
        ("Y", "Jujuy"), ("L", "La Pampa"), ("F", "La Rioja"), ("M", "Mendoza"), ("N", "Misiones"),
        ("Q", "Neuquén"), ("R", "Río Negro"), ("A", "Salta"), ("J", "San Juan"), ("D", "San Luis"),
        ("Z", "Santa Cruz"), ("S", "Santa Fe"), ("G", "Santiago del Estero"), ("V", "Tierra del Fuego"), ("T", "Tucumán"),
    ]

    // Codes for step 5; labels live in the string catalogs. TODO(compliance): lists to be reviewed.
    public static let occupations = ["employee", "self_employed", "business_owner", "retired", "student", "other"]
    public static let fundSources = ["salary", "business", "savings", "investments", "inheritance", "property_sale", "other"]

    /// The labels' text keys (onboarding.json), checked against the catalog by a test.
    public static func occupationKey(_ code: String) -> String { "onboarding.funds.occupations.\(code)" }
    public static func fundSourceKey(_ code: String) -> String { "onboarding.funds.sources.\(code)" }

    /// Product markets not live yet stay off the list ("nothing of BR in the interface today",
    /// web decision 5); other countries are listed and lead to the waitlist.
    public static func residenceCountries(liveMarkets: [Country]) -> [String] {
        let hidden = Set(Country.allCases.map(\.rawValue)).subtracting(liveMarkets.map(\.rawValue))
        return countryCodes.filter { !hidden.contains($0) }
    }
}

extension CalendarDate {
    /// "YYYY-MM-DD", the draft's format.
    public var isoString: String {
        func pad(_ value: Int, _ width: Int) -> String {
            let text = String(value)
            return String(repeating: "0", count: max(0, width - text.count)) + text
        }
        return "\(pad(year, 4))-\(pad(month, 2))-\(pad(day, 2))"
    }
}
