(function () {
  const themeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  const searchIntent = () => window.CHEMVAULT_SEARCH_INTENT;
  const importedStoreKey = "chemvault-imported-records";
  let shellSearchItemsCache = null;
  let shellSearchImportSignature = "";
  let shellSearchFrame = 0;

  ensurePublicExhibitionPageStyles();

  document.addEventListener("DOMContentLoaded", () => {
    normalizePublicMarketingHeader();
    ensureCommercialStyles();
    wireShellNav();
    wireShellTheme();
    wireShellSearch();
    wireNavigationDisclosures();
    upgradeAcademicNavigation();
    injectProductSwitcher();
    markActivePage();
    normalizePublicMarketingHeader();
    wireNavigationHighlight();
    adaptShellLayout();
    ensureDeveloperFooter();
  });

  function ensurePublicExhibitionPageStyles() {
    const body = document.body;
    if (!body?.classList.contains("page-shell") || body.classList.contains("forms-admin-shell")) return;
    if (location.pathname.includes("/admin/")) return;
    if (document.querySelector("link[data-public-exhibition-pages]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/public-exhibition-pages.css?v=20260716a";
    link.dataset.publicExhibitionPages = "true";
    document.head.append(link);
  }

  function normalizePublicMarketingHeader() {
    const body = document.body;
    const header = document.querySelector(".site-header");
    if (!body || !header || body.classList.contains("forms-admin-shell")) return;
    const shell = header.querySelector(".nav-shell");
    const brand = shell?.querySelector(".brand");
    const nav = shell?.querySelector(".site-nav");
    const actions = shell?.querySelector(".header-actions");
    if (!shell || !brand || !nav || !actions) return;

    const absolutePrefix = location.pathname.includes("/pages/") ? "../" : "/";
    header.dataset.marketingNav = "true";
    header.classList.add("exhibition-header", "public-exhibition-header");
    shell.classList.add("exhibition-shell", "exhibition-nav-shell");
    brand.classList.add("exhibition-brand");
    nav.classList.add("exhibition-nav");
    actions.classList.add("exhibition-header-actions");
    brand.setAttribute("href", `${absolutePrefix}index.html`);
    brand.setAttribute("aria-label", "ChemVault home");
    brand.innerHTML = "<span><strong>ChemVault</strong></span>";
    nav.innerHTML = `
      <a href="${absolutePrefix}index.html#mission">Mission</a>
      <a href="${absolutePrefix}pages/research.html">Research</a>
      <a href="${absolutePrefix}pages/platform.html">Knowledge</a>
      <a href="https://docs.chemvault.science/" target="_blank" rel="noopener noreferrer">Resources</a>
      <a href="${absolutePrefix}pages/about.html">About</a>
    `;
    actions.innerHTML = `<a class="small-button public-header-cta exhibition-header-cta" href="${absolutePrefix}index.html#mission">Explore ChemVault</a>`;
    header.querySelector("#shellSearchResults")?.remove();
  }

  function wireShellNav() {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".menu-toggle");
    toggle?.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function wireNavigationDisclosures() {
    const nav = document.querySelector(".site-nav");
    if (!nav || nav.dataset.disclosureWired) return;
    nav.dataset.disclosureWired = "true";
    const notify = () => nav.dispatchEvent(new CustomEvent("chemvault:navstatechange"));
    nav.addEventListener("toggle", (event) => {
      const current = event.target;
      if (!current.matches?.(".nav-more") || !current.open) return;
      nav.querySelectorAll(".nav-more").forEach((item) => {
        if (item !== current) item.open = false;
      });
      notify();
    }, true);
    document.addEventListener("click", (event) => {
      if (event.target.closest(".site-nav")) return;
      let closed = false;
      nav.querySelectorAll(".nav-more").forEach((item) => {
        if (item.open) {
          item.open = false;
          closed = true;
        }
      });
      if (closed) notify();
    });
  }

  function wireNavigationHighlight() {
    const nav = document.querySelector(".site-nav");
    if (!nav) return;

    let frame = 0;
    let pendingTarget = null;
    let pointerFocusUntil = 0;
    const now = () => window.performance?.now?.() || Date.now();
    const isMobileNav = () => window.matchMedia?.("(max-width: 900px)")?.matches === true;
    const topItems = () => [...nav.children].map((item) => (
      item.matches?.(".nav-more") ? item.querySelector("summary") : item
    )).filter(Boolean);
    const stateTarget = (preferOpen = false) => {
      const items = topItems();
      if (preferOpen) {
        const openSummary = nav.querySelector(".nav-more[open] > summary");
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
      schedule(current.open ? current.querySelector("summary") : stateTarget(false));
    }, true);
    window.addEventListener("resize", () => schedule(stateTarget(true)), { passive: true });
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => schedule(stateTarget(true)));
      observer.observe(nav);
    }
    schedule(stateTarget(true));
  }

  function wireShellTheme() {
    applyTheme(readThemeSetting());
    themeQuery?.addEventListener?.("change", () => {
      if (readThemeSetting() === "system") applyTheme("system", { persist: false });
    });
    document.querySelectorAll("[data-shell-action='theme']").forEach((button) => {
      button.addEventListener("click", () => {
        const next = nextThemeSetting(button.dataset.themeState || readThemeSetting());
        startThemeTransition(button, next);
        applyTheme(next);
      });
    });
  }

  function wireShellSearch() {
    const input = document.querySelector("#shellSearch");
    const panel = document.querySelector("#shellSearchResults");
    if (!input || !panel) return;
    const shell = input.closest(".search-shell");
    const syncShell = () => {
      const hasValue = Boolean(input.value.trim());
      shell?.classList.toggle("has-value", hasValue);
      shell?.classList.toggle("is-expanded", hasValue || document.activeElement === input);
    };
    input.addEventListener("focus", syncShell);
    input.addEventListener("blur", () => {
      window.setTimeout(syncShell, 120);
    });

    const renderShellResults = () => {
      const rawQuery = input.value.trim();
      const query = normalise(rawQuery);
      if (!query) {
        panel.classList.remove("active");
        panel.innerHTML = "";
        return;
      }

      const external = window.CHEMVAULT_EXTERNAL;
      const localItems = shellSearchItems();
      const localHits = rankedLocalHits(localItems, rawQuery, 6);
      const externalHits = (external?.sources || []).slice(0, 4).map((source) => ({
        type: "External",
        title: `Search ${source.name}`,
        body: source.bestFor,
        href: source.queryUrl.replace("{query}", encodeURIComponent(rawQuery)),
        external: true,
        imageUrl: placeholderImage("External", source.name, source.family)
      }));
      const hits = [...localHits, ...externalHits].slice(0, 8);
      panel.classList.add("active");
      panel.innerHTML = hits.length ? hits.map((hit) => `
        <a class="search-hit" href="${hit.href}"${hit.external ? ' target="_blank" rel="noopener noreferrer"' : ""}>
          <img src="${escapeHTML(thumbnailFor(hit))}" data-fallback-src="${escapeHTML(placeholderImage(hit.type, hit.title, hit.formula || hit.family || hit.domain || ""))}" alt="" loading="lazy" referrerpolicy="no-referrer" />
          <span>${escapeHTML(hit.type)}</span>
          <strong>${escapeHTML(hit.title)}</strong>
          <small>${escapeHTML(hit.body)}</small>
        </a>
      `).join("") : `<div class="empty-state">No matching academic record.</div>`;
      wireImageFallbacks(panel);
    };

    input.addEventListener("input", () => {
      syncShell();
      if (shellSearchFrame) cancelAnimationFrame(shellSearchFrame);
      shellSearchFrame = requestAnimationFrame(() => {
        shellSearchFrame = 0;
        renderShellResults();
      });
    });
    syncShell();
  }

  function shellSearchItems() {
    const importSignature = shellSearchImportedSignature();
    if (shellSearchItemsCache && shellSearchImportSignature === importSignature) {
      return shellSearchItemsCache;
    }

    const data = window.CHEMVAULT_DATA;
    const research = window.CHEMVAULT_RESEARCH;
    const dossiers = window.CHEMVAULT_DOSSIERS;
    const methods = window.CHEMVAULT_METHODS;
    const spectroscopy = window.CHEMVAULT_SPECTROSCOPY;
    const materials = window.CHEMVAULT_MATERIALS;
    const records = window.CHEMVAULT_RECORDS;
    shellSearchItemsCache = records?.buildRecords ? records.buildRecords({ includeImported: true }).map((item) => ({
      id: item.id,
      recordType: item.type,
      type: item.typeLabel || item.type,
      title: item.title,
      body: item.body || item.subtitle || "",
      href: item.external ? item.href : records.recordUrl(item.type, item.id),
      external: item.external,
      imageUrl: item.imageUrl || item.raw?.imageUrl || "",
      formula: item.formula || "",
      tags: item.tags || [],
      domain: item.domain || "",
      family: item.family || "",
      raw: item.raw || {},
      text: item.searchText
    })) : [
      ...(data?.reactionSystems || []).map((item) => ({ id: item.id, recordType: "reaction", type: "Reaction", title: item.name, body: item.className, href: `workbench.html?id=${encodeURIComponent(item.id)}`, text: [item.name, item.className, item.domain, ...(item.conditions || []), ...(item.readouts || []), ...(item.limitations || [])].join(" ") })),
      ...(data?.reactants || []).map((item) => ({ id: item.id, recordType: "reactant", type: "Reactant", title: item.name, body: item.className, href: `workbench.html?q=${encodeURIComponent(item.name)}`, text: [item.name, item.className, ...(item.functionalGroups || []), ...(item.compatibleMethods || []), ...(item.constraints || [])].join(" ") })),
      ...(data?.reagents || []).map((item) => ({ id: item.id, recordType: "reagent", type: "Reagent", title: `${item.formula} · ${item.name}`, body: item.focus, formula: item.formula, tags: item.tags || [], href: `reagents.html?id=${encodeURIComponent(item.id)}`, text: [item.formula, item.name, item.focus, item.category, ...(item.tags || []), ...(item.transformations || [])].join(" ") })),
      ...(data?.compounds || []).map((item) => ({ id: item.id, recordType: "compound", type: "Compound", title: `${item.formula} · ${item.name}`, body: item.summary, formula: item.formula, tags: [...(item.synonyms || []), ...(item.tags || [])], href: `search.html?q=${encodeURIComponent(item.name)}`, text: [item.formula, item.name, item.family, item.cas, item.summary, ...(item.synonyms || []), ...(item.tags || [])].join(" ") })),
      ...(research?.caseStudies || []).map((item) => ({ id: item.id, recordType: "research-case", type: "Case", title: item.title, body: item.question, href: `research.html?case=${encodeURIComponent(item.id)}`, text: [item.title, item.discipline, item.question, item.thesis].join(" ") })),
      ...(dossiers?.dossiers || []).map((item) => ({ id: item.id, recordType: "dossier", type: "Dossier", title: item.title, body: item.abstract, href: `dossiers.html?id=${encodeURIComponent(item.id)}`, text: [item.title, item.field, item.status, item.abstract, ...(item.keywords || []), ...(item.claims || [])].join(" ") })),
      ...(methods?.protocols || []).map((item) => ({ id: item.id, recordType: "method", type: "Method", title: item.title, body: item.summary, href: `methods.html?id=${encodeURIComponent(item.id)}`, text: [item.title, item.domain, item.level, item.summary, ...(item.inputs || []), ...(item.outputs || [])].join(" ") })),
      ...(spectroscopy?.cases || []).map((item) => ({ id: item.id, recordType: "spectroscopy", type: "Spectroscopy", title: item.title, body: item.question, href: `spectroscopy.html?id=${encodeURIComponent(item.id)}`, text: [item.title, item.family, item.question, item.conclusion, ...(item.signals || []).flatMap((signal) => [signal.technique, signal.signal, signal.interpretation])].join(" ") })),
      ...(materials?.materials || []).map((item) => ({ id: item.id, recordType: "material", type: "Material", title: item.name, body: item.synthesis, formula: item.formula, tags: item.tags || [], href: `materials.html?id=${encodeURIComponent(item.id)}`, text: [item.name, item.family, item.formula, item.synthesis, ...(item.applications || []), ...(item.properties || []), ...(item.characterization || [])].join(" ") })),
      ...(data?.routes || []).map((item) => ({ recordType: "route", type: "Route", title: `${item.start} to ${item.target}`, body: item.note, href: `library.html?q=${encodeURIComponent(`${item.start} ${item.target}`)}`, text: [item.start, item.target, item.note, ...(item.route || [])].join(" ") })),
      ...(data?.mechanisms || []).map((item) => ({ id: item.id, recordType: "mechanism", type: "Mechanism", title: item.name, body: item.summary, href: `atlas.html?id=${encodeURIComponent(item.id)}`, text: [item.name, item.className, item.summary, ...(item.bestFor || [])].join(" ") })),
      ...(data?.concepts || []).map((item) => ({ id: item.id, recordType: "concept", type: "Concept", title: item.term, body: item.definition, href: `library.html?q=${encodeURIComponent(item.term)}`, text: [item.term, item.family, item.definition, item.equation].join(" ") })),
      ...(data?.sources || []).map((item) => ({ id: item.id, recordType: "source", type: "Source", title: item.short, body: item.note, href: `library.html?q=${encodeURIComponent(item.short)}`, text: [item.title, item.short, item.family, item.note].join(" ") }))
    ];
    shellSearchImportSignature = importSignature;
    return shellSearchItemsCache;
  }

  function shellSearchImportedSignature() {
    try {
      return localStorage.getItem(importedStoreKey) || "";
    } catch {
      return "";
    }
  }

  function rankedLocalHits(items, rawQuery, limit) {
    const query = normalise(rawQuery);
    const seen = new Set();
    const hits = [];
    const addHit = (item) => {
      const key = searchIntent()?.recordKey?.(item) || `${item.type}:${item.id || item.title}`;
      if (seen.has(key)) return;
      seen.add(key);
      hits.push(item);
    };

    (searchIntent()?.rank?.(rawQuery, items, { limit }) || []).forEach((match) => addHit(match.item));
    items
      .filter((item) => normalise([item.text, item.title, item.type, item.body, item.formula, ...(item.tags || [])].filter(Boolean).join(" ")).includes(query))
      .slice(0, limit)
      .forEach(addHit);
    return hits.slice(0, limit);
  }

  function markActivePage() {
    const current = normalisePath(location.pathname);
    document.querySelectorAll(".site-nav a").forEach((link) => {
      const url = new URL(link.getAttribute("href") || "", location.href);
      if (url.origin !== location.origin) {
        link.removeAttribute("aria-current");
        return;
      }
      const target = normalisePath(url.pathname);
      if (target === current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.querySelectorAll(".nav-more").forEach((group) => {
      const summary = group.querySelector("summary");
      if (!summary) return;
      if (group.querySelector("a[aria-current]")) summary.setAttribute("aria-current", "page");
      else summary.removeAttribute("aria-current");
    });
  }

  function upgradeAcademicNavigation() {
    if (document.querySelector(".site-header")?.dataset.marketingNav === "true") return;
    const nav = document.querySelector(".site-nav");
    if (!nav) return;
    nav.innerHTML = `
      <a href="/index.html">Home</a>
      <details class="nav-more">
        <summary>Workflows</summary>
        <div class="nav-more-menu">
          <a href="/pages/search.html">Compound Search</a>
          <a href="/pages/file-library.html">File Library</a>
          <a href="/pages/molecular-modeling.html">Molecular Modeling</a>
          <a href="/pages/ai-paper-search.html">AI Paper Search</a>
          <a href="/pages/dashboard.html">Dashboard</a>
          <a href="/pages/workbench.html">Research Workbench</a>
          <a href="/pages/mail.html">Mail</a>
        </div>
      </details>
      <details class="nav-more">
        <summary>Knowledge</summary>
        <div class="nav-more-menu">
          <a href="https://docs.chemvault.science/" target="_blank" rel="noopener noreferrer">Docs</a>
          <a href="/pages/research.html">Research</a>
          <a href="/pages/platform.html">Platform</a>
          <a href="/pages/reagents.html">Reagents</a>
          <a href="/pages/materials.html">Materials</a>
          <a href="/pages/methods.html">Methods</a>
          <a href="/pages/library.html">Library</a>
        </div>
      </details>
      <details class="nav-more">
        <summary>Plans</summary>
        <div class="nav-more-menu">
          <a href="/pages/pricing.html">Pricing</a>
          <a href="/pages/contact.html">Enterprise / Contact Sales</a>
        </div>
      </details>
      <details class="nav-more">
        <summary>About</summary>
        <div class="nav-more-menu">
          <a href="/pages/about.html">About ChemVault</a>
          <a href="/pages/team.html">People</a>
          <a href="/pages/projects.html">Projects</a>
          <a href="/pages/developer.html">Developer</a>
          <a href="/pages/contact.html">Contact</a>
        </div>
      </details>
    `;
    wireNavigationDisclosures();
    wireNavigationHighlight();

    const brand = document.querySelector(".brand");
    const brandSmall = brand?.querySelector("small");
    if (brand) brand.setAttribute("href", "/index.html");
    if (brandSmall) brandSmall.textContent = "research workbench";
  }

  function ensureCommercialStyles() {
    if (document.querySelector("link[href*='commercial.css']")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/commercial.css?v=20260703b";
    document.head.appendChild(link);
  }

  function injectProductSwitcher() {
    if (document.querySelector(".site-header")?.dataset.marketingNav === "true") return;
    if (document.querySelector(".cv-app-switcher")) return;
    const actions = document.querySelector(".site-header .header-actions");
    if (!actions) return;
    const details = document.createElement("details");
    details.className = "cv-app-switcher";
    details.innerHTML = `
      <summary aria-label="Open product switcher">Apps</summary>
      <div class="cv-app-switcher__menu">
        ${productModules().map((module) => `
          <a href="${escapeHTML(module.route)}">
            <span class="cv-app-switcher__icon">${escapeHTML(module.initials)}</span>
            <span><strong>${escapeHTML(module.name)}</strong><small>${escapeHTML(module.status)} | ${escapeHTML(module.access)}</small></span>
          </a>
        `).join("")}
      </div>
    `;
    actions.prepend(details);
  }

  function productModules() {
    const configured = window.CHEMVAULT_COMMERCIAL?.modules;
    if (Array.isArray(configured) && configured.length) {
      return configured.map((module) => ({
        name: module.name,
        route: module.route,
        status: statusText(module.status),
        access: planText(module.accessLevel),
        initials: moduleInitials(module.name)
      }));
    }
    return [
      ["Home", "/index.html", "Active", "Free", "CV"],
      ["Compound Search", "/pages/search.html", "Active", "Free", "CS"],
      ["Research File Library", "https://file.chemvault.science/", "Active", "Free", "FL"],
      ["Professional Documentation", "https://docs.chemvault.science/", "Active", "Free", "DG"],
      ["Molecular Modeling", "/pages/molecular-modeling.html", "Beta", "Free", "MM"],
      ["Mail", "https://mail.chemvault.science/", "Active", "Free", "ML"],
      ["AI Paper Search", "/pages/ai-paper-search.html", "Beta", "Free", "AI"]
    ].map(([name, route, status, access, initials]) => ({ name, route, status, access, initials }));
  }

  function statusText(value) {
    return {
      active: "Active",
      beta: "Beta",
      coming_soon: "Coming soon"
    }[value] || value;
  }

  function planText(value) {
    return {
      anonymous: "Anonymous",
      free: "Free",
      pro: "Pro",
      team: "Team/Lab",
      enterprise: "Enterprise",
      admin: "Admin"
    }[value] || value;
  }

  function moduleInitials(value) {
    const words = String(value || "CV").split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "CV";
  }

  function applyTheme(theme, options = {}) {
    const setting = normaliseTheme(theme);
    const mode = resolveTheme(setting);
    const dark = mode === "dark";
    document.documentElement.dataset.themeSetting = setting;
    document.documentElement.dataset.themeResolved = mode;
    document.documentElement.classList.toggle("dark-mode", dark);
    document.documentElement.classList.toggle("light-mode", !dark);
    document.documentElement.style.colorScheme = mode;
    document.body.classList.toggle("dark-mode", dark);
    document.body.classList.toggle("light-mode", !dark);
    if (options.persist !== false) localStorage.setItem("chemvault-theme", setting);
    document.querySelector("meta[name='theme-color']")?.setAttribute("content", dark ? "#101114" : "#f5f5f7");
    document.querySelectorAll("[data-shell-action='theme']").forEach((button) => {
      button.dataset.themeSetting = setting;
      button.dataset.themeState = mode;
      button.dataset.themeResolved = mode;
      button.setAttribute("aria-label", themeLabel(setting, mode));
      button.setAttribute("title", themeTitle(setting, mode));
    });
  }

  function startThemeTransition(source, targetTheme) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const rect = source?.getBoundingClientRect?.();
    const targetMode = resolveTheme(normaliseTheme(targetTheme));
    root.style.setProperty("--theme-x", rect ? `${rect.left + rect.width / 2}px` : "50%");
    root.style.setProperty("--theme-y", rect ? `${rect.top + rect.height / 2}px` : "50%");
    root.dataset.themeTarget = targetMode;
    window.clearTimeout(window.CHEMVAULT_THEME_TIMER);
    if (!root.classList.contains("theme-switching")) root.classList.add("theme-switching");
    window.CHEMVAULT_THEME_TIMER = window.setTimeout(() => {
      root.classList.remove("theme-switching");
    }, 240);
  }

  function readThemeSetting() {
    return normaliseTheme(localStorage.getItem("chemvault-theme"));
  }

  function normaliseTheme(value) {
    return ["system", "light", "dark"].includes(value) ? value : "system";
  }

  function resolveTheme(setting) {
    return setting === "system" ? (themeQuery?.matches ? "dark" : "light") : setting;
  }

  function nextThemeSetting(setting) {
    return resolveTheme(normaliseTheme(setting)) === "dark" ? "light" : "dark";
  }

  function themeLabel(setting, mode) {
    return `${mode === "dark" ? "Dark" : "Light"} theme active. Switch to ${mode === "dark" ? "light" : "dark"} theme`;
  }

  function themeTitle(setting, mode) {
    return `Switch to ${mode === "dark" ? "light" : "dark"} theme`;
  }

  function normalisePath(pathname) {
    let path = String(pathname || "").replace(/\/+$/, "");
    if (!path || path === "/") return "index";
    const file = path.split("/").pop() || "index";
    return file.replace(/\.html$/i, "") || "index";
  }

  function ensureDeveloperFooter() {
    if (document.querySelector(".site-footer")) return;
    const versionLabel = "ChemVault v0.2.4";
    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.setAttribute("aria-label", "ChemVault footer");
    footer.innerHTML = `
      <div class="footer-sticky-layer">
        <div class="footer-sticky-shell">
          <div class="footer-panel">
            <div class="footer-ambient" aria-hidden="true"><span></span><span></span><span></span></div>
            <div class="container footer-grid developer-footer-grid">
              <div class="footer-brand-block footer-reveal" style="--footer-delay: 0ms">
                <a class="footer-brand" href="/index.html">
                  <span class="footer-brand-mark" aria-hidden="true"><img src="/assets/chemvault-logo-mark.png" alt="" /></span>
                  <span><strong>ChemVault</strong><small>Scientific knowledge infrastructure</small></span>
                </a>
                <p>An academic technology initiative for chemistry, scientific data extraction, research intelligence and AI-assisted knowledge systems. Verify primary data before applying chemical information.</p>
                <div class="footer-social-row" aria-label="Quick footer actions">
                  <a class="footer-social" href="/pages/search.html" aria-label="Search ChemVault">Compound Search</a>
                  <a class="footer-social" href="/pages/platform.html" aria-label="Open platform">Platform</a>
                  <a class="footer-social" href="/pages/public-data.html" aria-label="Open public data overview">Public Data</a>
                  <a class="footer-social" href="/feedback" aria-label="Open ChemVault feedback form">Feedback</a>
                </div>
              </div>
              <div class="footer-link-groups">
                <div class="footer-column footer-reveal" style="--footer-delay: 90ms">
                  <span class="footer-heading">Platform</span>
                  <a href="/pages/research.html">Research</a>
                  <a href="/pages/platform.html">Platform</a>
                  <a href="/pages/projects.html">Projects</a>
                  <a href="/pages/notes.html">Notes</a>
                  <a href="/pages/about.html">About</a>
                  <a href="/pages/team.html">Team</a>
                </div>
                <div class="footer-column footer-reveal" style="--footer-delay: 180ms">
                  <span class="footer-heading">Tools</span>
                  <a href="/pages/search.html">Compound Search</a>
                  <a href="/pages/workbench.html">Research Workbench</a>
                  <a href="/pages/app.html">Framework App</a>
                  <a href="/pages/reagents.html">Reagents</a>
                  <a href="/pages/materials.html">Materials</a>
                  <a href="/pages/atlas.html">Atlas</a>
                </div>
                <div class="footer-column footer-reveal" style="--footer-delay: 270ms">
                  <span class="footer-heading">Resources</span>
                  <a href="https://docs.chemvault.science/" target="_blank" rel="noopener noreferrer">Docs</a>
                  <a href="/pages/library.html">Library</a>
                  <a href="/pages/methods.html">Methods</a>
                  <a href="/pages/spectroscopy.html">Spectroscopy</a>
                  <a href="/pages/dossiers.html">Dossiers</a>
                  <a href="/pages/public-data.html">Public data</a>
                  <a href="/pages/sitemap.html">Sitemap</a>
                </div>
                <div class="footer-column footer-reveal" style="--footer-delay: 360ms">
                  <span class="footer-heading">Contact</span>
                  <a href="mailto:contact@chemvault.science">Email ChemVault</a>
                  <a href="/pages/contact.html">Collaborate</a>
                  <a href="/privacy">Privacy Policy</a>
                  <a href="/terms">Terms of Service</a>
                  <a href="/security">Security / Abuse</a>
                  <a href="/feedback">Forms / Feedback</a>
                  <a href="https://github.com/Eddy-ZM" target="_blank" rel="noopener noreferrer">GitHub</a>
                  <span>Independent academic technology initiative</span>
                  <span>© 2026 ChemVault</span>
                </div>
              </div>
            </div>
            <div class="container footer-mobile-compact">
              <div class="footer-mobile-identity">
                <a class="footer-brand" href="/index.html">
                  <span class="footer-brand-mark" aria-hidden="true"><img src="/assets/chemvault-logo-mark.png" alt="" /></span>
                  <span><strong>ChemVault</strong><small>Scientific infrastructure</small></span>
                </a>
                <p>Academic technology for chemistry and scientific knowledge systems. Verify primary data before use.</p>
              </div>
              <nav class="footer-mobile-links" aria-label="Footer navigation">
                <a href="/pages/search.html">Compounds</a>
                <a href="/pages/platform.html">Platform</a>
                <a href="/pages/team.html">Team</a>
                <a href="/pages/contact.html">Contact</a>
                <a href="/feedback">Feedback</a>
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
                <a href="/security">Security</a>
              </nav>
            </div>
            <div class="container footer-bottom">
              <p>© 2026 ChemVault. All rights reserved.</p>
              <div class="footer-bottom-meta">
                <p>Research-oriented reference, not a substitute for primary literature or safety review.</p>
                <span class="footer-version">${versionLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(footer);
  }

  function adaptShellLayout() {
    const header = document.querySelector(".site-header");
    const shell = header?.querySelector(".nav-shell");
    const brand = shell?.querySelector(".brand");
    const nav = shell?.querySelector(".site-nav");
    const actions = shell?.querySelector(".header-actions");
    if (!header || !shell || !brand || !nav || !actions) return;

    let queued = false;
    const measure = () => {
      queued = false;
      if (window.matchMedia("(max-width: 900px)").matches) {
        header.classList.remove("nav-stacked");
        return;
      }

      const gap = parseFloat(getComputedStyle(shell).columnGap) || 0;
      const navGap = parseFloat(getComputedStyle(nav).columnGap) || 0;
      const navItems = [...nav.children].map((item) => item.matches(".nav-more") ? item.querySelector("summary") : item).filter(Boolean);
      const navWidth = navItems.reduce((total, item, index) => (
        total + item.scrollWidth + (index ? navGap : 0)
      ), 0);
      const requiredWidth = brand.scrollWidth + navWidth + actions.scrollWidth + (gap * 2) + 28;
      header.classList.toggle("nav-stacked", requiredWidth > shell.clientWidth);
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("load", schedule, { once: true });
    window.addEventListener("resize", schedule);
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(schedule);
      observer.observe(shell);
      observer.observe(nav);
      observer.observe(actions);
    }
  }

  function normalise(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9.+-]/g, "");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function thumbnailFor(hit) {
    if (hit.imageUrl) return hit.imageUrl;
    const cid = pubChemCidFrom(hit);
    if (cid && canUsePubChemName(hit.title)) {
      return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${encodeURIComponent(cid)}/PNG?record_type=2d&image_size=small`;
    }
    const type = String(hit.type || "").toLowerCase();
    if ((type.includes("compound") || type.includes("reagent")) && canUsePubChemName(hit.title)) {
      return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(hit.title.replace(/^.*·\s*/, ""))}/PNG?record_type=2d&image_size=small`;
    }
    return placeholderImage(hit.type, hit.title, hit.formula || hit.family || hit.domain || "");
  }

  function canUsePubChemName(title) {
    const text = String(title || "").trim();
    return Boolean(text)
      && !/\breference\b/i.test(text)
      && !/\b(panel|system|class|mixture|solution|buffer|assay|test|screen|candidate|reaction)\b/i.test(text)
      && !/^syscat-/i.test(text);
  }

  function pubChemCidFrom(hit = {}) {
    const raw = hit.raw || {};
    const cid = hit.cid || raw.cid || raw.CID;
    if (cid) return cid;
    const href = String(hit.sourceHref || raw.sourceHref || raw.href || raw.url || "");
    const match = href.match(/pubchem\.ncbi\.nlm\.nih\.gov\/compound\/(\d+)/i);
    return match?.[1] || "";
  }

  function placeholderImage(type, title, subtitle = "") {
    const palette = imagePalette(type);
    const formula = imageFormula(subtitle);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240" viewBox="0 0 360 240" role="img" aria-label="${svgEsc(title)}"><rect width="360" height="240" fill="${palette.bg}"/><rect x="16" y="16" width="328" height="208" rx="18" fill="#fff" stroke="${palette.border}"/><text x="30" y="45" fill="${palette.accent}" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="800">${svgEsc(type).slice(0, 24)}</text><g transform="translate(45 68)" fill="none" stroke="${palette.line}" stroke-linecap="round" stroke-linejoin="round"><path d="M52 0 92 23v46l-40 23-40-23V23Z" stroke-width="6" opacity=".74"/><path d="M92 23h46M92 69h46M12 23l-30-18M12 69l-30 18" stroke-width="5" opacity=".46"/><circle cx="52" cy="0" r="10" fill="${palette.accent}" stroke="none"/><circle cx="92" cy="69" r="10" fill="${palette.accent2}" stroke="none"/></g><text x="210" y="100" fill="${palette.text}" font-family="SFMono-Regular,Menlo,Consolas,monospace" font-size="19" font-weight="800">${svgEsc(formula || "Chem").slice(0, 10)}</text><text x="30" y="198" fill="${palette.text}" font-family="Inter,Arial,sans-serif" font-size="21" font-weight="850">${svgEsc(title).slice(0, 24)}</text><text x="30" y="217" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="12" font-weight="650">${svgEsc(subtitle).slice(0, 32)}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function imagePalette(type) {
    const key = String(type || "").toLowerCase();
    if (key.includes("material")) return { bg: "#f5f5f7", border: "#d2d2d7", line: "#64748b", accent: "#0071e3", accent2: "#2bbbad", text: "#1d1d1f", muted: "#6e6e73" };
    if (key.includes("external") || key.includes("source") || key.includes("article")) return { bg: "#f5f5f7", border: "#d2d2d7", line: "#52525b", accent: "#0071e3", accent2: "#f59e0b", text: "#1d1d1f", muted: "#6e6e73" };
    return { bg: "#f5f5f7", border: "#d2d2d7", line: "#1d1d1f", accent: "#0071e3", accent2: "#2bbbad", text: "#1d1d1f", muted: "#6e6e73" };
  }

  function imageFormula(subtitle) {
    const value = String(subtitle || "").split("·")[0].trim();
    if (!value || value.length > 18) return "";
    return /[A-Z][A-Za-z0-9()[\].+\-/ ]/.test(value) ? value : "";
  }

  function svgEsc(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;"
    }[char]));
  }

  function wireImageFallbacks(root) {
    root.querySelectorAll("img[data-fallback-src]").forEach((image) => {
      const applyFallback = () => {
        if (image.dataset.fallbackApplied) return;
        image.dataset.fallbackApplied = "true";
        image.src = image.dataset.fallbackSrc;
      };
      image.addEventListener("error", applyFallback, { once: true });
      if (image.complete && image.naturalWidth === 0) applyFallback();
    });
  }
}());
