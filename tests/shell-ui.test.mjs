import assert from "node:assert/strict";
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

function navMarkup(html) {
  const match = html.match(/<nav class="site-nav" aria-label="Main navigation">([\s\S]*?)<\/nav>/);
  assert(match, "page has a main navigation block");
  return match[1];
}

test("site navigation exposes core destinations and groups secondary pages under More", () => {
  for (const file of pageFiles) {
    const nav = navMarkup(read(file));

    for (const label of ["Home", "Search", "Workbench", "Reagents", "Materials", "Methods"]) {
      assert.match(nav, new RegExp(`>${label}<`), `${file} keeps ${label} as a primary destination`);
    }

    assert.match(nav, /<details class="nav-more"/, `${file} has a More disclosure for secondary destinations`);
    assert.match(nav, /<summary[^>]*>More<\/summary>/, `${file} labels the secondary navigation disclosure`);

    for (const label of ["App", "Research", "Dossiers", "Spectroscopy", "Atlas", "Library", "About", "Team", "Developer"]) {
      assert.match(nav, new RegExp(`>${label}<`), `${file} keeps ${label} reachable from More`);
    }
  }
});

test("search page keeps long-tail filters behind a collapsed advanced disclosure", () => {
  const html = read("pages/search.html");

  assert.match(html, /class="scope-chip-row"/, "search page has quick scope chips");
  assert.match(html, /class="primary-filter-grid"/, "search page has a compact primary filter grid");
  assert.match(html, /<details class="advanced-search-disclosure" id="advancedSearchDisclosure">/, "advanced filters use a details disclosure");
  assert.doesNotMatch(html, /<details class="advanced-search-disclosure" id="advancedSearchDisclosure"\s+open>/, "advanced filters are collapsed by default");

  const advanced = html.match(/<details class="advanced-search-disclosure" id="advancedSearchDisclosure">([\s\S]*?)<\/details>/)?.[1] || "";
  assert.match(advanced, /id="searchFacet"/, "domain/family filter is inside advanced filters");
  assert.match(advanced, /id="searchTag"/, "tag filter is inside advanced filters");
  assert.match(advanced, /id="searchExact"/, "exact phrase filter is inside advanced filters");
});

test("search page paginates local results instead of rendering the full default stack", () => {
  const html = read("pages/search.html");
  const script = read("scripts/search-page.js");
  const styles = read("assets/portal.css");

  assert.match(html, /id="localSearchPagination"/, "search page has a dedicated pagination region below local results");
  assert.match(html, /search-page\.js\?v=20260619a/, "search page refreshes the paginated search script");
  assert.match(script, /const searchResultsPerPage\s*=\s*3/, "search results render three records per page by default");
  assert.match(script, /function renderSearchPagination/, "search script renders pagination controls");
  assert.match(script, /data-search-page/, "pagination controls expose target pages for interaction");
  assert.match(script, /rows\.slice\(pageStart,\s*pageStart \+ searchResultsPerPage\)/, "local results render only the current page slice");
  assert.match(styles, /\.search-pagination-shell/, "pagination controls are styled with the search page shell");
  assert.match(styles, /\.search-pagination-link\[aria-current="page"\]/, "current pagination page is visually distinguished");
});

