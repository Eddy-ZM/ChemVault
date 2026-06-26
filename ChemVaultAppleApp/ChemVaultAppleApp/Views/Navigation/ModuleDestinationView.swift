import SwiftUI

struct ModuleDestinationView: View {
    let module: ChemVaultModule
    let permission: UserPermission
    var openModule: (ChemVaultModule) -> Void = { _ in }

    var body: some View {
        switch module {
        case .home:
            HomeView(permission: permission, openModule: openModule)
        case .model:
            ModelView(permission: permission)
        case .files:
            FilesView(permission: permission)
        case .docs:
            DocsView(permission: permission)
        case .extract:
            ExtractView(permission: permission)
        case .mail:
            MailView(permission: permission)
        case .userCenter:
            UserCenterView(permission: permission)
        case .notifications:
            NotificationsView(permission: permission)
        case .settings:
            SettingsView()
        }
    }
}
