import SwiftUI

@main
struct OpenDollarsApp: App {
    @State private var model = AppModel.live()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains(DesignCatalogView.launchArgument) {
                // The design system catalog, for review and screenshots: no session, no data.
                DesignCatalogView()
            } else {
                root
            }
            #else
            root
            #endif
        }
    }

    /// The session app. The scene phase is watched here, so the catalog never touches the session.
    private var root: some View {
        RootView()
            .environment(model)
            .task { await model.start() }
            .onChange(of: scenePhase) { _, newPhase in
                Task { await model.scenePhaseChanged(newPhase) }
            }
    }
}
