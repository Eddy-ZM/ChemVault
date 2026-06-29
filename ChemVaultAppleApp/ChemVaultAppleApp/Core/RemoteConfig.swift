import Foundation
import Combine

struct RemoteAppConfig: Codable, Equatable {
    let maintenanceMode: Bool
    let enabledModules: [ChemVaultModule]
    let minimumSupportedVersion: String
    let resourceBundleVersion: String
    let announcementMessage: String

    static let fallback = RemoteAppConfig(
        maintenanceMode: false,
        enabledModules: [.model, .docs, .files, .extract],
        minimumSupportedVersion: "1.0.0",
        resourceBundleVersion: "2026.06.28",
        announcementMessage: ""
    )

    var enabledModuleIDs: [String] {
        enabledModules.map(\.remoteIdentifier).sorted()
    }

    func isModuleEnabled(_ module: ChemVaultModule) -> Bool {
        switch module {
        case .home, .model, .settings:
            return true
        default:
            return enabledModules.contains(module)
        }
    }

    func supportsCurrentAppVersion(_ currentVersion: String = AppConfig.version) -> Bool {
        currentVersion.compare(minimumSupportedVersion, options: .numeric) != .orderedAscending
    }

    init(
        maintenanceMode: Bool,
        enabledModules: [ChemVaultModule],
        minimumSupportedVersion: String,
        resourceBundleVersion: String,
        announcementMessage: String
    ) {
        self.maintenanceMode = maintenanceMode
        self.enabledModules = enabledModules
        self.minimumSupportedVersion = minimumSupportedVersion
        self.resourceBundleVersion = resourceBundleVersion
        self.announcementMessage = announcementMessage
    }

    private enum CodingKeys: String, CodingKey {
        case maintenanceMode
        case enabledModules
        case minimumSupportedVersion
        case resourceBundleVersion
        case announcementMessage
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let fallback = Self.fallback

        maintenanceMode = try container.decodeIfPresent(Bool.self, forKey: .maintenanceMode) ?? fallback.maintenanceMode

        let moduleIdentifiers = try container.decodeIfPresent([String].self, forKey: .enabledModules)
            ?? fallback.enabledModules.map(\.remoteIdentifier)
        let decodedModules = moduleIdentifiers.compactMap(ChemVaultModule.init(remoteIdentifier:))
        enabledModules = decodedModules.isEmpty ? fallback.enabledModules : decodedModules

        minimumSupportedVersion = try container.decodeIfPresent(String.self, forKey: .minimumSupportedVersion)
            ?? fallback.minimumSupportedVersion
        resourceBundleVersion = try container.decodeIfPresent(String.self, forKey: .resourceBundleVersion)
            ?? fallback.resourceBundleVersion
        announcementMessage = try container.decodeIfPresent(String.self, forKey: .announcementMessage)
            ?? fallback.announcementMessage
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(maintenanceMode, forKey: .maintenanceMode)
        try container.encode(enabledModules.map(\.remoteIdentifier), forKey: .enabledModules)
        try container.encode(minimumSupportedVersion, forKey: .minimumSupportedVersion)
        try container.encode(resourceBundleVersion, forKey: .resourceBundleVersion)
        try container.encode(announcementMessage, forKey: .announcementMessage)
    }
}

@MainActor
final class RemoteConfigStore: ObservableObject {
    enum LoadState: Equatable {
        case idle
        case loading
        case loaded
        case failed(String)
    }

    @Published private(set) var config: RemoteAppConfig = .fallback
    @Published private(set) var loadState: LoadState = .idle

    private let configURL: URL
    private let session: URLSession
    private var didLoad = false

    init(configURL: URL = AppConfig.remoteConfigURL) {
        self.configURL = configURL
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = AppConfig.networkTimeout
        configuration.timeoutIntervalForResource = AppConfig.networkTimeout + 1
        self.session = URLSession(configuration: configuration)
    }

    func load() async {
        guard !didLoad else { return }
        didLoad = true
        await refresh()
    }

    func refresh() async {
        loadState = .loading

        do {
            var request = URLRequest(url: configURL)
            request.httpMethod = "GET"
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200..<300).contains(httpResponse.statusCode) else {
                throw RemoteConfigError.invalidResponse
            }

            config = try JSONDecoder().decode(RemoteAppConfig.self, from: data)
            loadState = .loaded
        } catch {
            config = .fallback
            loadState = .failed(error.localizedDescription)
        }
    }

    func isModuleEnabled(_ module: ChemVaultModule) -> Bool {
        config.isModuleEnabled(module)
    }

    var visibleSidebarModules: [ChemVaultModule] {
        ChemVaultModule.sidebarModules.filter(config.isModuleEnabled)
    }

    var visibleFeatureModules: [ChemVaultModule] {
        ChemVaultModule.featureModules.filter(config.isModuleEnabled)
    }
}

private enum RemoteConfigError: LocalizedError {
    case invalidResponse

    var errorDescription: String? {
        "Remote config returned an invalid response."
    }
}

extension ChemVaultModule {
    var remoteIdentifier: String {
        switch self {
        case .files:
            return "file"
        case .userCenter:
            return "user"
        case .notifications:
            return "notifications"
        default:
            return rawValue
        }
    }

    init?(remoteIdentifier: String) {
        switch remoteIdentifier.lowercased() {
        case "file", "files":
            self = .files
        case "user", "usercenter", "user_center", "account":
            self = .userCenter
        case "notification", "notifications":
            self = .notifications
        default:
            self.init(rawValue: remoteIdentifier)
        }
    }
}
