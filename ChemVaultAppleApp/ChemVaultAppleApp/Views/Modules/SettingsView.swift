import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var languageManager: LanguageManager
    @EnvironmentObject private var remoteConfigStore: RemoteConfigStore
    @AppStorage("appearancePreference") private var appearanceRawValue = AppearancePreference.system.rawValue
    @AppStorage("apiBaseURL") private var apiBaseURL = AppConfig.defaultAPIBaseURL.absoluteString

    private var appearanceBinding: Binding<AppearancePreference> {
        Binding {
            AppearancePreference(rawValue: appearanceRawValue) ?? .system
        } set: { newValue in
            appearanceRawValue = newValue.rawValue
        }
    }

    var body: some View {
        Form {
            Section(languageManager.text("settings.language")) {
                Picker(languageManager.text("settings.language"), selection: Binding(
                    get: { languageManager.preference },
                    set: { languageManager.setPreference($0) }
                )) {
                    ForEach(LanguagePreference.allCases) { preference in
                        Text(preference.displayName(activeLanguage: languageManager.activeLanguage)).tag(preference)
                    }
                }
                Text(languageManager.lastDetectionSummary)
                    .foregroundStyle(.secondary)
                Button(languageManager.text("settings.refreshRegion")) {
                    Task { await languageManager.refreshRegion() }
                }
            }

            Section(languageManager.text("settings.appearance")) {
                Picker(languageManager.text("settings.appearance"), selection: appearanceBinding) {
                    Text(languageManager.text("settings.appearanceSystem")).tag(AppearancePreference.system)
                    Text(languageManager.text("settings.appearanceLight")).tag(AppearancePreference.light)
                    Text(languageManager.text("settings.appearanceDark")).tag(AppearancePreference.dark)
                }
                .pickerStyle(.segmented)
            }

            Section(languageManager.text("settings.api")) {
                TextField(languageManager.text("settings.api"), text: $apiBaseURL)
                    .textFieldStyle(.roundedBorder)
            }

            Section("App services") {
                LabeledContent("Content bundle", value: remoteConfigStore.config.resourceBundleVersion)
                LabeledContent("Minimum app version", value: remoteConfigStore.config.minimumSupportedVersion)
                LabeledContent("Available areas", value: remoteConfigStore.config.enabledModuleIDs.joined(separator: ", "))
                Button("Refresh app services") {
                    Task { await remoteConfigStore.refresh() }
                }
            }

            Section(languageManager.text("settings.about")) {
                Text(languageManager.text("settings.about.body"))
                LabeledContent(languageManager.text("common.version"), value: AppConfig.version)
            }

            Section(languageManager.text("settings.privacy")) {
                Text(languageManager.text("settings.privacy.body"))
            }
        }
        .background(ChemVaultSurface())
        .navigationTitle(languageManager.text("module.settings.title"))
    }
}
