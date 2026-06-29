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
                        Text(languageManager.activeLanguage == .simplifiedChinese ? "化合物检索工作台" : "Compound search workspace")
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
