const STRIPE_API_ORIGIN = "https://api.stripe.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;
const BILLABLE_PLANS = new Set(["pro", "team"]);
const BILLING_INTERVALS = new Set(["monthly", "yearly"]);
const ENTITLED_STATUSES = new Set(["active", "trialing"]);

export class BillingError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "BillingError";
    this.code = code;
    this.status = status;
  }
}

export function isStripeConfigured(env = {}) {
  return clean(env.PAYMENT_PROVIDER).toLowerCase() === "stripe" && Boolean(clean(env.STRIPE_SECRET_KEY));
}

export async function ensureBillingSchema(db) {
  if (!db?.prepare) throw new BillingError("billing_storage_unavailable", "Billing storage is unavailable.", 503);

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      organization_id TEXT,
      provider TEXT,
      provider_customer_id TEXT,
      provider_subscription_id TEXT,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      price_id TEXT,
      billing_interval TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      livemode INTEGER NOT NULL DEFAULT 0,
      last_event_id TEXT,
      last_event_created INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await Promise.all([
    safeAddColumn(db, "subscriptions", "price_id", "TEXT"),
    safeAddColumn(db, "subscriptions", "billing_interval", "TEXT"),
    safeAddColumn(db, "subscriptions", "cancel_at_period_end", "INTEGER NOT NULL DEFAULT 0"),
    safeAddColumn(db, "subscriptions", "livemode", "INTEGER NOT NULL DEFAULT 0"),
    safeAddColumn(db, "subscriptions", "last_event_id", "TEXT"),
    safeAddColumn(db, "subscriptions", "last_event_created", "INTEGER")
  ]);

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS billing_checkout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider_customer_id TEXT,
      provider_subscription_id TEXT,
      plan TEXT NOT NULL,
      billing_interval TEXT NOT NULL,
      price_id TEXT NOT NULL,
      seat_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'created',
      livemode INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS billing_webhook_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      livemode INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT
    )
  `).run();

  await Promise.all([
    db.prepare("CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON subscriptions (user_id, status)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON subscriptions (provider_customer_id)").run(),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_id_idx ON subscriptions (provider_subscription_id) WHERE provider_subscription_id IS NOT NULL").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS billing_checkout_user_idx ON billing_checkout_sessions (user_id, created_at)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS billing_webhook_processed_idx ON billing_webhook_events (processed_at)").run()
  ]);
}

export async function resolveBillingIdentity(request, env, { required = false } = {}) {
  const origin = userCenterOrigin(env);
  const headers = new Headers({ accept: "application/json", "user-agent": "ChemVault-Billing" });
  let hasCredential = false;
  for (const name of ["cookie", "authorization", "cf-access-jwt-assertion"]) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
      hasCredential = true;
    }
  }
  if (!hasCredential) {
    if (required) throw new BillingError("authentication_required", "Sign in before managing a subscription.", 401);
    return null;
  }

  let response;
  try {
    response = await fetch(`${origin}/api/auth/me`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });
  } catch {
    throw new BillingError("identity_service_unavailable", "User identity could not be verified.", 503);
  }

  if (response.status === 401 || response.status === 403) {
    if (required) throw new BillingError("authentication_required", "Sign in before managing a subscription.", 401);
    return null;
  }
  if (!response.ok) throw new BillingError("identity_service_unavailable", "User identity could not be verified.", 503);

  const payload = await response.json().catch(() => null);
  const user = payload?.user;
  const id = clean(user?.id);
  const email = clean(user?.email).toLowerCase();
  if (!id || !email || !email.includes("@")) {
    throw new BillingError("invalid_identity_response", "User identity response is incomplete.", 503);
  }
  return {
    id,
    email,
    role: normalizePlan(user?.role),
    systemRole: clean(user?.systemRole || user?.system_role).toLowerCase()
  };
}

export async function resolveSubscriptionContext(request, env, db, { requiredIdentity = false } = {}) {
  const identity = await resolveBillingIdentity(request, env, { required: requiredIdentity });
  if (!identity) return { identity: null, plan: "anonymous", subscription: null };
  if (["admin", "super_admin"].includes(identity.systemRole) || identity.role === "admin") {
    return { identity, plan: "admin", subscription: null };
  }
  if (!db?.prepare) return { identity, plan: "free", subscription: null };

  await ensureBillingSchema(db);
  const subscription = await latestSubscriptionForUser(db, identity.id);
  return {
    identity,
    plan: entitledPlan(subscription, env),
    subscription: publicSubscription(subscription)
  };
}

export async function resolvePlanForUserId(env, db, userId) {
  const id = clean(userId);
  if (!id) throw new BillingError("invalid_user_id", "A user ID is required.", 400);
  await ensureBillingSchema(db);
  return entitledPlan(await latestSubscriptionForUser(db, id), env);
}

export async function resolveBillingUserByEmail(env, emailAddress) {
  const email = clean(emailAddress).toLowerCase();
  const secret = clean(env.BILLING_SERVICE_SECRET);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BillingError("invalid_billing_email", "A valid billing email is required.", 400);
  }
  if (!secret) {
    throw new BillingError("billing_identity_not_configured", "Billing identity resolution is not configured.", 503);
  }

  const endpoint = new URL(`${userCenterOrigin(env)}/api/internal/billing/identity`);
  endpoint.searchParams.set("email", email);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${secret}`,
        "user-agent": "ChemVault-Billing"
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });
  } catch {
    throw new BillingError("identity_service_unavailable", "Billing identity could not be verified.", 503);
  }

  if (response.status === 404) {
    throw new BillingError("billing_identity_not_found", "Billing identity was not found.", 404);
  }
  if (!response.ok) {
    throw new BillingError("identity_service_unavailable", "Billing identity could not be verified.", 503);
  }

  const payload = await response.json().catch(() => null);
  const id = clean(payload?.user?.id);
  const resolvedEmail = clean(payload?.user?.email).toLowerCase();
  if (!id || resolvedEmail !== email) {
    throw new BillingError("invalid_identity_response", "Billing identity response is incomplete.", 503);
  }
  return { id, email: resolvedEmail };
}

