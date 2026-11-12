import OpenDollarsCore
import SwiftUI

/// Picks the screen for the session state and watches for inactivity. The privacy cover is not
/// here: PrivacyShield puts it in a window above everything, sheets and alerts included.
struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let session = model.session
        content
            // Texts are read through L10n, which SwiftUI does not observe, and screens may hold
            // state of the client: a new language or any exit rebuilds the whole tree.
            .id(model.screenTreeID)
            .environment(\.locale, L10n.foundationLocale)
            .background(ODColor.cream50.ignoresSafeArea())
            // Any tap counts as activity for the 15-minute rule.
            .simultaneousGesture(TapGesture().onEnded { session.recordActivity() })
            .alert(
                Strings.sessionTimeoutTitle,
                isPresented: Binding(
                    get: { session.inactivityDeadline != nil },
                    set: { shown in if !shown { Task { await session.staySignedIn() } } }),
                actions: {
                    Button(Strings.sessionTimeoutStay) { Task { await session.staySignedIn() } }
                    Button(Strings.sessionTimeoutSignOut, role: .destructive) {
                        Task { await session.signOut() }
                    }
                },
                message: { Text(Strings.sessionTimeoutBody) })
            .modifier(SimulatedProviderSheet())
            .onChange(of: session.phase) { _, phase in pinCoverForScreenshot(phase) }
    }

    /// `-privacyCover` (DEBUG): once signed in, the cover stays up for its screenshot; XCUITest
    /// cannot read the app switcher's snapshot itself.
    private func pinCoverForScreenshot(_ phase: ClientSession.Phase) {
        #if DEBUG
        if case .ready = phase, ProcessInfo.processInfo.arguments.contains("-privacyCover") {
            model.shield?.pinForScreenshot()
        }
        #endif
    }

    @ViewBuilder
    private var content: some View {
        let session = model.session
        switch session.phase {
        case .launching:
            StatePage { LoadingState(shape: .statement) }
        case .signedOut(let reason?) where reason.needsExplanation:
            // An exit the client did not choose: say why, then sign in again.
            StatePage {
                VStack(alignment: .leading, spacing: ODMetric.space6) {
                    SignedOutView { Task { await session.signIn() } }
                    if session.signInFailed { Notice(tone: .error, title: Strings.entrySignInError) }
                }
            }
        case .signedOut:
            EntryView()
        case .failed(let error) where error.code == .maintenance:
            StatePage { MaintenanceView(until: error.until) }
        case .failed(let error):
            StatePage { ErrorState(error: error, titleSize: .title) { Task { await session.loadSession() } } }
        case .ready(let me):
            // The country first (T1), then the account's status (decisions 24 and 25).
            switch Landing.for(me, liveMarkets: session.config?.liveMarkets ?? []) {
            case .tabs:
                MainTabView()
            case .notAvailable:
                NotAvailableView(me: me)
            case .onboarding:
                OnboardingView()
            case .accountStatus:
                // Before the account opens there is no navigation, and so no way to a deposit
                // instruction (PRD section 5, failure B2).
                NavigationStack { AccountStatusView() }
            }
        }
    }
}

/// Decision 13: Inicio, Aportar (with the history), Cartera, Pendientes, Perfil (with help).
/// Decision 14: a restricted account keeps all of them; Aportar shows the block instead.
struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack { HomeView() }
                .tabItem { Label(Strings.navHome, systemImage: "house") }
            NavigationStack { DepositTabView() }
                .tabItem { Label(Strings.navDeposit, systemImage: "plus.circle") }
            NavigationStack { ComingSoonView(title: Strings.navPortfolio) }
                .tabItem { Label(Strings.navPortfolio, systemImage: "square.stack.3d.up") }
            NavigationStack { ComingSoonView(title: Strings.navPending) }
                .tabItem { Label(Strings.navPending, systemImage: "checklist") }
            NavigationStack { ProfilePlaceholderView() }
                .tabItem { Label(Strings.navProfile, systemImage: "person.crop.circle") }
        }
        .tint(ODColor.navy900)
    }
}

/// The simulated provider's page as a sheet (DEBUG; TODO(fase 11): the real provider's page in
/// ASWebAuthenticationSession). The sheet belongs to one sign-in request: swiping it away
/// cancels that request and no other.
private struct SimulatedProviderSheet: ViewModifier {
    @Environment(AppModel.self) private var model

    func body(content: Content) -> some View {
        #if DEBUG
        let page = model.signInPage
        content.sheet(item: Binding(get: { page.request }, set: { page.sheetChanged(to: $0) })) { request in
            SimulatedSignInSheet()
                .onAppear { page.sheetAppeared(request.id) }
        }
        #else
        content
        #endif
    }
}

#if DEBUG
/// The names are fixture data.
private struct SimulatedSignInSheet: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space4) {
            Text(Strings.devSimulatedProviderTitle)
                .odText(.heading)
                .foregroundStyle(ODColor.navy900)
                .accessibilityAddTraits(.isHeader)
            ForEach(SimulatedIdentity.allCases, id: \.self) { identity in
                Button { model.signInPage.answer(.identity(identity)) } label: { Text(verbatim: identity.displayName) }
                    .buttonStyle(.odSecondary)
                    .accessibilityIdentifier("simulated.\(identity.rawValue)")
            }
            Button(Strings.devSimulatedProviderFail) { model.signInPage.answer(.failed) }
                .buttonStyle(.odGhost)
                .accessibilityIdentifier("simulated.fail")
            Button(Strings.devSimulatedProviderCancel) { model.signInPage.answer(.cancelled) }
                .buttonStyle(.odGhost)
                .accessibilityIdentifier("simulated.cancel")
            Spacer(minLength: 0)
        }
        .padding(ODMetric.gutter)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ODColor.cream50)
        .presentationDetents([.medium, .large])
    }
}
#endif
