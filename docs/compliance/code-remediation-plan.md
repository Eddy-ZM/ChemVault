# ChemVault Code Remediation Plan

Draft compliance and security remediation plan. This is not legal advice. Needs legal and security review before commercial launch.

Last reviewed: July 2, 2026

## Current Remediation Status

Completed or baseline implemented in this pass:

- public `/privacy`, `/terms`, `/security`, `/account/delete`, and `/account/export` pages;
- main API deletion/export request endpoints and admin status endpoints;
- main API in-memory rate limits for lead, export, deletion, admin, and enrich endpoints;
- main API `account_deletion_requests`, `data_export_requests`, and `admin_audit_logs` schema;
- global footer legal/security links on the main public site;
- User System and Extract auth legal notices;
- Mail send limits, attachment restrictions, suspended-user checks, provider error redaction, and header-based initialization;
- Files upload size/type restrictions and minimal upload rate limiting;
- AI data handling notices on main AI page and Extract upload/extraction surfaces;
- secret ignore rules and placeholder env examples;
- App Store/TestFlight draft documents and GitHub issues.

Partially completed:

- account deletion and data export are request workflows only; cross-service deletion/export orchestration still needs backend implementation;
- admin audit logging exists in the main API but needs service-wide adoption;
- rate limiting is in-memory or KV-conditional in several services and needs durable production enforcement;
- file uploads block common dangerous types but still need scanning/quarantine and object metadata verification;
- Mail anti-abuse lacks provider webhook enforcement, complaint handling, reputation scoring, and durable global quotas;
- Apple app native settings/about screens still need verification.

Needs manual review:

- local Apple `.p8` key handling and rotation decision;
- Cloudflare/GitHub/Resend/OpenAI/Apple secret configuration;
- legal review of Privacy Policy, Terms, retention, App Privacy Details, and AI/email disclaimers.

## Priority Definitions

- Critical: likely secret exposure, account compromise, cross-tenant data exposure, or platform-blocking compliance issue.
- High: likely production compliance/security gap for user data, email, files, AI, or admin access.
- Medium: important hardening or consistency issue that should be fixed before broader launch.
- Low: documentation, usability, or defense-in-depth improvement.

## Critical

| Issue | Involved Files | Risk | Recommended Fix | Code? | Docs? | Human Confirmation |
| --- | --- | --- | --- | --- | --- | --- |
| App Store Connect private key material exists in local workspace | `ChemVault_appledev/AuthKey_7NP324B57S.p8` | Private developer API key material can enable unauthorized Apple developer actions if exposed. | Confirm ownership and access. Move to a managed secret store. Rotate if exposure cannot be ruled out. Ensure it is never committed, logged, or copied into build artifacts. | Yes | Yes | Needs technical confirmation and security review |
| Mail deployment initializes service with `JWT_SECRET` in URL path | `ChemVault-Mail/.github/workflows/deploy-cloudflare.yml` | Secrets in URLs may be captured by logs, proxies, analytics, shell history, or provider traces. | Replace URL-path secret initialization with authenticated POST body or Cloudflare secret binding. Rotate affected secret after change. | Yes | Yes | Needs security review |
| Mail deployment writes secrets into generated config during CI | `ChemVault-Mail/.github/workflows/deploy-cloudflare.yml` | Temporary secret-containing files can leak through logs, artifacts, workflow debug output, or compromised runners. | Use `wrangler secret put`, GitHub environment secrets, or provider-native secret injection. Avoid writing secrets to repo workspace files. | Yes | Yes | Needs security review |
| Missing product-wide account deletion coverage | `ChemVault-user/functions/api/delete-account.ts`, `ChemVault-files`, `ChemVault-Mail`, `ChemVault-notif`, `ChemVault-app/chemvault-extract`, Apple apps | Apple and privacy requirements may be unmet if deletion does not cover all user data. | Build cross-service deletion orchestration, retention exceptions, audit records, session revocation, OAuth disconnect, API key revocation, push subscription removal, file/email/AI cleanup. | Yes | Yes | Needs legal review |

## High

