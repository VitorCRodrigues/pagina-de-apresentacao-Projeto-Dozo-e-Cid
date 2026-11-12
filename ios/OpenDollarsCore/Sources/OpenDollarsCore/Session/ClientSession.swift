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
    /// The app covers the screen itself, synchronously, the moment the scene stops being active
    /// (TODO(decisão) 19). The cover may come off only when the scene is active again and the
    /// inactivity check that the return started has finished: a session that expired meanwhile
    /// never shows its data again, and a check that ends after the client left again does not
    /// lift the cover.
    public var mayUncover: Bool { sceneIsActive && !awaitingInactivityCheck }
    public private(set) var sceneIsActive = true
    public private(set) var awaitingInactivityCheck = false
    /// The latest return, as sceneBecameActive numbered it: only its check may finish it.
    public struct Return: Sendable, Equatable {
        fileprivate let change: Int
    }
    /// Bumped by every exit. The app keys its screen tree on it, so no view keeps state of the
    /// previous client, and a request started before the exit cannot write its answer back.
    public private(set) var generation = 0
    /// The pending deposit intent's key (PRD section 8). Dropped by every exit.
    public var depositKeys = IdempotencyKeyTracker<CreateDepositRequest>()
    /// The onboarding wizard with what the client typed and has not saved (T2). Dropped by every
    /// exit, so a second client never sees the first one's draft.
    public private(set) var onboarding: OnboardingFlow?
    /// The documents being sent on the account status screen (T3), with the chosen files.
    /// Replaced, files dropped, by every exit.
    public private(set) var documents: DocumentUploads

    /// The block on deposits, once the account loaded (decision 14).
    public var accountBlock: AccountBlock? {
        if case .loaded(let account) = account { AccountBlock.of(account) } else { nil }
    }

    @ObservationIgnored public var onEvent: (@MainActor (ClientSessionEvent) -> Void)?
    /// Called before the screens see the change, so the app can switch the text language first.
    @ObservationIgnored public var onAccountLocaleChange: (@MainActor (AppLocale?) -> Void)?
    /// Called on every change of mayUncover, so the cover follows the state instead of looking
    /// once at the end of a check.
    @ObservationIgnored public var onMayUncoverChange: (@MainActor (Bool) -> Void)?
    @ObservationIgnored private let session: SessionManager
    @ObservationIgnored private let client: APIClient
    @ObservationIgnored private let isFirstLaunch: Bool
    @ObservationIgnored private var started = false
    @ObservationIgnored private var wipeHandlers: [@MainActor () -> Void] = []
    @ObservationIgnored private var inactivityWatch: Task<Void, Never>?
    @ObservationIgnored private let inactivityCheckInterval: Duration
    @ObservationIgnored private let now: @Sendable () -> Date
    /// Bumped by every scene change: a check started by an older change cannot lift the cover.
    @ObservationIgnored private var sceneChanges = 0

    /// `inactivityCheckInterval`: how often the inactivity watch checks while signed in.
    public init(
        session: SessionManager, client: APIClient, isFirstLaunch: Bool, inactivityCheckInterval: Duration = .seconds(5),
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.session = session
        self.client = client
        self.isFirstLaunch = isFirstLaunch
        self.inactivityCheckInterval = inactivityCheckInterval
        self.now = now
        self.documents = DocumentUploads(client: client, isCurrent: { false }, onSent: { _ in })
        self.documents = makeDocuments()
    }

    private func makeDocuments() -> DocumentUploads {
        let generation = generation
        return DocumentUploads(
            client: client,
            isCurrent: { [weak self] in self?.generation == generation },
            onSent: { [weak self] account in await self?.accountChanged(account) })
    }

    /// The watch runs only while signed in: it starts with the session and stops at any exit.
    public var isWatchingInactivity: Bool { inactivityWatch != nil }

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
            startInactivityWatch()
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
        startInactivityWatch()
        await loadSession()
    }

    // MARK: Leaving

    public func signOut() async {
        await session.signOut(.userRequested)
    }

    /// The session already cleared its tokens and the Keychain; this clears the rest.
    private func didSignOut(_ reason: SignOutReason) {
        inactivityWatch?.cancel()
        inactivityWatch = nil
        generation += 1
        config = nil
        account = .idle
        portfolio = .idle
        setAccountLocale(nil)
        inactivityDeadline = nil
        signInFailed = false
        depositKeys.reset()
        onboarding = nil
        documents.clear()
        documents = makeDocuments()
        for handler in wipeHandlers { handler() }
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

    /// Checks inactivity on a timer while signed in; scene changes check it too.
    private func startInactivityWatch() {
        inactivityWatch?.cancel()
        let interval = inactivityCheckInterval
        inactivityWatch = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: interval)
                guard !Task.isCancelled, let self else { return }
                await self.checkInactivity()
            }
        }
    }

    /// The scene stopped being active. Synchronous: the app calls it in the same step that puts
    /// the cover up, so a return whose check is queued or running can no longer lift it.
    public func sceneLeft() {
        sceneChanges += 1
        setScene(active: false, awaitingCheck: awaitingInactivityCheck)
    }

    /// The scene is active again. Synchronous, for the same reason: a leave that arrives before
    /// the check even starts is newer than this return. Then call finishReturn with the result.
    public func sceneBecameActive() -> Return {
        sceneChanges += 1
        setScene(active: true, awaitingCheck: true)
        return Return(change: sceneChanges)
    }

    /// The return's inactivity check. It lifts the cover only if nothing happened since its return.
    public func finishReturn(_ comingBack: Return) async {
        await checkInactivity()
        guard comingBack.change == sceneChanges else { return }
        setScene(active: sceneIsActive, awaitingCheck: false)
    }

    /// The app went to the background (after sceneLeft): store the last activity for the next
    /// launch. Not a leave by itself, so finishing late cannot keep the cover on an active app.
    public func sceneEnteredBackground() async {
        await session.persistActivity()
    }

    private func setScene(active: Bool, awaitingCheck: Bool) {
        let before = mayUncover
        sceneIsActive = active
        awaitingInactivityCheck = awaitingCheck
        if mayUncover != before { onMayUncoverChange?(mayUncover) }
    }

    // MARK: Onboarding and the waitlist

    /// The wizard of this session, created on first use. Its answers count only while this
    /// session lasts; after an exit they are discarded.
    public func openOnboarding() -> OnboardingFlow {
        if let onboarding { return onboarding }
        let generation = generation
        let flow = OnboardingFlow(
            client: client,
            isCurrent: { [weak self] in self?.generation == generation },
            now: now,
            liveMarkets: { [weak self] in self?.config?.liveMarkets ?? [] },
            onSubmitted: { [weak self] in await self?.loadSession() })
        onboarding = flow
        return flow
    }

    /// T1 and onboarding step 1: a country outside the pilot. Throws the API's error.
    public func joinWaitlist(email: String, country: String) async throws {
        try await client.joinWaitlist(WaitlistRequest(email: email.trimmingCharacters(in: .whitespaces), country: country))
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

    /// T3 checking back while the account waits (AccountPolling): a failed check keeps what is on
    /// screen. When the status moved, the client is reloaded and the routing follows it.
    public func refreshAccount() async {
        guard case .loaded = account else {
            await loadAccount()
            if case .loaded(let loaded) = account { await followStatus(loaded) }
            return
        }
        let generation = generation
        do {
            let loaded = try await client.getAccount()
            guard generation == self.generation else { return }
            await accountChanged(loaded)
        } catch {
            guard generation == self.generation else { return }
            _ = report(error)
        }
    }

    /// A new account from the API (a check, a document sent).
    private func accountChanged(_ loaded: Account) async {
        account = .loaded(loaded)
        await followStatus(loaded)
    }

    /// The account's status differs from the client's: reload GET /me without leaving the
    /// screen, so Landing moves the client on (to the tabs once the account opens).
    private func followStatus(_ loaded: Account) async {
        guard case .ready(let me) = phase, me.accountStatus != loaded.status else { return }
        let generation = generation
        do {
            let fresh = try await client.getMe()
            guard generation == self.generation else { return }
            setAccountLocale(fresh.locale)
            phase = .ready(fresh)
        } catch {
            guard generation == self.generation else { return }
            _ = report(error)
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