export async function createStripeCheckoutSession(request, env, db, body = {}) {
  assertStripeConfigured(env);
  await ensureBillingSchema(db);
  const identity = await resolveBillingIdentity(request, env, { required: true });
  const plan = normalizePlan(body.planId);
  const interval = normalizeBillingInterval(body.billingInterval);
  if (!BILLABLE_PLANS.has(plan)) {
    throw new BillingError("unsupported_checkout_plan", "Only Pro and Team checkout are available online.", 400);
  }
  if (plan === "team" && !teamCheckoutEnabled(env)) {
    throw new BillingError("team_checkout_unavailable", "Team checkout is not available until organization and seat provisioning are enabled.", 409);
  }
  if (!BILLING_INTERVALS.has(interval)) {
    throw new BillingError("invalid_billing_interval", "Billing interval must be monthly or yearly.", 400);
  }
  const priceId = stripePriceId(env, plan, interval);
  if (!priceId) throw new BillingError("billing_price_not_configured", "The selected billing price is unavailable.", 503);

  const seatCount = plan === "team" ? clampInteger(body.seats, 2, 250, 2) : 1;
  const existing = await latestSubscriptionForUser(db, identity.id);
  const publicUrl = publicAppUrl(env);
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${publicUrl}/pages/pricing.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${publicUrl}/pages/pricing.html?checkout=cancelled`);
  params.set("client_reference_id", identity.id);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", String(seatCount));
  params.set("metadata[chemvault_user_id]", identity.id);
  params.set("metadata[chemvault_plan]", plan);
  params.set("metadata[chemvault_billing_interval]", interval);
  params.set("metadata[chemvault_seat_count]", String(seatCount));
  params.set("subscription_data[metadata][chemvault_user_id]", identity.id);
  params.set("subscription_data[metadata][chemvault_plan]", plan);
  params.set("subscription_data[metadata][chemvault_billing_interval]", interval);
  params.set("subscription_data[metadata][chemvault_seat_count]", String(seatCount));
  if (existing?.provider_customer_id) params.set("customer", existing.provider_customer_id);
  else params.set("customer_email", identity.email);
  if (parseBoolean(env.STRIPE_AUTOMATIC_TAX, false)) params.set("automatic_tax[enabled]", "true");

  const session = await stripeRequest(env, "/v1/checkout/sessions", params, {
    idempotencyKey: stripeIdempotencyKey(request)
  });
  if (!clean(session?.id) || !safeStripeUrl(session?.url)) {
    throw new BillingError("invalid_stripe_response", "Stripe did not return a valid checkout session.", 502);
  }

  await db.prepare(`
    INSERT OR IGNORE INTO billing_checkout_sessions
      (id, user_id, provider_customer_id, plan, billing_interval, price_id, seat_count, status, livemode)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?)
  `).bind(
    session.id,
    identity.id,
    clean(stringId(session.customer)) || null,
    plan,
    interval,
    priceId,
    seatCount,
    session.livemode ? 1 : 0
  ).run();

  return {
    ok: true,
    code: "checkout_session_created",
    mode: session.livemode ? "live" : "test",
    planId: plan,
    billingInterval: interval,
    seats: seatCount,
    sessionId: session.id,
    url: session.url
  };
}

export async function createStripePortalSession(request, env, db) {
  assertStripeConfigured(env);
  await ensureBillingSchema(db);
  const identity = await resolveBillingIdentity(request, env, { required: true });
  const subscription = await latestSubscriptionForUser(db, identity.id);
  const customerId = clean(subscription?.provider_customer_id);
  if (!customerId) throw new BillingError("billing_customer_not_found", "No billing customer exists for this account.", 404);

  const params = new URLSearchParams({ customer: customerId, return_url: `${publicAppUrl(env)}/pages/pricing.html` });
  const session = await stripeRequest(env, "/v1/billing_portal/sessions", params, {
    idempotencyKey: stripeIdempotencyKey(request)
  });
  if (!safeStripeUrl(session?.url)) throw new BillingError("invalid_stripe_response", "Stripe did not return a valid portal session.", 502);
  return { ok: true, code: "billing_portal_created", url: session.url };
}

export async function handleStripeWebhook(request, env, db, { production = false } = {}) {
  const secret = clean(env.STRIPE_WEBHOOK_SECRET);
  if (!secret) throw new BillingError("webhook_not_configured", "Stripe webhook verification is not configured.", 503);
  if (!db?.prepare) throw new BillingError("billing_storage_unavailable", "Billing storage is unavailable.", 503);

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 1024 * 1024) {
    throw new BillingError("webhook_too_large", "Stripe webhook payload is too large.", 413);
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 1024 * 1024) {
    throw new BillingError("webhook_too_large", "Stripe webhook payload is too large.", 413);
  }

  await verifyStripeSignature(
    rawBody,
    request.headers.get("stripe-signature"),
    secret,
    Number(env.STRIPE_WEBHOOK_TOLERANCE_SECONDS || DEFAULT_SIGNATURE_TOLERANCE_SECONDS)
  );
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new BillingError("invalid_webhook_event", "Stripe webhook body must be valid JSON.", 400);
  }
  if (!clean(event?.id) || !clean(event?.type) || !event?.data?.object) {
    throw new BillingError("invalid_webhook_event", "Stripe webhook event is incomplete.", 400);
  }
  if (production && !event.livemode && !parseBoolean(env.ALLOW_STRIPE_TEST_EVENTS, false)) {
    throw new BillingError("stripe_test_event_rejected", "Test-mode Stripe events are disabled in production.", 400);
  }

  await ensureBillingSchema(db);
  const existing = await db.prepare("SELECT processed_at FROM billing_webhook_events WHERE id = ? LIMIT 1").bind(event.id).first();
  if (existing?.processed_at) return { ok: true, received: true, duplicate: true, eventId: event.id };

  await db.prepare(`
    INSERT INTO billing_webhook_events (id, type, livemode, attempts)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET attempts = attempts + 1, last_error = NULL
  `).bind(event.id, event.type, event.livemode ? 1 : 0).run();

  try {
    await processStripeEvent(db, env, event);
    await db.prepare("UPDATE billing_webhook_events SET processed_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = ?")
      .bind(event.id).run();
  } catch (error) {
    await db.prepare("UPDATE billing_webhook_events SET last_error = ? WHERE id = ?")
      .bind(limitText(error instanceof Error ? error.message : "Webhook processing failed.", 500), event.id).run();
    throw error;
  }
  return { ok: true, received: true, duplicate: false, eventId: event.id, eventType: event.type };
}

export async function handleBillingLifecycle(env, db, userId, body = {}) {
  const id = clean(userId);
  const action = clean(body.action).toLowerCase();
  const requestId = clean(body.requestId).slice(0, 160);
  if (!id) throw new BillingError("invalid_user_id", "A user ID is required.", 400);
  if (!requestId) throw new BillingError("invalid_lifecycle_request", "A lifecycle request ID is required.", 400);
  if (!new Set(["export", "delete"]).has(action)) {
    throw new BillingError("invalid_lifecycle_action", "Lifecycle action must be export or delete.", 400);
  }

  await ensureBillingSchema(db);
  const subscriptionResult = await db.prepare(`
    SELECT id, provider, provider_customer_id, provider_subscription_id, plan, status, price_id,
           billing_interval, current_period_end, cancel_at_period_end, livemode, created_at, updated_at
    FROM subscriptions
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).bind(id).all();
  const checkoutResult = await db.prepare(`
    SELECT id, provider_customer_id, provider_subscription_id, plan, billing_interval, price_id,
           seat_count, status, livemode, created_at, completed_at
    FROM billing_checkout_sessions
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).bind(id).all();
  const subscriptions = Array.isArray(subscriptionResult?.results) ? subscriptionResult.results : [];
  const checkoutSessions = Array.isArray(checkoutResult?.results) ? checkoutResult.results : [];

  if (action === "export") {
    return {
      ok: true,
      action,
      userId: id,
      records: subscriptions.length + checkoutSessions.length,
      subscriptions: subscriptions.map(publicLifecycleSubscription),
      checkoutSessions: checkoutSessions.map(publicLifecycleCheckout)
    };
  }

  const cancellable = subscriptions.filter((subscription) =>
    clean(subscription.provider).toLowerCase() === "stripe"
    && clean(subscription.provider_subscription_id)
    && !new Set(["canceled", "incomplete_expired"]).has(clean(subscription.status).toLowerCase())
  );
  if (cancellable.length) assertStripeConfigured(env);

  const canceled = [];
  for (const subscription of cancellable) {
    const providerId = clean(subscription.provider_subscription_id);
    let remote = await stripeRequest(env, `/v1/subscriptions/${encodeURIComponent(providerId)}`, null, { method: "GET" });
    if (clean(remote?.status).toLowerCase() !== "canceled") {
      remote = await stripeRequest(env, `/v1/subscriptions/${encodeURIComponent(providerId)}`, null, {
        method: "DELETE",
        idempotencyKey: `chemvault:lifecycle:${requestId}:${providerId}`.slice(0, 255)
      });
    }
    if (clean(remote?.status).toLowerCase() !== "canceled") {
      throw new BillingError("subscription_cancellation_failed", "Stripe did not confirm subscription cancellation.", 502);
    }
    await upsertStripeSubscription(db, env, {
      id: `lifecycle:${requestId}:${providerId}`.slice(0, 255),
      created: Math.floor(Date.now() / 1000),
      livemode: Boolean(remote.livemode)
    }, remote);
    canceled.push(providerId);
  }

  return {
    ok: true,
    action,
    userId: id,
    canceledSubscriptions: canceled.length,
    retainedBillingRecords: subscriptions.length + checkoutSessions.length,
    retentionNote: "Billing transaction records are retained under the documented financial-record policy."
  };
}

export async function verifyStripeSignature(rawBody, signatureHeader, secret, toleranceSeconds = DEFAULT_SIGNATURE_TOLERANCE_SECONDS, nowMs = Date.now()) {
  const parsed = parseStripeSignature(signatureHeader);
  const tolerance = clampInteger(toleranceSeconds, 30, 900, DEFAULT_SIGNATURE_TOLERANCE_SECONDS);
  if (Math.abs(Math.floor(nowMs / 1000) - parsed.timestamp) > tolerance) {
    throw new BillingError("expired_webhook_signature", "Stripe webhook signature timestamp is outside the allowed tolerance.", 400);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parsed.timestamp}.${rawBody}`));
  const expected = bytesToHex(new Uint8Array(digest));
  if (!parsed.signatures.some((candidate) => constantTimeEqual(expected, candidate))) {
    throw new BillingError("invalid_webhook_signature", "Stripe webhook signature verification failed.", 400);
  }
  return true;
}

