# ChemVault Compliance Issues

Draft GitHub-style issue backlog. This is not legal advice. Priorities should be confirmed by product, security, and legal reviewers before commercial launch.

Last reviewed: July 2, 2026

GitHub sync status: Issues were created in `Eddy-ZM/ChemVault` on July 2, 2026 as #2 through #19. Do not assume these issues are complete until acceptance criteria are verified and closed.

## Issue 1

**Title:** Add privacy policy link to all public pages
**Priority:** High
**Area:** Privacy / Website / Apple

**Description:**
Public website pages and app settings must expose a clear Privacy Policy link. App Store submission also requires a public privacy policy URL.

**Acceptance Criteria:**

- Privacy Policy link appears in the global website footer or equivalent shared shell.
- Privacy Policy link appears on login/register/account pages.
- Privacy Policy link appears in Apple app settings or support/about screens where applicable.
- Link resolves to the current public privacy policy URL.
- Link is verified in staging and production.

**Suggested Files to Change:**

- `chemvault/scripts/site-shell.js`
- `ChemVault-user/src/pages/Register.tsx`
- Apple app settings/about views
- deployment routing for `docs/legal/privacy-policy.md`

## Issue 2

**Title:** Add terms of service link to all public pages
**Priority:** High
**Area:** Legal / Website / Apple

**Description:**
Users should be able to review Terms of Service before registering, using mail, uploading files, or using AI features.

**Acceptance Criteria:**

- Terms link appears in shared website footer.
- Terms link appears on login/register/account pages.
- Terms link appears in relevant app settings/about screens.
- Register flow links to both Terms and Privacy Policy.
- Link resolves in production.

**Suggested Files to Change:**

- `chemvault/scripts/site-shell.js`
- `ChemVault-user/src/pages/Register.tsx`
- Apple app settings/about views
- deployment routing for `docs/legal/terms-of-service.md`

## Issue 3

**Title:** Add account deletion request process
**Priority:** Critical
**Area:** Privacy / Apple / User System

**Description:**
The User System includes deletion-related code, but a complete cross-service deletion process was not detected. Apple and privacy expectations require a clear deletion path when account creation is supported.

**Acceptance Criteria:**

- User can request or initiate account deletion from account settings.
- Deletion process covers User, Mail, Files, Notifications, Extract, API keys, OAuth connections, push subscriptions, and sessions.
- Retained audit/security records are documented.
- User receives clear status or confirmation.
- Tests cover deletion across core services.
- Privacy Policy describes deletion limits and retention exceptions.

**Suggested Files to Change:**

- `ChemVault-user/functions/api/delete-account.ts`
- `ChemVault-files/src/routes`
- `ChemVault-Mail/mail-worker/src`
- `ChemVault-notif`
- `ChemVault-app/chemvault-extract`
- Apple account settings views

## Issue 4

**Title:** Add data export request process
**Priority:** High
**Area:** Privacy / User Rights

**Description:**
Users need a way to request or download account data, files metadata, email metadata/content where appropriate, AI extraction records, and notification data.

**Acceptance Criteria:**

- Authenticated export request endpoint exists.
- Export includes account/profile, sessions summary, connected services, files metadata, mail metadata/content as appropriate, extraction records, notification records, and audit summary where allowed.
- Sensitive organization or third-party data is excluded or reviewed.
- Export job status and expiration are visible to user.
- Privacy Policy describes export process.

**Suggested Files to Change:**

- `ChemVault-user/functions/api`
- `ChemVault-files/src/routes`
- `ChemVault-Mail/mail-worker/src`
- `ChemVault-notif`
- `ChemVault-app/chemvault-extract/services/api`

## Issue 5

**Title:** Add email anti-abuse policy
**Priority:** High
**Area:** Email / Abuse / Legal

**Description:**
ChemVault Mail needs explicit anti-spam, anti-phishing, sender identity, attachment, rate limit, and abuse reporting rules.

**Acceptance Criteria:**

- Email policy is published and linked from Terms.
- Sending UI references prohibited activity where appropriate.
- Abuse contact is confirmed and published.
- Admin playbook exists for suspension and investigation.
- Provider acceptable use checklist is completed.

**Suggested Files to Change:**

- `docs/compliance/email-compliance.md`
- `docs/legal/terms-of-service.md`
- `ChemVault-Mail/README.md`
- Mail UI/settings/help pages

## Issue 6

**Title:** Add admin audit log
**Priority:** High
**Area:** Admin / Security / Privacy

**Description:**
Admin actions should be consistently logged across services, especially all-mail access, file deletion, role changes, account suspension, API key management, and extraction data access.

**Acceptance Criteria:**

- Shared audit event fields are defined.
- Admin actions include actor, target, action, resource, timestamp, IP, user agent, reason, and redacted metadata.
- Logs are access-controlled.
- Sensitive fields are redacted.
- Tests cover representative admin actions.

