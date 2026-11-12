import SwiftUI

@main
struct OpenDollarsApp: App {
    /// Also creates the PrivacyShield (not for the catalog) before the scene connects; it follows
    /// the scene's activation itself: SwiftUI's scenePhase reaches the screen a render pass late.
    @State private var model = AppModel.live()

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

    private var root: some View {
        RootView()
            .environment(model)
            .task { await model.start() }
    }
}
