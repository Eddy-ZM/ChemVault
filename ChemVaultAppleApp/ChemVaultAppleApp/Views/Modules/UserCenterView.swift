import SwiftUI

struct UserCenterView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    private let user = MockUser.demo

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PageHeader(module: .userCenter, permission: permission)
                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(languageManager.text("user.profile"))
                            .font(.title3.weight(.semibold))
                        HStack(spacing: 14) {
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 54))
                                .foregroundStyle(.cyan)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.displayName)
                                    .font(.headline)
                                Text(user.role)
                                    .foregroundStyle(.secondary)
                                Text(user.institution)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        StatusBadge(status: .available, language: languageManager.activeLanguage)
                    }
                }

                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("user.permissions"))
                            .font(.title3.weight(.semibold))
                        ForEach(ChemVaultModule.featureModules, id: \.self) { module in
                            HStack {
                                Image(systemName: module.symbolName)
                                    .foregroundStyle(.cyan)
                                Text(languageManager.text(module.titleKey))
                                Spacer()
                                StatusBadge(status: permission.status(for: module), language: languageManager.activeLanguage)
                            }
                            .padding(.vertical, 5)
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.user.title"))
    }
}
