import SwiftUI

@main
struct OpenDollarsApp: App {
    @State private var model = AppModel.live()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .task { await model.start() }
        }
        .onChange(of: scenePhase) { _, newPhase in
            Task { await model.scenePhaseChanged(newPhase) }
        }
    }
}
