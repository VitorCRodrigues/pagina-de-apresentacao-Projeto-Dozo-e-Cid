import OpenDollarsCore
import SwiftUI

/// Picks the screen for the session state, and watches for inactivity.
struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        content
            .background(ODColor.cream50.ignoresSafeArea())
            // Any tap counts as activity for the 15-minute rule.
            .simultaneousGesture(TapGesture().onEnded { model.recordActivity() })
            .alert(
                L10n.text("session.timeout.title"),
                isPresented: Binding(
                    get: { model.inactivityDeadline != nil },
                    set: { shown in if !shown { model.staySignedIn() } }),
                actions: {
                    Button(L10n.text("session.timeout.stay")) { model.staySignedIn() }
                    Button(L10n.text("session.timeout.signOut"), role: .destructive) {
                        Task { await model.signOut() }
                    }
                },
                message: { Text(L10n.text("session.timeout.body")) })
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .launching:
            LoadingStateView()
        case .signedOut(let reason):
            SignedOutView(reason: reason) { Task { await model.signInAgain() } }
        case .failed(let error) where error.code == .maintenance:
            MaintenanceView(until: error.until)
        case .failed(let error):
            ErrorStateView(error: error) { Task { await model.loadSession() } }
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
                .tabItem { Label(L10n.text("nav.home"), systemImage: "house") }
            NavigationStack { ComingSoonView(titleKey: "nav.deposit") }
                .tabItem { Label(L10n.text("nav.deposit"), systemImage: "plus.circle") }
            NavigationStack { ComingSoonView(titleKey: "nav.portfolio") }
                .tabItem { Label(L10n.text("nav.portfolio"), systemImage: "square.stack.3d.up") }
            NavigationStack { ComingSoonView(titleKey: "nav.pending") }
                .tabItem { Label(L10n.text("nav.pending"), systemImage: "checklist") }
            NavigationStack { ProfilePlaceholderView() }
                .tabItem { Label(L10n.text("nav.profile"), systemImage: "person.crop.circle") }
        }
        .tint(ODColor.navy900)
    }
}