async function processStripeEvent(db, env, event) {
  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    await recordCompletedCheckout(db, event, object);
    return;
  }
  if (event.type.startsWith("customer.subscription.")) {
    await upsertStripeSubscription(db, env, event, object);
  }
}

async function recordCompletedCheckout(db, event, session) {
  const sessionId = clean(session.id);
  const userId = clean(session.metadata?.chemvault_user_id || session.client_reference_id);
  if (!sessionId || !userId) return;
  const customerId = clean(stringId(session.customer)) || null;
  const subscriptionId = clean(stringId(session.subscription)) || null;
  await db.prepare(`
    UPDATE billing_checkout_sessions
    SET provider_customer_id = ?, provider_subscription_id = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).bind(customerId, subscriptionId, sessionId, userId).run();

  if (!subscriptionId) return;
  const existing = await db.prepare("SELECT id FROM subscriptions WHERE provider_subscription_id = ? LIMIT 1")
    .bind(subscriptionId).first();
  if (existing) return;
  const plan = normalizePlan(session.metadata?.chemvault_plan);
  const interval = normalizeBillingInterval(session.metadata?.chemvault_billing_interval, "monthly");
  await db.prepare(`
    INSERT INTO subscriptions
      (id, user_id, provider, provider_customer_id, provider_subscription_id, plan, status, billing_interval,
       livemode, last_event_id, last_event_created)
    VALUES (?, ?, 'stripe', ?, ?, ?, 'checkout_complete', ?, ?, ?, ?)
  `).bind(
    `sub_${crypto.randomUUID()}`,
    userId,
    customerId,
    subscriptionId,
    BILLABLE_PLANS.has(plan) ? plan : "free",
    interval,
    event.livemode ? 1 : 0,
    event.id,
    stripeEventCreated(event)
  ).run();
}

async function upsertStripeSubscription(db, env, event, subscription) {
  const providerSubscriptionId = clean(subscription.id);
  if (!providerSubscriptionId) return;
  const existing = await db.prepare("SELECT id, user_id, last_event_created FROM subscriptions WHERE provider_subscription_id = ? LIMIT 1")
    .bind(providerSubscriptionId).first();
  const eventCreated = stripeEventCreated(event);
  if (existing?.last_event_created && eventCreated && Number(existing.last_event_created) > eventCreated) return;
  const userId = clean(subscription.metadata?.chemvault_user_id || existing?.user_id);
  if (!userId) return;
  const priceId = clean(subscription.items?.data?.[0]?.price?.id);
  const plan = planForPrice(env, priceId) || normalizePlan(subscription.metadata?.chemvault_plan);
  const interval = intervalForPrice(env, priceId) || normalizeBillingInterval(subscription.metadata?.chemvault_billing_interval, "monthly");
  const periodEnd = stripeTimestamp(subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end);
  const values = [
    userId,
    clean(stringId(subscription.customer)) || null,
    BILLABLE_PLANS.has(plan) ? plan : "free",
    clean(subscription.status) || "unknown",
    priceId || null,
    interval,
    periodEnd,
    subscription.cancel_at_period_end ? 1 : 0,
    event.livemode ? 1 : 0,
    event.id,
    eventCreated
  ];
  if (existing?.id) {
    await db.prepare(`
      UPDATE subscriptions SET
        user_id = ?, provider_customer_id = ?, plan = ?, status = ?, price_id = ?, billing_interval = ?,
        current_period_end = ?, cancel_at_period_end = ?, livemode = ?, last_event_id = ?, updated_at = CURRENT_TIMESTAMP
        , last_event_created = ?
      WHERE id = ?
    `).bind(...values, existing.id).run();
    return;
  }
  await db.prepare(`
    INSERT INTO subscriptions
      (id, user_id, provider, provider_customer_id, provider_subscription_id, plan, status, price_id,
       billing_interval, current_period_end, cancel_at_period_end, livemode, last_event_id, last_event_created)
    VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    `sub_${crypto.randomUUID()}`,
    userId,
    values[1],
    providerSubscriptionId,
    values[2],
    values[3],
    values[4],
    values[5],
    values[6],
    values[7],
    values[8],
    values[9],
    values[10]
  ).run();
}

