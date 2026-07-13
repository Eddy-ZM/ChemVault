import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assertIncludes(file, patterns) {
  const html = read(file);
  for (const [pattern, message] of patterns) {
    assert.match(html, pattern, `${file} ${message}`);
  }
}

test("commercial pages expose honest beta access and workflow surfaces", () => {
  assertIncludes("pages/pricing.html", [
    [/Free/i, "mentions Free"],
    [/Pro/i, "mentions Pro"],
    [/Team\/Lab/i, "mentions Team/Lab"],
    [/Enterprise/i, "mentions Enterprise"],
    [/private beta/i, "states the private beta availability"],
    [/No public checkout/i, "states that checkout is unavailable"],
    [/data-lead-form data-lead-type="enterprise"/, "contains enterprise lead form"],
    [/data-lead-form data-lead-type="ai_beta"/, "contains AI beta lead form"]
  ]);
  assert.doesNotMatch(read("pages/pricing.html"), /data-render="pricing-cards"/, "pricing does not render unavailable checkout plans");

  assertIncludes("pages/dashboard.html", [
    [/Current plan/i, "shows current plan"],
    [/data-render="dashboard"/, "renders dashboard blocks from shared UI"],
    [/usage|quota/i, "contains usage or quota language"],
    [/data-render="app-modules"/, "contains module entry renderer"]
  ]);

  assertIncludes("pages/ai-paper-search.html", [
    [/AI Paper Search/i, "names AI Paper Search"],
    [/beta/i, "shows beta state"],
    [/early access/i, "contains early access copy"],
    [/not currently sold/i, "states that unfinished AI workflows are not paid entitlements"]
  ]);
  assert.doesNotMatch(read("pages/ai-paper-search.html"), /data-feature-key="papers\.|Pro workflow|Team\/Lab unlocks/i, "AI discovery page does not sell unfinished workflows");

  assertIncludes("pages/file-library.html", [
    [/Research File Library/i, "names the file library"],
    [/quota/i, "shows quota language"],
    [/https:\/\/file\.chemvault\.science\//, "links to the real Files service"],
    [/private-by-default/i, "describes the real Files security boundary"]
  ]);

  assertIncludes("pages/docs.html", [
    [/Professional Documentation/i, "names documentation module"],
    [/public documentation/i, "contains public docs language"],
    [/https:\/\/docs\.chemvault\.science\//, "links to the canonical Docs site"],
    [/account and safety/i, "covers account and safety guidance"]
  ]);

  assertIncludes("pages/molecular-modeling.html", [
    [/Molecular Modeling/i, "names molecular modeling"],
    [/viewer/i, "contains viewer language"],
    [/local engines/i, "separates local engine capability"],
    [/data-feature-key="modeling\.cloud_quantum"/, "gates optional cloud quantum capacity"],
    [/20 cloud quantum jobs per day/i, "publishes the Pro daily cloud allowance"]
  ]);
  assert.doesNotMatch(read("pages/molecular-modeling.html"), /backend exists|No scientific output is generated|data-feature-key="modeling\.advanced"/i, "modeling page does not describe shipped local functionality as an unavailable placeholder");

  assertIncludes("pages/mail.html", [
    [/Mail/i, "names mail module"],
    [/workflow/i, "contains workflow language"],
    [/https:\/\/mail\.chemvault\.science\//, "links to the real Mail service"],
    [/app passwords/i, "describes supported client credentials"]
  ]);
  for (const page of ["pages/file-library.html", "pages/docs.html", "pages/mail.html"]) {
    assert.doesNotMatch(read(page), /Basic file list placeholder|Prototype mode|after .* is connected/i, `${page} does not market a simulated product surface`);
  }
});

test("compound search keeps free search without selling unshipped export controls", () => {
  const html = read("pages/search.html");

  assert.match(html, /id="academicSearchForm"/, "search page keeps the basic search form");
  assert.match(html, /id="academicSearch"/, "search page keeps the basic search input");
  assert.match(html, /Search boundary/, "search page explains the supported boundary");
  assert.doesNotMatch(html, /data-feature-key="compound\.search\.export"|Export results|Save search/, "search page does not sell unshipped export or save actions");
});

test("commercial forms and client logic provide validation and clear states", () => {
  const pricing = read("pages/pricing.html");
  const home = read("index.html");
  const ui = read("scripts/commercial-ui.js");

  for (const html of [pricing, home]) {
    assert.match(html, /type="email"/, "lead forms use email inputs");
    assert.match(html, /name="consent" required/, "lead forms require consent");
    assert.match(html, /data-form-status/, "lead forms expose status regions");
  }

  assert.match(ui, /function isEmail/, "commercial UI validates email format before submission");
  assert.match(ui, /Enter a valid email address/, "commercial UI reports invalid email");
  assert.match(ui, /Consent is required before submitting/, "commercial UI reports missing consent");
  assert.match(ui, /fetch\("\/api\/leads"/, "lead forms submit to the server placeholder route");
  assert.doesNotMatch(ui, /STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|sk_live|sk_test/, "client UI does not embed payment secrets");
});

test("commercial plan scripts use the current cache key on every product entry", () => {
  for (const page of [
    "index.html",
    "pages/ai-paper-search.html",
    "pages/dashboard.html",
    "pages/docs.html",
    "pages/file-library.html",
    "pages/mail.html",
    "pages/molecular-modeling.html",
    "pages/pricing.html",
    "pages/search.html"
  ]) {
    const html = read(page);
    assert.match(html, /commercial-config\.js\?v=20260713a/, `${page} loads the current plan configuration`);
    assert.match(html, /commercial-ui\.js\?v=20260713a/, `${page} loads the authoritative-plan UI`);
    assert.doesNotMatch(html, /commercial-(?:config|ui)\.js\?v=20260705b/, `${page} does not retain the stale browser-plan bundle`);
  }
});

test("home lead forms use compact CTA layout and checkbox-safe controls", () => {
  const home = read("index.html");
  const commercialStyles = read("assets/commercial.css");

  assert.match(home, /class="cv-section cv-lead-section"/, "home renders the updated lead section shell");
  assert.match(home, /cv-lead-panel--newsletter/, "newsletter card gets its own visual treatment");
  assert.match(home, /cv-lead-panel--beta/, "AI beta card gets its own visual treatment");
  assert.match(commercialStyles, /\.cv-lead-panel input:not\(\[type="checkbox"\]\)/, "full-width input styling excludes checkboxes");
  assert.match(commercialStyles, /\.cv-check-row input\[type="checkbox"\][\s\S]*width:\s*18px/, "checkboxes keep compact consent-row dimensions");
});

test("home modules use real service routes and keep Team workspace pilot-only", () => {
  const home = read("index.html");
  const config = read("scripts/commercial-config.js");
  const ui = read("scripts/commercial-ui.js");
  const commercialStyles = read("assets/commercial.css");

  assert.match(home, /data-render="app-modules" data-module-layout="categorized"/, "home asks the shared UI to render categorized modules");
  assert.match(home, /Team workspaces are not self-service yet/i, "home publishes the Team pilot boundary");
  assert.doesNotMatch(home, /pages\/dashboard\.html#team-workspace|Preview Teams/, "home does not expose a simulated Team workspace");
  assert.doesNotMatch(config, /id:\s*"team_workspace"/, "commercial config does not expose an unimplemented Team module");
  assert.match(config, /route:\s*"https:\/\/file\.chemvault\.science\/"/, "commercial config opens the real Files service");
  assert.match(config, /route:\s*"https:\/\/mail\.chemvault\.science\/"/, "commercial config opens the real Mail service");
  assert.match(config, /category:\s*"operations"/, "service modules remain grouped under operations");
  assert.match(ui, /function moduleCategoryMarkup/, "commercial UI renders module category disclosures");
  assert.match(ui, /data-module-categories/, "categorized module markup exposes an interactive accordion root");
  assert.doesNotMatch(ui, /function teamWorkspaceMarkup/, "dashboard removes the simulated Teams implementation");
  assert.doesNotMatch(ui, /id="team-workspace"|Shared ChemVault workspace enabled/, "dashboard does not fabricate Team workspace state");
  assert.match(ui, /fetch\("\/api\/entitlements"/, "commercial UI hydrates plan state from the server");
  assert.match(ui, /browser cannot promote itself to a paid plan/i, "dashboard explains the authoritative plan boundary");
  assert.match(commercialStyles, /\.cv-module-category::details-content[\s\S]*block-size:\s*0/, "module category disclosures animate their expanded height");
  assert.match(commercialStyles, /\.cv-app-switcher\[open\] \.cv-app-switcher__menu[\s\S]*opacity:\s*1/, "app switcher menu fades into view when expanded");
});

test("commercial schema, env docs and implementation remain aligned", () => {
  const schema = read("schema.sql");
  const envExample = read(".env.example");
  const envDocs = read("ENVIRONMENT_VARIABLES.md");
  const commercialDocs = read("docs/commercial-mvp.md");
  const deploymentChecklist = read("docs/deployment-checklist.md");
  const stagingDocs = read("docs/staging-deployment.md");
  const readme = read("README.md");

  for (const table of ["leads", "newsletter_subscribers", "organizations", "memberships", "subscriptions", "feature_entitlements", "usage_records", "resources"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`), `schema defines ${table}`);
    assert.match(commercialDocs, new RegExp(table), `commercial docs mention ${table}`);
  }

  for (const variable of [
    "ENVIRONMENT",
    "COMMERCIAL_MODE",
    "ENABLE_MOCK_BILLING",
    "ENABLE_MOCK_AUTH",
    "PAYMENT_PROVIDER",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_MONTHLY_PRICE_ID",
    "STRIPE_PRO_YEARLY_PRICE_ID",
    "STRIPE_TEAM_MONTHLY_PRICE_ID",
    "STRIPE_TEAM_YEARLY_PRICE_ID",
    "PUBLIC_APP_URL",
    "ENTERPRISE_LEAD_EMAIL",
    "NEWSLETTER_PROVIDER",
    "RESEND_API_KEY",
    "LEADS_NOTIFY_TO",
    "LEADS_FROM",
    "LEADS_IP_HASH_SALT",
    "DEFAULT_USER_PLAN"
  ]) {
    assert.match(envExample, new RegExp(`${variable}=`), `.env.example contains ${variable}`);
    assert.match(envDocs, new RegExp(variable), `environment docs contain ${variable}`);
  }
  for (const variable of ["ENVIRONMENT", "COMMERCIAL_MODE", "ENABLE_MOCK_BILLING", "ENABLE_MOCK_AUTH", "PAYMENT_PROVIDER", "ENABLE_PUBLIC_CHECKOUT", "ENABLE_TEAM_CHECKOUT", "BILLING_SERVICE_SECRET"]) {
    assert.match(commercialDocs, new RegExp(variable), `commercial runbook contains critical control ${variable}`);
  }

  assert.match(deploymentChecklist, /ENVIRONMENT=production/, "deployment checklist covers production environment guard");
  assert.match(deploymentChecklist, /ENVIRONMENT=staging/, "deployment checklist covers staging environment guard");
  assert.match(deploymentChecklist, /ENABLE_MOCK_BILLING=false/, "deployment checklist disables production mock billing");
  assert.match(deploymentChecklist, /ENABLE_MOCK_BILLING=true/, "deployment checklist documents staging mock billing");
  assert.match(deploymentChecklist, /npx wrangler d1 execute chemvault-dev --local --file=schema\.sql/, "deployment checklist documents local D1 schema application");
  assert.match(deploymentChecklist, /npx wrangler d1 execute chemvault-staging --remote --file=schema\.sql/, "deployment checklist documents staging D1 schema application");
  assert.match(deploymentChecklist, /npx wrangler d1 execute chemvault-production --remote --file=schema\.sql/, "deployment checklist documents production D1 schema application");
  assert.match(deploymentChecklist, /POST \/api\/export\/compound.*HTTP 501/, "deployment checklist documents the unavailable export boundary");
  assert.match(deploymentChecklist, /migrations\/0003_leads_email_notifications\.sql/, "deployment checklist includes the leads email migration");
  assert.match(deploymentChecklist, /GET \/api\/admin\/leads/, "deployment checklist covers protected lead admin smoke checks");
  assert.match(stagingDocs, /pages_build_output_dir|Static build output:\s*`dist`/, "staging docs identify the Pages build output");
  assert.match(stagingDocs, /D1 binding name used by code:\s*`DB`/, "staging docs preserve the DB binding contract");
  for (const database of ["chemvault-dev", "chemvault-staging", "chemvault-production"]) {
    assert.match(stagingDocs, new RegExp(database), `staging docs mention ${database}`);
  }
  for (const route of [
    "/pages/pricing",
    "/pages/dashboard",
    "/pages/search",
    "/pages/ai-paper-search",
    "/pages/file-library",
    "/pages/docs",
    "/pages/molecular-modeling",
    "/pages/mail",
    "/404.html",
    "/api/health",
    "/api/entitlements",
    "/api/leads",
    "/api/newsletter/unsubscribe",
    "/api/billing/checkout",
    "/api/billing/portal",
    "/api/export/compound"
  ]) {
    assert.match(stagingDocs, new RegExp(route.replaceAll("/", "\\/")), `staging docs include manual check for ${route}`);
  }
  assert.match(stagingDocs, /payment_not_configured/, "staging docs document production payment guard");
  assert.match(stagingDocs, /placeholder_checkout/, "staging docs document staging billing placeholder");
  assert.match(commercialDocs, /Stripe integration in source includes/i, "commercial docs describe the implemented billing path");
  assert.match(commercialDocs, /signed webhook processing/i, "commercial docs record webhook verification");
  assert.match(commercialDocs, /Public checkout remains disabled/i, "commercial docs preserve the paid-launch boundary");
  assert.match(commercialDocs, /compound export is not sold/i, "commercial docs do not sell the unavailable export route");
  assert.match(readme, /Public checkout remains disabled/i, "README states the current commercial availability boundary");
  assert.match(readme, /local engines.*do not consume ChemVault cloud quota/is, "README separates local tools from paid cloud capacity");
  assert.doesNotMatch(readme, /npm run|deployment-checklist\.md|Commercial MVP Foundation/, "README remains product-facing rather than implementation-facing");
  assert.doesNotMatch(envExample, /sk_live_|sk_test_|whsec_[A-Za-z0-9]/, ".env.example contains no real payment secret");
});
