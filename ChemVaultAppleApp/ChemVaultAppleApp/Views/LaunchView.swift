import SwiftUI
#if os(iOS)
import UIKit
typealias PlatformColor = UIColor
#elseif os(macOS)
import AppKit
typealias PlatformColor = NSColor
#endif

struct LaunchView: View {
    @EnvironmentObject private var languageManager: LanguageManager

    var body: some View {
        ZStack {
            ChemVaultSurface()
            VStack(spacing: 22) {
                ChemVaultLogoMark(size: 72)
                LoadingStateView(
                    title: languageManager.text("app.loading"),
                    message: languageManager.text("app.loading.detail")
                )
            }
            .padding()
        }
    }
}

struct ChemVaultSurface: View {
    var body: some View {
        LinearGradient(
            colors: [Color.cyan.opacity(0.16), Color.blue.opacity(0.08), Color.clear],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .background(Color(PlatformColor.systemBackgroundCompat))
        .ignoresSafeArea()
    }
}

private extension PlatformColor {
    static var systemBackgroundCompat: PlatformColor {
        #if os(iOS)
        return .systemBackground
        #elseif os(macOS)
        return .windowBackgroundColor
        #endif
    }
}
