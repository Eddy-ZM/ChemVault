import Foundation

public enum AppRegion: String, Codable, Hashable {
    case mainlandChina
    case international
    case unknown

    var countryCode: String {
        switch self {
        case .mainlandChina:
            return "CN"
        case .international:
            return "INTL"
        case .unknown:
            return "UNKNOWN"
        }
    }
}
