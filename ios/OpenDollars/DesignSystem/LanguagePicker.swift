import OpenDollarsCore
import SwiftUI

/// The language choice on this device (web: LanguageSwitcher): each language in its own name.
/// The choice wins over the account's and the system's language (decision 15).
struct LanguagePicker: View {
    let choose: (AppLocale) -> Void
    /// The picker binds to local state and reports the choice through onChange: SwiftUI's
    /// Binding(get:set:) wants Sendable functions, and `choose` captures the caller's model.
    /// A new language rebuilds the screen tree, so this state never goes stale.
    @State private var picked: AppLocale

    init(selection: AppLocale, choose: @escaping (AppLocale) -> Void) {
        self.choose = choose
        _picked = State(initialValue: selection)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(Strings.languageLabel)
                .odText(.label)
                .foregroundStyle(ODColor.graphite900)
                .accessibilityHidden(true)
            Picker(Strings.languageLabel, selection: $picked) {
                ForEach(AppLocale.allCases, id: \.self) { locale in
                    Text(Self.name(locale)).tag(locale)
                }
            }
            .pickerStyle(.segmented)
            .accessibilityIdentifier("language.picker")
            .onChange(of: picked) { _, locale in choose(locale) }
        }
    }

    static func name(_ locale: AppLocale) -> String {
        switch locale {
        case .es: Strings.languageEs
        case .pt: Strings.languagePt
        case .en: Strings.languageEn
        }
    }
}

#Preview("ES") { PreviewSurface { LanguagePicker(selection: .es) { _ in } } }
#Preview("ES · AX3") { PreviewSurface(dynamicTypeSize: .accessibility3) { LanguagePicker(selection: .es) { _ in } } }
