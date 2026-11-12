import Foundation
import Testing
@testable import OpenDollarsCore

// Port of web/src/i18n/locale-preference.test.ts: a choice made on this device > the account's
// language (GET /me) > the system's.

@Suite struct LocalePreferenceTests {
    @Test func anExplicitChoiceOnThisDeviceWinsOverTheAccountAndTheSystem() {
        #expect(LocalePreference.resolve(explicit: .en, account: .pt, system: .es) == .en)
    }

    @Test func withoutAnExplicitChoiceTheAccountsLanguageWinsOverTheSystem() {
        #expect(LocalePreference.resolve(explicit: nil, account: .pt, system: .es) == .pt)
    }

    @Test func withoutEitherTheSystemsLanguageStays() {
        #expect(LocalePreference.resolve(explicit: nil, account: nil, system: .es) == .es)
    }

    @Test func theSystemsLanguageIsReadFromItsTag() {
        #expect(AppLocale(languageTag: "pt-BR") == .pt)
        #expect(AppLocale(languageTag: "fr-FR") == .es)
        #expect(AppLocale(languageTag: nil) == .es)
    }
}

@Suite struct LocaleChoiceStoreTests {
    private func makeStore() -> (LocaleChoiceStore, UserDefaults) {
        let defaults = UserDefaults(suiteName: "od.tests.\(UUID().uuidString)")!
        return (LocaleChoiceStore(defaults: defaults), defaults)
    }

    @Test func isAbsentUntilTheClientChooses() {
        let (store, _) = makeStore()
        #expect(store.read() == nil)
        store.save(.pt)
        #expect(store.read() == .pt)
    }

    @Test func canBeClearedToUndoAChoice() {
        let (store, _) = makeStore()
        store.save(.pt)
        store.save(nil)
        #expect(store.read() == nil)
    }

    @Test func ignoresAnUnknownStoredValue() {
        let (store, defaults) = makeStore()
        defaults.set("fr", forKey: LocaleChoiceStore.key)
        #expect(store.read() == nil)
    }

    @Test func usesTheSameKeyAsTheWeb() {
        #expect(LocaleChoiceStore.key == "od.locale.choice")
    }
}
