import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

function loadCommercialConfig(plan = "free") {
  const storage = new Map([["chemvault-plan-preview", plan]]);
  const context = {
    window: {
      dispatchEvent() {}
    },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      }
    },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    console
  };
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("scripts/commercial-config.js", "utf8"), context, {
    filename: "scripts/commercial-config.js"
  });
  return context.window.CHEMVAULT_COMMERCIAL;
}

test("commercial config exposes the expected plans, modules and feature keys", () => {
  const config = loadCommercialConfig();

  for (const plan of ["anonymous", "free", "pro", "team", "enterprise", "admin"]) {
    assert.equal(typeof config.planOrder[plan], "number", `planOrder includes ${plan}`);
  }

  assert.deepEqual(
    Array.from(config.plans, (plan) => plan.id),
    ["free", "pro", "team", "enterprise"],
    "public pricing plans are exposed in display order"
  );

  for (const moduleId of ["main", "compound_search", "file_library", "documentation", "molecular_modeling", "mail", "ai_paper_search", "team_workspace"]) {
    assert(config.modules.some((module) => module.id === moduleId), `module config includes ${moduleId}`);
  }

  assert.equal(config.modules.find((module) => module.id === "team_workspace")?.category, "team", "Team/Lab Workspace is grouped under team");
  assert.equal(config.modules.find((module) => module.id === "team_workspace")?.route, "/pages/dashboard.html#team-workspace", "Team/Lab Workspace routes to the dashboard workspace preview");
  assert.equal(config.modules.find((module) => module.id === "documentation")?.route, "https://docs.chemvault.science/", "Documentation module links to the unified Docs site");

  for (const featureKey of [
    "compound.search.basic",
    "compound.search.export",
    "file_library.basic",
    "docs.premium",
    "modeling.viewer",
    "papers.search.preview",
    "papers.ai_summary",
    "team.shared_workspace",
    "enterprise.api"
  ]) {
    assert(config.features[featureKey], `feature config includes ${featureKey}`);
  }
});

test("commercial entitlement helpers enforce plan order", () => {
  const config = loadCommercialConfig("free");

  assert.equal(config.hasFeatureAccess({ plan: "free" }, "compound.search.basic"), true, "Free can use basic compound search");
  assert.equal(config.hasFeatureAccess({ plan: "free" }, "compound.search.export"), false, "Free cannot export compound search results");
  assert.equal(config.hasFeatureAccess({ plan: "pro" }, "compound.search.export"), true, "Pro can use Pro export");
  assert.equal(config.hasFeatureAccess({ plan: "team" }, "team.shared_workspace"), true, "Team can use shared workspaces");
  assert.equal(config.hasFeatureAccess({ plan: "enterprise" }, "enterprise.api"), true, "Enterprise can use enterprise API placeholder");
  assert.equal(config.hasFeatureAccess({ plan: "admin" }, "enterprise.api"), true, "Admin can use enterprise-level placeholders");

  assert.equal(config.isProOrAbove({ plan: "pro" }), true);
  assert.equal(config.isProOrAbove({ plan: "free" }), false);
  assert.equal(config.isTeamOrAbove({ plan: "team" }), true);
  assert.equal(config.isEnterpriseOrAdmin({ plan: "enterprise" }), true);
  assert.equal(config.isEnterpriseOrAdmin({ plan: "admin" }), true);
  assert.throws(
    () => config.requireFeatureAccess({ plan: "free" }, "compound.search.export"),
    /requires pro plan or above/,
    "requireFeatureAccess throws for insufficient plans"
  );
});

test("commercial usage helpers expose plan-aware limits", () => {
  const config = loadCommercialConfig();

  assert.equal(config.getFeatureLimit({ plan: "free" }, "compound.search.basic"), 25);
  assert.equal(config.getFeatureLimit({ plan: "pro" }, "compound.search.basic"), 500);
  assert.equal(config.getFeatureLimit({ plan: "team" }, "file_library.storage.pro"), 100000);
  assert.equal(config.getFeatureLimit({ plan: "enterprise" }, "papers.search.preview"), null);
  assert.equal(config.hasUsageRemaining({ plan: "free" }, "compound.search.basic"), true);
});