test("home page search uses a clearable icon input adapted from the template", () => {
  const html = read("index.html");
  const script = read("scripts/home.js");
  const styles = read("assets/portal.css");

  assert.match(html, /portal\.css\?v=20260618b/, "home page refreshes the portal stylesheet for the search input");
  assert.match(html, /home\.js\?v=20260618a/, "home page refreshes the search interaction script");
  assert.match(html, /class="home-search-input"/, "home search wraps the input in a component shell");
  assert.match(html, /class="home-search-icon"/, "home search includes a leading search icon");
  assert.match(html, /data-home-search-clear/, "home search includes a clear button like the template");
  assert.match(html, /aria-label="Clear home search"/, "clear button has an accessible name");

  assert.match(script, /function wireHomeSearchInput/, "home script wires the clearable input behavior");
  assert.match(script, /data-home-search-clear/, "home script targets the clear button");
  assert.match(script, /home-search-input/, "home script toggles value state on the input shell");
  assert.match(script, /input\.value = ""/, "clear action resets the search input");

  assert.match(styles, /\.home-search-input\s*{[\s\S]*position:\s*relative/, "home input shell positions icon and clear controls");
  assert.match(styles, /\.home-search-icon\s*{[\s\S]*position:\s*absolute/, "search icon is inset inside the input");
  assert.match(styles, /\.home-search-clear\s*{[\s\S]*position:\s*absolute/, "clear button is inset inside the input");
  assert.match(styles, /\.home-search-clear\[hidden\]/, "hidden clear button stays out of the accessible layout");
  assert.match(styles, /\.home-search-input input::-webkit-search-cancel-button/, "native search clear button is hidden so only the template clear control appears");
  assert.match(styles, /\.home-search-input\.has-value \.home-search-clear/, "clear button appears only when there is input text");
});

test("topbar search opens without resizing the navigation tabs", () => {
  const styles = read("assets/styles.css");

  assert.match(styles, /\.search-shell\s*{[\s\S]*position:\s*relative/, "topbar search creates a local positioning context");
  assert.match(styles, /\.search-shell\s*{[\s\S]*overflow:\s*visible/, "topbar search lets the floating input render outside the compact trigger");
  assert.match(styles, /\.search-shell\s*{[\s\S]*width:\s*112px/, "compact search trigger keeps a fixed layout width");
  assert.match(styles, /\.search-shell input\s*{[\s\S]*position:\s*absolute/, "topbar search input floats instead of expanding the header grid");
  assert.match(styles, /\.search-shell:is\(:focus-within, \.is-expanded, \.has-value\) input\s*{[\s\S]*width:\s*min\(420px, calc\(100vw - 32px\)\)/, "expanded input gets room without changing the trigger width");
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

test("startup welcome assets use a fresh cache key on every HTML entry", () => {
  for (const file of bootHtmlFiles) {
    const html = read(file);

    assert.match(html, /boot\.js\?v=20260618c/, `${file} references startup welcome boot`);
    assert.match(html, /styles\.css\?v=20260619b/, `${file} references current shared styles`);
    assert.match(html, /motion\.js\?v=20260618c/, `${file} references startup welcome motion`);
  }
});

test("footer uses a ChemVault sticky footer adapted from the template", () => {
  const index = read("index.html");
  const notFound = read("404.html");
  const shell = read("scripts/site-shell.js");
  const styles = read("assets/styles.css");

  for (const [file, source] of [
    ["index.html", index],
    ["404.html", notFound],
    ["scripts/site-shell.js", shell]
  ]) {
    assert.match(source, /class="footer-sticky-layer"/, `${file} includes the fixed sticky footer layer`);
    assert.match(source, /class="footer-sticky-shell"/, `${file} includes the sticky viewport shell`);
    assert.match(source, /class="footer-link-groups"/, `${file} includes grouped footer links`);
    assert.match(source, />Explore</, `${file} keeps footer links focused on public browsing`);
    assert.match(source, />Workspaces</, `${file} keeps footer links focused on site tools`);
    assert.match(source, />Project</, `${file} keeps footer links focused on project information`);
    assert.match(source, />Contact</, `${file} keeps contact information reachable`);
    assert.match(source, /mailto:contact@chemvault\.science/, `${file} keeps the project email reachable`);
  }

  assert.match(styles, /body\s*{[\s\S]*position:\s*relative/, "page body creates a root layer for the reveal footer");
  assert.match(styles, /body\s*{[\s\S]*isolation:\s*isolate/, "page body isolates the reveal stacking context");
  assert.match(styles, /main\s*{[\s\S]*position:\s*relative[\s\S]*z-index:\s*2[\s\S]*background:\s*var\(--bg\)/, "main content stays above the fixed footer layer until it is revealed");
  assert.match(styles, /--footer-height:\s*720px/, "footer exposes the template height token");
  assert.match(styles, /\.site-footer[\s\S]*clip-path:\s*polygon\(0 0, 100% 0, 100% 100%, 0 100%\)/, "footer clips the fixed layer like the template");
  assert.match(styles, /\.site-footer[\s\S]*z-index:\s*0/, "footer itself sits behind page content for the reveal effect");
  assert.match(styles, /\.footer-sticky-layer[\s\S]*position:\s*fixed/, "footer layer is fixed to the bottom");
  assert.match(styles, /\.footer-sticky-layer[\s\S]*inset:\s*auto 0 0/, "footer layer is pinned to the viewport bottom like the template");
  assert.match(styles, /\.footer-sticky-layer[\s\S]*z-index:\s*0/, "footer fixed layer stays under the page content");
  assert.match(styles, /\.footer-sticky-shell[\s\S]*position:\s*sticky/, "footer inner shell uses sticky positioning");
  assert.match(styles, /\.footer-sticky-shell[\s\S]*height:\s*var\(--footer-height\)/, "sticky shell preserves the template reveal height");
  assert.match(styles, /html\.motion-available body\.page-ready \.site-footer\s*{[\s\S]*transform:\s*none/, "page enter animation does not create a fixed-position containing block around the footer");
  assert.match(styles, /\.site-version\s*{[\s\S]*position:\s*relative[\s\S]*z-index:\s*2/, "version strip remains above the revealed footer layer");

  for (const file of ["404.html", ...pageFiles]) {
    const html = read(file);
    assert.match(html, /styles\.css\?v=20260619b/, `${file} references sticky footer styles`);
    if (file !== "index.html") {
      assert.match(html, /site-shell\.js\?v=20260618d/, `${file} references sticky footer shell markup`);
    }
  }
});

test("site navigation uses a ChemVault tubelight tab treatment", () => {
  const styles = read("assets/styles.css");

  for (const file of bootHtmlFiles) {
    const html = read(file);
    const nav = navMarkup(html);

    assert.match(nav, /<details class="nav-more"/, `${file} keeps secondary pages in the tubelight More menu`);
    assert.match(html, /styles\.css\?v=20260619b/, `${file} references tubelight navigation styles`);
  }

  assert.match(styles, /\.site-nav\s*{[\s\S]*border-radius:\s*999px/, "navigation container is a rounded tubelight rail");
  assert.match(styles, /\.site-nav\s*{[\s\S]*backdrop-filter:\s*blur\(18px\)/, "navigation rail uses translucent glass");
  assert.match(styles, /\.site-nav a,\s*\n\.nav-more > summary\s*{[\s\S]*border-radius:\s*999px/, "navigation items are rounded tabs");
  assert.match(styles, /\.site-nav a::after,\s*\n\.nav-more > summary::after\s*{[\s\S]*top:\s*-6px/, "navigation tabs draw the top lamp");
  assert.match(styles, /\.site-nav a\[aria-current\],\s*\n\.nav-more > summary\[aria-current\][\s\S]*box-shadow:[\s\S]*rgba\(0, 113, 227, 0\.18\)/, "current page tab has a ChemVault blue glow");
});
