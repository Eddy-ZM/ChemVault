import SwiftUI

struct SidebarView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    @Binding var selection: ChemVaultModule?
    let permission: UserPermission

    var body: some View {
        List(selection: $selection) {
            Section {
                ForEach(NavigationItem.primary) { item in
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
