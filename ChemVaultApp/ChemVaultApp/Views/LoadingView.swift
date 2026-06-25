import SwiftUI

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 18) {
            Text("ChemVault")
                .font(.system(size: 36, weight: .bold, design: .rounded))
            ProgressView()
                .controlSize(.large)
            Text("Loading ChemVault...")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.regularMaterial)
    }
}
