import SwiftUI

struct FeatureGridView: View {
    let items: [FeatureItem]
    let openModule: (ChemVaultModule) -> Void

    private let columns = [GridItem(.adaptive(minimum: 250), spacing: 16)]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(items) { item in
                ModuleCardView(item: item) {
                    openModule(item.module)
                }
            }
        }
    }
}
