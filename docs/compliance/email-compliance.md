# ChemVault Mail Compliance and Anti-Abuse Review

Draft compliance document. This is not legal advice. Needs legal review before commercial launch.

Last reviewed: July 2, 2026

## Remediation Status Update

Completed in this pass:

- Mail SMTP gateway now centralizes baseline send limits: 20 recipients per message, 5 messages per minute, 100 messages per day, 10 MB per attachment, and blocked executable/script/HTML attachment extensions.
- Mail SMTP gateway tests cover recipient limit and dangerous attachment rejection.
- Mail worker send path now normalizes recipients/attachments, rejects suspended/non-normal users, applies KV-backed minute/day send limits when KV is available, and suppresses provider error details.
- Mail deployment initialization no longer sends `JWT_SECRET` in a URL path; it uses `POST /api/init` with an Authorization header.
- The workflow masks `JWT_SECRET` before use.

Partially completed:

- Persistent mail limits depend on KV availability in the Mail worker and in-memory limits in the SMTP gateway. Production should use durable storage and provider webhooks.
- CI still generates a temporary Wrangler config from placeholders. Move sensitive values to provider-native secret bindings before production.

Needs backend/provider configuration:

- Resend domain verification, SPF, DKIM, DMARC, bounce handling, complaint handling, and suppression lists.
- Abuse review queue and automated suspension based on complaints/bounces.
- Marketing email unsubscribe and consent controls before any marketing use.

## 1. Email Sending Purpose

ChemVault Mail appears intended to support:

- authenticated user mailbox access;
- sending and receiving user email;
- app password based SMTP access;
- transactional and service email;
- internal service synchronization with the User System;
- administrative review of mail accounts and abuse cases;
- delivery through Resend, Cloudflare Email, SMTP, or other configured providers.

ChemVault Mail should not be used for marketing email until consent, unsubscribe, suppression, sender identity, and jurisdiction-specific requirements have been reviewed and implemented.

## 2. Prohibited Email Activity

ChemVault Mail users and administrators must not use the service for:

- spam or unsolicited bulk email;
- phishing, credential theft, or deceptive login prompts;
- forged sender identity, misleading headers, or impersonation;
- malware, malicious links, malicious attachments, or exploit delivery;
- harassment, threats, fraud, or unlawful content;
- bulk marketing email without authorization and unsubscribe controls;
- attempts to evade provider limits, blocklists, complaints, or enforcement systems.

These restrictions should be mirrored in the Terms of Service and internal administrator playbooks.

## 3. Current Code-Level Findings

| Control | Current Detection | Risk | Recommendation |
| --- | --- | --- | --- |
| Rate limit | SMTP gateway has in-memory login failure limiter. Mail worker has role/send-count checks. Daily SMTP limit is configured but not clearly enforced in gateway. | High | Add persistent per-user, per-domain, per-IP, per-recipient, and per-account send limits. Enforce configured daily SMTP limit. |
| Abuse detection | No complete spam/phishing scoring, complaint processing, bounce handling, or reputation workflow detected. | High | Add abuse heuristics, provider webhook processing, complaint tracking, admin review queues, and automatic holds. |
| Sender verification | SMTP gateway enforces envelope sender equals authenticated user. Mail worker checks account ownership and domain permissions. | Medium | Keep this control and add domain verification checks in admin UI and deployment docs. |
| Domain verification | Resend/domain verification is expected operationally, but code-level verification state was not confirmed. | High | Document DNS verification, SPF, DKIM, DMARC, bounce domain, and verified sender requirements. Needs technical confirmation. |
| Email logging | Gateway writes audit logs and metadata. Mail worker stores messages, attachments, status, and daily stats. | High | Define log retention, redact sensitive fields where possible, restrict admin access, and avoid logging full content unless necessary. |
| Admin suspension | User System migrations include mail status fields and permissions. Mail worker has send type and status checks. | Medium | Provide a documented suspension playbook and verify all send paths honor suspension state. |
| User role check | Mail worker has permission middleware and role checks. Gateway internal endpoints use bearer token. | High | Review all admin/all-mail/internal endpoints for least privilege and audit logging. |
| Attachment restrictions | Mail worker limits attachment count. No complete size, MIME type, malware scan, or gateway attachment policy detected. | High | Add attachment size/type limits, scanning, and rejection/quarantine rules. |
| Internal secrets | Mail deploy workflow writes secrets into a temporary config and calls an init URL containing `JWT_SECRET`. | Critical | Remove secrets from URL paths and avoid writing secrets to files in CI where possible. Rotate any exposed token. |

## 4. GitHub-Style TODO Checklist

