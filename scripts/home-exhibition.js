(() => {
  const root = document.documentElement;
  const header = document.querySelector("[data-exhibition-header]");
  const menuButton = header?.querySelector(".exhibition-menu-toggle");
  const menuLabel = menuButton?.querySelector("[data-menu-label]");
  const navigation = header?.querySelector(".exhibition-nav");
  const hero = document.querySelector(".exhibition-hero");
  const heroImage = hero?.querySelector(".exhibition-hero-media img");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  function setMenu(open, options = {}) {
    if (!header || !menuButton) return;
    header.classList.toggle("nav-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    if (menuLabel) menuLabel.textContent = open ? "Close" : "Menu";
    if (open && options.focusFirst) navigation?.querySelector("a")?.focus();
  }

  function wireMenu() {
    if (!header || !menuButton || !navigation) return;

    menuButton.addEventListener("click", () => {
      const next = menuButton.getAttribute("aria-expanded") !== "true";
      setMenu(next, { focusFirst: next });
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) setMenu(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || menuButton.getAttribute("aria-expanded") !== "true") return;
      setMenu(false);
      menuButton.focus();
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 821px)").matches) setMenu(false);
    }, { passive: true });
  }

  function wireHeaderState() {
    if (!header) return;
    let queued = false;
    const update = () => {
      queued = false;
      header.classList.toggle("is-scrolled", window.scrollY > 16);
    };
    window.addEventListener("scroll", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function wireHeroDepth() {
    if (!hero || !heroImage || reducedMotion?.matches || !window.matchMedia("(pointer: fine)").matches) return;

    const update = (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) - 0.5;
      const y = ((event.clientY - rect.top) / rect.height) - 0.5;
      hero.style.setProperty("--exhibition-shift-x", `${x * -7}px`);
      hero.style.setProperty("--exhibition-shift-y", `${y * -4}px`);
    };

    hero.addEventListener("pointermove", update, { passive: true });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--exhibition-shift-x", "0px");
      hero.style.setProperty("--exhibition-shift-y", "0px");
    }, { passive: true });
  }

  function revealPage() {
    requestAnimationFrame(() => root.classList.add("exhibition-ready"));
  }

  wireMenu();
  wireHeaderState();
  wireHeroDepth();
  revealPage();
})();
