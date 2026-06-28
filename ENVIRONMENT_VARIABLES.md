# Environment Variables

Do not commit real keys, tokens, private keys, certificates or `.env` files. Configure secrets in Xcode Cloud, App Store Connect, Cloudflare or the relevant backend service.

## Apple App

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ENV` | Optional | Build/runtime environment name such as `development`, `staging` or `production`. |
| `API_BASE_URL` | Optional | Overrides the ChemVault API base URL if future build scripts or runtime configuration need it. Current in-app default is `https://api.chemvault.science`. |
| `CLOUDFLARE_API_URL` | Optional | Public Cloudflare/API gateway URL if backend endpoints move behind a different host. |
| `REMOTE_CONFIG_URL` | Optional | Remote app config endpoint if future build settings make `https://api.chemvault.science/app-config.json` configurable. |
| `FIREBASE_CONFIG` | Optional | Firebase client configuration if Firebase is added later. Do not store private service account JSON here. |
| `SENTRY_DSN` | Optional | Sentry DSN for crash/error reporting if Sentry is added later. |

## Xcode Cloud And App Store Connect

| Variable | Required | Purpose |
| --- | --- | --- |
| `CI_XCODEBUILD_ACTION` | Optional | Custom build-script switch if a future Xcode Cloud script needs to branch on build/archive behavior. |
| `APP_STORE_CONNECT_API_KEY_ID` | Usually no | Only needed for custom upload scripts. Prefer Xcode Cloud's built-in TestFlight distribution. |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Usually no | Only needed with a custom App Store Connect API key flow. |
| `APP_STORE_CONNECT_API_KEY` | Usually no | Private key content for custom App Store Connect API usage. Do not commit it; store only in Xcode Cloud secrets if ever needed. |

## Cloudflare / Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | No for Apple app build | Cloudflare deployment token for backend or Pages deployment workflows. Never commit it. |
| `CLOUDFLARE_ACCOUNT_ID` | No for Apple app build | Cloudflare account identifier for backend deployment workflows. |
| `CLOUDFLARE_DATABASE_ID` | No for Apple app build | D1/database identifier for backend deployment workflows. |

The current native Apple app build does not require these variables to compile. Signing and TestFlight distribution should use Xcode Cloud's built-in Apple account integration.
