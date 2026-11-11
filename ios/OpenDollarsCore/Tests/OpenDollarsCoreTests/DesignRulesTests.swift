import Foundation
import Testing

// Static checks over the app's Swift sources (ios/OpenDollars) for what the brand forbids
// (CLAUDE.md, Design): gradients, emoji, currency/rocket/trend icons, and colour outside the
// design tokens. Comments are ignored, so a rule can be explained next to the code.
// It cannot tell what a colour means; "green or red for gain or loss" is covered by ODColor's
// documentation and by review.

/// One forbidden pattern. `outsideDesignSystem` rules allow the pattern inside OpenDollars/DesignSystem.
struct DesignRule: Sendable, CustomStringConvertible {
    let name: String
    let pattern: String
    var outsideDesignSystem = false

    var description: String { name }

    func matches(_ line: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return false }
        return regex.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)) != nil
    }

    private static let systemColours = "red|green|blue|orange|yellow|pink|purple|teal|mint|cyan|indigo|brown|gray|black|white"
    private static let forbiddenSymbols =
        "dollarsign|centsign|eurosign|sterlingsign|yensign|pesosign|bitcoinsign|currencysign|banknote|rocket|chart\\.line\\.(?:uptrend|downtrend)|flame|sparkles"

    static let all: [DesignRule] = [
        DesignRule(name: "gradient", pattern: #"\b(?:Linear|Radial|Angular|Elliptical|Mesh)Gradient\b|\bGradient\s*\(|\.gradient\b"#),
        DesignRule(name: "forbidden SF Symbol", pattern: #"(?:systemName|systemImage)\s*:\s*"[^"]*(?:"# + forbiddenSymbols + #")"#),
        // Color.green, UIColor.red: the system palette. ODColor.green700 is a brand token, and
        // "ODColor" never matches \bColor (no word boundary inside it).
        DesignRule(name: "system colour", pattern: #"\b(?:Color|UIColor)\.(?:"# + systemColours + #")\b"#),
        // .foregroundStyle(.green): the leading-dot shorthand of a system colour. A member of a
        // name (ODColor.green, x.red) is preceded by a word character, so it is not shorthand.
        DesignRule(name: "system colour shorthand", pattern: #"(?<![\w)\]])\.(?:"# + systemColours + #")\b(?!\s*[:=(])"#),
        DesignRule(name: "raw colour outside the design system", pattern: #"\b(?:Color|UIColor)\s*\(|#colorLiteral|\bColor\s*\.\s*init\s*\("#, outsideDesignSystem: true),
    ]
}

struct SourceLine: Sendable {
    let file: String
    let number: Int
    let text: String
    let inDesignSystem: Bool
}

enum AppSources {
    static let root = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent() // OpenDollarsCoreTests
        .deletingLastPathComponent() // Tests
        .deletingLastPathComponent() // OpenDollarsCore
        .deletingLastPathComponent() // ios
        .appendingPathComponent("OpenDollars")

    static func swiftFiles() -> [URL] {
        guard let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil) else { return [] }
        return enumerator.compactMap { $0 as? URL }.filter { $0.pathExtension == "swift" }
    }

    /// Lines with comments removed (line comments and /* */ blocks; string contents are kept).
    static func lines() throws -> [SourceLine] {
        try swiftFiles().flatMap { url -> [SourceLine] in
            let path = url.standardizedFileURL.path
            let relative = path.replacingOccurrences(of: root.standardizedFileURL.path + "/", with: "")
            let inDesignSystem = relative.hasPrefix("DesignSystem/")
            var inBlock = false
            return try String(contentsOf: url, encoding: .utf8)
                .components(separatedBy: "\n")
                .enumerated()
                .map { index, raw in
                    SourceLine(file: relative, number: index + 1, text: stripComments(raw, inBlock: &inBlock), inDesignSystem: inDesignSystem)
                }
        }
    }

    static func stripComments(_ line: String, inBlock: inout Bool) -> String {
        var output = ""
        var index = line.startIndex
        var inString = false
        while index < line.endIndex {
            let rest = line[index...]
            if inBlock {
                if rest.hasPrefix("*/") { inBlock = false; index = line.index(index, offsetBy: 2) } else { index = line.index(after: index) }
                continue
            }
            if !inString && rest.hasPrefix("//") { break }
            if !inString && rest.hasPrefix("/*") { inBlock = true; index = line.index(index, offsetBy: 2); continue }
            if line[index] == "\"" { inString.toggle() }
            output.append(line[index])
            index = line.index(after: index)
        }
        return output
    }
}

@Suite struct DesignRulesTests {
    @Test func theAppSourcesAreFound() {
        // Guards against a vacuous pass if the folder moves.
        #expect(AppSources.swiftFiles().count >= 5, "no Swift files under \(AppSources.root.path)")
    }

    @Test(arguments: DesignRule.all)
    func theAppFollowsTheRule(rule: DesignRule) throws {
        let offences = try AppSources.lines()
            .filter { !(rule.outsideDesignSystem && $0.inDesignSystem) && rule.matches($0.text) }
            .map { "\($0.file):\($0.number): \($0.text.trimmingCharacters(in: .whitespaces))" }
        #expect(offences.isEmpty, "\(rule.name):\n\(offences.joined(separator: "\n"))")
    }

    @Test func theAppHasNoEmoji() throws {
        let offences = try AppSources.swiftFiles().flatMap { url -> [String] in
            try String(contentsOf: url, encoding: .utf8).components(separatedBy: "\n").enumerated().compactMap { index, line in
                let emoji = line.unicodeScalars.contains { $0.properties.isEmojiPresentation || $0.value == 0xFE0F }
                return emoji ? "\(url.lastPathComponent):\(index + 1)" : nil
            }
        }
        #expect(offences.isEmpty, "emoji in \(offences)")
    }
}

// The rules themselves: they catch what they should and leave the brand tokens alone.
@Suite struct DesignRuleSelfTests {
    private func offending(_ line: String, inDesignSystem: Bool = false) -> [String] {
        var inBlock = false
        let text = AppSources.stripComments(line, inBlock: &inBlock)
        return DesignRule.all.filter { !($0.outsideDesignSystem && inDesignSystem) && $0.matches(text) }.map(\.name)
    }

    @Test(arguments: [
        ".foregroundStyle(ODColor.green700)",
        ".tint(ODColor.navy900)",
        "ODColor.green",
        "ODColor.white",
        "let style: ButtonVariant = .secondary",
        "case .done: ODColor.green700",
        "Image(systemName: \"exclamationmark.circle\")",
        "Text(verbatim: \"US$\") // never Color.green here",
        "/* LinearGradient was removed */ Text(\"x\")",
        "enum Tone { case red, green }",
    ])
    func brandTokensAndOrdinaryCodePass(line: String) {
        #expect(offending(line).isEmpty, "\(line): \(offending(line))")
    }

    @Test(arguments: [
        ("Color.green", "system colour"),
        (".foregroundStyle(.red)", "system colour shorthand"),
        ("Text(\"x\").foregroundColor( .green)", "system colour shorthand"),
        ("UIColor.red", "system colour"),
        ("LinearGradient(colors: [], startPoint: .top, endPoint: .bottom)", "gradient"),
        (".fill(ODColor.navy900.gradient)", "gradient"),
        ("Image(systemName: \"dollarsign.circle\")", "forbidden SF Symbol"),
        ("Label(\"x\", systemImage: \"chart.line.uptrend.xyaxis\")", "forbidden SF Symbol"),
        ("Image(systemName: \"rocket.fill\")", "forbidden SF Symbol"),
        ("Color(red: 0.1, green: 0.2, blue: 0.3)", "raw colour outside the design system"),
    ])
    func violationsAreCaught(line: String, rule: String) {
        #expect(offending(line).contains(rule), "\(line): \(offending(line))")
    }

    @Test func rawColourIsAllowedInsideTheDesignSystem() {
        #expect(offending("Color(.sRGB, red: 1, green: 1, blue: 1, opacity: 1)", inDesignSystem: true).isEmpty)
    }
}
