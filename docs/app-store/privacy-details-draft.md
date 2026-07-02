# App Privacy Details Draft

Draft only. Needs Apple review and legal review.

Last reviewed: July 2, 2026

This is preparation material for App Store Connect. It is not a final privacy label.

| Data Type | Likely Disclosure Need | Linked to User? | Tracking? | Notes |
| --- | --- | --- | --- | --- |
| Contact Info | email, display name, support messages | Likely yes | Not currently detected | Confirm exact Apple app behavior. |
| Identifiers | account id, OAuth id, session identifiers | Likely yes | Not currently detected | Include Sign in with Apple/private relay behavior. |
| User Content | email content, files, AI inputs/outputs, molecule data | Likely yes | Not currently detected | High-risk disclosure area. |
| Diagnostics | TestFlight crash logs, error logs if enabled | Possibly | Not currently detected | Apple may process TestFlight diagnostics. |
| Usage Data | API usage, feature use, extraction jobs | Possibly | Not currently detected | Confirm analytics SDKs. |
| Coarse Location | IP-derived country/region where used | Possibly | Not currently detected | Main app has region lookup risk. |
| Financial Info | Not currently detected in native app | Not currently detected | Not currently detected | Add if subscriptions/payments launch. |

Final answers must be based on the exact submitted binary, SDKs, server logging, and App Store Connect configuration.
