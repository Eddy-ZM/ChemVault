# ChemVault Compliance Audit Report

Draft compliance review. This is not legal advice and does not conclude that ChemVault is legally compliant. High-risk legal, privacy, Apple, email, AI, and data protection items require review by qualified counsel or a professional advisor before commercial launch.

Last reviewed: July 2, 2026

## 1. Scope and Method

This report reviews the local ChemVault workspace, including:

- `chemvault` main website, API routes, D1 schema, scripts, Apple app notes, and deployment docs;
- `ChemVault-user` user management, sessions, roles, OAuth, Turnstile, and mail authority migrations;
- `ChemVault-Mail` mail worker, SMTP gateway, Resend/SMTP configuration, admin all-mail APIs, and deployment workflow;
- `ChemVault-files` file upload, R2 storage, sharing, roles, and activity logs;
- `ChemVault-notif` notification, push, audit, API key, webhook, project message, and extraction result tables;
- `ChemVault-app/chemvault-extract` AI scientific extraction, uploads, OpenAI key handling, API keys, webhooks, and rate limits;
- `ChemVault-molstudio` molecule web/native app features and molecule generation routes;
- Apple app documentation and detected native app behavior;
- Cloudflare Workers/Pages/D1/R2/KV/Turnstile configuration, Resend settings, GitHub Actions, and environment variable examples.

This review is code- and document-based. It does not inspect production dashboards, provider consoles, DNS records, Cloudflare logs, App Store Connect metadata, legal contracts, real secrets, or live databases. Those items are marked as "Needs technical confirmation" or "Needs legal review".

Official reference points used:

- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple TestFlight test information: https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/
- Resend Acceptable Use Policy: https://resend.com/legal/acceptable-use
- Resend domain verification documentation: https://resend.com/docs/dashboard/domains/introduction
- Cloudflare Data Processing Addendum: https://www.cloudflare.com/cloudflare-customer-dpa/
- Cloudflare Privacy Policy: https://www.cloudflare.com/privacypolicy/
- Cloudflare Turnstile privacy information: https://www.cloudflare.com/turnstile-privacy-policy/
- Cloudflare Workers Logs documentation: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- OpenAI API data controls documentation: https://developers.openai.com/api/docs/guides/your-data
- OpenAI enterprise privacy information: https://openai.com/enterprise-privacy/
- GitHub Actions secure use documentation: https://docs.github.com/en/actions/reference/security/secure-use
- FTC CAN-SPAM compliance guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- FTC children's privacy guidance: https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy

## 2. Executive Summary

ChemVault has useful early controls, including hashed session tokens, role and permission migrations, Cloudflare Turnstile in production registration, some audit logging, API key hashing, and provider secret examples. However, the project is not yet ready to be described as fully compliant or production-complete.

Critical gaps:

- local Apple developer private key material was detected in the workspace and needs secure handling review;
- Mail deployment appears to pass `JWT_SECRET` in an initialization URL and write secrets into CI-generated config;
- product-wide account deletion is incomplete across User, Mail, Files, Notifications, Extract, AI outputs, logs, and Apple apps;
- privacy/terms links and final legal documents are not yet wired into all public and app surfaces.

High-risk gaps:

- no product-wide data export process;
- incomplete email anti-abuse, attachment, complaint, and persistent rate-limit controls;
- file uploads need stronger server-side validation, scanning/quarantine, and metadata verification;
- AI inputs/outputs need visible notices, retention rules, deletion/export handling, and provider contract review;
- App Store Privacy Labels are likely not ready because email, files, AI, identifiers, diagnostics, and region detection need exact mapping;
- admin all-mail and broad administrator roles need least-privilege review;
- logs may contain sensitive email, file, AI, webhook, IP, and audit data without a published retention schedule.

## 3. Current User Data Collected

| Data Type | Detected Examples | Source |
| --- | --- | --- |
| Account data | email, name, avatar, institution, role, status, organization membership | User System, main lead forms |
| Login credentials and identifiers | password hashes, OAuth provider IDs, session token hashes, app password audit, connected services | User System, Mail, Apple/OAuth flows |
| Session and security metadata | user agent, IP address, timestamps, role, permission checks | User System, Mail, Files, Notifications, Extract |
| Email content and metadata | sender, recipients, subject, text, HTML, headers, attachments, mailbox paths, delivery status | ChemVault Mail |
| Uploaded files | file name, size, MIME type, storage key, checksum, project/folder metadata, share token | File System, Extract |
| AI inputs and outputs | uploaded document text, prompts, extraction tasks, structured outputs, review corrections, exports | Extract / AI Scientific Data Extraction, Notification result tables |
| Molecule data | SMILES, PDB identifiers, molecule imports, local library entries, generated structures | Molecule Studio and native molecule app |
| Notifications | notification content, push subscription endpoints/keys, project messages, webhook events | Notification System |
| Logs and audit data | admin actions, mail audit, API key usage, webhook logs, route errors, Cloudflare logs | All services |
| Commercial/contact data | lead email, name, role, organization, interests, message | Main site and Extract contact flows |
| Device/browser data | IP address, browser, OS, user agent, Apple diagnostics/TestFlight data where applicable | User System, Mail, Notification, Apple/TestFlight, Cloudflare |
| Payment data | Not currently detected as live processing; billing placeholders and subscription tables exist | Main site schema/API placeholders |

