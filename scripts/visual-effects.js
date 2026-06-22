(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReduced = reduceMotion?.matches === true;

  root.classList.add('cv-effects-ready');

  const setPointer = (event) => {
    root.style.setProperty('--cursor-x', `${event.clientX}px`);
    root.style.setProperty('--cursor-y', `${event.clientY}px`);
    const spotlightX = `${(event.clientX / Math.max(1, window.innerWidth)) * 100}%`;
    const spotlightY = `${(event.clientY / Math.max(1, window.innerHeight)) * 100}%`;
    root.style.setProperty('--cursor-spot-x', spotlightX);
    root.style.setProperty('--cursor-spot-y', spotlightY);
  };

  window.addEventListener('pointermove', setPointer, { passive: true });

  if (prefersReduced) {
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
    '.contact-card',
    '.page-hero',
    '.page-panel',
    '.data-window',
    '.search-hit',
    '.portal-card',
    '.list-button',
    '.external-source-card',
    '.local-result-card',
    '.gateway-card'
  ].join(','));

  revealTargets.forEach((element, index) => {
    element.classList.add('cv-reveal');
    element.style.setProperty('--reveal-delay', `${Math.min((index % 11) * 54, 440)}ms`);
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.13, rootMargin: '0px 0px -12% 0px' });

  revealTargets.forEach((element) => revealObserver.observe(element));

  const tiltTargets = document.querySelectorAll([
    '.lab-console',
    '.command-search',
    '.module-tile',
    '.research-area-card',
    '.platform-capability-card',
    '.project-card',
    '.academic-note-card',
    '.feature-card',
    '.portal-card',
    '.search-hit',
    '.external-source-card',
    '.local-result-card',
    '.gateway-card'
  ].join(','));

  tiltTargets.forEach((element) => {
    element.classList.add('cv-tilt');

    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const tiltX = ((y / Math.max(1, rect.height)) - 0.5) * -7;
      const tiltY = ((x / Math.max(1, rect.width)) - 0.5) * 7;

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

  const bindMagnetics = () => {
    const magneticTargets = document.querySelectorAll([
      '.academic-button',
      '.site-nav a',
      '.nav-more > summary',
      '.hero-actions a',
      '.contact-card a',
      '.portal-card',
      '.list-button',
      '.search-hit',
      '.external-source-card',
      '.local-result-card',
      '.gateway-card'
    ].join(','));

    magneticTargets.forEach((element) => {
      if (element.classList.contains('cv-tilt')) return;
      if (element.dataset.cvMagneticBound === 'true') return;
      element.dataset.cvMagneticBound = 'true';
      element.classList.add('cv-magnetic');

      const reset = () => {
        element.style.setProperty('--magnetic-x', '0px');
        element.style.setProperty('--magnetic-y', '0px');
        element.style.setProperty('--magnetic-scale', '1');
      };

      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - (rect.left + rect.width / 2)) / (rect.width || 1)) * 9;
        const y = ((event.clientY - (rect.top + rect.height / 2)) / (rect.height || 1)) * 9;
        const magneticX = Math.max(-10, Math.min(10, x));
        const magneticY = Math.max(-8, Math.min(8, y));

        element.style.setProperty('--magnetic-x', `${magneticX.toFixed(2)}px`);
        element.style.setProperty('--magnetic-y', `${magneticY.toFixed(2)}px`);
        element.style.setProperty('--magnetic-scale', '1');
      }, { passive: true });

      element.addEventListener('pointerleave', reset, { passive: true });
      element.addEventListener('pointerdown', () => {
        element.style.setProperty('--magnetic-scale', '0.985');
      });
      element.addEventListener('pointerup', reset);
      element.addEventListener('focus', () => {
        element.style.setProperty('--magnetic-scale', '1.01');
      }, true);
      element.addEventListener('blur', reset, true);
    });
  };

  const ensureScrollRail = () => {
    if (document.querySelector('.cv-scroll-rail')) return;
    const rail = document.createElement('div');
    rail.className = 'cv-scroll-rail';
    body.appendChild(rail);

    const updateProgress = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = window.scrollY / max;
      root.style.setProperty('--cv-scroll-progress', `${progress}`);
    };

    const scheduleUpdate = () => {
      requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
  };

  const syncParallax = () => {
    const hero = document.querySelector('.academic-hero');
    const sections = document.querySelectorAll('.academic-section');
    const apply = () => {
      const offset = Math.min(120, window.scrollY * 0.12);
      root.style.setProperty('--cv-parallax-offset', `${-offset.toFixed(2)}px`);

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight * 1.5)));
        section.style.setProperty('--cv-section-shift', `${(ratio * (index % 2 ? 5 : -5)).toFixed(2)}px`);
      });
    };

    const onScroll = () => {
      requestAnimationFrame(apply);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    if (hero) hero.classList.add('cv-hero-parallax');
  };

  const searchPanel = document.querySelector('.command-search');
  const searchInput = document.querySelector('#homeSearch');
  if (searchPanel && searchInput) {
    searchPanel.classList.add('cv-magnetic');
    searchInput.addEventListener('focus', () => searchPanel.classList.add('is-command-active'));
    searchInput.addEventListener('blur', () => searchPanel.classList.remove('is-command-active'));
  }

  const quickSearches = document.querySelectorAll('.quick-searches button[data-query]');
  quickSearches.forEach((button) => {
    button.addEventListener('click', () => {
      const query = button.getAttribute('data-query');
      if (query && searchInput) {
        searchInput.value = query;
      }
    });
  });


  bindMagnetics();
  ensureScrollRail();
  syncParallax();
})();
