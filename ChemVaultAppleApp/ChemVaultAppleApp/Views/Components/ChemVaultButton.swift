import SwiftUI

struct ChemVaultButton: View {
    enum Style {
        case primary
        case secondary
    }

    let title: String
    let systemImage: String?
    var style: Style = .primary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label {
                Text(title)
                    .font(.headline)
            } icon: {
                if let systemImage {
                    Image(systemName: systemImage)
                }
            }
            .labelStyle(.titleAndIcon)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .padding(.horizontal, 16)
        }
        .buttonStyle(.plain)
        .foregroundStyle(style == .primary ? Color.black : Color.primary)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(style == .primary ? Color.cyan : Color.primary.opacity(0.06))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.primary.opacity(style == .primary ? 0 : 0.12), lineWidth: 1)
        )
    }
}
