import SwiftUI

/// The page every preview sits on: cream, the 375 pt reference margins, Spanish (Argentina), and
/// optionally a Dynamic Type size, so each component is checked in ES at default and large sizes.
struct PreviewSurface<Content: View>: View {
    var dynamicTypeSize: DynamicTypeSize = .large
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: ODMetric.space6) { content }
                .padding(ODMetric.gutter)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(ODColor.cream50)
        .environment(\.locale, Locale(identifier: "es_AR"))
        .dynamicTypeSize(dynamicTypeSize)
    }
}
