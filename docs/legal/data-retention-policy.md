# Data Retention Policy

Draft only. Needs legal review.

Last reviewed: July 8, 2026

This draft describes ChemVault retention principles. Retention period to be confirmed before commercial launch unless stated otherwise.

This policy is a planning document, not a guarantee that every ChemVault service already enforces the same retention period or deletion workflow. Retention settings must be aligned with actual databases, object storage, backups, logs, provider dashboards, contracts, and legal obligations before commercial launch. Needs legal review.

| Data Category | Examples | Draft Retention Principle | User Control | Notes |
| --- | --- | --- | --- | --- |
| Account data | email, name, user id, roles, OAuth links | Retain while account is active; deletion handling to be confirmed | deletion/export request | Cross-service orchestration exists in code; deployed completion/retry evidence is still required. |
| Billing and transaction records | plan, Checkout Session, customer/subscription identifiers, payment-state events | Cancel future charges before identity deletion; retain the minimum financial record for the legally required period, still to be confirmed | billing export and account deletion | Do not promise immediate erasure where tax, accounting, chargeback, or fraud obligations require retention. Needs legal review. |
| Email data | messages, recipients, senders, attachments, raw mail | Retention period to be confirmed before commercial launch | deletion/export request where appropriate | High-risk data. Needs anti-abuse and legal exceptions. |
| Uploaded files | Files service objects, Extract source documents, metadata | Retain while user/workspace keeps the file; deletion timing to be confirmed | delete file, deletion/export request | Add R2 lifecycle rules and object verification. |
| AI input/output | prompts, chunks, extracted records, review items | Retention period to be confirmed before commercial launch | deletion/export request | Provider processing terms must be reviewed. |
| Logs | API logs, Cloudflare logs, mail metadata, webhook logs | Retention period to be confirmed before commercial launch | limited user control | Redact secrets and sensitive content. |
| Admin audit logs | admin actions, actor, target, metadata | Retention period to be confirmed before commercial launch | limited user control | Longer retention may be justified for security and abuse. Needs legal review. |
| Deletion requests | request status, identity verification, admin notes | Retention period to be confirmed before commercial launch | request status/contact | Keep enough to evidence handling; avoid excessive notes. |
| Export requests | export scope, status, admin notes, completion | Retention period to be confirmed before commercial launch | request status/contact | Expire export packages after a defined period. |
| Backups | database/object backups | Retention period to be confirmed before commercial launch | restored deletion handling to be defined | Document delayed deletion from backups. |
| Security logs | IPs, user agents, abuse events, failed auth | Retention period to be confirmed before commercial launch | limited user control | Retain only as necessary for security and fraud prevention. |
| Regulated or high-risk data if approved | clinical, patient, student, export-controlled, controlled-substances, regulated submissions | Not currently approved by this draft; retention period to be confirmed in a written agreement before use | depends on agreement and law | Do not accept by default. Requires technical, security, and legal review. |

## Required Implementation Work

- Define concrete retention periods with counsel and product owners.
- Add scheduled deletion/anonymization jobs where feasible.
- Add R2 lifecycle rules for deleted or expired objects.
- Document backup restoration behavior.
- Align Privacy Policy and Terms with this policy.
- Confirm provider-specific retention settings for Cloudflare, Resend/SMTP providers, OpenAI or other AI providers, Apple, GitHub, Supabase, and any payment processor before publishing final retention promises.
