# Environment Variables

Do not commit real keys, tokens, private keys, certificates, provisioning profiles, or `.env` files. Store production secrets in Cloudflare, GitHub Actions, Xcode Cloud, App Store Connect, Resend, Stripe, or the relevant provider secret store.

Last reviewed: July 3, 2026

| Variable | Purpose | Required locally | Required in production | Sensitive | Example placeholder | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ENVIRONMENT` | Main site runtime environment | No | Yes | No | `staging` | Use `production` only with production controls enabled. |
| `COMMERCIAL_MODE` | Main commercial safety mode | No | Yes | No | `staging` | `production` disables mock billing/auth paths. |
| `PUBLIC_APP_URL` | Public app URL for redirects | No | Yes for billing | No | `https://chemvault.science` | Configure in Cloudflare Pages/Workers. |
| `ENABLE_MOCK_BILLING` | Allows placeholder billing routes | Yes | No | No | `false` | Must be false in production. |
| `ENABLE_MOCK_AUTH` | Allows placeholder auth/admin routes | Yes | No | No | `false` | Must be false in production. |
| `DEFAULT_USER_PLAN` | Local/staging plan placeholder | No | No | No | `free` | Do not use for production entitlement logic. |
| `CHEMVAULT_ADMIN_EMAILS` | Allowed main-site administrator emails | No | Yes for `/admin/*` | Moderate | `ziwen.mu@chemvault.science,admin@chemvault.science` | Used after Cloudflare Access or ChemVault User authentication. Email is not enough by itself; the request must also be authenticated. |
| `USER_SYSTEM_ORIGIN` | ChemVault User Center origin for permission checks | No | Recommended | No | `https://user.chemvault.science` | Main site calls `/api/access/check` with the user session cookie when available. |
| `CHEMVAULT_ADMIN_TOKEN` | Legacy main admin fallback token | No | Emergency fallback only | Yes | `replace_with_secure_token` | Store only as a Cloudflare secret. Prefer Cloudflare Access or ChemVault User permissions. |
| `CHEMVAULT_ADMIN_TOKEN_FALLBACK` | Enables legacy admin-token fallback | No | Optional emergency only | No | `false` | Keep `false` in production unless a temporary break-glass token window is explicitly needed. |
| `CLOUDFLARE_API_TOKEN` | Cloudflare deployment/API access | No | Yes for deploy | Yes | `your_cloudflare_api_token_here` | Store in GitHub Secrets or Cloudflare. Rotate if exposed. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id | No | Yes for deploy | Low | `your_cloudflare_account_id_here` | Not a secret alone, but treat as operational config. |
| `CLOUDFLARE_ZONE_ID` | Cloudflare zone id | No | If used | Low | `your_cloudflare_zone_id_here` | Needed by some deploy workflows. |
| `CLOUDFLARE_DATABASE_ID` | Main D1 database id | No | If D1 used | Low | `your_d1_database_id_here` | Configure in Cloudflare. |
| `FORMS_DB` | Forms D1 binding name reference | No | Yes for Forms | No | `DB` | Binding name must match the Pages Function code path `env.DB`; configure as a D1 binding, not a browser variable. |
| `CHEMVAULT_SITE_ORIGIN` | Sitemap/site origin | No | No | No | `https://chemvault.science` | Used by sitemap generation. |
| `PAYMENT_PROVIDER` | Payment provider selector | No | If billing enabled | No | `stripe` | Empty/placeholder keeps billing disabled. |
| `STRIPE_SECRET_KEY` | Stripe server secret key | No | If Stripe enabled | Yes | `your_stripe_secret_key_here` | Never expose to browser code. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | No | If Stripe enabled | Yes | `replace_with_stripe_webhook_secret` | Required for webhook verification. |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe Pro monthly price identifier | No | If Stripe enabled | Low | `your_stripe_pro_monthly_price_id_here` | Operational config, not a secret. |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Stripe Pro yearly price identifier | No | If Stripe enabled | Low | `your_stripe_pro_yearly_price_id_here` | Operational config, not a secret. |
| `STRIPE_TEAM_MONTHLY_PRICE_ID` | Stripe Team monthly price identifier | No | If Stripe enabled | Low | `your_stripe_team_monthly_price_id_here` | Operational config, not a secret. |
| `STRIPE_TEAM_YEARLY_PRICE_ID` | Stripe Team yearly price identifier | No | If Stripe enabled | Low | `your_stripe_team_yearly_price_id_here` | Operational config, not a secret. |
| `ENTERPRISE_LEAD_EMAIL` | Legacy lead notification destination | No | Optional | Moderate | `contact@chemvault.science` | Kept for compatibility; `/api/leads` mail now uses `LEADS_NOTIFY_TO` or `FORMS_NOTIFY_TO`. |
| `NEWSLETTER_PROVIDER` | Newsletter provider selector | No | Optional | No | `placeholder` | Newsletter storage is D1-backed; bulk sending is not enabled yet. |
| `RESEND_API_KEY` | Resend email API key | No | If lead/forms mail enabled | Yes | `your_resend_api_key_here` | Store as provider secret. Missing Resend config does not block D1 lead submission. |
| `LEADS_NOTIFY_TO` | Lead notification recipient override | No | If separate lead inbox needed | Moderate | `forms@chemvault.science` | Optional. Falls back to `FORMS_NOTIFY_TO`. Comma-separated recipients allowed. |
| `LEADS_FROM` | Lead email sender override | No | If separate sender needed | Moderate | `ChemVault <forms@chemvault.science>` | Optional. Falls back to `FORMS_FROM`. Must be verified in Resend. |
| `LEADS_IP_HASH_SALT` | Optional salt for lead `ip_hash` and unsubscribe-token hashes | No | Recommended | Yes | `replace_with_leads_hash_salt` | Optional. Falls back to `FORMS_IP_HASH_SALT`; raw IP is not stored. |
| `FORMS_NOTIFY_TO` | Forms notification recipient | No | Yes for Forms mail | Moderate | `forms@chemvault.science` | Receives new submission notifications. |
| `FORMS_FROM` | Forms sender address | No | Yes for Forms mail | Moderate | `forms@chemvault.science` | Must be allowed by the verified Resend sending domain. |
| `FORMS_IP_HASH_SALT` | Optional salt for Forms `ip_hash` | No | Recommended | Yes | `replace_with_forms_hash_salt` | Used only to hash client IPs before storage; raw IP is not stored in Forms tables. |
| `RESEND_WEBHOOK_SECRET` | Resend webhook verification | No | If webhooks enabled | Yes | `replace_with_resend_webhook_secret` | Required before accepting provider webhooks. |
| `OPENAI_API_KEY` | OpenAI API key for AI features | No | If platform AI enabled | Yes | `your_openai_api_key_here` | Store server-side only. |
| `APP_URL` | Legacy Extract redirect URL | Yes | Yes | No | `https://app.chemvault.science` | Sunset compatibility only; new workflows use Lab. |
| `API_BASE_URL` | Extract backend API URL | Yes | Yes | No | `https://api.chemvault.science` | Used by Extract web app. |
| `NEXT_PUBLIC_APP_URL` | Legacy Extract public redirect URL | Yes | Yes | No | `https://app.chemvault.science` | Browser-visible compatibility URL; canonical product is Lab. |
| `NEXT_PUBLIC_API_BASE_URL` | Extract public API URL | Yes | Yes | No | `https://api.chemvault.science` | Browser-visible. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe browser key | No | If Stripe enabled | No | `your_stripe_publishable_key_here` | Publishable, but keep environment-specific. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile browser site key | No | If Turnstile enabled | No | `your_turnstile_site_key_here` | Public key. |
| `NEXT_PUBLIC_CHEMVAULT_USER_URL` | User Center public URL | Yes | Yes | No | `https://user.chemvault.science` | Browser-visible. |
| `JWT_SECRET` | Extract/Mail JWT signing secret | Yes | Yes | Yes | `replace_with_secure_jwt_secret` | Rotate if exposed. Do not pass in URL paths. |
| `APP_ENCRYPTION_KEY` | Extract encryption key | No | Yes | Yes | `replace_with_secure_app_encryption_key` | Used for sensitive app data. |
| `TURNSTILE_SECRET_KEY` | Turnstile server secret | No | If Turnstile required | Yes | `replace_with_turnstile_secret_key` | Server-side only. |
| `TURNSTILE_REQUIRED` | Turnstile enforcement switch | No | Recommended | No | `true` | Production-sensitive forms should enable it. |
| `CHEMVAULT_USER_BASE_URL` | User Center backend URL | Yes | Yes | No | `https://user.chemvault.science` | Server-side service integration. |
| `CHEMVAULT_USER_COOKIE_NAME` | Shared session cookie name | Yes | Yes | No | `chemvault_session` | Must match User System. |
| `CHEMVAULT_USER_COOKIE_DOMAIN` | Shared cookie domain | No | Yes | No | `.chemvault.science` | Review SameSite/Secure settings. |
| `CHEMVAULT_USER_SERVICE_KEY` | Extract service identifier | Yes | Yes | Moderate | `chemvault_extract` | Treat as service config; not an API secret by itself. |
| `CHEMVAULT_USER_REQUIRE_SERVICE_ACCESS` | Enforce User Center service access | No | Recommended | No | `true` | Production should enforce access where applicable. |
| `AI_PROVIDER` | Extract AI provider selector | Yes | Yes if AI enabled | No | `openai` | Keep provider disclosures updated. |
| `OPENAI_MODEL` | Primary OpenAI model | Yes | Yes if AI enabled | No | `gpt-5.4` | Confirm current model availability before deployment. |
| `OPENAI_FALLBACK_MODEL` | Fallback model | No | If fallback enabled | No | `gpt-5.5` | Needs technical confirmation. |
| `AI_MAX_CHUNKS_PER_DOCUMENT` | AI chunk limit | Yes | Yes | No | `20` | Helps control cost and data sent to providers. |
| `AI_MAX_CHUNK_CHARS` | AI chunk character limit | Yes | Yes | No | `6000` | Helps truncate long content. |
| `AI_ENABLE_FALLBACK_MODEL` | Enables fallback AI model | No | Optional | No | `false` | Document provider behavior. |
| `DATABASE_URL` | Extract database URL | Yes | Yes | Yes | `your_database_url_here` | Do not commit production URLs with credentials. |
| `HYPERDRIVE_BINDING` | Cloudflare Hyperdrive binding | No | If used | Low | `your_hyperdrive_binding_if_used` | Operational config. |
| `HYPERDRIVE_DATABASE_URL` | Hyperdrive database URL | No | If used | Yes | `your_hyperdrive_database_url_if_used` | Treat as secret if credentials included. |
| `STORAGE_PROVIDER` | Extract storage backend | Yes | Yes | No | `r2` | MinIO for local, R2 for production. |
| `S3_ENDPOINT` | S3/MinIO endpoint | Yes | If S3 used | No | `http://localhost:9000` | Local/dev only unless using S3-compatible provider. |
| `S3_ACCESS_KEY` | S3 access key id | Yes | If S3 used | Yes | `your_s3_access_key_here` | Secret in production. |
| `S3_SECRET_KEY` | S3 secret key | Yes | If S3 used | Yes | `your_s3_secret_key_here` | Secret. |
| `S3_BUCKET` | S3 bucket | Yes | If S3 used | Low | `chemvault-documents` | Operational config. |
| `MINIO_*` | Local MinIO storage settings | Yes for local | No | Some | `dev_only_minio_secret_placeholder` | Do not use local defaults in production. |
| `R2_ACCOUNT_ID` | Cloudflare R2 account id | No | If R2 used | Low | `your_r2_account_id_here` | Operational config. |
| `R2_ACCESS_KEY_ID` | R2 access key id | No | If R2 used | Yes | `your_r2_access_key_id_here` | Secret. |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key | No | If R2 used | Yes | `your_r2_secret_access_key_here` | Secret. |
| `R2_BUCKET_NAME` | R2 bucket name | No | If R2 used | Low | `your_r2_bucket_name_here` | Operational config. |
| `R2_ENDPOINT` | R2 endpoint | No | If R2 used | Low | `your_r2_endpoint_here` | Operational config. |
| `QUEUE_PROVIDER` | Extract queue provider | Yes | Yes | No | `redis` | Cloudflare Queues optional. |
| `REDIS_URL` | Redis connection URL | Yes | If Redis used | Yes | `your_redis_url_here` | May contain credentials. |
| `REDIS_QUEUE` | Redis queue name | Yes | If Redis used | No | `chemvault:extract:jobs` | Operational config. |
| `WEBHOOK_DELIVERY_QUEUE` | Webhook queue name | Yes | If webhooks enabled | No | `chemvault:webhook:deliveries` | Operational config. |
| `INTERNAL_WORKER_TOKEN` | Internal worker authorization token | No | Yes if internal workers used | Yes | `replace_with_secure_internal_worker_token` | Server-to-server secret. |
| `MAIL_DOMAIN` | Mail domain | Yes for Mail | Yes for Mail | No | `chemvault.science` | Must match DNS/provider setup. |
| `MAILDIR_ROOT` | Mail storage root | Yes for gateway | Yes for gateway | No | `/var/vmail` | Host path; do not expose internals publicly. |
| `IMAP_HOST` | IMAP host | Yes for Mail | Yes for Mail | No | `imap.chemvault.science` | Operational config. |
| `SMTP_HOST` | SMTP host | Yes for Mail | Yes for Mail | No | `smtp.chemvault.science` | Operational config. |
| `SMTP_PORT` | SMTP port | Yes for Mail | Yes for Mail | No | `587` | Operational config. |
| `SMTP_DEV_PORT` | Local SMTP dev port | Yes for local Mail | No | No | `2525` | Local only. |
| `INTERNAL_MAIL_GATEWAY_TOKEN` | Mail internal gateway bearer token | No | Yes if gateway enabled | Yes | `replace_with_secure_internal_token` | Rotate if exposed. |
| `MAIL_GATEWAY_URL` | Mail gateway URL | Yes for gateway | Yes for gateway | No | `https://mail-gateway.example` | Server-side service URL. |
| `MAIN_APP_INTERNAL_URL` | Internal main/User app URL for Mail | Yes for local | Yes if integrated | No | `http://localhost:8788` | Avoid public exposure if internal-only. |
| `DAILY_SMTP_LIMIT` | Mail send quota | Yes | Yes | No | `100` | Baseline anti-abuse quota. |
| `APP_PASSWORD_HASH_SECRET` | Mail app-password hash secret | No | Yes if app passwords enabled | Yes | `replace_with_secure_app_password_hash_secret` | Store as secret. |
| `MAIL_GATEWAY_AUTH_STORE` | Local gateway auth store path | Yes for local | No | Moderate | `./data/auth-store.json` | Do not commit generated file. |
| `MAIL_GATEWAY_AUDIT_LOG` | Local gateway audit log path | Yes for local | Optional | Moderate | `./data/audit.log` | May contain metadata. |
| `SMTP_TLS_KEY_PATH` | SMTP TLS key path | No | If custom TLS used | Yes | `path_to_local_tls_key_if_used` | Do not commit keys. |
| `SMTP_TLS_CERT_PATH` | SMTP TLS cert path | No | If custom TLS used | Low | `path_to_local_tls_cert_if_used` | Certificate path only. |
| `APPLE_CLIENT_ID` | Apple OAuth client id | No | If Apple login used | Low | `your_apple_client_id_here` | Operational config. |
| `APPLE_TEAM_ID` | Apple team id | No | If Apple login used | Low | `your_apple_team_id_here` | Operational config. |
| `APPLE_KEY_ID` | Apple key id | No | If Apple server auth used | Low | `your_apple_key_id_here` | Never commit matching private key. |
| `APPLE_PRIVATE_KEY_PATH` | Apple private key path | No | Avoid in repo | Yes | `path_to_local_apple_private_key_if_used` | Prefer secret store, not workspace file. |
| `GITHUB_CLIENT_ID` | GitHub OAuth client id | No | If GitHub login used | Low | `your_github_client_id_here` | OAuth config. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | No | If GitHub login used | Yes | `replace_with_github_oauth_secret` | Secret. |
| `GOOGLE_CLIENT_ID` | Google OAuth client id | No | If Google login used | Low | `your_google_client_id_here` | OAuth config. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No | If Google login used | Yes | `replace_with_google_oauth_secret` | Secret. |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client id | No | If Microsoft login used | Low | `your_microsoft_client_id_here` | OAuth config. |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret | No | If Microsoft login used | Yes | `replace_with_microsoft_oauth_secret` | Secret. |
| `APP_ENV` | Apple app build/runtime environment | No | If used | No | `production` | Xcode Cloud/App Store metadata. |
| `API_BASE_URL` | Apple/backend API URL override | No | If used | No | `https://api.chemvault.science` | Avoid embedding staging URLs in production binaries. |
| `REMOTE_CONFIG_URL` | Native app remote config URL | No | If used | No | `https://api.chemvault.science/app-config.json` | Confirm privacy and availability. |
| `SENTRY_DSN` | Crash/error reporting DSN | No | If Sentry enabled | Moderate | `your_sentry_dsn_here` | Add to privacy labels if used. |

## Configuration Locations

- Cloudflare Pages/Workers: configure bindings and secrets in Cloudflare dashboard or `wrangler secret`.
- GitHub Actions: configure deployment tokens and provider secrets in repository or environment secrets.
- Xcode Cloud/App Store Connect: store Apple signing/API secrets only in Apple-managed secret stores.
- Local development: copy `.env.example` to `.env.local` or equivalent and replace placeholders locally. Never commit local env files.

## Rotation Requirements

Rotate immediately if exposed or possibly exposed:

- Apple `.p8` / App Store Connect private keys;
- `JWT_SECRET`;
- `CLOUDFLARE_API_TOKEN`;
- `RESEND_API_KEY`;
- `OPENAI_API_KEY`;
- `STRIPE_SECRET_KEY`;
- OAuth client secrets;
- internal worker/gateway tokens;
- database and R2/S3 credentials.
