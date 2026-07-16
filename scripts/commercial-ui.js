(function () {
  const commercial = () => window.CHEMVAULT_COMMERCIAL;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  document.addEventListener("DOMContentLoaded", async () => {
    if (!commercial()) return;
    await hydrateServerEntitlements();
    renderPlanBadge();
    renderModuleBlocks();
    renderPricingBlocks();
    renderDashboardBlocks();
    applyFeatureGates();
    markActiveNavigation();
    wireNavigationDisclosures();
    wireNavigationHighlight();
    wireCheckoutButtons();
    wireLeadForms();
    wireTrackedActions();
    wireProtectedApiActions();
    injectAppSwitcher();
    commercial().trackEvent(pageEventName(), { path: location.pathname });
  });

  async function hydrateServerEntitlements() {
    if (!shouldHydrateServerEntitlements()) {
      commercial().setServerEntitlements({
        plan: "free",
        features: {},
        meta: { environment: "static-preview", authMode: "unavailable", authenticated: false }
      }, false);
      return;
    }
    try {
      const response = await fetch("/api/entitlements", {
        method: "GET",
        headers: { accept: "application/json" },
        credentials: "include",
        signal: AbortSignal.timeout(5_000)
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.source !== "server") throw new Error("Entitlements are unavailable.");
      commercial().setServerEntitlements(payload, false);
    } catch {
      commercial().setServerEntitlements({
        plan: "free",
        features: {},
        meta: { environment: "unavailable", authMode: "unavailable", authenticated: false }
      }, false);
    }
  }

  function shouldHydrateServerEntitlements() {
    if (window.CHEMVAULT_ENABLE_ENTITLEMENTS === true) return true;
    return /(^|\.)chemvault\.science$/i.test(location.hostname) || /(^|\.)pages\.dev$/i.test(location.hostname);
  }

  window.addEventListener("chemvault:planchange", () => {
    renderPlanBadge();
    renderModuleBlocks();
    renderPricingBlocks();
    renderDashboardBlocks();
    applyFeatureGates();
  });

  function pageEventName() {
    if (/pricing/i.test(location.pathname)) return "pricing_viewed";
    if (/ai-paper-search/i.test(location.pathname)) return "ai_paper_search_used";
    return "page_viewed";
  }

  function currentPlan() {
    return commercial().getUserPlan();
  }

  function renderPlanBadge() {
    $$("[data-render='plan-badge']").forEach((node) => {
      const plan = currentPlan();
      node.innerHTML = `<span class="cv-plan-badge cv-plan-badge--${esc(plan)}">${esc(planLabel(plan))}</span>`;
    });
  }

  function renderModuleBlocks() {
    $$("[data-render='app-modules']").forEach((node) => {
      const modules = commercial().modules;
      node.innerHTML = node.dataset.moduleLayout === "categorized"
        ? moduleCategoryMarkup(modules)
        : modules.map(moduleCard).join("");
    });
    wireModuleAccordions();
    $$("[data-render='module-access']").forEach((node) => {
      node.innerHTML = moduleAccessTable();
    });
  }

  function renderPricingBlocks() {
    $$("[data-render='pricing-cards']").forEach((node) => {
      const interval = node.dataset.billingInterval || "monthly";
      node.innerHTML = commercial().plans.map((plan) => pricingCard(plan, interval)).join("");
    });
    $$("[data-render='feature-comparison']").forEach((node) => {
      node.innerHTML = featureComparisonTable();
    });
  }

  function renderDashboardBlocks() {
    $$("[data-render='dashboard']").forEach((node) => {
      node.innerHTML = dashboardMarkup();
    });
    $$("[data-render='usage-summary']").forEach((node) => {
      node.innerHTML = usageSummaryMarkup();
    });
  }

  function applyFeatureGates() {
    $$("[data-feature-key]").forEach((node) => {
      const key = node.dataset.featureKey;
      const access = commercial().hasFeatureAccess(null, key);
      node.classList.toggle("cv-feature-locked", !access);
      node.dataset.featureAccess = access ? "granted" : "locked";
      if (node.dataset.gateMode === "badge") {
        node.setAttribute("aria-disabled", String(!access));
        return;
      }
      const original = node.dataset.originalHtml || node.innerHTML;
      node.dataset.originalHtml = original;
      if (access) {
        node.innerHTML = original;
        return;
      }
      node.innerHTML = lockedFeatureCard({
        featureKey: key,
        title: node.dataset.gateTitle || featureLabel(key),
        body: node.dataset.gateBody || "Upgrade to use this professional research workflow.",
        requiredPlan: node.dataset.requiredPlan || commercial().features[key]?.minPlan || "pro"
      });
    });
  }

  function wireCheckoutButtons() {
    document.addEventListener("click", async (event) => {
      const trigger = event.target.closest("[data-checkout-plan]");
      if (!trigger) return;
      event.preventDefault();
      const planId = trigger.dataset.checkoutPlan;
      const interval = trigger.dataset.billingInterval || "monthly";
      const statusTarget = $(trigger.dataset.statusTarget || "[data-checkout-status]") || trigger.closest("section")?.querySelector("[data-checkout-status]");
      setStatus(statusTarget, "Preparing secure checkout...");
      commercial().trackEvent("upgrade_clicked", { planId, interval });
      try {
        const session = await commercial().createCheckoutSession(planId, interval);
        setStatus(statusTarget, session.message || "Checkout session is ready.", "success");
        if (session.url && session.mode !== "placeholder") {
          location.href = session.url;
        }
      } catch (error) {
        setStatus(statusTarget, error.message || "Checkout is not available yet.", "error");
      }
    });
  }

  function wireLeadForms() {
    $$("[data-lead-form]").forEach((form) => {
      ensureLeadHoneypot(form);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.dataset.submitting === "true") return;
        const status = $("[data-form-status]", form);
        const submitter = form.querySelector("button[type='submit']");
        const payload = formPayload(form);
        const type = payload.type || form.dataset.leadType || "newsletter";
        if (!isEmail(payload.email)) {
          setStatus(status, "Enter a valid email address.", "error");
          return;
        }
        const consentBox = form.querySelector("input[name='consent']");
        if (consentBox && !consentBox.checked) {
          setStatus(status, "Consent is required before submitting.", "error");
          return;
        }
        form.dataset.submitting = "true";
        form.setAttribute("aria-busy", "true");
        if (submitter) {
          submitter.disabled = true;
          submitter.dataset.originalText = submitter.textContent;
          submitter.textContent = "Submitting...";
        }
        setStatus(status, "Submitting...", "pending");
        try {
          const response = await fetch("/api/leads", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...payload,
              type,
              consent: Boolean(consentBox?.checked),
              subscribe: leadSubscribes(form, type),
              formId: form.dataset.formId || form.id || `${type}-lead-form`,
              source: location.href,
              page: location.pathname
            })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || "Submission failed.");
          form.reset();
          setStatus(status, result.message || "Submitted. We will follow up when the workflow is ready.", "success");
          commercial().trackEvent(eventNameForLead(type), { type, interests: payload.interests || payload.interestArea || "" });
        } catch (error) {
          saveLeadLocally({ ...payload, type });
          setStatus(status, error.message || "Submission could not be sent. Please try again.", "error");
        } finally {
          form.dataset.submitting = "false";
          form.removeAttribute("aria-busy");
          if (submitter) {
            submitter.disabled = false;
            submitter.textContent = submitter.dataset.originalText || submitter.textContent;
          }
        }
      });
    });
  }

  function wireTrackedActions() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-track]");
      if (!trigger) return;
      commercial().trackEvent(trigger.dataset.track, {
        label: trigger.textContent.trim(),
        path: location.pathname
      });
    });
  }

  function wireProtectedApiActions() {
    document.addEventListener("click", async (event) => {
      const trigger = event.target.closest("[data-protected-api]");
      if (!trigger) return;
      event.preventDefault();
      const status = trigger.dataset.actionStatus ? $(trigger.dataset.actionStatus) : null;
      setStatus(status, "Checking server entitlement...");
      try {
        const response = await fetch(trigger.dataset.protectedApi, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: location.pathname })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || result.error || "Feature is not available.");
        setStatus(status, result.message || "Protected action completed.", "success");
      } catch (error) {
        setStatus(status, error.message || "Feature is not available for the current server-side plan.", "error");
      }
    });
  }

  function injectAppSwitcher() {
    if ($(".site-header")?.dataset.marketingNav === "true") return;
    if ($(".cv-app-switcher")) return;
    const actions = $(".site-header .header-actions");
    if (!actions) return;
    const details = document.createElement("details");
    details.className = "cv-app-switcher";
    details.innerHTML = `
      <summary aria-label="Open product switcher">Apps</summary>
      <div class="cv-app-switcher__menu">
        ${commercial().modules.map((module) => `
          <a href="${esc(module.route)}">
            <span class="cv-app-switcher__icon">${moduleIcon(module.icon)}</span>
            <span><strong>${esc(module.name)}</strong><small>${esc(statusLabel(module.status))} | ${esc(planLabel(module.accessLevel))}</small></span>
          </a>
        `).join("")}
      </div>
    `;
    actions.prepend(details);
  }

  function wireNavigationDisclosures() {
    const nav = $(".site-nav");
    if (!nav || nav.dataset.disclosureWired) return;
    nav.dataset.disclosureWired = "true";
    const notify = () => nav.dispatchEvent(new CustomEvent("chemvault:navstatechange"));
    nav.addEventListener("toggle", (event) => {
      const current = event.target;
      if (!current.matches?.(".nav-more") || !current.open) return;
      $$(".nav-more", nav).forEach((item) => {
        if (item !== current) item.open = false;
      });
      notify();
    }, true);
    document.addEventListener("click", (event) => {
      if (event.target.closest(".site-nav")) return;
      let closed = false;
      $$(".nav-more", nav).forEach((item) => {
        if (item.open) {
          item.open = false;
          closed = true;
        }
      });
      if (closed) notify();
    });
  }

  function wireNavigationHighlight() {
    const nav = $(".site-nav");
    if (!nav) return;

    let frame = 0;
    let pendingTarget = null;
    let pointerFocusUntil = 0;
    const now = () => window.performance?.now?.() || Date.now();
    const isMobileNav = () => window.matchMedia?.("(max-width: 900px)")?.matches === true;
    const topItems = () => [...nav.children].map((item) => (
      item.matches?.(".nav-more") ? $("summary", item) : item
    )).filter(Boolean);
    const stateTarget = (preferOpen = false) => {
      const items = topItems();
      if (preferOpen) {
        const openSummary = $(".nav-more[open] > summary", nav);
        if (openSummary) return openSummary;
      }
      return items.find((item) => item.matches("[aria-current]")) || items[0] || null;
    };
    const moveIndicator = (target) => {
      if (!target || isMobileNav() || nav.offsetParent === null) {
        nav.style.setProperty("--nav-indicator-opacity", "0");
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const inset = Math.min(14, Math.max(8, rect.width * 0.18));
      const x = Math.max(6, rect.left - navRect.left + inset);
      const width = Math.max(24, rect.width - inset * 2);
      nav.style.setProperty("--nav-indicator-x", `${x.toFixed(1)}px`);
      nav.style.setProperty("--nav-indicator-w", `${width.toFixed(1)}px`);
      nav.style.setProperty("--nav-indicator-opacity", "1");
    };
    const schedule = (target) => {
      pendingTarget = target || stateTarget(true);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        moveIndicator(pendingTarget);
        pendingTarget = null;
      });
    };

    if (nav.dataset.highlightWired === "true") {
      schedule(stateTarget(true));
      return;
    }
    nav.dataset.highlightWired = "true";

    nav.addEventListener("pointerdown", () => {
      pointerFocusUntil = now() + 420;
    }, { passive: true });
    nav.addEventListener("pointerover", (event) => {
      const item = event.target.closest(".site-nav > a, .site-nav > .nav-more > summary");
      if (item && nav.contains(item)) schedule(item);
    }, { passive: true });
    nav.addEventListener("focusin", (event) => {
      if (now() < pointerFocusUntil) return;
      const item = event.target.closest(".site-nav > a, .site-nav > .nav-more > summary");
      if (item && nav.contains(item)) schedule(item);
    });
    nav.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!nav.contains(document.activeElement)) schedule(stateTarget(false));
      }, 0);
    });
    nav.addEventListener("pointerleave", () => schedule(stateTarget(false)), { passive: true });
    nav.addEventListener("chemvault:navstatechange", () => schedule(stateTarget(true)));
    nav.addEventListener("toggle", (event) => {
      const current = event.target;
      if (!current.matches?.(".nav-more")) return;
      schedule(current.open ? $("summary", current) : stateTarget(false));
    }, true);
    window.addEventListener("resize", () => schedule(stateTarget(true)), { passive: true });
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => schedule(stateTarget(true)));
      observer.observe(nav);
    }
    schedule(stateTarget(true));
  }

  function markActiveNavigation() {
    const current = normalisePath(location.pathname);
    $$(".site-nav a").forEach((link) => {
      const url = new URL(link.getAttribute("href") || "", location.href);
      if (url.origin !== location.origin) {
        link.removeAttribute("aria-current");
        return;
      }
      const target = normalisePath(url.pathname);
      if (target === current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    $$(".nav-more").forEach((group) => {
      const summary = $("summary", group);
      if (!summary) return;
      if ($("a[aria-current]", group)) summary.setAttribute("aria-current", "page");
      else summary.removeAttribute("aria-current");
    });
  }

  function wireModuleAccordions() {
    $$("[data-module-categories]").forEach((container) => {
      if (container.dataset.moduleCategoriesWired) return;
      container.dataset.moduleCategoriesWired = "true";
      container.addEventListener("toggle", (event) => {
        const current = event.target;
        if (!current.matches?.(".cv-module-category") || !current.open) return;
        $$(".cv-module-category", container).forEach((item) => {
          if (item !== current) item.open = false;
        });
      }, true);
    });
  }

  function moduleCategoryMarkup(modules) {
    const groups = moduleGroups(modules);
    return `
      <div class="cv-module-categories" data-module-categories>
        ${groups.map((group, index) => `
          <details class="cv-module-category" ${index === 0 ? "open" : ""}>
            <summary>
              <span>
                <strong>${esc(group.label)}</strong>
                <small>${esc(group.description)}</small>
              </span>
              <em>${group.modules.length} ${group.modules.length === 1 ? "module" : "modules"}</em>
            </summary>
            <div class="cv-module-category__body">
              ${group.modules.map(moduleCard).join("")}
            </div>
          </details>
        `).join("")}
      </div>
    `;
  }

  function moduleGroups(modules) {
    const categoryCopy = {
      overview: {
        label: "Overview",
        description: "Start from the home surface and platform orientation."
      },
      research: {
        label: "Research Tools",
        description: "Search compounds, model molecules, and organize AI-assisted paper work."
      },
      operations: {
        label: "Knowledge Operations",
        description: "Files, documentation, mail, and repeatable research workflow surfaces."
      },
      team: {
        label: "Team Workspace",
        description: "Team profiles, lab collaboration, shared collections, and plan controls."
      }
    };
    const order = ["overview", "research", "operations", "team"];
    const map = new Map(order.map((id) => [id, { id, ...categoryCopy[id], modules: [] }]));
    modules.forEach((module) => {
      const id = module.category || "operations";
      if (!map.has(id)) {
        map.set(id, {
          id,
          label: id.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          description: "Additional ChemVault work surfaces.",
          modules: []
        });
      }
      map.get(id).modules.push(module);
    });
    return [...map.values()].filter((group) => group.modules.length);
  }

  function moduleCard(module) {
    const locked = !commercial().hasPlan(null, module.accessLevel);
    return `
      <article class="cv-module-card ${locked ? "is-locked" : ""}">
        <div class="cv-module-card__top">
          <span class="cv-module-card__icon">${moduleIcon(module.icon)}</span>
          <span class="cv-status cv-status--${esc(module.status)}">${esc(statusLabel(module.status))}</span>
        </div>
        <h3>${esc(module.name)}</h3>
        <p>${esc(module.description)}</p>
        <div class="cv-module-card__meta">
          <span>${esc(planLabel(module.accessLevel))}</span>
          ${locked ? "<span>Locked</span>" : "<span>Available</span>"}
        </div>
        <a class="secondary-button" href="${esc(module.route)}">${esc(module.ctaLabel)}</a>
      </article>
    `;
  }

  function pricingCard(plan, interval) {
    const price = interval === "yearly" ? plan.priceYearly : plan.priceMonthly;
    const current = currentPlan() === plan.id;
    return `
      <article class="cv-pricing-card ${plan.highlight ? "is-highlighted" : ""}">
        <div class="cv-pricing-card__head">
          <span class="cv-plan-badge cv-plan-badge--${esc(plan.id)}">${esc(plan.name)}</span>
          ${plan.highlight ? "<strong>Most useful for individuals</strong>" : ""}
        </div>
        <h3>${esc(price)}</h3>
        <p>${esc(plan.subtitle)}</p>
        <ul>${plan.features.map((feature) => `<li>${esc(feature)}</li>`).join("")}</ul>
        ${plan.contact
          ? `<a class="academic-button dark" href="#enterprise-lead">${esc(plan.ctaLabel)}</a>`
          : plan.checkout
            ? `<button class="academic-button ${plan.highlight ? "primary" : "dark"}" type="button" data-checkout-plan="${esc(plan.id)}" data-billing-interval="${esc(interval)}">${esc(plan.ctaLabel)}</button>`
            : `<a class="academic-button ghost-on-light" href="${esc(plan.ctaHref || "/pages/dashboard.html")}">${current ? "Current plan" : esc(plan.ctaLabel)}</a>`}
      </article>
    `;
  }

  function featureComparisonTable() {
    const headers = ["Feature", ...commercial().plans.map((plan) => plan.name)];
    return `
      <div class="cv-table-wrap">
        <table class="cv-comparison-table">
          <thead><tr>${headers.map((heading) => `<th>${esc(heading)}</th>`).join("")}</tr></thead>
          <tbody>
            ${commercial().comparisonRows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function moduleAccessTable() {
    const plans = commercial().plans.map((plan) => plan.id);
    return `
      <div class="cv-table-wrap">
        <table class="cv-comparison-table">
          <thead><tr><th>Module</th>${commercial().plans.map((plan) => `<th>${esc(plan.name)}</th>`).join("")}</tr></thead>
          <tbody>
            ${commercial().modules.map((module) => `
              <tr>
                <td><strong>${esc(module.name)}</strong><span>${esc(module.description)}</span></td>
                ${plans.map((plan) => `<td>${commercial().hasPlan({ plan }, module.accessLevel) ? "Included" : `Requires ${planLabel(module.accessLevel)}`}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function dashboardMarkup() {
    const plan = currentPlan();
    return `
      <div class="cv-dashboard-grid">
        <section class="cv-dashboard-panel cv-dashboard-panel--primary">
          <span class="section-kicker">Current plan</span>
          <h2>${esc(planLabel(plan))}</h2>
          <p>This plan is resolved by the server from the verified ChemVault User identity and central subscription record. The browser cannot promote itself to a paid plan.</p>
          <a class="academic-button primary" href="/pages/pricing.html">Review pricing</a>
        </section>
        <section class="cv-dashboard-panel">
          <span class="section-kicker">Files</span>
          <h3>Private research storage</h3>
          <p>Open ChemVault Files to see current storage usage, uploads, shares, and activity.</p>
          <a class="secondary-button" href="https://file.chemvault.science/">Open Files</a>
        </section>
        <section class="cv-dashboard-panel">
          <span class="section-kicker">Model</span>
          <h3>Local tools and cloud quantum</h3>
          <p>Viewer, local engines, and local export remain free. Cloud quantum checks the server-resolved subscription and daily allowance.</p>
          <a class="secondary-button" href="https://model.chemvault.science/">Open Model</a>
        </section>
        <section class="cv-dashboard-panel">
          <span class="section-kicker">Team/Lab</span>
          <h3>Pilot only</h3>
          <p>Shared organization and seat workflows are not self-service features. Contact ChemVault to scope a controlled Team pilot.</p>
          <a class="secondary-button" href="/pages/pricing.html#enterprise-lead">Request a pilot</a>
        </section>
      </div>
    `;
  }

  function usageSummaryMarkup() {
    return `<div class="cv-empty-list">
      <p>Usage is reported by the service that owns it.</p>
      <p>Open Files for storage usage and Model for cloud quantum allowance.</p>
    </div>`;
  }

  function lockedFeatureCard({ featureKey, title, body, requiredPlan }) {
    commercial().trackEvent("feature_gate_viewed", { featureKey, requiredPlan });
    return `
      <div class="cv-locked-card">
        <span class="cv-lock-mark">Locked</span>
        <h3>${esc(title)}</h3>
        <p>${esc(body)}</p>
        <div class="cv-locked-card__actions">
          <a class="academic-button primary" href="/pages/pricing.html">Upgrade to ${esc(planLabel(requiredPlan))}</a>
          <a class="secondary-button" href="/pages/pricing.html#compare">Compare plans</a>
        </div>
      </div>
    `;
  }

  function featureLabel(featureKey) {
    return commercial().features[featureKey]?.label || featureKey;
  }

  function moduleIcon(icon) {
    const icons = {
      home: "CV",
      search: "CS",
      folder: "FL",
      book: "DG",
      molecule: "MM",
      mail: "ML",
      spark: "AI",
      team: "TM"
    };
    return icons[icon] || "CV";
  }

  function statusLabel(status) {
    return {
      active: "Active",
      beta: "Beta",
      coming_soon: "Coming soon"
    }[status] || status;
  }

  function planLabel(plan) {
    return {
      anonymous: "Anonymous",
      free: "Free",
      pro: "Pro",
      team: "Team/Lab",
      enterprise: "Enterprise",
      admin: "Admin"
    }[plan] || plan;
  }

  function normalisePath(pathname) {
    let path = String(pathname || "").replace(/\/+$/, "");
    if (!path || path === "/") return "index";
    const file = path.split("/").pop() || "index";
    return file.replace(/\.html$/i, "") || "index";
  }

  function formPayload(form) {
    const data = new FormData(form);
    const payload = {};
    data.forEach((value, key) => {
      if (payload[key]) {
        payload[key] = Array.isArray(payload[key]) ? [...payload[key], value] : [payload[key], value];
      } else {
        payload[key] = value;
      }
    });
    payload.interests = $$("input[name='interests']:checked", form).map((input) => input.value);
    return payload;
  }

  function ensureLeadHoneypot(form) {
    if (form.querySelector("input[name='website']")) return;
    const label = document.createElement("label");
    label.className = "cv-honeypot";
    label.setAttribute("aria-hidden", "true");
    label.textContent = "Website";
    const input = document.createElement("input");
    input.name = "website";
    input.tabIndex = -1;
    input.autocomplete = "off";
    label.append(input);
    form.prepend(label);
  }

  function leadSubscribes(form, type) {
    const explicit = form.querySelector("input[name='subscribe']");
    if (explicit) return explicit.checked;
    return type === "newsletter" || /newsletter|updates|subscribe/i.test(form.dataset.leadType || form.dataset.formId || "");
  }

  function eventNameForLead(type) {
    if (type === "enterprise") return "enterprise_lead_submitted";
    if (type === "ai_beta") return "ai_paper_beta_signup";
    return "newsletter_submitted";
  }

  function saveLeadLocally(payload) {
    try {
      const key = "chemvault-local-leads";
      const rows = JSON.parse(localStorage.getItem(key) || "[]");
      rows.push({ ...payload, createdAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(rows.slice(-50)));
    } catch {
      return false;
    }
    return true;
  }

  function setStatus(node, message, type = "") {
    if (!node) return;
    node.textContent = message;
    node.dataset.status = type;
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
  }
}());
