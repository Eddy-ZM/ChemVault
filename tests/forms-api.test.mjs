import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/[[path]].js";

async function callApi(path, { method = "GET", env = {}, body, headers = {} } = {}) {
  const routePath = String(path).split("?")[0];
  const request = new Request(`https://chemvault.test/api/${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const response = await onRequest({
    request,
    env,
    params: { path: routePath }
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, payload };
}

class FormsD1Mock {
  constructor() {
    this.submissions = new Map();
    this.replies = new Map();
    this.auditLogs = [];
  }

  prepare(sql) {
    return new FormsStatement(this, sql);
  }
}

class FormsStatement {
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
    if (sql.startsWith("create table") || sql.startsWith("create index") || sql.startsWith("create unique index")) {
      return { meta: { changes: 0 } };
    }
    if (sql.includes("insert into forms_submissions")) {
      const [
        id,
        created_at,
        updated_at,
        type,
        status,
        priority,
        name,
        email,
        subject,
        message,
        source_url,
        user_agent,
        ip_hash,
        assigned_to,
        internal_notes,
        public_tracking_id,
        metadata_json
      ] = this.args;
      this.db.submissions.set(id, {
        id,
        created_at,
        updated_at,
        type,
        status,
        priority,
        name,
        email,
        subject,
        message,
        source_url,
        user_agent,
        ip_hash,
        assigned_to,
        internal_notes,
        public_tracking_id,
        metadata_json
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("insert into forms_replies")) {
      const [
        id,
        submission_id,
        created_at,
        admin_user,
        to_email,
        subject,
        body,
        provider_message_id,
        status
      ] = this.args;
      this.db.replies.set(id, {
        id,
        submission_id,
        created_at,
        admin_user,
        to_email,
        subject,
        body,
        provider_message_id,
        status
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("insert into admin_audit_logs")) {
      this.db.auditLogs.push(this.args);
      return { meta: { changes: 1 } };
    }
    if (sql.includes("update forms_submissions")) {
      return this.updateSubmission(sql);
    }
    return { meta: { changes: 0 } };
  }

  async first() {
    const sql = normalizeSql(this.sql);
    if (sql.includes("select count(*) as count from forms_submissions")) {
      return { count: this.filteredSubmissions().length };
    }
    if (sql.includes("from forms_submissions")) {
      const row = this.findSubmission(this.args[0], this.args[1]);
      if (!row) return null;
      if (sql.startsWith("select id, email, subject")) {
        return { id: row.id, email: row.email, subject: row.subject };
      }
      if (sql.startsWith("select id from forms_submissions")) {
        return { id: row.id };
      }
      return { ...row };
    }
    return null;
  }

  async all() {
    const sql = normalizeSql(this.sql);
    if (sql.includes("from forms_replies")) {
      const submissionId = this.args[0];
      return {
        results: [...this.db.replies.values()]
          .filter((reply) => reply.submission_id === submissionId)
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .map((reply) => ({ ...reply }))
      };
    }
    if (sql.includes("from forms_submissions")) {
      let rows = this.filteredSubmissions();
      rows.sort((a, b) => sql.includes("order by created_at asc")
        ? String(a.created_at).localeCompare(String(b.created_at))
        : String(b.created_at).localeCompare(String(a.created_at)));
      const hasOffset = sql.includes("limit ? offset ?");
      const limit = Number(hasOffset ? this.args[this.args.length - 2] : this.args[this.args.length - 1]);
      const offset = hasOffset ? Number(this.args[this.args.length - 1]) : 0;
      rows = rows.slice(offset, offset + limit);
      return { results: rows.map((row) => ({ ...row })) };
    }
    return { results: [] };
  }

  updateSubmission(sql) {
    if (sql.includes("set status = ?, updated_at = ? where id = ? or public_tracking_id = ?")) {
      const [status, updatedAt, id, trackingId] = this.args;
      const row = this.findSubmission(id, trackingId);
      if (!row) return { meta: { changes: 0 } };
      row.status = status;
      row.updated_at = updatedAt;
      return { meta: { changes: 1 } };
    }
    if (sql.includes("set status = ?, updated_at = ? where id = ?")) {
      const [status, updatedAt, id] = this.args;
      const row = this.findSubmission(id);
      if (!row) return { meta: { changes: 0 } };
      row.status = status;
      row.updated_at = updatedAt;
      return { meta: { changes: 1 } };
    }
    if (sql.includes("set metadata_json = ?, updated_at = ?")) {
      const [metadata, updatedAt, id] = this.args;
      const row = this.findSubmission(id);
      if (!row) return { meta: { changes: 0 } };
      row.metadata_json = metadata;
      row.updated_at = updatedAt;
      return { meta: { changes: 1 } };
    }
    const setClause = this.sql.match(/SET\s+([\s\S]+?)\s+WHERE/i)?.[1] || "";
    const assignments = setClause.split(",").map((entry) => entry.trim()).filter(Boolean);
    const id = this.args[this.args.length - 1];
    const row = this.findSubmission(id);
    if (!row) return { meta: { changes: 0 } };
    assignments.forEach((assignment, index) => {
      const column = assignment.split("=")[0].trim();
      row[column] = this.args[index];
    });
    return { meta: { changes: 1 } };
  }

  findSubmission(id, trackingId = id) {
    return [...this.db.submissions.values()].find((row) => row.id === id || row.public_tracking_id === trackingId) || null;
  }

  filteredSubmissions() {
    return [...this.db.submissions.values()];
  }
}

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, " ").trim().toLowerCase();
}

test("regular form submission saves to D1 when email notification fails", async () => {
  const originalFetch = globalThis.fetch;
  const db = new FormsD1Mock();
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "mail rejected" }), { status: 500 });
  try {
    const { response, payload } = await callApi("forms/submit", {
      method: "POST",
      env: {
        DB: db,
        RESEND_API_KEY: "test_resend_key",
        FORMS_NOTIFY_TO: "forms@chemvault.science",
        FORMS_FROM: "forms@chemvault.science"
      },
      body: {
        type: "feedback",
        email: "researcher@example.com",
        subject: "Improve saved searches",
        message: "Please add a way to group saved compound searches.",
        source_url: "https://chemvault.test/feedback"
      }
    });

    assert.equal(response.status, 201);
    assert.equal(payload.submitted, true);
    assert.equal(payload.stored, true);
    assert.equal(payload.emailNotificationSent, false);
    assert.match(payload.trackingId, /^CVF-/);
    assert.equal(db.submissions.size, 1);
    const row = [...db.submissions.values()][0];
    assert.equal(row.email, "researcher@example.com");
    assert.notEqual(row.ip_hash, "local");
    assert.equal(JSON.parse(row.metadata_json).email_notification_failed, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("feedback compatibility path does not create public GitHub issues", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ html_url: "https://github.example/issue" }), { status: 201 });
  };
  try {
    const { response, payload } = await callApi("feedback", {
      method: "POST",
      env: {
        GITHUB_FEEDBACK_TOKEN: "test_github_token",
        GITHUB_FEEDBACK_REPO: "Eddy-ZM/chemvault"
      },
      body: {
        formId: "beta-feedback",
        formTitle: "Beta Feedback",
        subject: "Private feedback",
        message: "This should go to the private forms system."
      }
    });

    assert.equal(response.status, 503);
    assert.equal(payload.submitted, false);
    assert.match(payload.message, /not redirected to GitHub Issues/i);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin forms API rejects missing bearer token", async () => {
  const db = new FormsD1Mock();
  const { response, payload } = await callApi("admin/forms", { env: { DB: db } });
  assert.equal(response.status, 403);
  assert.equal(payload.ok, false);
  assert.match(payload.error, /Admin access/i);
});

test("admin forms API accepts approved Cloudflare Access email", async () => {
  const db = new FormsD1Mock();
  const { response, payload } = await callApi("admin/forms", {
    env: { DB: db },
    headers: {
      "cf-access-authenticated-user-email": "ziwen.mu@chemvault.science"
    }
  });
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.count, 0);
});

test("admin forms API rejects authenticated but unapproved admin email", async () => {
  const db = new FormsD1Mock();
  const { response, payload } = await callApi("admin/forms", {
    env: { DB: db },
    headers: {
      "cf-access-authenticated-user-email": "not-admin@chemvault.science"
    }
  });
  assert.equal(response.status, 403);
  assert.equal(payload.ok, false);
  assert.match(payload.message, /not-admin@chemvault\.science/);
});

test("admin session reports disabled legacy token fallback", async () => {
  const { response, payload } = await callApi("admin/session", {
    env: {
      CHEMVAULT_ADMIN_TOKEN: "admin_test_token",
      CHEMVAULT_ADMIN_TOKEN_FALLBACK: "false"
    }
  });
  assert.equal(response.status, 403);
  assert.equal(payload.ok, false);
  assert.equal(payload.legacyTokenEnabled, false);
});

test("admin session can use legacy token fallback cookie", async () => {
  const env = {
    CHEMVAULT_ADMIN_TOKEN: "admin_test_token",
    CHEMVAULT_ADMIN_TOKEN_FALLBACK: "true"
  };
  const login = await callApi("admin/session", {
    method: "POST",
    env,
    body: { token: "admin_test_token" }
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.payload.ok, true);
  assert.match(login.response.headers.get("set-cookie") || "", /chemvault_admin_session=/);

  const db = new FormsD1Mock();
  const listed = await callApi("admin/forms", {
    env: { ...env, DB: db },
    headers: {
      cookie: "chemvault_admin_session=admin_test_token"
    }
  });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.payload.ok, true);
});

test("admin forms API accepts User Center permission plus approved email", async () => {
  const originalFetch = globalThis.fetch;
  const db = new FormsD1Mock();
  globalThis.fetch = async (url) => {
    assert.match(String(url), /permission=main_admin%3Aforms%3Aread/);
    return new Response(JSON.stringify({
      allowed: true,
      reason: "allowed_by_role_permission",
      user: {
        id: "user_admin",
        email: "admin@chemvault.science",
        systemRole: "admin"
      }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const { response, payload } = await callApi("admin/forms", {
      env: { DB: db, USER_SYSTEM_ORIGIN: "https://user.chemvault.test" },
      headers: {
        cookie: "chemvault_session=session_test"
      }
    });
    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin can update submission status and save reply", async () => {
  const originalFetch = globalThis.fetch;
  const db = new FormsD1Mock();
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "email_test_123" }), { status: 200 });
  try {
    const env = {
      DB: db,
      CHEMVAULT_ADMIN_TOKEN: "admin_test_token",
      CHEMVAULT_ADMIN_TOKEN_FALLBACK: "true",
      RESEND_API_KEY: "test_resend_key",
      FORMS_NOTIFY_TO: "forms@chemvault.science",
      FORMS_FROM: "forms@chemvault.science"
    };
    const created = await callApi("forms/submit", {
      method: "POST",
      env,
      body: {
        type: "bug",
        email: "reporter@example.com",
        subject: "Table hover state",
        message: "The admin table hover state is hard to see.",
        source_url: "https://chemvault.test/admin/forms"
      }
    });
    const id = created.payload.trackingId;
    const auth = { authorization: "Bearer admin_test_token" };

    const updated = await callApi(`admin/forms/${id}`, {
      method: "PATCH",
      env,
      headers: auth,
      body: {
        status: "reviewing",
        priority: "high",
        assigned_to: "forms@chemvault.science",
        internal_notes: "Needs UI review."
      }
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.payload.submission.status, "reviewing");
    assert.equal(updated.payload.submission.priority, "high");
    assert.equal(updated.payload.submission.internalNotes, "Needs UI review.");

    const reply = await callApi(`admin/forms/${id}/reply`, {
      method: "POST",
      env,
      headers: auth,
      body: {
        subject: "Re: Table hover state",
        body: "Thanks, we are reviewing this."
      }
    });
    assert.equal(reply.response.status, 201);
    assert.equal(reply.payload.saved, true);
    assert.equal(reply.payload.emailSent, true);
    assert.equal(db.replies.size, 1);
    assert.equal([...db.replies.values()][0].provider_message_id, "email_test_123");
    const saved = [...db.submissions.values()].find((row) => row.public_tracking_id === id);
    assert.equal(saved.status, "waiting_user");

    const lookup = await callApi(`forms/lookup?ticket=${encodeURIComponent(id)}`, {
      env
    });
    assert.equal(lookup.response.status, 200);
    assert.equal(lookup.payload.ok, true);
    assert.equal(lookup.payload.submission.trackingId, id);
    assert.equal(lookup.payload.submission.message, "The admin table hover state is hard to see.");
    assert.equal(lookup.payload.replies.length, 1);
    assert.equal(lookup.payload.replies[0].body, "Thanks, we are reviewing this.");
    assert.equal(lookup.payload.submission.internalNotes, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
