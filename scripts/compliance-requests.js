(function () {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-compliance-request]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = document.querySelector(form.dataset.statusTarget || "");
        setStatus(status, "Submitting request...", "pending");
        const payload = Object.fromEntries(new FormData(form).entries());
        try {
          const response = await fetch(form.dataset.endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.ok === false) {
            setStatus(status, result.error || "Request could not be submitted.", "error");
            return;
          }
          form.reset();
          setStatus(status, result.message || "Request received. ChemVault will verify identity before processing.", "success");
        } catch {
          setStatus(status, "Request could not be submitted. Use the contact link below if this continues.", "error");
        }
      });
    });
  });

  function setStatus(node, message, state) {
    if (!node) return;
    node.textContent = message;
    node.dataset.state = state;
  }
}());
