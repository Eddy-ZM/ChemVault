import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/[[path]].js";

let ipCounter = 1;

async function callApi(path, { method = "GET", env = {}, body, headers = {} } = {}) {
  const request = new Request(`https://chemvault.test/api/${path}`, {
    method,
    headers: {
      "cf-connecting-ip": `203.0.113.${ipCounter++}`,
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
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

class LeadsD1Mock {
  constructor() {
    this.leads = new Map();
    this.subscribers = new Map();
    this.auditLogs = [];
  }

  prepare(sql) {
    return new LeadsStatement(this, sql);
  }
}

class LeadsStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async run() {
    const sql = normalizeSql(this.sql);
    if (sql.startsWith("create table") || sql.startsWith("create index") || sql.startsWith("create unique index") || sql.startsWith("alter table")) {
      return { meta: { changes: 0 } };
    }
    if (sql.includes("insert into leads")) {
      const [
        id,
        type,
        email,
        name,
        organization,
        role,
        team_size,
        interests_json,
        message,
        source,
        page,
        form_id,
        consent,
        ip_hash,
        user_agent,
        status,
        last_error,
        created_at,
        updated_at
      ] = this.args;
      this.db.leads.set(id, {
        id,
        type,
        email,
        name,
        organization,
        role,
        team_size,
        interests_json,
        message,
        source,
        page,
        form_id,
        consent,
        ip_hash,
        user_agent,
        status,
        last_error,
        created_at,
        updated_at,
        notified_at: "",
        subscribed_at: ""
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("insert into newsletter_subscribers")) {
      const [id, email, source, consent, status, unsubscribe_token_hash, created_at, updated_at] = this.args;
      const existing = this.db.subscribers.get(email);
      this.db.subscribers.set(email, {
        id: existing?.id || id,
        email,
        source,
        consent,
        status,
        unsubscribe_token_hash,
        created_at: existing?.created_at || created_at,
        updated_at,
        unsubscribed_at: null,
        last_error: ""
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("update leads") && sql.includes("last_error")) {
      const [status, lastError, updatedAt, statusForNotify, notifiedAt, statusForSubscribe, subscribedAt, id] = this.args;
      const row = this.db.leads.get(id);
      if (!row) return { meta: { changes: 0 } };
      row.status = status;
      row.last_error = lastError;
      row.updated_at = updatedAt;
      if (["notified", "subscribed"].includes(statusForNotify) && !row.notified_at) row.notified_at = notifiedAt;
      if (statusForSubscribe === "subscribed" && !row.subscribed_at) row.subscribed_at = subscribedAt;
      return { meta: { changes: 1 } };
    }
    if (sql.includes("update leads") && sql.includes("set status = ?, updated_at = ?")) {
      const [status, updatedAt, id] = this.args;
      const row = this.db.leads.get(id);
      if (!row) return { meta: { changes: 0 } };
      row.status = status;
      row.updated_at = updatedAt;
      return { meta: { changes: 1 } };
    }
    if (sql.includes("update newsletter_subscribers")) {
      const [updatedAt, unsubscribedAt, tokenHash] = this.args;
      const row = [...this.db.subscribers.values()].find((entry) => entry.unsubscribe_token_hash === tokenHash);
      if (!row) return { meta: { changes: 0 } };
      row.status = "unsubscribed";
      row.updated_at = updatedAt;
      row.unsubscribed_at = unsubscribedAt;
      return { meta: { changes: 1 } };
    }
    if (sql.includes("insert into admin_audit_logs")) {
      this.db.auditLogs.push(this.args);
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }

  async first() {
    const sql = normalizeSql(this.sql);
    if (sql.includes("select count(*) as count") && sql.includes("from leads")) {
      return { count: this.filteredLeads().length };
    }
    if (sql.includes("from newsletter_subscribers") && sql.includes("where email")) {
      const row = this.db.subscribers.get(this.args[0]);
      return row ? { ...row } : null;
    }
    if (sql.includes("from leads") && sql.includes("where id")) {
      const row = this.db.leads.get(this.args[0]);
      return row ? { ...row } : null;
    }
    return null;
  }

  async all() {
    const sql = normalizeSql(this.sql);
    if (sql.includes("from leads")) {
      let rows = this.filteredLeads();
      rows.sort((a, b) => sql.includes("order by created_at asc")
        ? String(a.created_at).localeCompare(String(b.created_at))
        : String(b.created_at).localeCompare(String(a.created_at)));
      const limit = Number(this.args[this.args.length - 2] || 50);
      const offset = Number(this.args[this.args.length - 1] || 0);
      return { results: rows.slice(offset, offset + limit).map((row) => ({ ...row })) };
    }
    return { results: [] };
  }

  filteredLeads() {
    return [...this.db.leads.values()];
  }
}

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, " ").trim().toLowerCase();
}

function validLead(overrides = {}) {
  return {
    type: "enterprise",
    email: "researcher@example.com",
    name: "Researcher",
    message: "Tell me about team workflows.",
    source: "https://chemvault.test/",
    formId: "test-lead",
    consent: true,
    ...overrides
  };
}

function mockResend(status = 200) {
  const calls = [];
  const fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify(status < 300 ? { id: `email_${calls.length}` } : { message: "mail rejected" }), { status });
  };
  return { calls, fetch };
}

test("/api/leads saves valid D1 lead and rejects invalid input", async () => {
  const db = new LeadsD1Mock();
  const valid = await callApi("leads", {
    method: "POST",
    env: { DB: db },
    body: validLead()
  });

  assert.equal(valid.response.status, 201);
  assert.equal(valid.payload.ok, true);
  assert.equal(valid.payload.stored, true);
  assert.equal(db.leads.size, 1);
  const row = [...db.leads.values()][0];
  assert.equal(row.email, "researcher@example.com");
  assert.equal(row.consent, 1);
  assert.notEqual(row.ip_hash, "203.0.113.1");

  const invalid = await callApi("leads", {
    method: "POST",
    env: { DB: db },
    body: validLead({ email: "not-an-email" })
  });
  assert.equal(invalid.response.status, 400);
  assert.match(invalid.payload.error, /valid email/i);

  const missingConsent = await callApi("leads", {
    method: "POST",
    env: { DB: db },
    body: validLead({ consent: false })
  });
  assert.equal(missingConsent.response.status, 400);
  assert.match(missingConsent.payload.error, /Consent is required/i);
});

test("honeypot lead returns generic success without storing or sending mail", async () => {
  const db = new LeadsD1Mock();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ id: "email_test" }), { status: 200 });
  };
  try {
    const result = await callApi("leads", {
      method: "POST",
      env: { DB: db, RESEND_API_KEY: "test_resend_key" },
      body: validLead({ website: "https://spam.example" })
    });
    assert.equal(result.response.status, 202);
    assert.equal(result.payload.ok, true);
    assert.equal(db.leads.size, 0);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Resend missing still accepts lead and records skipped mail state", async () => {
  const db = new LeadsD1Mock();
  const result = await callApi("leads", {
    method: "POST",
    env: { DB: db },
    body: validLead()
  });
  const row = [...db.leads.values()][0];
  assert.equal(result.response.status, 201);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.emailNotificationSkipped, true);
  assert.equal(row.status, "new");
  assert.equal(row.last_error, "Resend not configured");
});