**Suggested Files to Change:**

- `ChemVault-user/src/lib/permissions.ts`
- `ChemVault-Mail/mail-worker/src/api/all-email-api.js`
- `ChemVault-files/src/routes`
- `ChemVault-notif/src/lib/audit`
- `ChemVault-app/chemvault-extract/services/api/app/routes/admin.py`

## Issue 7

**Title:** Add file upload restrictions
**Priority:** High
**Area:** Files / Security

**Description:**
File and extraction uploads require hard size limits, type restrictions, MIME checks, scan/quarantine handling, and metadata verification.

**Acceptance Criteria:**

- Max upload size is enforced server-side by plan and service.
- Allowed and blocked file types are documented.
- MIME type and extension are checked.
- R2/object metadata is verified after upload.
- Dangerous attachments or files are blocked or quarantined.
- Tests cover oversized, unsupported, mismatched, and malicious file names.

**Suggested Files to Change:**

- `ChemVault-files/src/lib/validation.ts`
- `ChemVault-files/src/routes`
- `ChemVault-app/chemvault-extract/services/api/app/routes/documents.py`
- `ChemVault-app/chemvault-extract/services/api/app/services/storage.py`

## Issue 8

**Title:** Add AI data handling notice
**Priority:** High
**Area:** AI / Privacy / Scientific Data

**Description:**
Users need clear notices before uploading documents, prompts, molecule data, or other content to AI-backed processing.

**Acceptance Criteria:**

- AI upload and extraction screens disclose provider processing and human-review requirement.
- Privacy Policy explains AI inputs and outputs.
- Terms include AI/scientific extraction disclaimer.
- Retention and deletion behavior is documented.
- Tests or QA checklist verify notice placement.

**Suggested Files to Change:**

- `ChemVault-app/chemvault-extract/apps/web`
- `chemvault` AI beta pages
- Apple app extraction screens
- `docs/legal/privacy-policy.md`
- `docs/legal/terms-of-service.md`

## Issue 9

**Title:** Add App Store privacy checklist
**Priority:** High
**Area:** Apple / Privacy

**Description:**
App Privacy Details must match each app's exact data collection and server processing.

**Acceptance Criteria:**

- App Privacy Details checklist exists for each Apple app.
- Contact info, identifiers, user content, diagnostics, region data, and email/file/AI content are reviewed.
- TestFlight metadata includes beta and data handling notices.
- Sign in with Apple and account deletion requirements are reviewed.
- Legal/platform reviewer signs off before submission.

**Suggested Files to Change:**

- `docs/compliance/apple-app-compliance.md`
- Apple app `XCODE_CLOUD_SETUP.md` files
- App Store Connect metadata

## Issue 10

**Title:** Add security contact / abuse contact
**Priority:** High
**Area:** Security / Abuse / Support

**Description:**
Users and providers need reliable channels for security issues, spam, phishing, file abuse, impersonation, and privacy requests.

**Acceptance Criteria:**

- Official support, privacy, security, and abuse contact addresses are confirmed.
- Contacts are published in footer, legal docs, App Store metadata, and email policy.
- Internal routing/triage owner is assigned.
- Abuse reports can lead to account suspension or content removal.

**Suggested Files to Change:**

- `docs/legal/privacy-policy.md`
- `docs/legal/terms-of-service.md`
- `docs/compliance/email-compliance.md`
- `chemvault/scripts/site-shell.js`
- App Store metadata

## Issue 11

**Title:** Add rate limiting for sensitive APIs
**Priority:** High
**Area:** Security / Abuse

**Description:**
Sensitive APIs need persistent rate limits for auth, lead forms, email sending, file upload, AI extraction, API keys, webhooks, and admin actions.

**Acceptance Criteria:**

- Rate limits are defined per endpoint class.
- Limits are enforced in durable storage where needed.
- Error responses do not leak internals.
- Tests cover exceeded limits.
- Admin bypasses are explicit and audited.

**Suggested Files to Change:**

- `chemvault/functions/api/[[path]].js`
- `ChemVault-user/functions/api`
- `ChemVault-Mail/services/mail-gateway/src`
- `ChemVault-Mail/mail-worker/src`
- `ChemVault-files/src/routes`
- `ChemVault-app/chemvault-extract/services/api/app/middleware/rate_limit.py`

## Issue 12

**Title:** Add environment variable documentation
**Priority:** Medium
**Area:** DevOps / Secrets

**Description:**
Environment variables are split across multiple services. Operators need a consolidated inventory separating public variables, secrets, rotation requirements, and production-only values.

**Acceptance Criteria:**

- Inventory lists all detected env vars by service.
- Each variable is marked public, secret, operational, or deprecated.
- Required, optional, and production-only variables are identified.
- Rotation guidance exists for secrets.
- CI and Cloudflare secret setup are documented without exposing values.

