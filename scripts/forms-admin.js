(function () {
  const tokenKey = "chemvault_admin_token";
  const tokenInput = document.querySelector("[data-admin-token]");
  const tokenSave = document.querySelector("[data-admin-token-save]");

  tokenSave?.addEventListener("click", loginWithToken);

  let listState = {
    page: 1,
    count: 0
  };
  let detailState = {
    id: "",
    submission: null
  };

  initAdminSession();
  if (document.body.matches("[data-admin-forms-list]")) initList();
  if (document.body.matches("[data-admin-form-detail]")) initDetail();

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
      if (document.body.matches("[data-admin-forms-list]")) loadList();
      if (document.body.matches("[data-admin-form-detail]")) loadDetail();
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
    const fallbackEnabled = result.payload?.legacyTokenEnabled === true;
    if (detail) {
      detail.textContent = result.payload?.message
        || result.payload?.error
        || (fallbackEnabled
          ? "Use Cloudflare Access, ChemVault User permissions, or the emergency token."
          : "Use Cloudflare Access or ChemVault User permissions.");
    }
    if (panel) panel.hidden = !fallbackEnabled;
  }

  function initList() {
    const controls = [
      "[data-admin-search]",
      "[data-admin-status]",
      "[data-admin-type]",
      "[data-admin-priority]",
      "[data-admin-direction]",
      "[data-admin-limit]"
    ].map((selector) => document.querySelector(selector)).filter(Boolean);
    const debouncedLoad = debounce(() => {
      listState.page = 1;
      loadList();
    }, 180);
    controls.forEach((control) => {
      control.addEventListener(control.matches("input") ? "input" : "change", debouncedLoad);
    });
    document.querySelector("[data-admin-prev]")?.addEventListener("click", () => {
      listState.page = Math.max(1, listState.page - 1);
      loadList();
    });
    document.querySelector("[data-admin-next]")?.addEventListener("click", () => {
      listState.page += 1;
      loadList();
    });
    document.querySelector("[data-admin-export]")?.addEventListener("click", exportCsv);
    document.querySelector("[data-admin-check-all]")?.addEventListener("change", (event) => {
      document.querySelectorAll("[data-admin-row-check]").forEach((box) => {
        box.checked = event.target.checked;
      });
    });
    document.querySelector("[data-admin-bulk-apply]")?.addEventListener("click", bulkUpdate);
    loadList();
  }

  async function loadList() {
    const table = document.querySelector("[data-admin-table]");
    const summary = document.querySelector("[data-admin-summary]");
    if (!table) return;
    table.innerHTML = `<tr><td colspan="9">Loading...</td></tr>`;
    const result = await apiJSON(`/api/admin/forms?${listQuery().toString()}`);
    if (!result.ok) {
      table.innerHTML = `<tr><td colspan="9">${escapeHTML(errorText(result))}</td></tr>`;
      if (summary) summary.textContent = "Admin access required or forms database unavailable.";
      return;
    }
    const payload = result.payload;
    listState.count = payload.count || 0;
    const rows = payload.submissions || [];
    if (summary) summary.textContent = `${listState.count} submissions. Showing ${rows.length} rows.`;
    table.innerHTML = rows.length ? rows.map(renderListRow).join("") : `<tr><td colspan="9">No submissions found.</td></tr>`;
    renderPagination(payload);
  }

  function renderListRow(row) {
    const href = `/admin/forms/detail/?id=${encodeURIComponent(row.id)}`;
    return `
      <tr>
        <td class="col-check"><input type="checkbox" data-admin-row-check value="${escapeAttr(row.id)}" aria-label="Select ${escapeAttr(row.trackingId || row.id)}" /></td>
        <td class="col-id"><a class="forms-id-link" href="${href}">${escapeHTML(row.trackingId || row.id)}</a></td>
        <td class="col-date">${escapeHTML(formatDate(row.createdAt))}</td>
        <td class="col-type"><span class="forms-badge" data-tone="${toneForType(row.type)}">${escapeHTML(row.type)}</span></td>
        <td class="col-email">${escapeHTML(row.email || "none")}</td>
        <td class="col-title"><strong>${escapeHTML(row.subject)}</strong><br><small>${escapeHTML(row.messagePreview || "")}</small></td>
        <td class="col-status"><span class="forms-badge" data-tone="${toneForStatus(row.status)}">${escapeHTML(row.status)}</span></td>
        <td class="col-priority"><span class="forms-badge" data-tone="${toneForPriority(row.priority)}">${escapeHTML(row.priority)}</span></td>
        <td class="col-owner">${escapeHTML(row.assignedTo || "")}</td>
      </tr>
    `;
  }

  function renderPagination(payload) {
    const page = document.querySelector("[data-admin-page]");
    const prev = document.querySelector("[data-admin-prev]");
    const next = document.querySelector("[data-admin-next]");
    const limit = Number(payload.limit || 50);
    const totalPages = Math.max(1, Math.ceil((payload.count || 0) / limit));
    listState.page = payload.page || listState.page;
    if (page) page.textContent = `Page ${listState.page} of ${totalPages}`;
    if (prev) prev.disabled = listState.page <= 1;
    if (next) next.disabled = listState.page >= totalPages;
  }

  function listQuery() {
    const params = new URLSearchParams();
    const search = valueOf("[data-admin-search]");
    const status = valueOf("[data-admin-status]");
    const type = valueOf("[data-admin-type]");
    const priority = valueOf("[data-admin-priority]");
    const direction = valueOf("[data-admin-direction]") || "desc";
    const limit = valueOf("[data-admin-limit]") || "50";
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (priority) params.set("priority", priority);
    params.set("direction", direction);
    params.set("limit", limit);
    params.set("page", String(listState.page));
    return params;
  }

  async function bulkUpdate() {
    const ids = [...document.querySelectorAll("[data-admin-row-check]:checked")].map((box) => box.value);
    const status = valueOf("[data-admin-bulk-status]");
    const message = document.querySelector("[data-admin-status-message]");
    if (!ids.length || !status) {
      setStatus(message, "error", "Select rows and a status.");
      return;
    }
    const result = await apiJSON("/api/admin/forms", {
      method: "PATCH",
      body: { ids, status }
    });
    if (!result.ok) {
      setStatus(message, "error", errorText(result));
      return;
    }
    setStatus(message, "success", `Updated ${result.payload.updated || ids.length} submissions.`);
    loadList();
  }

  async function exportCsv() {
    const button = document.querySelector("[data-admin-export]");
    if (button) button.disabled = true;
    try {
      const response = await fetch(`/api/admin/forms/export.csv?${listQuery().toString()}`, {
        headers: authHeaders()
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      downloadBlob(blob, `chemvault-forms-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      const message = document.querySelector("[data-admin-status-message]");
      setStatus(message, "error", "CSV export failed.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function initDetail() {
    detailState.id = detailIdFromLocation();
    document.querySelector("[data-detail-update]")?.addEventListener("submit", saveDetail);
    document.querySelector("[data-detail-reply]")?.addEventListener("submit", sendReply);
    loadDetail();
  }

  async function loadDetail() {
    if (!detailState.id) {
      renderDetailError("Missing submission id.");
      return;
    }
    const result = await apiJSON(`/api/admin/forms/${encodeURIComponent(detailState.id)}`);
    if (!result.ok) {
      renderDetailError(errorText(result));
      return;
    }
    detailState.submission = result.payload.submission;
    renderDetail(result.payload.submission, result.payload.replies || []);
  }

  function renderDetail(submission, replies) {
    text("[data-detail-title]", submission.trackingId || submission.id);
    text("[data-detail-summary]", `${submission.type} · ${formatDate(submission.createdAt)} · ${submission.status}`);
    text("[data-detail-subject]", submission.subject);
    text("[data-detail-tracking]", `${submission.id} · ${submission.trackingId || "no tracking id"}`);
    const message = document.querySelector("[data-detail-message]");
    if (message) message.textContent = submission.message || "";
    const meta = document.querySelector("[data-detail-meta]");
    if (meta) {
      meta.innerHTML = [
        ["Email", submission.email || "none"],
        ["Name", submission.name || "none"],
        ["Type", submission.type],
        ["Priority", submission.priority],
        ["Status", submission.status],
        ["Created", formatDate(submission.createdAt)],
        ["Source", submission.sourceUrl || "none"],
        ["IP hash", submission.ipHash || "not stored"]
      ].map(([label, value]) => `<div class="forms-meta-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join("");
    }
    setValue("[name='status']", submission.status);
    setValue("[name='priority']", submission.priority);
    setValue("[name='assigned_to']", submission.assignedTo || "");
    setValue("[name='internal_notes']", submission.internalNotes || "");
    setValue("[data-detail-reply] [name='subject']", `Re: ${submission.subject}`);
    text("[data-detail-reply-to]", submission.email ? `Reply to ${submission.email}` : "No recipient email on this submission.");
    const replyButton = document.querySelector("[data-detail-reply] button[type='submit']");
    if (replyButton) replyButton.disabled = !submission.email;
    const repliesNode = document.querySelector("[data-detail-replies]");
    if (repliesNode) repliesNode.innerHTML = replies.length ? replies.map(renderReply).join("") : "No replies yet.";
  }

  function renderReply(reply) {
    return `
      <article class="forms-reply">
        <header>
          <strong>${escapeHTML(reply.subject)}</strong>
          <span class="forms-badge" data-tone="${reply.status === "sent" ? "green" : "red"}">${escapeHTML(reply.status)}</span>
        </header>
        <small>${escapeHTML(formatDate(reply.createdAt))} · ${escapeHTML(reply.adminUser || "admin")} · ${escapeHTML(reply.toEmail)}</small>
        <pre>${escapeHTML(reply.body)}</pre>
      </article>
    `;
  }

  async function saveDetail(event) {
    event.preventDefault();
    const statusNode = document.querySelector("[data-detail-update-status]");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const result = await apiJSON(`/api/admin/forms/${encodeURIComponent(detailState.submission.id)}`, {
      method: "PATCH",
      body
    });
    if (!result.ok) {
      setStatus(statusNode, "error", errorText(result));
      return;
    }
    setStatus(statusNode, "success", "Saved.");
    renderDetail(result.payload.submission, result.payload.replies || []);
  }

  async function sendReply(event) {
    event.preventDefault();
    const statusNode = document.querySelector("[data-detail-reply-status]");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const result = await apiJSON(`/api/admin/forms/${encodeURIComponent(detailState.submission.id)}/reply`, {
      method: "POST",
      body
    });
    if (!result.ok) {
      setStatus(statusNode, "error", errorText(result));
      return;
    }
    setStatus(statusNode, result.payload.emailSent ? "success" : "error", result.payload.emailSent ? "Reply sent and saved." : "Reply saved, but email sending failed.");
    form.reset();
    loadDetail();
  }

  function renderDetailError(message) {
    text("[data-detail-summary]", message);
    const node = document.querySelector("[data-detail-message]");
    if (node) node.textContent = message;
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
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get("id");
    if (queryId) return queryId;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    return last.endsWith(".html") ? "" : decodeURIComponent(last);
  }

  function valueOf(selector) {
    return document.querySelector(selector)?.value.trim() || "";
  }

  function setValue(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.value = value;
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
    return type === "security" ? "red" : type === "bug" ? "blue" : "";
  }

  function toneForStatus(status) {
    return status === "resolved" || status === "closed" ? "green" : status === "waiting_user" ? "blue" : "";
  }

  function toneForPriority(priority) {
    return priority === "urgent" || priority === "high" ? "red" : priority === "low" ? "green" : "";
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

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function debounce(fn, wait) {
    let timer = 0;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/`/g, "&#096;");
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
