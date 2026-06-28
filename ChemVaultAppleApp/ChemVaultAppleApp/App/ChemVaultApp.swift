import SwiftUI

@main
struct ChemVaultApp: App {
    @StateObject private var languageManager = LanguageManager()
    @StateObject private var remoteConfigStore = RemoteConfigStore()
    @AppStorage("appearancePreference") private var appearanceRawValue = AppearancePreference.system.rawValue

    private var preferredScheme: ColorScheme? {
        AppearancePreference(rawValue: appearanceRawValue)?.colorScheme
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(languageManager)
                .environmentObject(remoteConfigStore)
                .preferredColorScheme(preferredScheme)
                .task {
                    await languageManager.bootstrap()
                    await remoteConfigStore.load()
                }
        }
        #if os(macOS)
        .defaultSize(width: 1160, height: 760)
        #endif
    }
}
