import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { onRequest } from "../functions/api/[[path]].js";
import { BillingError, verifyStripeSignature } from "../functions/_shared/billing.js";

class BillingD1Mock {
  constructor({ subscriptions = [] } = {}) {
    this.subscriptions = subscriptions.map((subscription) => ({ ...subscription }));
    this.checkoutSessions = [];
    this.webhookEvents = new Map();
    this.usageRecords = [];
  }

  prepare(sql) {
    const normalized = sql.replace(/\s+/g, " ").trim().toUpperCase();
    let values = [];
    const statement = {
      bind: (...nextValues) => {
        values = nextValues;
        return statement;
      },
      run: async () => this.#run(normalized, values),
      first: async () => this.#first(normalized, values),
      all: async () => this.#all(normalized, values)
    };
    return statement;
  }

  #run(sql, values) {
    if (sql.includes("INSERT INTO USAGE_RECORDS")) {
      const [id, userId, featureKey, amount, periodStart, periodEnd, , , , , limit] = values;
      const existing = this.usageRecords.find((record) => record.id === id);
      const used = this.usageRecords
        .filter((record) => record.user_id === userId && record.feature_key === featureKey && record.period_start === periodStart)
        .reduce((total, record) => total + Number(record.amount || 0), 0);
      if (existing || used + Number(amount) > Number(limit)) return { success: true, meta: { changes: 0 } };
      this.usageRecords.push({ id, user_id: userId, feature_key: featureKey, amount, period_start: periodStart, period_end: periodEnd });
    } else if (sql.includes("INSERT OR IGNORE INTO BILLING_CHECKOUT_SESSIONS")) {
      if (!this.checkoutSessions.some((session) => session.id === values[0])) {
        this.checkoutSessions.push({
          id: values[0],
          user_id: values[1],
          provider_customer_id: values[2],
          plan: values[3],
          billing_interval: values[4],
          price_id: values[5],
          seat_count: values[6],
          status: "created",
          livemode: values[7]
        });
      }
    } else if (sql.includes("INSERT INTO BILLING_WEBHOOK_EVENTS")) {
      const existing = this.webhookEvents.get(values[0]);
      this.webhookEvents.set(values[0], {
        id: values[0],
        type: values[1],
        livemode: values[2],
        attempts: (existing?.attempts || 0) + 1,
        processed_at: existing?.processed_at || null,
        last_error: null
      });
    } else if (sql.includes("UPDATE BILLING_WEBHOOK_EVENTS SET PROCESSED_AT")) {
      const event = this.webhookEvents.get(values[0]);
      if (event) event.processed_at = new Date().toISOString();
    } else if (sql.includes("UPDATE BILLING_WEBHOOK_EVENTS SET LAST_ERROR")) {
      const event = this.webhookEvents.get(values[1]);
      if (event) event.last_error = values[0];
    } else if (sql.includes("UPDATE BILLING_CHECKOUT_SESSIONS")) {
      const session = this.checkoutSessions.find((item) => item.id === values[2] && item.user_id === values[3]);
      if (session) Object.assign(session, { provider_customer_id: values[0], provider_subscription_id: values[1], status: "completed" });
    } else if (sql.includes("UPDATE SUBSCRIPTIONS SET")) {
      const subscription = this.subscriptions.find((item) => item.id === values[11]);
      if (subscription) {
        Object.assign(subscription, {
          user_id: values[0],
          provider_customer_id: values[1],
          plan: values[2],
          status: values[3],
          price_id: values[4],
          billing_interval: values[5],
          current_period_end: values[6],
          cancel_at_period_end: values[7],
          livemode: values[8],
          last_event_id: values[9],
          last_event_created: values[10],
          updated_at: new Date().toISOString()
        });
      }
    } else if (sql.includes("INSERT INTO SUBSCRIPTIONS") && sql.includes("PRICE_ID")) {
      this.subscriptions.push({
        id: values[0],
        user_id: values[1],
        provider: "stripe",
        provider_customer_id: values[2],
        provider_subscription_id: values[3],
        plan: values[4],
        status: values[5],
        price_id: values[6],
        billing_interval: values[7],
        current_period_end: values[8],
        cancel_at_period_end: values[9],
        livemode: values[10],
        last_event_id: values[11],
        last_event_created: values[12],
        updated_at: new Date().toISOString()
      });
    } else if (sql.includes("INSERT INTO SUBSCRIPTIONS")) {
      this.subscriptions.push({
        id: values[0],
        user_id: values[1],
        provider: "stripe",
        provider_customer_id: values[2],
        provider_subscription_id: values[3],
        plan: values[4],
        status: "checkout_complete",
        billing_interval: values[5],
        livemode: values[6],
        last_event_id: values[7],
        last_event_created: values[8],
        updated_at: new Date().toISOString()
      });
    }
    return { success: true, meta: { changes: 1 } };
  }

  #first(sql, values) {
    if (sql.includes("FROM USAGE_RECORDS") && sql.includes("WHERE ID")) {
      return this.usageRecords.find((record) => record.id === values[0]) || null;
    }
    if (sql.includes("FROM USAGE_RECORDS") && sql.includes("SUM(AMOUNT)")) {
      return {
        used: this.usageRecords
          .filter((record) => record.user_id === values[0] && record.feature_key === values[1] && record.period_start === values[2])
          .reduce((total, record) => total + Number(record.amount || 0), 0)
      };
    }
    if (sql.includes("FROM BILLING_WEBHOOK_EVENTS WHERE ID")) {
      return this.webhookEvents.get(values[0]) || null;
    }
    if (sql.includes("FROM SUBSCRIPTIONS WHERE PROVIDER_SUBSCRIPTION_ID")) {
      return this.subscriptions.find((subscription) => subscription.provider_subscription_id === values[0]) || null;
    }
    if (sql.includes("FROM SUBSCRIPTIONS") && sql.includes("WHERE USER_ID")) {
      return this.subscriptions
        .filter((subscription) => subscription.user_id === values[0])
        .sort((left, right) => String(right.updated_at || "").localeCompare(String(left.updated_at || "")))[0] || null;
    }
    return null;
  }

  #all(sql, values) {
    if (sql.includes("FROM SUBSCRIPTIONS") && sql.includes("STATUS NOT IN")) {
      return {
        results: this.subscriptions
          .filter((subscription) => subscription.provider === "stripe"
            && subscription.provider_subscription_id
            && !["canceled", "incomplete_expired"].includes(subscription.status))
          .slice(0, Number(values[0] || 50))
          .map((subscription) => ({ provider_subscription_id: subscription.provider_subscription_id }))
      };
    }
    if (sql.includes("FROM SUBSCRIPTIONS") && sql.includes("WHERE USER_ID")) {
      return { results: this.subscriptions.filter((subscription) => subscription.user_id === values[0]) };
    }
    if (sql.includes("FROM BILLING_CHECKOUT_SESSIONS") && sql.includes("WHERE USER_ID")) {
      return { results: this.checkoutSessions.filter((session) => session.user_id === values[0]) };
    }
    return { results: [] };
  }
}

