import Foundation
import Testing

// The system's permission prompts: their texts come from InfoPlist.xcstrings (generated from
// ios/strings/ios-only.json, reviewed by legal). The Info.plist in project.yml carries the Spanish
// source only because iOS needs the key there; these tests keep the two from drifting apart.

private enum PermissionFiles {
    static let ios = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // OpenDollarsCoreTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // OpenDollarsCore
        .deletingLastPathComponent() // ios

    static var projectYML: String {
        (try? String(contentsOf: ios.appendingPathComponent("project.yml"), encoding: .utf8)) ?? ""
    }

    /// key -> Spanish value, from InfoPlist.xcstrings.
    static var catalog: [String: String] {
        guard let data = try? Data(contentsOf: ios.appendingPathComponent("OpenDollars/Resources/InfoPlist.xcstrings")),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let strings = json["strings"] as? [String: Any]
        else { return [:] }
        var result: [String: String] = [:]
        for (key, value) in strings {
            let spanish = ((((value as? [String: Any])?["localizations"] as? [String: Any])?["es"] as? [String: Any])?["stringUnit"] as? [String: Any])?["value"] as? String
            result[key] = spanish
        }
        return result
    }

    /// Every `NS...UsageDescription: "text"` line of the Info.plist properties.
    static var declared: [String: String] {
        var result: [String: String] = [:]
        for line in projectYML.components(separatedBy: "\n") {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard !trimmed.hasPrefix("#"), let colon = trimmed.firstIndex(of: ":") else { continue }
            let key = String(trimmed[..<colon])
            guard key.hasPrefix("NS"), key.hasSuffix("UsageDescription") else { continue }
            result[key] = trimmed[trimmed.index(after: colon)...].trimmingCharacters(in: .whitespaces).trimmingCharacters(in: CharacterSet(charactersIn: "\""))
        }
        return result
    }
}

@Suite struct PermissionTextTests {
    @Test func theCameraIsDeclaredWithTheReviewedText() {
        let declared = PermissionFiles.declared
        #expect(declared["NSCameraUsageDescription"] != nil)
        #expect(declared["NSCameraUsageDescription"] == PermissionFiles.catalog["NSCameraUsageDescription"])
    }

    @Test func everyDeclaredPermissionHasItsTranslations() {
        let catalog = PermissionFiles.catalog
        for (key, value) in PermissionFiles.declared {
            #expect(catalog[key] == value, "\(key) differs from InfoPlist.xcstrings")
        }
    }

    // PhotosPicker and the Files picker run outside the app and need no permission: the app does
    // not declare access it does not use (TODO(decisão) 17 and 37).
    @Test func noPhotoLibraryOrFaceIDPermission() {
        let declared = PermissionFiles.declared
        #expect(declared["NSPhotoLibraryUsageDescription"] == nil)
        #expect(declared["NSPhotoLibraryAddUsageDescription"] == nil)
        #expect(declared["NSFaceIDUsageDescription"] == nil)
    }
}
