(function () {
  const tokenKey = "chemvault_admin_token";
  const tokenInput = document.querySelector("[data-admin-token]");
  const tokenSave = document.querySelector("[data-admin-token-save]");

  tokenSave?.addEventListener("click", loginWithToken);

  const listState = { page: 1, count: 0 };
  const detailState = { id: "", lead: null };

  initAdminSession();
  if (document.body.matches("[data-admin-leads-list]")) initLeadList();
  if (document.body.matches("[data-admin-lead-detail]")) initLeadDetail();

  async function initAdminSession() {
    const result = await apiJSON("/api/admin/session");
    renderAdminSession(result);
  }

  async function loginWithToken() {
    const token = tokenInput?.value.trim() || "";
    if (!token) {
      renderAdminSession({ ok: false, status: 403, payload: { error: "Enter the fallback admin token." } });
      return;
    }
    const result = await apiJSON("/api/admin/session", {
      method: "POST",
      body: { token },
      skipAuth: true
    });
    if (result.ok) {
      if (tokenInput) tokenInput.value = "";
      sessionStorage.removeItem(tokenKey);
      renderAdminSession(result);
      if (document.body.matches("[data-admin-leads-list]")) loadLeadList();
      if (document.body.matches("[data-admin-lead-detail]")) loadLeadDetail();
      return;
    }
    renderAdminSession(result);
  }

  function renderAdminSession(result) {
    const label = document.querySelector("[data-admin-session-label]");
    const detail = document.querySelector("[data-admin-session-detail]");
    const panel = document.querySelector("[data-admin-token-panel]");
    const identity = result.payload?.identity || {};
    if (result.ok) {
      const actor = identity.email || "Legacy admin token";
      if (label) label.textContent = `Signed in: ${actor}`;
      if (detail) detail.textContent = `${identity.authMode || "admin"} access active${identity.permission ? ` / ${identity.permission}` : ""}.`;
      if (panel) panel.hidden = identity.authMode !== "legacy_admin_token";
      return;
    }
    if (label) label.textContent = "Admin sign-in required";
    if (detail) detail.textContent = result.payload?.message || result.payload?.error || "Use Cloudflare Access, ChemVault User permissions, or the fallback token.";
    if (panel) panel.hidden = false;
  }

  function initLeadList() {
    const controls = [
      "[data-leads-search]",
      "[data-leads-status]",
      "[data-leads-type]",
      "[data-leads-direction]",
      "[data-leads-limit]"
    ].map((selector) => document.querySelector(selector)).filter(Boolean);
    const debouncedLoad = debounce(() => {
      listState.page = 1;
      loadLeadList();
    }, 180);
    controls.forEach((control) => {
      control.addEventListener(control.matches("input") ? "input" : "change", debouncedLoad);
    });
    document.querySelector("[data-leads-prev]")?.addEventListener("click", () => {
      listState.page = Math.max(1, listState.page - 1);
      loadLeadList();
    });
    document.querySelector("[data-leads-next]")?.addEventListener("click", () => {
      listState.page += 1;
      loadLeadList();
    });
    loadLeadList();
  }

  async function loadLeadList() {
    const table = document.querySelector("[data-leads-table]");
    const summary = document.querySelector("[data-leads-summary]");
    if (!table) return;
    table.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
    const result = await apiJSON(`/api/admin/leads?${leadListQuery().toString()}`);
    if (!result.ok) {
      table.innerHTML = `<tr><td colspan="7">${escapeHTML(errorText(result))}</td></tr>`;
      if (summary) summary.textContent = "Admin access required or leads database unavailable.";
      return;
    }
    const payload = result.payload;
    listState.count = payload.count || 0;
    const rows = payload.leads || [];
    if (summary) summary.textContent = `${listState.count} leads. Showing ${rows.length} rows.`;
    table.innerHTML = rows.length ? rows.map(renderLeadRow).join("") : `<tr><td colspan="7">No leads found.</td></tr>`;
    renderPagination(payload);
  }

  function renderLeadRow(row) {
    const href = `/admin/leads/detail/?id=${encodeURIComponent(row.id)}`;
    return `
      <tr>
        <td class="col-id"><a class="forms-id-link" href="${href}">${escapeHTML(row.id)}</a></td>
        <td class="col-date">${escapeHTML(formatDate(row.createdAt))}</td>
        <td class="col-type"><span class="forms-badge" data-tone="${toneForType(row.type)}">${escapeHTML(row.type)}</span></td>
        <td class="col-email">${escapeHTML(row.email || "none")}</td>
        <td class="col-title"><strong>${escapeHTML(row.source || row.formId || "unknown")}</strong><br><small>${escapeHTML(row.messagePreview || "")}</small></td>
        <td class="col-status"><span class="forms-badge" data-tone="${toneForLeadStatus(row.status)}">${escapeHTML(row.status)}</span></td>
        <td class="col-owner">${escapeHTML(row.lastError || "")}</td>
      </tr>
    `;
  }

  function leadListQuery() {
    const params = new URLSearchParams();
    const search = valueOf("[data-leads-search]");
    const status = valueOf("[data-leads-status]");
    const type = valueOf("[data-leads-type]");
    const direction = valueOf("[data-leads-direction]") || "desc";
    const limit = valueOf("[data-leads-limit]") || "50";
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    params.set("direction", direction);
    params.set("limit", limit);
    params.set("page", String(listState.page));
    return params;
  }

  function renderPagination(payload) {
    const page = document.querySelector("[data-leads-page]");
    const prev = document.querySelector("[data-leads-prev]");
    const next = document.querySelector("[data-leads-next]");
    const limit = Number(payload.limit || 50);
    const totalPages = Math.max(1, Math.ceil((payload.count || 0) / limit));
    listState.page = payload.page || listState.page;
    if (page) page.textContent = `Page ${listState.page} of ${totalPages}`;
    if (prev) prev.disabled = listState.page <= 1;
    if (next) next.disabled = listState.page >= totalPages;
  }

  function initLeadDetail() {
    detailState.id = detailIdFromLocation();
    document.querySelector("[data-lead-status-form]")?.addEventListener("submit", saveLeadStatus);
    document.querySelector("[data-lead-notify]")?.addEventListener("click", resendNotification);
    loadLeadDetail();
  }

  async function loadLeadDetail() {
    if (!detailState.id) {
      renderLeadError("Missing lead id.");
      return;
    }
    const result = await apiJSON(`/api/admin/leads/${encodeURIComponent(detailState.id)}`);
    if (!result.ok) {
      renderLeadError(errorText(result));
      return;
    }
    detailState.lead = result.payload.lead;
    renderLeadDetail(result.payload.lead);
  }

  function renderLeadDetail(lead) {
    text("[data-lead-title]", lead.email || lead.id);
    text("[data-lead-summary]", `${lead.type} / ${formatDate(lead.createdAt)} / ${lead.status}`);
    text("[data-lead-email]", lead.email || "Lead");
    text("[data-lead-tracking]", lead.id);
    text("[data-lead-message]", lead.message || "No message.");
    setValue("[name='status']", lead.status);
    const meta = document.querySelector("[data-lead-meta]");
    if (meta) {
      meta.innerHTML = [
        ["Email", lead.email || "none"],
        ["Name", lead.name || "none"],
        ["Type", lead.type],
        ["Source", lead.source || lead.page || "none"],
        ["Form ID", lead.formId || "none"],
        ["Created", formatDate(lead.createdAt)],
        ["Status", lead.status],
        ["Last error", lead.lastError || "none"],
        ["User agent", lead.userAgentSummary || "none"]
      ].map(([label, value]) => `<div class="forms-meta-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join("");
    }
  }

  async function saveLeadStatus(event) {
    event.preventDefault();
    const statusNode = document.querySelector("[data-lead-action-status]");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const result = await apiJSON(`/api/admin/leads/${encodeURIComponent(detailState.lead.id)}/status`, {
      method: "POST",
      body
    });
    if (!result.ok) {
      setStatus(statusNode, "error", errorText(result));
      return;
    }
    setStatus(statusNode, "success", "Saved.");
    renderLeadDetail(result.payload.lead);
  }

  async function resendNotification() {
    const statusNode = document.querySelector("[data-lead-action-status]");
    const result = await apiJSON(`/api/admin/leads/${encodeURIComponent(detailState.lead.id)}/notify`, {
      method: "POST",
      body: {}
    });
    if (!result.ok) {
      setStatus(statusNode, "error", errorText(result));
      return;
    }
    setStatus(statusNode, result.payload.emailSent ? "success" : "error", result.payload.emailSent ? "Notification sent." : "Notification was not sent.");
    loadLeadDetail();
  }

  function renderLeadError(message) {
    text("[data-lead-summary]", message);
    text("[data-lead-message]", message);
  }

  async function apiJSON(path, options = {}) {
    try {
      const response = await fetch(path, {
        method: options.method || "GET",
        headers: {
          ...(options.skipAuth ? {} : authHeaders()),
          ...(options.body ? { "content-type": "application/json" } : {})
        },
        credentials: "same-origin",
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      return { ok: response.ok && payload.ok !== false, status: response.status, payload };
    } catch {
      return { ok: false, status: 0, payload: { error: "Network request failed." } };
    }
  }

  function authHeaders() {
    const token = tokenInput?.value.trim() || "";
    return token ? { authorization: `Bearer ${token}` } : {};
  }

  function detailIdFromLocation() {
    return new URLSearchParams(window.location.search).get("id") || "";
  }

  function valueOf(selector) {
    return document.querySelector(selector)?.value.trim() || "";
  }

  function setValue(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.value = value || "";
  }

  function text(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value || "";
  }

  function setStatus(node, state, value) {
    if (!node) return;
    node.dataset.state = state;
    node.textContent = value;
  }

  function errorText(result) {
    if (result.status === 401 || result.status === 403) return "Admin access required.";
    return result.payload?.error || result.payload?.message || "Request failed.";
  }

  function toneForType(type) {
    return type === "enterprise" ? "blue" : type === "ai_beta" ? "green" : "";
  }

  function toneForLeadStatus(status) {
    if (status === "failed") return "red";
    if (status === "notified" || status === "subscribed" || status === "contacted") return "green";
    if (status === "archived") return "blue";
    return "";
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function debounce(fn, wait) {
    let timer = 0;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char]));
  }
}());
