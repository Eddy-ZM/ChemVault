# Launch Issue Register

This register is the current launch-gate view. It deliberately separates locally implemented safeguards from external activation and legal review.

| ID | Priority | Accountable role | Status | Recheck | Evidence | Close criterion |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | P0 | Release owner | External action required | 2026-07-11 | Apple key removed from the workspace; key directory deny-by-default | Confirm key status in App Store Connect and rotate/revoke if exposure cannot be ruled out |
| SEC-002 | P0 | Mail owner | Activation required | 2026-07-11 | Mail uses a dedicated `INIT_SECRET`; CI rejects JWT reuse | Configure a unique runtime secret and verify initialization cannot use `JWT_SECRET` |
| SEC-003 | P0 | Platform owner | Activation required | 2026-07-12 | User, Files, Lab, Notifications, Mail and Extract implement lifecycle endpoints and tests | Apply migrations, configure the shared lifecycle secret, deploy all services and pass export/delete canaries |
| SEC-004 | P0 | Forms owner | Activation required | 2026-07-11 | Security intake performs mandatory server-side Turnstile validation | Configure site/secret keys, deploy and pass a production-domain submission canary |
| DATA-001 | P1 | Lab owner | Activation required | 2026-07-12 | Privacy-minimized funnel events and protected funnel endpoint are implemented | Apply analytics migration, configure hash salt and verify 30-day funnel output |
| REL-001 | P0 | Desktop release owner | External action required | 2026-07-15 | Windows workflows emit installers, SHA-256 checksums and release records | Produce the first signed or explicitly unsigned beta artifact, verify checksum and create protected draft release |
| REL-002 | P0 | Apple release owner | External action required | 2026-07-15 | Canonical native target and macOS CI build definitions exist | Run Xcode archive/signing on macOS and complete TestFlight review metadata |
| REL-003 | P1 | Download owner | Waiting on REL-001/002 | 2026-07-16 | Download Center consumes a validated manifest and hides absent assets | Add verified release assets to the manifest; confirm every visible link downloads the recorded checksum |
| LEGAL-001 | P0 | Compliance owner | Review required | 2026-07-17 | Privacy, retention, terms, security and Apple review drafts exist | Counsel/product owner approves public wording and retention exceptions |

No P0 item may be marked closed from code review alone when its close criterion requires a deployed canary, provider console check, signed binary or legal approval.
