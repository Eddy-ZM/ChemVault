import SwiftUI

struct TabBarRootView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    @EnvironmentObject private var remoteConfigStore: RemoteConfigStore
    let permission: UserPermission
    @State private var selectedTab: ChemVaultModule = .home
    @State private var homePath: [ChemVaultModule] = []

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack(path: $homePath) {
                HomeView(permission: permission) { module in
                    homePath.append(module)
                }
                .navigationDestination(for: ChemVaultModule.self) { module in
                    ModuleDestinationView(module: module, permission: permission) { selectedTab = $0 }
                }
            }
            .tabItem { Label(languageManager.text(ChemVaultModule.home.titleKey), systemImage: ChemVaultModule.home.symbolName) }
            .tag(ChemVaultModule.home)

            if remoteConfigStore.isModuleEnabled(.model) {
                NavigationStack { ModelView(permission: permission) }
                    .tabItem { Label(languageManager.text(ChemVaultModule.model.titleKey), systemImage: ChemVaultModule.model.symbolName) }
                    .tag(ChemVaultModule.model)
            }

            if remoteConfigStore.isModuleEnabled(.files) {
                NavigationStack { FilesView(permission: permission) }
                    .tabItem { Label(languageManager.text(ChemVaultModule.files.titleKey), systemImage: ChemVaultModule.files.symbolName) }
                    .tag(ChemVaultModule.files)
            }

            if remoteConfigStore.isModuleEnabled(.docs) {
                NavigationStack { DocsView(permission: permission) }
                    .tabItem { Label(languageManager.text(ChemVaultModule.docs.titleKey), systemImage: ChemVaultModule.docs.symbolName) }
                    .tag(ChemVaultModule.docs)
            }

            NavigationStack { SettingsView() }
                .tabItem { Label(languageManager.text(ChemVaultModule.settings.titleKey), systemImage: ChemVaultModule.settings.symbolName) }
                .tag(ChemVaultModule.settings)
        }
        .onChange(of: remoteConfigStore.config.enabledModuleIDs) { _ in
            if !remoteConfigStore.isModuleEnabled(selectedTab) {
                selectedTab = .home
            }
        }
    }
}
