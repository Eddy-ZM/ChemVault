# ChemVault Forms Admin

Last reviewed: July 2, 2026

ChemVault Forms replaces the old public GitHub-Issue-only feedback path with a private D1-backed intake and admin workflow. The compatibility `/api/feedback` endpoint remains available, but security reports must never fall back to public GitHub Issues.

Commercial leads use the same protected administrator workflow at `/admin/leads` and `/api/admin/leads`. Lead email notifications reuse `RESEND_API_KEY`, `FORMS_NOTIFY_TO` and `FORMS_FROM` unless `LEADS_NOTIFY_TO` or `LEADS_FROM` are configured.

Official references:

- Cloudflare D1 databases and Wrangler: https://developers.cloudflare.com/d1/
- Cloudflare Pages Functions bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Resend email API: https://resend.com/docs/api-reference/emails/send-email
- Resend domains: https://resend.com/docs/dashboard/domains/introduction

## Routes

Public:

- `POST /api/forms/submit`
- `POST /api/feedback` compatibility path
- `/feedback` public form page

Admin:

- `GET /api/admin/forms`
- `GET /api/admin/forms/:id`
- `PATCH /api/admin/forms`
- `PATCH /api/admin/forms/:id`
- `POST /api/admin/forms/:id/reply`
- `GET /api/admin/forms/export.csv`
- `/admin/forms`
- `/admin/forms/:id`

## D1 setup

Create separate D1 databases for preview/staging and production. Do not bind preview directly to production data.

```powershell
npx wrangler d1 create chemvault-staging
npx wrangler d1 create chemvault-production
```

Bind the target database to Cloudflare Pages Functions with binding name `DB`. The code expects `env.DB`; `FORMS_DB=DB` is documentation only, not a browser-exposed variable.

Apply the migration to an existing database:

```powershell
npx wrangler d1 execute chemvault-staging --remote --file=migrations/0002_add_forms_management.sql
npx wrangler d1 execute chemvault-production --remote --file=migrations/0002_add_forms_management.sql
```

For a full local or fresh environment initialization, `schema.sql` also contains the Forms tables:

```powershell
npx wrangler d1 execute chemvault-dev --local --file=schema.sql
```

## Environment variables

Configure these in Cloudflare Pages for the target environment. Do not commit real values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DB` D1 binding | Yes | D1 binding used by Pages Functions. |
| `RESEND_API_KEY` | Required for mail | Sends new-submission notifications and admin replies. |
| `FORMS_NOTIFY_TO` | Yes for mail | Notification inbox, normally `forms@chemvault.science`. |
| `FORMS_FROM` | Yes for mail | Sender, normally `forms@chemvault.science` or `noreply@chemvault.science`. |
| `FORMS_IP_HASH_SALT` | Recommended | Salt used before hashing client IPs for `ip_hash`. |
| `CHEMVAULT_ADMIN_EMAILS` | Yes | Comma-separated allow-list for authenticated admin emails. Default production values are `ziwen.mu@chemvault.science,admin@chemvault.science`. |
| `USER_SYSTEM_ORIGIN` | Recommended | ChemVault User Center origin used for `/api/access/check` permission validation. |
| `CHEMVAULT_ADMIN_TOKEN` | Emergency fallback | Legacy fallback token. Store only as a Cloudflare secret. |
| `CHEMVAULT_ADMIN_TOKEN_FALLBACK` | Optional | Set `false` after Cloudflare Access/User Center login is confirmed. |
| `PUBLIC_APP_URL` | Recommended | Used to generate admin links inside notification emails. |
| `GITHUB_FEEDBACK_TOKEN` | Optional | Non-security compatibility fallback only. |
| `GITHUB_FEEDBACK_REPO` | Optional | Fallback repo, default `Eddy-ZM/chemvault`. |
| `GITHUB_FEEDBACK_LABELS` | Optional | Comma-separated fallback issue labels. |

## Resend setup

1. Verify the sending domain for `chemvault.science` in Resend.
2. Configure the DNS records Resend provides for the domain.
3. Create a Resend API key and store it as `RESEND_API_KEY` in Cloudflare Pages.
4. Set `FORMS_FROM` to an address allowed by that verified domain.
5. Set `FORMS_NOTIFY_TO=forms@chemvault.science`.

If email sending fails or Resend is not configured, the submission still saves to D1. The API records `email_notification_failed` in `metadata_json` and returns `submitted=true`.

## Admin access

The admin APIs and `/admin/*` pages require an authenticated administrator identity. The accepted production identities are:

- Cloudflare Access authenticated email in `CHEMVAULT_ADMIN_EMAILS`;
- ChemVault User Center account with the required `main_admin:*` permission and an email in `CHEMVAULT_ADMIN_EMAILS`;
- legacy `CHEMVAULT_ADMIN_TOKEN` only when `CHEMVAULT_ADMIN_TOKEN_FALLBACK` is not disabled.

Configure Cloudflare Access for `/admin/*` and `/api/admin/*` with an include policy for:

- `ziwen.mu@chemvault.science`
- `admin@chemvault.science`

ChemVault User Center must include the permissions from `db/migrations/008_main_site_admin_permissions.sql` in the User Center repository. The main site still checks `CHEMVAULT_ADMIN_EMAILS`, so granting a permission to another User Center account is not sufficient unless that email is also allow-listed.

The admin UI at `/admin/login/` can use the fallback token to set an HttpOnly `chemvault_admin_session` cookie. Do not distribute this fallback token; disable it once Cloudflare Access/User Center admin login is verified.

## Security report handling

- `type=security` submissions are private D1 records.
- Security reports do not create public GitHub Issues.
- Do not paste vulnerability details into public URLs, issue trackers, logs, or screenshots.
- Use `/admin/forms` to triage, update status, add internal notes, and reply by email when the reporter provided an address.

## Local testing

```powershell
npm install
npx wrangler d1 execute chemvault --local --file=migrations/0002_add_forms_management.sql
node --test tests/*.test.mjs
npm run build
npx wrangler pages dev dist --d1 DB=chemvault --port 8788
```

Open:

- `http://127.0.0.1:8788/feedback`
- `http://127.0.0.1:8788/admin/forms`

For API-only testing:

```powershell
$headers = @{ "content-type" = "application/json" }
$body = @{
  type = "feedback"
  email = "researcher@example.com"
  subject = "Example feedback"
  message = "This is a local test submission."
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8788/api/forms/submit" -Method Post -Headers $headers -Body $body
```

Admin list:

```powershell
$adminHeaders = @{ "authorization" = "Bearer <CHEMVAULT_ADMIN_TOKEN>" }
Invoke-RestMethod -Uri "http://127.0.0.1:8788/api/admin/forms" -Headers $adminHeaders
```
