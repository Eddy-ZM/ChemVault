import SwiftUI

struct HomeHeaderView: View {
    @EnvironmentObject private var languageManager: LanguageManager

    var body: some View {
        ChemVaultCard {
            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .center, spacing: 14) {
                    ChemVaultLogoMark(size: 58)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(languageManager.text("home.title"))
                            .font(.system(.largeTitle, design: .rounded, weight: .bold))
                        Text(languageManager.text("home.subtitle"))
                            .font(.title3)
                            .foregroundStyle(.secondary)
                    }
                }

                Text(languageManager.text("home.intro"))
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 8) {
                    ForEach(headerTags, id: \.self) { label in
                        Text(label)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.cyan.opacity(0.12), in: Capsule())
                    }
                }
            }
        }
    }

    private var headerTags: [String] {
        languageManager.activeLanguage == .simplifiedChinese
            ? ["化合物检索", "记录详情", "辅助工具"]
            : ["Compound Search", "Record Detail", "Supporting Tools"]
    }
}
