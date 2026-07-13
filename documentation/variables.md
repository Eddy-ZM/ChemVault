# Runtime Variables

| Name/group | Scope/source | Used by | Rotation/failure |
| --- | --- | --- | --- |
| D1 `DB` binding | Server binding | Forms/leads/newsletter/admin | Resource migration; private workflows unavailable |
| User/Admin origins, sessions, allowlists | Server config | Admin identity | Review on role/domain change; fail closed |
| Resend/provider key and from/to addresses | Server secret/config | Confirmations/admin notices | 90 days/incident; stored intake survives mail failure |
| Forms retention secret/policy | Pages/GitHub secret + variable | Scheduled purge | 90 days/incident; purge fails rather than unauthenticated run |
| IP/analytics salts | Server secret | Privacy-minimized abuse/metrics | Rotate by policy; affects correlation only |
| `CHEMVAULT_SITE_ORIGIN`, `SOURCE_DATE_EPOCH` | Build variable | URLs/reproducible public index | Domain/build policy change |

No provider/admin/retention secret is client-public. Pre-go-live verifies public projection, admin deny cases, D1 migrations, email sender, ticket privacy, and purge canary.
