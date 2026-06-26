import SwiftUI

struct ModelView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    @State private var smiles = ""
    @State private var query = ""

    private let recent = ["Aspirin", "Caffeine", "Benzene", "Sodium chloride"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 16) {
                        ChemVaultTextField(title: languageManager.text("model.smiles"), placeholder: languageManager.text("model.smiles.placeholder"), text: $smiles)
                        ChemVaultTextField(title: languageManager.text("model.search"), placeholder: languageManager.text("model.search.placeholder"), text: $query)
                        HStack(spacing: 12) {
                            ChemVaultButton(title: languageManager.text("model.draw"), systemImage: "pencil.tip.crop.circle") { }
                            ChemVaultButton(title: languageManager.text("model.periodic"), systemImage: "square.grid.3x3", style: .secondary) { }
                        }
                    }
                }

                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("model.preview.title"))
                            .font(.title3.weight(.semibold))
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(LinearGradient(colors: [Color.cyan.opacity(0.25), Color.blue.opacity(0.08)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(height: 180)
                            .overlay(
                                Image(systemName: "hexagon")
                                    .font(.system(size: 80, weight: .thin))
                                    .foregroundStyle(.cyan.opacity(0.8))
                            )
                        Text(languageManager.text("model.preview.body"))
                            .foregroundStyle(.secondary)
                    }
                }

                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("model.recent"))
                            .font(.title3.weight(.semibold))
                        ForEach(recent, id: \.self) { molecule in
                            HStack {
                                Image(systemName: "atom")
                                    .foregroundStyle(.cyan)
                                Text(molecule)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 8)
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.model.title"))
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(languageManager.text("module.model.title"))
                .font(.largeTitle.weight(.bold))
            Text(languageManager.text("module.model.description"))
                .foregroundStyle(.secondary)
            StatusBadge(status: permission.status(for: .model), language: languageManager.activeLanguage)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
