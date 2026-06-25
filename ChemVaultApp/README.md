# ChemVault Apple App

ChemVault is a SwiftUI + WebKit Apple native app wrapper for the ChemVault website system. It supports iOS, iPadOS and macOS with local bundled web resources.

## Project layout

```text
ChemVaultApp/
  ChemVaultApp.xcodeproj
  ChemVaultApp/
    App/
    Views/
    Services/
    Web/
    Resources/Web/en/
    Resources/Web/zh/
    Config/
    Models/
  scripts/build-web-bundles.sh
```

## Source websites

Chinese site:

```text
/Users/edwardmu/ChemVault_suite/zh-ChemVault
```

International site:

```text
/Users/edwardmu/ChemVault_suite/chemvault
```

Both current sites are static HTML/JavaScript projects using `npm run build` and outputting to `dist`.

## How region selection works

On startup, the app runs `RegionDetector`:

1. It checks a cached result in `UserDefaults`.
2. Cache expires after 24 hours.
3. If cache is missing or expired, it tries multiple HTTPS providers:
   - Cloudflare trace
   - ipapi.co
   - ipwho.is
   - ipinfo.io
4. If the country code is `CN`, the app loads `Resources/Web/zh/index.html`.
5. Otherwise it loads `Resources/Web/en/index.html`.
6. If all detection requests fail, it defaults to the international English bundle.

## Build web bundles

From this directory:

```bash
./scripts/build-web-bundles.sh
```

Optional custom paths:

```bash
ZH_SITE=/path/to/zh-ChemVault EN_SITE=/path/to/chemvault ./scripts/build-web-bundles.sh
```

The script:

1. Enters the Chinese website directory.
2. Runs `npm install` and `npm run build` when available.
3. Detects `dist`, `build`, `out`, or static `index.html`.
4. Copies the result into `ChemVaultApp/Resources/Web/zh`.
5. Repeats the same for the international site into `ChemVaultApp/Resources/Web/en`.

## Open in Xcode

Open:

```text
ChemVaultApp.xcodeproj
```

Targets:

- `ChemVault iOS` for iPhone and iPad.
- `ChemVault macOS` for macOS.

## Run iOS / iPadOS

1. Open `ChemVaultApp.xcodeproj`.
2. Select target `ChemVault iOS`.
3. Choose an iPhone or iPad simulator.
4. Press Run.

The iOS target supports iPhone and iPad, portrait and landscape.

## Run macOS

1. Open `ChemVaultApp.xcodeproj`.
2. Select target `ChemVault macOS`.
3. Choose `My Mac`.
4. Press Run.

The macOS window has a default size of 1280 × 820 and minimum size of 960 × 640.

## Bundle Identifier

The initial bundle identifier is:

```text
science.chemvault.app
```

Change it in Xcode:

1. Select the project.
2. Select each target.
3. Open Signing & Capabilities.
4. Update Bundle Identifier.
5. Select your Apple Developer Team.

## App Transport Security

All IP region APIs use HTTPS. The project uses generated Info.plist files and does not require `NSAllowsArbitraryLoads`.

## External links

The app loads local file URLs in WKWebView. Internal ChemVault hosts stay inside the app. External links such as GitHub, OpenAI and Cloudflare open in the system browser.

Internal hosts are configured in:

```text
ChemVaultApp/Config/AppConfig.swift
```

## TestFlight preparation

1. Confirm both web bundles are current:

```bash
./scripts/build-web-bundles.sh
```

2. Open Xcode.
3. Select the correct target.
4. Set the signing team and production bundle identifier.
5. Choose `Any iOS Device` or `Any Mac`.
6. Product → Archive.
7. Validate the archive.
8. Upload to App Store Connect.
9. Add TestFlight metadata and testers.

## Common issues

### White screen

Usually caused by missing bundled resources. Run:

```bash
./scripts/build-web-bundles.sh
```

Then clean and rebuild in Xcode.

### Local resources not found

The app expects:

```text
Resources/Web/zh/index.html
Resources/Web/en/index.html
```

If either file is missing, `ErrorView` will show:

```text
ChemVault resources are missing. Please rebuild the web bundle.
```

### CSS / JS / images do not load

Make sure the entire build output directory is copied, not just `index.html`. The app uses `loadFileURL(_:allowingReadAccessTo:)` with read access to the selected language directory.

### IP detection fails

The app defaults to English if detection fails. Check device network access and the provider URLs in `RegionDetector.swift`.

### China mainland users do not enter Chinese version

Check:

1. The IP provider returns country code `CN`.
2. Cached result in UserDefaults is not stale or incorrect.
3. `Resources/Web/zh/index.html` exists.
4. The device is not using a VPN or proxy outside mainland China.

To force refresh during development, delete the app from the simulator/device and reinstall.

## Notes

This project is a native SwiftUI shell with local web bundles. It is structured for later App Store/TestFlight work, but you still need Apple Developer signing, app icons, privacy nutrition labels and App Store metadata before release.

## Local file path normalization

The source websites use some root-relative paths such as `/assets/...` and `/scripts/...`. Those work on Cloudflare but not directly under `file://` inside WKWebView. The build script runs:

```bash
node scripts/normalize-web-bundle.mjs ChemVaultApp/Resources/Web/en
node scripts/normalize-web-bundle.mjs ChemVaultApp/Resources/Web/zh
```

This converts local root-relative asset links in copied bundle files into relative paths. It does not modify the source websites.