- [ ] Enforce persistent send rate limits across SMTP gateway and mail worker.
- [ ] Enforce `DAILY_SMTP_LIMIT` or replace it with a documented quota policy.
- [ ] Add per-user, per-IP, per-domain, per-recipient, and per-organization sending limits.
- [ ] Add abuse detection for phishing indicators, suspicious links, repeated complaints, bounce spikes, and unusual volume.
- [ ] Add provider webhook handling for bounces, complaints, blocks, and delivery failures.
- [ ] Add an admin abuse review queue.
- [ ] Add account suspension controls that block every mail sending path.
- [ ] Add domain verification status checks for sender domains.
- [ ] Document SPF, DKIM, DMARC, bounce handling, and verified sender setup.
- [ ] Add attachment size limits, MIME type allow/deny lists, archive handling, and malware scanning or quarantine.
- [ ] Add unsubscribe and suppression list handling before any marketing email is sent.
- [ ] Publish abuse reporting through contact@chemvault.science until a dedicated abuse mailbox is confirmed.
- [ ] Add privacy-preserving log retention rules for email content, metadata, audit logs, and raw messages.
- [ ] Review admin all-mail access for least privilege and emergency-only use.
- [ ] Remove any secret values from deployment URLs, logs, and generated CI config files.
- [ ] Add tests for sender spoofing, suspended users, quota exhaustion, attachment rejection, and abuse holds.

## 5. Resend / SMTP Provider Acceptable Use Checklist

Before production email launch, confirm:

- [ ] Sending domains are verified with the provider.
- [ ] SPF records are configured.
- [ ] DKIM records are configured.
- [ ] DMARC policy is configured and monitored.
- [ ] Bounce and complaint webhooks are configured.
- [ ] Provider acceptable use policy has been reviewed.
- [ ] Provider limits and prohibited content rules are reflected in ChemVault rules.
- [ ] Sender identity is accurate and not misleading.
- [ ] Users cannot send from unauthorized domains.
- [ ] Rate limits are compatible with provider limits.
- [ ] Abuse reports can be investigated quickly.
- [ ] Suppression lists are respected.
- [ ] Marketing email is disabled unless consent and unsubscribe controls are implemented.
- [ ] Logs and webhooks do not expose secrets or unnecessary message content.
- [ ] Provider data processing terms are reviewed. Needs legal review.

Official reference points used for this review:

- Resend Acceptable Use Policy: https://resend.com/legal/acceptable-use
- Resend domain verification documentation: https://resend.com/docs/dashboard/domains/introduction
- FTC CAN-SPAM compliance guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business

## 6. Recommended Sending Rules

ChemVault should implement these baseline rules before broad access:

- verified account required for sending;
- verified sender domain required for custom domains;
- no sending from another user's mailbox or domain without explicit permission;
- per-user and per-organization quotas;
- stricter limits for new accounts;
- block or review accounts with high bounce, complaint, or failure rates;
- reject executable or dangerous attachments;
- block obviously deceptive sender names, subjects, or links;
- require unsubscribe and suppression handling for any marketing or bulk email;
- require administrator review for high-volume sending.

## 7. Administrator Suspension Playbook

Administrators should have a documented workflow to:

1. identify suspicious sending from logs, complaints, provider webhooks, or user reports;
2. suspend the account, mailbox, app password, API key, or domain;
3. stop queued messages where technically possible;
4. preserve relevant audit evidence with access restrictions;
5. notify affected users or providers where required;
6. require remediation before reactivation;
7. document the decision in admin audit logs.

All suspension actions should be auditable and limited to authorized administrators.

## 8. Terms of Service Synchronization

The Terms of Service should include:

- no spam or unauthorized bulk email;
- no phishing, impersonation, malware, or malicious attachments;
- no sender spoofing or misleading headers;
- no marketing email without required consent and unsubscribe mechanisms;
- ChemVault right to rate limit, suspend, reject, quarantine, or delete abusive email;
- user responsibility for recipient permissions and content legality;
- provider rules may also apply.

## 9. Open Compliance Questions

| Question | Status |
| --- | --- |
| Does ChemVault intend to offer user-to-user mailbox hosting publicly? | Needs business confirmation |
| Will users be allowed to send marketing email? | Needs business and legal review |
| Which domains can users send from? | Needs technical confirmation |
| Are SPF, DKIM, DMARC, bounce domains, and provider webhooks configured in production? | Needs technical confirmation |
| How long will raw email, metadata, attachments, and audit logs be retained? | Needs legal review |
| Who may access all-mail admin views and under what conditions? | Needs legal and security review |
| What is the official abuse contact address? | Needs operational confirmation |

## 10. Risk Summary

Critical:

- Deployment workflow may expose `JWT_SECRET` through an initialization URL and temporary configuration file handling.

High:

- Incomplete persistent sending limits and abuse detection.
- Incomplete attachment restrictions and scanning.
- Email content and metadata logging require retention and access controls.
- Admin all-mail access needs strict least-privilege controls and audit review.

Medium:

- Sender ownership checks exist but domain verification status must be confirmed.
- Suspension controls exist in parts of the system but need end-to-end verification.
