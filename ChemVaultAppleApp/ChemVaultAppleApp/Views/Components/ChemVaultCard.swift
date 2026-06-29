import SwiftUI

struct ChemVaultCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(.thinMaterial)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
    }
}

struct ChemVaultLogoMark: View {
    var size: CGFloat = 48

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: min(size * 0.2, 8), style: .continuous)
                .fill(LinearGradient(colors: [.cyan.opacity(0.95), .blue.opacity(0.75)], startPoint: .topLeading, endPoint: .bottomTrailing))
            Image(systemName: "hexagon")
                .font(.system(size: size * 0.48, weight: .semibold))
                .foregroundStyle(.white)
        }
        .frame(width: size, height: size)
        .shadow(color: .cyan.opacity(0.18), radius: 8, x: 0, y: 4)
    }
}

struct StatusBadge: View {
    let status: ModuleStatus
    let language: AppLanguage

    var body: some View {
        Text(status.title(language: language))
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .foregroundStyle(status.color)
            .background(status.color.opacity(0.12), in: Capsule())
            .overlay(Capsule().stroke(status.color.opacity(0.25), lineWidth: 1))
    }
}
