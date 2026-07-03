(function () {
  const tokenInput = document.querySelector("[data-admin-token]");
  const tokenSave = document.querySelector("[data-admin-token-save]");
  const summary = document.querySelector("[data-admin-login-summary]");
  const statusNode = document.querySelector("[data-admin-login-status]");
  const returnTo = safeReturnTo(new URLSearchParams(window.location.search).get("return_to") || "/admin/forms/");

  tokenSave?.addEventListener("click", loginWithToken);
  checkSession();

  async function checkSession() {
    const result = await apiJSON("/api/admin/session");
    if (result.ok) {
      const identity = result.payload.identity || {};
      if (summary) summary.textContent = `Signed in as ${identity.email || "legacy admin token"}.`;
      window.location.assign(returnTo);
      return;
    }
    if (summary) summary.textContent = "Sign in with Cloudflare Access, User Center permissions, or fallback token.";
  }

  async function loginWithToken() {
    const token = tokenInput?.value.trim() || "";
    if (!token) {
      setStatus("error", "Enter the fallback admin token.");
      return;
    }
    const result = await apiJSON("/api/admin/session", {
      method: "POST",
      body: { token }
    });
    if (!result.ok) {
      setStatus("error", result.payload?.message || result.payload?.error || "Admin sign in failed.");
      return;
    }
    if (tokenInput) tokenInput.value = "";
    setStatus("success", "Signed in.");
    window.location.assign(returnTo);
  }

  async function apiJSON(path, options = {}) {
    try {
      const response = await fetch(path, {
        method: options.method || "GET",
        headers: options.body ? { "content-type": "application/json" } : {},
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

  function safeReturnTo(value) {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin/forms/";
    return value;
  }

  function setStatus(state, message) {
    if (!statusNode) return;
    statusNode.dataset.state = state;
    statusNode.textContent = message;
  }
}());
