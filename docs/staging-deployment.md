# ChemVault Staging And Preview Deployment

This document prepares ChemVault for Cloudflare Pages Preview/Staging deployment. Do not use it to deploy production unless production release is explicitly approved.

## Current Cloudflare Configuration

- Static build output: `dist`
- Build command: `npm run build`
- Pages Functions directory: `functions/`
- Commercial API entry: `functions/api/[[path]].js`
- D1 binding name used by code: `DB`
- Current `wrangler.toml` D1 binding name: `DB`

The binding name must stay `DB` in every environment. The database behind that binding must differ between development, staging and production.

`wrangler.toml` currently contains one `[[d1_databases]]` entry named `chemvault`. Treat that as a deploy-time default only. For Preview/Staging, do not reuse a production database id. Configure the Preview/Staging D1 binding in the Cloudflare Pages dashboard, or add explicit Wrangler environments later if the project moves to environment-specific config.

## Cloudflare Pages Dashboard Setup

In Cloudflare Dashboard:

1. Open **Workers & Pages**.
2. Select the `chemvault` Pages project, or create it from the GitHub repository if it does not exist.
3. In **Settings > Build & deployments**, set:
   - Framework preset: None or static site.
   - Build command: `npm run build`.
   - Build output directory: `dist`.
   - Root directory: repository root.
4. In **Settings > Functions**, leave Pages Functions enabled. The repo uses `functions/api/[[path]].js`.
5. In **Settings > Environment variables**, configure Preview and Production separately using the values below.
6. In **Settings > Functions > D1 database bindings**, configure `DB` separately for Preview and Production:
   - Preview/Staging: `DB` -> `chemvault-staging`
   - Production: `DB` -> `chemvault-production`

Do not bind Preview/Staging to the production D1 database.

## Environment Variables

Preview/Staging:

```text
ENVIRONMENT=staging
COMMERCIAL_MODE=staging
ENABLE_MOCK_BILLING=true
ENABLE_MOCK_AUTH=true
DEFAULT_USER_PLAN=free
PAYMENT_PROVIDER=
PUBLIC_APP_URL=<Cloudflare Preview URL>
```

Production:

```text
ENVIRONMENT=production
COMMERCIAL_MODE=production
ENABLE_MOCK_BILLING=false
ENABLE_MOCK_AUTH=false
DEFAULT_USER_PLAN=free
PAYMENT_PROVIDER=
PUBLIC_APP_URL=https://chemvault.science
```

Staging may keep clearly labeled placeholder billing for QA. Production must not return fake checkout success. Until real payment is implemented, production checkout and billing portal must return `payment_not_configured` or `*_not_implemented`.

`DEFAULT_USER_PLAN` is local/staging-only placeholder state. In production, the API guard ignores it for entitlement elevation, so it cannot unlock Pro, Team, Enterprise or Admin behavior.

## D1 Database Separation

Recommended D1 databases:

- `chemvault-dev`
- `chemvault-staging`
- `chemvault-production`

Cloudflare Pages Functions should use the same binding name in every environment:

```text
DB
```

Different environments should bind `DB` to different D1 databases through Cloudflare Pages Preview/Production bindings or a future Wrangler environment configuration. Do not bind Preview/Staging to the production D1 database.

Local:

1. Use local `wrangler pages dev`.
2. Apply local schema or migrations.
3. Use `ENVIRONMENT=development`, `COMMERCIAL_MODE=mock`.

```powershell
npm run build
npx wrangler d1 execute chemvault-dev --local --file=schema.sql
npx wrangler pages dev dist --d1 DB=chemvault-dev --port 8788
```

Staging:

1. Create a separate D1 database such as `chemvault-staging`.
2. Bind Cloudflare Pages Preview/Staging `DB` to `chemvault-staging`.
3. Apply `schema.sql` or migrations to the staging D1 database.
4. Deploy a preview build and test pages plus APIs.

```powershell
npm run build
npx wrangler d1 create chemvault-staging
npx wrangler d1 execute chemvault-staging --remote --file=schema.sql
npx wrangler pages deploy dist --project-name chemvault --branch staging
```

Production:

1. Create a separate D1 database such as `chemvault-production`.
2. Bind Cloudflare Pages Production `DB` to `chemvault-production`.
3. Apply `schema.sql` or migrations to the production D1 database.
4. Confirm production safety guard is active before exposing commercial CTAs.
5. Do not open real paid features until auth/session, subscription state and live payment flows are implemented.

```powershell
npx wrangler d1 create chemvault-production
npx wrangler d1 execute chemvault-production --remote --file=schema.sql
```

Do not run a production Pages deploy unless explicitly approved.

Current schema note:

- `schema.sql` is currently the staging/production initialization file.
- It is acceptable for initializing staging D1 during this MVP.
- Before a formal production rollout with real auth/payment, migrate schema changes into Cloudflare D1 migrations so changes can be reviewed and replayed incrementally.

## Preview Deployment Command List

```powershell
npm run build
node --check scripts/commercial-config.js
node --check scripts/commercial-ui.js
node --check scripts/site-shell.js
node --check "functions/api/[[path]].js"
node --test tests/*.test.mjs
npx wrangler pages deploy dist --project-name chemvault --branch staging
```

## Manual Page Checks

After deploying to Preview/Staging, open:

- `<preview-url>/`
- `<preview-url>/pages/pricing`
- `<preview-url>/pages/dashboard`
- `<preview-url>/pages/search`
- `<preview-url>/pages/ai-paper-search`
- `<preview-url>/pages/file-library`
- `<preview-url>/pages/docs`
- `<preview-url>/pages/molecular-modeling`
- `<preview-url>/pages/mail`
- `<preview-url>/404.html`
- `<preview-url>/sitemap.xml`

Expected behavior:

- Navigation works.
- App switcher opens and links to product modules.
- Pricing plans show Free, Pro, Team/Lab and Enterprise.
- Pricing CTA copy does not imply a real purchase has completed.
- PremiumGate and FeatureGate show upgrade prompts to Free/default users.
- Basic compound search still works.
- Pro export/save controls are gated.
- AI Paper Search beta signup submits or shows a clear placeholder state.
- 404 page uses the commercialized navigation and footer.
- Browser console has no obvious JavaScript errors.

## Manual API Checks

Use the Preview/Staging URL as `<preview-url>`.

Health:

```powershell
Invoke-RestMethod -Method GET "<preview-url>/api/health"
```

Entitlements:

```powershell
Invoke-RestMethod -Method GET "<preview-url>/api/entitlements"
```

Lead capture:

```powershell
Invoke-RestMethod -Method POST "<preview-url>/api/leads" -ContentType "application/json" -Body '{"type":"ai_beta","email":"preview@example.com","role":"Researcher","interests":["ai_paper_search"]}'
```

Checkout placeholder:

```powershell
Invoke-RestMethod -Method POST "<preview-url>/api/billing/checkout" -ContentType "application/json" -Body '{"planId":"pro","billingInterval":"monthly"}'
```

Billing portal placeholder:

```powershell
Invoke-RestMethod -Method POST "<preview-url>/api/billing/portal" -ContentType "application/json" -Body '{"userId":"preview-user"}'
```

Export gate:

```powershell
Invoke-WebRequest -Method POST "<preview-url>/api/export/compound" -ContentType "application/json" -Body '{}'
```

Expected API behavior:

- `/api/health` returns `ok: true`.
- `/api/entitlements` returns `commercialMode: staging` and `authMode: placeholder`.
- `/api/leads` stores to D1 when `DB` is bound, or returns a clear mock acceptance when no D1 binding is present.
- `/api/billing/checkout` returns `placeholder_checkout` in staging and states that no payment will be processed.
- `/api/billing/portal` returns `placeholder_portal` in staging or `payment_not_configured` if mock billing is disabled.
- `/api/export/compound` returns HTTP 402 for Free/default users.

## Production Guard Confirmation

Before production release, confirm:

- `ENVIRONMENT=production`
- `COMMERCIAL_MODE=production`
- `ENABLE_MOCK_BILLING=false`
- `ENABLE_MOCK_AUTH=false`
- Production checkout returns `payment_not_configured` until real payment is implemented.
- Production billing portal returns `payment_not_configured` until real payment is implemented.
- Production ignores `DEFAULT_USER_PLAN` for paid entitlement elevation.
- Production D1 is separate from staging D1.