async function latestSubscriptionForUser(db, userId) {
  return db.prepare(`
    SELECT id, user_id, provider, provider_customer_id, provider_subscription_id, plan, status,
           price_id, billing_interval, current_period_end, cancel_at_period_end, livemode
    FROM subscriptions
    WHERE user_id = ?
    ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'trialing' THEN 1 WHEN 'past_due' THEN 2 ELSE 3 END,
             updated_at DESC
    LIMIT 1
  `).bind(userId).first();
}

function entitledPlan(subscription, env) {
  if (!subscription) return "free";
  const status = clean(subscription.status).toLowerCase();
  const entitled = ENTITLED_STATUSES.has(status) || (status === "past_due" && parseBoolean(env.BILLING_PAST_DUE_GRACE, false));
  if (!entitled) return "free";
  const plan = normalizePlan(subscription.plan);
  return BILLABLE_PLANS.has(plan) || plan === "enterprise" ? plan : "free";
}

function publicSubscription(subscription) {
  if (!subscription) return null;
  return {
    provider: clean(subscription.provider),
    plan: normalizePlan(subscription.plan),
    status: clean(subscription.status),
    billingInterval: clean(subscription.billing_interval),
    currentPeriodEnd: subscription.current_period_end || null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
  };
}

function publicLifecycleSubscription(subscription) {
  return {
    provider: clean(subscription.provider),
    customerId: clean(subscription.provider_customer_id) || null,
    subscriptionId: clean(subscription.provider_subscription_id) || null,
    plan: normalizePlan(subscription.plan),
    status: clean(subscription.status),
    priceId: clean(subscription.price_id) || null,
    billingInterval: clean(subscription.billing_interval) || null,
    currentPeriodEnd: subscription.current_period_end || null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    livemode: Boolean(subscription.livemode),
    createdAt: subscription.created_at || null,
    updatedAt: subscription.updated_at || null
  };
}

