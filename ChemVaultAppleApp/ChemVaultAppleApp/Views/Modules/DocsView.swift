import SwiftUI

struct DocsView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    @State private var search = ""

    private let docs = [
        "Getting started with ChemVault",
        "Compound search workflow",
        "Scientific data extraction pipeline",
        "File infrastructure and access",
        "Developer API roadmap"
    ]

    var filteredDocs: [String] {
        search.isEmpty ? docs : docs.filter { $0.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PageHeader(module: .docs, permission: permission)
                ChemVaultSearchBar(placeholder: languageManager.text("docs.search.placeholder"), text: $search)
                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("docs.categories"))
                            .font(.title3.weight(.semibold))
                        ForEach(filteredDocs, id: \.self) { doc in
                            NavigationLink {
                                DocDetailView(title: doc)
                            } label: {
                                HStack {
                                    Image(systemName: "doc.text")
                                        .foregroundStyle(.cyan)
                                    Text(doc)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.vertical, 9)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.docs.title"))
    }
}

private struct DocDetailView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let title: String

    var body: some View {
        ScrollView {
            ChemVaultCard {
                VStack(alignment: .leading, spacing: 12) {
                    Text(title)
                        .font(.largeTitle.weight(.bold))
                    Text(languageManager.text("docs.detail.placeholder"))
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
            .frame(maxWidth: 860)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(title)
    }
}
