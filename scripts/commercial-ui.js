(function () {
  const commercial = () => window.CHEMVAULT_COMMERCIAL;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  document.addEventListener("DOMContentLoaded", () => {
    if (!commercial()) return;
    renderPlanBadge();
    renderModuleBlocks();
    renderPricingBlocks();
    renderDashboardBlocks();
    applyFeatureGates();
    wireNavigationDisclosures();
    wirePlanPreview();
    wireCheckoutButtons();
    wireLeadForms();
    wireTrackedActions();
    wireProtectedApiActions();
    injectAppSwitcher();
    commercial().trackEvent(pageEventName(), { path: location.pathname });
  });

  window.addEventListener("chemvault:planchange", () => {
    renderPlanBadge();
    renderModuleBlocks();
    renderPricingBlocks();
    renderDashboardBlocks();
    applyFeatureGates();
    wirePlanPreview();
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

  function wirePlanPreview() {
    $$("[data-plan-preview]").forEach((button) => {
      button.addEventListener("click", () => {
        const plan = commercial().setPreviewPlan(button.dataset.planPreview);
        $$("[data-plan-preview]").forEach((item) => item.classList.toggle("is-active", item.dataset.planPreview === plan));
      });
      button.classList.toggle("is-active", button.dataset.planPreview === currentPlan());
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
      setStatus(statusTarget, "Preparing checkout placeholder...");
      commercial().trackEvent("upgrade_clicked", { planId, interval });
      try {
        const session = await commercial().createCheckoutSession(planId, interval);
        setStatus(statusTarget, session.message || "Checkout placeholder is ready. Configure a payment provider to enable live payments.", "success");
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
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = $("[data-form-status]", form);
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
        setStatus(status, "Submitting...");
        try {
          const response = await fetch("/api/leads", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...payload, type })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || "Submission failed.");
          form.reset();
          setStatus(status, result.message || "Submitted. We will follow up when the workflow is ready.", "success");
          commercial().trackEvent(eventNameForLead(type), { type, interests: payload.interests || payload.interestArea || "" });
        } catch (error) {
          saveLeadLocally({ ...payload, type });
          setStatus(status, "Saved locally for this prototype. Configure D1 or a newsletter provider for persistence.", "success");
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
        setStatus(status, result.message || "Protected action placeholder completed.", "success");
      } catch (error) {
        setStatus(status, error.message || "Feature is not available for the current server-side plan.", "error");
      }
    });
  }

  function injectAppSwitcher() {
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
    nav.addEventListener("toggle", (event) => {
      const current = event.target;
      if (!current.matches?.(".nav-more") || !current.open) return;
      $$(".nav-more", nav).forEach((item) => {
        if (item !== current) item.open = false;
      });
    }, true);
    document.addEventListener("click", (event) => {
      if (event.target.closest(".site-nav")) return;
      $$(".nav-more", nav).forEach((item) => {
        item.open = false;
      });
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
    const teamVisible = commercial().isTeamOrAbove();
    return `
      <div class="cv-dashboard-grid">
        <section class="cv-dashboard-panel cv-dashboard-panel--primary">
          <span class="section-kicker">Current plan</span>
          <h2>${esc(planLabel(plan))}</h2>
          <p>${plan === "free" ? "Start free, then upgrade when search, export, file storage, modeling, and AI paper workflows need more power." : "Your current preview plan unlocks professional ChemVault workflows in this local MVP."}</p>
          <div class="cv-plan-switcher" aria-label="Preview plan">
            ${["free", "pro", "team", "enterprise"].map((item) => `<button type="button" data-plan-preview="${item}">${esc(planLabel(item))}</button>`).join("")}
          </div>
          <a class="academic-button primary" href="/pages/pricing.html">Review pricing</a>
        </section>
        <section class="cv-dashboard-panel">
          <span class="section-kicker">Usage</span>
          ${usageSummaryMarkup()}
        </section>
        <section class="cv-dashboard-panel">
          <span class="section-kicker">Recent modules</span>
          <div class="cv-empty-list">
            <p>No saved compounds yet.</p>
            <p>No files uploaded yet.</p>
            <p>No modeling projects yet.</p>
            <p>AI Paper Search is in beta.</p>
          </div>
        </section>
        ${teamWorkspaceMarkup(teamVisible)}
      </div>
    `;
  }

  function teamWorkspaceMarkup(enabled) {
    const lanes = [
      ["Seats", enabled ? "6 active" : "Preview", "Invite researchers and reviewers into a shared lab space."],
      ["Shared files", enabled ? "Connected" : "Team/Lab", "Group papers, spectra, reports, and project assets."],
      ["Collections", enabled ? "Ready" : "Team/Lab", "Coordinate compounds, modeling projects, and AI paper lists."]
    ];
    return `
      <section class="cv-dashboard-panel cv-team-workspace-panel ${enabled ? "" : "is-muted"}">
        <div class="cv-team-workspace-head">
          <span class="section-kicker">Team workspace</span>
          <span class="cv-plan-badge cv-plan-badge--team">${enabled ? "Enabled" : "Team/Lab"}</span>
        </div>
        <h3>${enabled ? "Shared ChemVault workspace enabled" : "Teams interface preview"}</h3>
        <p>${enabled ? "Shared file library, saved compounds, modeling projects, and paper collections are ready for future backend connection." : "The Teams surface is back as a visible workspace preview. Upgrade preview state to Team/Lab to unlock shared controls."}</p>
        <div class="cv-team-workspace-grid">
          ${lanes.map(([label, value, body]) => `
            <article>
              <span>${esc(label)}</span>
              <strong>${esc(value)}</strong>
              <p>${esc(body)}</p>
            </article>
          `).join("")}
        </div>
        <div class="cv-team-workspace-actions">
          <a class="secondary-button" href="/pages/team.html">Open Team</a>
          <button class="secondary-button" type="button" data-plan-preview="team">Preview Team/Lab</button>
        </div>
      </section>
    `;
  }

  function usageSummaryMarkup() {
    const rows = [
      ["compound.search.basic", "Basic compound search"],
      ["file_library.storage.pro", "File library storage"],
      ["modeling.viewer", "Modeling preview"],
      ["papers.search.preview", "AI paper preview"]
    ];
    return `<div class="cv-usage-list">
      ${rows.map(([featureKey, label]) => {
        const limit = commercial().getFeatureLimit(null, featureKey);
        const used = commercial().getCurrentUsage(null, featureKey);
        const unit = commercial().features[featureKey]?.unit || "uses";
        return `<div class="cv-usage-row"><span>${esc(label)}</span><strong>${limit == null ? "Custom" : `${used}/${limit} ${unit}`}</strong></div>`;
      }).join("")}
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
