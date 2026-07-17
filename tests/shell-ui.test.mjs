import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const pageFiles = [
  "index.html",
  ...fs.readdirSync("pages")
    .filter((file) => file.endsWith(".html"))
    .map((file) => path.join("pages", file))
].sort();
const bootHtmlFiles = ["404.html", ...pageFiles].sort();

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function sha1(file) {
  return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
}

function navMarkup(html) {
  const match = html.match(/<nav class="site-nav" aria-label="Main navigation">([\s\S]*?)<\/nav>/);
  assert(match, "page has a main navigation block");
  return match[1];
}

const faviconVersion = "20260628a";
const legacyCvFaviconHash = "76ea960f2f8859fc959c9ccc640af4e61267c64c";

test("favicon entries use the current ChemVault logo mark", () => {
  for (const file of bootHtmlFiles) {
    const html = read(file);

    assert.match(html, new RegExp(`<link rel="icon" href="/favicon\\.ico\\?v=${faviconVersion}" sizes="any" />`), `${file} versions the fallback favicon`);
    assert.match(html, new RegExp(`<link rel="icon" href="/assets/chemvault-logo-mark\\.png\\?v=${faviconVersion}" type="image/png" sizes="512x512" />`), `${file} points browser tabs at the site logo mark`);
    assert.match(html, new RegExp(`<link rel="apple-touch-icon" href="/assets/chemvault-apple-touch-icon\\.png\\?v=${faviconVersion}" />`), `${file} versions the Apple touch icon`);
    assert.doesNotMatch(html, /href="\/assets\/chemvault-icon-192\.png"/, `${file} no longer advertises the legacy CV favicon as the browser tab icon`);
  }

  const manifest = JSON.parse(read("site.webmanifest"));

  assert.deepEqual(
    manifest.icons.map((icon) => icon.src),
    [
      `/assets/chemvault-icon-192.png?v=${faviconVersion}`,
      `/assets/chemvault-icon-512.png?v=${faviconVersion}`
    ],
    "manifest icons use cache-busted logo-derived assets"
  );
  assert.notEqual(sha1("favicon.ico"), legacyCvFaviconHash, "favicon.ico is no longer the legacy CV icon file");
  assert.equal(sha1("assets/chemvault-icon-512.png"), sha1("assets/chemvault-logo-mark.png"), "512px PWA icon is generated from the site logo mark");
  assert.equal(sha1("assets/favicon-512.png"), sha1("assets/chemvault-logo-mark.png"), "512px favicon asset is generated from the site logo mark");
});

