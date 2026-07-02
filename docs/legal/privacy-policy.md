Draft only. This document is not legal advice and must be reviewed before commercial launch.

# ChemVault Privacy Policy

Last updated: July 2, 2026

This Privacy Policy explains how ChemVault handles information in the ChemVault website, ChemVault Mail, User System, Docs, File System, Notification System, Molecule Model / Molecule Studio, Extract / AI Scientific Data Extraction, Apple native applications, TestFlight builds, APIs, and related services.

ChemVault is an early-stage scientific and developer platform. Some services are live, some are beta, and some documented features may be partially implemented. Where a feature is not yet deployed, this policy should be updated before launch. This draft must be reviewed by qualified legal counsel before commercial use.

## 1. Information We Collect

ChemVault may collect the following categories of information, depending on which services you use.

### Account and Profile Information

We may collect your email address, name, display name, institution, role, organization, field of interest, website, avatar, account status, role, permissions, and related account settings.

### Login, Authentication, and Session Information

We may process password hashes, OAuth provider identifiers, single sign-on identifiers, session tokens, token hashes, app passwords, connected service records, user agent information, IP addresses, timestamps, login history, and account security events.

We do not intend to store plain-text passwords. Passwords and app passwords should be stored only in hashed or otherwise protected form. Any implementation of password, token, or OAuth handling requires technical review before production use.

### Email Information

ChemVault Mail may process email addresses, sender and recipient metadata, subjects, message bodies, HTML content, headers, attachments, delivery status, mailbox paths, spam or abuse indicators, audit events, app password activity, and mail account settings.

Email content and metadata can be sensitive. ChemVault may need to store, transmit, index, inspect, or log email-related data to provide mail delivery, mailbox, search, security, abuse prevention, and administrative functions.

### File Information

The File System may process uploaded files, file names, file sizes, MIME types, storage keys, checksums, folder and project metadata, sharing tokens, download counts, previews, access records, and activity logs.

Uploaded files may contain confidential, personal, proprietary, regulated, or scientific information. Users are responsible for ensuring they have the right to upload and share files through ChemVault.

### Scientific, Molecule, and AI Extraction Information

ChemVault Extract and related AI features may process uploaded documents, extracted text, tables, metadata, prompts, user instructions, AI inputs, AI outputs, citations, review decisions, correction history, exported datasets, molecule identifiers, SMILES strings, PDB identifiers, and generated molecular structures.

AI outputs may be incomplete, inaccurate, or unsuitable for scientific, medical, legal, regulatory, financial, or safety-critical use without human review.

### Notification and Communication Information

The Notification System may process notifications, push subscription endpoints and keys, device or browser user agents, project messages, message read status, webhook events, delivery logs, API key prefixes and hashes, and activity or audit logs.

### Contact, Lead, and Commercial Interest Information

If you contact ChemVault, join a waitlist, request enterprise access, submit a form, or communicate with the project, we may collect your name, email address, organization, role, team size, interests, message contents, and related communication metadata.

Some website fallback flows may store form data locally in the browser if the API is unavailable. This behavior should be reviewed before production launch.

### Device, Browser, Usage, and Log Information

ChemVault may process IP addresses, browser or device information, operating system, request metadata, error information, timestamps, route access data, service usage records, API usage, feature entitlement checks, Cloudflare logs, audit logs, and security logs.

The Apple native applications may store local preferences such as language settings, cached region selection, API base URLs, auth tokens in Keychain, local molecule library entries, or other local app state.

### Payment Information

The current main website includes placeholder billing routes and subscription tables. If payment processing is added, payment information should be handled by a dedicated payment processor such as Stripe or another provider. ChemVault should avoid storing full payment card numbers. Payment flows require separate legal, privacy, tax, and security review before launch.

### Apple TestFlight and App Store Information

If you use an iOS or macOS TestFlight or App Store version, Apple may process information under Apple policies, including TestFlight participation, diagnostics, crash information, device information, and app analytics depending on your Apple settings and the app configuration.

## 2. How We Use Information

ChemVault may use information to:

- provide, operate, maintain, and improve the services;
- create and manage user accounts, sessions, roles, and permissions;
- authenticate users and protect accounts;
- deliver, receive, store, display, search, and administer email;
- store, preview, share, download, and manage uploaded files;
- process scientific documents, molecular inputs, AI extraction tasks, and review workflows;
- send notifications, service messages, transactional emails, and security alerts;
- provide support, respond to inquiries, and manage commercial interest requests;
- enforce service terms, prevent abuse, detect spam, investigate security events, and protect users;
- maintain audit logs, operational logs, and service integrity records;
- analyze usage, capacity, reliability, and performance;
- comply with legal obligations and respond to lawful requests.

ChemVault should not use user content for unrelated purposes unless this is disclosed, permitted by the user, and reviewed by legal counsel.

## 3. AI and Scientific Data Processing

ChemVault may send user-provided documents, text, prompts, molecule data, or extraction inputs to AI model providers or internal AI systems to generate extraction results, summaries, structured data, classifications, embeddings, or other outputs.

AI systems may process confidential or sensitive information if users include it in uploaded files or prompts. Users should not submit information they are not authorized to process through ChemVault. ChemVault should provide additional product notices before users submit files or text to AI features.

AI output is provided for assistance and review. Users are responsible for independently verifying scientific, technical, regulatory, medical, legal, or safety-relevant outputs before relying on them.

