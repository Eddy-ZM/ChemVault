(function () {
  let authoritativeEntitlements = null;
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
      description: "Search source-backed compound and academic information.",
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
      description: "Organize, preview, share, and review private research files.",
      route: "https://file.chemvault.science/",
      status: "active",
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
      description: "Use the authenticated ChemVault inbox and mail clients.",
      route: "https://mail.chemvault.science/",
      status: "active",
      accessLevel: "free",
      icon: "mail",
      category: "operations",
      ctaLabel: "Open mail"
    },
    {
      id: "ai_paper_search",
      name: "AI Paper Search",
      description: "Join discovery for a source-backed AI literature workflow.",
      route: "/pages/ai-paper-search.html",
      status: "beta",
      accessLevel: "free",
      icon: "spark",
      category: "research",
      ctaLabel: "Join beta"
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
        "AI Paper Search early-access waitlist",
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
        "10 GB private file storage",
        "20 cloud quantum jobs per day",
        "Expanded ChemVault Mail recipient allowance",
        "Subscription management through the billing portal"
      ]
    },
    {
      id: "team",
      name: "Team/Lab",
      subtitle: "For research groups, labs, university teams, startups, and small companies.",
      priceMonthly: "From £49/month",
      priceYearly: "From £499/year",
      ctaLabel: "Request Team Pilot",
      contact: true,
      highlight: false,
      features: [
        "Everything in Pro",
        "100 GB storage allocation for approved pilots",
        "200 cloud quantum jobs per day during Team pilots",
        "Higher ChemVault Mail recipient allowance",
        "Pilot onboarding and invoice support"
      ]
    },
    {
      id: "enterprise",
      name: "Enterprise/Institution",
      subtitle: "For companies, universities, research institutions, large labs, and organizations.",
      priceMonthly: "Custom",
      priceYearly: "Custom",
      ctaLabel: "Contact Sales",
      contact: true,
      highlight: false,
      features: [
        "Everything in Team/Lab",
        "Custom onboarding",
        "Custom quotas and reports",
        "Security and integration requirements review",
        "Institution storage and migration planning",
        "Procurement and dedicated support"
      ]
    }
  ];

  const features = {
    "compound.search.basic": { minPlan: "anonymous", label: "Basic compound search", limits: { free: 25, pro: 500, team: 2000, enterprise: null } },
    "compound.search.advanced": { minPlan: "anonymous", label: "Advanced compound filters" },
    "compound.search.saved": { minPlan: "pro", label: "Saved compound searches", availability: "planned", limits: { free: 0, pro: 100, team: 1000, enterprise: null } },
    "compound.search.export": { minPlan: "pro", label: "Compound export", availability: "planned" },
    "compound.search.batch": { minPlan: "pro", label: "Batch compound search", availability: "planned" },
    "file_library.basic": { minPlan: "free", label: "Basic file library", limits: { free: 100, pro: 10000, team: 100000, enterprise: null }, unit: "MB" },
    "file_library.advanced": { minPlan: "free", label: "Advanced file organization" },
    "file_library.storage.pro": { minPlan: "pro", label: "Pro file storage", limits: { free: 100, pro: 10000, team: 100000, enterprise: null }, unit: "MB" },
    "file_library.team_workspace": { minPlan: "team", label: "Shared file workspace", availability: "planned" },
    "docs.public": { minPlan: "anonymous", label: "Public documentation" },
    "docs.premium": { minPlan: "pro", label: "Premium professional guides", availability: "planned" },
    "modeling.viewer": { minPlan: "free", label: "Molecule viewer and public lookups" },
    "modeling.advanced": { minPlan: "free", label: "Local molecular modeling" },
    "modeling.export": { minPlan: "free", label: "Local modeling export" },
    "modeling.cloud_quantum": { minPlan: "pro", label: "Cloud quantum calculation", limits: { free: 0, pro: 20, team: 200, enterprise: 1000 }, unit: "jobs/day" },
    "modeling.high_quota": { minPlan: "team", label: "High modeling quota", availability: "planned" },
    "mail.basic": { minPlan: "free", label: "Basic mail and notifications" },
    "mail.templates": { minPlan: "pro", label: "Mail templates", availability: "planned" },
    "mail.automation": { minPlan: "team", label: "Mail workflow automation", availability: "planned" },
    "papers.search.preview": { minPlan: "free", label: "AI paper search preview", availability: "planned", limits: { free: 5, pro: 200, team: 1000, enterprise: null } },
    "papers.search.full": { minPlan: "pro", label: "Full AI paper search", availability: "planned" },
    "papers.ai_summary": { minPlan: "pro", label: "AI paper summaries", availability: "planned" },
    "papers.collections": { minPlan: "pro", label: "Paper collections", availability: "planned" },
    "papers.export": { minPlan: "pro", label: "Paper export", availability: "planned" },
    "team.members": { minPlan: "team", label: "Team members", availability: "planned" },
    "team.shared_workspace": { minPlan: "team", label: "Shared team workspace", availability: "planned" },
    "enterprise.api": { minPlan: "enterprise", label: "Managed API access", availability: "planned" },
    "enterprise.sso": { minPlan: "enterprise", label: "SSO/SAML", availability: "planned" },
    "enterprise.custom_onboarding": { minPlan: "enterprise", label: "Custom onboarding", availability: "contact" }
  };

  const comparisonRows = [
    ["Compound search and filters", "Included", "Included", "Included", "Requirements review"],
    ["File storage", "100 MB", "10 GB", "100 GB pilot allocation", "Custom"],
    ["Molecular modeling", "Viewer, local engines and export", "Free tools + 20 cloud jobs/day", "Free tools + 200 cloud jobs/day", "Managed quota"],
    ["ChemVault Mail limits", "Standard", "Expanded", "Pilot allocation", "Custom"],
    ["AI paper search", "Early-access preview", "Early-access preview", "Pilot scope", "Requirements review"],
    ["Onboarding", "Self-serve", "Self-serve", "Pilot onboarding", "Custom onboarding"],
    ["Invoice support", "No", "Annual only", "Pilot agreements", "Procurement support"]
  ];

  function normalisePlan(value) {
    return Object.prototype.hasOwnProperty.call(planOrder, value) ? value : "free";
  }

  function getUserPlan(user) {
    if (user && typeof user === "object" && user.plan) return normalisePlan(user.plan);
    if (authoritativeEntitlements) return authoritativeEntitlements.plan;
    return "free";
  }

  function hasPlan(user, plan) {
    return planOrder[getUserPlan(user)] >= planOrder[normalisePlan(plan)];
  }

  function hasFeatureAccess(user, featureKey) {
    const feature = features[featureKey];
    if (!feature || feature.availability === "planned") return false;
    if ((!user || typeof user !== "object") && authoritativeEntitlements) {
      return authoritativeEntitlements.features[featureKey]?.enabled === true;
    }
    return hasPlan(user, feature.minPlan);
  }

  function requireFeatureAccess(user, featureKey) {
    if (hasFeatureAccess(user, featureKey)) return true;
    const feature = features[featureKey];
    const error = new Error(feature?.availability === "planned"
      ? `${feature.label} is planned and is not included in a purchasable plan.`
      : feature
        ? `${feature.label} requires ${feature.minPlan} plan or above.`
        : "Unknown feature.");
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

  function setServerEntitlements(payload, notify = true) {
    const plan = normalisePlan(payload?.plan);
    const featureEntries = payload?.features && typeof payload.features === "object" ? payload.features : {};
    authoritativeEntitlements = {
      plan,
      features: Object.fromEntries(Object.entries(featureEntries).map(([key, value]) => [key, {
        enabled: value?.enabled === true,
        requiredPlan: normalisePlan(value?.requiredPlan)
      }])),
      meta: payload?.meta && typeof payload.meta === "object" ? { ...payload.meta } : {}
    };
    if (notify) window.dispatchEvent(new CustomEvent("chemvault:planchange", { detail: { plan, source: "server" } }));
    return authoritativeEntitlements;
  }

  function getServerEntitlements() {
    return authoritativeEntitlements;
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
    setServerEntitlements,
    getServerEntitlements,
    trackEvent,
    createCheckoutSession,
    createBillingPortalSession
  };
}());
