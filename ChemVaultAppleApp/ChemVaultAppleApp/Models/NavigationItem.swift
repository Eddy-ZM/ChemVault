import Foundation

struct NavigationItem: Identifiable, Hashable {
    var id: String { module.id }
    let module: ChemVaultModule
    let titleKey: String
    let symbolName: String

    static let primary = ChemVaultModule.sidebarModules.map {
        NavigationItem(module: $0, titleKey: $0.titleKey, symbolName: $0.symbolName)
    }
}
