# Apple release checklist

## Repository proof

- `ChemVaultAppleApp.xcodeproj` and both shared schemes are committed.
- iOS/iPadOS and macOS unsigned CI builds pass.
- Bundle identifier is `science.chemvault.app`.
- Marketing version and build number are incremented together.
- App icons, privacy policy, support URL, account deletion, and data export links are current.
- No Apple private keys, signing certificates, provisioning profiles, or environment secrets are tracked.

## Apple-account proof

- Team `96L6379Q92` owns the bundle identifier.
- Automatic signing resolves for both targets.
- The App Store Connect record includes the required platforms.
- App privacy, export compliance, age rating, screenshots, and review notes are complete.
- Archive validation succeeds and the build is processed in TestFlight.

The second section must be completed from macOS with an authorized Apple Developer/App Store Connect account.