test("site navigation exposes core destinations through categorized disclosure groups", () => {
  const shell = read("scripts/site-shell.js");
  const requiredShellDestinations = [
    ["Home", "/index.html"],
    ["Compound Search", "/pages/search.html"],
    ["File Library", "/pages/file-library.html"],
    ["Molecular Modeling", "/pages/molecular-modeling.html"],
    ["AI Paper Search", "/pages/ai-paper-search.html"],
    ["Docs", "https://docs.chemvault.science/"],
    ["Pricing", "/pages/pricing.html"],
    ["Dashboard", "/pages/dashboard.html"],
    ["People", "/pages/team.html"],
    ["Developer", "/pages/developer.html"],
    ["Enterprise / Contact Sales", "/pages/contact.html"]
  ];

  for (const [label, href] of requiredShellDestinations) {
    assert.match(shell, new RegExp(`>${escapeRegex(label)}<`), `runtime shell navigation exposes ${label}`);
    assert.match(shell, new RegExp(escapeRegex(href)), `runtime shell navigation links ${label} to ${href}`);
  }

  assert.match(shell, /<details class="nav-more"/, "runtime shell has disclosure groups for categorized destinations");
  for (const label of ["Workflows", "Knowledge", "Plans", "About"]) {
    assert.match(shell, new RegExp(`<summary>${label}<\\/summary>`), `runtime shell labels the ${label} navigation group`);
  }
  const plansGroup = shell.match(/<summary>Plans<\/summary>[\s\S]*?<div class="nav-more-menu">([\s\S]*?)<\/div>/)?.[1] || "";
  const aboutGroup = shell.match(/<summary>About<\/summary>[\s\S]*?<div class="nav-more-menu">([\s\S]*?)<\/div>/)?.[1] || "";
  assert.doesNotMatch(plansGroup, /team\.html|developer\.html|projects\.html/, "Plans navigation stays focused on pricing and sales");
  assert.match(aboutGroup, /team\.html/, "people/team page is grouped under About");
  assert.match(aboutGroup, /developer\.html/, "developer profile is grouped under About");
  assert.match(aboutGroup, /projects\.html/, "project/development notes are grouped under About");
  assert.match(shell, /function injectProductSwitcher/, "runtime shell injects the product app switcher");
  assert.match(shell, /productModules\(\)/, "runtime shell can populate app switcher links from the commercial module config");

  for (const file of pageFiles.filter((file) => file !== "index.html")) {
    const html = read(file);
    const nav = navMarkup(html);

    assert.match(nav, />Home</, `${file} keeps Home reachable in the static navigation`);
    assert.match(nav, /(Compound Search|Compounds|Search)/, `${file} keeps compound/search access reachable in the static navigation`);
    assert.match(html, /site-shell\.js\?v=(?!20260603a)\d+/, `${file} loads the runtime shell that normalizes commercial navigation`);
  }

  const home = read("index.html");
  const exhibitionNav = home.match(/<nav class="exhibition-nav"[\s\S]*?<\/nav>/)?.[0] || "";
  assert.match(exhibitionNav, />Mission</, "home navigation starts with the institutional mission");
  assert.match(exhibitionNav, />Research</, "home navigation keeps research visible");
  assert.match(exhibitionNav, />Knowledge</, "home navigation explains the knowledge layer");
  assert.match(exhibitionNav, />Resources</, "home navigation keeps documentation reachable");
  assert.match(exhibitionNav, />About</, "home navigation keeps the initiative story reachable");
  assert.doesNotMatch(exhibitionNav, /AI Paper Search|Pricing|File Library/, "home navigation does not present the sub-products as one application");
  assert.doesNotMatch(home, /commercial-ui\.js/, "home does not load application navigation behavior");
});

test("search page keeps long-tail filters behind a collapsed advanced disclosure", () => {
  const html = read("pages/search.html");
  const portalStyles = read("assets/portal.css");

  assert.match(html, /class="scope-chip-row"/, "search page has quick scope chips");
  assert.match(html, /class="primary-filter-grid"/, "search page has a compact primary filter grid");
  assert.match(html, /<details class="advanced-search-disclosure" id="advancedSearchDisclosure">/, "advanced filters use a details disclosure");
  assert.doesNotMatch(html, /<details class="advanced-search-disclosure" id="advancedSearchDisclosure"\s+open>/, "advanced filters are collapsed by default");

  const advanced = html.match(/<details class="advanced-search-disclosure" id="advancedSearchDisclosure">([\s\S]*?)<\/details>/)?.[1] || "";
  assert.match(advanced, /id="searchFacet"/, "domain/family filter is inside advanced filters");
  assert.match(advanced, /id="searchTag"/, "tag filter is inside advanced filters");
  assert.match(advanced, /id="searchExact"/, "exact phrase filter is inside advanced filters");
  assert.match(portalStyles, /\.advanced-search-disclosure::details-content[\s\S]*block-size:\s*0/, "advanced disclosure content animates from a collapsed block size");
  assert.match(portalStyles, /\.advanced-search-disclosure\[open\] \.advanced-search-grid[\s\S]*opacity:\s*1/, "advanced disclosure grid fades into the expanded state");
});

test("search page paginates local results instead of rendering the full default stack", () => {
  const html = read("pages/search.html");
  const script = read("scripts/search-page.js");
  const styles = read("assets/portal.css");

  assert.match(html, /id="localSearchPagination"/, "search page has a dedicated pagination region below local results");
  assert.match(html, /search-page\.js\?v=20260619b/, "search page refreshes the paginated search script");
  assert.match(script, /const searchResultsPerPage\s*=\s*3/, "search results render three records per page by default");
  assert.match(script, /let searchIndexCache\s*=\s*null/, "search page caches the mapped local index between searches");
  assert.match(script, /function importedRecordsSignature/, "search page invalidates the cached index when saved imports change");
  assert.match(script, /let advancedOptionsSignature\s*=\s*""/, "advanced filter options avoid being rebuilt on every search");
  assert.match(script, /function renderSearchPagination/, "search script renders pagination controls");
  assert.match(script, /data-search-page/, "pagination controls expose target pages for interaction");
  assert.match(script, /rows\.slice\(pageStart,\s*pageStart \+ searchResultsPerPage\)/, "local results render only the current page slice");
  assert.match(script, /smoothScroll\s*=\s*!window\.matchMedia/, "mobile pagination avoids smooth scroll pressure");
  assert.match(styles, /\.search-pagination-shell/, "pagination controls are styled with the search page shell");
  assert.match(styles, /\.search-pagination-link\[aria-current="page"\]/, "current pagination page is visually distinguished");
});

