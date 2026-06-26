import Foundation

public enum AppLanguage: String, CaseIterable, Identifiable, Codable, Hashable {
    case english = "en"
    case simplifiedChinese = "zh-Hans"

    public var id: String { rawValue }
}

public enum LanguagePreference: String, CaseIterable, Identifiable, Codable, Hashable {
    case automatic
    case english
    case simplifiedChinese

    public var id: String { rawValue }

    func displayName(activeLanguage: AppLanguage) -> String {
        switch self {
        case .automatic:
            return activeLanguage == .simplifiedChinese ? "自动" : "Auto"
        case .english:
            return "English"
        case .simplifiedChinese:
            return "中文"
        }
    }
}
