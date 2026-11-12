import Foundation
import Observation
import OpenDollarsCore
import SwiftUI

/// Wires the core's ClientSession to the app. Screens read the client's data from `session`
/// directly; this adds only what the core cannot do: the text language, the privacy shield,
/// logging, clearing URLCache and files, and (DEBUG) the simulated provider's page.
@MainActor
@Observable
final class AppModel {
    let session: ClientSession
    /// The app's language: a choice on this device > the account's > the system's
    /// (LocalePreference). Texts, Accept-Language and formatting follow it.
    private(set) var locale: AppLocale

    /// Created with the model, before the scene connects, so it hears the very first scene change;
    /// the design catalog (DEBUG, -catalog) has no session and gets none.
    @ObservationIgnored let shield: PrivacyShield?
    /// The identity vendor behind its protocol (onboarding step 6). TODO(fase 11): the vendor's SDK.
    @ObservationIgnored let identityVerifier: any IdentityVerifier
    @ObservationIgnored private let localeChoice: LocaleChoiceStore
    @ObservationIgnored private let systemLocale: AppLocale
    #if DEBUG
    let signInPage: SimulatedSignInPage
    #endif

    private init(
        session: ClientSession, identityVerifier: any IdentityVerifier, localeChoice: LocaleChoiceStore,
        systemLocale: AppLocale, coversScreen: Bool
    ) {
        self.session = session
        self.identityVerifier = identityVerifier
        self.shield = coversScreen ? PrivacyShield(session: session) : nil
        self.localeChoice = localeChoice
        self.systemLocale = systemLocale
        self.locale = LocalePreference.resolve(explicit: localeChoice.read(), account: nil, system: systemLocale)
        #if DEBUG
        self.signInPage = SimulatedSignInPage()
        #endif
        L10n.use(locale)
        session.onAccountLocaleChange = { [weak self] _ in self?.applyLocale() }
        session.onEvent = { event in
            switch event {
            case .requestFailed(let code, let status):
                // CLAUDE.md: values from the API are private; only the HTTP status is ours to show.
                AppLog.api.error("request failed: \(code.rawValue, privacy: .private) (\(status, privacy: .public))")
            case .portfolioTotalMismatch:
                // api-gaps.md, item 8: reported without values or personal data.
                AppLog.api.error("portfolio_total_mismatch")
            case .signedOut(let reason):
                // The app's own reason, not a value from the API.
                AppLog.session.info("signed out: \(reason.rawValue, privacy: .public)")
            }
        }
        session.addWipeHandler { DeviceWipe.run() }
    }

    /// Wiring for a real launch.
    static func live() -> AppModel {
        // The localization iOS picked for this app: the system's languages, or the per-app
        // language set in Settings.
        let systemLocale = AppLocale(languageTag: Bundle.main.preferredLocalizations.first)

        // TODO(fase 11): the real OIDC provider (ASWebAuthenticationSession with PKCE) and the API
        // origin (PRD section 12). Until then only DEBUG builds exist: the simulated provider and
        // the in-memory MockServer are compiled out of Release, and a Release build stops here,
        // like the web's check-build.mjs refuses a production bundle with mocks (TODO(decisão) 5).
        #if DEBUG
        let bridge = SimulatedProviderBridge()
        let sessionManager = SessionManager(store: KeychainRefreshTokenStore(), auth: SimulatedAuthProvider { await bridge.ask() })
        // `-scenario <id>` picks Lucía's mock data (default "open").
        let scenario = Scenario(arguments: ProcessInfo.processInfo.arguments) ?? .default
        let client = APIClient(transport: MockServer(scenario: scenario), tokens: sessionManager, locale: { L10n.locale })
        let coversScreen = !ProcessInfo.processInfo.arguments.contains(DesignCatalogView.launchArgument)
        let identityVerifier = SimulatedIdentityVerifier()
        #else
        #error("Release needs the real OIDC provider and API origin (TODO(fase 11)); the simulated provider and MockServer exist only in DEBUG builds.")
        #endif

        let session = ClientSession(session: sessionManager, client: client, isFirstLaunch: isFirstLaunch())
        let model = AppModel(
            session: session, identityVerifier: identityVerifier, localeChoice: LocaleChoiceStore(), systemLocale: systemLocale,
            coversScreen: coversScreen)
        #if DEBUG
        bridge.page = model.signInPage
        #endif
        return model
    }

