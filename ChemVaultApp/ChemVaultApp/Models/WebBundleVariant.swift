import Foundation

enum WebBundleVariant: String, Codable, Equatable {
    case chinese = "zh"
    case english = "en"

    var folderName: String { rawValue }
    var displayName: String {
        switch self {
        case .chinese: return "ChemVault Chinese"
        case .english: return "ChemVault International"
        }
    }
}

struct WebResource: Equatable {
    let variant: WebBundleVariant
    let htmlURL: URL
    let readAccessURL: URL
}
