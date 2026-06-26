import SwiftUI

struct ExtractView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    @State private var extractionType = "paper"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PageHeader(module: .extract, permission: permission)
                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 16) {
                        ChemVaultButton(title: languageManager.text("extract.upload"), systemImage: "doc.badge.plus") { }
                        Picker(languageManager.text("extract.type"), selection: $extractionType) {
                            Text(languageManager.text("extract.paper")).tag("paper")
                            Text(languageManager.text("extract.lab")).tag("lab")
                            Text(languageManager.text("extract.instrument")).tag("instrument")
                        }
                        .pickerStyle(.segmented)
                    }
                }

                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("extract.jobs"))
                            .font(.title3.weight(.semibold))
                        ExtractionJobRow(title: "PDF ingestion", progress: 0.84)
                        ExtractionJobRow(title: "Entity linking", progress: 0.71)
                        ExtractionJobRow(title: "Evidence mapping", progress: 0.63)
                    }
                }

                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("extract.results"))
                            .font(.title3.weight(.semibold))
                        Grid(alignment: .leading, horizontalSpacing: 18, verticalSpacing: 10) {
                            GridRow { Text("Entity").bold(); Text("Value").bold(); Text("Confidence").bold() }
                            GridRow { Text("Compound"); Text("Aspirin"); Text("0.92") }
                            GridRow { Text("Method"); Text("HPLC"); Text("0.81") }
                            GridRow { Text("Yield"); Text("72%") ; Text("0.76") }
                        }
                        .font(.callout)
                    }
                }
            }
            .padding()
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.extract.title"))
    }
}

private struct ExtractionJobRow: View {
    let title: String
    let progress: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                Spacer()
                Text("\(Int(progress * 100))%")
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: progress)
        }
        .padding(.vertical, 6)
    }
}
