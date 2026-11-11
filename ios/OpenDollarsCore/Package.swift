// swift-tools-version:6.0
import PackageDescription

// Foundation only: no UIKit or SwiftUI, so the core builds and tests on Linux (WSL), Windows
// and macOS. The iOS app depends on it as a local package (see ../project.yml).
let package = Package(
    name: "OpenDollarsCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "OpenDollarsCore", targets: ["OpenDollarsCore"]),
    ],
    targets: [
        .target(name: "OpenDollarsCore"),
        .testTarget(name: "OpenDollarsCoreTests", dependencies: ["OpenDollarsCore"]),
    ],
    swiftLanguageModes: [.v6]
)
