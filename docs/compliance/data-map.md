# ChemVault Data Map

Draft data map. This is not legal advice. Needs legal and technical review before commercial launch.

Last reviewed: July 2, 2026

## Scope

This data map covers the detected ChemVault website, User System, Mail, Files, Notification System, Molecule Studio, Extract / AI Scientific Data Extraction, Apple native apps, TestFlight builds, Cloudflare deployment, Resend/SMTP email delivery, GitHub workflows, and related environment configuration.

"Not currently detected" means the reviewed code did not show active collection or processing for that category. It does not prove the category is absent in production dashboards, provider settings, logs, or future releases.

## Data Map Table

| Data Category | Example Data | Collected From | Purpose | Storage Location | Third-party Processor | Retention Period | User Control | Risk Level | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Account data | user ID, email, role, status, organization, membership | User registration, OAuth, admin tools | Account management, authentication, permissions, support | User System D1/database tables, app local state where applicable | Cloudflare, OAuth providers, Apple if used | Not fully defined | Profile update, deletion partially detected | High | Product-wide deletion/export incomplete. |
| Email address | login email, mailbox address, lead email, recipients | Registration, login, mail send/receive, contact forms | Login, mail delivery, support, commercial contact, notifications | User DB, Mail DB, lead tables, logs | Cloudflare, Resend/SMTP, OAuth providers, Apple, GitHub for CI logs if misconfigured | Not fully defined | Account settings, deletion request needed | High | Contact info and identifier for App Privacy Labels. |
| Name / display name | name, display name, sender name, organization contact name | Registration, OAuth profile, mail settings, lead forms | Profile, sender identity, support, admin review | User DB, Mail settings, lead tables | Cloudflare, OAuth providers, Resend/SMTP where sent in email | Not fully defined | User edit/delete partially detected | Medium | Avoid requiring unless needed. |
| Login credentials or OAuth identifiers | password hash, app password audit, provider user ID, Apple private relay email, OAuth metadata | Login/register, OAuth callbacks, app password creation | Authentication and account linking | User System tables, Mail gateway audit, OAuth metadata | OAuth providers, Apple, Cloudflare | Session and credential retention not fully defined | Password reset/delete partially detected | High | Plain-text password storage not detected; token handling still needs review. |
| Session / token data | session token hash, JWT, cookies, API keys, app passwords, auth token in localStorage, Keychain tokens | Login, API auth, native apps, developer APIs | Keep users signed in, authorize APIs, secure services | D1/session tables, cookies, localStorage, Keychain, API key tables | Cloudflare, Apple platform storage, GitHub Actions if secrets mishandled | Not fully defined | Sign out, revoke API key where implemented | High | Extract web app localStorage token is an XSS risk. |
| Uploaded files | PDFs, DOCX, CSV, XLSX, TXT, MD, molecule files, file names, R2 keys, checksums | File System, Extract upload, Molecule import | Storage, preview, sharing, extraction, molecule workflows | Cloudflare R2, D1 metadata, local app storage for local-only molecule library | Cloudflare, OpenAI if extracted, Apple if uploaded from app | Not fully defined | Delete partially detected, share revoke detected | High | Needs upload limits, scanning/quarantine, deletion/export. |
| Email content | subject, text, HTML, raw EML, mailbox content, attachments | ChemVault Mail sending/receiving | Mailbox service, delivery, search, admin/abuse review | Mail worker D1, R2 attachments, Maildir/local gateway storage, logs/metadata | Resend/SMTP, Cloudflare Email, Cloudflare storage | Not fully defined | Delete/archive partially detected | Critical | Highly sensitive. Admin all-mail access needs strict control. |
| Email metadata | sender, recipients, headers, message ID, status, delivery events, IP, app password event | Mail gateway, worker, provider webhooks | Routing, delivery, abuse prevention, audit, search | Mail DB, audit logs, metadata JSONL, provider logs | Resend/SMTP, Cloudflare, DNS/email providers | Not fully defined | Limited user control | High | Logs and retention must be defined. |
| AI input data | uploaded document chunks, prompts, user instructions, molecule input, OpenAI test requests | Extract app, AI routes, molecule generation | AI extraction, classification, summaries, structured data, generation | Extract DB/storage, worker queues, provider request logs where applicable | OpenAI, Cloudflare, possibly other AI providers | Not fully defined | Delete/export not product-wide | High | Needs prominent notice and provider contract review. |
| AI output data | extracted tables, entities, summaries, citations, task results, review corrections, exports | AI provider responses, extraction workers, user review | Scientific extraction, review, export, project workflows | Extract DB, Notification result tables, exports, logs | OpenAI, Cloudflare, Supabase if configured | Not fully defined | Review/correct/delete partially detected | High | Must not be presented as verified scientific truth. |
| Device / browser information | user agent, OS, browser, device, app version, TestFlight diagnostics | HTTP requests, login/session, Mail user table, Notification push, Apple apps | Security, compatibility, logs, diagnostics, push delivery | User sessions, Mail user table, Notification DB, logs, Apple systems | Cloudflare, Apple, Supabase if configured | Not fully defined | Limited user control | Medium | App Privacy Details must confirm diagnostics collection. |
| IP address | request IP, login IP, active IP, audit IP, Cloudflare connecting IP | Requests, login, mail gateway, audit logs, Cloudflare | Security, abuse prevention, region detection, logs | Service logs, User/Mail/audit tables, Cloudflare logs | Cloudflare, Apple/third-party region lookup if used | Not fully defined | Limited user control | Medium | Main Apple app detects country/region from public IP APIs. |
| Logs | API errors, audit logs, mail audit, webhook logs, provider errors, Cloudflare Workers logs | All services | Security, debugging, abuse review, compliance evidence | D1/Supabase tables, JSONL logs, Cloudflare logs, provider logs | Cloudflare, GitHub Actions, Supabase, providers | Not fully defined | Limited user control | High | Redaction and retention policy needed. |
| Payment and subscription data if billing is enabled | Stripe customer/subscription/event IDs, plan, status, checkout session reference, and metered usage; no full card number | Main billing API and signed Stripe webhooks | Checkout, portal, entitlement resolution, cancellation, reconciliation, and quota enforcement | Main D1 | Stripe | Stripe retention plus an approved ChemVault billing/usage retention schedule | Billing service secret, verified identity, signed webhooks, idempotent event and usage records | High | Public checkout remains disabled pending legal, tax, refund, support, secret, migration, and canary approval. |
| App analytics if present | feature usage, screens, events | Not currently detected as third-party analytics SDK | Product analytics if added | Not currently detected | Not currently detected | Not currently detected | Not currently detected | Medium | Do not declare absent without checking app binaries/provider dashboards. |
| Crash logs if present | crash reports, stack traces, device info | Apple TestFlight/App Store diagnostics if enabled | Debugging and reliability | Apple systems, developer tools | Apple | Apple-controlled and configuration-dependent | Apple/device settings, limited app control | Medium | App Privacy Details must reflect diagnostics. |
| Admin operation logs | role changes, mail status changes, all-mail access, file delete, API key action, audit reason | Admin APIs and dashboards | Accountability, abuse prevention, security review | User audit logs, Mail logs, Notification audit logs, Extract audit logs | Cloudflare, Supabase if configured | Not fully defined | Limited user control | High | Needs standard schema, retention, and access restrictions. |
| Contact / lead data | name, email, organization, role, team size, interests, message | Website forms, commercial pages, Extract contact form | Support, sales, waitlist, onboarding | Main D1 `leads`, localStorage fallback, Extract DB | Cloudflare, email provider if sent | Not fully defined | Request deletion/export needed | Medium | Browser fallback local storage should be reviewed. |
| Push notification data | endpoint, p256dh, auth secret, notification preferences, read state | Notification web/app push subscription | Deliver push notifications and service alerts | Notification DB/Supabase tables | Browser push services, Apple/Google push ecosystems, Supabase if configured | Not fully defined | Opt-out/delete subscription needed | High | Push endpoint and keys are sensitive. |
| Webhook data | event payloads, delivery attempts, response preview, status, API key prefix | Notification and Extract webhook systems | Integrations, delivery, debugging | D1/Supabase tables, worker logs | Cloudflare, external webhook recipients | Not fully defined | Admin/developer controls partially detected | High | Response previews can expose third-party data. |
| API key data | hashed service keys, prefixes, scopes, last used, expiration | Notification and Extract developer APIs | Service authentication and integration | D1/Supabase tables | Cloudflare, Supabase if configured | Not fully defined | Revoke/rotate where implemented | High | Raw keys should never be stored or logged. |
| Local app preferences | theme, language, cached region, base URL, local molecule library, imported records | Browser and Apple apps | User experience and offline/local workflows | localStorage, UserDefaults, Keychain | Apple platform storage for native apps | Until user clears app/browser data unless app deletes | User can clear app/browser data, app controls needed | Medium | Must not call local-only if data is sent to APIs. |