function publicLifecycleCheckout(session) {
  return {
    sessionId: clean(session.id),
    customerId: clean(session.provider_customer_id) || null,
    subscriptionId: clean(session.provider_subscription_id) || null,
    plan: normalizePlan(session.plan),
    billingInterval: clean(session.billing_interval) || null,
    priceId: clean(session.price_id) || null,
    seats: Number(session.seat_count || 1),
    status: clean(session.status),
    livemode: Boolean(session.livemode),
    createdAt: session.created_at || null,
    completedAt: session.completed_at || null
  };
}

async function stripeRequest(env, path, body, { idempotencyKey, method = "POST" } = {}) {
  let response;
  try {
    const headers = {
      authorization: `Bearer ${clean(env.STRIPE_SECRET_KEY)}`,
      "user-agent": "ChemVault-Billing/1.0"
    };
    if (body !== null && body !== undefined) headers["content-type"] = "application/x-www-form-urlencoded";
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    if (clean(env.STRIPE_API_VERSION)) headers["stripe-version"] = clean(env.STRIPE_API_VERSION);
    response = await fetch(`${STRIPE_API_ORIGIN}${path}`, {
      method,
      headers,
      ...(body === null || body === undefined ? {} : { body }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });
  } catch {
    throw new BillingError("stripe_unavailable", "Stripe is temporarily unavailable.", 503);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new BillingError("stripe_request_failed", limitText(payload?.error?.message || "Stripe rejected the billing request.", 300), 502);
  }
  return payload;
}

function assertStripeConfigured(env) {
  if (!isStripeConfigured(env)) throw new BillingError("payment_not_configured", "Stripe billing is not configured.", 503);
}

function stripePriceId(env, plan, interval) {
  const key = `STRIPE_${plan.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`;
  return clean(env[key]);
}

function planForPrice(env, priceId) {
  if (!priceId) return "";
  for (const plan of BILLABLE_PLANS) {
    for (const interval of BILLING_INTERVALS) {
      if (stripePriceId(env, plan, interval) === priceId) return plan;
    }
  }
  return "";
}

function intervalForPrice(env, priceId) {
  if (!priceId) return "";
  for (const plan of BILLABLE_PLANS) {
    for (const interval of BILLING_INTERVALS) {
      if (stripePriceId(env, plan, interval) === priceId) return interval;
    }
  }
  return "";
}

function stripeIdempotencyKey(request) {
  const supplied = clean(request.headers.get("idempotency-key"));
  if (supplied && /^[A-Za-z0-9:_-]{16,255}$/.test(supplied)) return `chemvault:${supplied}`.slice(0, 255);
  return `chemvault:${crypto.randomUUID()}`;
}

function parseStripeSignature(header) {
  const entries = clean(header).split(",").map((part) => part.trim().split("=", 2));
  const timestamp = Number(entries.find(([key]) => key === "t")?.[1]);
  const signatures = entries.filter(([key, value]) => key === "v1" && /^[a-f0-9]{64}$/i.test(value || "")).map(([, value]) => value.toLowerCase());
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new BillingError("invalid_webhook_signature", "Stripe webhook signature header is invalid.", 400);
  }
  return { timestamp, signatures };
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeStripeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "checkout.stripe.com" || url.hostname === "billing.stripe.com") ? url.toString() : "";
  } catch {
    return "";
  }
}

