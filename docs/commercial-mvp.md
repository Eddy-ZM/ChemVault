# ChemVault Commercial Foundation

This document records the commercial capabilities that are implemented in source and the controls that must remain in place until production launch approval is complete.

## Product boundary

The main ChemVault site provides product discovery, compound search, pricing, lead capture, billing entry points, central subscription state, and internal service entitlements. It links to the dedicated product services instead of simulating their state:

- Files: `https://file.chemvault.science/`
- Lab: `https://lab.chemvault.science/`
- Mail: `https://mail.chemvault.science/`
- User: `https://user.chemvault.science/`
- Model: `https://model.chemvault.science/`
- Docs: `https://docs.chemvault.science/`
- Notifications: `https://notif.chemvault.science/`
- Download Center: `https://download.chemvault.science/`

Public pages must describe supported behavior only. Planned exports, shared workspaces, SSO, managed APIs, AI summaries, and similar roadmap items are not included in a purchasable plan until their end-to-end implementation and operational owner are ready.

## Plans shown publicly

- Free: public website and compound search, standard Mail allowance, 100 MB Files quota, local modeling tools, and public documentation.
- Pro: 10 GB Files quota, 20 cloud quantum jobs per UTC day, expanded Mail allowance, and self-service subscription management.
- Team/Lab: pilot only; 100 GB storage allocation, 200 cloud quantum jobs per UTC day, higher Mail allowance, pilot onboarding, and invoice support.
- Enterprise/Institution: contact-led requirements review, custom quotas, storage and migration planning, procurement, and onboarding.

Team checkout remains disabled unless a separate launch decision explicitly enables it. Enterprise is contact-led and has no self-service checkout.

## Identity and subscription source of truth

ChemVault User supplies the canonical verified user identity. The main billing API resolves plan state from D1 subscriptions; clients and downstream services cannot select their own plan.

Stripe integration in source includes:

- verified-user checkout creation;
- billing portal session creation;
- signed webhook processing;
- idempotent webhook storage;
- subscription upsert and cancellation state;
- daily reconciliation;
- cancellation before distributed account deletion.

Public checkout remains disabled until Stripe products, secrets, webhook routing, tax/refund terms, support ownership, legal copy, and canary checks are approved.

## Metered cloud usage

`POST /api/internal/billing/usage/consume` is a service-to-service endpoint protected by `BILLING_SERVICE_SECRET`. The caller submits a verified user ID, a supported feature key, a trusted request ID, and an integer amount.

For `modeling.cloud_quantum`, the API:

- resolves the plan from the central subscription record;
- applies a UTC-day allowance of 0/20/200/1000 for Free/Pro/Team/Enterprise;
- writes usage with a deterministic idempotency key;
- uses one conditional D1 insert so concurrent calls cannot exceed the allowance through a read-then-write race;
- returns HTTP 402 for insufficient subscription and HTTP 429 for exhausted quota.

Model generates the internal accounting request ID. Browser and native clients cannot reuse a caller-selected idempotency key to bypass quota. Local Gaussian, ORCA, PySCF, xTB, viewer, and export workflows are not SaaS-metered.

## Rollout modes

Downstream paid services use three modes:

- `off`: no billing check; development only.
- `shadow`: call billing and record the observed decision, but do not deny the product action.
- `enforce`: fail closed when subscription, quota, secret, or billing availability checks fail.

Production source stays in `shadow` until the target D1 migrations and secrets are installed and canaries prove Pro allow, Free deny, exhausted-quota deny, internal replay idempotency, and billing-unavailable behavior.

## Database migrations

Apply migrations in order to every target environment:

1. `0001_add_record_images.sql`
2. `0002_add_forms_management.sql`
3. `0003_leads_email_notifications.sql`
4. `0004_forms_retention.sql`
5. `0005_stripe_billing.sql`
6. `0006_billing_usage_enforcement.sql`

Keep Preview/Staging and Production D1 databases separate. Do not treat `schema.sql` as proof that an existing remote database has received later migrations.

The schema groups have distinct ownership:

- `leads` and `newsletter_subscribers` support acquisition and consented updates.
- `organizations` and `memberships` reserve the Team authorization model; their presence does not enable Team checkout.
- `subscriptions`, `feature_entitlements`, and `usage_records` support central billing, plan resolution, and metering.
- `resources` supports the public content index.

## Safe environment defaults

- `ENVIRONMENT=production`
- `COMMERCIAL_MODE=production`
- `ENABLE_MOCK_AUTH=false`
- `ENABLE_MOCK_BILLING=false`
- `ENABLE_PUBLIC_CHECKOUT=false` until launch approval
- `ENABLE_TEAM_CHECKOUT=false` until the organization and seat model is ready
- `PAYMENT_PROVIDER=stripe` only when Stripe secrets are installed

Mock billing is allowed only in local or staging QA and must identify itself as non-payment behavior. Production never returns fake checkout success.

## Supported API outcomes

- `/api/health` reports service and dependency readiness.
- `/api/entitlements` returns server-resolved plan and shipped feature entitlements.
- `/api/billing/checkout` creates a Stripe session only when identity, configuration, and launch flags allow it.
- `/api/billing/portal` creates a Stripe portal session only for the canonical customer identity.
- `/api/billing/webhook` requires a valid Stripe signature and processes events idempotently.
- `/api/internal/billing/entitlements` is service-secret protected.
- `/api/internal/billing/usage/consume` is service-secret protected and meters supported features.
- `/api/export/compound` returns `501 feature_not_available`; compound export is not sold.

## Verification

Before merging or release:

```powershell
npm test
npm run contract:verify
npm run build
git diff --check
```

Before switching any downstream service from `shadow` to `enforce`, follow `documentation/billing-runbook.md` and record the migration, secret, canary, rollback owner, and observed metrics.

## Remaining launch approvals

Source readiness does not by itself authorize public paid launch. The release owner must still approve:

- production Stripe account, products, prices, webhook endpoint, and secrets;
- tax, refund, renewal, cancellation, consumer, privacy, and terms language;
- support and incident ownership;
- production D1 migrations and backup/retention policy;
- paid-service canaries and rollback;
- Team organization, seat, and authorization model before Team self-service checkout.

The current operational checklist is `documentation/commercial-readiness.md`; the detailed billing procedure is `documentation/billing-runbook.md`.
