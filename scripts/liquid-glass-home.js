(function () {
  const hero = document.querySelector(".academic-hero");
  if (!hero) return;

  hero.classList.add("liquid-glass-home", "liquid-glass-static");

  const surfaces = hero.querySelectorAll(
    ".academic-hero-content, .command-search, .lab-console, .console-panel, .hero-proof-row span, .academic-button, .quick-searches button"
  );

  surfaces.forEach((surface) => surface.classList.add("liquid-glass-surface"));
})();