async function callApi(path, { method = "GET", env = {}, body, rawBody, headers = {} } = {}) {
  const payload = rawBody ?? (body === undefined ? undefined : JSON.stringify(body));
  const request = new Request(`https://chemvault.test/api/${path}`, {
    method,
    headers: payload === undefined ? headers : { "content-type": "application/json", ...headers },
    body: payload
  });
  const response = await onRequest({ request, env, params: { path: path.split("?", 1)[0] } });
  return { response, payload: await response.json() };
}

function billingEnv(db) {
  return {
    DB: db,
    PAYMENT_PROVIDER: "stripe",
    STRIPE_SECRET_KEY: "sk_test_server_only",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_monthly",
    STRIPE_PRO_YEARLY_PRICE_ID: "price_pro_yearly",
    STRIPE_TEAM_MONTHLY_PRICE_ID: "price_team_monthly",
    STRIPE_TEAM_YEARLY_PRICE_ID: "price_team_yearly",
    TEAM_BILLING_ENABLED: "true",
    PUBLIC_APP_URL: "https://chemvault.science",
    USER_SYSTEM_ORIGIN: "https://user.chemvault.science"
  };
}

function identityResponse() {
  return new Response(JSON.stringify({
    user: { id: "user_verified", email: "verified@example.com", role: "user", systemRole: "user" }
  }), { status: 200, headers: { "content-type": "application/json" } });
}

