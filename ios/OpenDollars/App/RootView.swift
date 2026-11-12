import OpenDollarsCore
import SwiftUI

/// Picks the screen for the session state, and watches for inactivity.
struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        content
            // Texts are read through L10n, which SwiftUI does not observe: a new language rebuilds
            // the tree, and the environment locale follows it for system controls.
            .id(model.locale)
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
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .launching:
            StatePage { LoadingState(shape: .statement) }
        case .signedOut(let reason):
            StatePage { SignedOutView(reason: reason) { Task { await model.signInAgain() } } }
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
struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack { HomeView() }
                .tabItem { Label(Strings.navHome, systemImage: "house") }
            NavigationStack { ComingSoonView(title: Strings.navDeposit) }
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
