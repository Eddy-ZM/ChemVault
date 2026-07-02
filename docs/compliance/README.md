# ChemVault Compliance Documentation

Draft compliance index. This is not legal advice. Human legal review is required before commercial launch.

Last reviewed: July 2, 2026

## Compliance Overview

This folder tracks ChemVault privacy, legal, security, Apple, email, data governance, and remediation work across:

- ChemVault main website;
- ChemVault Mail;
- User System;
- Docs;
- File System;
- Notification System;
- Molecule Model / Molecule Studio;
- Extract / AI Scientific Data Extraction;
- iOS / macOS Apple apps and TestFlight builds;
- Cloudflare Pages, Workers, D1, R2, KV, and Turnstile;
- Resend / SMTP email delivery;
- GitHub repositories, workflows, and environment variables.

The current documents are working drafts based on repository review and public official references. They do not prove that ChemVault is legally compliant.

## Core Review Documents

| Document | Purpose |
| --- | --- |
| [Compliance Audit Report](./compliance-audit-report.md) | Current data processing, third parties, sensitive data, permission risks, logging, secrets, deletion/export gaps, App Store risks, and legal review items. |
| [Data Map](./data-map.md) | Data categories, examples, sources, purposes, storage locations, processors, retention, user controls, and risk levels. |
| [Code Remediation Plan](./code-remediation-plan.md) | Prioritized Critical/High/Medium/Low code and documentation remediation plan. |
| [Compliance Issues](./compliance-issues.md) | GitHub-style backlog with acceptance criteria and suggested files to change. |
| [Secret Risk Report](./secret-risk-report.md) | Secret scan scope, risky credential paths, Git tracking findings, and rotation guidance. |
| [File Upload Security](./file-upload-security.md) | Upload allow/block policy, size limits, remaining scan/quarantine work. |
| [Admin Audit Log](./admin-audit-log.md) | Audit schema and required coverage for sensitive admin actions. |
| [AI Data Handling](./ai-data-handling.md) | AI notices, third-party processing risks, and remaining retention/export work. |
| [Security Reporting](./security-reporting.md) | Public vulnerability and abuse reporting process draft. |

## Legal Documents

| Document | Status |
| --- | --- |
| [Privacy Policy](../legal/privacy-policy.md) | Draft only. Needs legal review before publication. |
| [Terms of Service](../legal/terms-of-service.md) | Draft only. Needs legal review before publication. |
| [Data Retention Policy](../legal/data-retention-policy.md) | Draft only. Needs legal review and concrete retention periods. |
| Cookie Policy | Not yet created. Needs legal review if cookies, local storage, analytics, marketing, or tracking expand. |
| Acceptable Use Policy | Partially covered by Terms and Email Compliance. Consider standalone policy before public launch. |

## Privacy Documents

Privacy-related work is tracked in:

- [Data Map](./data-map.md)
- [Privacy Policy](../legal/privacy-policy.md)
- [Code Remediation Plan](./code-remediation-plan.md)
- [Compliance Issues](./compliance-issues.md)

Open privacy gaps:

- product-wide account deletion;
- product-wide data export;
- retention schedule;
- cookie/local storage notice;
- AI input/output processing notice;
- email content and metadata disclosure;
- file upload and sharing disclosure;
- App Store Privacy Details.

## Apple Compliance

Apple and TestFlight work is tracked in:

- [Apple App Store and TestFlight Compliance Review](./apple-app-compliance.md)
- [App Privacy Details Draft](../app-store/privacy-details-draft.md)
- [TestFlight Review Checklist](../app-store/testflight-review-checklist.md)
- [Beta Description Draft](../app-store/beta-description.md)
- [What to Test Draft](../app-store/what-to-test.md)

Key Apple pre-submission items:

- public privacy policy URL;
- support URL or support email;
- App Privacy Details;
- TestFlight Beta App Description;
- What to Test text;
- Sign in with Apple review;
- account deletion flow;
- AI/scientific disclaimers;
- no secrets in app bundles or developer artifacts.

## Email Compliance

Email compliance and anti-abuse work is tracked in:

- [Email Compliance and Anti-Abuse Review](./email-compliance.md)

Key email items:

