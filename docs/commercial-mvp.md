# ChemVault Commercial MVP

This document describes the first commercial foundation for the ChemVault web ecosystem.

## Overview

ChemVault is being positioned as an integrated research workbench for chemistry and technical users. The current `chemvault` repository is the public website and compound search entry point, so the MVP implements the commercial base here first and documents how other sub-sites should connect later.

Implemented user-facing surfaces:

- Unified product navigation and app switcher.
- Pricing page with Free, Pro, Team/Lab, and Enterprise/Institution plans.
- Plan and feature entitlement helpers in `scripts/commercial-config.js`.
- Reusable gates and commercial UI renderers in `scripts/commercial-ui.js`.
- Dashboard/workbench commercial entry page.
- AI Paper Search beta page with early access collection.
- File Library, Docs, Molecular Modeling, and Mail commercial placeholders.
- Newsletter, AI beta, and Enterprise lead forms.
- Payment placeholder API routes.

Deployment safety checklist: see `docs/deployment-checklist.md`.

## Product Modules

The shared module contract lives in `scripts/commercial-config.js`.

Current modules:

- `main`
- `compound_search`
- `file_library`
- `documentation`
- `molecular_modeling`
- `mail`
- `ai_paper_search`

Each module has:

- `id`
- `name`
- `description`
- `route`
- `status`
- `accessLevel`
- `icon`
- `ctaLabel`

Future sub-sites should consume this same shape or mirror it server-side so the app switcher and entitlement UI stay consistent.

## Plans

Plan order:

- `anonymous`
- `free`
- `pro`
- `team`
- `enterprise`
- `admin`

Public plans shown on `/pages/pricing.html`:

- Free: acquisition and trial use.
- Pro: individual professional users at `£12/month` or `£99/year`.
- Team/Lab: labs and teams from `£49/month` or `£499/year`.
- Enterprise/Institution: custom procurement and onboarding.

## Entitlements

Feature keys and plan requirements are declared in `scripts/commercial-config.js` and mirrored in `functions/api/[[path]].js` for protected API placeholders.

Important helpers:

- `getUserPlan(user)`
- `hasPlan(user, plan)`
- `hasFeatureAccess(user, featureKey)`
- `requireFeatureAccess(user, featureKey)`
- `getFeatureLimit(user, featureKey)`
- `isProOrAbove(user)`
- `isTeamOrAbove(user)`
- `isEnterpriseOrAdmin(user)`
- `getUsageLimit(plan, featureKey)`
- `getCurrentUsage(user, featureKey)`
- `hasUsageRemaining(user, featureKey)`
- `recordUsage(user, featureKey)`

The browser-side plan preview uses `localStorage` for MVP testing only. Do not treat it as paid access. Server routes default to Free unless future authentication and subscription state are connected.

Production guard:

- `ENVIRONMENT=production` or `COMMERCIAL_MODE=production` disables placeholder auth.
- `DEFAULT_USER_PLAN` is ignored in production and cannot grant Pro, Team, Enterprise or Admin access.
- `ENABLE_MOCK_AUTH` is local/staging only.
- Client-sent plan values are ignored by protected API routes.

## Server-Side Checks

Cloudflare Pages Functions now expose:

- `GET /api/entitlements`
- `POST /api/leads`
- `POST /api/newsletter/unsubscribe`
- `GET /api/admin/leads`
- `GET /api/admin/leads/:id`
- `POST /api/admin/leads/:id/status`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/export/compound`

`/api/entitlements` returns the server plan, feature map and placeholder auth status. In production, placeholder auth is disabled and entitlements default to Free until real auth/subscription state is connected.

`/api/export/compound` checks `compound.search.export` server-side. It returns a gated response unless the server-side placeholder resolver grants access in local/staging. Production should replace `resolveServerPlan()` with real user/session/subscription lookup before any paid export is enabled.

## Lead Capture

Lead forms post to `/api/leads`.

Lead types:

- `newsletter`
- `enterprise`
- `ai_beta`

When D1 is bound as `DB`, leads are stored in the `leads` table with source page, form id, consent, hashed IP, user agent, status and last error fields. Without D1, the API returns a mock accepted response.

Lead submission now also supports:

- honeypot filtering through `website`;
- D1-backed `newsletter_subscribers` upsert for newsletter/subscribe forms;
- Resend administrator notification through `RESEND_API_KEY` plus `LEADS_NOTIFY_TO` or `FORMS_NOTIFY_TO`;
- user confirmation email through `LEADS_FROM` or `FORMS_FROM`;
- protected lead review through `/api/admin/leads` and `/admin/leads`;
- token-based unsubscribe through `/api/newsletter/unsubscribe`.

If Resend is not configured, `/api/leads` still writes to D1 and returns success. The API logs `Resend not configured` without printing secrets and records the skipped mail state in the lead row.

## Payment Placeholder

Checkout buttons call `/api/billing/checkout`.

No payment provider SDK is connected yet. Required future environment variables are listed in `.env.example` and `ENVIRONMENT_VARIABLES.md`.

Current behavior:

- Local/development can return a `placeholder_checkout` response when `ENABLE_MOCK_BILLING` is enabled.
- Staging can return a clearly labeled staging placeholder response for checkout QA.
- Production returns `payment_not_configured` with HTTP 503 when no real provider is implemented/configured.
- Production never returns a fake checkout success URL, customer id or subscription id.
- Billing portal follows the same placeholder/not-configured rules.

Do not hardcode provider keys or price IDs. Use:

- `ENVIRONMENT`
- `COMMERCIAL_MODE`
- `ENABLE_MOCK_BILLING`
- `ENABLE_MOCK_AUTH`
- `PAYMENT_PROVIDER`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`
- `STRIPE_TEAM_MONTHLY_PRICE_ID`
- `STRIPE_TEAM_YEARLY_PRICE_ID`
- `PUBLIC_APP_URL`
- `ENTERPRISE_LEAD_EMAIL`
- `NEWSLETTER_PROVIDER`
- `RESEND_API_KEY`
- `LEADS_NOTIFY_TO`
- `LEADS_FROM`
- `LEADS_IP_HASH_SALT`
- `CHEMVAULT_ADMIN_EMAILS`
- `USER_SYSTEM_ORIGIN`
- `CHEMVAULT_ADMIN_TOKEN`
- `CHEMVAULT_ADMIN_TOKEN_FALLBACK`
- `DEFAULT_USER_PLAN`

