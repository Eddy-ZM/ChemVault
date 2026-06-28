# ChemVault Apple App

ChemVault Apple App is a native SwiftUI implementation of the ChemVault product system for iOS, iPadOS and macOS.

This project intentionally does not use WebView, WKWebView, UIWebView, local HTML bundles, iframes or chemvault.science as the primary interface. The website information architecture has been translated into native SwiftUI modules.

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

## Current MVP placeholders

These modules are native SwiftUI pages, but production backends are not connected yet:

- Molecular modelling preview
- Scientific file storage
- Documentation sync
- AI scientific data extraction jobs
- ChemVault Mail
- User center and permissions
- Notifications

## Future ChemVault API integration

`APIClient.swift` already reserves these endpoints:

- `/api/user/me`
- `/api/files`
- `/api/docs`
- `/api/model`
- `/api/extract/jobs`
- `/api/notifications`
- `/api/permissions`

Replace demo data in module views with `APIClient` calls when the backend contracts are stable.

## Why this is not a web shell

The app uses SwiftUI views, models, services and native Apple navigation. It does not load website build output, does not package HTML/CSS/JavaScript, and does not display chemvault.science inside an embedded browser.

## Troubleshooting

### Blank screen

Confirm the selected scheme is `ChemVault iOS` or `ChemVault macOS`, then clean build folder in Xcode.

### Region detection fails

The app defaults to English. Open Settings and select 中文 manually if needed.

### Chinese users do not enter Chinese mode

Open Settings, tap Refresh Region, or manually choose 中文. Some VPNs, private relays or institutional networks may report a non-CN country code.

### API data does not appear

The first MVP uses demo data. Production data requires connecting the reserved endpoints in `APIClient.swift`.

### App Store readiness

Before submission, add final app icons, privacy details, support URL, marketing screenshots, production API endpoints and final signing settings.
