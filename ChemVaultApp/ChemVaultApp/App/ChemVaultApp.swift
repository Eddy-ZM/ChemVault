import SwiftUI

@main
struct ChemVaultApp: App {
    var body: some Scene {
        #if os(macOS)
        WindowGroup {
            RootView()
                .frame(minWidth: 960, minHeight: 640)
        }
        .defaultSize(width: 1280, height: 820)
        #else
        WindowGroup {
            RootView()
        }
        #endif
    }
}
