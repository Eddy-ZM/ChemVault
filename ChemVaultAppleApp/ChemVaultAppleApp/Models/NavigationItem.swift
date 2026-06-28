import Foundation

struct NavigationItem: Identifiable, Hashable {
    var id: String { module.id }
    let module: ChemVaultModule
    let titleKey: String
    let symbolName: String

    init(module: ChemVaultModule) {
        self.module = module
        self.titleKey = module.titleKey
        self.symbolName = module.symbolName
    }

    static let primary = ChemVaultModule.sidebarModules.map(NavigationItem.init)
}
