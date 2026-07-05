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

test("commercial MVP pages expose expected plan and workflow surfaces", () => {
  assertIncludes("pages/pricing.html", [
    [/Free/i, "mentions Free"],
    [/Pro/i, "mentions Pro"],
    [/Team\/Lab/i, "mentions Team/Lab"],
    [/Enterprise/i, "mentions Enterprise"],
    [/data-render="pricing-cards"/, "renders plan cards from shared config"],
    [/Contact Sales/i, "contains Contact Sales CTA"],
    [/data-lead-form data-lead-type="enterprise"/, "contains enterprise lead form"],
    [/data-lead-form data-lead-type="ai_beta"/, "contains AI beta lead form"]
  ]);

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
    [/data-feature-key="papers\.ai_summary"/, "gates Pro paper summaries"]
  ]);

  assertIncludes("pages/file-library.html", [
    [/Research File Library/i, "names the file library"],
    [/quota/i, "shows quota language"],
    [/premium/i, "contains premium workflow language"],
    [/data-feature-key="file_library\.advanced"/, "gates advanced file organization"]
  ]);

  assertIncludes("pages/docs.html", [
    [/Professional Documentation/i, "names documentation module"],
    [/public documentation/i, "contains public docs language"],
    [/premium/i, "contains premium docs language"],
    [/data-feature-key="docs\.premium"/, "gates premium guides"]
  ]);

  assertIncludes("pages/molecular-modeling.html", [
    [/Molecular Modeling/i, "names molecular modeling"],
    [/viewer/i, "contains viewer language"],
    [/premium/i, "contains premium modeling language"],
    [/data-feature-key="modeling\.advanced"/, "gates advanced modeling"]
  ]);

  assertIncludes("pages/mail.html", [
    [/Mail/i, "names mail module"],
    [/workflow/i, "contains workflow language"],
    [/templates/i, "contains template language"],
    [/data-feature-key="mail\.templates"/, "gates mail templates"]
  ]);
});

test("compound search keeps free search while adding Pro gates", () => {
  const html = read("pages/search.html");

  assert.match(html, /id="academicSearchForm"/, "search page keeps the basic search form");
  assert.match(html, /id="academicSearch"/, "search page keeps the basic search input");
  assert.match(html, /data-feature-key="compound\.search\.export"/, "search page adds a Pro export gate");
  assert.match(html, /Export results/, "search page exposes export action inside the gated workflow");
  assert.match(html, /Save search/, "search page exposes saved-search action inside the gated workflow");
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

test("home lead forms use compact CTA layout and checkbox-safe controls", () => {
  const home = read("index.html");
  const commercialStyles = read("assets/commercial.css");

  assert.match(home, /class="cv-section cv-lead-section"/, "home renders the updated lead section shell");
  assert.match(home, /cv-lead-panel--newsletter/, "newsletter card gets its own visual treatment");
  assert.match(home, /cv-lead-panel--beta/, "AI beta card gets its own visual treatment");
  assert.match(commercialStyles, /\.cv-lead-panel input:not\(\[type="checkbox"\]\)/, "full-width input styling excludes checkboxes");
  assert.match(commercialStyles, /\.cv-check-row input\[type="checkbox"\][\s\S]*width:\s*18px/, "checkboxes keep compact consent-row dimensions");
});

test("home modules are categorized and Team workspace is visible", () => {
  const home = read("index.html");
  const config = read("scripts/commercial-config.js");
  const ui = read("scripts/commercial-ui.js");
  const commercialStyles = read("assets/commercial.css");

  assert.match(home, /data-render="app-modules" data-module-layout="categorized"/, "home asks the shared UI to render categorized modules");
  assert.match(home, /pages\/dashboard\.html#team-workspace/, "home Teams CTA links to the workspace preview instead of the people page");
  assert.match(config, /id:\s*"team_workspace"/, "commercial config exposes the Team/Lab Workspace module");
  assert.match(config, /route:\s*"\/pages\/dashboard\.html#team-workspace"/, "Team/Lab Workspace module opens the dashboard workspace preview");
  assert.match(config, /category:\s*"team"/, "Team module is assigned to the team category");
  assert.match(ui, /function moduleCategoryMarkup/, "commercial UI renders module category disclosures");
  assert.match(ui, /data-module-categories/, "categorized module markup exposes an interactive accordion root");
  assert.match(ui, /function teamWorkspaceMarkup/, "dashboard restores a visible Teams workspace panel");
  assert.match(ui, /id="team-workspace"/, "dashboard exposes a direct Team/Lab workspace anchor");
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
    assert.match(commercialDocs, new RegExp(variable), `commercial docs contain ${variable}`);
  }

  assert.match(deploymentChecklist, /ENVIRONMENT=production/, "deployment checklist covers production environment guard");
  assert.match(deploymentChecklist, /ENVIRONMENT=staging/, "deployment checklist covers staging environment guard");
  assert.match(deploymentChecklist, /ENABLE_MOCK_BILLING=false/, "deployment checklist disables production mock billing");
  assert.match(deploymentChecklist, /ENABLE_MOCK_BILLING=true/, "deployment checklist documents staging mock billing");
  assert.match(deploymentChecklist, /npx wrangler d1 execute chemvault-dev --local --file=schema\.sql/, "deployment checklist documents local D1 schema application");
  assert.match(deploymentChecklist, /npx wrangler d1 execute chemvault-staging --remote --file=schema\.sql/, "deployment checklist documents staging D1 schema application");
  assert.match(deploymentChecklist, /npx wrangler d1 execute chemvault-production --remote --file=schema\.sql/, "deployment checklist documents production D1 schema application");
  assert.match(deploymentChecklist, /POST \/api\/export\/compound.*HTTP 402/, "deployment checklist verifies export gating");
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
  assert.match(commercialDocs, /placeholder/i, "commercial docs explain payment placeholder state");
  assert.match(commercialDocs, /Replace this placeholder|real user\/session\/subscription lookup|real auth/i, "commercial docs explain auth/subscription TODO");
  assert.match(readme, /deployment-checklist\.md/, "README links deployment checklist");
  assert.match(readme, /Commercial MVP Foundation/, "README links commercial MVP scope");
  assert.doesNotMatch(envExample, /sk_live_|sk_test_|whsec_[A-Za-z0-9]/, ".env.example contains no real payment secret");
});
