import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    var openModule: (ChemVaultModule) -> Void = { _ in }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                HomeHeaderView()

                HStack {
                    Text(languageManager.text("home.section.modules"))
                        .font(.title2.weight(.bold))
                    Spacer()
                }

                FeatureGridView(items: FeatureItem.homeItems(permission: permission), openModule: openModule)

                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(languageManager.text("home.section.platform"))
                            .font(.title2.weight(.bold))
                        Text(languageManager.text("home.platform.text"))
                            .foregroundStyle(.secondary)
                            .lineSpacing(3)
                        HStack(spacing: 12) {
                            ChemVaultButton(title: languageManager.text("home.cta.model"), systemImage: "atom") {
                                openModule(.model)
                            }
                            ChemVaultButton(title: languageManager.text("home.cta.docs"), systemImage: "doc.text", style: .secondary) {
                                openModule(.docs)
                            }
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: 1120, alignment: .center)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.home.title"))
    }
}