## 4. Purpose and Necessity

Most detected data has a plausible product purpose:

- account and auth data are necessary for login, permissions, and security;
- email content and metadata are necessary to provide mailbox functions, but are highly sensitive;
- uploaded files and metadata are necessary for file storage, preview, sharing, and AI extraction, but require limits and retention rules;
- AI inputs and outputs are necessary for extraction workflows, but require clear notice and provider review;
- logs and audit events are necessary for security and abuse prevention, but must be minimized and access-controlled;
- contact/lead data is useful for commercial follow-up, but not necessary for core product use and needs clear consent/retention.

Data minimization gaps:

- raw email metadata and message storage retention is not fully defined;
- webhook response previews and AI extraction logs may retain more content than needed;
- local browser fallback storage for lead data should be removed or disclosed;
- broad admin access to all-mail and cross-service data needs stricter necessity controls.

## 5. Storage Locations

Detected or documented storage locations:

- Cloudflare D1 databases for main records/leads, User System tables, Mail worker tables, File System metadata, and other service data;
- Cloudflare R2 for files, avatars, mail attachments, generated assets, and object storage where configured;
- Cloudflare KV for quotas, stats, or service state where configured;
- Supabase tables for Notification System data if configured;
- Maildir or local filesystem storage in the Mail gateway for inbound/sent/raw mail where configured;
- browser `localStorage`, cookies, Keychain, and UserDefaults for theme, local leads, imported records, tokens, base URLs, language/region cache, and molecule local library;
- GitHub repository/workflows for code and deployment configuration, not intended for secrets;
- provider systems such as Resend, OpenAI, Apple, Cloudflare, GitHub, and OAuth providers.

Needs technical confirmation:

- production database schemas and retention settings;
- production R2/KV buckets;
- Cloudflare log retention;
- Supabase deployment status;
- actual App Store/TestFlight metadata and diagnostics settings.

## 6. Third-Party Services and Processors

Detected or likely third-party processors:

- Cloudflare: Pages, Workers, D1, R2, KV, Turnstile, DNS, routing, observability/logs;
- Resend / SMTP providers: email sending, routing, delivery metadata, and possibly content;
- OpenAI: AI extraction, model requests, user-provided prompts or document chunks where configured;
- Apple: App Store, TestFlight, Sign in with Apple, diagnostics, crash data, Keychain/platform services;
- GitHub: repositories, Actions, deployment workflows, issue tracking, and access logs;
- Supabase: Notification System data if production configuration uses it;
- OAuth providers: Apple, Google, GitHub, Microsoft identifiers and profile/email data where enabled;
- Stripe or another payment processor if billing is later activated.

Needs legal review:

- data processing agreements;
- subprocessor list;
- international data transfers;
- OpenAI and AI-provider settings/contracts;
- Resend/SMTP acceptable use and email compliance;
- Apple privacy labels and platform terms.

## 7. Sensitive and High-Risk Data

Sensitive or high-risk data exists or can exist in:

- email content, headers, recipients, attachments, and mailbox metadata;
- uploaded files, file names, previews, and public/private share links;
- AI prompts, document chunks, extraction outputs, corrections, and exports;
- scientific datasets that may be confidential, proprietary, regulated, or publication-sensitive;
- OAuth identifiers, session tokens, API keys, app passwords, and provider secrets;
- IP addresses, user agents, audit logs, webhook payloads, and admin logs;
- Apple TestFlight diagnostics and crash reports;
- minors or student data if ChemVault is used in education contexts.

All high-risk categories require stronger notices, access control, retention, deletion/export, and legal review.

## 8. Required Audit Questions