`DEFAULT_USER_PLAN` is a local/staging placeholder only. It exists so API entitlement checks can be exercised before real auth, organization membership and subscription state are wired in.

## Cloudflare Pages And D1

The API expects a D1 binding named `DB`. The current `wrangler.toml` uses `binding = "DB"`, which matches `functions/api/[[path]].js`.

Local D1 schema:

```bash
npx wrangler d1 execute chemvault-dev --local --file=schema.sql
```

Staging D1 schema:

```bash
npx wrangler d1 execute chemvault-staging --remote --file=schema.sql
```

Production D1 schema:

```bash
npx wrangler d1 execute chemvault-production --remote --file=schema.sql
```

Use a separate staging D1 database such as `chemvault-staging` and bind it as `DB` in the Cloudflare Pages Preview/Staging environment. Apply `schema.sql` to the target environment before testing lead capture or commercial placeholders.

Existing databases created before lead email notifications should also apply:

```bash
npx wrangler d1 execute chemvault-staging --remote --file=migrations/0003_leads_email_notifications.sql
npx wrangler d1 execute chemvault-production --remote --file=migrations/0003_leads_email_notifications.sql
```

Commercial table usage:

- `leads`: newsletter, enterprise and AI beta interest records, mail notification state and source metadata.
- `newsletter_subscribers`: active/unsubscribed newsletter addresses with hashed unsubscribe tokens.
- `organizations` and `memberships`: future team/lab account model placeholders.
- `subscriptions`: schema placeholder only; it does not mean live payment is connected.
- `feature_entitlements`: future database-backed entitlement overrides. Current MVP entitlements are code-defined plus server guard logic.
- `usage_records`: future quota tracking placeholder.
- `resources`: future docs/resource access metadata.

Do not open real paid features in production until auth/session and subscription reads replace `DEFAULT_USER_PLAN`.

## Data Model

`schema.sql` now includes placeholder tables for:

- `organizations`
- `memberships`
- `subscriptions`
- `feature_entitlements`
- `usage_records`
- `leads`
- `newsletter_subscribers`
- `resources`

These are intentionally simple D1 tables. If the user system becomes the source of truth, migrate plan and membership reads to that service and keep this site as the presentation layer.

## Adding A Premium Feature

1. Add the feature key to `scripts/commercial-config.js`.
2. Add the same feature key and required plan to `functions/api/[[path]].js` if any API route depends on it.
3. Wrap UI in an element with `data-feature-key="feature.key"`.
4. Add `data-gate-title` and `data-gate-body` so Free users see a useful upgrade preview.
5. If usage limits apply, add limits to the feature config and display them with `data-render="usage-summary"` or a custom view.

## Adding A Module

1. Add the module to `productModules` in `scripts/commercial-config.js`.
2. Create the route under `pages/` or point to an external sub-site route.
3. Add a redirect in `_redirects` if a short path is useful.
4. Add the route to `scripts/generate-sitemap.mjs` if it should be indexed.
5. Add server-side feature keys if the module has protected API actions.

## Adding A Plan

1. Add the plan to `planOrder`.
2. Add the plan object to `plans`.
3. Update plan labels in `commercial-ui.js` and server plan order in `functions/api/[[path]].js`.
4. Update comparison rows and environment variables if checkout is needed.

## Local Testing

```bash
npm run build
npm run dev
```

There is no `npm test` script in this repository. Existing Node tests can be run manually with:

```bash
node --test tests/*.test.mjs
```

## Known Limitations

- Browser plan preview is not authentication or subscription state.
- Payment routes are placeholders and do not create live checkout sessions.
- AI Paper Search does not connect to a live paper index yet.
- Molecular Modeling does not run calculations in this web MVP.
- Mail does not send real email from the MVP page.
- Team workspace UI needs organization auth and backend storage before real collaboration is enabled.
