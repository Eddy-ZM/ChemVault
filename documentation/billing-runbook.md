# Billing Runbook

## Enablement order

1. Create Stripe Pro and Team recurring Prices for monthly and yearly billing. Record only Price IDs in server config.
2. Back up D1, then apply `migrations/0005_stripe_billing.sql` once. Verify the new tables, columns, and indexes.
3. Set `PUBLIC_APP_URL`, `USER_SYSTEM_ORIGIN`, `PAYMENT_PROVIDER=stripe`, and the four Price IDs.
4. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a newly generated `BILLING_SERVICE_SECRET` to server secret stores. Install the same billing service secret on the main API, User Center, and each quota-enforcing product; never expose it to clients.
5. Register `POST https://chemvault.science/api/billing/webhook` for Checkout Session completion and customer subscription lifecycle events.
6. Keep `ALLOW_STRIPE_TEST_EVENTS=false` in production. Use Stripe test mode in a non-production environment for the full canary.
7. Enable paid calls-to-action only after the release gate in `commercial-readiness.md` is signed off.

For Files, Lab, and Mail, deploy in `shadow` mode first. Verify canonical identity, plan mapping, usage recording, and one synthetic over-quota event, then switch each service independently to `enforce`. A missing identity, secret, D1 binding, or billing response must fail closed after enforcement is enabled.

## Signals to monitor

- Count and age of rows in `billing_webhook_events` with `processed_at IS NULL` or non-empty `last_error`.
- Checkout sessions that remain `created` beyond the expected completion window.
- Subscription counts by status and plan, especially spikes in `past_due`, `canceled`, or unmapped `free`.
- Stripe API 5xx/timeout rate, User Center verification failures, and internal entitlement 401/503 rate.
- Mismatch between Stripe active subscriptions and D1 active/trialing subscriptions.

Never log cookies, authorization headers, Stripe keys, webhook signatures, complete Stripe payloads, or billing-service secrets.

## Incident actions

| Symptom | Immediate action | Recovery proof |
| --- | --- | --- |
| Invalid webhook spike | Confirm endpoint secret and raw-body handling; do not bypass verification | Valid signed event processes; invalid signature remains 400 |
| Events stuck with errors | Inspect bounded `last_error`, repair mapping/storage, replay affected Stripe events | All affected event IDs have `processed_at`; subscriptions match Stripe |
| Identity service outage | Leave paid management fail closed; communicate degradation | Signed-in plan lookup and Checkout succeed after recovery |
| Wrong entitlement | Disable paid CTA if broad, compare event timestamps/Price mapping, replay newest subscription event | Browser and internal endpoints agree with Stripe state |
| Secret exposure | Rotate the affected secret, update every authorized service, invalidate old value | Old credential denied; new credential passes canary |

Rollback means disabling paid entry points and setting `PAYMENT_PROVIDER` away from `stripe`; it must not delete subscription or webhook history. Existing Stripe subscriptions still require operator management until the provider and D1 state are reconciled.