OpenAI and any other AI provider data handling must be confirmed against the active service settings, contracts, and product configuration before production launch. Needs legal review.

## 4. Email System Processing

ChemVault Mail may process email content and metadata to provide mail sending, receiving, mailbox storage, search, delivery status, app password authentication, abuse prevention, and administrative functions.

ChemVault Mail may use third-party providers such as Resend, SMTP providers, Cloudflare Email, DNS providers, or hosting providers to send, receive, route, secure, or log email. Email content and metadata may pass through those providers.

Users must not use ChemVault Mail for spam, phishing, impersonation, unlawful bulk messaging, malware, credential theft, or unauthorized marketing. Marketing email requires additional consent, unsubscribe, sender identity, and regulatory review before launch.

## 5. File Upload Processing

Uploaded files may be stored in Cloudflare R2, object storage, databases, or other configured storage systems. File metadata may be stored in database tables for access control, previews, sharing, downloads, auditing, and administration.

ChemVault should implement size limits, type restrictions, malware scanning or equivalent safety controls, permission checks, share revocation, deletion handling, and retention rules before production launch. Some of these controls were not fully detected in the current codebase and require technical remediation.

## 6. Third-Party Services

ChemVault may use third-party processors and infrastructure providers, including:

- Cloudflare for Pages, Workers, D1, R2, KV, Turnstile, logs, DNS, routing, security, and edge hosting;
- Resend or SMTP providers for email sending and routing;
- OpenAI or other AI providers for AI and extraction features;
- Apple for App Store, TestFlight, Sign in with Apple, diagnostics, and Apple developer services;
- GitHub for source control, GitHub Actions, deployment workflows, issue tracking, and repository access;
- Supabase for notification-related databases or services if configured;
- Stripe or another payment provider if payment features are enabled in the future;
- OAuth providers such as Apple, Google, GitHub, or Microsoft if enabled.

This list must be kept current as architecture and vendors change. Data processing agreements, subprocessors, transfer terms, and security terms require legal review before commercial launch.

## 7. Cookies, Local Storage, and Similar Technologies

ChemVault may use cookies, local storage, session storage, Keychain, UserDefaults, and similar technologies to keep users signed in, remember settings, store theme preferences, cache app state, maintain security sessions, support local-only tools, and operate product features.

Authentication cookies should be configured with appropriate security attributes such as HttpOnly, Secure, and SameSite where technically supported.

If ChemVault adds analytics, advertising, marketing cookies, cross-site tracking, or similar technologies, this policy and any cookie notice must be updated before deployment. Needs legal review.

## 8. Data Retention

ChemVault should retain information only as long as reasonably necessary for the purposes described in this policy, including service operation, account management, security, auditability, legal compliance, dispute resolution, and abuse prevention.

The current codebase includes some deletion and soft-deletion mechanisms, but a complete product-wide retention schedule was not detected. ChemVault should create and implement a retention policy covering accounts, files, email, AI inputs and outputs, logs, backups, audit records, push subscriptions, API keys, and contact forms.

## 9. User Controls and Rights

Depending on your location and applicable law, you may have rights to access, correct, delete, export, restrict, or object to certain processing of your information.

ChemVault should provide clear account deletion and data export request processes before commercial launch. Some deletion mechanisms exist in the User System, but a complete cross-service deletion and export workflow was not detected.

To request privacy support, contact: support@chemvault.science. Dedicated privacy, security, and abuse contact addresses should be confirmed before launch.

## 10. Security

ChemVault uses technical and organizational measures intended to protect information, such as authentication, role checks, token hashing, encryption for certain secrets, access controls, audit logs, Cloudflare security services, and restricted secret handling.

No system can be guaranteed to be completely secure. ChemVault should continue to harden rate limits, upload restrictions, administrator access controls, log redaction, secret management, data deletion, and incident response processes before commercial launch.

## 11. Children and Education Users

ChemVault is not currently documented as a service directed to children. Users under the age required by applicable law should not use ChemVault without appropriate permission from a parent, guardian, school, or authorized institution.

If ChemVault is offered to minors, schools, universities, educational programs, or student users, additional privacy, parental consent, school data, and regional compliance obligations may apply. Needs legal review.

## 12. International Transfers

ChemVault and its providers may process information in multiple countries or regions. International transfer requirements depend on the user location, provider contracts, infrastructure configuration, and applicable law. Needs legal review before commercial launch.

## 13. Changes to This Policy

ChemVault may update this Privacy Policy as services, infrastructure, legal requirements, or product practices change. Material changes should be communicated through reasonable means, such as website notices, in-app notices, email, or release notes.

## 14. Contact

For privacy, security, or abuse questions, contact:

ChemVault
Email: support@chemvault.science

Before commercial launch, ChemVault should confirm official privacy, legal, support, and abuse contact addresses and publish them consistently across the website, apps, App Store metadata, and legal documents.

## 15. Legal Review Required

The following topics require review by qualified legal counsel or an appropriate professional advisor before commercial launch:

- final privacy policy wording, jurisdiction scope, and legal basis;
- cookie and tracking disclosures;
- data processing agreements and subprocessors;
- international data transfer terms;
- email compliance, anti-spam obligations, and marketing consent;
- AI data processing, output disclaimers, and provider contracts;
- App Store privacy labels and TestFlight disclosures;
- minors, students, schools, and education users;
- payment, tax, refund, and subscription terms if billing is enabled;
- security incident notification and law enforcement request processes.
