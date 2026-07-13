# Commercial Readiness

Status: implementation-ready, not production-enabled.

## Intended versus implemented

| Commercial promise | Implemented evidence | Current release decision |
| --- | --- | --- |
| Users can select Pro or Team recurring plans | Server maps plan/interval to four configured Stripe Price IDs and creates Checkout Sessions | Code ready; blocked on real product/price/account configuration |
| Customers can manage subscriptions | Verified user resolves only their stored Stripe customer and receives a portal session | Code ready; blocked on portal configuration and live canary |
| Paid access follows payment state | Signed, idempotent, non-stale subscription events update D1; entitlement APIs read active/trialing state | Code ready; cross-service enforcement must be completed before broad launch |
| Anonymous/client claims cannot unlock paid features | No credential yields Anonymous; request user/plan values are ignored; internal API requires service secret | Automated coverage complete; deployed deny canary still required |
| Operations can recover from provider failures | Webhook attempts/errors, checkout sessions, subscription timestamps, runbook, and rollback boundary exist | Runbook ready; monitoring/alerts need production wiring |

## Release gate

All boxes are required before public checkout is enabled:

- [ ] D1 production backup and `0005_stripe_billing.sql` migration verified.
- [ ] Stripe business/account verification, statement descriptor, support contacts, refund policy, cancellation terms, and portal configuration approved.
- [ ] Pro/Team monthly/yearly Price IDs reviewed against published pricing and tax treatment.
- [ ] Production secrets configured without exposure; test events rejected in production.
- [ ] Stripe test-mode end-to-end canary passes, including cancellation and out-of-order replay.
- [ ] Each paid suite service enforces server-resolved entitlements and records usage where a quota is promised.
- [ ] Live low-risk purchase/refund canary reconciles Stripe, D1, entitlement API, receipt, and portal.
- [ ] Billing failure alerts and an on-call owner are assigned.
- [ ] Privacy, terms, refund, tax, and invoice wording receive owner approval.

## Stop/rollback triggers

Disable paid entry points if any of these occur: unsigned/unverifiable events accepted; a user can select another user's customer; client plan claims unlock paid access; Stripe and D1 disagree for an active subscription beyond the reconciliation window; paid operations are not enforced in a service; or support/refund ownership is unavailable.

The pricing page must continue to describe private beta/no public checkout until every release-gate item is complete. This prevents product copy from outrunning operational reality.
