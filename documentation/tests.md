# Verification Map

## Automated coverage

| Use case | Rule or negative case | Evidence |
| --- | --- | --- |
| Billing identity | No credential fails before any User Center/Stripe request; request user ID is ignored | `tests/billing-api.test.mjs` |
| Checkout and portal | Fixed Price IDs, verified customer ownership, idempotency header, safe provider URL | `tests/billing-api.test.mjs` |
| Webhook integrity | HMAC verification, tolerance, malformed/invalid signatures, duplicate delivery, stale-event suppression | `tests/billing-api.test.mjs` |
| Entitlements | Active subscription drives browser and internal service plan; anonymous requests stay anonymous | `tests/billing-api.test.mjs`, `tests/commercial-api.test.mjs` |
| Metered paid usage | Cloud quantum is Pro+, daily limits are enforced with one conditional D1 insert, and replaying an idempotency ID does not double count | `tests/billing-api.test.mjs` |
| Billing account lifecycle | Export returns billing records; delete uses authenticated Stripe GET/DELETE, an idempotency key, and local cancellation state before success | `tests/billing-api.test.mjs` |
| Billing reconciliation | Dedicated secret is required; non-terminal Stripe state is retrieved and persisted | `tests/billing-api.test.mjs`, scheduled workflow |
| Commercial fail-closed behavior | Mock billing/auth disabled in production; client plan cannot unlock export | `tests/commercial-api.test.mjs` |
| Public record contract | Stable public-only schema; English/Chinese copies align | Contract tests and CI |
| Forms/leads/admin | Validation, ticket/admin scope, retention, email state, idempotent intake | Forms/leads tests and CI |
| Static/public build | Links, sitemap, record pages, generated output | `npm test`, `npm run build` |

## Required guarded live canaries

- Stripe test mode: sign in → Checkout → completed webhook → Pro entitlement → Portal → cancel-at-period-end update.
- Stripe production: one low-risk live transaction, refund/cancel verification, event log inspection, and audit record retention.
- D1: migration snapshot/restore rehearsal and duplicate/out-of-order webhook replay.
- Cross-service: a Free user is denied cloud quantum, a paid user succeeds, an exhausted daily quota is denied, an idempotent replay keeps the same usage count, and an invalid service secret is denied.
- Forms: submit → ticket lookup → admin reply → retention expiry, without logging form bodies.

## Remaining external evidence

Provider delivery, Cloudflare production bindings, Stripe account configuration, tax settings, and live money movement require deployed evidence. Local D1 mocks prove application behavior but do not replace a guarded canary against the deployed binding.
