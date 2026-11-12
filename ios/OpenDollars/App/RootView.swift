import OpenDollarsCore
import SwiftUI

/// Picks the screen for the session state, watches for inactivity, and covers the screen with the
/// brand whenever the app is not active (the app switcher's snapshot never shows a balance).
struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var signInPage = model.signInPage
        content
            // Texts are read through L10n, which SwiftUI does not observe, and screens may hold
            // state of the client: a new language or any exit rebuilds the whole tree.
            .id(model.screenTreeID)
            .environment(\.locale, L10n.foundationLocale)
            .background(ODColor.cream50.ignoresSafeArea())
            // Any tap counts as activity for the 15-minute rule.
            .simultaneousGesture(TapGesture().onEnded { model.recordActivity() })
            .alert(
                Strings.sessionTimeoutTitle,
                isPresented: Binding(
                    get: { model.inactivityDeadline != nil },
                    set: { shown in if !shown { model.staySignedIn() } }),
                actions: {
                    Button(Strings.sessionTimeoutStay) { model.staySignedIn() }
                    Button(Strings.sessionTimeoutSignOut, role: .destructive) {
                        Task { await model.signOut() }
                    }
                },
                message: { Text(Strings.sessionTimeoutBody) })
            .sheet(isPresented: $signInPage.isPresented, onDismiss: { model.signInPage.dismissed() }) {
                SimulatedSignInSheet()
            }
            .overlay {
                if model.isCovered || showsScreenshotCover {
                    PrivacyCover()
                }
            }
    }

    /// `-privacyCover` (DEBUG): shows the cover once signed in, for its screenshot; XCUITest cannot
    /// read the app switcher's snapshot itself.
    private var showsScreenshotCover: Bool {
        #if DEBUG
        guard ProcessInfo.processInfo.arguments.contains("-privacyCover"), case .ready = model.phase else { return false }
        return true
        #else
        return false
        #endif
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .launching:
            StatePage { LoadingState(shape: .statement) }
        case .signedOut(let reason) where reason == .inactivity || reason == .sessionExpired:
            // An exit the client did not choose: say why, then sign in again.
            StatePage {
                VStack(alignment: .leading, spacing: ODMetric.space6) {
                    SignedOutView(reason: reason) { Task { await model.signIn() } }
                    if model.signInFailed { Notice(tone: .error, title: Strings.entrySignInError) }
                }
            }
        case .signedOut:
            EntryView()
        case .failed(let error) where error.code == .maintenance:
            StatePage { MaintenanceView(until: error.until) }
        case .failed(let error):
            StatePage { ErrorState(error: error, titleSize: .title) { Task { await model.loadSession() } } }
        case .ready(let me):
            switch Landing.for(me.accountStatus) {
            case .tabs:
                MainTabView()
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

/// The simulated provider's page (TODO(fase 11): the real provider's page in
/// ASWebAuthenticationSession). The names are fixture data.
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
