# Apple App Store and TestFlight Compliance Review

Draft compliance document. This is not legal advice. Needs legal review before App Store submission or commercial launch.

Operational status is tracked in `docs/compliance/issue-register.md`; this narrative remains review guidance rather than a live launch dashboard.

## Remediation Status Update

Completed in this pass:

- Public web pages now expose `/privacy`, `/terms`, `/security`, `/account/delete`, and `/account/export`.
- The main public footer links Privacy Policy, Terms of Service, Security / Abuse, and Forms.
- User System login, register, and OAuth entry points now include Terms/Privacy notices.
- Extract app public footer and auth redirect card now link to Terms/Privacy.
- App Store preparation drafts were added under `docs/app-store/`.
- Account deletion and export now use a fail-closed cross-service lifecycle job covering User, Files, Lab, Notifications, Mail and Extract.
- The canonical native ChemVault target is `ChemVaultAppleApp`; the duplicate local Apple target and the Tauri Mail WebView prototype are archived.
- Apple release material is excluded from the code workspace by default, and the previously detected private key was removed from the workspace.

Partially completed / activation required:

- Cross-service deletion/export code and tests exist, but production migrations, service secrets, deployments and end-to-end canaries remain launch gates.
- Apple-native app settings/about screens still need verification and links.
- Exact App Privacy Details still require review of each submitted binary and backend behavior.

Needs Apple/legal review:

- Sign in with Apple placement relative to Google, GitHub, Microsoft, and other login providers.
- App Privacy Details answers for contact info, identifiers, user content, diagnostics, usage data, and coarse location.
- TestFlight beta wording and What to Test content.

## 1. Scope

This review covers currently detected Apple-related ChemVault products and plans:

- ChemVault main iOS / macOS native app;
- ChemVault Mail iOS / macOS app;
- ChemVault Molecule / Molecule Studio native app;
- TestFlight builds and App Store metadata;
- Sign in with Apple, OAuth, Keychain, UserDefaults, remote configuration, and API integrations.

No statement in this document guarantees App Store approval. Apple review decisions depend on the exact binary, metadata, privacy disclosures, server behavior, account flows, reviewer notes, and current Apple policies.

## 2. Official Apple Reference Points

- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- TestFlight test information: https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/

## 3. App Store Review Guidelines Checklist

| Area | Current Risk | Recommendation |
| --- | --- | --- |
| Accurate metadata | Medium | App name, subtitle, screenshots, description, privacy link, support link, and beta notes must match actual features. Avoid claiming fully automated scientific accuracy or complete compliance. |
| Privacy policy link | High | Add a working public privacy policy URL before submission. Link it from the website, apps, and App Store Connect. |
| Account deletion | High | If account creation is available in-app, Apple generally expects an in-app account deletion path. Current cross-service deletion appears incomplete. |
| Sign in with Apple | High | If third-party login such as Google, GitHub, or Microsoft is offered for account creation/sign-in, confirm whether Sign in with Apple is required and implemented equivalently. Needs legal/platform review. |
| User-generated content | Medium | Email, files, project messages, uploads, extraction results, molecule libraries, and comments may count as user content. Add reporting, blocking, moderation, or abuse workflows where applicable. |
| File upload and storage | High | Disclose file handling and restrict unsafe uploads. Make sure the app and backend enforce size/type/security controls. |
| Email communication | High | Disclose email content and metadata processing. Ensure anti-spam, sender verification, abuse reporting, and suspension controls. |
| AI-generated content | High | Clearly explain AI limitations and require human review for scientific extraction. Avoid misleading accuracy claims. |
| Scientific / medical / regulated claims | High | Do not present outputs as medical, clinical, regulatory, or safety-critical decisions. Needs legal and subject-matter review. |
| Payments and subscriptions | Medium | If paid features are added, confirm App Store payment rules, external purchase links, subscriptions, refunds, and entitlements. Needs legal/platform review. |
| Beta stability | Medium | TestFlight metadata should state the build is beta and may be unstable. Do not use beta for critical workflows. |
| Support contact | High | Provide working support email or URL. Confirm official support/security/abuse contacts. |
| Export compliance | Medium | Complete Apple export compliance questions based on encryption use, TLS, Keychain, token handling, and any crypto libraries. Needs legal/platform review. |
| Data security | High | Verify Keychain use for tokens, no secrets in app bundles, secure API endpoints, and no excessive diagnostic logging. |

## 4. App Privacy Details / Privacy Label Preparation

This table is a preparation aid only. Final App Privacy Details must be completed in App Store Connect based on the exact app binary and server behavior.

