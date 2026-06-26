import SwiftUI

struct RootView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selectedModule: ChemVaultModule? = .home

    private let permission = UserPermission.demo

    var body: some View {
        Group {
            if languageManager.isBootstrapping {
                LaunchView()
            } else {
                adaptiveRoot
            }
        }
    }

    @ViewBuilder
    private var adaptiveRoot: some View {
        #if os(iOS)
        if horizontalSizeClass == .compact {
            TabBarRootView(permission: permission)
        } else {
            splitRoot
        }
        #elseif os(macOS)
        splitRoot
        #endif
    }

    private var splitRoot: some View {
        NavigationSplitView {
            SidebarView(selection: $selectedModule, permission: permission)
        } detail: {
            ModuleDestinationView(module: selectedModule ?? .home, permission: permission) { module in
                selectedModule = module
            }
        }
    }
}
