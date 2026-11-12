import Foundation
import Observation
import OpenDollarsCore
import SwiftUI

/// Wires the core's ClientSession to SwiftUI: the screens read the client's data through it, and
/// it adds what only the app can do (the text language, the simulated provider's page, logging,
/// clearing URLCache and files). The rules and the client's data live in OpenDollarsCore.
@MainActor
@Observable
final class AppModel {
    let session: ClientSession
    let signInPage: SimulatedSignInPage
    /// The app's language: a choice on this device > the account's > the system's
    /// (LocalePreference). Texts, Accept-Language and formatting follow it.
    private(set) var locale: AppLocale

    @ObservationIgnored private let localeChoice: LocaleChoiceStore
    @ObservationIgnored private let systemLocale: AppLocale

    init(session: ClientSession, signInPage: SimulatedSignInPage, localeChoice: LocaleChoiceStore, systemLocale: AppLocale) {
        self.session = session
        self.signInPage = signInPage
        self.localeChoice = localeChoice
        self.systemLocale = systemLocale
        self.locale = LocalePreference.resolve(explicit: localeChoice.read(), account: nil, system: systemLocale)
        L10n.use(locale)
        session.onAccountLocaleChange = { [weak self] _ in self?.applyLocale() }
        session.onEvent = { event in
            switch event {
            case .requestFailed(let code, let status):
                AppLog.api.error("request failed: \(code.rawValue, privacy: .public) (\(status, privacy: .public))")
            case .portfolioTotalMismatch:
                // api-gaps.md, item 8: reported without values or personal data.
                AppLog.api.error("portfolio_total_mismatch")
            case .signedOut(let reason):
                AppLog.session.info("signed out: \(reason.rawValue, privacy: .public)")
            }
        }
        session.addWipeHandler { DeviceWipe.run() }
    }

    /// Wiring for a real launch. `-scenario <id>` picks Lucía's mock data (default "open").
    static func live() -> AppModel {
        let arguments = ProcessInfo.processInfo.arguments
        let scenario = Scenario(arguments: arguments) ?? .default
        // The localization iOS picked for this app: the system's languages, or the per-app
        // language set in Settings.
        let systemLocale = AppLocale(languageTag: Bundle.main.preferredLocalizations.first)
        // TODO(decisão) 5: the in-memory mock and the simulated provider until the backend and the
        // real OIDC provider exist (PRD section 12; the provider in phase 11).
        let signInPage = SimulatedSignInPage()
        let auth = SimulatedAuthProvider { await signInPage.ask() }
        let sessionManager = SessionManager(store: KeychainRefreshTokenStore(), auth: auth)
        let client = APIClient(transport: MockServer(scenario: scenario), tokens: sessionManager, locale: { L10n.locale })

        // Not personal data: only whether this install launched before (Keychain items survive
        // uninstalling, so a fresh install wipes them). UI tests start clean with -resetSession.
        let defaults = UserDefaults.standard
        let launchedKey = "od.hasLaunchedBefore"
        var isFirstLaunch = !defaults.bool(forKey: launchedKey)
        #if DEBUG
        if arguments.contains("-resetSession") { isFirstLaunch = true }
        #endif
        defaults.set(true, forKey: launchedKey)

        let session = ClientSession(session: sessionManager, client: client, isFirstLaunch: isFirstLaunch)
        return AppModel(session: session, signInPage: signInPage, localeChoice: LocaleChoiceStore(), systemLocale: systemLocale)
    }

    // MARK: What the screens read

    var phase: ClientSession.Phase { session.phase }
    var account: Loadable<Account> { session.account }
    var portfolio: Loadable<Portfolio> { session.portfolio }
    var accountBlock: AccountBlock? { session.accountBlock }
    var inactivityDeadline: Date? { session.inactivityDeadline }
    var isSigningIn: Bool { session.isSigningIn }
    var signInFailed: Bool { session.signInFailed }
    var isCovered: Bool { session.isCovered }
    /// Changes on every exit and every language change: the screen tree is rebuilt, so no view
    /// keeps state of the previous client or texts of the previous language.
    var screenTreeID: String { "\(session.generation)-\(locale.rawValue)" }

    // MARK: Session

    func start() async {
        await session.start()
        session.startInactivityWatch()
    }

    func signIn() async { await session.signIn() }
    func signOut() async { await session.signOut() }
    func recordActivity() { session.recordActivity() }
    func staySignedIn() { Task { await session.staySignedIn() } }

    func scenePhaseChanged(_ scenePhase: ScenePhase) async {
        switch scenePhase {
        case .active: await session.sceneChanged(.active)
        case .inactive: await session.sceneChanged(.inactive)
        case .background: await session.sceneChanged(.background)
        @unknown default: await session.sceneChanged(.inactive)
        }
    }

    func loadSession() async { await session.loadSession() }
    func loadHome() async { await session.loadHome() }
    func loadAccount() async { await session.loadAccount() }

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

/// The simulated provider's sign-in page: a sheet where the developer picks who signs in, as a
/// real provider's page would decide. TODO(fase 11): replaced by ASWebAuthenticationSession.
@MainActor
@Observable
final class SimulatedSignInPage {
    var isPresented = false
    @ObservationIgnored private var pending: CheckedContinuation<SimulatedAuthProvider.Outcome, Never>?

    func ask() async -> SimulatedAuthProvider.Outcome {
        answer(.cancelled) // a page left open by a previous attempt
        return await withCheckedContinuation { continuation in
            pending = continuation
            isPresented = true
        }
    }

    func answer(_ outcome: SimulatedAuthProvider.Outcome) {
        isPresented = false
        pending?.resume(returning: outcome)
        pending = nil
    }

    /// Swiping the sheet away is closing the provider's page.
    func dismissed() { answer(.cancelled) }
}