test("home page uses the selected exhibition concept with accessible interactions", () => {
  const html = read("index.html");
  const script = read("scripts/home-exhibition.js");
  const styles = read("assets/home-exhibition.css");

  assert.match(html, /home-exhibition\.css\?v=20260717b/, "home loads its dedicated exhibition design layer");
  assert.match(html, /home-exhibition\.js\?v=20260717b/, "home loads its focused interaction layer");
  assert.match(html, /data-home-boot-loader/, "home owns its dedicated first-paint loading layer");
  assert.match(html, /home-molecular-exhibition\.png/, "home displays the generated exhibition panorama");
  assert.match(html, /id="exhibition-title"/, "home exposes a single primary page title");
  assert.match(html, /id="mission"/, "primary calls to action lead to the mission");
  assert.match(html, /id="principles"/, "research principles have a stable anchor");
  assert.doesNotMatch(html, /homeSearchForm|data-render="app-modules"|commercial-ui\.js/, "home does not load compound-search or product-dashboard UI");

  assert.match(script, /function setMenu/, "home script owns the mobile navigation state");
  assert.match(script, /aria-expanded/, "mobile navigation publishes its expanded state");
  assert.match(script, /event\.key !== "Escape"/, "Escape closes the mobile navigation");
  assert.match(script, /prefers-reduced-motion: reduce/, "hero depth respects reduced-motion preferences");
  assert.match(script, /pointer: fine/, "pointer depth only runs for precise pointing devices");
  assert.match(script, /function dismissHomeBootLoader/, "home removes its first-paint loading layer after the page is ready");

  assert.match(styles, /@font-face[\s\S]*font-family:\s*"Newsreader"/, "home ships its editorial display type locally");
  assert.match(styles, /\.home-boot-loader\s*{[\s\S]*linear-gradient\(145deg, #05090e/, "home loading uses a dark exhibition-specific treatment");
  assert.doesNotMatch(styles, /\.home-boot-loader[\s\S]*chemvault-logo-mark/, "home loading does not reuse the old square logo image");
  assert.match(styles, /\.exhibition-hero\s*{[\s\S]*min-height:\s*600px/, "desktop hero matches the gallery-scale composition");
  assert.match(styles, /\.exhibition-hero-media img\s*{[\s\S]*object-fit:\s*cover/, "desktop panorama fills the selected visual slot");
  assert.match(styles, /@media \(max-width:\s*820px\)[\s\S]*\.exhibition-menu-toggle\s*{[\s\S]*display:\s*inline-flex/, "mobile navigation exposes its menu control");
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)/, "home provides a static reduced-motion profile");
});

test("topbar search opens without resizing the navigation tabs", () => {
  const styles = read("assets/styles.css");
  const shell = read("scripts/site-shell.js");

  assert.match(styles, /\.search-shell\s*{[\s\S]*position:\s*relative/, "topbar search creates a local positioning context");
  assert.match(styles, /\.search-shell\s*{[\s\S]*overflow:\s*visible/, "topbar search lets the floating input render outside the compact trigger");
  assert.match(styles, /\.search-shell\s*{[\s\S]*width:\s*112px/, "compact search trigger keeps a fixed layout width");
  assert.match(styles, /\.search-shell input\s*{[\s\S]*position:\s*absolute/, "topbar search input floats instead of expanding the header grid");
  assert.match(styles, /\.search-shell:is\(:focus-within, \.is-expanded, \.has-value\) input\s*{[\s\S]*width:\s*min\(420px, calc\(100vw - 32px\)\)/, "expanded input gets room without changing the trigger width");
  assert.match(styles, /@media \(max-width:\s*620px\)[\s\S]*\.header-actions\s*{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) 64px/, "mobile header search and theme control share a stable full-width row");
  assert.match(styles, /@media \(max-width:\s*620px\)[\s\S]*\.search-shell span\s*{[\s\S]*display:\s*none/, "mobile search hides the compact label to preserve input width");
  assert.match(shell, /let shellSearchItemsCache\s*=\s*null/, "topbar search caches the mapped local search items");
  assert.match(shell, /function shellSearchItems/, "topbar search builds local records through a reusable cache");
  assert.doesNotMatch(styles, /\.search-shell:is\(:focus-within, \.is-expanded, \.has-value\)\s*{[\s\S]*width:\s*min\(456px, 48vw\)/, "expanded state no longer grows the search trigger");
  assert.doesNotMatch(styles, /\.site-header\.nav-stacked \.search-shell:is\(:focus-within, \.is-expanded, \.has-value\)\s*{[\s\S]*width:\s*min\(456px, 48vw\)/, "stacked header search also avoids pushing navigation tabs");
});

test("updated shell assets use a fresh cache key", () => {
  const staleAssetPattern = /(styles\.css|portal\.css|home\.js|site-shell\.js|search-page\.js)\?v=20260603a/;

  for (const file of pageFiles) {
    assert.doesNotMatch(read(file), staleAssetPattern, `${file} does not pin changed shell assets to the previous cache key`);
  }
});

test("startup welcome is wired through the shared motion layer", () => {
  const script = read("scripts/motion.js");
  const styles = read("assets/styles.css");
  const boot = read("scripts/boot.js");

  assert.match(boot, /function shouldShowStartupWelcome/, "boot layer decides when the home welcome should replace loading");
  assert.match(boot, /startup-welcome-pending/, "boot layer marks the welcome state before page scripts load");
  assert.match(boot, /if \(onHome\) return/, "boot layer never starts legacy loading on the home page");
  assert.match(script, /function wireStartupWelcome/, "motion layer owns startup welcome wiring");
  assert.match(script, /const welcomeVisible = wireStartupWelcome\(\)/, "motion layer mounts the welcome before considering legacy startup loading");
  assert.match(script, /!welcomeVisible && showStartupLoader\(\)/, "motion layer skips legacy startup loading when welcome is visible");
  assert.match(script, /startup-welcome/, "motion layer injects the startup welcome overlay");
  assert.match(script, /chemvault-gooey-threshold/, "startup welcome includes the gooey SVG threshold filter");
  assert.match(script, /data-welcome-action="enter"/, "startup welcome exposes an enter button");
  assert.match(script, /startGooeyTextMorph/, "startup welcome starts the gooey text morph animation");

  assert.match(styles, /html\.startup-welcome-pending/, "stylesheet hides the page chrome while the welcome is being mounted");
  assert.match(styles, /\.startup-welcome\b/, "stylesheet defines startup welcome overlay styles");
  assert.match(styles, /\.startup-welcome__gooey/, "stylesheet defines gooey text layout styles");
  assert.match(styles, /\.startup-welcome__enter/, "stylesheet defines the enter button styles");
});

test("home reveal orchestration keeps section titles ahead of body content", () => {
  const effects = read("scripts/visual-effects.js");

  assert.match(effects, /const isSectionLead = \(element\) => element\.matches/, "visual effects identify section-leading headings");
  assert.match(effects, /'\.cv-section-header'/, "commercial home section headers participate in reveal ordering");
  assert.match(effects, /'\.text-column'/, "home text blocks are hidden until their section reveal starts");
  assert.match(effects, /'\.cv-module-grid'/, "commercial module content is included in the reveal queue");
  assert.match(effects, /const contentLeadGap = lead \? 0 :/, "non-heading content waits behind its section heading");
  assert.match(effects, /stage \* \(compactMotionProfile \? 18 : 28\)/, "cross-section delay stays small enough that scrolled titles appear promptly");
  assert.match(effects, /window\.addEventListener\('DOMContentLoaded', stageAwareReveal\)/, "dynamic homepage content is re-queued after commercial UI rendering");
});

test("startup welcome assets use a fresh cache key on every HTML entry", () => {
  for (const file of bootHtmlFiles.filter((file) => file !== "index.html")) {
    const html = read(file);

    assert.match(html, /boot\.js\?v=20260705a/, `${file} references startup welcome boot`);
    assert.match(html, /styles\.css\?v=(?!20260603a)\d+/, `${file} references non-stale shared styles`);
    assert.match(html, /motion\.js\?v=20260705a/, `${file} references startup welcome motion`);
  }

  const home = read("index.html");
  assert.match(home, /home-exhibition\.js\?v=20260717b/, "home uses the exhibition entrance instead of the application boot sequence");
  assert.doesNotMatch(home, /boot\.js|motion\.js/, "home does not show the application welcome overlay");
});

test("public contact references use confirmed ChemVault mailboxes", () => {
  const contactFiles = [
    ".env.example",
    "ENVIRONMENT_VARIABLES.md",
    "docs/compliance/apple-app-compliance.md",
    "docs/compliance/email-compliance.md",
    "docs/legal/privacy-policy.md",
    "docs/legal/terms-of-service.md",
    "pages/account-delete.html",
    "pages/account-export.html",
    "pages/privacy.html",
    "pages/security.html",
    "pages/terms.html"
  ];
  const unconfirmedMailboxPattern = /(?:support|abuse|privacy|security|legal)@chemvault\.science|support@example\.com/;

  for (const file of contactFiles) {
    assert.doesNotMatch(read(file), unconfirmedMailboxPattern, `${file} does not reference an unconfirmed public mailbox`);
  }

  assert.match(read("pages/security.html"), /mailto:contact@chemvault\.science/, "security reporting page uses the confirmed contact mailbox");
});

test("mobile Safari gets a static scroll-safe visual profile", () => {
  const boot = read("scripts/boot.js");
  const effects = read("scripts/visual-effects.js");
  const motion = read("scripts/motion.js");
  const styles = read("assets/styles.css");
  const academic = read("assets/academic.css");

  assert.match(boot, /function applyMobileScrollSafety/, "boot marks scroll-safe devices before CSS and deferred scripts run");
  assert.match(boot, /cv-mobile-scroll-safe/, "boot applies the mobile scroll safety class globally");
  assert.match(boot, /navigator\.maxTouchPoints/, "boot catches iPadOS desktop-mode Safari");
  assert.match(boot, /Number\.isFinite\(navigator\.deviceMemory\)/, "boot falls back for low-memory compact mobile browsers");
  assert.match(effects, /const mobileScrollSafe = isAppleTouchDevice/, "visual effects share the same mobile scroll safety heuristic");
  assert.match(effects, /if \(mobileScrollSafe\) \{\s*return;\s*\}/, "visual effects skip scroll rails, parallax, tilt, and staged reveals on mobile Safari");

  assert.match(motion, /const isMobileScrollSafe = \(\) => root\.classList\.contains\("cv-mobile-scroll-safe"\)/, "motion layer reads the boot-time scroll safety class");
  assert.match(motion, /if \(!isMobileScrollSafe\(\)\) prepareReveal\(document\)/, "manual motion refresh avoids rebinding reveal effects on mobile Safari");
  assert.match(motion, /function wireReveal\(\) \{[\s\S]*isMobileScrollSafe\(\)/, "page reveal observer is disabled in the scroll-safe profile");
  assert.match(motion, /function wireRipples\(\) \{[\s\S]*isMobileScrollSafe\(\)/, "button ripple effects are disabled in the scroll-safe profile");

  assert.match(styles, /html\.cv-mobile-scroll-safe,[\s\S]*scroll-behavior:\s*auto/, "shared styles avoid smooth-scroll pressure");
  assert.match(styles, /html\.cv-mobile-scroll-safe :is\(\.site-header[\s\S]*backdrop-filter:\s*none/, "shared shell glass avoids WebKit backdrop filters");
  assert.match(styles, /html\.cv-mobile-scroll-safe \.motion-ripple[\s\S]*display:\s*none/, "ripples are hidden in the static profile");
  assert.match(academic, /html\.cv-mobile-scroll-safe \.cv-scroll-rail,[\s\S]*display:\s*none/, "homepage scroll rail is removed on mobile Safari");
  assert.match(academic, /html\.cv-mobile-scroll-safe body\.academic-home :is\(\.academic-hero-content[\s\S]*backdrop-filter:\s*none/, "homepage liquid glass uses static surfaces in the scroll-safe profile");
  assert.match(academic, /html\.cv-mobile-scroll-safe body\.academic-home :is\(\.liquid-glass-surface[\s\S]*filter:\s*none/, "homepage glass edge filters are removed from the mobile compositor path");
});

test("footer uses a ChemVault sticky footer adapted from the template", () => {
  const index = read("index.html");
  const notFound = read("404.html");
  const shell = read("scripts/site-shell.js");
  const styles = read("assets/styles.css");

  for (const [file, source] of [
    ["404.html", notFound],
    ["scripts/site-shell.js", shell]
  ]) {
    assert.match(source, /class="footer-sticky-layer"/, `${file} includes the fixed sticky footer layer`);
    assert.match(source, /class="footer-sticky-shell"/, `${file} includes the sticky viewport shell`);
    assert.match(source, /class="footer-link-groups"/, `${file} includes grouped footer links`);
    assert.match(source, />Platform</, `${file} keeps footer links focused on platform navigation`);
    assert.match(source, />Tools</, `${file} keeps footer links focused on site tools`);
    assert.match(source, />Resources</, `${file} keeps footer links focused on reference resources`);
    assert.match(source, />Contact</, `${file} keeps contact information reachable`);
    assert.match(source, /mailto:contact@chemvault\.science/, `${file} keeps the project email reachable`);
    assert.match(source, /class="footer-version"/, `${file} writes the site version inside the footer`);
    assert.match(source, /ChemVault v0\.2\.4/, `${file} exposes the current site version in the footer`);
    assert.match(source, /class="[^"]*footer-mobile-compact/, `${file} includes a dedicated compact mobile footer`);
  }

  const exhibitionStyles = read("assets/home-exhibition.css");
  assert.match(index, /class="site-footer exhibition-footer"/, "home uses the simple institutional exhibition footer");
  assert.match(index, /class="exhibition-shell exhibition-footer-grid"/, "home footer keeps a restrained identity, statement, and navigation grid");
  assert.doesNotMatch(index, /footer-sticky-layer/, "home footer stays in document flow instead of using the application reveal treatment");
  assert.match(exhibitionStyles, /\.home-exhibition \.exhibition-footer\s*{[\s\S]*position:\s*relative/, "home footer explicitly overrides the shared sticky-footer positioning");

  assert.match(styles, /body\s*{[\s\S]*position:\s*relative/, "page body creates a root layer for the reveal footer");
  assert.match(styles, /body\s*{[\s\S]*isolation:\s*isolate/, "page body isolates the reveal stacking context");
  assert.match(styles, /main\s*{[\s\S]*position:\s*relative[\s\S]*z-index:\s*2[\s\S]*background:\s*var\(--bg\)/, "main content stays above the fixed footer layer until it is revealed");
  assert.match(styles, /--footer-height:\s*620px/, "footer uses a tighter reveal height with less empty space");
  assert.match(styles, /\.site-footer[\s\S]*clip-path:\s*polygon\(0 0, 100% 0, 100% 100%, 0 100%\)/, "footer clips the fixed layer like the template");
  assert.match(styles, /\.site-footer[\s\S]*z-index:\s*0/, "footer itself sits behind page content for the reveal effect");
  assert.match(styles, /\.footer-sticky-layer[\s\S]*position:\s*fixed/, "footer layer is fixed to the bottom");
  assert.match(styles, /\.footer-sticky-layer[\s\S]*inset:\s*auto 0 0/, "footer layer is pinned to the viewport bottom like the template");
  assert.match(styles, /\.footer-sticky-layer[\s\S]*z-index:\s*0/, "footer fixed layer stays under the page content");
  assert.match(styles, /\.footer-sticky-shell[\s\S]*position:\s*sticky/, "footer inner shell uses sticky positioning");
  assert.match(styles, /\.footer-sticky-shell[\s\S]*height:\s*var\(--footer-height\)/, "sticky shell preserves the template reveal height");
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*\.site-footer\s*{[\s\S]*height:\s*auto[\s\S]*clip-path:\s*none/, "mobile footer uses natural height instead of a fixed reveal ratio");
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*\.footer-sticky-layer\s*{[\s\S]*position:\s*relative[\s\S]*height:\s*auto/, "mobile footer layer returns to document flow");
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*\.footer-sticky-shell\s*{[\s\S]*position:\s*relative[\s\S]*overflow:\s*visible/, "mobile footer avoids an inner scrolling sticky shell");
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*\.footer-reveal\s*{[\s\S]*animation:\s*none[\s\S]*filter:\s*none/, "mobile footer disables reveal blur animation");
  assert.doesNotMatch(styles, /--footer-height:\s*720px/, "mobile footer no longer uses a too-short hard-coded height");
  assert.match(styles, /html\.motion-available body\.page-ready \.site-footer\s*{[\s\S]*transform:\s*none/, "page enter animation does not create a fixed-position containing block around the footer");
  assert.match(styles, /\.site-footer[\s\S]*view-timeline-name:\s*--footer-clarify/, "footer exposes a reveal timeline for the subtle blur effect");
  assert.match(styles, /@supports \(animation-timeline:\s*view\(\)\)[\s\S]*\.footer-panel[\s\S]*animation:\s*footer-clarify/, "footer panel clarifies as the footer is revealed");
  assert.match(styles, /@keyframes footer-clarify[\s\S]*filter:\s*blur\(5px\)[\s\S]*filter:\s*blur\(0\)/, "footer reveal moves from slight blur to clear");
  assert.match(styles, /\.footer-column\s*{[\s\S]*background:[\s\S]*rgba\(255, 255, 255, 0\.025\)/, "footer columns use distinct grouped cards");
  assert.match(styles, /\.footer-heading\s*{[\s\S]*border-bottom:\s*1px solid rgba\(255, 255, 255, 0\.11\)/, "footer headings are visually separated from links");
  assert.match(styles, /\.footer-column a:first-of-type\s*{[\s\S]*font-size:\s*clamp\(0\.98rem, 1\.05vw, 1\.08rem\)/, "footer primary links are larger than secondary links");
  assert.match(styles, /\.footer-column a:nth-of-type\(n \+ 4\)\s*{[\s\S]*font-size:\s*0\.78rem/, "footer tertiary links are visually quieter");
  assert.match(styles, /\.footer-version\s*{[\s\S]*letter-spacing:\s*0\.08em/, "footer version has a compact metadata treatment");
  assert.match(styles, /\.footer-mobile-compact\s*{[\s\S]*display:\s*none/, "desktop footer keeps the mobile footer summary hidden");
  assert.match(styles, /@media \(max-width:\s*620px\)[\s\S]*\.footer-grid\s*{[\s\S]*display:\s*none/, "mobile layout replaces the full link grid with a compact footer");
  assert.match(styles, /@media \(max-width:\s*620px\)[\s\S]*\.footer-mobile-compact\s*{[\s\S]*display:\s*grid/, "mobile layout exposes its dedicated footer summary");
  assert.match(styles, /@media \(max-width:\s*620px\)[\s\S]*\.footer-mobile-identity p\s*{[\s\S]*font-size:\s*0\.7rem/, "mobile footer uses reduced text sizing");
  assert.doesNotMatch(styles, /\.site-version\s*{/, "original standalone version strip styles are removed");
  assert.doesNotMatch(shell, /document\.querySelector\("\.site-version"\)/, "dynamic footer no longer depends on the removed version strip");

  for (const file of ["404.html", ...pageFiles]) {
    const html = read(file);
    assert.doesNotMatch(html, /class="site-version"/, `${file} removes the original standalone version strip`);
    assert.match(html, /styles\.css\?v=(?!20260603a)\d+/, `${file} references non-stale sticky footer styles`);
    if (file !== "index.html") {
      assert.match(html, /site-shell\.js\?v=(?!20260603a)\d+/, `${file} references sticky footer shell markup`);
    }
  }
});

test("site navigation uses a 21st.dev-inspired spotlight tab treatment", () => {
  const styles = read("assets/styles.css");
  const shell = read("scripts/site-shell.js");
  const commercialUi = read("scripts/commercial-ui.js");

  assert.match(shell, /<summary>Workflows<\/summary>/, "runtime commercial navigation groups workflow pages");
  assert.match(shell, /<summary>Knowledge<\/summary>/, "runtime commercial navigation groups knowledge pages");
  assert.match(shell, /<summary>Plans<\/summary>/, "runtime commercial navigation groups plan pages");
  assert.match(shell, /<summary>About<\/summary>/, "runtime commercial navigation separates people and project pages from pricing");
  assert.match(shell, /function wireNavigationHighlight\(\)/, "runtime shell wires the top navigation spotlight");
  assert.match(commercialUi, /function wireNavigationHighlight\(\)/, "commercial homepage wires the same navigation spotlight");
  assert.match(commercialUi, /function markActiveNavigation\(\)/, "commercial homepage clears stale grouped active states before measuring the spotlight");
  assert.match(shell, /pointerFocusUntil/, "runtime shell ignores pointer-created focus when positioning the spotlight");
  assert.match(commercialUi, /focusout[\s\S]*stateTarget\(false\)/, "commercial homepage returns the spotlight to the current page after focus leaves navigation");

  for (const file of bootHtmlFiles.filter((file) => file !== "index.html")) {
    const html = read(file);

    navMarkup(html);
    assert.match(html, /styles\.css\?v=(?!20260603a)\d+/, `${file} references non-stale spotlight navigation styles`);
  }

  const home = read("index.html");
  const exhibitionStyles = read("assets/home-exhibition.css");
  assert.match(home, /class="exhibition-nav"/, "home uses the selected minimal institutional navigation");
  assert.match(exhibitionStyles, /\.exhibition-nav\s*{[\s\S]*justify-content:\s*center/, "home navigation is centered like the selected exhibition concept");

  assert.match(styles, /\.site-nav\s*{[\s\S]*--nav-indicator-x:\s*8px/, "navigation container exposes spotlight indicator variables");
  assert.match(styles, /\.site-nav\s*{[\s\S]*backdrop-filter:\s*blur\(20px\)/, "navigation rail uses translucent glass");
  assert.match(styles, /\.site-nav::before\s*{[\s\S]*bottom:\s*5px[\s\S]*transform:\s*translate3d\(var\(--nav-indicator-x\), 0, 0\)/, "navigation rail draws the moving underline spotlight");
  assert.match(styles, /\.nav-more > summary::before\s*{[\s\S]*border-right:\s*1\.5px solid currentColor/, "category summaries use a chevron affordance");
  assert.match(styles, /\.nav-more-menu\s*{[\s\S]*grid-template-columns:\s*repeat\(auto-fit, minmax\(180px, 1fr\)\)/, "category menus render as responsive option grids");
});

test("theme switch presents a stable, resolved light/dark control", () => {
  const styles = read("assets/styles.css");

  for (const scriptFile of ["scripts/home.js", "scripts/site-shell.js", "scripts/app.js"]) {
    const script = read(scriptFile);
    assert.match(script, /button\.dataset\.themeSetting = setting/, `${scriptFile} preserves the stored theme preference`);
    assert.match(script, /button\.dataset\.themeState = mode/, `${scriptFile} exposes the resolved light/dark state to the control`);
    assert.match(script, /return resolveTheme\(normaliseTheme\(setting\)\) === "dark" \? "light" : "dark"/, `${scriptFile} toggles directly between light and dark`);
    assert.match(script, /theme active\. Switch to/, `${scriptFile} gives the toggle an accessible active-state label`);
    assert.doesNotMatch(script, /offsetWidth/, `${scriptFile} avoids forced layout reads during theme switching`);
    assert.match(script, /!root\.classList\.contains\("theme-switching"\)/, `${scriptFile} avoids restarting the transition class on rapid toggles`);
    assert.match(script, /setTimeout\(\(\) => \{[\s\S]*root\.classList\.remove\("theme-switching"\);[\s\S]*\}, 240\)/, `${scriptFile} keeps the theme transition short`);
  }

  assert.match(styles, /\.theme-toggle\s*{[\s\S]*width:\s*64px[\s\S]*border-radius:\s*999px/, "theme control uses a compact switch rail");
  assert.match(styles, /\.theme-toggle\[data-theme-state="dark"\] \.theme-toggle__icon\s*{[\s\S]*translateX\(30px\)/, "dark mode moves the switch thumb to the active side");
  assert.match(styles, /\.theme-toggle\[data-theme-state="light"\] \.theme-toggle__icon::before/, "light mode renders the sun state");
  assert.doesNotMatch(styles, /\.theme-toggle\[data-theme-state="system"\]/, "theme control no longer renders a visually ambiguous system state");
  assert.doesNotMatch(styles, /html\.theme-switching[\s\S]*box-shadow 260ms/, "theme switching avoids expensive shadow interpolation");
  assert.match(styles, /html\.theme-switching::before\s*{[\s\S]*contain:\s*strict/, "theme overlay is paint-contained");
  assert.match(styles, /animation:\s*chemvault-theme-reveal 220ms/, "theme overlay animation stays brief");
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
