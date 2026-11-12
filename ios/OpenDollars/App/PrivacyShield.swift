import OpenDollarsCore
import SwiftUI
import UIKit

/// Puts the privacy cover up the moment the scene stops being active, and takes it down whenever
/// ClientSession.mayUncover turns true (TODO(decisão) 19).
///
/// The cover is its own window above alerts (.alert + 1), so sheets and alerts are covered too.
/// Everything that decides the cover happens synchronously inside the scene's notifications, which
/// arrive before iOS takes the app switcher's snapshot: the cover goes up and the leave or the
/// return is recorded in the core in that same step. Only the inactivity check of a return, and
/// storing the last activity for the background, run later; neither can lift the cover after a
/// newer leave. The cover then follows every change of mayUncover (onMayUncoverChange).
/// The app is iPhone-only with a single scene (project.yml); a scene that iOS reconnects gets a
/// new cover window, and notifications from any other scene are ignored.
@MainActor
final class PrivacyShield {
    private let session: ClientSession
    private var window: UIWindow?
    private var observers: [NSObjectProtocol] = []
    /// `-privacyCover` (DEBUG): keeps the cover up for its screenshot.
    private var pinned = false

    init(session: ClientSession) {
        self.session = session
        session.onMayUncoverChange = { [weak self] mayUncover in
            if mayUncover { self?.hide() }
        }
        // queue: .main delivers synchronously on the main thread, inside the scene's transition,
        // so assumeIsolated holds and the cover is up before the snapshot. Only the scene's
        // identity (Sendable) crosses into the isolated block, never the Notification itself;
        // the scene is looked up again on the main actor.
        let center = NotificationCenter.default
        observers = [
            center.addObserver(forName: UIScene.willDeactivateNotification, object: nil, queue: .main) { [weak self] note in
                let sceneID = Self.sceneID(of: note)
                MainActor.assumeIsolated { self?.left(Self.scene(sceneID), toBackground: false) }
            },
            center.addObserver(forName: UIScene.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] note in
                let sceneID = Self.sceneID(of: note)
                MainActor.assumeIsolated { self?.left(Self.scene(sceneID), toBackground: true) }
            },
            center.addObserver(forName: UIScene.didActivateNotification, object: nil, queue: .main) { [weak self] note in
                let sceneID = Self.sceneID(of: note)
                MainActor.assumeIsolated { self?.returned(Self.scene(sceneID)) }
            },
        ]
    }

    /// The identity of the notification's scene: a Sendable value, read without touching the
    /// scene's main-actor state.
    private nonisolated static func sceneID(of note: Notification) -> ObjectIdentifier? {
        (note.object as? UIWindowScene).map(ObjectIdentifier.init)
    }

    /// The connected scene with that identity (nil when the notification had none).
    private static func scene(_ id: ObjectIdentifier?) -> UIWindowScene? {
        guard let id else { return nil }
        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { ObjectIdentifier($0) == id }
    }

    private func left(_ scene: UIWindowScene?, toBackground: Bool) {
        guard isOurs(scene) else { return }
        // The keyboard sits above any app window; closing it keeps typed text and its
        // suggestions out of the snapshot.
        scene?.windows.forEach { $0.endEditing(true) }
        show(in: scene)
        session.sceneLeft()
        guard toBackground else { return }
        // Store the last activity for the next launch before iOS suspends the app.
        let work = BackgroundWork()
        work.begin()
        Task {
            await session.sceneEnteredBackground()
            work.end()
        }
    }

    private func returned(_ scene: UIWindowScene?) {
        guard isOurs(scene) else { return }
        let comingBack = session.sceneBecameActive()
        Task { await session.finishReturn(comingBack) }
    }

    /// The scene the cover belongs to (any scene before there is a cover).
    private func isOurs(_ scene: UIWindowScene?) -> Bool {
        guard let covered = window?.windowScene, let scene else { return true }
        return covered === scene || covered.activationState == .unattached
    }

    private func show(in scene: UIWindowScene?) {
        guard let scene = scene ?? window?.windowScene ?? Self.connectedScene() else { return }
        if window?.windowScene !== scene {
            let cover = UIWindow(windowScene: scene)
            cover.windowLevel = .alert + 1
            cover.rootViewController = UIHostingController(rootView: PrivacyCover())
            window = cover
        }
        window?.isHidden = false
    }

    private func hide() {
        guard !pinned else { return }
        window?.isHidden = true
    }

    /// For the screenshot test only: XCUITest cannot read the system's snapshot.
    func pinForScreenshot() {
        pinned = true
        show(in: nil)
    }

    private static func connectedScene() -> UIWindowScene? {
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
    }
}

/// Background time to finish storing the last activity. Ended when the work is done, or by iOS's
/// expiration (then the save may be lost, and the next launch only sees an older activity, which
/// errs on the side of signing in again).
@MainActor
private final class BackgroundWork {
    private var id = UIBackgroundTaskIdentifier.invalid

    func begin() {
        id = UIApplication.shared.beginBackgroundTask(withName: "od.persistActivity") { [weak self] in
            MainActor.assumeIsolated { self?.end() }
        }
    }

    func end() {
        guard id != .invalid else { return }
        UIApplication.shared.endBackgroundTask(id)
        id = .invalid
    }
}
