import Foundation
import Observation

public enum Loadable<Value> {
    case idle
    case loading
    case loaded(Value)
    case failed(APIError)
}

extension Loadable: Equatable where Value: Equatable {}
extension Loadable: Sendable where Value: Sendable {}

/// Something the app reports (os.Logger) without personal data: the core does not log.
public enum ClientSessionEvent: Sendable, Equatable {
    case requestFailed(ClientErrorCode, status: Int)
    /// api-gaps.md, item 8: the API total differs from the sum of the buckets.
    case portfolioTotalMismatch
    case signedOut(SignOutReason)
}

/// Everything the app knows about the signed-in client, and the only place it lives: the screens
/// read it, and every exit (the button, 15 minutes idle, session expired) wipes it whole before
/// anything else can run, so a second client on the same device sees nothing of the first
/// (TODO(decisão) 20). The app adds what only it can clear (URLCache, files, the screen tree)
/// through addWipeHandler. No UI framework: tested in WSL with the mock server.
@MainActor
@Observable
public final class ClientSession {
    public enum Phase: Equatable, Sendable {
        case launching
        /// The entry screen (T1); the reason explains an exit the client did not choose.
        case signedOut(SignOutReason?)
        case failed(APIError)
        case ready(Me)
    }

    /// SwiftUI's ScenePhase, without SwiftUI.
    public enum ScenePhase: Sendable {
        case active, inactive, background
    }

    public private(set) var phase: Phase = .launching
    public private(set) var config: AppConfig?
    public private(set) var account: Loadable<Account> = .idle
    public private(set) var portfolio: Loadable<Portfolio> = .idle
    /// The account's language (GET /me); LocalePreference ranks it after a choice on the device.
    public private(set) var accountLocale: AppLocale?
    public private(set) var isSigningIn = false
    public private(set) var signInFailed = false
    /// Set inside the last minute before the inactivity sign-out (the warning).
    public private(set) var inactivityDeadline: Date?
    /// Covers the screen with the brand whenever the app is not active, so the app switcher's
    /// snapshot never shows a balance (TODO(decisão) 19). Back to active, it stays until the
    /// inactivity check ran: a session that expired meanwhile never shows its data again.
    public private(set) var isCovered = false
    /// Bumped by every exit. The app keys its screen tree on it, so no view keeps state of the
    /// previous client, and a request started before the exit cannot write its answer back.
    public private(set) var generation = 0
    /// The pending deposit intent's key (PRD section 8). Dropped by every exit.
    public var depositKeys = IdempotencyKeyTracker<CreateDepositRequest>()

    /// The block on deposits, once the account loaded (decision 14).
    public var accountBlock: AccountBlock? {
        if case .loaded(let account) = account { AccountBlock.of(account) } else { nil }
    }

    @ObservationIgnored public var onEvent: (@MainActor (ClientSessionEvent) -> Void)?
    /// Called before the screens see the change, so the app can switch the text language first.
    @ObservationIgnored public var onAccountLocaleChange: (@MainActor (AppLocale?) -> Void)?
    @ObservationIgnored private let session: SessionManager
    @ObservationIgnored private let client: APIClient
    @ObservationIgnored private let isFirstLaunch: Bool
    @ObservationIgnored private var started = false
    @ObservationIgnored private var wipeHandlers: [@MainActor () -> Void] = []
    @ObservationIgnored private var inactivityWatch: Task<Void, Never>?

    public init(session: SessionManager, client: APIClient, isFirstLaunch: Bool) {
        self.session = session
        self.client = client
        self.isFirstLaunch = isFirstLaunch
    }

    /// Runs on every exit, after the session's own data was cleared and before the entry screen.
    public func addWipeHandler(_ handler: @escaping @MainActor () -> Void) {
        wipeHandlers.append(handler)
    }

    // MARK: Entering

    /// At launch: a recent stored session comes back silently; otherwise the entry screen.
    public func start() async {
        guard !started else { return }
        started = true
        await session.addSignOutHandler { [weak self] reason in
            await self?.didSignOut(reason)
        }
        if await session.restore(isFirstLaunch: isFirstLaunch) {
            await loadSession()
        } else {
            phase = .signedOut(nil)
        }
    }

