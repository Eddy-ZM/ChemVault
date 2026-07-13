# Runtime Variables

| Name/group | Scope/source | Used by | Failure and rotation rule |
| --- | --- | --- | --- |
| D1 `DB` binding | Server binding | Forms, leads, billing, admin | Apply migration before enablement; private and billing workflows fail closed when unavailable |
| `USER_SYSTEM_ORIGIN`, shared session | Server config/request credential | Identity and entitlement resolution | HTTPS production origin; invalid/unavailable identity never grants paid access |
| `PAYMENT_PROVIDER`, four Stripe Price IDs | Server config | Checkout and webhook plan mapping | Only `stripe` enables live path; unknown/missing Price ID fails closed |
| `TEAM_BILLING_ENABLED` | Server config, default `false` | Team Checkout release gate | Enable only after organization membership and seat provisioning pass canaries |
| `STRIPE_SECRET_KEY` | Cloudflare secret | Stripe REST API | Rotate on exposure/provider incident; never browser-visible |
| `STRIPE_WEBHOOK_SECRET` | Cloudflare secret | Raw-body webhook verification | Rotate with endpoint secret; accept overlap only through an explicit deployment plan |
| `BILLING_SERVICE_SECRET` | Main site and authorized services | Internal entitlement endpoint | Rotate on exposure and periodically; never reuse as end-user auth |
| Stripe safety options | Server config | Signature tolerance, test-event rejection, tax, past-due policy | Defaults are restrictive; policy changes require release review |
| User/admin origins and allowlists | Server config | Admin identity | Review on role/domain change; fail closed |
| Resend/provider key and addresses | Server secret/config | Confirmations/admin notices | Rotate every 90 days or on incident; stored intake survives mail failure |
| Forms retention secret/policy | Pages/GitHub secret and variable | Scheduled purge | Rotate every 90 days or on incident; unauthenticated purge fails |
| IP/analytics salts | Server secret | Privacy-minimized abuse/metrics | Rotate by policy; affects correlation only |
| `CHEMVAULT_SITE_ORIGIN`, `SOURCE_DATE_EPOCH` | Build variable | URLs/reproducible public index | Update with domain/build policy |

The exhaustive suite variable catalog is [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md). No provider, billing-service, admin, or retention secret is client-public.
