# Xcode Cloud Setup

This repository contains a native SwiftUI Apple app at:

`ChemVaultAppleApp/ChemVaultAppleApp.xcodeproj`

Use the shared scheme `ChemVault iOS` for iPhone/iPad TestFlight builds and `ChemVault macOS` for Mac builds. The project does not use WebView, WKWebView, UIWebView, local HTML bundles or the website as the primary interface.

## Before Enabling Xcode Cloud

Confirm these items in Apple Developer and App Store Connect:

- The App Store Connect app already exists.
- The Bundle ID is `science.chemvault.app`.
- The Bundle ID in App Store Connect matches the Xcode target Bundle Identifier.
- For macOS workflows, the App Store Connect app record must include the macOS platform for the same Bundle ID before Xcode Cloud reaches Prepare App Store Connect.
- The Apple Developer Team is `96L6379Q92`.
- Xcode/Apple Developer should show the signing account/name as `Ziwen Mu`.
- The correct Apple Developer Team is selected for the `ChemVault iOS` and `ChemVault macOS` targets.
- Automatically manage signing is enabled.
- TestFlight is available for the app record.
- App privacy, export compliance and required app metadata are ready enough for upload processing.

No App Store Connect API key, signing certificate private key, provisioning profile private material, Cloudflare token or other secret should be committed to GitHub.

## Enable Xcode Cloud

1. Open `ChemVaultAppleApp/ChemVaultAppleApp.xcodeproj` in Xcode.
2. Select the `ChemVault iOS` scheme.
3. Open the Report navigator or Product > Xcode Cloud > Create Workflow.
4. Connect the GitHub repository when prompted.
5. Select the App Store Connect app that uses Bundle ID `science.chemvault.app`.
6. Review Signing & Capabilities for the `ChemVault iOS` target and keep automatic signing enabled.
7. Save the workflow.

## Recommended Workflow

### iOS/iPadOS

- Trigger: push to the `main` branch.
- Environment: latest stable Xcode available in Xcode Cloud.
- Action: Build.
- Archive: enabled.
- Distribution: TestFlight.
- Scheme: `ChemVault iOS`.
- Branch: `main`.

### macOS

- Trigger: push to the `main` branch.
- Environment: latest stable Xcode available in Xcode Cloud.
- Action: Build.
- Archive: enabled.
- Distribution: TestFlight for Mac after the macOS platform is added in App Store Connect.
- Scheme: `ChemVault macOS`.
- Branch: `main`.

The macOS target includes `ChemVaultAppleApp/Resources/ChemVaultMac.entitlements` with App Sandbox and outgoing network access enabled. Keep this file committed so Xcode Cloud can sign the Mac archive consistently.

## First Success Criteria

- A push to GitHub `main` starts an Xcode Cloud build automatically.
- Xcode Cloud checks out the repository and resolves the project without local path dependencies.
- The `ChemVault iOS` scheme builds and archives successfully.
- App Store Connect shows the uploaded build under the ChemVault app.
- TestFlight can install the build on a tester device.

## Troubleshooting

- If signing fails, confirm Apple Developer Team `96L6379Q92`, signing account `Ziwen Mu` and the Bundle ID in Xcode and App Store Connect.
- If the archive cannot upload, confirm the App Store Connect app exists and the Bundle ID exactly matches `science.chemvault.app`.
- If Xcode Cloud shows `Prepare App Store Connect failed` for `ChemVault macOS`, add the macOS platform to the existing App Store Connect app record or select the existing app record that owns Bundle ID `science.chemvault.app`.
- If macOS signing fails, confirm App Sandbox appears in `Signing & Capabilities` and that `ChemVaultMac.entitlements` is used by the macOS target.
- If assets fail validation, open `Assets.xcassets` and confirm the `AppIcon` set is assigned to the target.
- If remote config is unavailable, the app falls back to local defaults and should still launch.
