import SwiftUI

struct ModuleCardView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let item: FeatureItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ChemVaultCard {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(alignment: .top) {
                        Image(systemName: item.symbolName)
                            .font(.system(size: 28, weight: .semibold))
                            .foregroundStyle(.cyan)
                            .frame(width: 44, height: 44)
                            .background(Color.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        Spacer()
                        StatusBadge(status: item.status, language: languageManager.activeLanguage)
                    }

                    Text(languageManager.text(item.titleKey))
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)

                    Text(languageManager.text(item.descriptionKey))
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .lineLimit(4)
                        .multilineTextAlignment(.leading)
                }
                .frame(minHeight: 178, alignment: .topLeading)
            }
        }
        .buttonStyle(.plain)
    }
}
