import SwiftUI

struct ErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("ChemVault")
                .font(.system(size: 32, weight: .bold, design: .rounded))
            Text("ChemVault resources are missing. Please rebuild the web bundle.")
                .font(.headline)
                .multilineTextAlignment(.center)
            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .textSelection(.enabled)
                .padding(.horizontal)
            Button("Try Again", action: retry)
                .buttonStyle(.borderedProminent)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
