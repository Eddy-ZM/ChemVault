(function () {
  const hero = document.querySelector(".academic-hero");
  if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  hero.classList.add("liquid-glass-home");

  let frame = 0;
  let targetX = 0.62;
  let targetY = 0.3;
  let currentX = targetX;
  let currentY = targetY;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function applyHeroVars() {
    frame = 0;
    currentX += (targetX - currentX) * 0.22;
    currentY += (targetY - currentY) * 0.22;
    const tiltX = clamp((0.5 - currentY) * 8, -4, 4).toFixed(3);
    const tiltY = clamp((currentX - 0.5) * 10, -5, 5).toFixed(3);
    hero.style.setProperty("--lg-mouse-x", `${(currentX * 100).toFixed(2)}%`);
    hero.style.setProperty("--lg-mouse-y", `${(currentY * 100).toFixed(2)}%`);
    hero.style.setProperty("--lg-tilt-x", `${tiltX}deg`);
    hero.style.setProperty("--lg-tilt-y", `${tiltY}deg`);
  }

  function scheduleHeroVars(event) {
    const rect = hero.getBoundingClientRect();
    targetX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    targetY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    if (!frame) frame = requestAnimationFrame(applyHeroVars);
  }

  function resetHeroVars() {
    targetX = 0.62;
    targetY = 0.3;
    if (!frame) frame = requestAnimationFrame(applyHeroVars);
  }

  hero.addEventListener("pointermove", scheduleHeroVars, { passive: true });
  hero.addEventListener("pointerleave", resetHeroVars, { passive: true });
  applyHeroVars();

  const surfaces = hero.querySelectorAll(
    ".academic-hero-content, .command-search, .lab-console, .console-panel, .hero-proof-row span, .academic-button, .quick-searches button"
  );

  surfaces.forEach((surface) => {
    surface.classList.add("liquid-glass-surface");
    surface.addEventListener(
      "pointermove",
      (event) => {
        const rect = surface.getBoundingClientRect();
        const localX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const localY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        surface.style.setProperty("--lg-local-x", `${(localX * 100).toFixed(2)}%`);
        surface.style.setProperty("--lg-local-y", `${(localY * 100).toFixed(2)}%`);
      },
      { passive: true }
    );
    surface.addEventListener(
      "pointerleave",
      () => {
        surface.style.removeProperty("--lg-local-x");
        surface.style.removeProperty("--lg-local-y");
      },
      { passive: true }
    );
  });
})();
