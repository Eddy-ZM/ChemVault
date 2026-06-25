import Foundation

struct AppConfig {
    static let appName = "ChemVault"
    static let bundleIdentifier = "science.chemvault.app"
    static let regionCacheTTL: TimeInterval = 24 * 60 * 60
    static let regionRequestTimeout: TimeInterval = 4
    static let internalHosts: Set<String> = [
        "chemvault.science",
        "www.chemvault.science",
        "chemvault.pages.dev",
        "chemvault-zh.pages.dev"
    ]
}
