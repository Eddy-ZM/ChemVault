# Data Retention Policy

Draft only. Needs legal review.

Last reviewed: July 2, 2026

This draft describes ChemVault retention principles. Retention period to be confirmed before commercial launch unless stated otherwise.

| Data Category | Examples | Draft Retention Principle | User Control | Notes |
| --- | --- | --- | --- | --- |
| Account data | email, name, user id, roles, OAuth links | Retain while account is active; deletion handling to be confirmed | deletion/export request | Cross-service deletion orchestration still needed. |
| Email data | messages, recipients, senders, attachments, raw mail | Retention period to be confirmed before commercial launch | deletion/export request where appropriate | High-risk data. Needs anti-abuse and legal exceptions. |
| Uploaded files | Files service objects, Extract source documents, metadata | Retain while user/workspace keeps the file; deletion timing to be confirmed | delete file, deletion/export request | Add R2 lifecycle rules and object verification. |
| AI input/output | prompts, chunks, extracted records, review items | Retention period to be confirmed before commercial launch | deletion/export request | Provider processing terms must be reviewed. |
| Logs | API logs, Cloudflare logs, mail metadata, webhook logs | Retention period to be confirmed before commercial launch | limited user control | Redact secrets and sensitive content. |
| Admin audit logs | admin actions, actor, target, metadata | Retention period to be confirmed before commercial launch | limited user control | Longer retention may be justified for security and abuse. Needs legal review. |
| Deletion requests | request status, identity verification, admin notes | Retention period to be confirmed before commercial launch | request status/contact | Keep enough to evidence handling; avoid excessive notes. |
| Export requests | export scope, status, admin notes, completion | Retention period to be confirmed before commercial launch | request status/contact | Expire export packages after a defined period. |
| Backups | database/object backups | Retention period to be confirmed before commercial launch | restored deletion handling to be defined | Document delayed deletion from backups. |
| Security logs | IPs, user agents, abuse events, failed auth | Retention period to be confirmed before commercial launch | limited user control | Retain only as necessary for security and fraud prevention. |

## Required Implementation Work

- Define concrete retention periods with counsel and product owners.
- Add scheduled deletion/anonymization jobs where feasible.
- Add R2 lifecycle rules for deleted or expired objects.
- Document backup restoration behavior.
- Align Privacy Policy and Terms with this policy.