function stripeSignature(rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

test("configured checkout fails closed before contacting identity or Stripe without credentials", async () => {
  const db = new BillingD1Mock();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("fetch should not be called");
  };
  try {
    const result = await callApi("billing/checkout", {
      method: "POST",
      env: billingEnv(db),
      body: { planId: "pro", billingInterval: "monthly", userId: "attacker_supplied" }
    });
    assert.equal(result.response.status, 401);
    assert.equal(result.payload.code, "authentication_required");
    assert.equal(fetchCalls, 0);
    assert.equal(db.checkoutSessions.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("checkout uses verified identity, fixed Stripe prices and a recorded idempotent session", async () => {
  const db = new BillingD1Mock();
  const env = billingEnv(db);
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/api/auth/me")) return identityResponse();
    if (String(url).endsWith("/v1/checkout/sessions")) {
      return new Response(JSON.stringify({
        id: "cs_test_verified",
        url: "https://checkout.stripe.com/c/pay/cs_test_verified",
        customer: null,
        livemode: false
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    const result = await callApi("billing/checkout", {
      method: "POST",
      env,
      headers: { cookie: "chemvault_session=signed", "idempotency-key": "checkout_attempt_0001" },
      body: { planId: "team", billingInterval: "yearly", seats: 7, userId: "attacker_supplied" }
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.code, "checkout_session_created");
    assert.equal(result.payload.sessionId, "cs_test_verified");
    assert.equal(result.payload.seats, 7);

    const stripeCall = calls.find((call) => call.url.endsWith("/v1/checkout/sessions"));
    const params = new URLSearchParams(String(stripeCall.init.body));
    assert.equal(params.get("client_reference_id"), "user_verified");
    assert.equal(params.get("customer_email"), "verified@example.com");
    assert.equal(params.get("line_items[0][price]"), "price_team_yearly");
    assert.equal(params.get("line_items[0][quantity]"), "7");
    assert.equal(params.get("metadata[chemvault_user_id]"), "user_verified");
    assert.equal(new Headers(stripeCall.init.headers).get("authorization"), "Bearer sk_test_server_only");
    assert.equal(new Headers(stripeCall.init.headers).get("idempotency-key"), "chemvault:checkout_attempt_0001");
    assert.equal(db.checkoutSessions[0].user_id, "user_verified");
    assert.equal(db.checkoutSessions[0].price_id, "price_team_yearly");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Team checkout stays disabled until organization and seat provisioning are enabled", async () => {
  const db = new BillingD1Mock();
  const env = { ...billingEnv(db), TEAM_BILLING_ENABLED: "false" };
  const originalFetch = globalThis.fetch;
  let stripeCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/api/auth/me")) return identityResponse();
    stripeCalls += 1;
    throw new Error(`Unexpected Stripe call: ${url}`);
  };
  try {
    const result = await callApi("billing/checkout", {
      method: "POST",
      env,
      headers: { cookie: "chemvault_session=signed" },
      body: { planId: "team", billingInterval: "monthly", seats: 3 }
    });
    assert.equal(result.response.status, 409);
    assert.equal(result.payload.code, "team_checkout_unavailable");
    assert.equal(stripeCalls, 0);
    assert.equal(db.checkoutSessions.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("billing portal only opens for the verified account's Stripe customer", async () => {
  const db = new BillingD1Mock({
    subscriptions: [{
      id: "local_subscription",
      user_id: "user_verified",
      provider_customer_id: "cus_verified",
      provider_subscription_id: "sub_verified",
      plan: "pro",
      status: "active",
      updated_at: "2026-07-13T00:00:00.000Z"
    }]
  });
  const originalFetch = globalThis.fetch;
  let portalParams;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith("/api/auth/me")) return identityResponse();
    if (String(url).endsWith("/v1/billing_portal/sessions")) {
      portalParams = new URLSearchParams(String(init.body));
      return new Response(JSON.stringify({ url: "https://billing.stripe.com/p/session/test" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    const result = await callApi("billing/portal", {
      method: "POST",
      env: billingEnv(db),
      headers: { cookie: "chemvault_session=signed" },
      body: { userId: "different_user" }
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.code, "billing_portal_created");
    assert.equal(portalParams.get("customer"), "cus_verified");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Stripe signature verification accepts current signatures and rejects invalid or stale signatures", async () => {
  const rawBody = JSON.stringify({ id: "evt_signature", type: "test.event", data: { object: {} } });
  const timestamp = 1_800_000_000;
  await assert.doesNotReject(verifyStripeSignature(
    rawBody,
    stripeSignature(rawBody, "whsec_unit", timestamp),
    "whsec_unit",
    300,
    timestamp * 1000
  ));
  await assert.rejects(
    verifyStripeSignature(rawBody, `t=${timestamp},v1=${"0".repeat(64)}`, "whsec_unit", 300, timestamp * 1000),
    (error) => error instanceof BillingError && error.code === "invalid_webhook_signature"
  );
  await assert.rejects(
    verifyStripeSignature(rawBody, stripeSignature(rawBody, "whsec_unit", timestamp), "whsec_unit", 300, (timestamp + 301) * 1000),
    (error) => error instanceof BillingError && error.code === "expired_webhook_signature"
  );
});

test("subscription webhooks are idempotent and become the source of entitlements", async () => {
  const db = new BillingD1Mock();
  const env = {
    ...billingEnv(db),
    BILLING_SERVICE_SECRET: "service_secret",
    ENVIRONMENT: "production",
    COMMERCIAL_MODE: "production",
    ALLOW_STRIPE_TEST_EVENTS: "true"
  };
  const event = {
    id: "evt_subscription_active",
    type: "customer.subscription.updated",
    livemode: false,
    created: 1_800_000_100,
    data: {
      object: {
        id: "sub_active",
        customer: "cus_active",
        status: "active",
        cancel_at_period_end: false,
        current_period_end: 1_800_000_000,
        metadata: {
          chemvault_user_id: "user_verified",
          chemvault_plan: "pro",
          chemvault_billing_interval: "monthly"
        },
        items: { data: [{ price: { id: "price_pro_monthly" } }] }
      }
    }
  };
  const rawBody = JSON.stringify(event);
  const signature = stripeSignature(rawBody, env.STRIPE_WEBHOOK_SECRET);

  const first = await callApi("billing/webhook", {
    method: "POST",
    env,
    rawBody,
    headers: { "stripe-signature": signature }
  });
  assert.equal(first.response.status, 200);
  assert.equal(first.payload.duplicate, false);
  assert.equal(db.subscriptions.length, 1);
  assert.equal(db.subscriptions[0].status, "active");

  const duplicate = await callApi("billing/webhook", {
    method: "POST",
    env,
    rawBody,
    headers: { "stripe-signature": signature }
  });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.payload.duplicate, true);
  assert.equal(db.subscriptions.length, 1);

  const staleEvent = {
    ...event,
    id: "evt_subscription_stale",
    type: "customer.subscription.deleted",
    created: 1_800_000_000,
    data: { object: { ...event.data.object, status: "canceled" } }
  };
  const staleRawBody = JSON.stringify(staleEvent);
  const stale = await callApi("billing/webhook", {
    method: "POST",
    env,
    rawBody: staleRawBody,
    headers: { "stripe-signature": stripeSignature(staleRawBody, env.STRIPE_WEBHOOK_SECRET) }
  });
  assert.equal(stale.response.status, 200);
  assert.equal(db.subscriptions[0].status, "active");
  assert.equal(db.subscriptions[0].last_event_id, "evt_subscription_active");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith("/api/auth/me")) return identityResponse();
    if (String(url) === "https://user.chemvault.science/api/internal/billing/identity?email=verified%40example.com") {
      assert.equal(init.headers.authorization, "Bearer service_secret");
      return new Response(JSON.stringify({
        ok: true,
        user: { id: "user_verified", email: "verified@example.com" }
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  try {
    const entitlements = await callApi("entitlements", {
      env,
      headers: { cookie: "chemvault_session=signed" }
    });
    assert.equal(entitlements.response.status, 200);
    assert.equal(entitlements.payload.plan, "pro");
    assert.equal(entitlements.payload.meta.subscription.status, "active");
    assert.equal(entitlements.payload.features["compound.search.export"].enabled, true);

    const internal = await callApi("internal/billing/entitlements?userId=user_verified", {
      env,
      headers: { authorization: "Bearer service_secret" }
    });
    assert.equal(internal.response.status, 200);
    assert.equal(internal.payload.plan, "pro");
    assert.equal(internal.payload.features["compound.search.export"], true);

    const internalByEmail = await callApi("internal/billing/entitlements?email=Verified%40Example.com", {
      env,
      headers: { authorization: "Bearer service_secret" }
    });
    assert.equal(internalByEmail.response.status, 200);
    assert.equal(internalByEmail.payload.userId, "user_verified");
    assert.equal(internalByEmail.payload.email, "verified@example.com");
    assert.equal(internalByEmail.payload.plan, "pro");

    const mismatch = await callApi("internal/billing/entitlements?userId=attacker&email=verified%40example.com", {
      env,
      headers: { authorization: "Bearer service_secret" }
    });
    assert.equal(mismatch.response.status, 400);
    assert.equal(mismatch.payload.code, "billing_identity_mismatch");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cloud quantum usage is subscription-gated, atomic and idempotent", async () => {
  const db = new BillingD1Mock({
    subscriptions: [{
      id: "subscription_usage",
      user_id: "user_usage",
      provider: "stripe",
      provider_subscription_id: "sub_usage",
      plan: "pro",
      status: "active",
      updated_at: "2026-07-13T00:00:00.000Z"
    }]
  });
  const env = { ...billingEnv(db), BILLING_SERVICE_SECRET: "service_secret" };
  const headers = { authorization: "Bearer service_secret" };

  const first = await callApi("internal/billing/usage/consume", {
    method: "POST",
    env,
    headers,
    body: {
      userId: "user_usage",
      featureKey: "modeling.cloud_quantum",
      requestId: "quantum-request-00000001",
      amount: 1
    }
  });
  assert.equal(first.response.status, 200);
  assert.equal(first.payload.allowed, true);
  assert.equal(first.payload.plan, "pro");
  assert.equal(first.payload.limit, 20);
  assert.equal(first.payload.used, 1);
  assert.equal(first.payload.remaining, 19);
  assert.equal(first.payload.idempotent, false);

  const replay = await callApi("internal/billing/usage/consume", {
    method: "POST",
    env,
    headers,
    body: {
      userId: "user_usage",
      featureKey: "modeling.cloud_quantum",
      requestId: "quantum-request-00000001",
      amount: 1
    }
  });
  assert.equal(replay.response.status, 200);
  assert.equal(replay.payload.idempotent, true);
  assert.equal(replay.payload.used, 1);
  assert.equal(db.usageRecords.length, 1);

  for (let index = 2; index <= 20; index += 1) {
    const allowed = await callApi("internal/billing/usage/consume", {
      method: "POST",
      env,
      headers,
      body: {
        userId: "user_usage",
        featureKey: "modeling.cloud_quantum",
        requestId: `quantum-request-${String(index).padStart(8, "0")}`,
        amount: 1
      }
    });
    assert.equal(allowed.response.status, 200);
  }
  const exhausted = await callApi("internal/billing/usage/consume", {
    method: "POST",
    env,
    headers,
    body: {
      userId: "user_usage",
      featureKey: "modeling.cloud_quantum",
      requestId: "quantum-request-00000021",
      amount: 1
    }
  });
  assert.equal(exhausted.response.status, 429);
  assert.equal(exhausted.payload.allowed, false);
  assert.equal(exhausted.payload.reason, "quota_exhausted");
  assert.equal(exhausted.payload.used, 20);

  const free = await callApi("internal/billing/usage/consume", {
    method: "POST",
    env,
    headers,
    body: {
      userId: "free_user",
      featureKey: "modeling.cloud_quantum",
      requestId: "quantum-request-free-0001",
      amount: 1
    }
  });
  assert.equal(free.response.status, 402);
  assert.equal(free.payload.reason, "subscription_required");
  assert.equal(free.payload.requiredPlan, "pro");

  const unauthorized = await callApi("internal/billing/usage/consume", {
    method: "POST",
    env,
    headers: { authorization: "Bearer wrong" },
    body: {
      userId: "user_usage",
      featureKey: "modeling.cloud_quantum",
      requestId: "quantum-request-unauthorized",
      amount: 1
    }
  });
  assert.equal(unauthorized.response.status, 401);
});

test("billing lifecycle exports records and cancels future charges before account deletion", async () => {
  const db = new BillingD1Mock({
    subscriptions: [{
      id: "local_subscription",
      user_id: "user/lifecycle",
      provider: "stripe",
      provider_customer_id: "cus_lifecycle",
      provider_subscription_id: "sub_lifecycle",
      plan: "pro",
      status: "active",
      price_id: "price_pro_monthly",
      billing_interval: "monthly",
      cancel_at_period_end: 0,
      livemode: 0,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-13T00:00:00.000Z"
    }]
  });
  const env = { ...billingEnv(db), LIFECYCLE_SERVICE_SECRET: "lifecycle-secret" };

  const exported = await callApi("internal/lifecycle/user%2Flifecycle", {
    method: "POST",
    env,
    headers: { authorization: "Bearer lifecycle-secret", "x-chemvault-lifecycle-request": "job_export" },
    body: { action: "export", requestId: "job_export", email: "member@example.com" }
  });
  assert.equal(exported.response.status, 200);
  assert.equal(exported.payload.records, 1);
  assert.equal(exported.payload.subscriptions[0].subscriptionId, "sub_lifecycle");

  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const subscription = {
      id: "sub_lifecycle",
      customer: "cus_lifecycle",
      status: init.method === "DELETE" ? "canceled" : "active",
      livemode: false,
      current_period_end: 1_800_000_000,
      cancel_at_period_end: false,
      metadata: { chemvault_user_id: "user/lifecycle", chemvault_plan: "pro", chemvault_billing_interval: "monthly" },
      items: { data: [{ price: { id: "price_pro_monthly" } }] }
    };
    return new Response(JSON.stringify(subscription), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const deleted = await callApi("internal/lifecycle/user%2Flifecycle", {
      method: "POST",
      env,
      headers: { authorization: "Bearer lifecycle-secret", "x-chemvault-lifecycle-request": "job_delete" },
      body: { action: "delete", requestId: "job_delete", email: "member@example.com" }
    });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.payload.canceledSubscriptions, 1);
    assert.equal(deleted.payload.retainedBillingRecords, 1);
    assert.deepEqual(calls.map((call) => call.init.method), ["GET", "DELETE"]);
    assert.equal(new Headers(calls[1].init.headers).get("idempotency-key"), "chemvault:lifecycle:job_delete:sub_lifecycle");
    assert.equal(db.subscriptions[0].status, "canceled");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const unauthorized = await callApi("internal/lifecycle/user%2Flifecycle", {
    method: "POST",
    env,
    headers: { authorization: "Bearer wrong" },
    body: { action: "delete", requestId: "job_unauthorized" }
  });
  assert.equal(unauthorized.response.status, 401);
});

test("scheduled billing reconciliation refreshes non-terminal subscription state", async () => {
  const db = new BillingD1Mock({
    subscriptions: [{
      id: "local_reconcile",
      user_id: "user_reconcile",
      provider: "stripe",
      provider_customer_id: "cus_reconcile",
      provider_subscription_id: "sub_reconcile",
      plan: "pro",
      status: "active",
      price_id: "price_pro_monthly",
      billing_interval: "monthly",
      updated_at: "2026-07-01T00:00:00.000Z"
    }]
  });
  const env = { ...billingEnv(db), BILLING_RECONCILE_SECRET: "reconcile-secret" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    assert.equal(String(url), "https://api.stripe.com/v1/subscriptions/sub_reconcile");
    assert.equal(init.method, "GET");
    return new Response(JSON.stringify({
      id: "sub_reconcile",
      customer: "cus_reconcile",
      status: "past_due",
      livemode: false,
      current_period_end: 1_800_000_000,
      cancel_at_period_end: false,
      metadata: { chemvault_user_id: "user_reconcile", chemvault_plan: "pro", chemvault_billing_interval: "monthly" },
      items: { data: [{ price: { id: "price_pro_monthly" } }] }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const result = await callApi("internal/billing/reconcile", {
      method: "POST",
      env,
      headers: { authorization: "Bearer reconcile-secret" }
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.checked, 1);
    assert.equal(result.payload.reconciled[0].status, "past_due");
    assert.equal(db.subscriptions[0].status, "past_due");

    const unauthorized = await callApi("internal/billing/reconcile", {
      method: "POST",
      env,
      headers: { authorization: "Bearer wrong" }
    });
    assert.equal(unauthorized.response.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
