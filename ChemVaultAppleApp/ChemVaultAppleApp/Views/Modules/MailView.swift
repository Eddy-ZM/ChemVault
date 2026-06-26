import SwiftUI

struct MailView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    let permission: UserPermission
    private let mailboxes = ["Inbox", "Sent", "Drafts", "Project settings"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PageHeader(module: .mail, permission: permission)
                ChemVaultCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(languageManager.text("mail.mailboxes"))
                            .font(.title3.weight(.semibold))
                        ForEach(mailboxes, id: \.self) { mailbox in
                            HStack {
                                Image(systemName: "tray")
                                    .foregroundStyle(.cyan)
                                Text(mailbox)
                                Spacer()
                                Text(permission.status(for: .mail).title(language: languageManager.activeLanguage))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 8)
                        }
                        Text(languageManager.text("mail.placeholder"))
                            .foregroundStyle(.secondary)
                            .padding(.top, 8)
                    }
                }
            }
            .padding()
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity)
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.mail.title"))
    }
}