    /// Not personal data: only whether this install launched before (Keychain items survive
    /// uninstalling, so a fresh install wipes them). UI tests start clean with -resetSession.
    private static func isFirstLaunch() -> Bool {
        let defaults = UserDefaults.standard
        let launchedKey = "od.hasLaunchedBefore"
        var isFirstLaunch = !defaults.bool(forKey: launchedKey)
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-resetSession") { isFirstLaunch = true }
        #endif
        defaults.set(true, forKey: launchedKey)
        return isFirstLaunch
    }

    /// Changes on every exit and every language change: the screen tree is rebuilt, so no view
    /// keeps state of the previous client or texts of the previous language.
    var screenTreeID: String { "\(session.generation)-\(locale.rawValue)" }

    func start() async { await session.start() }

    // MARK: Language

    /// The client's choice on this device (the entry screen, later the Profile screen); nil goes
    /// back to the account's or the system's language. Survives signing out (decision 15).
    func chooseLocale(_ choice: AppLocale?) {
        localeChoice.save(choice)
        applyLocale()
    }

    private func applyLocale() {
        let resolved = LocalePreference.resolve(explicit: localeChoice.read(), account: session.accountLocale, system: systemLocale)
        L10n.use(resolved)
        if resolved != locale { locale = resolved }
    }
}

/// What only the app can clear on an exit, after ClientSession dropped the client's data
/// (TODO(decisão) 20): HTTP caches, cookies and credentials (the API's URLSession is ephemeral
/// already; this covers any other loader), and the files the app wrote (SessionFiles, only its
/// own folders in tmp/ and Caches/).
enum DeviceWipe {
    @MainActor
    static func run() {
        URLCache.shared.removeAllCachedResponses()
        HTTPCookieStorage.shared.removeCookies(since: .distantPast)
        let credentials = URLCredentialStorage.shared
        for (space, byUser) in credentials.allCredentials {
            for credential in byUser.values { credentials.remove(credential, for: space) }
        }
        SessionFiles().wipe()
    }
}

#if DEBUG
/// The simulated provider asks the page through this bridge, which exists before the page does.
@MainActor
final class SimulatedProviderBridge {
    var page: SimulatedSignInPage?

    func ask() async -> SimulatedAuthProvider.Outcome {
        await page?.ask() ?? .failed
    }
}

/// The simulated provider's sign-in page: a sheet where the developer picks who signs in, as a
/// real provider's page would decide. Each sign-in is its own request: closing a sheet answers
/// only the request it showed, so a dismissal that lands late cannot cancel the next sign-in.
/// TODO(fase 11): replaced by the real provider's page in ASWebAuthenticationSession.
@MainActor
@Observable
final class SimulatedSignInPage {
    struct Request: Identifiable, Equatable {
        let id: Int
    }

    /// The sheet shows while there is a request.
    private(set) var request: Request?
    /// The request whose sheet is on screen (set when it appears): a swipe closes that one.
    @ObservationIgnored private var presentedID: Int?

    @ObservationIgnored private var pending: (id: Int, continuation: CheckedContinuation<SimulatedAuthProvider.Outcome, Never>)?
    @ObservationIgnored private var lastID = 0

    func ask() async -> SimulatedAuthProvider.Outcome {
        if let pending { answer(.cancelled, to: pending.id) } // a page left open by a previous attempt
        lastID += 1
        let id = lastID
        return await withCheckedContinuation { continuation in
            pending = (id, continuation)
            request = Request(id: id)
        }
    }

    func sheetAppeared(_ id: Int) { presentedID = id }

    /// The sheet's binding: SwiftUI writes nil when the client swipes the sheet away. That closes
    /// the page on screen, so only its request is cancelled; a nil that lands after a newer
    /// request replaced it cancels nothing.
    func sheetChanged(to new: Request?) {
        guard new == nil, let shown = presentedID else { return }
        answer(.cancelled, to: shown)
    }

    /// A choice on the page that is showing.
    func answer(_ outcome: SimulatedAuthProvider.Outcome) {
        guard let current = request else { return }
        answer(outcome, to: current.id)
    }

    private func answer(_ outcome: SimulatedAuthProvider.Outcome, to id: Int) {
        guard let pending, pending.id == id else { return }
        self.pending = nil
        if request?.id == id { request = nil }
        pending.continuation.resume(returning: outcome)
    }
}
#endif
