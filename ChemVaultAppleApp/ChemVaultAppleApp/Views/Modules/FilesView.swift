import SwiftUI

struct FilesView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    @State private var search = ""

    private let files = [
        "Aspirin synthesis report.pdf",
        "HPLC caffeine calibration.csv",
        "Reagent inventory export.xlsx",
        "NMR benzene reference.dx"
    ]

    var filteredFiles: [String] {
        search.isEmpty ? files : files.filter { $0.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PageHeader(module: .files, permission: permission)
                ChemVaultSearchBar(placeholder: languageManager.text("files.search.placeholder"), text: $search)
                ChemVaultButton(title: languageManager.text("files.upload"), systemImage: "square.and.arrow.up") { }

                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("files.recent"))
                            .font(.title3.weight(.semibold))
                        if filteredFiles.isEmpty {
                            EmptyStateView(systemImage: "folder.badge.questionmark", title: languageManager.text("files.empty.title"), message: languageManager.text("files.empty.body"))
                        } else {
                            ForEach(filteredFiles, id: \.self) { file in
                                HStack(spacing: 12) {
                                    Image(systemName: "doc")
                                        .foregroundStyle(.cyan)
                                    Text(file)
                                    Spacer()
                                    Text("Demo")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.vertical, 8)
                            }
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.files.title"))
    }
}
