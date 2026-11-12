import Foundation

/// The only places the app writes files during a session (a document photo before upload, a
/// statement to share): one folder of its own inside tmp/ and one inside Caches/. Signing out
/// deletes those two folders and nothing else, so what the system or the bundle keeps there
/// (URLCache's own store, snapshots) is left alone. Fonts and string catalogs live in the app
/// bundle, never in these folders.
public struct SessionFiles: Sendable {
    public enum Area: Sendable {
        case temporary
        case caches
    }

    public static let folderName = "opendollars-session"

    private let temporaryDirectory: URL
    private let cachesDirectory: URL

    public init(
        temporaryDirectory: URL = FileManager.default.temporaryDirectory,
        cachesDirectory: URL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    ) {
        self.temporaryDirectory = temporaryDirectory
        self.cachesDirectory = cachesDirectory
    }

    private func folder(_ area: Area) -> URL {
        (area == .temporary ? temporaryDirectory : cachesDirectory).appendingPathComponent(Self.folderName, isDirectory: true)
    }

    /// The folder to write in, created when missing.
    public func directory(_ area: Area) throws -> URL {
        let url = folder(area)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    /// Deletes everything the app wrote; a folder that does not exist is already clean.
    public func wipe() {
        for area in [Area.temporary, .caches] {
            try? FileManager.default.removeItem(at: folder(area))
        }
    }
}
