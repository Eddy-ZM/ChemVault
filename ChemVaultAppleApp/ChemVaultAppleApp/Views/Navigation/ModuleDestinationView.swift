import SwiftUI

struct ModuleDestinationView: View {
    @EnvironmentObject private var remoteConfigStore: RemoteConfigStore
    let module: ChemVaultModule
    let permission: UserPermission
    var openModule: (ChemVaultModule) -> Void = { _ in }

    var body: some View {
        if remoteConfigStore.isModuleEnabled(module) {
            moduleContent
        } else {
            DisabledModuleView(module: module)
        }
    }

    @ViewBuilder
    private var moduleContent: some View {
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

private struct DisabledModuleView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let module: ChemVaultModule

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "nosign")
                .font(.system(size: 42, weight: .semibold))
                .foregroundStyle(.secondary)
            Text(languageManager.text(module.titleKey))
                .font(.title2.weight(.bold))
            Text("This module is currently disabled by remote configuration.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ChemVaultSurface())
    }
}