## Retention Gaps

Retention is not fully defined for:

- email content, raw EML, attachments, metadata, and audit logs;
- uploaded files, deleted files, previews, shares, and object storage versions;
- AI prompts, document chunks, outputs, corrections, exports, and provider logs;
- Cloudflare Workers logs and provider logs;
- webhooks and response previews;
- push subscriptions and notification history;
- API key audit events;
- contact/lead records;
- backups and deleted-account residual records.

Needs legal review and implementation.

## User Control Gaps

Detected partial controls:

- user account deletion exists in part of the User System;
- sign out/session clearing exists in parts of the system;
- file deletion and share revocation are partially implemented;
- mail delete/archive actions are present;
- API key revoke/expiration behavior exists in some services.

Missing or incomplete controls:

- product-wide account deletion;
- product-wide data export;
- clear retention schedule;
- AI input/output deletion;
- email content and metadata export/delete rules;
- push subscription opt-out/delete clarity;
- lead/contact data deletion/export;
- App Store account deletion entry point.

## Risk Level Summary

Critical:

- email content and raw mailbox data;
- secrets and developer/private keys;
- all-mail admin access where broad content is visible.

High:

- uploaded files;
- AI inputs and outputs;
- session/token data;
- logs and audit records;
- push subscriptions;
- API keys and webhooks;
- cross-service deletion/export gaps.

Medium:

- names, profile information, local preferences, app diagnostics, lead data, device/browser info, IP address.

Low:

- public website content and non-personal public record data, assuming it contains no user-submitted personal or confidential information.

## Required Updates Before Launch

1. Confirm production storage and processors for every service.
2. Add retention periods by data category.
3. Add deletion and export behavior by data category.
4. Confirm App Privacy Details from exact Apple app binaries.
5. Publish subprocessor list and legal contact information.
6. Add user-facing notices for AI, files, mail, push, and contact forms.
7. Implement log redaction and retention.
8. Review all high-risk categories with legal counsel.