function publicAppUrl(env) {
  const value = clean(env.PUBLIC_APP_URL || "https://chemvault.science").replace(/\/+$/, "");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new BillingError("invalid_public_app_url", "PUBLIC_APP_URL is invalid.", 503);
  }
  if (url.protocol !== "https:" && clean(env.ENVIRONMENT).toLowerCase() === "production") {
    throw new BillingError("invalid_public_app_url", "PUBLIC_APP_URL must use HTTPS in production.", 503);
  }
  return url.toString().replace(/\/+$/, "");
}

function userCenterOrigin(env) {
  return clean(env.USER_SYSTEM_ORIGIN || env.CHEMVAULT_USER_ORIGIN || "https://user.chemvault.science").replace(/\/+$/, "");
}

function normalizePlan(value) {
  const plan = clean(value).toLowerCase();
  return ["anonymous", "free", "pro", "team", "enterprise", "admin"].includes(plan) ? plan : "free";
}

function teamCheckoutEnabled(env) {
  return clean(env.TEAM_BILLING_ENABLED).toLowerCase() === "true";
}

function normalizeBillingInterval(value, fallback = "") {
  const interval = clean(value).toLowerCase();
  if (interval === "annual") return "yearly";
  return BILLING_INTERVALS.has(interval) ? interval : fallback;
}

function stringId(value) {
  return typeof value === "string" ? value : value?.id;
}

function stripeTimestamp(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

function stripeEventCreated(event) {
  const seconds = Number(event?.created);
  return Number.isInteger(seconds) && seconds > 0 ? seconds : null;
}

function parseBoolean(value, fallback = false) {
  const normalized = clean(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function limitText(value, maxLength) {
  return clean(value).slice(0, maxLength);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function safeAddColumn(db, table, column, definition) {
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error instanceof Error ? error.message : String(error))) throw error;
  }
}
