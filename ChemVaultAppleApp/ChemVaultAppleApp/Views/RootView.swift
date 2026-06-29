import SwiftUI

struct RootView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    @EnvironmentObject private var remoteConfigStore: RemoteConfigStore
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selectedModule: ChemVaultModule? = .model

    private let permission = UserPermission.demo

    var body: some View {
        Group {
            if languageManager.isBootstrapping {
                LaunchView()
            } else if remoteConfigStore.config.maintenanceMode {
                RemoteConfigGateView(
                    title: "ChemVault is in maintenance",
                    message: remoteConfigStore.config.announcementMessage.isEmpty
                        ? "The workspace is temporarily unavailable. Please try again later."
                        : remoteConfigStore.config.announcementMessage,
                    systemImage: "wrench.and.screwdriver"
                )
            } else if !remoteConfigStore.config.supportsCurrentAppVersion() {
                RemoteConfigGateView(
                    title: "Update ChemVault",
                    message: "This version is no longer supported. Minimum supported version: \(remoteConfigStore.config.minimumSupportedVersion).",
                    systemImage: "arrow.down.app"
                )
            } else {
                adaptiveRoot
            }
        }
        .onChange(of: remoteConfigStore.config.enabledModuleIDs) { _ in
            guard let selectedModule = selectedModule, !remoteConfigStore.isModuleEnabled(selectedModule) else { return }
            self.selectedModule = remoteConfigStore.isModuleEnabled(.model) ? .model : .home
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

private struct RemoteConfigGateView: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: systemImage)
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(.cyan)
            Text(title)
                .font(.title2.weight(.bold))
            Text(message)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 460)
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(ChemVaultSurface())
    }
}
