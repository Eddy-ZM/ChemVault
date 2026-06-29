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
                    .font(.callout.weight(.semibold))
            } icon: {
                if let systemImage {
                    Image(systemName: systemImage)
                }
            }
            .labelStyle(.titleAndIcon)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .padding(.horizontal, 12)
        }
        .buttonStyle(.plain)
        .foregroundStyle(style == .primary ? Color.black : Color.primary)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(style == .primary ? Color.cyan : Color.primary.opacity(0.06))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(Color.primary.opacity(style == .primary ? 0 : 0.12), lineWidth: 1)
        )
    }
}