| Data Type | Main ChemVault App | ChemVault Mail App | Molecule App | Linked to User? | Used for Tracking? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Contact Info | Likely: account email, name, support/contact forms | Yes: mailbox identity, recipients, senders | Likely if account login enabled | Likely yes | Not currently detected | Needs App Store Connect review. |
| User ID / Identifiers | Likely: account ID, OAuth IDs, session IDs | Yes: user ID, account ID, mailbox IDs | Likely if login enabled | Likely yes | Not currently detected | Include token/session handling where applicable. |
| User Content | Likely: files, AI inputs/outputs, extraction data | Yes: email content, attachments, messages | Likely: molecule inputs, local/imported files | Likely yes | Not currently detected | High-risk disclosure area. |
| Search History | Possible: records, molecule lookup, AI/document search | Possible mail search | Possible molecule search | Possibly yes | Not currently detected | Confirm telemetry and server logs. |
| Browsing / Usage Data | Possible: routes, API usage, feature entitlement checks | Possible mailbox/admin usage | Possible API usage | Possibly yes | Not currently detected | Needs technical confirmation. |
| Diagnostics | Possible: crashes, logs, errors, TestFlight diagnostics | Possible | Possible | Possibly yes | Not currently detected | Apple may process TestFlight diagnostics separately. |
| Device ID | Possible through Apple/Cloudflare logs or app diagnostics | Possible | Possible | Possibly yes | Not currently detected | Confirm analytics/crash SDKs. |
| Location | Main app detects country/region from public IP country-code services and caches region locally | Not detected beyond IP-based service logs | Not detected beyond service logs | Possibly yes if server logs retained | Not currently detected | Treat as coarse location/region risk. |
| Contact List | Not detected | Not detected | Not detected | Not currently detected | Not currently detected | Do not declare unless implemented. |
| Health / Fitness | Not detected | Not detected | Not detected | Not currently detected | Not currently detected | Scientific chemistry data is not automatically health data, but context can make it sensitive. Needs legal review. |
| Financial Info | Native app does not collect card data; web source can open Stripe-hosted checkout and stores subscription identifiers and usage records when enabled | Not detected in native app | Subscription status may affect app entitlements | Main D1 and Stripe when public billing is approved | Stripe retention plus approved ChemVault billing retention | Update App Store disclosures if native account or entitlement surfaces expose paid subscription state. |
| Sensitive Info | Possible if users upload or send sensitive files, emails, or AI inputs | Possible through emails/attachments | Possible through molecule/project data | Possibly yes | Not currently detected | Avoid collecting unnecessary sensitive information. |

## 5. TestFlight Beta App Description Guidance

Recommended TestFlight description points:

- State that the app is a beta build for testing ChemVault scientific, file, mail, molecule, or extraction workflows.
- State that features may be incomplete, unstable, or changed during testing.
- State that users should not upload confidential, regulated, clinical, safety-critical, or irreplaceable data unless authorized.
- State that AI or extraction results require human verification.
- Include a support contact and feedback channel.
- Link to the draft privacy policy or public privacy policy URL.
- Avoid promises such as "fully accurate", "fully secure", "approved for regulated use", or "production ready" unless verified and legally approved.

Example draft:

> ChemVault is a beta scientific workspace for testing account, file, mail, molecule, and AI extraction workflows. This TestFlight build may be unstable or incomplete. Do not use it for production-critical, regulated, confidential, or irreplaceable data unless you are authorized to do so. AI and scientific extraction results require human review. For support or feedback, email contact@chemvault.science.

## 6. What to Test Guidance

Recommended "What to Test" items:

- sign in, sign out, and session persistence;
- account settings and account deletion request flow when available;
- file upload, preview, download, sharing, and permission checks;
- mail send, receive, search, delete, and app password flows;
- molecule search, SMILES input, 3D generation, local library, and export;
- AI extraction upload, task status, review, correction, and export;
- notification delivery and permission prompts;
- error handling, offline states, and retry behavior;
- privacy policy and support links;
- abuse reporting or support contact access.

Do not ask testers to upload sensitive real-world data unless safeguards and consent are confirmed.

## 7. Misleading Description Risks

Avoid or qualify claims that could be misleading:

- "secure" without explaining reasonable safeguards and limitations;
- "private" without explaining processors and logs;
- "accurate AI extraction" without human review disclaimers;
- "compliant" or "approved" without formal legal or regulatory review;
- "free" where subscriptions, paywalls, or future paid plans are likely;
- "local-only" where data is sent to APIs, AI providers, email providers, or cloud storage;
- "anonymous" where IP address, logs, or account identifiers may be processed.

