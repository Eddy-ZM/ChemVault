# Security and Abuse Reporting

Draft only. Needs operational and legal review before commercial launch.

Last reviewed: July 2, 2026

## Public Entry Point

The main site now exposes `/security` as a security and abuse reporting page. It uses placeholder reporting routes such as:

- `https://forms.chemvault.science/security-report`
- `https://forms.chemvault.science/abuse-report`

These must be connected to a real monitored process before public launch.

## Reporting Rules

Users and researchers should:

- report vulnerabilities privately;
- avoid public disclosure before triage;
- avoid attacking real users, production systems, or third-party providers;
- avoid accessing, modifying, or exfiltrating data they do not own;
- avoid uploading malware or exploit payloads except in an approved safe test channel;
- include affected URLs, timestamps, impact, reproduction steps, and safe proof-of-concept details.

## Internal Triage TODO

- Confirm official security, privacy, support, and abuse contacts.
- Define severity levels and response targets.
- Route spam/phishing/mail abuse to Mail administrators.
- Route file/AI data abuse to product/security reviewers.
- Preserve evidence with restricted access.
- Add audit logging for suspension, takedown, deletion, and export decisions.

Needs legal review: vulnerability disclosure policy, safe harbor language, abuse takedown process, and incident notification obligations.
