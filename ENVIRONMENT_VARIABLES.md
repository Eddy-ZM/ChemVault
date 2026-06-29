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
| `CHEMVAULT_SITE_ORIGIN` | Optional | Public site origin used by sitemap generation. Defaults to `https://chemvault.science`. |

## Commercial MVP / Payments

| Variable | Required | Purpose |
| --- | --- | --- |
| `PUBLIC_APP_URL` | Optional now, required for live checkout | Public application URL used by future payment redirects. |
| `ENVIRONMENT` | Required for staging/production | Deployment environment: `development`, `staging`, or `production`. Production disables mock auth and mock billing. |
| `COMMERCIAL_MODE` | Required for staging/production | Commercial safety mode: `mock`, `staging`, or `production`. Production mode disables placeholder entitlement elevation and fake checkout. |
| `ENABLE_MOCK_BILLING` | Local/staging only | Enables placeholder checkout/portal responses outside production. Set `false` in production. |
| `ENABLE_MOCK_AUTH` | Local/staging only | Enables `DEFAULT_USER_PLAN` and placeholder admin token outside production. Set `false` in production. |
| `PAYMENT_PROVIDER` | Optional | Payment provider selector. Empty value keeps checkout in placeholder mode. |
| `STRIPE_SECRET_KEY` | Required only for live Stripe | Stripe server secret key. Never expose it to browser JavaScript. |
| `STRIPE_WEBHOOK_SECRET` | Required only for live Stripe webhooks | Stripe webhook signing secret. |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Required only for live Stripe Pro monthly | Stripe price id for Pro monthly checkout. |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Required only for live Stripe Pro yearly | Stripe price id for Pro yearly checkout. |
| `STRIPE_TEAM_MONTHLY_PRICE_ID` | Required only for live Stripe Team monthly | Stripe price id for Team/Lab monthly checkout. |
| `STRIPE_TEAM_YEARLY_PRICE_ID` | Required only for live Stripe Team yearly | Stripe price id for Team/Lab yearly checkout. |
| `ENTERPRISE_LEAD_EMAIL` | Optional | Destination used by a future lead-notification integration. Current MVP stores leads in D1 when available. |
| `NEWSLETTER_PROVIDER` | Optional | Newsletter provider selector for future integration. Current MVP uses `/api/leads`. |
| `DEFAULT_USER_PLAN` | Optional local/staging only | Server-side placeholder plan. Defaults to `free`. Do not use this as production subscription logic. |
| `CHEMVAULT_ADMIN_TOKEN` | Optional local/staging only | Bearer token that maps API requests to `admin` for protected placeholder routes. Store only as a Cloudflare secret. |

Production safety rules:

- `ENVIRONMENT=production` or `COMMERCIAL_MODE=production` disables mock billing and mock auth in `functions/api/[[path]].js`.
- In production, `DEFAULT_USER_PLAN` cannot grant Pro, Team, Enterprise or Admin access.
- If no live payment provider is implemented, checkout and billing portal endpoints return `payment_not_configured` or `*_not_implemented` instead of a fake success.
- Payment secrets must be configured only as Cloudflare environment variables/secrets, never in browser scripts or committed files.

The current native Apple app build does not require these variables to compile. Signing and TestFlight distribution should use Xcode Cloud's built-in Apple account integration.
