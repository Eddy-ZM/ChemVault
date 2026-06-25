import SwiftUI

struct RootView: View {
    private enum LoadState: Equatable {
        case loading
        case ready(WebResource)
        case failed(String)
    }

    @State private var state: LoadState = .loading
    private let bootstrapper = AppBootstrapper()

    var body: some View {
        Group {
            switch state {
            case .loading:
                LoadingView()
            case .ready(let resource):
                WebView(resource: resource)
                    .ignoresSafeArea(.keyboard)
            case .failed(let message):
                ErrorView(message: message) {
                    Task { await load() }
                }
            }
        }
        .task { await load() }
    }

    @MainActor
    private func load() async {
        state = .loading
        do {
            let resource = try await bootstrapper.loadInitialResource()
            state = .ready(resource)
        } catch {
            let message = error.localizedDescription
            print("[ChemVault] Web resource loading failed: \(message)")
            state = .failed(message)
        }
    }
}
