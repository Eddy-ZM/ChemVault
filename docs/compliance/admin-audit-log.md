# Admin Audit Log

Draft only. Needs security and legal review before commercial launch.

Last reviewed: July 2, 2026

## Implemented Baseline

The main ChemVault API schema now includes an `admin_audit_logs` table with:

- `id`
- `actor_user_id`
- `actor_email`
- `action`
- `target_type`
- `target_id`
- `created_at`
- `ip_address`
- `user_agent`
- `metadata_json`

The main API writes audit entries for deletion/export request admin changes where D1 is available.

## Required Coverage

Admin audit logging should cover:

- create/delete user;
- modify user role;
- suspend user;
- create/suspend mailbox account;
- modify permissions;
- view and process deletion requests;
- view and process data export requests;
- modify system configuration;
- send administrator test email;
- access all-mail or cross-user data;
- API key creation, revocation, and secret rotation;
- webhook secret rotation.

## Remaining Work

- Add service-level audit helpers in User, Mail, Files, Notifications, and Extract.
- Require admin reasons for sensitive actions such as all-mail access, cross-user export, deletion rejection, and break-glass access.
- Ensure audit metadata is redacted and does not include secrets, tokens, full email content, or full AI prompt/output text.
- Define audit retention and access rules in the data retention policy.
- Add tests for representative admin actions.

Needs legal review: retention period, user access to audit records, and law-enforcement or abuse preservation exceptions.
