import SwiftUI

struct SidebarView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    @EnvironmentObject private var remoteConfigStore: RemoteConfigStore
    @Binding var selection: ChemVaultModule?
    let permission: UserPermission

    var body: some View {
        List(selection: $selection) {
            Section {
                ForEach(remoteConfigStore.visibleSidebarModules.map(NavigationItem.init)) { item in
                    Label(languageManager.text(item.titleKey), systemImage: item.symbolName)
                        .tag(Optional(item.module))
                }
            } header: {
                HStack(spacing: 10) {
                    ChemVaultLogoMark(size: 28)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("ChemVault")
                            .font(.headline)
                        Text(languageManager.activeLanguage == .simplifiedChinese ? "原生科研工作台" : "Native research workspace")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 8)
            }
        }
        .navigationTitle("ChemVault")
    }
}
