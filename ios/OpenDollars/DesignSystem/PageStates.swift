import OpenDollarsCore
import SwiftUI

// The states every screen has (web/src/components/PageState.tsx): typographic, like a statement
// section. A graphite rule, the title, one sentence, one action. No icon, no spinner; the loading
// placeholder takes the shape of what is loading and does not pulse.

enum StateTitleSize: Sendable {
    /// The state is the whole page (session expired, maintenance): its title is the page's.
    case title
    /// A state inside a screen that already has a title.
    case heading
}

struct StateLayout<Action: View>: View {
    let title: String
    var message: String?
    var titleSize: StateTitleSize = .heading
    @ViewBuilder var action: Action

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space3) {
            Rule(color: ODColor.graphite900)
                .padding(.bottom, ODMetric.space2)
            Text(title)
                .odText(titleSize == .title ? .title : .heading)
                .foregroundStyle(ODColor.navy900)
                .accessibilityAddTraits(.isHeader)
            if let message {
                Text(message)
                    .odText(.body)
                    .foregroundStyle(ODColor.gray600)
            }
            action
                .padding(.top, ODMetric.space3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Nothing here yet. Always inside a screen with its own title.
struct EmptyState<Action: View>: View {
    let title: String
    var message: String?
    @ViewBuilder var action: Action

    var body: some View {
        StateLayout(title: title, message: message, titleSize: .heading) { action }
            .accessibilityIdentifier("state.empty")
    }
}

extension EmptyState where Action == EmptyView {
    init(title: String, message: String? = nil) {
        self.init(title: title, message: message) { EmptyView() }
    }
}

/// The screen could not load. The message is translated by error code, never by the API's
/// message (decision 12). `titleSize: .title` when the error is all there is on screen.
struct ErrorState: View {
    var error: APIError?
    var titleSize: StateTitleSize = .heading
    let retry: () -> Void

    var body: some View {
        StateLayout(
            title: Strings.statesErrorTitle,
            message: error.map { L10n.text($0.code.copyKey) } ?? Strings.statesErrorBody,
            titleSize: titleSize
        ) {
            Button(Strings.commonRetry, action: retry).buttonStyle(.odPrimary)
        }
        .accessibilityIdentifier("state.error")
    }
}

/// One part of a screen failed while the rest stays useful.
struct InlineError: View {
    let retry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space2) {
            Text(Strings.statesErrorTitle)
                .odText(.body)
                .foregroundStyle(ODColor.graphite900)
            Button(Strings.commonRetry, action: retry)
                .buttonStyle(.odGhost)
                .padding(.leading, -ODMetric.space1)
        }
    }
}

struct MaintenanceView: View {
    let until: Date?

    var body: some View {
        StateLayout(title: Strings.statesMaintenanceTitle, message: message, titleSize: .title) { EmptyView() }
            .accessibilityIdentifier("state.maintenance")
    }

    private var message: String {
        let body = Strings.statesMaintenanceBody
        guard let until else { return body }
        return body + " " + Strings.statesMaintenanceUntil(time: until.formatted(Date.FormatStyle(date: .omitted, time: .shortened).locale(L10n.foundationLocale)))
    }
}

struct SignedOutView: View {
    let reason: SignOutReason?
    let signIn: () -> Void

    /// Inactivity and an expired session get the "your session ended" explanation; the client's
    /// own sign-out does not need one.
    private var explains: Bool { reason == .inactivity || reason == .sessionExpired }

    var body: some View {
        StateLayout(
            title: explains ? Strings.statesSessionExpiredTitle : Strings.appName,
            message: explains ? Strings.statesSessionExpiredBody : nil,
            titleSize: .title
        ) {
            Button(Strings.statesSessionExpiredAction, action: signIn).buttonStyle(.odPrimary)
        }
        .accessibilityIdentifier("state.signedOut")
    }
}

// MARK: Loading

/// A static placeholder block. Decorative: the loading state announces itself.
struct Skeleton: View {
    var width: CGFloat?
    var height: CGFloat = 16
    var color: Color = ODColor.gray100

    var body: some View {
        RoundedRectangle(cornerRadius: ODMetric.radiusControl)
            .fill(color)
            .frame(width: width, height: height)
            .frame(maxWidth: width == nil ? .infinity : nil, alignment: .leading)
            .accessibilityHidden(true)
    }
}

enum LoadingShape: Sendable { case statement, form, timeline }

/// The placeholder takes the shape of the screen that is loading, so content does not jump when
/// it arrives. `statement`: sections of lines between hairlines; `form`: a field and its action;
/// `timeline`: a heading and steps.
struct LoadingState: View {
    var shape: LoadingShape = .statement

    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space8) {
            switch shape {
            case .statement:
                ForEach(0..<2, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: ODMetric.space3) {
                        Skeleton(width: 160, height: 24)
                        VStack(spacing: 0) {
                            ForEach(0..<3, id: \.self) { _ in
                                VStack(spacing: 0) {
                                    Rule()
                                    HStack(spacing: ODMetric.space4) {
                                        Skeleton(height: 16)
                                        Spacer(minLength: ODMetric.space8)
                                        Skeleton(width: 80, height: 16)
                                    }
                                    .padding(.vertical, ODMetric.space4)
                                }
                            }
                            Rule()
                        }
                    }
                }
            case .form:
                VStack(alignment: .leading, spacing: ODMetric.space3) {
                    Skeleton(height: 32).padding(.trailing, 80)
                    Skeleton(width: 128, height: 16).padding(.top, ODMetric.space4)
                    Skeleton(height: 48)
                    Skeleton(height: 16).padding(.trailing, 112)
                }
            case .timeline:
                VStack(alignment: .leading, spacing: ODMetric.space6) {
                    Skeleton(height: 32).padding(.trailing, 112)
                    ForEach(0..<4, id: \.self) { _ in
                        HStack(alignment: .top, spacing: ODMetric.space4) {
                            Circle().fill(ODColor.gray100).frame(width: 20, height: 20)
                            VStack(alignment: .leading, spacing: 6) {
                                Skeleton(height: 16).padding(.trailing, 96)
                                Skeleton(width: 96, height: 12)
                            }
                        }
                    }
                }
            }
        }
        .padding(.vertical, ODMetric.space2)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Strings.statesLoading)
        .accessibilityIdentifier("state.loading")
    }
}

/// One part of a screen still loading while the rest is already there.
struct InlineLoading: View {
    var body: some View {
        VStack(alignment: .leading, spacing: ODMetric.space2) {
            Skeleton(height: 20).padding(.trailing, 120)
            Skeleton(width: 110, height: 16)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Strings.commonLoading)
    }
}

/// A full-screen state (launch, signed out, maintenance, a failed session): the page's margins,
/// scrolling so large Dynamic Type never clips it.
struct StatePage<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            content
                .padding(.horizontal, ODMetric.gutter)
                .padding(.vertical, ODMetric.space10)
        }
        .background(ODColor.cream50)
    }
}

/// Samples shared by the previews and the catalog.
struct StateSamples: View {
    var body: some View {
        EmptyState(title: Strings.portfolioEmptyTitle, message: Strings.portfolioEmptyBody) {
            Button(Strings.portfolioEmptyAction) {}.buttonStyle(.odPrimary)
        }
        ErrorState {}
        InlineError {}
        InlineLoading()
        LoadingState(shape: .statement)
    }
}

#Preview("ES") { PreviewSurface { StateSamples() } }
#Preview("ES · AX3") { PreviewSurface(dynamicTypeSize: .accessibility3) { StateSamples() } }
#Preview("ES · signedOut") { StatePage { SignedOutView(reason: .inactivity) {} } }