    /// "Entrar" on the entry screen. Closing the provider's page is not an error.
    public func signIn() async {
        guard !isSigningIn else { return }
        isSigningIn = true
        signInFailed = false
        defer { isSigningIn = false }
        do {
            try await session.signInWithProvider()
        } catch AuthError.cancelled {
            return
        } catch {
            signInFailed = true
            return
        }
        await loadSession()
    }

    // MARK: Leaving

    public func signOut() async {
        await session.signOut(.userRequested)
    }

    /// The session already cleared its tokens and the Keychain; this clears the rest.
    private func didSignOut(_ reason: SignOutReason) {
        generation += 1
        config = nil
        account = .idle
        portfolio = .idle
        setAccountLocale(nil)
        inactivityDeadline = nil
        signInFailed = false
        depositKeys.reset()
        for handler in wipeHandlers { handler() }
        isCovered = false
        phase = .signedOut(reason)
        onEvent?(.signedOut(reason))
    }

    // MARK: Activity and the app's lifecycle

    public func recordActivity() {
        Task { await session.recordActivity() }
    }

    /// "Seguir conectado" on the inactivity warning.
    public func staySignedIn() async {
        inactivityDeadline = nil
        await session.recordActivity()
    }

    public func checkInactivity() async {
        switch await session.checkInactivity() {
        case .warning(let deadline): inactivityDeadline = deadline
        case .active: inactivityDeadline = nil
        case .signedOut: break // didSignOut already ran
        }
    }

    /// Checks inactivity on a timer while the app runs; scene changes check it too.
    public func startInactivityWatch(every interval: Duration = .seconds(5)) {
        inactivityWatch?.cancel()
        inactivityWatch = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: interval)
                await self?.checkInactivity()
            }
        }
    }

    public func sceneChanged(_ scenePhase: ScenePhase) async {
        switch scenePhase {
        case .inactive:
            isCovered = true
        case .background:
            isCovered = true
            await session.persistActivity()
        case .active:
            isCovered = true
            await checkInactivity()
            isCovered = false
        }
    }

    // MARK: Data

    public func loadSession() async {
        let generation = generation
        phase = .launching
        do {
            async let config = client.getConfig()
            async let me = client.getMe()
            let (loadedConfig, loadedMe) = try await (config, me)
            guard generation == self.generation else { return }
            self.config = loadedConfig
            setAccountLocale(loadedMe.locale)
            phase = .ready(loadedMe)
        } catch {
            guard generation == self.generation else { return }
            phase = .failed(report(error))
        }
    }

    public func loadHome() async {
        let generation = generation
        if case .loaded = portfolio {} else { portfolio = .loading }
        do {
            async let portfolio = client.getPortfolio()
            async let account = client.getAccount()
            let (loadedPortfolio, loadedAccount) = try await (portfolio, account)
            guard generation == self.generation else { return }
            if (try? loadedPortfolio.totalMatchesBuckets()) == false { onEvent?(.portfolioTotalMismatch) }
            self.portfolio = .loaded(loadedPortfolio)
            self.account = .loaded(loadedAccount)
        } catch {
            guard generation == self.generation else { return }
            portfolio = .failed(report(error))
        }
    }

    public func loadAccount() async {
        let generation = generation
        if case .loaded = account {} else { account = .loading }
        do {
            let loaded = try await client.getAccount()
            guard generation == self.generation else { return }
            account = .loaded(loaded)
        } catch {
            guard generation == self.generation else { return }
            account = .failed(report(error))
        }
    }

    private func setAccountLocale(_ locale: AppLocale?) {
        guard locale != accountLocale else { return }
        accountLocale = locale
        onAccountLocaleChange?(locale)
    }

    private func report(_ error: any Error) -> APIError {
        let apiError = error as? APIError ?? APIError(status: 0, code: .internal)
        onEvent?(.requestFailed(apiError.code, status: apiError.status))
        return apiError
    }
}
