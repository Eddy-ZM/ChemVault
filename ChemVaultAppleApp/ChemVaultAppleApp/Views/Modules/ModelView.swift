import Foundation
import SwiftUI

struct ModelView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    @StateObject private var searchModel = CompoundSearchViewModel()

    private let resultColumns = [
        GridItem(.adaptive(minimum: 260), spacing: 14)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header
                searchPanel
                statusPanel
                resultsSection
                selectedRecordSection
                supportingModules
            }
            .padding()
            .frame(maxWidth: 1120)
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
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 14) {
                    Image(systemName: "magnifyingglass.circle.fill")
                        .font(.system(size: 42, weight: .semibold))
                        .foregroundStyle(.cyan)
                        .frame(width: 58, height: 58)
                        .background(Color.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 18, style: .continuous))

                    VStack(alignment: .leading, spacing: 6) {
                        Text(languageManager.text("compound.hero.title"))
                            .font(.largeTitle.weight(.bold))
                            .fixedSize(horizontal: false, vertical: true)
                        Text(languageManager.text("compound.hero.body"))
                            .foregroundStyle(.secondary)
                            .lineSpacing(3)
                    }
                }

                HStack(spacing: 8) {
                    StatusBadge(status: permission.status(for: .model), language: languageManager.activeLanguage)
                    Text(languageManager.text("compound.hero.badge"))
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
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
                    .font(.title2.weight(.bold))

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
                .padding(14)
                .background(Color.primary.opacity(0.055), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.primary.opacity(0.09), lineWidth: 1))

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
            Label(languageManager.text(searchModel.statusKey), systemImage: searchModel.usesFallback ? "wifi.slash" : "checkmark.seal")
                .font(.callout.weight(.medium))
                .foregroundStyle(searchModel.usesFallback ? Color.orange : Color.cyan)
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
                .font(.title2.weight(.bold))

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
                LazyVGrid(columns: resultColumns, spacing: 14) {
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
                                .font(.headline)
                                .foregroundStyle(.secondary)
                            Text(record.title)
                                .font(.title2.weight(.bold))
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
                    .font(.title3.weight(.bold))
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
                RoundedRectangle(cornerRadius: 24, style: .continuous)
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

@MainActor
private final class CompoundSearchViewModel: ObservableObject {
    @Published var query = "aspirin"
    @Published var smiles = ""
    @Published private(set) var records = CompoundSearchRecord.featured
    @Published private(set) var selectedRecord: CompoundSearchRecord? = CompoundSearchRecord.featured.first
    @Published private(set) var isLoading = false
    @Published private(set) var usesFallback = true
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
        errorKey = nil

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
            records = remoteRecords.isEmpty ? CompoundSearchRecord.localMatches(for: term) : remoteRecords
            selectedRecord = records.first
            usesFallback = response.source != "d1" || remoteRecords.isEmpty
            statusKey = usesFallback ? "compound.status.local" : "compound.status.live"
            if remoteRecords.isEmpty {
                errorKey = "compound.error.localSuggestions"
            }
        } catch {
            records = CompoundSearchRecord.localMatches(for: term)
            selectedRecord = records.first
            usesFallback = true
            statusKey = "compound.status.offline"
            errorKey = "compound.error.offline"
        }

        isLoading = false
    }

    func resetToFeatured() {
        query = ""
        smiles = ""
        records = CompoundSearchRecord.featured
        selectedRecord = records.first
        usesFallback = true
        statusKey = "compound.status.featured"
        errorKey = nil
    }

    func select(_ record: CompoundSearchRecord) {
        selectedRecord = record
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

    static let featured: [CompoundSearchRecord] = [
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
        )
    ]

    static func localMatches(for query: String) -> [CompoundSearchRecord] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !term.isEmpty else { return featured }
        let matches = featured.filter { $0.searchText.contains(term) }
        return matches.isEmpty ? [] : matches
    }
}