- no spam, phishing, impersonation, or malicious attachments;
- persistent send rate limits;
- domain verification;
- SPF, DKIM, DMARC, bounce, and complaint handling;
- unsubscribe and suppression controls before marketing email;
- admin suspension workflow;
- abuse reporting contact;
- log retention and access controls.

## Data Map

The [Data Map](./data-map.md) should be updated when any service adds or changes:

- account or profile fields;
- OAuth or session identifiers;
- files, mail, notifications, AI data, or molecule data;
- logs, audit events, webhooks, API keys, or push subscriptions;
- analytics, crash reporting, payments, or third-party processors;
- retention, deletion, or export behavior.

## Remediation Plan

The [Code Remediation Plan](./code-remediation-plan.md) should be used as the current implementation roadmap.

## Remediation Status

| Item | Status | Notes |
| --- | --- | --- |
| Public Privacy/Terms pages | Completed | `/privacy` and `/terms` routes added on the main site. Draft/legal review warnings remain. |
| Security / abuse page | Completed | `/security` route added with placeholder Forms links. Operational contacts still need confirmation. |
| Footer legal links | Completed | Main site footer links privacy, terms, security/abuse, and Forms. Extract footer also links legal pages. |
| Login/register/OAuth legal notices | Completed | User System and Extract auth entry points include Terms/Privacy notices. |
| Account deletion request flow | Partially completed | Main site page and main API request/admin endpoints added. Cross-service deletion remains needed. |
| Data export request flow | Partially completed | Main site page and main API request/admin endpoints added. Cross-service export remains needed. |
| Secret ignore rules and placeholders | Completed | Main and relevant service `.gitignore` and `.env.example` files updated. Apple `.p8` still needs manual handling. |
| Mail anti-abuse baseline | Partially completed | Gateway/worker limits and attachment checks added. Durable abuse detection/provider webhooks still needed. |
| File upload restrictions | Partially completed | Files service enforces size/type restrictions. Malware scanning and object checksum verification still needed. |
| Admin audit log | Partially completed | Main API schema/helper added. Other services need integration. |
| AI data handling notice | Completed | Main AI page and Extract upload/extraction screens now include notices. Retention/export still needs backend work. |
| Apple App Store docs | Completed | Draft privacy details, beta description, checklist, and What to Test added. Needs Apple/legal review. |
| Environment variable inventory | Completed | `ENVIRONMENT_VARIABLES.md` now has a consolidated variable table. |
| GitHub Issues | Completed if created via `gh`; otherwise needs manual commands | Check final summary for issue creation results. |

Recommended execution order:

1. Remove secret exposure patterns and rotate affected credentials.
2. Publish and link privacy, terms, support, and abuse contacts.
3. Implement account deletion and data export.
4. Harden Mail anti-abuse controls.
5. Harden file upload and AI data handling.
6. Restrict CORS and sanitize API errors.
7. Standardize audit logging and retention.
8. Complete Apple privacy and TestFlight review.

## Open Issues

Use [Compliance Issues](./compliance-issues.md) as the initial backlog. Each item includes:

- title;
- priority;
- area;
- description;
- acceptance criteria;
- suggested files to change.

These issues should be copied into GitHub Issues or a project tracker before commercial launch.

## Human Legal Review Required

Human legal review is required before commercial launch for:

- Privacy Policy;
- Terms of Service;
- Cookie Policy;
- data processing agreements and subprocessors;
- App Store Privacy Details;
- TestFlight disclosures;
- email acceptable use and anti-spam requirements;
- AI and scientific extraction disclaimers;
- minors, students, schools, and education users;
- data deletion, export, retention, and backup exceptions;
- payment, subscription, tax, refund, and consumer protection terms;
- limitation of liability, governing law, dispute resolution, and warranty disclaimers.

## Human Technical / Security Review Required

Technical and security review is required for:

- secret management and rotation;
- CI/CD secret handling;
- admin permissions and break-glass access;
- account deletion orchestration;
- data export implementation;
- file upload validation and scanning;
- email abuse detection and provider webhooks;
- AI provider configuration and log redaction;
- CORS, CSRF, XSS, and token storage;
- audit log retention and sensitive data redaction;
- Apple app binary behavior and privacy labels.
