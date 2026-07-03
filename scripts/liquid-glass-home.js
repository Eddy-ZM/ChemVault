(function () {
  const hero = document.querySelector(".academic-hero");
  if (!hero) return;

  hero.classList.add("liquid-glass-home");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const compactViewport = window.matchMedia("(max-width: 900px)").matches;

  const surfaces = hero.querySelectorAll(
    ".academic-hero-content, .command-search, .lab-console, .console-panel, .hero-proof-row span, .academic-button, .quick-searches button"
  );

  surfaces.forEach((surface) => surface.classList.add("liquid-glass-surface"));

  if (reduceMotion || !finePointer || compactViewport) {
    hero.classList.add("liquid-glass-static");
    return;
  }

  let heroFrame = 0;
  let targetX = 0.62;
  let targetY = 0.3;
  let currentX = targetX;
  let currentY = targetY;
  let activeSurface = null;
  let surfaceEvent = null;
  let surfaceFrame = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function applyHeroVars() {
    currentX += (targetX - currentX) * 0.22;
    currentY += (targetY - currentY) * 0.22;
    const tiltX = clamp((0.5 - currentY) * 8, -4, 4).toFixed(3);
    const tiltY = clamp((currentX - 0.5) * 10, -5, 5).toFixed(3);
    hero.style.setProperty("--lg-mouse-x", `${(currentX * 100).toFixed(2)}%`);
    hero.style.setProperty("--lg-mouse-y", `${(currentY * 100).toFixed(2)}%`);
    hero.style.setProperty("--lg-tilt-x", `${tiltX}deg`);
    hero.style.setProperty("--lg-tilt-y", `${tiltY}deg`);

    if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
      heroFrame = requestAnimationFrame(applyHeroVars);
      return;
    }

    currentX = targetX;
    currentY = targetY;
    heroFrame = 0;
  }

  function scheduleHeroFrame() {
    if (!heroFrame) heroFrame = requestAnimationFrame(applyHeroVars);
  }

  function scheduleHeroVars(event) {
    const rect = hero.getBoundingClientRect();
    targetX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    targetY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    scheduleHeroFrame();
  }

  function resetHeroVars() {
    targetX = 0.62;
    targetY = 0.3;
    scheduleHeroFrame();
  }

  function applySurfaceVars() {
    surfaceFrame = 0;
    if (!activeSurface || !surfaceEvent) return;

    const rect = activeSurface.getBoundingClientRect();
    const localX = clamp((surfaceEvent.clientX - rect.left) / rect.width, 0, 1);
    const localY = clamp((surfaceEvent.clientY - rect.top) / rect.height, 0, 1);
    activeSurface.style.setProperty("--lg-local-x", `${(localX * 100).toFixed(2)}%`);
    activeSurface.style.setProperty("--lg-local-y", `${(localY * 100).toFixed(2)}%`);
  }

  function scheduleSurfaceVars(event) {
    const nextSurface = event.target.closest(".liquid-glass-surface");
    if (!nextSurface || !hero.contains(nextSurface)) return;

    if (activeSurface && activeSurface !== nextSurface) {
      activeSurface.style.removeProperty("--lg-local-x");
      activeSurface.style.removeProperty("--lg-local-y");
    }

    activeSurface = nextSurface;
    surfaceEvent = event;
    if (!surfaceFrame) surfaceFrame = requestAnimationFrame(applySurfaceVars);
  }

  function resetSurfaceVars() {
    if (activeSurface) {
      activeSurface.style.removeProperty("--lg-local-x");
      activeSurface.style.removeProperty("--lg-local-y");
    }
    activeSurface = null;
    surfaceEvent = null;
  }

  hero.addEventListener("pointermove", scheduleHeroVars, { passive: true });
  hero.addEventListener("pointermove", scheduleSurfaceVars, { passive: true });
  hero.addEventListener("pointerleave", resetHeroVars, { passive: true });
  hero.addEventListener("pointerleave", resetSurfaceVars, { passive: true });
  applyHeroVars();
})();
