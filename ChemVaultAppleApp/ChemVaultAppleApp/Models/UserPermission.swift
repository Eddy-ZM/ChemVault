import Foundation

struct UserPermission: Codable, Hashable {
    var canAccessModel: Bool
    var canAccessFiles: Bool
    var canAccessDocs: Bool
    var canAccessExtract: Bool
    var canAccessMail: Bool
    var canAccessUserCenter: Bool
    var canManageUsers: Bool
    var isAdmin: Bool
    var isSuperAdmin: Bool

    static let demo = UserPermission(
        canAccessModel: true,
        canAccessFiles: true,
        canAccessDocs: true,
        canAccessExtract: true,
        canAccessMail: false,
        canAccessUserCenter: true,
        canManageUsers: false,
        isAdmin: false,
        isSuperAdmin: false
    )

    func status(for module: ChemVaultModule) -> ModuleStatus {
        switch module {
        case .home, .settings, .notifications:
            return .available
        case .model:
            return canAccessModel ? .available : .locked
        case .files:
            return canAccessFiles ? .available : .locked
        case .docs:
            return canAccessDocs ? .available : .locked
        case .extract:
            return canAccessExtract ? .available : .locked
        case .mail:
            return canAccessMail ? .available : .comingSoon
        case .userCenter:
            return canAccessUserCenter ? .available : .locked
        }
    }
}

struct MockUser: Identifiable, Hashable {
    let id = UUID()
    let displayName: String
    let role: String
    let institution: String
    let permission: UserPermission

    static let demo = MockUser(
        displayName: "ChemVault Demo User",
        role: "Research workspace member",
        institution: "ChemVault Demo Mode",
        permission: .demo
    )
}
