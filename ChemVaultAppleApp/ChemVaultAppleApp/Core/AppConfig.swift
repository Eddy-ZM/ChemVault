import Foundation
import SwiftUI

public enum AppConfig {
    public static let bundleIdentifier = "science.chemvault.app"
    public static let appName = "ChemVault"
    public static let version = "1.0.0"
    public static let defaultAPIBaseURL = URL(string: "https://chemvault.science")!
    public static let remoteConfigURL = URL(string: "https://api.chemvault.science/app-config.json")!
    public static let regionCacheTTL: TimeInterval = 24 * 60 * 60
    public static let networkTimeout: TimeInterval = 4
}

public enum AppearancePreference: String, CaseIterable, Identifiable, Codable {
    case system
    case light
    case dark

    public var id: String { rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .system:
            return nil
        case .light:
            return .light
        case .dark:
            return .dark
        }
    }
}
