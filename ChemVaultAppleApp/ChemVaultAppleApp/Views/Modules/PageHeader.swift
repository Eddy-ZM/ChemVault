import SwiftUI

struct PageHeader: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let module: ChemVaultModule
    let permission: UserPermission

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: module.symbolName)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(.cyan)
                    .frame(width: 42, height: 42)
                    .background(Color.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                VStack(alignment: .leading, spacing: 4) {
                    Text(languageManager.text(module.titleKey))
                        .font(.title2.weight(.bold))
                    Text(languageManager.text(module.descriptionKey))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            StatusBadge(status: permission.status(for: module), language: languageManager.activeLanguage)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
