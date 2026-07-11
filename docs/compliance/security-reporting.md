# Security and Abuse Reporting Operations

This document defines the current intake and triage intent. It does not create a bug bounty program, safe-harbor promise, legal waiver, or authorization to test production systems without written approval.

## Intake

- Public security reports enter through `https://forms.chemvault.science/security-report`.
- The form requires server-validated Cloudflare Turnstile, issues an opaque ticket reference, and avoids exposing report contents in public URLs.
- Reporters must not submit passwords, API keys, private keys, recovery codes, session tokens, or other credentials.
- `contact@chemvault.science` is the fallback contact. Its monitoring and escalation path is a launch gate in the issue register.

## Triage targets

These are operational targets, not guarantees. The incident lead may adjust them based on scope, evidence quality, safety, and third-party dependencies.

| Severity | Example impact | Acknowledge target | Initial containment target |
| --- | --- | --- | --- |
| Critical | Active account takeover, exposed production credential, cross-tenant data access | 24 hours | 72 hours |
| High | Repeatable unauthorized access, stored sensitive-data exposure, mail abuse at scale | 2 business days | 5 business days |
| Medium | Limited-scope weakness with meaningful prerequisites | 5 business days | Planned remediation |
| Low | Hardening, misleading content, low-impact abuse | 10 business days | Backlog review |

## Routing

| Category | Accountable role | Evidence boundary |
| --- | --- | --- |
| Identity, sessions, lifecycle | User Center owner | Authentication and lifecycle audit events |
| Files, malicious uploads, sharing | Files owner | File metadata, access history, scan/quarantine state |
| AI extraction and analysis | Lab owner | Job, outbox and result identifiers; no raw user content in general triage notes |
| Spam, phishing and sender abuse | Mail owner | Message and sender identifiers with restricted content access |
| Product notifications and webhooks | Notifications owner | Event IDs, delivery attempts and deep links |
| Public forms and privacy requests | Forms/compliance owner | Ticket ID, status and minimum required report data |

## Handling rules

- Restrict raw report evidence to assigned responders.
- Store general issue-register entries without secrets or raw user content.
- Use opaque user, job, file and event identifiers wherever possible.
- Record containment, deletion, suspension and disclosure decisions in the relevant service audit trail.
- Retain security-form records for 90 days by default, unless an active investigation or legal requirement needs a documented exception.
- Review privacy notification, vulnerability disclosure and takedown language with counsel before commercial launch.

## Launch checks

- Confirm that the public form domain runs the Turnstile-enabled build and both Turnstile keys are configured.
- Confirm that the fallback mailbox is monitored and has an on-call escalation path.
- Run one harmless end-to-end test report and verify private delivery, ticket lookup and deletion after the retention window.
- Confirm the issue register has an owner, status, evidence and recheck date for every open critical or high item.
