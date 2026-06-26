import SwiftUI

struct PageHeader: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let module: ChemVaultModule
    let permission: UserPermission

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: module.symbolName)
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(.cyan)
                    .frame(width: 52, height: 52)
                    .background(Color.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text(languageManager.text(module.titleKey))
                        .font(.largeTitle.weight(.bold))
                    Text(languageManager.text(module.descriptionKey))
                        .foregroundStyle(.secondary)
                }
            }
            StatusBadge(status: permission.status(for: module), language: languageManager.activeLanguage)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
