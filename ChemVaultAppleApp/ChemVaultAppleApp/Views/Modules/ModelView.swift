import Foundation
import SwiftUI

struct ModelView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    @StateObject private var searchModel = CompoundSearchViewModel()

    private let resultColumns = [
        GridItem(.adaptive(minimum: 220), spacing: 10)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                header
                searchPanel
                statusPanel
                resultsSection
                selectedRecordSection
                supportingModules
            }
            .padding(14)
            .frame(maxWidth: 1040)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.model.title"))
        .task {
            await searchModel.loadInitialResults()
        }
    }

    private var header: some View {
        ChemVaultCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "magnifyingglass.circle.fill")
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(.cyan)
                        .frame(width: 46, height: 46)
                        .background(Color.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

                    VStack(alignment: .leading, spacing: 6) {
                        Text(languageManager.text("compound.hero.title"))
                            .font(.title.weight(.bold))
                            .fixedSize(horizontal: false, vertical: true)
                        Text(languageManager.text("compound.hero.body"))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineSpacing(3)
                    }
                }

                HStack(spacing: 8) {
                    StatusBadge(status: permission.status(for: .model), language: languageManager.activeLanguage)
                    Text(languageManager.text("compound.hero.badge"))
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .foregroundStyle(.cyan)
                        .background(Color.cyan.opacity(0.12), in: Capsule())
                }
            }
        }
    }

    private var searchPanel: some View {
        ChemVaultCard {
            VStack(alignment: .leading, spacing: 14) {
                Text(languageManager.text("compound.search.title"))
                    .font(.headline)

                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField(languageManager.text("compound.search.placeholder"), text: $searchModel.query)
                        .textFieldStyle(.plain)
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        #endif
                        .onSubmit {
                            Task { await searchModel.search() }
                        }
                    if searchModel.isLoading {
                        ProgressView()
                            .controlSize(.small)
                    }
                }
                .padding(10)
                .background(Color.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).stroke(Color.primary.opacity(0.09), lineWidth: 1))

                ChemVaultTextField(
                    title: languageManager.text("model.smiles"),
                    placeholder: languageManager.text("model.smiles.placeholder"),
                    text: $searchModel.smiles
                )

                HStack(spacing: 10) {
                    ChemVaultButton(title: languageManager.text("common.search"), systemImage: "arrow.right.circle") {
                        Task { await searchModel.search() }
                    }
                    ChemVaultButton(title: languageManager.text("compound.clear"), systemImage: "xmark.circle", style: .secondary) {
                        searchModel.resetToFeatured()
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(languageManager.text("compound.examples"))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(searchModel.suggestions, id: \.self) { suggestion in
                                Button(suggestion) {
                                    Task { await searchModel.search(suggestion) }
                                }
                                .font(.caption.weight(.semibold))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 7)
                                .background(Color.cyan.opacity(0.1), in: Capsule())
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
        }
    }

    private var statusPanel: some View {
        HStack(spacing: 12) {
            Label(languageManager.text(searchModel.statusKey), systemImage: searchModel.sourceState.systemImage)
                .font(.callout.weight(.medium))
                .foregroundStyle(searchModel.sourceState.color)
            Spacer()
            Text("\(searchModel.records.count) \(languageManager.text("compound.results.count"))")
                .font(.callout.weight(.semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 4)
    }

    private var resultsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(languageManager.text("compound.results.title"))
                .font(.headline)

            if let errorKey = searchModel.errorKey {
                ChemVaultCard {
                    Label(languageManager.text(errorKey), systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.orange)
                }
            }

            if searchModel.records.isEmpty && !searchModel.isLoading {
                ChemVaultCard {
                    EmptyStateView(
                        systemImage: "magnifyingglass",
                        title: languageManager.text("compound.noResults.title"),
                        message: languageManager.text("compound.noResults.body")
                    )
                }
            } else {
                LazyVGrid(columns: resultColumns, spacing: 10) {
                    ForEach(searchModel.records) { record in
                        CompoundResultCard(
                            record: record,
                            isSelected: record.id == searchModel.selectedRecord?.id
                        ) {
                            searchModel.select(record)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var selectedRecordSection: some View {
        if let record = searchModel.selectedRecord {
            ChemVaultCard {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(languageManager.text("compound.detail.title"))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.secondary)
                            Text(record.title)
                                .font(.title3.weight(.bold))
                            Text(record.subtitleText)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if let url = record.recordURL {
                            Link(destination: url) {
                                Image(systemName: "safari")
                                    .font(.headline)
                                    .frame(width: 38, height: 38)
                                    .background(Color.cyan.opacity(0.12), in: Circle())
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    Text(record.summaryText)
                        .lineSpacing(3)

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 10)], spacing: 10) {
                        CompoundFact(label: languageManager.text("compound.fact.formula"), value: record.formulaText)
                        CompoundFact(label: languageManager.text("compound.fact.domain"), value: record.domainText)
                        CompoundFact(label: languageManager.text("compound.fact.type"), value: record.typeLabel)
                    }

                    if !record.tags.isEmpty {
                        HStack(spacing: 8) {
                            ForEach(record.tags.prefix(6), id: \.self) { tag in
                                Text(tag)
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, 9)
                                    .padding(.vertical, 6)
                                    .background(Color.primary.opacity(0.06), in: Capsule())
                            }
                        }
                    }
                }
            }
        }
    }

    private var supportingModules: some View {
        ChemVaultCard {
            VStack(alignment: .leading, spacing: 12) {
                Text(languageManager.text("compound.supporting.title"))
                    .font(.headline)
                Text(languageManager.text("compound.supporting.body"))
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 10)], spacing: 10) {
                    SupportingModulePill(symbolName: "doc.text", title: languageManager.text("module.docs.title"))
                    SupportingModulePill(symbolName: "folder", title: languageManager.text("module.files.title"))
                    SupportingModulePill(symbolName: "sparkles.rectangle.stack", title: languageManager.text("module.extract.title"))
                }
            }
        }
    }
}