## 8. Beta Stability and Data Handling Notices

Each TestFlight or beta build should clearly state:

- the build is a beta or preview;
- data may be processed by ChemVault servers and providers;
- email content, files, AI inputs, and AI outputs may be stored or processed;
- Apple may process TestFlight participation, diagnostics, and crash information;
- users should keep backups of important data;
- support and feedback contacts are available.

## 9. Sign in with Apple Review

Detected User System code supports third-party OAuth providers including Apple and other providers. If any Apple app offers third-party sign-in for account creation or authentication, confirm whether Sign in with Apple must be presented as an equivalent option under the active Apple rules.

Risk: High until the exact app UI, enabled providers, and App Store metadata are verified.

Required confirmation:

- [ ] Which providers appear in the iOS/macOS app login UI?
- [ ] Is Sign in with Apple available wherever other social login is available?
- [ ] Are account linking, private relay email, and deletion flows supported?
- [ ] Are privacy labels updated for OAuth identifiers and account data?

## 10. Account Deletion Review

The User System includes deletion-related code, but a complete cross-service deletion path covering Mail, Files, Notifications, Extract, AI outputs, logs, backups, and Apple app entry points was not detected.

Recommended requirements:

- [ ] Provide account deletion inside any app that supports account creation.
- [ ] Explain what is deleted immediately, what is retained, and why.
- [ ] Revoke sessions, app passwords, API keys, OAuth connections, and push subscriptions.
- [ ] Delete or anonymize user files, email, extraction data, notification data, and user profile data where legally and technically appropriate.
- [ ] Retain only necessary audit/security records with restricted access.
- [ ] Add tests for deletion across services.

Needs legal and technical review.

## 11. Privacy Policy and Support Links

Before submission:

- [ ] Publish a public privacy policy URL.
- [ ] Add privacy link to App Store Connect metadata.
- [ ] Add privacy link inside the app where appropriate.
- [ ] Publish support URL or support email.
- [ ] Publish abuse/security contact if mail or file sharing is enabled.
- [ ] Ensure the privacy policy matches actual app behavior and server processing.

## 12. Risk Register

| Risk | Level | Required Action |
| --- | --- | --- |
| Incorrect App Privacy Label for email, files, AI inputs, user identifiers, diagnostics, or region detection | High | Complete label from exact binary and backend behavior. Needs legal review. |
| Missing in-app account deletion flow | High | Add account deletion flow and cross-service deletion plan. |
| Third-party login without equivalent Sign in with Apple where required | High | Confirm app login UI and enabled providers. |
| AI/scientific claims presented as reliable decisions | High | Add human-review disclaimers and avoid regulated claims. |
| Beta metadata does not warn users about instability and data handling | Medium | Update TestFlight descriptions and tester instructions. |
| User-generated content without reporting/moderation controls | Medium | Add abuse reporting and admin moderation workflows. |
| No public support/privacy contact | High | Publish and verify contacts before submission. |
| Secrets or private keys in Apple developer workspace | Critical | Confirm local `.p8` App Store Connect key handling, storage, access, and rotation. |

## 13. Submission Readiness Checklist

- [ ] Final privacy policy published and reviewed.
- [ ] Terms of Service or EULA reviewed.
- [ ] App Privacy Details completed from exact app behavior.
- [ ] TestFlight Beta App Description reviewed.
- [ ] What to Test reviewed.
- [ ] Support URL/email works.
- [ ] Account deletion flow works.
- [ ] Sign in with Apple requirement reviewed.
- [ ] User-generated content controls reviewed.
- [ ] File upload and email abuse controls reviewed.
- [ ] AI/scientific disclaimers visible where needed.
- [ ] Export compliance questions answered.
- [ ] No secrets included in app bundle, repository, or screenshots.
- [ ] Production endpoints, staging endpoints, and reviewer credentials are configured correctly.

## 14. Needs Human Review

Needs legal review:

- App Privacy Details and tracking answers;
- Terms, privacy policy, EULA, and beta disclaimers;
- account deletion language and retention exceptions;
- scientific, AI, medical, regulatory, and safety disclaimers;
- user-generated content and abuse handling;
- payment/subscription rules if enabled;
- minors, students, or education users.

Needs technical confirmation:

- exact app data flows in each binary;
- exact TestFlight metadata;
- exact OAuth providers shown in each Apple app;
- logging, analytics, crash reporting, and diagnostics SDKs;
- production API endpoints and provider configuration;
- deletion/export coverage across services.
