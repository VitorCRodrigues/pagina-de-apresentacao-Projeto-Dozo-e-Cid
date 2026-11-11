import Foundation
import Testing
@testable import OpenDollarsCore

// Port of web/src/styles/contrast.test.ts. The app's ODColor reads its values from ColorToken, so
// these pairs are checked against the exact colours the app draws.

@Suite struct ContrastTests {
    @Test func theRatioFormulaMatchesWCAG() {
        #expect(abs(Contrast.ratio(0x000000, 0xFFFFFF) - 21) < 0.001)
        #expect(abs(Contrast.ratio(0xFFFFFF, 0xFFFFFF) - 1) < 0.001)
        // Order does not matter.
        #expect(Contrast.ratio(0x0B1F3A, 0xF7F4EE) == Contrast.ratio(0xF7F4EE, 0x0B1F3A))
    }

    @Test(arguments: ColorPairs.approved)
    func everyApprovedPairMeetsAA(pair: ContrastPair) {
        let ratio = Contrast.ratio(pair.foreground.hex, pair.background.hex)
        #expect(
            ratio >= pair.minimum.ratio,
            "\(pair.foreground) on \(pair.background) (\(pair.use)): \(ratio) < \(pair.minimum.ratio)")
    }

    // The "Total" label on the inverse balance block is normal-size text: 4.5:1, not the 3:1 of
    // large text.
    @Test func goldOnNavyMeetsTheTextCriterion() throws {
        let pair = try #require(ColorPairs.approved.first { $0.foreground == .gold500 && $0.background == .navy900 })
        #expect(pair.minimum == .text)
        #expect(Contrast.ratio(ColorToken.gold500.hex, ColorToken.navy900.hex) >= 4.5)
    }

    // Gold is never text on cream (decisions 10 and 19): it is approved on navy and nowhere else.
    @Test func goldIsApprovedOnlyOnNavy() {
        let goldPairs = ColorPairs.approved.filter { $0.foreground == .gold500 || $0.background == .gold500 }
        #expect(!goldPairs.isEmpty)
        #expect(goldPairs.allSatisfy { $0.foreground == .gold500 && $0.background == .navy900 })
        // And the reason, so nobody adds it back: gold on cream fails even the large-text minimum.
        #expect(Contrast.ratio(ColorToken.gold500.hex, ColorToken.cream50.hex) < 3)
    }

    @Test func theBrandColoursHaveTheirTextPairs() {
        let textPairs = Set(ColorPairs.approved.filter { $0.minimum == .text }.map { "\($0.foreground)/\($0.background)" })
        for required in ["navy900/cream50", "green700/cream50", "graphite900/cream50", "amber700/cream50", "brick700/cream50", "cream50/navy900"] {
            #expect(textPairs.contains(required), "missing text pair \(required)")
        }
    }
}

// The iOS tokens must keep the web's values (CLAUDE.md: "mesmos valores de tokens.css"). The
// core-windows job checks out ios/ only, so this suite runs where the web folder is present.
enum WebTokensFile {
    static let contents: String? = {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent() // OpenDollarsCoreTests
            .deletingLastPathComponent() // Tests
            .deletingLastPathComponent() // OpenDollarsCore
            .deletingLastPathComponent() // ios
            .deletingLastPathComponent() // repository
            .appendingPathComponent("web/src/styles/tokens.css")
        return try? String(contentsOf: url, encoding: .utf8)
    }()
}

@Suite(.enabled(if: WebTokensFile.contents != nil, "web/src/styles/tokens.css not checked out"))
struct TokenParityTests {
    private static func parse(_ css: String) throws -> [String: UInt32] {
        let regex = try NSRegularExpression(pattern: #"--od-([a-z]+(?:-\d+)?):\s*#([0-9a-fA-F]{6})"#)
        var tokens: [String: UInt32] = [:]
        let range = NSRange(css.startIndex..., in: css)
        for match in regex.matches(in: css, range: range) {
            guard let name = Range(match.range(at: 1), in: css), let hex = Range(match.range(at: 2), in: css) else { continue }
            tokens[String(css[name])] = UInt32(css[hex], radix: 16)
        }
        return tokens
    }

    @Test func everyColourTokenMatchesTheWeb() throws {
        let web = try Self.parse(try #require(WebTokensFile.contents))
        let ios = Dictionary(uniqueKeysWithValues: ColorToken.allCases.map { ($0.webName, $0.hex) })
        #expect(Set(web.keys) == Set(ios.keys))
        for (name, hex) in web {
            #expect(ios[name] == hex, "\(name): web \(String(hex, radix: 16)), iOS \(ios[name].map { String($0, radix: 16) } ?? "missing")")
        }
    }
}
