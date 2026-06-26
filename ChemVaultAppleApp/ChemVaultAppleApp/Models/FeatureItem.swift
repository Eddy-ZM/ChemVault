import Foundation

struct FeatureItem: Identifiable, Hashable {
    var id: String { module.id }
    let module: ChemVaultModule
    let titleKey: String
    let descriptionKey: String
    let symbolName: String
    let status: ModuleStatus

    static func homeItems(permission: UserPermission) -> [FeatureItem] {
        ChemVaultModule.featureModules.map { module in
            FeatureItem(
                module: module,
                titleKey: module.titleKey,
                descriptionKey: module.descriptionKey,
                symbolName: module.symbolName,
                status: permission.status(for: module)
            )
        }
    }
}
