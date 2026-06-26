import SwiftUI

@main
struct ChemVaultApp: App {
    @StateObject private var languageManager = LanguageManager()
    @AppStorage("appearancePreference") private var appearanceRawValue = AppearancePreference.system.rawValue

    private var preferredScheme: ColorScheme? {
        AppearancePreference(rawValue: appearanceRawValue)?.colorScheme
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(languageManager)
                .preferredColorScheme(preferredScheme)
                .task {
                    await languageManager.bootstrap()
                }
        }
        #if os(macOS)
        .defaultSize(width: 1160, height: 760)
        #endif
    }
}
