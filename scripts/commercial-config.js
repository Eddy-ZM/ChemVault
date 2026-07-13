(function () {
  const planOrder = {
    anonymous: 0,
    free: 1,
    pro: 2,
    team: 3,
    enterprise: 4,
    admin: 5
  };

  const productModules = [
    {
      id: "main",
      name: "Home",
      description: "Brand, platform overview, research entry points, and commercial landing pages.",
      route: "/index.html",
      status: "active",
      accessLevel: "free",
      icon: "home",
      category: "overview",
      ctaLabel: "Open home"
    },
    {
      id: "compound_search",
      name: "Compound Search",
      description: "Search, save, and export compound information.",
      route: "/pages/search.html",
      status: "active",
      accessLevel: "free",
      icon: "search",
      category: "research",
      ctaLabel: "Search compounds"
    },
    {
      id: "file_library",
      name: "Research File Library",
      description: "Organize research files, papers, reports, and project assets.",
      route: "/pages/file-library.html",
      status: "beta",
      accessLevel: "free",
      icon: "folder",
      category: "operations",
      ctaLabel: "Open library"
    },
    {
      id: "documentation",
      name: "Professional Documentation",
      description: "Access the unified ChemVault manuals, professional guides, and workflows.",
      route: "https://docs.chemvault.science/",
      status: "active",
      accessLevel: "free",
      icon: "book",
      category: "operations",
      ctaLabel: "Open docs"
    },
    {
      id: "molecular_modeling",
      name: "Molecular Modeling",
      description: "Visualize and model molecules for research workflows.",
      route: "/pages/molecular-modeling.html",
      status: "beta",
      accessLevel: "free",
      icon: "molecule",
      category: "research",
      ctaLabel: "Open modeling"
    },
    {
      id: "mail",
      name: "Mail",
      description: "Manage professional research communication and notifications.",
      route: "/pages/mail.html",
      status: "beta",
      accessLevel: "free",
      icon: "mail",
      category: "operations",
      ctaLabel: "Open mail"
    },
    {
      id: "ai_paper_search",
      name: "AI Paper Search",
      description: "Search, summarize, tag, and organize academic papers with AI.",
      route: "/pages/ai-paper-search.html",
      status: "beta",
      accessLevel: "free",
      icon: "spark",
      category: "research",
      ctaLabel: "Join beta"
    },
    {
      id: "team_workspace",
      name: "Team/Lab Workspace",
      description: "Preview shared lab workspace controls in the ChemVault dashboard.",
      route: "/pages/dashboard.html#team-workspace",
      status: "active",
      accessLevel: "free",
      icon: "team",
      category: "team",
      ctaLabel: "Preview workspace"
    }
  ];

  const plans = [
    {
      id: "free",
      name: "Free",
      subtitle: "For visitors, students, light users, and trial workflows.",
      priceMonthly: "£0",
      priceYearly: "£0",
      ctaLabel: "Start free",
      ctaHref: "/pages/dashboard.html",
      highlight: false,
      features: [
        "Public website access",
        "Basic compound search",
        "Limited search history",
        "Limited file library usage",
        "Public documentation",
        "Basic molecule viewer preview",
        "AI paper search preview",
        "Newsletter subscription"
      ]
    },
    {
      id: "pro",
      name: "Pro",
      subtitle: "For individual researchers, chemistry students, professional users, and consultants.",
      priceMonthly: "£12/month",
      priceYearly: "£99/year",
      ctaLabel: "Upgrade to Pro",
      checkout: true,
      highlight: true,
      features: [
        "Advanced compound search",
        "Saved searches and search history",
        "CSV/PDF export placeholders",
        "Higher file storage quota",
        "Premium guides and workflows",
        "20 cloud quantum jobs per day",
        "AI paper summaries, tags, and collections",
        "Weekly research and paper briefs"
      ]
    },
    {
      id: "team",
      name: "Team/Lab",
      subtitle: "For research groups, labs, university teams, startups, and small companies.",
      priceMonthly: "From £49/month",
      priceYearly: "From £499/year",
      ctaLabel: "Start Team Plan",
      checkout: true,
      highlight: false,
      features: [
        "Everything in Pro",
        "Multiple seats",
        "Shared team workspace",
        "Shared file library",
        "Shared compounds and projects",
        "200 cloud quantum jobs per day during Team pilots",
        "Team paper collections",
        "Basic admin controls and invoice support"
      ]
    },
    {
      id: "enterprise",
      name: "Enterprise/Institution",
      subtitle: "For companies, universities, research institutions, large labs, and organizations.",
      priceMonthly: "Custom",
      priceYearly: "From £999/year",
      ctaLabel: "Contact Sales",
      contact: true,
      highlight: false,
      features: [
        "Everything in Team/Lab",
        "Custom onboarding",
        "Custom data integrations",
        "Advanced security options",
        "SSO/SAML placeholder",
        "API access placeholder",
        "Custom quotas and reports",
        "Procurement and dedicated support"
      ]
    }
  ];

  const features = {
    "compound.search.basic": { minPlan: "anonymous", label: "Basic compound search", limits: { free: 25, pro: 500, team: 2000, enterprise: null } },
    "compound.search.advanced": { minPlan: "pro", label: "Advanced compound filters" },
    "compound.search.saved": { minPlan: "pro", label: "Saved compound searches", limits: { free: 0, pro: 100, team: 1000, enterprise: null } },
    "compound.search.export": { minPlan: "pro", label: "Compound export" },
    "compound.search.batch": { minPlan: "pro", label: "Batch compound search" },
    "file_library.basic": { minPlan: "free", label: "Basic file library", limits: { free: 100, pro: 10000, team: 100000, enterprise: null }, unit: "MB" },
    "file_library.advanced": { minPlan: "pro", label: "Advanced file organization" },
    "file_library.storage.pro": { minPlan: "pro", label: "Pro file storage", limits: { free: 100, pro: 10000, team: 100000, enterprise: null }, unit: "MB" },
    "file_library.team_workspace": { minPlan: "team", label: "Shared file workspace" },
    "docs.public": { minPlan: "anonymous", label: "Public documentation" },
    "docs.premium": { minPlan: "pro", label: "Premium professional guides" },
    "modeling.viewer": { minPlan: "free", label: "Molecule viewer and public lookups" },
    "modeling.advanced": { minPlan: "free", label: "Local molecular modeling" },
    "modeling.export": { minPlan: "free", label: "Local modeling export" },
    "modeling.cloud_quantum": { minPlan: "pro", label: "Cloud quantum calculation", limits: { free: 0, pro: 20, team: 200, enterprise: 1000 }, unit: "jobs/day" },
    "modeling.high_quota": { minPlan: "team", label: "High modeling quota" },
    "mail.basic": { minPlan: "free", label: "Basic mail and notifications" },
    "mail.templates": { minPlan: "pro", label: "Mail templates" },
    "mail.automation": { minPlan: "team", label: "Mail workflow automation" },
    "papers.search.preview": { minPlan: "free", label: "AI paper search preview", limits: { free: 5, pro: 200, team: 1000, enterprise: null } },
    "papers.search.full": { minPlan: "pro", label: "Full AI paper search" },
    "papers.ai_summary": { minPlan: "pro", label: "AI paper summaries" },
    "papers.collections": { minPlan: "pro", label: "Paper collections" },
    "papers.export": { minPlan: "pro", label: "Paper export" },
    "team.members": { minPlan: "team", label: "Team members" },
    "team.shared_workspace": { minPlan: "team", label: "Shared team workspace" },
    "enterprise.api": { minPlan: "enterprise", label: "API access placeholder" },
    "enterprise.sso": { minPlan: "enterprise", label: "SSO/SAML placeholder" },
    "enterprise.custom_onboarding": { minPlan: "enterprise", label: "Custom onboarding" }
  };

  const comparisonRows = [
    ["Compound search", "Basic", "Advanced", "Advanced + shared", "Custom"],
    ["Saved searches", "Limited history", "Included", "Shared history", "Custom retention"],
    ["Export", "No", "CSV/PDF placeholder", "Team exports", "Custom exports/API"],
    ["File storage", "100 MB", "10 GB", "100 GB shared", "Custom"],
    ["Premium documentation", "Public docs", "Professional guides", "Team workflows", "Institution guides"],
    ["Molecular modeling", "Viewer, local engines and export", "Free tools + 20 cloud jobs/day", "Free tools + 200 cloud jobs/day", "Managed quota"],
    ["AI paper search", "Preview", "Full search", "Shared collections", "Institution access"],
    ["AI paper summaries", "No", "Included", "Included", "Custom workflows"],
    ["Team workspace", "No", "No", "Included", "Custom"],
    ["Shared file library", "No", "No", "Included", "Custom"],
    ["Team seats", "1", "1", "Multiple seats", "Custom"],
    ["Enterprise onboarding", "No", "No", "No", "Included"],
    ["API access placeholder", "No", "No", "No", "Planned"],
    ["Invoice support", "No", "Annual only", "Included", "Procurement support"]
  ];

  function normalisePlan(value) {
    return Object.prototype.hasOwnProperty.call(planOrder, value) ? value : "free";
  }

  function getUserPlan(user) {
    if (user && typeof user === "object" && user.plan) return normalisePlan(user.plan);
    // TODO: Replace local preview state with the authenticated ChemVault User plan.
    try {
      return normalisePlan(localStorage.getItem("chemvault-plan-preview") || "free");
    } catch {
      return "free";
    }
  }

  function hasPlan(user, plan) {
    return planOrder[getUserPlan(user)] >= planOrder[normalisePlan(plan)];
  }

  function hasFeatureAccess(user, featureKey) {
    const feature = features[featureKey];
    if (!feature) return false;
    return hasPlan(user, feature.minPlan);
  }

  function requireFeatureAccess(user, featureKey) {
    if (hasFeatureAccess(user, featureKey)) return true;
    const feature = features[featureKey];
    const error = new Error(feature ? `${feature.label} requires ${feature.minPlan} plan or above.` : "Unknown feature.");
    error.code = "FEATURE_ACCESS_DENIED";
    error.featureKey = featureKey;
    error.requiredPlan = feature?.minPlan || "pro";
    throw error;
  }

  function getFeatureLimit(user, featureKey) {
    const feature = features[featureKey];
    if (!feature?.limits) return null;
    const plan = getUserPlan(user);
    if (plan === "admin") return null;
    if (Object.prototype.hasOwnProperty.call(feature.limits, plan)) return feature.limits[plan];
    const fallbackPlan = Object.keys(planOrder).reverse().find((candidate) => (
      planOrder[candidate] <= planOrder[plan] && Object.prototype.hasOwnProperty.call(feature.limits, candidate)
    ));
    return fallbackPlan ? feature.limits[fallbackPlan] : null;
  }

  function isProOrAbove(user) {
    return hasPlan(user, "pro");
  }

  function isTeamOrAbove(user) {
    return hasPlan(user, "team");
  }

  function isEnterpriseOrAdmin(user) {
    const plan = getUserPlan(user);
    return plan === "enterprise" || plan === "admin";
  }

  function usageKey(user, featureKey) {
    const plan = getUserPlan(user);
    const id = user?.id || "local";
    const day = new Date().toISOString().slice(0, 10);
    return `chemvault-usage:${id}:${plan}:${featureKey}:${day}`;
  }

  function getUsageLimit(plan, featureKey) {
    return getFeatureLimit({ plan: normalisePlan(plan) }, featureKey);
  }

  function getCurrentUsage(user, featureKey) {
    try {
      return Number(localStorage.getItem(usageKey(user, featureKey)) || 0);
    } catch {
      return 0;
    }
  }

  function hasUsageRemaining(user, featureKey) {
    const limit = getFeatureLimit(user, featureKey);
    if (limit === null || limit === undefined) return true;
    return getCurrentUsage(user, featureKey) < limit;
  }

  function recordUsage(user, featureKey, amount = 1) {
    try {
      const key = usageKey(user, featureKey);
      const next = getCurrentUsage(user, featureKey) + Number(amount || 1);
      localStorage.setItem(key, String(next));
      return next;
    } catch {
      return 0;
    }
  }

  function setPreviewPlan(plan) {
    const value = normalisePlan(plan);
    try {
      localStorage.setItem("chemvault-plan-preview", value);
    } catch {
      return value;
    }
    window.dispatchEvent(new CustomEvent("chemvault:planchange", { detail: { plan: value } }));
    return value;
  }

  function trackEvent(name, properties = {}) {
    window.CHEMVAULT_ANALYTICS_EVENTS = window.CHEMVAULT_ANALYTICS_EVENTS || [];
    window.CHEMVAULT_ANALYTICS_EVENTS.push({
      name,
      properties,
      at: new Date().toISOString()
    });
  }

  async function createCheckoutSession(planId, billingInterval = "monthly") {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId, billingInterval })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || payload.code || "Checkout is not available yet.");
    return payload;
  }

  async function createBillingPortalSession(userId) {
    const response = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || payload.code || "Billing portal is not available yet.");
    return payload;
  }

  window.CHEMVAULT_COMMERCIAL = {
    planOrder,
    plans,
    productModules,
    modules: productModules,
    features,
    comparisonRows,
    getUserPlan,
    hasPlan,
    hasFeatureAccess,
    requireFeatureAccess,
    getFeatureLimit,
    isProOrAbove,
    isTeamOrAbove,
    isEnterpriseOrAdmin,
    getUsageLimit,
    getCurrentUsage,
    hasUsageRemaining,
    recordUsage,
    setPreviewPlan,
    trackEvent,
    createCheckoutSession,
    createBillingPortalSession
  };
}());