| Issue | Involved Files | Risk | Recommended Fix | Code? | Docs? | Human Confirmation |
| --- | --- | --- | --- | --- | --- | --- |
| Missing data export process | User System, Files, Mail, Extract, Notifications | Users may lack access/export rights required by law or promised product behavior. | Add authenticated export request flow, async job status, downloadable archive, admin review for sensitive org data, and retention rules. | Yes | Yes | Needs legal review |
| Public pages do not consistently link Privacy Policy and Terms | `chemvault/scripts/site-shell.js`, public page templates, Apple app settings screens | Users and App Store reviewers may not find required legal notices. | Add footer/header/settings links to privacy, terms, support, and abuse contacts. Verify all public pages and app settings screens. | Yes | Yes | Needs legal review |
| Main API uses broad CORS wildcard | `chemvault/functions/api/[[path]].js` | Broad CORS can increase abuse surface and accidental data exposure if authenticated endpoints are added. | Restrict origins for non-public routes. Split public read APIs from authenticated APIs. Add credential-aware CORS policy. | Yes | Yes | Needs security review |
| Main API returns raw error messages | `chemvault/functions/api/[[path]].js` | Internal details may leak through API responses. | Return stable error codes and generic messages. Log detailed server errors only after redaction. | Yes | No | Needs technical confirmation |
| Admin token mock auth path needs production guardrails | `chemvault/functions/api/[[path]].js`, `chemvault/ENVIRONMENT_VARIABLES.md` | Static admin token misuse could grant elevated API access. | Ensure mock admin auth cannot run in production. Replace with real session/role checks before admin features expand. | Yes | Yes | Needs security review |
| File uploads lack complete size, MIME, malware, and content checks | `ChemVault-files/src/routes`, `ChemVault-files/src/lib/validation.ts`, `ChemVault-app/chemvault-extract/services/api/app/routes/documents.py` | Users can upload malicious, oversized, unsupported, or sensitive files without sufficient controls. | Add enforced max size by plan, MIME allow/deny list, extension/MIME consistency checks, malware scanning or quarantine, archive handling, and upload tests. | Yes | Yes | Needs security review |
| File upload completion does not appear to verify object size/hash against declared metadata | `ChemVault-files/src/routes`, R2 upload complete flow | Metadata could diverge from stored object, weakening auditability and abuse controls. | On completion, read R2 object metadata and verify size, content type, and checksum where feasible. | Yes | No | Needs technical confirmation |
| Email sending lacks complete persistent anti-abuse controls | `ChemVault-Mail/services/mail-gateway`, `ChemVault-Mail/mail-worker/src/service/email-service.js` | Spam, phishing, provider suspension, account abuse, and deliverability damage. | Add persistent send quotas, abuse detection, complaint/bounce webhooks, new-account throttles, provider block handling, and tests. | Yes | Yes | Needs legal and security review |
| Attachment restrictions are incomplete | `ChemVault-Mail/services/mail-gateway`, `ChemVault-Mail/mail-worker/src/service/email-service.js` | Malicious or oversized attachments may be sent or stored. | Add size/type limits, executable/archive rules, scanning/quarantine, and user/admin rejection messages. | Yes | Yes | Needs security review |
| Admin all-mail and cross-user access needs least-privilege review | `ChemVault-Mail/mail-worker/src/api/all-email-api.js`, `ChemVault-user/db/migrations/002_permissions_mail_system.sql` | Administrators may access highly sensitive mail content beyond operational need. | Separate emergency access from routine admin roles, require justification, write audit logs, add break-glass controls, and review UI exposure. | Yes | Yes | Needs legal and security review |
| AI inputs and outputs need visible user notice and retention controls | `ChemVault-app/chemvault-extract`, `chemvault` AI beta pages, Apple apps | Users may submit confidential data without understanding provider processing or retention. | Add pre-upload notices, provider disclosure, retention settings, delete/export coverage, and human-review disclaimers. | Yes | Yes | Needs legal review |
| Extract web app stores auth token in `localStorage` | `ChemVault-app/chemvault-extract/apps/web/lib/auth-client.ts` | XSS can expose bearer tokens. | Prefer HttpOnly Secure SameSite cookies or short-lived in-memory tokens with refresh-token hardening. Add CSP and XSS tests. | Yes | Yes | Needs security review |
| OpenAI error responses may expose provider details | `ChemVault-app/chemvault-extract/services/api/app/services/openai_client.py` | Provider response bodies may include sensitive request or operational details. | Sanitize provider errors before returning to clients. Log redacted details only. | Yes | No | Needs technical confirmation |
| App Privacy Labels likely incomplete until exact binaries are mapped | Apple app projects, `XCODE_CLOUD_SETUP.md`, App Store Connect metadata | App Store metadata may be inaccurate for email, files, AI, identifiers, region lookup, diagnostics, and user content. | Complete App Privacy Details from exact binary and backend behavior. Keep a release checklist. | Yes | Yes | Needs legal/platform review |

## Medium