**Suggested Files to Change:**

- `chemvault/ENVIRONMENT_VARIABLES.md`
- service `.env.example` files
- service `wrangler.toml` / `wrangler.jsonc`
- deployment docs

## Issue 13

**Title:** Add data retention policy
**Priority:** High
**Area:** Privacy / Data Governance

**Description:**
ChemVault needs retention rules for account data, email, files, AI inputs/outputs, logs, audit events, backups, push subscriptions, API keys, and contact forms.

**Acceptance Criteria:**

- Retention matrix exists by data category.
- Deletion/anonymization jobs are planned or implemented.
- Audit/security retention exceptions are documented.
- Privacy Policy aligns with retention policy.
- Retention is reviewed by legal counsel.

**Suggested Files to Change:**

- `docs/compliance/data-map.md`
- `docs/legal/privacy-policy.md`
- service scheduled jobs/migrations

## Issue 14

**Title:** Add user consent notice where needed
**Priority:** Medium
**Area:** Privacy / UX

**Description:**
Some workflows need explicit notice or consent, including registration, contact forms, AI uploads, TestFlight, email sending, push notifications, and marketing email if added.

**Acceptance Criteria:**

- Consent or notice points are mapped by workflow.
- Registration links Terms and Privacy.
- AI upload screens include data handling notice.
- Push notification permission explains purpose.
- Marketing email is disabled or has consent and unsubscribe controls.

**Suggested Files to Change:**

- `ChemVault-user/src/pages/Register.tsx`
- `ChemVault-app/chemvault-extract/apps/web`
- `ChemVault-notif`
- Apple app notification prompts/settings
- public contact/lead forms

## Issue 15

**Title:** Add legal review checklist before commercial launch
**Priority:** High
**Area:** Legal / Release Governance

**Description:**
Commercial launch should be blocked until high-risk legal topics are reviewed and approved.

**Acceptance Criteria:**

- Legal checklist covers Privacy Policy, Terms, Cookie Policy, App Privacy Labels, DPA/subprocessors, AI disclaimers, email rules, minors/education use, payment/subscription terms, and security incident process.
- Checklist is part of release readiness.
- Owner and approval status are tracked.
- Unresolved items are clearly marked "Needs legal review".

**Suggested Files to Change:**

- `docs/compliance/README.md`
- `docs/compliance/code-remediation-plan.md`
- release checklist docs

## Issue 16

**Title:** Remove secrets from URL paths and CI-generated config
**Priority:** Critical
**Area:** Secrets / CI-CD / Mail

**Description:**
The Mail deployment workflow should not send `JWT_SECRET` in an initialization URL or write secrets into temporary config files in the workspace.

**Acceptance Criteria:**

- Initialization no longer places secrets in URL paths.
- Secrets are injected through provider secret mechanisms.
- CI logs do not include secret-derived values.
- Affected credentials are rotated.
- Deployment docs explain the new process.

**Suggested Files to Change:**

- `ChemVault-Mail/.github/workflows/deploy-cloudflare.yml`
- `ChemVault-Mail/README.md`
- Cloudflare/Resend secret setup docs

## Issue 17

**Title:** Restrict CORS and sanitize API errors
**Priority:** High
**Area:** API Security

**Description:**
The main API currently uses broad CORS headers and returns raw error messages. This should be hardened before authenticated or sensitive routes expand.

**Acceptance Criteria:**

- Public and authenticated API CORS policies are separated.
- Allowed origins are environment-driven.
- Credentialed requests are restricted.
- Client errors use stable error codes.
- Internal error details are redacted from responses.
- Tests cover disallowed origins and error paths.

**Suggested Files to Change:**

- `chemvault/functions/api/[[path]].js`
- `chemvault/ENVIRONMENT_VARIABLES.md`
- API tests under `chemvault/tests`

## Issue 18

**Title:** Review admin roles and least privilege across services
**Priority:** High
**Area:** Access Control / Admin

**Description:**
Owner, super admin, admin, mail admin, file admin, and service admin permissions should be reviewed for least privilege and documented business need.

**Acceptance Criteria:**

- Role matrix exists across User, Mail, Files, Notifications, Extract, and main site.
- Break-glass access is separated from normal admin access.
- Sensitive admin actions require audit reason.
- Tests cover denied access for non-admin and limited-admin users.
- Admin UI only exposes allowed actions.

**Suggested Files to Change:**

- `ChemVault-user/db/migrations/*permissions*`
- `ChemVault-user/src/lib/permissions.ts`
- `ChemVault-Mail/mail-worker/src`
- `ChemVault-files/src/lib`
- `ChemVault-notif/src/lib`
- `ChemVault-app/chemvault-extract/services/api/app/routes/admin.py`
