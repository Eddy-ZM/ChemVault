# Architecture

ChemVault is the suite's public chemistry knowledge/search site and the server authority for public intake, billing subscriptions, plan entitlements, private form administration, and related notification email. Cloudflare Pages serves static pages and generated public-record JSON. Pages Functions keep D1 and provider credentials server-side.

ChemVault User is the identity authority. Billing endpoints forward the existing session credential to User Center `/api/auth/me`; client-provided user IDs and plan names are never billing authority. Stripe is the payment-state authority. Signed `customer.subscription.*` events update D1, and the main site resolves the effective plan from the verified user plus the latest entitled subscription. Older webhook events cannot overwrite newer subscription state.

Authorized suite services may read a user's resolved plan through `/api/internal/billing/entitlements` with `BILLING_SERVICE_SECRET`. Services may supply a canonical User Center ID, or a verified account email that the main API resolves through User Center's minimal internal identity endpoint. The service secret proves service identity only; the calling service must independently prove which end user is making the request.

Billing is a required participant in User Center's distributed account lifecycle. Export returns the user's billing metadata. Delete first retrieves and cancels every non-terminal Stripe subscription, updates local entitlement state, and only then reports success; financial transaction records remain subject to the documented retention policy instead of being silently erased.

Stripe webhooks remain the primary event path. A separately credentialed daily reconciliation job retrieves every bounded non-terminal subscription and reapplies Stripe's current state to D1, so a lost or repeatedly failed webhook does not leave access permanently stale.

Public chemistry records are intentionally public. Form bodies, reply emails, leads, billing customer/subscription IDs, webhook records, admin audit, and replies are private. No browser receives Stripe secret keys, webhook secrets, or the cross-service billing credential.

The repository contains a production-capable billing implementation, but billing remains disabled until Stripe products/prices, secrets, webhook delivery, D1 migration, and live canaries pass the release gate in [Commercial readiness](commercial-readiness.md).

## Related documents

- [Critical flows](flows.md) · [Permissions](permissions.md) · [Runtime variables](variables.md) · [Verification](tests.md)
- [Billing runbook](billing-runbook.md) · [Commercial readiness](commercial-readiness.md)
- [Retention](cron.md) · [Email](emails.md) · [SEO/public data](seo.md)