| Issue | Involved Files | Risk | Recommended Fix | Code? | Docs? | Human Confirmation |
| --- | --- | --- | --- | --- | --- | --- |
| Data retention schedule missing | All services, logs, D1/R2/KV/Supabase, AI outputs, email, files | Data may be kept longer than necessary or deleted inconsistently. | Create retention matrix and implement scheduled deletion/anonymization jobs. | Yes | Yes | Needs legal review |
| Logs may retain sensitive user data | Mail metadata logs, Notification audit logs, Extract webhook response previews, Cloudflare Workers logs | Email bodies, headers, AI results, IPs, tokens, or webhook payloads may be over-retained. | Redact sensitive fields, limit previews, restrict access, set retention periods, and test sanitizers. | Yes | Yes | Needs security review |
| Admin audit logging inconsistent across services | User System, Mail, Files, Notifications, Extract | Sensitive admin actions may not be traceable end-to-end. | Standardize audit schema for actor, target, action, reason, IP, user agent, timestamp, resource, and redacted details. | Yes | Yes | Needs security review |
| CSRF coverage needs verification for cookie-authenticated routes | User System, Mail worker, Files, main APIs | Cookie-authenticated state-changing endpoints may be vulnerable if SameSite/CORS is insufficient. | Add CSRF tokens or origin checks for state-changing cookie-auth endpoints. Add tests. | Yes | Yes | Needs security review |
| XSS and content rendering need review for email, HTML, AI output, and docs | Mail app/UI, Extract UI, Files preview, public site scripts | User-controlled HTML or model output can execute or mislead users. | Sanitize HTML, use CSP, render untrusted content safely, and test malicious payloads. | Yes | Yes | Needs security review |
| User role and permission matrices need product owner approval | `ChemVault-user/db/migrations/*`, Mail, Files, Notifications, Extract admin routes | Owner/super/admin roles may be broader than business need. | Document role matrix, approve permissions, add least-privilege tests, and review admin UI visibility. | Yes | Yes | Needs business/security review |
| Local browser storage of lead/contact fallback data should be reviewed | `chemvault/scripts/commercial-ui.js` | Contact details may remain on shared devices if API fallback stores locally. | Remove local fallback for personal data or add clear notice and expiration. | Yes | Yes | Needs legal review |
| Cookie policy is missing | `docs/legal`, public website footer | Local storage, auth cookies, Turnstile, Cloudflare, and future analytics need disclosure. | Create cookie policy or add cookie section to privacy policy and UI notices as needed. | Yes | Yes | Needs legal review |
| Provider data processing agreements and subprocessors not documented | Cloudflare, Resend, OpenAI, Apple, GitHub, Supabase, Stripe if used | Commercial customers may require DPA/subprocessor review. | Create subprocessor list and contract checklist. | No | Yes | Needs legal review |
| Age and education-user policy missing | Public docs, Terms, Privacy, onboarding | School/minor use may trigger additional obligations. | Add age gating or education-use statement and approval process. | Possibly | Yes | Needs legal review |
| Notification push subscriptions require user control | `ChemVault-notif`, Apple apps/web push UI | Users need clear opt-in, opt-out, deletion, and privacy disclosures. | Add unsubscribe/delete subscription controls and privacy text. | Yes | Yes | Needs legal review |
| Webhook/API key controls need release checklist | `ChemVault-notif`, `ChemVault-app/chemvault-extract` | API keys, webhooks, response previews, and service keys can expose data. | Confirm hashed storage, scope checks, rotation, prefix display, expiration, and redacted logs. | Yes | Yes | Needs security review |

## Low

| Issue | Involved Files | Risk | Recommended Fix | Code? | Docs? | Human Confirmation |
| --- | --- | --- | --- | --- | --- | --- |
| Environment variable documentation is split across services | `.env.example`, `ENVIRONMENT_VARIABLES.md`, `wrangler.toml`, `wrangler.jsonc` | Operators may misconfigure secrets or public variables. | Create a single environment variable inventory with secret/public classification and rotation guidance. | No | Yes | Needs technical confirmation |
| Legal and compliance index was missing | `docs/compliance/README.md` | Reviewers may not find required documents. | Maintain compliance index and pre-launch checklist. | No | Yes | No |
| App/test metadata needs release owner | Apple app docs and App Store Connect | Privacy labels and beta descriptions can drift from code. | Assign an owner and require checklist before each TestFlight/App Store release. | No | Yes | Needs business confirmation |
| Error pages and empty states need privacy wording review | Public site, apps, APIs | Internal state or misleading user guidance may appear. | Review user-facing errors for clarity, support contact, and no internal details. | Yes | Yes | Needs technical confirmation |
| Public support/security/abuse contact aliases are not confirmed | Public docs, Terms, Privacy, App Store metadata | Users may lack a reliable reporting channel. | Confirm and publish support, privacy, security, and abuse contacts. | Possibly | Yes | Needs business confirmation |

## Suggested Implementation Order

1. Remove secret exposure patterns and rotate affected credentials.
2. Add public privacy, terms, support, and abuse links across web and apps.
3. Implement product-wide account deletion and data export workflows.
4. Harden Mail sending, attachment controls, abuse detection, and admin access.
5. Harden File and Extract upload controls, AI notices, and retention handling.
6. Restrict CORS and sanitize API errors.
7. Standardize admin audit logs, log redaction, and retention schedules.
8. Complete Apple privacy labels, TestFlight metadata, and app deletion flow review.
9. Build a release checklist covering legal, security, privacy, and provider configuration.

## Required Pre-Launch Reviews

Needs legal review:

- Privacy Policy, Terms of Service, Cookie Policy, and acceptable use terms;
- App Store Privacy Labels and TestFlight wording;
- email anti-spam and marketing email requirements;
- AI/scientific extraction disclaimers;
- minors, school, and education-user handling;
- data retention and deletion exceptions;
- processor contracts and subprocessor list;
- payment, tax, refund, and subscription terms if billing launches.

Needs technical/security review:

- secret storage and rotation;
- admin access and least privilege;
- upload safety controls;
- email abuse controls;
- token/session storage;
- CSRF, XSS, and CORS;
- log redaction and retention;
- deletion/export implementation;
- provider webhook handling and API key security.
