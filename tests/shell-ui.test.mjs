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

test("updated shell assets use a fresh cache key", () => {
  const staleAssetPattern = /(styles\.css|portal\.css|home\.js|site-shell\.js|search-page\.js)\?v=20260603a/;

  for (const file of pageFiles) {
    assert.doesNotMatch(read(file), staleAssetPattern, `${file} does not pin changed shell assets to the previous cache key`);
  }
});

test("startup welcome is wired through the shared motion layer", () => {
  const script = read("scripts/motion.js");
  const styles = read("assets/styles.css");

  assert.match(script, /function wireStartupWelcome/, "motion layer owns startup welcome wiring");
  assert.match(script, /startup-welcome/, "motion layer injects the startup welcome overlay");
  assert.match(script, /chemvault-gooey-threshold/, "startup welcome includes the gooey SVG threshold filter");
  assert.match(script, /data-welcome-action="enter"/, "startup welcome exposes an enter button");
  assert.match(script, /startGooeyTextMorph/, "startup welcome starts the gooey text morph animation");

  assert.match(styles, /\.startup-welcome\b/, "stylesheet defines startup welcome overlay styles");
  assert.match(styles, /\.startup-welcome__gooey/, "stylesheet defines gooey text layout styles");
  assert.match(styles, /\.startup-welcome__enter/, "stylesheet defines the enter button styles");
});

test("startup welcome assets use a fresh cache key on every HTML entry", () => {
  for (const file of bootHtmlFiles) {
    const html = read(file);

    assert.match(html, /styles\.css\?v=20260618b/, `${file} references startup welcome styles`);
    assert.match(html, /motion\.js\?v=20260618b/, `${file} references startup welcome motion`);
  }
});
