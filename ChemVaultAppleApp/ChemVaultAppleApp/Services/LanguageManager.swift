import Foundation

@MainActor
final class LanguageManager: ObservableObject {
    @Published private(set) var activeLanguage: AppLanguage = .english
    @Published private(set) var preference: LanguagePreference
    @Published private(set) var region: AppRegion = .unknown
    @Published private(set) var isBootstrapping = true
    @Published private(set) var lastDetectionSummary = "Detecting region"

    private let preferenceKey = "languagePreference"
    private let userDefaults: UserDefaults
    private let regionDetector: RegionDetector
    private var didBootstrap = false

    init(userDefaults: UserDefaults = .standard, regionDetector: RegionDetector = RegionDetector()) {
        self.userDefaults = userDefaults
        self.regionDetector = regionDetector
        if let raw = userDefaults.string(forKey: preferenceKey), let stored = LanguagePreference(rawValue: raw) {
            self.preference = stored
        } else {
            self.preference = .automatic
        }
    }

    func bootstrap() async {
        guard !didBootstrap else { return }
        didBootstrap = true
        isBootstrapping = true
        await resolveLanguage(forceRefresh: false)
        isBootstrapping = false
    }

    func setPreference(_ newPreference: LanguagePreference) {
        preference = newPreference
        userDefaults.set(newPreference.rawValue, forKey: preferenceKey)
        Task {
            await resolveLanguage(forceRefresh: false)
        }
    }

    func refreshRegion() async {
        await resolveLanguage(forceRefresh: true)
    }

    func text(_ key: String) -> String {
        LocalizedStrings.text(key, language: activeLanguage)
    }

    private func resolveLanguage(forceRefresh: Bool) async {
        switch preference {
        case .english:
            activeLanguage = .english
            lastDetectionSummary = text("settings.languageManualEnglish")
        case .simplifiedChinese:
            activeLanguage = .simplifiedChinese
            lastDetectionSummary = text("settings.languageManualChinese")
        case .automatic:
            lastDetectionSummary = LocalizedStrings.text("settings.regionDetecting", language: activeLanguage)
            let detectedRegion = await regionDetector.detectRegion(forceRefresh: forceRefresh)
            region = detectedRegion
            activeLanguage = detectedRegion == .mainlandChina ? .simplifiedChinese : .english
            lastDetectionSummary = detectedRegion == .mainlandChina
                ? LocalizedStrings.text("settings.regionChina", language: activeLanguage)
                : LocalizedStrings.text("settings.regionInternational", language: activeLanguage)
        }
    }
}
