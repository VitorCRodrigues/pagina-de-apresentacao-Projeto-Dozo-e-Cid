import OpenDollarsCore
import SwiftUI

/// The language choice on this device (web: LanguageSwitcher): each language in its own name.
/// The choice wins over the account's and the system's language (decision 15).
struct LanguagePicker: View {
    let selection: AppLocale
    let choose: (AppLocale) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(Strings.languageLabel)
                .odText(.label)
                .foregroundStyle(ODColor.graphite900)
                .accessibilityHidden(true)
            Picker(Strings.languageLabel, selection: Binding(get: { selection }, set: choose)) {
                ForEach(AppLocale.allCases, id: \.self) { locale in
                    Text(Self.name(locale)).tag(locale)
                }
            }
            .pickerStyle(.segmented)
            .accessibilityIdentifier("language.picker")
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