| # | Question | Finding |
| --- | --- | --- |
| 1 | What user data is collected? | Account, auth, session, email, file, AI, molecule, notification, lead/contact, device/browser, IP, logs, and possible Apple diagnostic data. |
| 2 | Purpose for each data type? | Authentication, permissions, mailbox, file storage, AI extraction, notification delivery, abuse prevention, support, commercial follow-up, auditing, and service operation. |
| 3 | Is each data type necessary? | Many are necessary for the related feature. Lead data, raw previews, broad logs, and broad admin access require minimization review. |
| 4 | Where is data stored? | Cloudflare D1/R2/KV, Supabase where configured, local browser/app storage, Maildir/local gateway storage, provider systems, and GitHub for code/config. |
| 5 | Is data sent to third parties? | Yes, depending on feature: Cloudflare, Resend/SMTP, OpenAI, Apple, GitHub, Supabase, OAuth providers, and future payment processors. |
| 6 | Which third parties? | Cloudflare, Resend, OpenAI, Apple, GitHub, Supabase, Google/Microsoft/OAuth providers, Stripe if enabled. |
| 7 | Sensitive data? | Yes. Email, files, AI inputs/outputs, logs, identifiers, tokens, and scientific data can be sensitive. |
| 8 | High-risk email/files/research/AI data? | Yes. These are core ChemVault risk areas. |
| 9 | Undisclosed collection? | Public legal docs and site links were missing before this documentation work. Product UI notices remain incomplete. |
| 10 | Privilege escalation risk? | Needs security review. Role systems exist, but admin/all-mail and cross-service permissions are broad in places. |
| 11 | Admin permissions too broad? | Yes risk. Owner/super/admin and all-mail access require least-privilege and break-glass review. |
| 12 | Excessive logging? | Possible. Mail metadata, webhook logs, AI/provider errors, Cloudflare logs, and audit metadata need retention/redaction rules. |
| 13 | Secret leakage risk? | Yes. Local Apple private key material and Mail CI secret handling are Critical. |
| 14 | User deletion missing? | Partial. User System deletion exists, but product-wide deletion was not detected. |
| 15 | User export missing? | Yes. No complete cross-service export flow detected. |
| 16 | Privacy policy inconsistent with code? | A production privacy policy was not detected before this draft. Needs publication and ongoing synchronization. |
| 17 | App Store Privacy Label risk? | High. Email, files, AI data, identifiers, diagnostics, and region detection must be mapped per app. |
| 18 | Email abuse risk? | High. Some sender checks exist, but persistent anti-abuse, complaint, attachment, and quota controls are incomplete. |
| 19 | Age/minor/education risk? | Present if ChemVault is used by minors, students, schools, or education programs. Needs legal review. |
| 20 | What requires lawyer confirmation? | Privacy, Terms, cookie/tracking, email rules, AI disclaimers, DPA/subprocessors, minors/education, App Store labels, payments, liability, retention/deletion. |

## 9. Positive Controls Detected

- User System session cookies are configured with HttpOnly/Secure/SameSite behavior in production paths.
- Session tokens are hashed in storage.
- Passwords appear to use hashing rather than plain-text storage.
- OAuth flows include state/nonce handling and verified email checks.
- Cloudflare Turnstile is required in production registration paths.
- User System includes role/permission tables and audit logs.
- Notification System includes RLS-style policies, hashed service API keys, and audit sanitization.
- Extract includes API key hashing, encrypted user OpenAI keys, scoped API keys, and rate-limit middleware.
- Mail gateway enforces SMTP envelope sender equals authenticated user.
- File System checks read/write permissions and share revocation fields.

These controls reduce risk but do not remove the need for remediation.

## 10. Critical Findings

1. Local Apple developer private key material is present in the workspace. Needs technical confirmation and possible rotation.
2. Mail deployment appears to include `JWT_SECRET` in an initialization URL. Needs immediate remediation and possible rotation.
3. Mail deployment writes secrets into generated CI config. Needs safer secret injection.
4. Cross-service account deletion is incomplete. Needs legal and technical review before App Store/commercial launch.

## 11. High Findings

- Data export process is missing.
- Public legal links are incomplete across web/app surfaces.
- Email anti-abuse controls are incomplete.
- File upload restrictions and scanning/quarantine are incomplete.
- AI input/output notices, retention, and deletion/export handling are incomplete.
- Admin all-mail and broad administrator access need least-privilege review.
- Logs may contain sensitive data without defined retention/redaction.
- App Store Privacy Labels are likely not ready.
- CORS, CSRF, XSS, token storage, and error disclosure require security review.
- Age, minors, students, and education-user handling is not defined.

## 12. Required Human Review

Needs legal review:

- final Privacy Policy, Terms of Service, Cookie Policy, and Acceptable Use Policy;
- App Store Privacy Details and TestFlight disclosures;
- Resend/SMTP acceptable use, anti-spam, CAN-SPAM, and marketing email;
- AI provider contracts, data handling, and scientific/medical/regulatory disclaimers;
- DPA/subprocessors and international transfers;
- minors, student, school, and education use;
- payment, refund, subscription, tax, and consumer terms;
- liability limits, governing law, dispute resolution, and warranty disclaimers;
- retention, deletion, export, and backup exceptions.

Needs technical/security review:

- secret rotation and CI secret handling;
- Cloudflare/Resend/OpenAI/Apple/GitHub dashboard configuration;
- production database schemas and access policies;
- upload validation and malware scanning;
- email abuse controls and provider webhooks;
- admin permissions and audit logs;
- data deletion/export orchestration;
- logging, redaction, and retention;
- Apple app binary behavior and metadata.

## 13. Immediate Next Steps

1. Remove secret exposure patterns and rotate affected credentials where needed.
2. Publish and link Privacy Policy, Terms, support, and abuse contacts.
3. Implement account deletion and data export across services.
4. Harden email anti-abuse, attachment, suspension, and provider webhook handling.
5. Harden file upload validation, scanning/quarantine, and object metadata verification.
6. Add AI data handling notices, retention, and deletion/export support.
7. Restrict CORS, sanitize API errors, and review CSRF/XSS/token storage.
8. Complete App Store Privacy Label and TestFlight review from exact app binaries.
9. Have qualified legal counsel review all legal documents before commercial launch.
