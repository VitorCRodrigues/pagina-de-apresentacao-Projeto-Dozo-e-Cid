import SwiftUI

/// Covers the whole screen whenever the app is not active, so the app switcher's snapshot shows
/// the brand and never a balance (TODO(decisão) 19). Navy with the name in cream, like the balance
/// block. One element that reads the app's name.
/// TODO(marca): the word "OpenDollars" in Inter Display stands in for the official vector logo
/// (pilot list, item 21); replace it when the logo arrives.
struct PrivacyCover: View {
    var body: some View {
        ZStack {
            ODColor.navy900.ignoresSafeArea()
            Text(Strings.appName)
                .odText(.display)
                .foregroundStyle(ODColor.cream50)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("privacy.cover")
    }
}

#Preview("ES") { PrivacyCover() }
