(function () {
  const form = document.querySelector("[data-feedback-form]");
  if (!form) return;

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
    setState("submitting", "Submitting...");

    const primary = await postJSON("/api/forms/submit", payload);
    if (primary.ok) {
      renderSuccess(primary.payload, "submitted");
      form.reset();
      if (sourceInput) sourceInput.value = window.location.href;
      return;
    }

    const canUseCompatibility = payload.type !== "security" && (primary.network || primary.status >= 500);
    if (canUseCompatibility) {
      const compatibility = await postJSON("/api/feedback", payload);
      if (compatibility.ok) {
        renderSuccess(compatibility.payload, "submitted through compatibility fallback");
        form.reset();
        if (sourceInput) sourceInput.value = window.location.href;
        return;
      }
    }

    renderFailure(payload, primary);
  });

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

  async function postJSON(url, payload) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      let body = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }
      return { ok: response.ok && body.submitted !== false, status: response.status, payload: body };
    } catch {
      return { ok: false, network: true, status: 0, payload: {} };
    }
  }

  function renderSuccess(payload, mode) {
    const tracking = payload.trackingId || payload.submission?.trackingId || "recorded";
    setState("success", `Submission ${mode}. Tracking ID: ${tracking}.`);
  }

  function renderFailure(payload, result) {
    const message = result.payload?.error || result.payload?.message || "Submission failed. Please try again later.";
    if (payload.type === "security") {
      setState("error", `${message} Security reports are not redirected to public GitHub Issues.`);
      return;
    }
    const link = githubIssueUrl(payload);
    status.dataset.state = "error";
    status.innerHTML = `${escapeHTML(message)} <a href="${link}" target="_blank" rel="noopener noreferrer">Open GitHub fallback</a>.`;
    setButton(false, "Submit");
  }

  function githubIssueUrl(payload) {
    const title = `[ChemVault Feedback] ${payload.subject || "Feedback"}`;
    const body = [
      "ChemVault public feedback fallback.",
      "",
      `Type: ${payload.type}`,
      `Source: ${payload.source_url || window.location.href}`,
      "",
      payload.message || ""
    ].join("\n");
    const params = new URLSearchParams({
      title,
      body,
      labels: "feedback"
    });
    return `https://github.com/Eddy-ZM/chemvault/issues/new?${params.toString()}`;
  }

  function setState(state, message) {
    status.dataset.state = state === "success" ? "success" : state === "failed" || state === "error" ? "error" : "";
    status.textContent = message;
    setButton(state === "submitting", state === "submitting" ? "Submitting..." : state === "success" ? "Submitted" : "Submit");
  }

  function setButton(disabled, label) {
    if (!submitButton) return;
    submitButton.disabled = disabled;
    submitButton.textContent = label;
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