test("Resend success marks non-subscriber lead as notified", async () => {
  const originalFetch = globalThis.fetch;
  const resend = mockResend(200);
  const db = new LeadsD1Mock();
  globalThis.fetch = resend.fetch;
  try {
    const result = await callApi("leads", {
      method: "POST",
      env: {
        DB: db,
        RESEND_API_KEY: "test_resend_key",
        FORMS_NOTIFY_TO: "forms@chemvault.science",
        FORMS_FROM: "ChemVault <forms@chemvault.science>"
      },
      body: validLead()
    });
    const row = [...db.leads.values()][0];
    assert.equal(result.response.status, 201);
    assert.equal(row.status, "notified");
    assert.equal(row.last_error, "");
    assert.equal(resend.calls.length, 2);
    assert(resend.calls.every((call) => call.text && call.html));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Resend failure records lead last_error without failing submission", async () => {
  const originalFetch = globalThis.fetch;
  const resend = mockResend(500);
  const db = new LeadsD1Mock();
  globalThis.fetch = resend.fetch;
  try {
    const result = await callApi("leads", {
      method: "POST",
      env: { DB: db, RESEND_API_KEY: "test_resend_key" },
      body: validLead()
    });
    const row = [...db.leads.values()][0];
    assert.equal(result.response.status, 201);
    assert.equal(result.payload.ok, true);
    assert.equal(row.status, "failed");
    assert.match(row.last_error, /mail rejected|provider_rejected/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("newsletter subscriber is upserted once and can unsubscribe by token", async () => {
  const originalFetch = globalThis.fetch;
  const resend = mockResend(200);
  const db = new LeadsD1Mock();
  globalThis.fetch = resend.fetch;
  try {
    await callApi("leads", {
      method: "POST",
      env: { DB: db, RESEND_API_KEY: "test_resend_key", PUBLIC_APP_URL: "https://chemvault.test" },
      body: validLead({ type: "newsletter", subscribe: true, source: "home" })
    });
    await callApi("leads", {
      method: "POST",
      env: { DB: db, RESEND_API_KEY: "test_resend_key", PUBLIC_APP_URL: "https://chemvault.test" },
      body: validLead({ type: "newsletter", subscribe: true, source: "pricing" })
    });

    assert.equal(db.subscribers.size, 1);
    const subscriber = db.subscribers.get("researcher@example.com");
    assert.equal(subscriber.source, "pricing");
    assert.equal(subscriber.status, "active");

    const newsletterEmail = resend.calls.filter((call) => /subscription is active/i.test(call.text)).at(-1);
    const token = newsletterEmail.text.match(/token=([A-Za-z0-9_]+)/)?.[1];
    assert(token);

    const unsubscribed = await callApi("newsletter/unsubscribe", {
      method: "POST",
      env: { DB: db },
      body: { token }
    });
    assert.equal(unsubscribed.response.status, 200);
    assert.equal(db.subscribers.get("researcher@example.com").status, "unsubscribed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin leads API requires token and supports detail/status update", async () => {
  const db = new LeadsD1Mock();
  const env = { DB: db, CHEMVAULT_ADMIN_TOKEN: "admin_test_token" };
  const created = await callApi("leads", {
    method: "POST",
    env,
    body: validLead()
  });
  const id = created.payload.lead.id;

  const rejected = await callApi("admin/leads", { env: { DB: db } });
  assert.equal(rejected.response.status, 403);

  const auth = { authorization: "Bearer admin_test_token" };
  const list = await callApi("admin/leads", { env, headers: auth });
  assert.equal(list.response.status, 200);
  assert.equal(list.payload.leads.length, 1);

  const detail = await callApi(`admin/leads/${id}`, { env, headers: auth });
  assert.equal(detail.response.status, 200);
  assert.equal(detail.payload.lead.email, "researcher@example.com");
  assert(detail.payload.lead.userAgentSummary !== undefined);

  const updated = await callApi(`admin/leads/${id}/status`, {
    method: "POST",
    env,
    headers: auth,
    body: { status: "archived" }
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.payload.lead.status, "archived");
});
