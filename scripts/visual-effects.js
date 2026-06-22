(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('cv-effects-ready');

  const setPointer = (event) => {
    root.style.setProperty('--cursor-x', `${event.clientX}px`);
    root.style.setProperty('--cursor-y', `${event.clientY}px`);
  };

  window.addEventListener('pointermove', setPointer, { passive: true });

  if (reduceMotion) {
    root.classList.add('cv-reduced-motion');
    return;
  }

  const revealTargets = document.querySelectorAll([
    '.academic-hero-content',
    '.template-stage',
    '.section-header',
    '.research-area-card',
    '.feature-card',
    '.platform-capability-card',
    '.project-card',
    '.academic-note-card',
    '.stat-block',
    '.module-tile',
    '.project-ledger-row',
    '.vision-panel',
    '.database-card',
    '.timeline-item',
    '.contact-card'
  ].join(','));

  revealTargets.forEach((element, index) => {
    element.classList.add('cv-reveal');
    element.style.setProperty('--reveal-delay', `${Math.min((index % 9) * 64, 420)}ms`);
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  revealTargets.forEach((element) => revealObserver.observe(element));

  const tiltTargets = document.querySelectorAll([
    '.lab-console',
    '.command-search',
    '.module-tile',
    '.research-area-card',
    '.platform-capability-card',
    '.project-card',
    '.academic-note-card',
    '.feature-card'
  ].join(','));

  tiltTargets.forEach((element) => {
    element.classList.add('cv-tilt');

    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const tiltX = ((y / rect.height) - 0.5) * -7;
      const tiltY = ((x / rect.width) - 0.5) * 7;

      element.style.setProperty('--spot-x', `${x}px`);
      element.style.setProperty('--spot-y', `${y}px`);
      element.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    }, { passive: true });

    element.addEventListener('pointerleave', () => {
      element.style.setProperty('--tilt-x', '0deg');
      element.style.setProperty('--tilt-y', '0deg');
      element.style.setProperty('--spot-x', '50%');
      element.style.setProperty('--spot-y', '18%');
    });
  });

  const searchPanel = document.querySelector('.command-search');
  const searchInput = document.querySelector('#homeSearch');
  if (searchPanel && searchInput) {
    searchInput.addEventListener('focus', () => searchPanel.classList.add('is-command-active'));
    searchInput.addEventListener('blur', () => searchPanel.classList.remove('is-command-active'));
  }
})();
