import SwiftUI

/// Spacing, shape and rules. A 4 pt base, like the web's (p-1 = 4 px). The statement language:
/// hairlines between lines and rules above and below, no cards and no shadows.
enum ODMetric {
    // Spacing
    static let space1: CGFloat = 4
    static let space2: CGFloat = 8
    static let space3: CGFloat = 12
    static let space4: CGFloat = 16
    static let space5: CGFloat = 20
    static let space6: CGFloat = 24
    static let space8: CGFloat = 32
    static let space10: CGFloat = 40

    /// Side margin at the 375 pt reference width.
    static let gutter: CGFloat = space5
    /// Between the blocks of a screen (web: gap-8).
    static let sectionSpacing: CGFloat = space8

    // Shape: 8 pt for controls; the balance block is the only 12 pt surface.
    static let radiusControl: CGFloat = 8
    static let radiusBlock: CGFloat = 12

    /// The smallest tap target (Apple HIG); buttons are 48 pt, like the web's min-h-12.
    static let minTapTarget: CGFloat = 44
    static let controlHeight: CGFloat = 48

    // Rules
    /// A hairline: one physical pixel is too faint on cream, so one point, like the web's 1 px.
    static let hairline: CGFloat = 1
    /// The side rule of a note, and the rule above a page state.
    static let rule: CGFloat = 2
}

extension View {
    /// Scrolled content passes under the status bar: this paints the top safe area cream, as the
    /// web's header sits on the page at the top (AppShell), so the clock and the battery always
    /// sit on cream (TODO(decisão) 23). A zero-height inset whose background extends into the safe area.
    func odStatusBarBackground() -> some View {
        safeAreaInset(edge: .top, spacing: 0) {
            Color.clear
                .frame(height: 0)
                .background(ODColor.cream50)
        }
    }
}

/// A horizontal rule. Decorative: hidden from VoiceOver.
struct Rule: View {
    var color: Color = ODColor.gray200
    var thickness: CGFloat = ODMetric.hairline

    var body: some View {
        Rectangle()
            .fill(color)
            .frame(height: thickness)
            .frame(maxWidth: .infinity)
            .accessibilityHidden(true)
    }
}
