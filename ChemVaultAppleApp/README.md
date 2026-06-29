# ChemVault Apple App

ChemVault Apple App is a native SwiftUI compound-search product for iOS, iPadOS and macOS.

This project intentionally does not use WebView, WKWebView, UIWebView, local HTML bundles, iframes or chemvault.science as the primary interface. Compound search is the main app workflow, with documentation, files and extraction presented as compact supporting tools.

## Project structure

- `ChemVaultAppleApp.xcodeproj`: Xcode project with iOS/iPadOS and macOS targets.
- `ChemVaultAppleApp/App`: app entry point.
- `ChemVaultAppleApp/Core`: language, region and configuration models.
- `ChemVaultAppleApp/Services`: region detection, language management and API client.
- `ChemVaultAppleApp/Models`: modules, navigation, permissions and demo user state.
- `ChemVaultAppleApp/Views`: SwiftUI screens, navigation and reusable components.
- `ChemVaultAppleApp/Resources`: asset catalog and app resources.

## How to open

Open `ChemVaultAppleApp.xcodeproj` in Xcode.

Keep the whole `ChemVaultAppleApp` directory inside the Git repository so Xcode Cloud can check out the project, shared schemes and app resources from GitHub.

## Run iOS

1. Open the project in Xcode.
2. Select the `ChemVault iOS` scheme.
3. Choose an iPhone simulator.
4. Press Run.

## Run iPadOS

1. Select the `ChemVault iOS` scheme.
2. Choose an iPad simulator.
3. Press Run.

The app automatically switches from compact tab navigation to split navigation on larger screens.

## Run macOS

1. Select the `ChemVault macOS` scheme.
2. Choose `My Mac`.
3. Press Run.

The macOS target uses native SwiftUI sidebar navigation and a default desktop window size.

## Bundle identifier

The current bundle identifier is:

`science.chemvault.app`

To change it, open target settings in Xcode and edit `Signing & Capabilities > Bundle Identifier` for both targets.

## Apple Developer Team

In Xcode:

1. Open project settings.
2. Select each target.
3. Open `Signing & Capabilities`.
4. Choose your Apple Developer Team.
5. Keep automatic signing enabled unless you need manual profiles.

## TestFlight submission

1. Set production bundle identifiers.
2. Add production app icons in `Assets.xcassets`.
3. Configure signing for iOS.
4. Select `Any iOS Device`.
5. Use `Product > Archive`.
6. Validate the archive.
7. Upload to App Store Connect.
8. Add testers in TestFlight.

## Language detection

At launch, `RegionDetector` calls public HTTPS IP country-code APIs with short timeouts. If the country code is `CN`, the app activates Simplified Chinese. Otherwise it activates English. If detection fails, English is used.

The detected region is cached for 24 hours in `UserDefaults`.

## Manual language switch

Open `Settings > Language` and select:

- Auto
- English
- 中文

Manual selection overrides automatic IP detection and is persisted locally.

## App features

- Compound search by common name, synonym, formula, identifier or SMILES.
- Built-in compound catalog for reliable results when live API enrichment is unavailable.
- Live ChemVault record lookup when the production API returns structured records.
- Record detail panel with formula, domain, type, summary, tags and external record link.
- Native iPhone/iPad tab navigation and macOS sidebar navigation.
- Compact supporting areas for documentation, research files, scientific extraction, settings and account state.
- Automatic language selection with manual language override.

## ChemVault API integration

The compound search screen calls `/api/records` for live enrichment and falls back to the built-in compound catalog if the endpoint returns no usable JSON, no matching records or a transient network failure.

The app also reserves these supporting endpoints for production modules:

- `/api/user/me`
- `/api/files`
- `/api/docs`
- `/api/model`
- `/api/extract/jobs`
- `/api/notifications`
- `/api/permissions`

Supporting modules should stay secondary to compound lookup unless their backend contracts are ready for production.

## Why this is not a web shell

The app uses SwiftUI views, models, services and native Apple navigation. It does not load website build output, does not package HTML/CSS/JavaScript, and does not display chemvault.science inside an embedded browser.

## Troubleshooting

### Blank screen

Confirm the selected scheme is `ChemVault iOS` or `ChemVault macOS`, then clean build folder in Xcode.

### Region detection fails

The app defaults to English. Open Settings and select 中文 manually if needed.

### Chinese users do not enter Chinese mode

Open Settings, tap Refresh Region, or manually choose 中文. Some VPNs, private relays or institutional networks may report a non-CN country code.

### Live compound data does not appear

The search screen still returns built-in compound results. Check Cloudflare/API rules, `/api/records` JSON shape and App Store network access if live enrichment is missing.

### App Store readiness

Before submission, confirm final app icons, privacy details, support URL, marketing screenshots, production API behavior and signing settings.
