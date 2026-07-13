import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/[[path]].js";

async function callApi(path, { method = "GET", env = {}, body, headers = {} } = {}) {
  const request = new Request(`https://chemvault.test/api/${path}`, {
    method,
    headers: body ? { "content-type": "application/json", ...headers } : headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const response = await onRequest({
    request,
    env,
    params: { path }
  });
  const payload = await response.json();
  return { response, payload };
}

test("commercial API health and entitlements routes respond without D1", async () => {
  const health = await callApi("health");
  assert.equal(health.response.status, 200);
  assert.equal(health.payload.ok, true);
  assert.equal(health.payload.features.commercialMvp, true);
  assert.equal(health.payload.features.paymentPlaceholder, true);

  const entitlements = await callApi("entitlements");
  assert.equal(entitlements.response.status, 200);
  assert.equal(entitlements.payload.plan, "free");
  assert.equal(entitlements.payload.features["compound.search.basic"].enabled, true);
  assert.equal(entitlements.payload.features["compound.search.export"].enabled, false);
  assert.equal(entitlements.payload.meta.authMode, "placeholder");
  assert.match(entitlements.payload.meta.message, /placeholder auth/i);
});

test("lead capture accepts valid payloads and rejects invalid email", async () => {
  const valid = await callApi("leads", {
    method: "POST",
    body: {
      type: "newsletter",
      email: "researcher@example.com",
      role: "Researcher",
      consent: true,
      interests: ["compound_search"]
    }
  });
  assert.equal(valid.response.status, 201);
  assert.equal(valid.payload.ok, true);
  assert.equal(valid.payload.mode, "mock");
  assert.equal(valid.payload.lead.email, "researcher@example.com");

  const invalid = await callApi("leads", {
    method: "POST",
    body: {
      type: "newsletter",
      email: "not-an-email",
      consent: true
    }
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.payload.ok, false);
  assert.match(invalid.payload.error, /valid email/i);
});

test("billing placeholder routes do not require live payment provider secrets", async () => {
  const checkout = await callApi("billing/checkout", {
    method: "POST",
    body: {
      planId: "pro",
      billingInterval: "monthly"
    }
  });
  assert.equal(checkout.response.status, 200);
  assert.equal(checkout.payload.ok, true);
  assert.equal(checkout.payload.code, "placeholder_checkout");
  assert.equal(checkout.payload.mode, "placeholder");
  assert.equal(checkout.payload.providerConfigured, false);
  assert.equal(checkout.payload.checkoutUrl, "/pages/pricing.html?checkout=placeholder");
  assert.equal(checkout.payload.url, null);
  assert.equal("customerId" in checkout.payload, false);
  assert.equal("subscriptionId" in checkout.payload, false);
  assert.match(checkout.payload.message, /No payment will be processed/i);
  assert(checkout.payload.requiredEnv.includes("STRIPE_SECRET_KEY"));

  const portal = await callApi("billing/portal", {
    method: "POST",
    body: {
      userId: "user_test"
    }
  });
  assert.equal(portal.response.status, 200);
  assert.equal(portal.payload.ok, true);
  assert.equal(portal.payload.code, "placeholder_portal");
  assert.equal(portal.payload.mode, "placeholder");
  assert.equal(portal.payload.url, null);
  assert.match(portal.payload.message, /No payment data will be changed/i);
});

test("production commercial guard disables mock billing and placeholder auth", async () => {
  const productionEnv = {
    ENVIRONMENT: "production",
    COMMERCIAL_MODE: "production",
    DEFAULT_USER_PLAN: "pro",
    ENABLE_MOCK_BILLING: "true",
    ENABLE_MOCK_AUTH: "true"
  };

  const checkout = await callApi("billing/checkout", {
    method: "POST",
    env: productionEnv,
    body: {
      planId: "pro",
      billingInterval: "monthly"
    }
  });
  assert.equal(checkout.response.status, 503);
  assert.equal(checkout.payload.ok, false);
  assert.equal(checkout.payload.code, "payment_not_configured");
  assert.equal(checkout.payload.mode, "not_configured");
  assert.equal(checkout.payload.environment, "production");
  assert.equal(checkout.payload.providerConfigured, false);
  assert.equal("checkoutUrl" in checkout.payload, false);
  assert.match(checkout.payload.message, /not configured for production/i);

  const portal = await callApi("billing/portal", {
    method: "POST",
    env: productionEnv,
    body: {
      userId: "user_test"
    }
  });
  assert.equal(portal.response.status, 503);
  assert.equal(portal.payload.ok, false);
  assert.equal(portal.payload.code, "payment_not_configured");
  assert.equal(portal.payload.mode, "not_configured");

  const entitlements = await callApi("entitlements", { env: productionEnv });
  assert.equal(entitlements.response.status, 200);
  assert.equal(entitlements.payload.plan, "anonymous");
  assert.equal(entitlements.payload.meta.authMode, "chemvault-user");
  assert.equal(entitlements.payload.meta.authenticated, false);
  assert.equal(entitlements.payload.features["compound.search.export"].enabled, false);

  const exportAttempt = await callApi("export/compound", {
    method: "POST",
    env: productionEnv,
    body: {}
  });
  assert.equal(exportAttempt.response.status, 402);
  assert.equal(exportAttempt.payload.ok, false);
  assert.equal(exportAttempt.payload.currentPlan, "anonymous");
});

test("server-side export entitlement does not trust client plan values", async () => {
  const free = await callApi("export/compound", {
    method: "POST",
    body: {
      plan: "pro"
    }
  });
  assert.equal(free.response.status, 402);
  assert.equal(free.payload.ok, false);
  assert.equal(free.payload.requiredPlan, "pro");
  assert.equal(free.payload.currentPlan, "free");

  const pro = await callApi("export/compound", {
    method: "POST",
    env: { DEFAULT_USER_PLAN: "pro" },
    body: {}
  });
  assert.equal(pro.response.status, 200);
  assert.equal(pro.payload.ok, true);
  assert.equal(pro.payload.mode, "placeholder");
});
