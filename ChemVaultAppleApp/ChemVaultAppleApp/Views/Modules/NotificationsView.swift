import SwiftUI

struct NotificationsView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission

    private let notifications = [
        ("Extraction job prepared", "Paper-to-database placeholder task is ready.", true),
        ("Files service reserved", "Secure file infrastructure API can be connected later.", false),
        ("Documentation sync planned", "Native docs can sync Markdown records in a future build.", false)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PageHeader(module: .notifications, permission: permission)
                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("notifications.all"))
                            .font(.title3.weight(.semibold))
                        ForEach(notifications, id: \.0) { item in
                            HStack(alignment: .top, spacing: 12) {
                                Circle()
                                    .fill(item.2 ? Color.cyan : Color.secondary.opacity(0.25))
                                    .frame(width: 10, height: 10)
                                    .padding(.top, 7)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.0)
                                        .font(.headline)
                                    Text(item.1)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if item.2 {
                                    Text(languageManager.text("notifications.unread"))
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(.cyan)
                                }
                            }
                            .padding(.vertical, 8)
                        }
                    }
                }
            }
            .padding()
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.notifications.title"))
    }
}
