import Foundation
import SwiftUI

enum ModuleStatus: String, Codable, Hashable {
    case available
    case locked
    case adminOnly
    case comingSoon

    func title(language: AppLanguage) -> String {
        switch (self, language) {
        case (.available, .simplifiedChinese): return "可用"
        case (.locked, .simplifiedChinese): return "受限"
        case (.adminOnly, .simplifiedChinese): return "管理员"
        case (.comingSoon, .simplifiedChinese): return "规划中"
        case (.available, _): return "Available"
        case (.locked, _): return "Locked"
        case (.adminOnly, _): return "Admin Only"
        case (.comingSoon, _): return "Coming Soon"
        }
    }

    var color: Color {
        switch self {
        case .available: return .cyan
        case .locked: return .orange
        case .adminOnly: return .purple
        case .comingSoon: return .secondary
        }
    }
}

enum ChemVaultModule: String, CaseIterable, Identifiable, Hashable {
    case home
    case model
    case files
    case docs
    case extract
    case mail
    case userCenter
    case notifications
    case settings

    var id: String { rawValue }

    var titleKey: String {
        switch self {
        case .home: return "module.home.title"
        case .model: return "module.model.title"
        case .files: return "module.files.title"
        case .docs: return "module.docs.title"
        case .extract: return "module.extract.title"
        case .mail: return "module.mail.title"
        case .userCenter: return "module.user.title"
        case .notifications: return "module.notifications.title"
        case .settings: return "module.settings.title"
        }
    }

    var descriptionKey: String {
        switch self {
        case .home: return "module.home.description"
        case .model: return "module.model.description"
        case .files: return "module.files.description"
        case .docs: return "module.docs.description"
        case .extract: return "module.extract.description"
        case .mail: return "module.mail.description"
        case .userCenter: return "module.user.description"
        case .notifications: return "module.notifications.description"
        case .settings: return "module.settings.description"
        }
    }

    var symbolName: String {
        switch self {
        case .home: return "hexagon"
        case .model: return "atom"
        case .files: return "folder"
        case .docs: return "doc.text"
        case .extract: return "sparkles.rectangle.stack"
        case .mail: return "envelope"
        case .userCenter: return "person.crop.circle.badge.checkmark"
        case .notifications: return "bell.badge"
        case .settings: return "gearshape"
        }
    }

    static let sidebarModules: [ChemVaultModule] = [.home, .model, .files, .docs, .extract, .mail, .userCenter, .notifications, .settings]
    static let featureModules: [ChemVaultModule] = [.model, .files, .docs, .extract, .mail, .userCenter, .notifications, .settings]
}
