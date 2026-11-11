import Foundation
import Observation
import OpenDollarsCore
import SwiftUI

enum Loadable<Value> {
    case idle
    case loading
    case loaded(Value)
    case failed(APIError)
}

/// The app's state: session, client data and the inactivity watch. Business rules live in
/// OpenDollarsCore; this only wires them to the screens.
@MainActor
@Observable
final class AppModel {
    enum Phase: Equatable {
        case launching
        case signedOut(SignOutReason?)
        case failed(APIError)
        case ready(Me)
    }

    private(set) var phase: Phase = .launching
    private(set) var config: AppConfig?
    private(set) var account: Loadable<Account> = .idle
    private(set) var portfolio: Loadable<Portfolio> = .idle
    /// Set inside the last minute before the inactivity sign-out (the warning alert).
    private(set) var inactivityDeadline: Date?
    let locale: AppLocale

    private let client: APIClient
    private let session: SessionManager
    private let isFirstLaunch: Bool
    private var started = false
    private var inactivityTask: Task<Void, Never>?

    init(client: APIClient, session: SessionManager, locale: AppLocale, isFirstLaunch: Bool) {
        self.client = client
        self.session = session
        self.locale = locale
        self.isFirstLaunch = isFirstLaunch
    }

    /// Wiring for a real launch. `-scenario <id>` picks the mock data set (default "open").
    static func live() -> AppModel {
        let scenario = Scenario(arguments: ProcessInfo.processInfo.arguments) ?? .default
        let locale = AppLocale(languageTag: Locale.preferredLanguages.first)
        // TODO(decisão): phase 0 always talks to the in-memory mock; the real API origin and the
        // OIDC provider arrive with the backend (PRD section 12).
        let session = SessionManager(store: KeychainRefreshTokenStore(), auth: MockAuthProvider())
        let client = APIClient(transport: MockServer(scenario: scenario), tokens: session, locale: { locale })

        // Not personal data: only whether this install launched before (Keychain items survive
        // uninstalling, so a fresh install wipes them).
        let defaults = UserDefaults.standard
        let launchedKey = "od.hasLaunchedBefore"
        let isFirstLaunch = !defaults.bool(forKey: launchedKey)
        defaults.set(true, forKey: launchedKey)
        return AppModel(client: client, session: session, locale: locale, isFirstLaunch: isFirstLaunch)
    }

    // MARK: Session

    func start() async {
        guard !started else { return }
        started = true
        await session.addSignOutHandler { [weak self] reason in
            await self?.didSignOut(reason)
        }
        let restored = await session.restore(isFirstLaunch: isFirstLaunch)
        if !restored {
            // TODO(decisão): T1 login with the real OIDC provider; phase 0 signs in with the mock one.
            do {
                try await session.signInWithProvider()
            } catch {
                AppLog.session.error("sign-in failed")
                phase = .signedOut(nil)
                return
            }
        }
        await loadSession()
        startInactivityWatch()
    }

    func signInAgain() async {
        phase = .launching
        do {
            try await session.signInWithProvider()
        } catch {
            AppLog.session.error("sign-in failed")
            phase = .signedOut(nil)
            return
        }
        await loadSession()
        startInactivityWatch()
    }

    func signOut() async {
        await session.signOut(.userRequested)
    }

    func recordActivity() {
        Task { await session.recordActivity() }
    }

    func staySignedIn() {
        inactivityDeadline = nil
        Task { await session.recordActivity() }
    }

    func scenePhaseChanged(_ scenePhase: ScenePhase) async {
        switch scenePhase {
        case .background: await session.persistActivity()
        case .active: await checkInactivity()
        default: break
        }
    }

    /// Every exit (button, inactivity, expired session) lands here: drop everything the session
    /// loaded, so no personal data stays on screen or in memory.
    private func didSignOut(_ reason: SignOutReason) {
        AppLog.session.info("signed out: \(reason.rawValue, privacy: .public)")
        inactivityTask?.cancel()
        inactivityTask = nil
        inactivityDeadline = nil
        config = nil
        account = .idle
        portfolio = .idle
        phase = .signedOut(reason)
    }

    private func startInactivityWatch() {
        inactivityTask?.cancel()
        inactivityTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(5))
                await self?.checkInactivity()
            }
        }
    }

    private func checkInactivity() async {
        switch await session.checkInactivity() {
        case .warning(let deadline): inactivityDeadline = deadline
        case .active: inactivityDeadline = nil
        case .signedOut: break // didSignOut already ran
        }
    }

    // MARK: Data

    func loadSession() async {
        phase = .launching
        do {
            async let config = client.getConfig()
            async let me = client.getMe()
            self.config = try await config
            phase = .ready(try await me)
        } catch {
            phase = .failed(Self.apiError(error))
        }
    }

    func loadHome() async {
        if case .loaded = portfolio {} else { portfolio = .loading }
        do {
            async let portfolio = client.getPortfolio()
            async let account = client.getAccount()
            let loaded = try await portfolio
            if (try? loaded.totalMatchesBuckets()) == false {
                // api-gaps.md, item 8: reported without values or personal data.
                AppLog.api.error("portfolio_total_mismatch")
            }
            self.portfolio = .loaded(loaded)
            self.account = .loaded(try await account)
        } catch {
            portfolio = .failed(Self.apiError(error))
        }
    }

    func loadAccount() async {
        if case .loaded = account {} else { account = .loading }
        do {
            account = .loaded(try await client.getAccount())
        } catch {
            account = .failed(Self.apiError(error))
        }
    }

    private static func apiError(_ error: any Error) -> APIError {
        let apiError = error as? APIError ?? APIError(status: 0, code: .internal)
        AppLog.api.error("request failed: \(apiError.code.rawValue, privacy: .public) (\(apiError.status, privacy: .public))")
        return apiError
    }
}
