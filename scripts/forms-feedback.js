(function () {
  const feedbackForm = document.querySelector("[data-feedback-form]");
  const ticketForm = document.querySelector("[data-ticket-lookup-form]");

  if (feedbackForm) initFeedbackForm(feedbackForm);
  if (ticketForm) initTicketLookup(ticketForm);

  function initFeedbackForm(form) {
    const submitButton = form.querySelector("[data-feedback-submit]");
    const status = form.querySelector("[data-feedback-status]");
    const sourceInput = form.querySelector("[name='source_url']");
    const typeInput = form.querySelector("[name='type']");
    const initialType = new URLSearchParams(window.location.search).get("type");

    if (sourceInput && !sourceInput.value) sourceInput.value = window.location.href;
    if (initialType && typeInput) {
      const option = [...typeInput.options].find((entry) => entry.value === initialType);
      if (option) typeInput.value = initialType;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = formPayload(form);
      setSubmitState(status, submitButton, "submitting", "Submitting...");

      const result = await postJSON("/api/forms/submit", payload);
      if (result.ok) {
        renderSubmitSuccess(status, submitButton, result.payload);
        form.reset();
        if (sourceInput) sourceInput.value = window.location.href;
        return;
      }

      renderSubmitFailure(status, submitButton, result);
    });
  }

  function initTicketLookup(form) {
    const input = form.querySelector("[name='ticket']");
    const button = form.querySelector("[data-ticket-lookup-submit]");
    const status = document.querySelector("[data-ticket-status]");
    const resultPanel = document.querySelector("[data-ticket-result]");
    const initialTicket = new URLSearchParams(window.location.search).get("ticket");

    if (initialTicket && input) {
      input.value = initialTicket;
      lookupTicket(input.value, status, resultPanel, button);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!input || !input.value.trim()) {
        setLookupState(status, button, "error", "Enter a feedback ticket number.");
        return;
      }
      lookupTicket(input.value, status, resultPanel, button);
    });
  }

  function formPayload(target) {
    const data = new FormData(target);
    return {
      type: String(data.get("type") || "feedback"),
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      subject: String(data.get("subject") || "").trim(),
      message: String(data.get("message") || "").trim(),
      source_url: String(data.get("source_url") || window.location.href).trim(),
      metadata: {
        page_title: document.title,
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      }
    };
  }

  async function lookupTicket(ticket, status, resultPanel, button) {
    const normalized = String(ticket || "").trim().toUpperCase();
    setLookupState(status, button, "submitting", "Looking up feedback ticket...");
    if (resultPanel) {
      resultPanel.hidden = true;
      resultPanel.innerHTML = "";
    }

    const result = await postJSON(`/api/forms/lookup?ticket=${encodeURIComponent(normalized)}`);
    if (!result.ok) {
      const message = result.payload?.error || result.payload?.message || "Ticket not found.";
      setLookupState(status, button, "error", message);
      return;
    }

    renderTicketResult(result.payload, resultPanel);
    setLookupState(status, button, "success", `Feedback ticket ${result.payload.ticket || normalized} loaded.`);
  }

  async function postJSON(url, payload) {
    try {
      const response = await fetch(url, {
        method: payload ? "POST" : "GET",
        headers: payload ? { "content-type": "application/json" } : {},
        body: payload ? JSON.stringify(payload) : undefined
      });
      let body = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }
      return { ok: response.ok && body.ok !== false && body.submitted !== false, status: response.status, payload: body };
    } catch {
      return { ok: false, network: true, status: 0, payload: {} };
    }
  }

  function renderSubmitSuccess(status, button, payload) {
    const tracking = payload.trackingId || payload.submission?.trackingId || "";
    if (tracking) {
      const href = `/feedback?ticket=${encodeURIComponent(tracking)}#ticket-lookup`;
      status.dataset.state = "success";
      status.innerHTML = `Submission saved and emailed to ChemVault. Feedback ticket: <a href="${href}">${escapeHTML(tracking)}</a>.`;
    } else {
      status.dataset.state = "success";
      status.textContent = "Submission saved and emailed to ChemVault.";
    }
    setButton(button, false, "Submitted");
  }

  function renderSubmitFailure(status, button, result) {
    const message = result.payload?.error || result.payload?.message || "Submission failed. Please try again later.";
    status.dataset.state = "error";
    status.textContent = `${message} No GitHub Issue will be created.`;
    setButton(button, false, "Submit");
  }

  function renderTicketResult(payload, resultPanel) {
    if (!resultPanel) return;
    const submission = payload.submission || {};
    const replies = Array.isArray(payload.replies) ? payload.replies : [];
    const answers = Array.isArray(submission.answers) ? submission.answers : [];
    resultPanel.innerHTML = `
      <article class="forms-panel">
        <div class="forms-panel__header">
          <div>
            <h3>${escapeHTML(submission.subject || "Feedback submission")}</h3>
            <p>${escapeHTML(submission.trackingId || payload.ticket || "")}</p>
          </div>
          <span class="forms-badge" data-tone="blue">${escapeHTML(submission.status || "new")}</span>
        </div>
        <div class="forms-meta-grid">
          ${metaItem("Created", formatDate(submission.createdAt))}
          ${metaItem("Updated", formatDate(submission.updatedAt))}
          ${metaItem("Type", submission.type)}
          ${metaItem("Priority", submission.priority)}
          ${metaItem("Name", submission.name || "Not provided")}
          ${metaItem("Email", submission.email || "Not provided")}
        </div>
        <div class="forms-form">
          <div class="forms-field">
            <span>Submitted message</span>
            <div class="forms-detail-message">${escapeHTML(submission.message || "")}</div>
          </div>
          ${answers.length ? `
            <div class="forms-field">
              <span>Structured answers</span>
              <div class="forms-replies">
                ${answers.map((answer) => `
                  <article class="forms-reply">
                    <header><strong>${escapeHTML(answer.label || "Answer")}</strong></header>
                    <pre>${escapeHTML(answer.value || "")}</pre>
                  </article>
                `).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      </article>
      <article class="forms-panel">
        <div class="forms-panel__header">
          <div>
            <h3>Replies</h3>
            <p>${replies.length ? "Replies saved by the ChemVault team." : "No replies have been saved yet."}</p>
          </div>
        </div>
        <div class="forms-replies">
          ${replies.length ? replies.map((reply) => `
            <article class="forms-reply">
              <header>
                <strong>${escapeHTML(reply.subject || "ChemVault reply")}</strong>
                <span class="forms-badge" data-tone="${reply.status === "sent" ? "green" : "blue"}">${escapeHTML(reply.status || "saved")}</span>
              </header>
              <p>${escapeHTML(formatDate(reply.createdAt))}</p>
              <pre>${escapeHTML(reply.body || "")}</pre>
            </article>
          `).join("") : "<p class=\"forms-status\">No replies yet.</p>"}
        </div>
      </article>
    `;
    resultPanel.hidden = false;
  }

  function metaItem(label, value) {
    return `<div class="forms-meta-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || "Not provided")}</strong></div>`;
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function setSubmitState(status, button, state, message) {
    status.dataset.state = state === "success" ? "success" : state === "failed" || state === "error" ? "error" : "";
    status.textContent = message;
    setButton(button, state === "submitting", state === "submitting" ? "Submitting..." : state === "success" ? "Submitted" : "Submit");
  }

  function setLookupState(status, button, state, message) {
    if (status) {
      status.dataset.state = state === "success" ? "success" : state === "failed" || state === "error" ? "error" : "";
      status.textContent = message;
    }
    setButton(button, state === "submitting", state === "submitting" ? "Looking up..." : "Look up ticket");
  }

  function setButton(button, disabled, label) {
    if (!button) return;
    button.disabled = disabled;
    button.textContent = label;
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
