# Critical Flows

| Flow | Actor/precondition | Protected sequence and side effects | Failure/deny behavior |
| --- | --- | --- | --- |
| Public search/read | Anyone | Load generated public-only index and record page | Private/admin/billing fields never enter the public index |
| Plan lookup | Browser with optional shared session | Verify session through User Center, read latest entitled D1 subscription, return plan and feature map | No credential returns Anonymous; invalid session does not inherit a client-claimed plan |
| Checkout | Signed-in user; Stripe and D1 configured | Verify identity, map an allowed plan/interval to a server-owned Price ID, create idempotent Checkout Session, record session | Missing identity is 401; invalid plan/interval is 400; missing provider/storage fails closed |
| Billing portal | Signed-in user with known Stripe customer | Verify identity, load that user's customer ID, create short-lived Stripe portal session | A body-supplied user/customer is ignored; unknown customer is 404 |
| Subscription webhook | Stripe with fresh valid signature | Verify raw body, deduplicate event, reject disallowed test events, apply only non-stale subscription state, record result | Invalid/stale signature or malformed payload is 400; processing errors remain retryable and auditable |
| Internal entitlement lookup | Authorized ChemVault service plus a server-verified user ID | Validate service bearer secret, resolve subscription-backed plan, return feature booleans | Missing/incorrect service secret is 401; storage failure is 503 |
| Billing lifecycle export/delete | User Center with lifecycle credential | Export billing metadata or retrieve and cancel every non-terminal Stripe subscription before identity deletion | Missing credential/storage/provider failure blocks final account deletion; retained financial records follow policy |
| Form/lead/newsletter submit | Public user with bounded valid input and anti-abuse checks | Validate, minimize/hash network data, atomically write D1, issue ticket, send/queue notifications | Invalid/rate-limited requests denied; duplicate idempotency key returns original ticket; mail failure does not erase intake |
| Ticket lookup | Reporter with ticket proof | Return bounded submission/reply state | Unknown ticket returns no private record |
| Admin triage/export/reply | Verified administrator | Resolve permission, read/update/export D1, write audit, optionally notify | Claimed email or UI state alone is insufficient; non-admin denied |
| Retention purge | Scheduled service secret | Delete expired form records/attachments by policy and report counts | Missing secret fails; run is bounded and idempotent |