private struct CompoundResultCard: View {
    let record: CompoundSearchRecord
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ChemVaultCard {
                VStack(alignment: .leading, spacing: 11) {
                    HStack {
                        Text(record.typeLabel)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.cyan)
                        Spacer()
                        Image(systemName: isSelected ? "checkmark.circle.fill" : "chevron.right.circle")
                            .foregroundStyle(isSelected ? .cyan : .secondary)
                    }

                    Text(record.title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .lineLimit(2)

                    Text(record.subtitleText)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)

                    Text(record.summaryText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
                .frame(minHeight: 150, alignment: .topLeading)
            }
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(isSelected ? Color.cyan.opacity(0.5) : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct CompoundFact: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.callout.weight(.semibold))
                .lineLimit(2)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private struct SupportingModulePill: View {
    let symbolName: String
    let title: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: symbolName)
                .foregroundStyle(.cyan)
            Text(title)
                .font(.callout.weight(.medium))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

private enum CompoundSearchSourceState {
    case live
    case builtIn
    case offline

    var systemImage: String {
        switch self {
        case .live:
            return "checkmark.seal"
        case .builtIn:
            return "externaldrive"
        case .offline:
            return "wifi.slash"
        }
    }

    var color: Color {
        switch self {
        case .live:
            return .cyan
        case .builtIn:
            return .green
        case .offline:
            return .orange
        }
    }
}

@MainActor
private final class CompoundSearchViewModel: ObservableObject {
    @Published var query = "aspirin"
    @Published var smiles = ""
    @Published private(set) var records = CompoundSearchRecord.featured
    @Published private(set) var selectedRecord: CompoundSearchRecord? = CompoundSearchRecord.featured.first
    @Published private(set) var isLoading = false
    @Published private(set) var sourceState = CompoundSearchSourceState.builtIn
    @Published private(set) var statusKey = "compound.status.featured"
    @Published private(set) var errorKey: String?

    let suggestions = ["aspirin", "caffeine", "benzene", "ethanol", "acetone", "glucose", "sodium chloride"]

    private let apiClient = APIClient()
    private var didLoadInitialResults = false

    func loadInitialResults() async {
        guard !didLoadInitialResults else { return }
        didLoadInitialResults = true
        await search(query)
    }

    func search(_ submittedQuery: String? = nil) async {
        let nameQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        let smilesQuery = smiles.trimmingCharacters(in: .whitespacesAndNewlines)
        let rawTerm = submittedQuery ?? (nameQuery.isEmpty ? smilesQuery : nameQuery)
        let term = rawTerm.trimmingCharacters(in: .whitespacesAndNewlines)
        if let submittedQuery {
            query = submittedQuery
        }

        if term.isEmpty {
            resetToFeatured()
            return
        }

        isLoading = true
        defer { isLoading = false }
        errorKey = nil
        let localRecords = CompoundSearchRecord.localMatches(for: term)
        applyResults(localRecords, sourceState: .builtIn, statusKey: "compound.status.local")

        do {
            let response = try await apiClient.get(
                "/api/records",
                queryItems: [
                    URLQueryItem(name: "q", value: term),
                    URLQueryItem(name: "type", value: "compound"),
                    URLQueryItem(name: "limit", value: "24")
                ],
                as: CompoundSearchEnvelope.self
            )
            let remoteRecords = response.records
            if remoteRecords.isEmpty {
                applyResults(localRecords, sourceState: .builtIn, statusKey: "compound.status.local")
            } else {
                applyResults(
                    mergedRecords(remoteRecords, with: localRecords),
                    sourceState: .live,
                    statusKey: "compound.status.live"
                )
            }
        } catch {
            if localRecords.isEmpty {
                applyResults([], sourceState: .offline, statusKey: "compound.status.offline")
                errorKey = "compound.error.offline"
            } else {
                applyResults(localRecords, sourceState: .builtIn, statusKey: "compound.status.local")
            }
        }
    }

    func resetToFeatured() {
        query = ""
        smiles = ""
        records = CompoundSearchRecord.featured
        selectedRecord = records.first
        sourceState = .builtIn
        statusKey = "compound.status.featured"
        errorKey = nil
    }

    func select(_ record: CompoundSearchRecord) {
        selectedRecord = record
    }

    private func applyResults(
        _ nextRecords: [CompoundSearchRecord],
        sourceState nextSourceState: CompoundSearchSourceState,
        statusKey nextStatusKey: String
    ) {
        records = nextRecords
        selectedRecord = nextRecords.first
        sourceState = nextSourceState
        statusKey = nextStatusKey
    }

    private func mergedRecords(
        _ remoteRecords: [CompoundSearchRecord],
        with localRecords: [CompoundSearchRecord]
    ) -> [CompoundSearchRecord] {
        var seenIDs = Set<String>()
        let merged = (remoteRecords + localRecords).filter { record in
            seenIDs.insert(record.id.lowercased()).inserted
        }
        return Array(merged.prefix(24))
    }
}

private struct CompoundSearchEnvelope: Decodable {
    let source: String?
    let records: [CompoundSearchRecord]
}

private struct CompoundSearchRecord: Identifiable, Decodable, Hashable {
    let id: String
    let type: String
    let typeLabel: String
    let title: String
    let subtitle: String?
    let body: String?
    let domain: String?
    let family: String?
    let risk: String?
    let formula: String?
    let tags: [String]
    let href: String?

    var subtitleText: String {
        subtitle ?? formula ?? family ?? domain ?? "ChemVault compound record"
    }

    var summaryText: String {
        body ?? "Structured compound metadata is available for search, review and record navigation."
    }

    var formulaText: String {
        formula ?? "Not listed"
    }

    var domainText: String {
        domain ?? family ?? risk ?? "Compound"
    }

    var recordURL: URL? {
        guard let href, !href.isEmpty else { return nil }
        if let absolute = URL(string: href), absolute.scheme != nil {
            return absolute
        }
        let path = href.hasPrefix("/") ? href : "/\(href)"
        return URL(string: "https://chemvault.science\(path)")
    }

    private var searchText: String {
        ([id, type, typeLabel, title, subtitle, body, domain, family, risk, formula].compactMap { $0 } + tags)
            .joined(separator: " ")
            .lowercased()
    }

    init(
        id: String,
        type: String = "compound",
        typeLabel: String = "Compound",
        title: String,
        subtitle: String?,
        body: String?,
        domain: String?,
        family: String?,
        risk: String?,
        formula: String?,
        tags: [String],
        href: String?
    ) {
        self.id = id
        self.type = type
        self.typeLabel = typeLabel
        self.title = title
        self.subtitle = subtitle
        self.body = body
        self.domain = domain
        self.family = family
        self.risk = risk
        self.formula = formula
        self.tags = tags
        self.href = href
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case type
        case typeLabel
        case title
        case subtitle
        case body
        case summary
        case domain
        case family
        case risk
        case formula
        case tags
        case href
        case url
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        type = try container.decodeIfPresent(String.self, forKey: .type) ?? "compound"
        typeLabel = try container.decodeIfPresent(String.self, forKey: .typeLabel) ?? "Compound"
        title = try container.decodeIfPresent(String.self, forKey: .title) ?? id
        subtitle = try container.decodeIfPresent(String.self, forKey: .subtitle)
        let decodedBody = try container.decodeIfPresent(String.self, forKey: .body)
        let decodedSummary = try container.decodeIfPresent(String.self, forKey: .summary)
        body = decodedBody ?? decodedSummary
        domain = try container.decodeIfPresent(String.self, forKey: .domain)
        family = try container.decodeIfPresent(String.self, forKey: .family)
        risk = try container.decodeIfPresent(String.self, forKey: .risk)
        formula = try container.decodeIfPresent(String.self, forKey: .formula)
        tags = try container.decodeIfPresent([String].self, forKey: .tags) ?? []
        let decodedHref = try container.decodeIfPresent(String.self, forKey: .href)
        let decodedURL = try container.decodeIfPresent(String.self, forKey: .url)
        href = decodedHref ?? decodedURL
    }

    static let catalog: [CompoundSearchRecord] = [
        CompoundSearchRecord(
            id: "aspirin",
            title: "Aspirin",
            subtitle: "Acetylsalicylic acid",
            body: "Common aromatic carboxylic acid ester used as a reference compound for functional-group search and record review.",
            domain: "Organic compound",
            family: "Carboxylic acid derivative",
            risk: "standard",
            formula: "C9H8O4",
            tags: ["aromatic", "ester", "carboxylic acid"],
            href: "/pages/record.html?type=compound&id=aspirin"
        ),
        CompoundSearchRecord(
            id: "caffeine",
            title: "Caffeine",
            subtitle: "Methylxanthine alkaloid",
            body: "Nitrogen-rich heterocycle used as a practical example for formula, synonym and functional-fragment lookup.",
            domain: "Heterocycle",
            family: "Alkaloid",
            risk: "standard",
            formula: "C8H10N4O2",
            tags: ["xanthine", "alkaloid", "heterocycle"],
            href: "/pages/record.html?type=compound&id=caffeine"
        ),
        CompoundSearchRecord(
            id: "benzene",
            title: "Benzene",
            subtitle: "Aromatic hydrocarbon",
            body: "Core aromatic solvent and structural motif; useful for aromaticity, substitution and safety-oriented record navigation.",
            domain: "Aromatic hydrocarbon",
            family: "Arene",
            risk: "hazard",
            formula: "C6H6",
            tags: ["aromatic", "solvent", "arene"],
            href: "/pages/record.html?type=compound&id=benzene"
        ),
        CompoundSearchRecord(
            id: "ethanol",
            title: "Ethanol",
            subtitle: "Primary alcohol",
            body: "Small polar alcohol commonly used for solvent, spectroscopy and physical-property examples.",
            domain: "Alcohol",
            family: "Solvent",
            risk: "flammable",
            formula: "C2H6O",
            tags: ["alcohol", "solvent", "polar"],
            href: "/pages/record.html?type=compound&id=ethanol"
        ),
        CompoundSearchRecord(
            id: "acetone",
            title: "Acetone",
            subtitle: "Propanone",
            body: "Simple ketone and polar aprotic solvent used in carbonyl, solvent and safety search examples.",
            domain: "Ketone",
            family: "Solvent",
            risk: "flammable",
            formula: "C3H6O",
            tags: ["ketone", "solvent", "carbonyl"],
            href: "/pages/record.html?type=compound&id=acetone"
        ),
        CompoundSearchRecord(
            id: "sodium-chloride",
            title: "Sodium chloride",
            subtitle: "Inorganic salt",
            body: "Reference inorganic salt for formula lookup, materials context and basic compound indexing.",
            domain: "Inorganic salt",
            family: "Salt",
            risk: "standard",
            formula: "NaCl",
            tags: ["salt", "ionic", "inorganic"],
            href: "/pages/record.html?type=compound&id=sodium-chloride"
        ),
        CompoundSearchRecord(
            id: "glucose",
            title: "Glucose",
            subtitle: "D-Glucose",
            body: "Common carbohydrate reference compound for formula lookup, stereochemistry context and analytical examples.",
            domain: "Carbohydrate",
            family: "Monosaccharide",
            risk: "standard",
            formula: "C6H12O6",
            tags: ["sugar", "carbohydrate", "monosaccharide"],
            href: "/pages/record.html?type=compound&id=glucose"
        ),
        CompoundSearchRecord(
            id: "ibuprofen",
            title: "Ibuprofen",
            subtitle: "2-(4-isobutylphenyl)propionic acid",
            body: "Common non-steroidal anti-inflammatory reference compound for aromatic acid and pharmaceutical search examples.",
            domain: "Pharmaceutical compound",
            family: "Arylpropionic acid",
            risk: "standard",
            formula: "C13H18O2",
            tags: ["pharmaceutical", "carboxylic acid", "aromatic"],
            href: "/pages/record.html?type=compound&id=ibuprofen"
        ),
        CompoundSearchRecord(
            id: "acetaminophen",
            title: "Acetaminophen",
            subtitle: "Paracetamol",
            body: "Analgesic reference compound with phenol and amide groups for name, synonym and functional-group lookup.",
            domain: "Pharmaceutical compound",
            family: "Anilide",
            risk: "standard",
            formula: "C8H9NO2",
            tags: ["paracetamol", "phenol", "amide"],
            href: "/pages/record.html?type=compound&id=acetaminophen"
        ),
        CompoundSearchRecord(
            id: "methanol",
            title: "Methanol",
            subtitle: "Methyl alcohol",
            body: "Small polar alcohol used for solvent, toxicity and spectroscopy-oriented compound lookup.",
            domain: "Alcohol",
            family: "Solvent",
            risk: "toxic",
            formula: "CH4O",
            tags: ["alcohol", "solvent", "polar"],
            href: "/pages/record.html?type=compound&id=methanol"
        ),
        CompoundSearchRecord(
            id: "acetic-acid",
            title: "Acetic acid",
            subtitle: "Ethanoic acid",
            body: "Small carboxylic acid reference for acidity, solvent systems and organic reaction context.",
            domain: "Organic acid",
            family: "Carboxylic acid",
            risk: "corrosive",
            formula: "C2H4O2",
            tags: ["acid", "carboxylic acid", "solvent"],
            href: "/pages/record.html?type=compound&id=acetic-acid"
        ),
        CompoundSearchRecord(
            id: "ammonia",
            title: "Ammonia",
            subtitle: "Azane",
            body: "Nitrogen hydride reference compound for basicity, inorganic chemistry and safety lookup.",
            domain: "Inorganic compound",
            family: "Nitrogen hydride",
            risk: "irritant",
            formula: "NH3",
            tags: ["base", "nitrogen", "inorganic"],
            href: "/pages/record.html?type=compound&id=ammonia"
        ),
        CompoundSearchRecord(
            id: "water",
            title: "Water",
            subtitle: "Oxidane",
            body: "Universal solvent reference compound for formula lookup and physical-property context.",
            domain: "Inorganic compound",
            family: "Solvent",
            risk: "standard",
            formula: "H2O",
            tags: ["solvent", "polar", "inorganic"],
            href: "/pages/record.html?type=compound&id=water"
        ),
        CompoundSearchRecord(
            id: "carbon-dioxide",
            title: "Carbon dioxide",
            subtitle: "CO2",
            body: "Linear oxide reference for gas, carbonate system and environmental chemistry lookup.",
            domain: "Inorganic compound",
            family: "Oxide",
            risk: "gas",
            formula: "CO2",
            tags: ["gas", "oxide", "carbon"],
            href: "/pages/record.html?type=compound&id=carbon-dioxide"
        ),
        CompoundSearchRecord(
            id: "methane",
            title: "Methane",
            subtitle: "Natural gas reference",
            body: "Simple alkane used for hydrocarbon, combustion and molecular formula search examples.",
            domain: "Hydrocarbon",
            family: "Alkane",
            risk: "flammable",
            formula: "CH4",
            tags: ["alkane", "gas", "hydrocarbon"],
            href: "/pages/record.html?type=compound&id=methane"
        ),
        CompoundSearchRecord(
            id: "toluene",
            title: "Toluene",
            subtitle: "Methylbenzene",
            body: "Aromatic solvent reference compound for ring substitution, solvent and safety-oriented lookup.",
            domain: "Aromatic hydrocarbon",
            family: "Arene solvent",
            risk: "flammable",
            formula: "C7H8",
            tags: ["aromatic", "solvent", "methylbenzene"],
            href: "/pages/record.html?type=compound&id=toluene"
        ),
        CompoundSearchRecord(
            id: "phenol",
            title: "Phenol",
            subtitle: "Hydroxybenzene",
            body: "Aromatic alcohol reference for acidity, functional-group and safety lookup.",
            domain: "Aromatic compound",
            family: "Phenol",
            risk: "corrosive",
            formula: "C6H6O",
            tags: ["aromatic", "phenol", "acidic"],
            href: "/pages/record.html?type=compound&id=phenol"
        ),
        CompoundSearchRecord(
            id: "aniline",
            title: "Aniline",
            subtitle: "Aminobenzene",
            body: "Aromatic amine reference compound for dye, polymer and functional-group search examples.",
            domain: "Aromatic amine",
            family: "Aniline",
            risk: "toxic",
            formula: "C6H7N",
            tags: ["amine", "aromatic", "aniline"],
            href: "/pages/record.html?type=compound&id=aniline"
        ),
        CompoundSearchRecord(
            id: "chloroform",
            title: "Chloroform",
            subtitle: "Trichloromethane",
            body: "Halogenated solvent reference for safety, solvent and formula lookup.",
            domain: "Halogenated compound",
            family: "Solvent",
            risk: "hazard",
            formula: "CHCl3",
            tags: ["halogenated", "solvent", "chlorinated"],
            href: "/pages/record.html?type=compound&id=chloroform"
        ),
        CompoundSearchRecord(
            id: "diethyl-ether",
            title: "Diethyl ether",
            subtitle: "Ethoxyethane",
            body: "Volatile ether solvent used for solvent, flammability and functional-group lookup.",
            domain: "Ether",
            family: "Solvent",
            risk: "flammable",
            formula: "C4H10O",
            tags: ["ether", "solvent", "volatile"],
            href: "/pages/record.html?type=compound&id=diethyl-ether"
        ),
        CompoundSearchRecord(
            id: "sodium-hydroxide",
            title: "Sodium hydroxide",
            subtitle: "Caustic soda",
            body: "Strong inorganic base reference for pH, neutralization and safety lookup.",
            domain: "Inorganic base",
            family: "Hydroxide",
            risk: "corrosive",
            formula: "NaOH",
            tags: ["base", "hydroxide", "inorganic"],
            href: "/pages/record.html?type=compound&id=sodium-hydroxide"
        ),
        CompoundSearchRecord(
            id: "hydrochloric-acid",
            title: "Hydrochloric acid",
            subtitle: "Hydrogen chloride solution",
            body: "Strong acid reference for acid-base chemistry, aqueous systems and safety lookup.",
            domain: "Inorganic acid",
            family: "Hydrogen halide",
            risk: "corrosive",
            formula: "HCl",
            tags: ["acid", "chloride", "aqueous"],
            href: "/pages/record.html?type=compound&id=hydrochloric-acid"
        ),
        CompoundSearchRecord(
            id: "sulfuric-acid",
            title: "Sulfuric acid",
            subtitle: "Oil of vitriol",
            body: "Strong mineral acid reference for dehydration, acid-base workflows and safety lookup.",
            domain: "Inorganic acid",
            family: "Oxosulfur acid",
            risk: "corrosive",
            formula: "H2SO4",
            tags: ["acid", "sulfate", "mineral acid"],
            href: "/pages/record.html?type=compound&id=sulfuric-acid"
        ),
        CompoundSearchRecord(
            id: "potassium-chloride",
            title: "Potassium chloride",
            subtitle: "Inorganic salt",
            body: "Simple inorganic salt reference for electrolyte, materials and formula lookup.",
            domain: "Inorganic salt",
            family: "Salt",
            risk: "standard",
            formula: "KCl",
            tags: ["salt", "ionic", "electrolyte"],
            href: "/pages/record.html?type=compound&id=potassium-chloride"
        ),
        CompoundSearchRecord(
            id: "urea",
            title: "Urea",
            subtitle: "Carbamide",
            body: "Small carbonyl diamide reference for biochemistry, fertilizer and functional-group lookup.",
            domain: "Organic compound",
            family: "Amide",
            risk: "standard",
            formula: "CH4N2O",
            tags: ["amide", "biochemistry", "fertilizer"],
            href: "/pages/record.html?type=compound&id=urea"
        ),
        CompoundSearchRecord(
            id: "glycine",
            title: "Glycine",
            subtitle: "Aminoacetic acid",
            body: "Small amino acid reference for zwitterion, biochemistry and formula lookup.",
            domain: "Amino acid",
            family: "Biomolecule",
            risk: "standard",
            formula: "C2H5NO2",
            tags: ["amino acid", "biomolecule", "zwitterion"],
            href: "/pages/record.html?type=compound&id=glycine"
        ),
        CompoundSearchRecord(
            id: "sucrose",
            title: "Sucrose",
            subtitle: "Table sugar",
            body: "Disaccharide reference compound for carbohydrate and formula search examples.",
            domain: "Carbohydrate",
            family: "Disaccharide",
            risk: "standard",
            formula: "C12H22O11",
            tags: ["sugar", "carbohydrate", "disaccharide"],
            href: "/pages/record.html?type=compound&id=sucrose"
        ),
        CompoundSearchRecord(
            id: "citric-acid",
            title: "Citric acid",
            subtitle: "2-hydroxypropane-1,2,3-tricarboxylic acid",
            body: "Tricarboxylic acid reference for food chemistry, buffers and metabolic context.",
            domain: "Organic acid",
            family: "Carboxylic acid",
            risk: "standard",
            formula: "C6H8O7",
            tags: ["acid", "carboxylic acid", "buffer"],
            href: "/pages/record.html?type=compound&id=citric-acid"
        ),
        CompoundSearchRecord(
            id: "dopamine",
            title: "Dopamine",
            subtitle: "Catecholamine",
            body: "Biogenic amine reference for catechol, amine and neuroscience-adjacent compound lookup.",
            domain: "Biomolecule",
            family: "Catecholamine",
            risk: "standard",
            formula: "C8H11NO2",
            tags: ["amine", "catechol", "biomolecule"],
            href: "/pages/record.html?type=compound&id=dopamine"
        ),
        CompoundSearchRecord(
            id: "cholesterol",
            title: "Cholesterol",
            subtitle: "Sterol lipid",
            body: "Sterol reference compound for lipid, biomolecule and formula lookup.",
            domain: "Lipid",
            family: "Sterol",
            risk: "standard",
            formula: "C27H46O",
            tags: ["lipid", "sterol", "biomolecule"],
            href: "/pages/record.html?type=compound&id=cholesterol"
        )
    ]

    static let featured: [CompoundSearchRecord] = Array(catalog.prefix(7))

    static func localMatches(for query: String) -> [CompoundSearchRecord] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !term.isEmpty else { return featured }
        let matches = catalog.filter { $0.searchText.contains(term) }
        return Array(matches.prefix(24))
    }
}
