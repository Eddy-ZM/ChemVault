import {
  sendAdminLeadNotification,
  sendNewsletterConfirmation,
  sendResendEmail as sendResendEmailProvider,
  sendUserLeadConfirmation
} from "../../lib/email/resend.js";
import {
  ADMIN_ACCESS_PERMISSION,
  adminActorFromRequest,
  adminRequirementForSegments,
  adminSessionCookie,
  clearAdminSessionCookie,
  legacyAdminTokenEnabled,
  requireAdminAccess
} from "../_shared/admin-auth.js";
import {
  BillingError,
  createStripeCheckoutSession,
  createStripePortalSession,
  handleBillingLifecycle,
  handleStripeWebhook,
  isStripeConfigured,
  resolveBillingUserByEmail,
  resolvePlanForUserId,
  resolveSubscriptionContext
} from "../_shared/billing.js";

const API_VERSION = "0.6.0";
let schemaReady = false;
let formsSchemaReady = false;
const rateLimitStore = new Map();

const fallbackRecords = [
  {
    id: "nabh4",
    type: "reagent",
    typeLabel: "Reagent",
    title: "Sodium borohydride",
    subtitle: "NaBH4 · Carbonyl reduction",
    body: "Mild hydride donor for reducing aldehydes and ketones to alcohols in teaching-lab contexts.",
    domain: "Reduction",
    family: "Carbonyl reduction",
    risk: "standard",
    formula: "NaBH4",
    tags: ["hydride", "carbonyl", "selective", "alcohol"],
    href: "/pages/record.html?type=reagent&id=nabh4",
    sourceHref: "/pages/reagents.html?id=nabh4",
    imageUrl: placeholderImage("Reagent", "NaBH4", "Reduction"),
    raw: {
      transformations: ["Aldehyde to primary alcohol", "Ketone to secondary alcohol"],
      safety: "Use normal teaching-lab controls and consult the SDS before handling."
    }
  },
  {
    id: "dmp",
    type: "reagent",
    typeLabel: "Reagent",
    title: "Dess-Martin periodinane",
    subtitle: "DMP · Selective alcohol oxidation",
    body: "Hypervalent iodine oxidant commonly used for mild oxidation of alcohols to aldehydes or ketones.",
    domain: "Oxidation",
    family: "Alcohol oxidation",
    risk: "oxidizer",
    tags: ["oxidation", "alcohol", "aldehyde", "ketone"],
    href: "/pages/record.html?type=reagent&id=dmp",
    sourceHref: "/pages/reagents.html?id=dmp",
    imageUrl: placeholderImage("Reagent", "DMP", "Oxidation"),
    raw: {
      transformations: ["Primary alcohol to aldehyde", "Secondary alcohol to ketone"],
      safety: "Treat oxidizing reagents and iodine byproducts according to institutional procedures."
    }
  },
  {
    id: "graphene-oxide",
    type: "material",
    typeLabel: "Material",
    title: "Graphene oxide",
    subtitle: "oxidized graphene sheet · Carbon nanomaterial",
    body: "Oxidized graphite-derived material with oxygenated groups; evidence claims need composition and reduction history.",
    family: "Carbon nanomaterial",
    maturity: 82,
    tags: ["graphene oxide", "carbon", "dispersion", "surface chemistry"],
    href: "/pages/record.html?type=material&id=graphene-oxide",
    sourceHref: "/pages/materials.html?id=graphene-oxide",
    imageUrl: placeholderImage("Material", "Graphene oxide", "Surface chemistry"),
    raw: {
      applications: ["Composite fillers", "Membranes", "Surface-functional materials"],
      evidenceLevel: "Report oxidation route and elemental composition before claiming material identity."
    }
  },
  {
    id: "sn1",
    type: "mechanism",
    typeLabel: "Mechanism",
    title: "SN1 substitution",
    subtitle: "Carbocation substitution",
    body: "Stepwise substitution proceeding through ionization, carbocation formation and nucleophile capture.",
    family: "Substitution",
    tags: ["SN1", "carbocation", "solvolysis", "tertiary substrate"],
    href: "/pages/record.html?type=mechanism&id=sn1",
    sourceHref: "/pages/atlas.html?id=sn1",
    imageUrl: placeholderImage("Mechanism", "SN1", "Substitution"),
    raw: {
      limitations: ["Primary substrates usually do not favour SN1", "Competing E1 elimination can appear."]
    }
  },
  {
    id: "claim-audit",
    type: "method",
    typeLabel: "Method",
    title: "Claim audit workflow",
    subtitle: "Evidence review",
    body: "Separates observation, interpretation and unsupported claim before a chemistry record is accepted.",
    domain: "Reproducibility",
    family: "Review method",
    maturity: 90,
    tags: ["claims", "evidence", "reproducibility", "review"],
    href: "/pages/record.html?type=method&id=claim-audit",
    sourceHref: "/pages/methods.html?id=claim-audit",
    imageUrl: placeholderImage("Method", "Evidence", "Review"),
    raw: {
      workflow: ["List claims", "Attach observables", "Mark missing controls", "Assign evidence grade"]
    }
  },
  {
    id: "pubchem",
    type: "source",
    typeLabel: "Source",
    title: "PubChem",
    subtitle: "NIH / NCBI compound database",
    body: "Public compound identifiers, synonyms, structures and property records for chemistry search handoff.",
    family: "Compound database",
    tags: ["NIH", "NCBI", "compound", "identifier"],
    href: "https://pubchem.ncbi.nlm.nih.gov/",
    imageUrl: placeholderImage("Source", "PubChem", "NIH / NCBI"),
    raw: {
      bestFor: "Compound metadata and identifiers."
    }
  }
];

const jsonHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, x-admin-user, x-chemvault-user-email",
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8"
};

const rateLimitPolicies = {
  lead: { limit: 5, windowMs: 60 * 1000 },
  formsSubmit: { limit: 4, windowMs: 60 * 1000 },
  formsLookup: { limit: 20, windowMs: 60 * 1000 },
  accountRequest: { limit: 3, windowMs: 60 * 60 * 1000 },
  adminRead: { limit: 30, windowMs: 60 * 1000 },
  adminWrite: { limit: 10, windowMs: 60 * 1000 },
  export: { limit: 10, windowMs: 60 * 1000 },
  enrich: { limit: 20, windowMs: 60 * 1000 }
};

const serverPlanOrder = {
  anonymous: 0,
  free: 1,
  pro: 2,
  team: 3,
  enterprise: 4,
  admin: 5
};

const serverFeatureEntitlements = {
  "compound.search.basic": "anonymous",
  "compound.search.advanced": "pro",
  "compound.search.saved": "pro",
  "compound.search.export": "pro",
  "compound.search.batch": "pro",
  "file_library.basic": "free",
  "file_library.advanced": "pro",
  "file_library.storage.pro": "pro",
  "file_library.team_workspace": "team",
  "docs.public": "anonymous",
  "docs.premium": "pro",
  "modeling.viewer": "free",
  "modeling.advanced": "pro",
  "modeling.export": "pro",
  "modeling.high_quota": "team",
  "mail.basic": "free",
  "mail.templates": "pro",
  "mail.automation": "team",
  "papers.search.preview": "free",
  "papers.search.full": "pro",
  "papers.ai_summary": "pro",
  "papers.collections": "pro",
  "papers.export": "pro",
  "team.members": "team",
  "team.shared_workspace": "team",
  "enterprise.api": "enterprise",
  "enterprise.sso": "enterprise",
  "enterprise.custom_onboarding": "enterprise"
};

const leadTypes = new Set(["newsletter", "enterprise", "ai_beta"]);
const leadStatuses = new Set(["new", "notified", "failed", "subscribed", "archived", "contacted"]);
const newsletterStatuses = new Set(["active", "unsubscribed", "bounced"]);
const commercialModes = new Set(["mock", "staging", "production"]);
const deploymentEnvironments = new Set(["development", "staging", "production"]);
const leadSubmitLimits = {
  email: 254,
  name: 120,
  organization: 160,
  role: 120,
  teamSize: 80,
  source: 500,
  page: 500,
  formId: 120,
  message: 8000,
  userAgent: 500,
  lastError: 1000
};
const formTypes = new Set([
  "feedback",
  "bug",
  "feature",
  "question",
  "security",
  "privacy",
  "account",
  "billing",
  "beta",
  "testflight",
  "enterprise",
  "compliance",
  "other"
]);
const formStatuses = new Set(["new", "reviewing", "waiting_user", "resolved", "closed"]);
const formPriorities = new Set(["low", "normal", "high", "urgent"]);
const formSubmitLimits = {
  subject: 180,
  message: 8000,
  name: 120,
  email: 254,
  sourceUrl: 500,
  internalNotes: 8000,
  replyBody: 6000,
  assignedTo: 120
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: jsonHeaders });
  }

  if (!["GET", "POST", "PATCH"].includes(request.method)) {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const segments = getPathSegments(context.params?.path);
  const hasDb = Boolean(env?.DB?.prepare);
  const runtime = commercialRuntime(env);

  try {
    if (!segments.length || segments[0] === "health") {
      return json({
        ok: true,
        service: "chemvault-api",
        version: API_VERSION,
        backend: hasDb ? "d1" : "fallback",
        status: hasDb ? "D1 connected" : "fallback local data",
        features: {
          d1: hasDb,
          fallbackLocalData: true,
          academicEnrichment: true,
          commercialMvp: true,
          leadStorage: hasDb,
          formsStorage: hasDb,
          formsMailer: Boolean(env?.RESEND_API_KEY),
          paymentPlaceholder: !isStripeConfigured(env),
          subscriptionBilling: isStripeConfigured(env) && hasDb,
          signedBillingWebhooks: Boolean(env?.STRIPE_WEBHOOK_SECRET) && hasDb
        },
        commercial: {
          environment: runtime.environment,
          mode: runtime.commercialMode,
          mockBillingEnabled: runtime.mockBillingEnabled,
          mockAuthEnabled: runtime.mockAuthEnabled,
          paymentProviderConfigured: isPaymentProviderConfigured(env)
        }
      });
    }

    if (segments[0] === "entitlements") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      const commercial = await resolveServerContext(request, env, hasDb ? env.DB : null);
      const plan = commercial.plan;
      return json({
        source: "server",
        plan,
        features: Object.fromEntries(Object.keys(serverFeatureEntitlements).map((featureKey) => [
          featureKey,
          {
            enabled: hasServerFeatureAccess(plan, featureKey),
            requiredPlan: serverFeatureEntitlements[featureKey]
          }
        ])),
        meta: {
          version: API_VERSION,
          environment: runtime.environment,
          commercialMode: runtime.commercialMode,
          authMode: commercial.authMode,
          authenticated: Boolean(commercial.identity),
          subscription: commercial.subscription,
          message: runtime.mockAuthEnabled
            ? "Development/staging placeholder auth is enabled."
            : commercial.identity
              ? "Plan resolved from the verified ChemVault User identity and billing subscription."
              : "No verified ChemVault User session; only anonymous features are enabled."
        }
      });
    }

    if (segments[0] === "leads") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const limited = checkRateLimit(request, "lead", rateLimitPolicies.lead);
      if (!limited.ok) return rateLimitResponse(limited);
      const result = await createLead(env, await readJSONBody(request), request, hasDb);
      return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 201 : 400));
    }

    if (segments[0] === "newsletter" && segments[1] === "unsubscribe") {
      if (!["GET", "POST"].includes(request.method)) return json({ error: "Method not allowed" }, 405);
      const limited = checkRateLimit(request, "newsletter:unsubscribe", rateLimitPolicies.lead);
      if (!limited.ok) return rateLimitResponse(limited);
      const body = request.method === "POST" ? await readJSONBody(request) : {};
      const result = await unsubscribeNewsletter(env, body, request, hasDb, url.searchParams);
      return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 200 : 400));
    }

    if (segments[0] === "forms" && segments[1] === "submit") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const limited = checkRateLimit(request, "forms:submit", rateLimitPolicies.formsSubmit);
      if (!limited.ok) return rateLimitResponse(limited);
      const result = await createFormSubmission(env, await readJSONBody(request), request, hasDb);
      return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 201 : 400));
    }

    if (segments[0] === "forms" && segments[1] === "lookup") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      const limited = checkRateLimit(request, "forms:lookup", rateLimitPolicies.formsLookup);
      if (!limited.ok) return rateLimitResponse(limited);
      const result = await lookupPublicFormSubmission(env, hasDb, url.searchParams);
      return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 200 : 404));
    }

    if (segments[0] === "feedback") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const limited = checkRateLimit(request, "forms:feedback-compat", rateLimitPolicies.formsSubmit);
      if (!limited.ok) return rateLimitResponse(limited);
      const result = await createFeedbackCompatibilitySubmission(env, await readJSONBody(request), request, hasDb);
      return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 201 : 400));
    }

    if (segments[0] === "account") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const limited = checkRateLimit(request, `account:${segments[1] || "request"}`, rateLimitPolicies.accountRequest);
      if (!limited.ok) return rateLimitResponse(limited);
      const body = await readJSONBody(request);
      if (segments[1] === "deletion-request") {
        const result = await createAccountDeletionRequest(env, body, hasDb, request);
        return json(result, result.ok ? 202 : 400);
      }
      if (segments[1] === "export-request") {
        const result = await createDataExportRequest(env, body, hasDb, request);
        return json(result, result.ok ? 202 : 400);
      }
      return json({ error: "Not found", routes: ["/api/account/deletion-request", "/api/account/export-request"] }, 404);
    }

    if (segments[0] === "admin" && segments[1] === "session") {
      const result = await handleAdminSessionRequest(request, env);
      return result;
    }

    if (segments[0] === "internal" && segments[1] === "forms" && segments[2] === "purge" && request.method === "POST") {
      const expected = clean(env.FORMS_RETENTION_SECRET);
      const authorization = clean(request.headers.get("authorization"));
      if (!expected || authorization !== `Bearer ${expected}`) {
        return json({ ok: false, error: "Invalid retention scheduler credential." }, 401);
      }
      const result = await purgeExpiredFormSubmissions(env, hasDb, request, { email: "retention-scheduler" });
      return json(result, result.ok ? 200 : 503);
    }

    if (segments[0] === "internal" && segments[1] === "lifecycle" && segments[2]) {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const expected = clean(env.LIFECYCLE_SERVICE_SECRET);
      const authorization = clean(request.headers.get("authorization"));
      if (!expected || authorization !== `Bearer ${expected}`) {
        return json({ ok: false, error: "Invalid lifecycle service credential." }, 401);
      }
      if (!hasDb) return json({ ok: false, error: "Billing storage is unavailable." }, 503);
      const result = await handleBillingLifecycle(env, env.DB, decodePathSegment(segments[2]), await readJSONBody(request));
      return json(result);
    }

    if (segments[0] === "internal" && segments[1] === "billing" && segments[2] === "entitlements") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      const expected = clean(env.BILLING_SERVICE_SECRET);
      const authorization = clean(request.headers.get("authorization"));
      if (!expected || authorization !== `Bearer ${expected}`) {
        return json({ ok: false, error: "Invalid billing service credential." }, 401);
      }
      if (!hasDb) return json({ ok: false, error: "Billing storage is unavailable." }, 503);
      const requestedUserId = clean(url.searchParams.get("userId"));
      const requestedEmail = clean(url.searchParams.get("email")).toLowerCase();
      const resolvedIdentity = requestedEmail
        ? await resolveBillingUserByEmail(env, requestedEmail)
        : null;
      if (requestedUserId && resolvedIdentity && requestedUserId !== resolvedIdentity.id) {
        throw new BillingError("billing_identity_mismatch", "Billing identity does not match the requested user.", 400);
      }
      const userId = resolvedIdentity?.id || requestedUserId;
      const plan = await resolvePlanForUserId(env, env.DB, userId);
      return json({
        ok: true,
        userId,
        ...(resolvedIdentity ? { email: resolvedIdentity.email } : {}),
        plan,
        features: Object.fromEntries(Object.keys(serverFeatureEntitlements).map((featureKey) => [
          featureKey,
          hasServerFeatureAccess(plan, featureKey)
        ]))
      });
    }

    if (segments[0] === "admin") {
      const admin = await requireAdminAccess(request, env, adminRequirementForSegments(segments, request.method));
      if (!admin.ok) return json(admin, 403);
      const limited = checkRateLimit(
        request,
        `admin:${request.method}:${segments[1] || "unknown"}`,
        ["PATCH", "POST"].includes(request.method) ? rateLimitPolicies.adminWrite : rateLimitPolicies.adminRead
      );
      if (!limited.ok) return rateLimitResponse(limited);
      if (segments[1] === "forms") {
        if (request.method === "POST" && segments[2] === "purge") {
          const result = await purgeExpiredFormSubmissions(env, hasDb, request, admin.identity);
          return json(result, result.ok ? 200 : 503);
        }
        if (request.method === "GET" && segments[2] === "export.csv") {
          return exportFormsCsv(env, hasDb, url.searchParams);
        }
        if (request.method === "GET" && segments[2]) {
          const result = await getFormSubmission(env, hasDb, segments[2]);
          return json(result, result.ok ? 200 : 404);
        }
        if (request.method === "GET") {
          const result = await listFormSubmissions(env, hasDb, url.searchParams);
          return json(result, result.ok ? 200 : 503);
        }
        if (request.method === "PATCH" && segments[2]) {
          const result = await updateFormSubmission(env, hasDb, request, segments[2], await readJSONBody(request), admin.identity);
          return json(result, result.ok ? 200 : 400);
        }
        if (request.method === "PATCH") {
          const result = await bulkUpdateFormSubmissions(env, hasDb, request, await readJSONBody(request), admin.identity);
          return json(result, result.ok ? 200 : 400);
        }
        if (request.method === "POST" && segments[2] && segments[3] === "reply") {
          const result = await createFormReply(env, hasDb, request, segments[2], await readJSONBody(request), admin.identity);
          return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 201 : 400));
        }
      }
      if (segments[1] === "leads") {
        if (request.method === "GET" && segments[2]) {
          const result = await getLead(env, hasDb, segments[2]);
          return json(result, result.ok ? 200 : 404);
        }
        if (request.method === "GET") {
          const result = await listLeads(env, hasDb, url.searchParams);
          return json(result, result.ok ? 200 : 503);
        }
        if (request.method === "POST" && segments[2] && segments[3] === "status") {
          const result = await updateLeadStatus(env, hasDb, request, segments[2], await readJSONBody(request), admin.identity);
          return json(result, result.ok ? 200 : 400);
        }
        if (request.method === "POST" && segments[2] && segments[3] === "notify") {
          const result = await resendLeadAdminNotification(env, hasDb, request, segments[2], admin.identity);
          return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 200 : 400));
        }
      }
      if (segments[1] === "deletion-requests") {
        if (request.method === "GET") return json(await listRequestRows(env, hasDb, "account_deletion_requests"));
        if (request.method === "PATCH" && segments[2]) {
          const result = await updateRequestStatus(env, hasDb, request, "account_deletion_requests", segments[2], await readJSONBody(request), "account_deletion_request", admin.identity);
          return json(result, result.ok ? 200 : 400);
        }
      }
      if (segments[1] === "export-requests") {
        if (request.method === "GET") return json(await listRequestRows(env, hasDb, "data_export_requests"));
        if (request.method === "PATCH" && segments[2]) {
          const result = await updateRequestStatus(env, hasDb, request, "data_export_requests", segments[2], await readJSONBody(request), "data_export_request", admin.identity);
          return json(result, result.ok ? 200 : 400);
        }
      }
      return json({ error: "Not found", routes: ["/api/admin/forms", "/api/admin/forms/:id", "/api/admin/forms/:id/reply", "/api/admin/forms/export.csv", "/api/admin/leads", "/api/admin/leads/:id", "/api/admin/leads/:id/status", "/api/admin/leads/:id/notify", "/api/admin/deletion-requests", "/api/admin/export-requests"] }, 404);
    }

    if (segments[0] === "billing") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      if (segments[1] === "webhook") {
        const result = await handleStripeWebhook(request, env, hasDb ? env.DB : null, { production: runtime.production });
        return json(result, 200);
      }
      if (segments[1] === "checkout") {
        const body = await readJSONBody(request);
        const result = isStripeConfigured(env)
          ? await createStripeCheckoutSession(request, env, hasDb ? env.DB : null, body)
          : await createCheckoutPlaceholder(env, body);
        return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 200 : 400));
      }
      if (segments[1] === "portal") {
        const result = isStripeConfigured(env)
          ? await createStripePortalSession(request, env, hasDb ? env.DB : null)
          : await createBillingPortalPlaceholder(env, await readJSONBody(request));
        return json(stripHttpStatus(result), result.httpStatus || (result.ok ? 200 : 400));
      }
      return json({ error: "Not found", routes: ["/api/billing/checkout", "/api/billing/portal", "/api/billing/webhook"] }, 404);
    }

    if (segments[0] === "export") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      const limited = checkRateLimit(request, "export", rateLimitPolicies.export);
      if (!limited.ok) return rateLimitResponse(limited);
      const plan = await resolveServerPlan(request, env, hasDb ? env.DB : null);
      const access = requireServerFeatureAccess(plan, "compound.search.export");
      if (!access.ok) return json(access, 402);
      return json({
        ok: true,
        mode: "placeholder",
        message: "Compound export will be generated here after subscription and export storage are connected.",
        featureKey: "compound.search.export",
        meta: { version: API_VERSION }
      });
    }

    if (segments[0] === "records") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      if (segments.length >= 3) {
        return json(await getRecord(env, segments[1], segments[2], hasDb));
      }
      return json(await listRecords(env, url.searchParams, hasDb));
    }

    if (segments[0] === "enrich") {
      const limited = checkRateLimit(request, "enrich", rateLimitPolicies.enrich);
      if (!limited.ok) return rateLimitResponse(limited);
      return json(await enrichRecords(env, request, url.searchParams, hasDb));
    }

    if (segments[0] === "facets" || segments[0] === "meta") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return json(await getFacets(env, hasDb));
    }

    return json({ error: "Not found", routes: ["/api/health", "/api/entitlements", "/api/leads", "/api/newsletter/unsubscribe", "/api/forms/submit", "/api/forms/lookup", "/api/feedback", "/api/account/deletion-request", "/api/account/export-request", "/api/billing/checkout", "/api/billing/portal", "/api/billing/webhook", "/api/export/compound", "/api/records", "/api/records/:type/:id", "/api/enrich", "/api/facets"] }, 404);
  } catch (error) {
    if (error instanceof BillingError) {
      return json({ ok: false, code: error.code, error: error.message }, error.status);
    }
    if (segments[0] === "forms" || segments[0] === "feedback" || segments[0] === "leads" || segments[0] === "newsletter" || segments[0] === "admin" || segments[0] === "internal" || segments[0] === "billing") {
      return json({
        ok: false,
        error: "Request failed. Internal details were suppressed."
      }, 500);
    }
    return json(fallbackEnvelope({
      warning: "D1 query failed; returned fallback records. Internal details were suppressed."
    }));
  }
}

async function listRecords(env, params, hasDb) {
  const query = clean(params.get("q") || params.get("query"));
  const type = clean(params.get("type")).toLowerCase();
  const limit = clamp(Number(params.get("limit") || 24), 1, 100);
  const offset = Math.max(0, Number(params.get("offset") || 0));

  if (!hasDb) {
    return fallbackEnvelope({ query, type, limit, offset });
  }

  await ensureSchema(env.DB);

  const where = [];
  const values = [];

  if (type) {
    where.push("type = ?");
    values.push(type);
  }

  if (query) {
    where.push("(search_text LIKE ? OR title LIKE ? OR body LIKE ? OR tags_json LIKE ?)");
    const like = `%${query.toLowerCase()}%`;
    values.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `
    SELECT record_key, id, type, type_label, title, subtitle, body, domain, family, risk,
      maturity, formula, tags_json, href, source_href, image_url, raw_json, search_text, updated_at
    FROM records
    ${whereSql}
    ORDER BY title COLLATE NOCASE
    LIMIT ? OFFSET ?
  `;
  const countSql = `SELECT COUNT(*) AS count FROM records ${whereSql}`;
  const [rows, countRow] = await Promise.all([
    bindStatement(env.DB.prepare(sql), [...values, limit, offset]).all(),
    bindStatement(env.DB.prepare(countSql), values).first()
  ]);

  return {
    source: "d1",
    records: (rows.results || []).map(normaliseRow),
    meta: {
      count: Number(countRow?.count || 0),
      limit,
      offset,
      query,
      type,
      version: API_VERSION
    }
  };
}

async function createLead(env, body, request, hasDb) {
  if (clean(body.website || body.url || body.homepage)) {
    return {
      ok: true,
      submitted: true,
      stored: false,
      mode: "accepted",
      message: "Thanks, we have received your request.",
      httpStatus: 202,
      meta: { version: API_VERSION }
    };
  }

  const normalized = await normalizeLeadSubmission(env, body, request);
  if (!normalized.ok) {
    return { ok: false, submitted: false, error: normalized.error, httpStatus: 400 };
  }
  const lead = normalized.lead;

  if (!hasDb) {
    return {
      ok: true,
      submitted: true,
      stored: false,
      mode: "mock",
      message: "Thanks, we have received your request.",
      lead: publicLeadShape(lead),
      meta: { version: API_VERSION }
    };
  }

  await ensureCommercialSchema(env.DB);
  await insertLead(env.DB, lead);

  let subscriber = null;
  if (lead.subscribe) {
    subscriber = await upsertNewsletterSubscriber(env, env.DB, lead);
  }

  const mailResults = [];
  mailResults.push(await sendAdminLeadNotification(env, {
    ...lead,
    adminUrl: buildAdminLeadUrl(env, request, lead.id)
  }));
  if (subscriber) {
    mailResults.push(await sendNewsletterConfirmation(env, subscriber));
  } else {
    mailResults.push(await sendUserLeadConfirmation(env, lead));
  }

  const status = leadStatusAfterMail(lead, mailResults);
  const lastError = leadLastError(mailResults);
  await updateLeadMailStatus(env.DB, lead.id, status, lastError);
  lead.status = status;
  lead.lastError = lastError;
  lead.updatedAt = new Date().toISOString();

  return {
    ok: true,
    submitted: true,
    stored: true,
    mode: "d1",
    message: "Thanks, we have received your request.",
    emailNotificationSent: mailResults.some((result) => result.ok),
    emailNotificationSkipped: mailResults.every((result) => result.skipped),
    newsletterSubscribed: Boolean(subscriber),
    lead: publicLeadShape(lead),
    meta: { version: API_VERSION }
  };
}

async function normalizeLeadSubmission(env, body = {}, request) {
  const type = normalizeLeadType(body.type || body.leadType || body.formId);
  const email = limitText(body.email, leadSubmitLimits.email).toLowerCase();
  if (!isEmail(email)) return { ok: false, error: "A valid email address is required." };
  if (!parseConsentBoolean(body.consent)) return { ok: false, error: "Consent is required before submitting." };

  const now = new Date().toISOString();
  const source = limitText(body.source || body.sourceUrl || body.referrer || request.headers.get("referer") || "website", leadSubmitLimits.source);
  const page = limitText(body.page || body.pageUrl || request.headers.get("referer") || source, leadSubmitLimits.page);
  const formId = limitText(body.formId || body.form_id || `${type}-lead-form`, leadSubmitLimits.formId);
  const subscribe = parseConsentBoolean(body.subscribe)
    || type === "newsletter"
    || /newsletter|subscribe|updates/i.test(`${formId} ${source} ${body.interestArea || ""}`);

  return {
    ok: true,
    lead: {
      id: randomId("lead"),
      type,
      email,
      name: limitText(body.name, leadSubmitLimits.name),
      organization: limitText(body.organization, leadSubmitLimits.organization),
      role: limitText(body.role, leadSubmitLimits.role),
      teamSize: limitText(body.teamSize || body.team_size, leadSubmitLimits.teamSize),
      interests: normalizeInterests(body.interests || body.interestArea || body.modules),
      message: limitText(body.message || body.useCase || body.notes, leadSubmitLimits.message),
      source,
      page,
      formId,
      consent: true,
      subscribe,
      ipHash: await hashLeadIp(request, env),
      userAgent: limitText(request.headers.get("user-agent") || "", leadSubmitLimits.userAgent),
      status: "new",
      lastError: "",
      createdAt: now,
      updatedAt: now
    }
  };
}

async function insertLead(db, lead) {
  await db.prepare(`
    INSERT INTO leads (
      id, type, email, name, organization, role, team_size, interests_json, message,
      source, page, form_id, consent, ip_hash, user_agent, status, last_error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    lead.id,
    lead.type,
    lead.email,
    lead.name,
    lead.organization,
    lead.role,
    lead.teamSize,
    JSON.stringify(lead.interests),
    lead.message,
    lead.source,
    lead.page,
    lead.formId,
    lead.consent ? 1 : 0,
    lead.ipHash,
    lead.userAgent,
    lead.status,
    lead.lastError,
    lead.createdAt,
    lead.updatedAt
  ).run();
}

async function upsertNewsletterSubscriber(env, db, lead) {
  const now = new Date().toISOString();
  const token = createSecureToken("unsub");
  const tokenHash = await hashSecretToken(token, env);
  await db.prepare(`
    INSERT INTO newsletter_subscribers (
      id, email, source, consent, status, unsubscribe_token_hash, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      source = excluded.source,
      consent = excluded.consent,
      status = 'active',
      unsubscribe_token_hash = excluded.unsubscribe_token_hash,
      updated_at = excluded.updated_at,
      unsubscribed_at = NULL
  `).bind(
    randomId("sub"),
    lead.email,
    lead.source || lead.page || lead.formId,
    lead.consent ? 1 : 0,
    "active",
    tokenHash,
    now,
    now
  ).run();

  const row = await db.prepare(`
    SELECT id, email, source, consent, status, unsubscribe_token_hash, created_at, updated_at
    FROM newsletter_subscribers
    WHERE email = ?
    LIMIT 1
  `).bind(lead.email).first();

  return {
    id: row?.id || "",
    email: lead.email,
    source: row?.source || lead.source,
    consent: Boolean(row?.consent ?? lead.consent),
    status: row?.status || "active",
    createdAt: row?.created_at || now,
    updatedAt: row?.updated_at || now,
    unsubscribeUrl: buildUnsubscribeUrl(env, token)
  };
}

async function updateLeadMailStatus(db, id, status, lastError) {
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE leads
    SET status = ?, last_error = ?, updated_at = ?,
      notified_at = CASE WHEN ? IN ('notified', 'subscribed') THEN COALESCE(notified_at, ?) ELSE notified_at END,
      subscribed_at = CASE WHEN ? = 'subscribed' THEN COALESCE(subscribed_at, ?) ELSE subscribed_at END
    WHERE id = ?
  `).bind(status, lastError, now, status, now, status, now, id).run();
}

async function listLeads(env, hasDb, params) {
  if (!hasDb) return { ok: false, error: "Leads database is not configured.", leads: [] };
  await ensureCommercialSchema(env.DB);
  const query = leadListQuery(params);
  const [rows, countRow] = await Promise.all([
    bindStatement(env.DB.prepare(`
      SELECT id, type, email, name, source, page, form_id, message, status, last_error, created_at, updated_at
      FROM leads
      ${query.whereSql}
      ORDER BY created_at ${query.direction}
      LIMIT ? OFFSET ?
    `), [...query.values, query.limit, query.offset]).all(),
    bindStatement(env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM leads
      ${query.whereSql}
    `), query.values).first()
  ]);
  return {
    ok: true,
    leads: (rows.results || []).map(publicAdminLeadSummary),
    page: query.page,
    limit: query.limit,
    offset: query.offset,
    count: Number(countRow?.count || 0),
    filters: query.filters,
    meta: { version: API_VERSION }
  };
}

async function getLead(env, hasDb, id) {
  if (!hasDb) return { ok: false, error: "Leads database is not configured." };
  await ensureCommercialSchema(env.DB);
  const row = await env.DB.prepare(`
    SELECT *
    FROM leads
    WHERE id = ?
    LIMIT 1
  `).bind(id).first();
  if (!row) return { ok: false, error: "Lead not found." };
  return { ok: true, lead: adminLeadShape(row), meta: { version: API_VERSION } };
}

async function updateLeadStatus(env, hasDb, request, id, body = {}, adminIdentity = null) {
  if (!hasDb) return { ok: false, error: "Leads database is not configured." };
  await ensureCommercialSchema(env.DB);
  const status = normalizeLeadStatus(body.status);
  if (!status) return { ok: false, error: "Invalid lead status." };
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    UPDATE leads
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).bind(status, now, id).run();
  if (!Number(result?.meta?.changes || 0)) return { ok: false, error: "Lead not found." };
  await writeAdminAuditLog(env, request, {
    actorEmail: adminActorFromRequest(request, adminIdentity),
    action: "lead.status_updated",
    targetType: "lead",
    targetId: id,
    metadata: { status }
  });
  return getLead(env, hasDb, id);
}

async function resendLeadAdminNotification(env, hasDb, request, id, adminIdentity = null) {
  if (!hasDb) return { ok: false, error: "Leads database is not configured.", httpStatus: 503 };
  const detail = await getLead(env, hasDb, id);
  if (!detail.ok) return { ...detail, httpStatus: 404 };
  const lead = detail.lead;
  const result = await sendAdminLeadNotification(env, {
    ...lead,
    adminUrl: buildAdminLeadUrl(env, request, lead.id)
  });
  const status = result.ok ? "notified" : "failed";
  await updateLeadMailStatus(env.DB, id, status, result.ok ? "" : leadMailFailureReason(result));
  await writeAdminAuditLog(env, request, {
    actorEmail: adminActorFromRequest(request, adminIdentity),
    action: "lead.notification_resent",
    targetType: "lead",
    targetId: id,
    metadata: { emailSent: result.ok, reason: result.reason || "" }
  });
  return {
    ok: true,
    emailSent: result.ok,
    emailSkipped: Boolean(result.skipped),
    warning: result.ok ? "" : "Lead notification was not sent.",
    httpStatus: result.ok ? 200 : 202,
    meta: { version: API_VERSION }
  };
}

async function unsubscribeNewsletter(env, body, request, hasDb, params = new URLSearchParams()) {
  if (!hasDb) return { ok: false, error: "Newsletter database is not configured.", httpStatus: 503 };
  const token = clean(body.token || params.get("token"));
  if (!token) return { ok: false, error: "Unsubscribe token is required.", httpStatus: 400 };
  await ensureCommercialSchema(env.DB);
  const tokenHash = await hashSecretToken(token, env);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE newsletter_subscribers
    SET status = 'unsubscribed', updated_at = ?, unsubscribed_at = ?
    WHERE unsubscribe_token_hash = ?
  `).bind(now, now, tokenHash).run();
  return {
    ok: true,
    unsubscribed: true,
    message: "You have been unsubscribed from ChemVault updates.",
    meta: { version: API_VERSION }
  };
}

function leadListQuery(params) {
  const limit = clamp(Number(params.get("limit") || 50), 1, 100);
  const page = clamp(Number(params.get("page") || 1), 1, 100000);
  const offset = clamp(Number(params.get("offset") || ((page - 1) * limit)), 0, 1000000);
  const direction = clean(params.get("direction") || params.get("order")).toLowerCase() === "asc" ? "ASC" : "DESC";
  const q = clean(params.get("q") || params.get("search")).slice(0, 120);
  const rawStatus = clean(params.get("status"));
  const rawType = clean(params.get("type"));
  const status = rawStatus ? normalizeLeadStatus(rawStatus) : "";
  const type = rawType ? normalizeLeadType(rawType) : "";
  const where = [];
  const values = [];
  if (q) {
    where.push("(email LIKE ? OR name LIKE ? OR message LIKE ? OR source LIKE ?)");
    const like = `%${q}%`;
    values.push(like, like, like, like);
  }
  if (status) {
    where.push("status = ?");
    values.push(status);
  }
  if (type) {
    where.push("type = ?");
    values.push(type);
  }
  return {
    limit,
    page,
    offset,
    direction,
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
    filters: { q, status: status || "", type: type || "", direction }
  };
}

function normalizeLeadType(value) {
  const text = clean(value || "newsletter").toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  if (/enterprise|sales|institution|lab|team/.test(text)) return "enterprise";
  if (/ai|paper|beta|waitlist|early/.test(text)) return "ai_beta";
  return leadTypes.has(text) ? text : "newsletter";
}

function normalizeLeadStatus(value) {
  const status = clean(value).toLowerCase();
  return leadStatuses.has(status) ? status : "";
}

function leadStatusAfterMail(lead, results) {
  const failed = results.some((result) => !result.ok && !result.skipped);
  if (failed) return "failed";
  if (lead.subscribe) return "subscribed";
  if (results.some((result) => result.ok)) return "notified";
  return "new";
}

function leadLastError(results) {
  const failed = results.find((result) => !result.ok && !result.skipped);
  if (failed) return leadMailFailureReason(failed);
  if (results.length && results.every((result) => result.skipped)) return "Resend not configured";
  return "";
}

function leadMailFailureReason(result = {}) {
  return limitText(result.providerError || result.reason || `email_status_${result.status || "failed"}`, leadSubmitLimits.lastError);
}

function publicLeadShape(lead) {
  return {
    id: lead.id,
    type: lead.type,
    email: lead.email,
    status: lead.status,
    createdAt: lead.createdAt
  };
}

function publicAdminLeadSummary(row) {
  return {
    id: row.id,
    type: row.type,
    email: row.email,
    name: row.name || "",
    source: row.source || row.page || "",
    formId: row.form_id || "",
    messagePreview: limitText(row.message || "", 180),
    status: row.status || "new",
    lastError: row.last_error || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
}

function adminLeadShape(row) {
  return {
    id: row.id,
    type: row.type,
    email: row.email,
    name: row.name || "",
    organization: row.organization || "",
    role: row.role || "",
    teamSize: row.team_size || "",
    interests: safeJSON(row.interests_json, []),
    message: row.message || "",
    source: row.source || "",
    page: row.page || "",
    formId: row.form_id || "",
    consent: Boolean(row.consent),
    ipHash: row.ip_hash || "",
    userAgent: row.user_agent || "",
    userAgentSummary: summarizeUserAgent(row.user_agent || ""),
    status: row.status || "new",
    lastError: row.last_error || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    notifiedAt: row.notified_at || "",
    subscribedAt: row.subscribed_at || ""
  };
}

function summarizeUserAgent(value) {
  const text = clean(value);
  if (!text) return "";
  const browser = text.match(/(Chrome|Firefox|Safari|Edg|OPR)\/?[\d.]*/i)?.[0] || "Browser";
  const platform = text.match(/\(([^)]+)\)/)?.[1]?.split(";").slice(0, 2).join("; ") || "";
  return limitText(platform ? `${browser} on ${platform}` : browser, 180);
}

function buildAdminLeadUrl(env, request, id) {
  const configuredOrigin = clean(env.PUBLIC_APP_URL || env.CHEMVAULT_SITE_ORIGIN).replace(/\/+$/, "");
  const origin = configuredOrigin || new URL(request.url).origin;
  return `${origin}/admin/leads/${encodeURIComponent(id)}`;
}

function buildUnsubscribeUrl(env, token) {
  const origin = clean(env.PUBLIC_APP_URL || env.CHEMVAULT_SITE_ORIGIN || "https://chemvault.science").replace(/\/+$/, "");
  return `${origin}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

async function hashLeadIp(request, env = {}) {
  const ip = getClientIp(request);
  const salt = clean(env.LEADS_IP_HASH_SALT || env.FORMS_IP_HASH_SALT || "chemvault-leads");
  return hashText(`${ip}:${salt}`);
}

async function hashSecretToken(token, env = {}) {
  const salt = clean(env.LEADS_IP_HASH_SALT || env.FORMS_IP_HASH_SALT || "chemvault-leads");
  return hashText(`${token}:${salt}`);
}

async function hashText(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || !globalThis.TextEncoder) return "";
  const input = new TextEncoder().encode(String(value || ""));
  const digest = await subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createSecureToken(prefix) {
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, "")
    || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}

function parseConsentBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const text = clean(value).toLowerCase();
  return ["1", "true", "yes", "on", "accepted", "consent"].includes(text);
}

async function createFeedbackCompatibilitySubmission(env, body, request, hasDb) {
  return createFormSubmission(env, body, request, hasDb, {
    compatibilityMode: true,
    allowGithubFallback: false
  });
}

async function createFormSubmission(env, body, request, hasDb, options = {}) {
  const rawIdempotencyKey = clean(request.headers.get("idempotency-key"));
  const idempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);
  if (rawIdempotencyKey && !idempotencyKey) {
    return { ok: false, submitted: false, error: "Invalid Idempotency-Key header.", httpStatus: 400 };
  }
  const normalized = await normalizeFormSubmission(body, request, env, options);
  if (!normalized.ok) {
    return { ok: false, submitted: false, error: normalized.error, httpStatus: 400 };
  }

  const submission = normalized.submission;
  if (!hasDb) {
    return {
      ok: false,
      submitted: false,
      stored: false,
      mode: "database_required",
      error: "Forms database is not configured.",
      message: "Feedback is not redirected to GitHub Issues. Configure the D1 DB binding before accepting form submissions.",
      httpStatus: 503
    };
  }

  await ensureFormsSchema(env.DB);
  if (idempotencyKey) {
    const existing = await env.DB.prepare(`
      SELECT id, created_at, type, status, priority, subject, public_tracking_id
      FROM forms_submissions
      WHERE idempotency_key = ?
      LIMIT 1
    `).bind(idempotencyKey).first();
    if (existing) return idempotentFormSubmissionResult(existing);
  }
  const insertResult = await env.DB.prepare(`
    INSERT OR IGNORE INTO forms_submissions (
      id, created_at, updated_at, type, status, priority, name, email, subject, message,
      source_url, user_agent, ip_hash, assigned_to, internal_notes, public_tracking_id, idempotency_key, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    submission.id,
    submission.createdAt,
    submission.updatedAt,
    submission.type,
    submission.status,
    submission.priority,
    submission.name,
    submission.email,
    submission.subject,
    submission.message,
    submission.sourceUrl,
    submission.userAgent,
    submission.ipHash,
    submission.assignedTo,
    submission.internalNotes,
    submission.publicTrackingId,
    idempotencyKey || null,
    stringifyMetadata(submission.metadata)
  ).run();
  if (Number(insertResult?.meta?.changes || 0) === 0 && idempotencyKey) {
    const existing = await env.DB.prepare(`
      SELECT id, created_at, type, status, priority, subject, public_tracking_id
      FROM forms_submissions
      WHERE idempotency_key = ?
      LIMIT 1
    `).bind(idempotencyKey).first();
    if (existing) return idempotentFormSubmissionResult(existing);
  }

  const notification = await sendFormSubmissionNotification(env, submission, request);
  const triageEvent = await sendFormTriageEvent(env, submission, request);
  if (!notification.ok) {
    const updatedMetadata = {
      ...submission.metadata,
      email_notification_failed: true,
      email_notification_status: notification.reason || String(notification.status || "failed")
    };
    await env.DB.prepare(`
      UPDATE forms_submissions
      SET metadata_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(stringifyMetadata(updatedMetadata), new Date().toISOString(), submission.id).run();
    submission.metadata = updatedMetadata;
  }
  if (!triageEvent.ok) {
    const updatedMetadata = {
      ...submission.metadata,
      triage_event_failed: true,
      triage_event_status: triageEvent.reason || String(triageEvent.status || "failed")
    };
    await env.DB.prepare(`
      UPDATE forms_submissions
      SET metadata_json = ?, updated_at = ?
      WHERE id = ?
    `).bind(stringifyMetadata(updatedMetadata), new Date().toISOString(), submission.id).run();
    submission.metadata = updatedMetadata;
  }

  return {
    ok: true,
    submitted: true,
    stored: true,
    mode: "d1",
    trackingId: submission.publicTrackingId,
    message: "Thanks. Your submission was recorded.",
    emailNotificationSent: notification.ok,
    emailNotificationSkipped: Boolean(notification.skipped),
    submission: publicSubmissionShape(submission),
    meta: { version: API_VERSION }
  };
}

function normalizeIdempotencyKey(value) {
  const key = limitText(value, 128);
  return /^[A-Za-z0-9:_-]{16,128}$/.test(key) ? key : "";
}

function idempotentFormSubmissionResult(row) {
  return {
    ok: true,
    submitted: true,
    stored: true,
    idempotent: true,
    mode: "d1",
    trackingId: row.public_tracking_id,
    message: "This submission was already recorded.",
    submission: {
      trackingId: row.public_tracking_id,
      type: row.type,
      status: row.status,
      priority: row.priority,
      subject: row.subject,
      createdAt: row.created_at
    },
    meta: { version: API_VERSION }
  };
}

async function normalizeFormSubmission(body = {}, request, env = {}, options = {}) {
  const answers = normalizeLegacyAnswers(body.answers);
  const type = normalizeFormType(body.type || body.kind || body.category || body.formId || body.formTitle);
  const email = clean(body.email || findAnswerValue(answers, /e-?mail|email address/i)).toLowerCase().slice(0, formSubmitLimits.email);
  if (email && !isEmail(email)) {
    return { ok: false, error: "A valid email address is required when email is provided." };
  }

  const subject = limitText(
    body.subject
      || body.title
      || findAnswerValue(answers, /subject|title|topic|summary/i)
      || body.formTitle
      || "ChemVault feedback",
    formSubmitLimits.subject
  );
  const message = limitText(
    body.message
      || body.body
      || body.description
      || body.details
      || legacyAnswersToMessage(answers),
    formSubmitLimits.message
  );

  if (subject.length < 3) return { ok: false, error: "Subject must be at least 3 characters." };
  if (message.length < 5) return { ok: false, error: "Message must be at least 5 characters." };

  const now = new Date().toISOString();
  const sourceUrl = limitText(
    body.source_url || body.sourceUrl || body.pageUrl || request.headers.get("referer") || "",
    formSubmitLimits.sourceUrl
  );
  const metadata = redactMetadata({
    source: "chemvault-main-site",
    compatibility_mode: Boolean(options.compatibilityMode),
    form_id: clean(body.formId).slice(0, 120),
    form_title: clean(body.formTitle).slice(0, 180),
    user_agent_present: Boolean(request.headers.get("user-agent")),
    public_issue_fallback: false,
    client_metadata: trimMetadata(body.metadata || body.metadata_json || {}),
    legacy_answers: answers.slice(0, 40)
  });

  return {
    ok: true,
    submission: {
      id: randomId("form"),
      createdAt: now,
      updatedAt: now,
      type,
      status: "new",
      priority: normalizeFormPriority(body.priority || (type === "security" ? "urgent" : "normal"), "normal"),
      name: limitText(body.name || findAnswerValue(answers, /name|contact/i), formSubmitLimits.name),
      email,
      subject,
      message,
      sourceUrl,
      userAgent: limitText(request.headers.get("user-agent") || "", 500),
      ipHash: await hashClientIp(request, env),
      assignedTo: "",
      internalNotes: "",
      publicTrackingId: createTrackingId(),
      metadata
    }
  };
}

async function listFormSubmissions(env, hasDb, params) {
  if (!hasDb) return { ok: false, error: "Forms database is not configured.", submissions: [] };
  await ensureFormsSchema(env.DB);
  const query = formListQuery(params);
  const [rows, countRow] = await Promise.all([
    bindStatement(env.DB.prepare(`
      SELECT id, created_at, updated_at, type, status, priority, name, email, subject, message,
        source_url, assigned_to, public_tracking_id
      FROM forms_submissions
      ${query.whereSql}
      ORDER BY created_at ${query.direction}
      LIMIT ? OFFSET ?
    `), [...query.values, query.limit, query.offset]).all(),
    bindStatement(env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM forms_submissions
      ${query.whereSql}
    `), query.values).first()
  ]);

  return {
    ok: true,
    submissions: (rows.results || []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      type: row.type,
      status: row.status,
      priority: row.priority,
      name: row.name || "",
      email: row.email || "",
      subject: row.subject,
      messagePreview: limitText(row.message || "", 180),
      sourceUrl: row.source_url || "",
      assignedTo: row.assigned_to || "",
      trackingId: row.public_tracking_id || ""
    })),
    page: query.page,
    limit: query.limit,
    offset: query.offset,
    count: Number(countRow?.count || 0),
    filters: query.filters,
    meta: { version: API_VERSION }
  };
}

async function getFormSubmission(env, hasDb, id) {
  if (!hasDb) return { ok: false, error: "Forms database is not configured." };
  await ensureFormsSchema(env.DB);
  const submission = await env.DB.prepare(`
    SELECT *
    FROM forms_submissions
    WHERE id = ? OR public_tracking_id = ?
    LIMIT 1
  `).bind(id, id).first();
  if (!submission) return { ok: false, error: "Submission not found." };

  const replies = await env.DB.prepare(`
    SELECT id, submission_id, created_at, admin_user, to_email, subject, body,
      provider_message_id, status
    FROM forms_replies
    WHERE submission_id = ?
    ORDER BY created_at DESC
  `).bind(submission.id).all();

  return {
    ok: true,
    submission: adminSubmissionShape(submission),
    replies: (replies.results || []).map(adminReplyShape),
    meta: { version: API_VERSION }
  };
}

async function lookupPublicFormSubmission(env, hasDb, params) {
  if (!hasDb) {
    return {
      ok: false,
      error: "Forms database is not configured.",
      httpStatus: 503
    };
  }

  const ticket = normalizeTrackingId(params.get("ticket") || params.get("trackingId") || params.get("id"));
  if (!ticket) {
    return {
      ok: false,
      error: "A valid feedback ticket number is required.",
      httpStatus: 400
    };
  }

  await ensureFormsSchema(env.DB);
  const submission = await env.DB.prepare(`
    SELECT id, created_at, updated_at, type, status, priority, name, email, subject, message,
      source_url, public_tracking_id, metadata_json
    FROM forms_submissions
    WHERE public_tracking_id = ?
    LIMIT 1
  `).bind(ticket).first();
  if (!submission) {
    return {
      ok: false,
      error: "Feedback ticket not found.",
      httpStatus: 404
    };
  }

  const replies = await env.DB.prepare(`
    SELECT id, created_at, to_email, subject, body, status
    FROM forms_replies
    WHERE submission_id = ?
    ORDER BY created_at ASC
  `).bind(submission.id).all();

  return {
    ok: true,
    ticket: submission.public_tracking_id,
    submission: publicLookupSubmissionShape(submission),
    replies: (replies.results || []).map(publicReplyShape),
    meta: { version: API_VERSION }
  };
}

async function updateFormSubmission(env, hasDb, request, id, body = {}, adminIdentity = null) {
  if (!hasDb) return { ok: false, error: "Forms database is not configured." };
  await ensureFormsSchema(env.DB);
  const existing = await env.DB.prepare("SELECT id FROM forms_submissions WHERE id = ? OR public_tracking_id = ? LIMIT 1").bind(id, id).first();
  if (!existing) return { ok: false, error: "Submission not found." };

  const fields = [];
  const values = [];
  if ("status" in body) {
    const status = normalizeFormStatus(body.status);
    if (!status) return { ok: false, error: "Invalid status." };
    fields.push("status = ?");
    values.push(status);
    fields.push("closed_at = ?");
    values.push(status === "resolved" || status === "closed" ? new Date().toISOString() : null);
  }
  if ("priority" in body) {
    const priority = normalizeFormPriority(body.priority, "");
    if (!priority) return { ok: false, error: "Invalid priority." };
    fields.push("priority = ?");
    values.push(priority);
  }
  if ("assigned_to" in body || "assignedTo" in body) {
    fields.push("assigned_to = ?");
    values.push(limitText(body.assigned_to || body.assignedTo, formSubmitLimits.assignedTo));
  }
  if ("internal_notes" in body || "internalNotes" in body) {
    fields.push("internal_notes = ?");
    values.push(limitText(body.internal_notes || body.internalNotes, formSubmitLimits.internalNotes));
  }
  if (!fields.length) return { ok: false, error: "No supported fields were provided." };

  const updatedAt = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(updatedAt, existing.id);
  await env.DB.prepare(`
    UPDATE forms_submissions
    SET ${fields.join(", ")}
    WHERE id = ?
  `).bind(...values).run();
  await writeAdminAuditLog(env, request, {
    actorEmail: adminActorFromRequest(request, adminIdentity),
    action: "form_submission.updated",
    targetType: "form_submission",
    targetId: existing.id,
    metadata: { fields: fields.map((field) => field.split(" ")[0]) }
  });
  return getFormSubmission(env, hasDb, existing.id);
}

async function bulkUpdateFormSubmissions(env, hasDb, request, body = {}, adminIdentity = null) {
  if (!hasDb) return { ok: false, error: "Forms database is not configured." };
  const ids = Array.isArray(body.ids) ? body.ids.map(clean).filter(Boolean).slice(0, 100) : [];
  const status = normalizeFormStatus(body.status);
  if (!ids.length) return { ok: false, error: "At least one submission id is required." };
  if (!status) return { ok: false, error: "Invalid status." };
  await ensureFormsSchema(env.DB);
  const updatedAt = new Date().toISOString();
  let updated = 0;
  for (const id of ids) {
    const result = await env.DB.prepare(`
      UPDATE forms_submissions
      SET status = ?, closed_at = ?, updated_at = ?
      WHERE id = ? OR public_tracking_id = ?
    `).bind(status, status === "resolved" || status === "closed" ? updatedAt : null, updatedAt, id, id).run();
    updated += Number(result?.meta?.changes || 0);
  }
  await writeAdminAuditLog(env, request, {
    actorEmail: adminActorFromRequest(request, adminIdentity),
    action: "form_submission.bulk_status_updated",
    targetType: "form_submission",
    targetId: ids.join(",").slice(0, 500),
    metadata: { status, requested: ids.length, updated }
  });
  return { ok: true, updated, status, meta: { version: API_VERSION } };
}

async function createFormReply(env, hasDb, request, id, body = {}, adminIdentity = null) {
  if (!hasDb) return { ok: false, error: "Forms database is not configured." };
  await ensureFormsSchema(env.DB);
  const submission = await env.DB.prepare(`
    SELECT id, email, subject
    FROM forms_submissions
    WHERE id = ? OR public_tracking_id = ?
    LIMIT 1
  `).bind(id, id).first();
  if (!submission) return { ok: false, error: "Submission not found." };
  const toEmail = clean(body.to_email || body.toEmail || submission.email).toLowerCase();
  if (!isEmail(toEmail)) return { ok: false, error: "This submission does not have a valid recipient email." };
  const replySubject = limitText(body.subject || `Re: ${submission.subject || "ChemVault Forms"}`, formSubmitLimits.subject);
  const replyBody = limitText(body.body || body.message, formSubmitLimits.replyBody);
  if (replyBody.length < 5) return { ok: false, error: "Reply body must be at least 5 characters." };

  const emailResult = await sendResendEmail(env, {
    to: toEmail,
    from: formsFromAddress(env),
    subject: replySubject,
    text: replyBody
  });
  const reply = {
    id: randomId("reply"),
    submissionId: submission.id,
    createdAt: new Date().toISOString(),
    adminUser: limitText(body.admin_user || body.adminUser || adminActorFromRequest(request, adminIdentity), 120),
    toEmail,
    subject: replySubject,
    body: replyBody,
    providerMessageId: emailResult.providerMessageId || "",
    status: emailResult.ok ? "sent" : "failed"
  };
  await env.DB.prepare(`
    INSERT INTO forms_replies (
      id, submission_id, created_at, admin_user, to_email, subject, body, provider_message_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    reply.id,
    reply.submissionId,
    reply.createdAt,
    reply.adminUser,
    reply.toEmail,
    reply.subject,
    reply.body,
    reply.providerMessageId,
    reply.status
  ).run();
  await env.DB.prepare("UPDATE forms_submissions SET status = ?, updated_at = ? WHERE id = ?")
    .bind("waiting_user", new Date().toISOString(), submission.id)
    .run();
  await writeAdminAuditLog(env, request, {
    actorEmail: adminActorFromRequest(request, adminIdentity),
    action: "form_reply.created",
    targetType: "form_submission",
    targetId: submission.id,
    metadata: { emailSent: emailResult.ok, replyStatus: reply.status }
  });

  return {
    ok: true,
    saved: true,
    emailSent: emailResult.ok,
    warning: emailResult.ok ? "" : "Reply was saved but email sending failed or is not configured.",
    reply,
    httpStatus: emailResult.ok ? 201 : 202,
    meta: { version: API_VERSION }
  };
}

async function exportFormsCsv(env, hasDb, params) {
  if (!hasDb) return json({ ok: false, error: "Forms database is not configured." }, 503);
  await ensureFormsSchema(env.DB);
  const query = formListQuery(params, { exportMode: true });
  const rows = await bindStatement(env.DB.prepare(`
    SELECT id, created_at, updated_at, type, status, priority, name, email, subject, message,
      source_url, assigned_to, public_tracking_id
    FROM forms_submissions
    ${query.whereSql}
    ORDER BY created_at ${query.direction}
    LIMIT ? OFFSET 0
  `), [...query.values, query.limit]).all();
  const columns = [
    "id",
    "created_at",
    "updated_at",
    "type",
    "status",
    "priority",
    "name",
    "email",
    "subject",
    "message",
    "source_url",
    "assigned_to",
    "public_tracking_id"
  ];
  const csv = [
    columns.join(","),
    ...(rows.results || []).map((row) => columns.map((column) => csvCell(row[column])).join(","))
  ].join("\n");
  const headers = new Headers(jsonHeaders);
  headers.set("content-type", "text/csv; charset=utf-8");
  headers.set("content-disposition", `attachment; filename="chemvault-forms-${new Date().toISOString().slice(0, 10)}.csv"`);
  return new Response(csv, { status: 200, headers });
}

async function createAccountDeletionRequest(env, body, hasDb, request) {
  const email = clean(body.email).toLowerCase();
  if (!isEmail(email)) {
    return { ok: false, error: "A valid email address is required." };
  }

  const deletionRequest = {
    id: randomId("delreq"),
    userId: clean(body.userId),
    email,
    requestedAt: new Date().toISOString(),
    status: "pending",
    reasonOptional: clean(body.reason || body.reason_optional).slice(0, 2000)
  };

  if (hasDb) {
    await ensureCommercialSchema(env.DB);
    await env.DB.prepare(`
      INSERT INTO account_deletion_requests (
        id, user_id, email, requested_at, status, reason_optional
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      deletionRequest.id,
      deletionRequest.userId,
      deletionRequest.email,
      deletionRequest.requestedAt,
      deletionRequest.status,
      deletionRequest.reasonOptional
    ).run();
    await writeAdminAuditLog(env, request, {
      action: "account_deletion_request.created",
      targetType: "account_deletion_request",
      targetId: deletionRequest.id,
      metadata: { email: deletionRequest.email, stored: true }
    });
  }

  return {
    ok: true,
    stored: hasDb,
    mode: hasDb ? "d1" : "mock",
    message: hasDb
      ? "Your account deletion request was recorded as pending. ChemVault must verify identity before processing."
      : "Your account deletion request was accepted in placeholder mode. No database binding is configured yet.",
    request: {
      id: deletionRequest.id,
      email: deletionRequest.email,
      status: deletionRequest.status,
      requestedAt: deletionRequest.requestedAt
    },
    meta: {
      version: API_VERSION,
      note: "This endpoint records a request only. It does not immediately delete data."
    }
  };
}

async function createDataExportRequest(env, body, hasDb, request) {
  const email = clean(body.email).toLowerCase();
  if (!isEmail(email)) {
    return { ok: false, error: "A valid email address is required." };
  }

  const exportRequest = {
    id: randomId("expreq"),
    userId: clean(body.userId),
    email,
    requestedAt: new Date().toISOString(),
    status: "pending",
    exportScope: normaliseExportScope(body.exportScope || body.export_scope)
  };

  if (hasDb) {
    await ensureCommercialSchema(env.DB);
    await env.DB.prepare(`
      INSERT INTO data_export_requests (
        id, user_id, email, requested_at, status, export_scope
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      exportRequest.id,
      exportRequest.userId,
      exportRequest.email,
      exportRequest.requestedAt,
      exportRequest.status,
      exportRequest.exportScope
    ).run();
    await writeAdminAuditLog(env, request, {
      action: "data_export_request.created",
      targetType: "data_export_request",
      targetId: exportRequest.id,
      metadata: { email: exportRequest.email, exportScope: exportRequest.exportScope, stored: true }
    });
  }

  return {
    ok: true,
    stored: hasDb,
    mode: hasDb ? "d1" : "mock",
    message: hasDb
      ? "Your data export request was recorded as pending. ChemVault must verify identity before processing."
      : "Your data export request was accepted in placeholder mode. No database binding is configured yet.",
    request: {
      id: exportRequest.id,
      email: exportRequest.email,
      status: exportRequest.status,
      exportScope: exportRequest.exportScope,
      requestedAt: exportRequest.requestedAt
    },
    meta: {
      version: API_VERSION,
      note: "This endpoint records a request only. It does not generate a downloadable archive yet."
    }
  };
}

async function listRequestRows(env, hasDb, tableName) {
  if (!hasDb) {
    return {
      ok: true,
      stored: false,
      mode: "mock",
      requests: [],
      message: "No database binding is configured, so request rows cannot be listed."
    };
  }
  await ensureCommercialSchema(env.DB);
  const rows = await env.DB.prepare(`
    SELECT id, user_id, email, requested_at, status, admin_notes, completed_at
    ${tableName === "data_export_requests" ? ", export_scope" : ", reason_optional"}
    FROM ${tableName}
    ORDER BY requested_at DESC
    LIMIT 100
  `).all();
  return {
    ok: true,
    stored: true,
    requests: rows.results || [],
    meta: { version: API_VERSION }
  };
}

async function updateRequestStatus(env, hasDb, request, tableName, id, body, targetType, adminIdentity = null) {
  const status = clean(body.status);
  if (!["pending", "verified", "processing", "completed", "rejected"].includes(status)) {
    return { ok: false, error: "Unsupported status." };
  }
  const adminNotes = clean(body.adminNotes || body.admin_notes).slice(0, 4000);
  const completedAt = status === "completed" ? new Date().toISOString() : clean(body.completedAt || body.completed_at) || null;

  if (!hasDb) {
    return {
      ok: false,
      stored: false,
      mode: "mock",
      error: "A database binding is required to update request status."
    };
  }

  await ensureCommercialSchema(env.DB);
  const result = await env.DB.prepare(`
    UPDATE ${tableName}
    SET status = ?, admin_notes = ?, completed_at = ?
    WHERE id = ?
  `).bind(status, adminNotes, completedAt, clean(id)).run();

  await writeAdminAuditLog(env, request, {
    actorEmail: adminActorFromRequest(request, adminIdentity),
    action: `${targetType}.status_updated`,
    targetType,
    targetId: clean(id),
    metadata: { status, completedAt: completedAt || null }
  });

  return {
    ok: Boolean(result?.success),
    stored: true,
    request: { id: clean(id), status, completedAt },
    meta: { version: API_VERSION }
  };
}

async function createCheckoutPlaceholder(env, body) {
  // TODO: Wire the selected payment provider SDK here and create a real checkout session.
  const runtime = commercialRuntime(env);
  const planId = clean(body.planId);
  const billingInterval = clean(body.billingInterval || "monthly");
  if (!["pro", "team"].includes(planId)) {
    return {
      ok: false,
      code: "unsupported_checkout_plan",
      error: "Only Pro and Team/Lab checkout placeholders are supported. Use Contact Sales for Enterprise."
    };
  }

  const provider = paymentProvider(env);
  const priceEnvName = checkoutPriceEnvName(planId, billingInterval);
  const providerConfigured = isPaymentProviderConfigured(env);
  const priceConfigured = Boolean(priceEnvName && env[priceEnvName]);
  const requiredEnv = checkoutRequiredEnv();

  if (runtime.production) {
    const readyForFutureProvider = providerConfigured && priceConfigured;
    return {
      ok: false,
      code: readyForFutureProvider ? "payment_provider_not_implemented" : "payment_not_configured",
      mode: "not_configured",
      environment: runtime.environment,
      commercialMode: runtime.commercialMode,
      provider,
      planId,
      billingInterval,
      providerConfigured,
      priceConfigured,
      message: readyForFutureProvider
        ? "Payment environment variables are present, but live checkout is not implemented yet."
        : "Checkout is not configured for production.",
      requiredEnv,
      meta: { version: API_VERSION },
      httpStatus: readyForFutureProvider ? 501 : 503
    };
  }

  if (!runtime.mockBillingEnabled) {
    return {
      ok: false,
      code: "payment_not_configured",
      mode: "not_configured",
      environment: runtime.environment,
      commercialMode: runtime.commercialMode,
      provider,
      planId,
      billingInterval,
      providerConfigured,
      priceConfigured,
      message: "Mock billing is disabled and no live checkout provider is implemented.",
      requiredEnv,
      meta: { version: API_VERSION },
      httpStatus: 503
    };
  }

  return {
    ok: true,
    code: "placeholder_checkout",
    mode: "placeholder",
    environment: runtime.environment,
    commercialMode: runtime.commercialMode,
    provider,
    planId,
    billingInterval,
    providerConfigured,
    priceConfigured,
    checkoutUrl: "/pages/pricing.html?checkout=placeholder",
    message: runtime.staging
      ? "Staging placeholder checkout only. No payment will be processed."
      : "Placeholder checkout only. No payment will be processed.",
    url: null,
    requiredEnv,
    meta: { version: API_VERSION }
  };
}

async function createBillingPortalPlaceholder(env, body) {
  // TODO: Resolve the authenticated billing customer before creating a real portal session.
  const runtime = commercialRuntime(env);
  const provider = paymentProvider(env);
  const providerConfigured = isPaymentProviderConfigured(env);

  if (runtime.production) {
    return {
      ok: false,
      code: providerConfigured ? "billing_portal_not_implemented" : "payment_not_configured",
      mode: "not_configured",
      environment: runtime.environment,
      commercialMode: runtime.commercialMode,
      provider,
      providerConfigured,
      message: providerConfigured
        ? "Payment environment variables are present, but the live billing portal is not implemented yet."
        : "Billing portal is not configured for production.",
      requiredEnv: ["PAYMENT_PROVIDER", "STRIPE_SECRET_KEY", "PUBLIC_APP_URL"],
      meta: { version: API_VERSION },
      httpStatus: providerConfigured ? 501 : 503
    };
  }

  if (!runtime.mockBillingEnabled) {
    return {
      ok: false,
      code: "payment_not_configured",
      mode: "not_configured",
      environment: runtime.environment,
      commercialMode: runtime.commercialMode,
      provider,
      providerConfigured,
      message: "Mock billing is disabled and no live billing portal is implemented.",
      requiredEnv: ["PAYMENT_PROVIDER", "STRIPE_SECRET_KEY", "PUBLIC_APP_URL"],
      meta: { version: API_VERSION },
      httpStatus: 503
    };
  }

  return {
    ok: true,
    code: "placeholder_portal",
    mode: "placeholder",
    environment: runtime.environment,
    commercialMode: runtime.commercialMode,
    provider,
    providerConfigured,
    userId: clean(body.userId),
    message: runtime.staging
      ? "Staging billing portal placeholder only. No payment data will be changed."
      : "Billing portal placeholder only. No payment data will be changed.",
    url: null,
    meta: { version: API_VERSION }
  };
}

async function getRecord(env, type, id, hasDb) {
  const wantedType = clean(type).toLowerCase();
  const wantedId = clean(id);

  if (!hasDb) {
    const record = findFallbackRecord(wantedType, wantedId);
    return record
      ? { source: "fallback", record, meta: { version: API_VERSION } }
      : { source: "fallback", record: null, meta: { version: API_VERSION } };
  }

  await ensureSchema(env.DB);

  const row = await env.DB.prepare(`
    SELECT record_key, id, type, type_label, title, subtitle, body, domain, family, risk,
      maturity, formula, tags_json, href, source_href, image_url, raw_json, search_text, updated_at
    FROM records
    WHERE type = ? AND id = ?
    LIMIT 1
  `).bind(wantedType, wantedId).first();

  return {
    source: "d1",
    record: row ? normaliseRow(row) : null,
    meta: { version: API_VERSION }
  };
}

async function enrichRecords(env, request, params, hasDb) {
  const body = request.method === "POST" ? await readJSONBody(request) : {};
  const query = clean(body.q || body.query || params.get("q") || params.get("query"));
  const limit = clamp(Number(body.limit || params.get("limit") || 8), 1, 12);

  if (query.length < 3) {
    return {
      source: hasDb ? "d1" : "fallback",
      records: [],
      meta: { query, status: "query-too-short", stored: 0, version: API_VERSION }
    };
  }

  if (hasDb) {
    const existing = await listRecords(env, new URLSearchParams({ q: query, limit: String(limit) }), true);
    if (existing.records.length) {
      return {
        ...existing,
        meta: {
          ...existing.meta,
          status: "local-first",
          stored: 0,
          message: "Local D1 records already exist; academic auto-import skipped."
        }
      };
    }
  } else {
    const existing = fallbackEnvelope({ query, limit });
    if (existing.records.length) {
      return {
        ...existing,
        meta: {
          ...existing.meta,
          status: "fallback-local-first",
          stored: 0
        }
      };
    }
  }

  const academicRecords = await fetchAcademicRecords(query, limit);
  const checkedRecords = academicRecords
    .filter(validateAcademicRecord)
    .map((record) => ({
      ...record,
      raw: {
        ...(record.raw || {}),
        checkedAt: new Date().toISOString(),
        checkStatus: "accepted",
        checkRules: ["recognized academic host", "stable identifier", "non-empty title"]
      }
    }));

  let stored = 0;
  let warning = null;
  if (hasDb && checkedRecords.length) {
    try {
      await upsertRecords(env.DB, checkedRecords);
      stored = checkedRecords.length;
    } catch (error) {
      warning = `Academic records were checked but not stored: ${error.message || error}`;
    }
  }

  return {
    source: hasDb ? "academic-auto-d1" : "academic-live",
    records: checkedRecords,
    meta: {
      query,
      count: checkedRecords.length,
      stored,
      status: checkedRecords.length ? "checked-academic-records" : "no-academic-records",
      warning,
      version: API_VERSION
    }
  };
}

async function getFacets(env, hasDb) {
  if (!hasDb) {
    return fallbackFacets();
  }

  await ensureSchema(env.DB);

  const [typeRows, domainRows, tagRows] = await Promise.all([
    env.DB.prepare("SELECT type, type_label, COUNT(*) AS count FROM records GROUP BY type, type_label ORDER BY type_label").all(),
    env.DB.prepare("SELECT domain, COUNT(*) AS count FROM records WHERE domain IS NOT NULL AND domain != '' GROUP BY domain ORDER BY domain").all(),
    env.DB.prepare("SELECT tags_json FROM records LIMIT 1000").all()
  ]);

  return {
    source: "d1",
    facets: {
      types: (typeRows.results || []).map((row) => ({ type: row.type, label: row.type_label, count: Number(row.count || 0) })),
      domains: (domainRows.results || []).map((row) => ({ value: row.domain, count: Number(row.count || 0) })),
      tags: countTags((tagRows.results || []).map((row) => row.tags_json))
    },
    meta: { version: API_VERSION }
  };
}

async function fetchAcademicRecords(query, limit) {
  const [compoundResult, literatureResult] = await Promise.allSettled([
    fetchPubChemRecord(query),
    fetchPubMedRecords(query, Math.max(1, Math.min(5, limit - 1)))
  ]);
  const records = [];
  if (compoundResult.status === "fulfilled" && compoundResult.value) {
    records.push(compoundResult.value);
  }
  if (literatureResult.status === "fulfilled") {
    records.push(...literatureResult.value);
  }
  return records.slice(0, limit);
}

async function fetchPubChemRecord(query) {
  const propertyList = [
    "Title",
    "MolecularFormula",
    "MolecularWeight",
    "IUPACName",
    "CanonicalSMILES",
    "ConnectivitySMILES",
    "IsomericSMILES",
    "InChIKey",
    "XLogP",
    "TPSA",
    "HBondDonorCount",
    "HBondAcceptorCount",
    "RotatableBondCount",
    "ExactMass"
  ].join(",");
  const name = encodeURIComponent(query);
  const properties = await fetchJSON(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/property/${propertyList}/JSON`, true);
  const compound = properties?.PropertyTable?.Properties?.[0];
  if (!compound?.CID) return null;

  const [descriptionResult, synonymResult, safetyResult] = await Promise.allSettled([
    fetchJSON(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.CID}/description/JSON`, true),
    fetchJSON(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${compound.CID}/synonyms/JSON`, true),
    fetchPubChemSafety(compound.CID, compound)
  ]);

  const description = descriptionResult.status === "fulfilled"
    ? descriptionResult.value?.InformationList?.Information?.[0]?.Description
    : "";
  const synonyms = synonymResult.status === "fulfilled"
    ? synonymResult.value?.InformationList?.Information?.[0]?.Synonym?.slice(0, 10) || []
    : [];
  const safety = safetyResult.status === "fulfilled" ? safetyResult.value : {};
  const title = compound.Title || query;
  const cid = String(compound.CID);
  const href = `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
  const imageUrl = pubChemImageUrl(cid);
  const raw = {
    source: "PubChem",
    cid,
    query,
    formula: compound.MolecularFormula,
    molecularWeight: compound.MolecularWeight,
    iupac: compound.IUPACName,
    smiles: compound.CanonicalSMILES || compound.ConnectivitySMILES || compound.IsomericSMILES || compound.SMILES,
    inchikey: compound.InChIKey,
    exactMass: compound.ExactMass,
    xlogp: compound.XLogP,
    tpsa: compound.TPSA,
    donors: compound.HBondDonorCount,
    acceptors: compound.HBondAcceptorCount,
    rotatable: compound.RotatableBondCount,
    description,
    synonyms,
    imageUrl,
    href,
    ...safety
  };

  return withSearchText({
    id: `pubchem-${cid}`,
    type: "compound",
    typeLabel: "PubChem compound",
    title,
    subtitle: [compound.MolecularFormula, compound.MolecularWeight ? `${compound.MolecularWeight} g/mol` : ""].filter(Boolean).join(" · "),
    body: [description, compound.IUPACName, compound.CanonicalSMILES].filter(Boolean).join(" | ") || "Checked PubChem compound metadata.",
    domain: "Academic import",
    family: "Compound database",
    maturity: 70,
    formula: compound.MolecularFormula || "",
    tags: [query, "PubChem", compound.MolecularFormula, compound.InChIKey, ...synonyms.slice(0, 4)].filter(Boolean),
    href,
    sourceHref: href,
    imageUrl,
    ...safety,
    raw
  });
}

async function fetchPubChemSafety(cid, compound = {}) {
  const ghs = await fetchJSON(`https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${encodeURIComponent(cid)}/JSON?heading=${encodeURIComponent("GHS Classification")}`, true);
  const infos = collectPubChemInfo(ghs);
  const hazardStatements = infoStrings(infos.find((item) => item.Name === "GHS Hazard Statements")).slice(0, 6);
  const signalWord = infoStrings(infos.find((item) => item.Name === "Signal"))[0] || "";
  const precautionaryStatements = infoStrings(infos.find((item) => item.Name === "Precautionary Statement Codes")).slice(0, 2);
  return {
    hazardStatements,
    hazardLevel: hazardLevelFrom(hazardStatements, signalWord),
    signalWord,
    precautionaryStatements,
    disposalMethod: disposalFromHazards(hazardStatements, {
      title: compound.Title,
      formula: compound.MolecularFormula
    }),
    safetySource: "PubChem GHS summary"
  };
}

function collectPubChemInfo(payload) {
  const infos = [];
  const walk = (section) => {
    (section?.Information || []).forEach((item) => infos.push(item));
    (section?.Section || []).forEach(walk);
  };
  walk(payload?.Record);
  return infos;
}

function infoStrings(info) {
  return info?.Value?.StringWithMarkup?.map((item) => String(item.String || "").trim()).filter(Boolean) || [];
}

async function fetchPubMedRecords(query, limit) {
  const term = encodeURIComponent(query);
  const search = await fetchJSON(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${term}&retmode=json&retmax=${limit}&sort=relevance&tool=ChemVault`, false);
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const summary = await fetchJSON(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json&tool=ChemVault`, false);
  return ids.map((id) => {
    const item = summary?.result?.[id] || {};
    const doi = (item.articleids || []).find((articleId) => articleId.idtype === "doi")?.value;
    const authors = (item.authors || []).slice(0, 4).map((author) => author.name).filter(Boolean);
    const href = `https://pubmed.ncbi.nlm.nih.gov/${id}/`;
    const title = item.title || `PubMed record ${id}`;
    const journal = item.fulljournalname || item.source || "PubMed";
    const imageUrl = placeholderImage("Literature", "PubMed", journal);
    return withSearchText({
      id: `pubmed-${id}`,
      type: "literature",
      typeLabel: "PubMed article",
      title,
      subtitle: [journal, item.pubdate || item.epubdate].filter(Boolean).join(" · "),
      body: [journal, item.pubdate || item.epubdate, authors.join(", "), doi ? `DOI ${doi}` : ""].filter(Boolean).join(" | "),
      domain: "Academic import",
      family: "Literature metadata",
      maturity: 65,
      tags: [query, "PubMed", id, doi, journal].filter(Boolean),
      href,
      sourceHref: href,
      imageUrl,
      raw: {
        source: "PubMed",
        pmid: id,
        query,
        journal,
        date: item.pubdate || item.epubdate || "",
        authors,
        doi,
        href,
        imageUrl
      }
    });
  });
}

async function fetchJSON(url, allowNotFound) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    if (allowNotFound && response.status === 404) return null;
    throw new Error(`Academic request failed: ${response.status}`);
  }
  return response.json();
}

function validateAcademicRecord(record) {
  if (!record?.id || !record?.type || !record?.title || record.title.length < 3) return false;
  if (!record.href || !isAcademicHost(record.href)) return false;
  if (record.type === "compound") return Boolean(record.raw?.cid);
  if (record.type === "literature") return Boolean(record.raw?.pmid);
  return false;
}

function isAcademicHost(value) {
  try {
    const host = new URL(value).hostname;
    return host === "pubchem.ncbi.nlm.nih.gov"
      || host === "pubmed.ncbi.nlm.nih.gov"
      || host.endsWith(".ncbi.nlm.nih.gov");
  } catch {
    return false;
  }
}

async function upsertRecords(db, records) {
  await ensureSchema(db);
  for (const input of records) {
    const record = withSearchText({ ...input, imageUrl: imageForRecord(input) });
    await db.prepare(`
      INSERT OR REPLACE INTO records (
        record_key, id, type, type_label, title, subtitle, body, domain, family, risk,
        maturity, formula, tags_json, href, source_href, image_url, raw_json, search_text, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      `${record.type}:${record.id}`,
      record.id,
      record.type,
      record.typeLabel || record.type,
      record.title,
      record.subtitle || "",
      record.body || "",
      record.domain || "",
      record.family || "",
      record.risk || "",
      Number(record.maturity || 0),
      record.formula || "",
      JSON.stringify(record.tags || []),
      record.href || "",
      record.sourceHref || "",
      record.imageUrl || "",
      JSON.stringify(record.raw || {}),
      record.searchText || buildSearchText(record)
    ).run();
  }
}

async function ensureSchema(db) {
  if (schemaReady) return;
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS records (
      record_key TEXT PRIMARY KEY,
      id TEXT NOT NULL,
      type TEXT NOT NULL,
      type_label TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      body TEXT,
      domain TEXT,
      family TEXT,
      risk TEXT,
      maturity INTEGER DEFAULT 0,
      formula TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      href TEXT,
      source_href TEXT,
      image_url TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      search_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await db.prepare("ALTER TABLE records ADD COLUMN image_url TEXT").run().catch(() => {});
  await Promise.all([
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS records_type_id_idx ON records (type, id)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS records_type_idx ON records (type)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS records_title_idx ON records (title)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS records_search_idx ON records (search_text)").run()
  ]);
  schemaReady = true;
}

function fallbackEnvelope(options = {}) {
  const query = clean(options.query);
  const type = clean(options.type).toLowerCase();
  const limit = clamp(Number(options.limit || 24), 1, 100);
  const offset = Math.max(0, Number(options.offset || 0));
  const prepared = fallbackRecords.map((record) => withSearchText({ ...record, imageUrl: imageForRecord(record) }));
  const rows = prepared.filter((record) => {
    if (type && record.type !== type) return false;
    if (!query) return true;
    return record.searchText.includes(query.toLowerCase());
  });

  return {
    source: "fallback",
    records: rows.slice(offset, offset + limit),
    meta: {
      count: rows.length,
      limit,
      offset,
      query,
      type,
      version: API_VERSION,
      warning: options.warning || null
    }
  };
}

function fallbackFacets() {
  const types = new Map();
  const domains = new Map();
  const tags = new Map();

  fallbackRecords.forEach((record) => {
    const typeKey = `${record.type}::${record.typeLabel || record.type}`;
    types.set(typeKey, (types.get(typeKey) || 0) + 1);
    if (record.domain) domains.set(record.domain, (domains.get(record.domain) || 0) + 1);
    (record.tags || []).forEach((tag) => tags.set(tag, (tags.get(tag) || 0) + 1));
  });

  return {
    source: "fallback",
    facets: {
      types: [...types].map(([key, count]) => {
        const [type, label] = key.split("::");
        return { type, label, count };
      }),
      domains: [...domains].map(([value, count]) => ({ value, count })),
      tags: [...tags].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    },
    meta: { version: API_VERSION }
  };
}

function findFallbackRecord(type, id) {
  const record = fallbackRecords.find((item) => item.type === type && String(item.id) === id) || null;
  return record ? withSearchText({ ...record, imageUrl: imageForRecord(record) }) : null;
}

function normaliseRow(row) {
  const raw = safeJSON(row.raw_json, {});
  const record = {
    id: row.id,
    type: row.type,
    typeLabel: row.type_label || row.type,
    title: row.title,
    subtitle: row.subtitle || "",
    body: row.body || "",
    domain: row.domain || "",
    family: row.family || "",
    risk: row.risk || "",
    maturity: Number(row.maturity || 0),
    formula: row.formula || "",
    tags: safeJSON(row.tags_json, []),
    href: row.href || `/pages/record.html?type=${encodeURIComponent(row.type)}&id=${encodeURIComponent(row.id)}`,
    sourceHref: row.source_href || "",
    imageUrl: row.image_url || raw.imageUrl || "",
    checkStatus: raw.checkStatus || (raw.source || raw.raw?.source ? "accepted" : "curated"),
    checkedAt: raw.checkedAt || row.updated_at || "",
    hazardStatements: raw.hazardStatements || [],
    hazardLevel: raw.hazardLevel || "",
    signalWord: raw.signalWord || "",
    precautionaryStatements: raw.precautionaryStatements || [],
    disposalMethod: raw.disposalMethod || "",
    safetySource: raw.safetySource || "",
    raw,
    searchText: row.search_text || "",
    updatedAt: row.updated_at || ""
  };
  return withSearchText({ ...record, imageUrl: imageForRecord(record) });
}

function countTags(jsonRows) {
  const counts = new Map();
  jsonRows.forEach((value) => {
    safeJSON(value, []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function withSearchText(record) {
  const safety = normaliseSafety(record);
  const raw = {
    ...(record.raw || {}),
    ...(safety.hazardStatements.length ? { hazardStatements: safety.hazardStatements } : {}),
    ...(safety.hazardLevel ? { hazardLevel: safety.hazardLevel } : {}),
    ...(safety.signalWord ? { signalWord: safety.signalWord } : {}),
    ...(safety.precautionaryStatements.length ? { precautionaryStatements: safety.precautionaryStatements } : {}),
    ...(safety.disposalMethod ? { disposalMethod: safety.disposalMethod } : {}),
    ...(safety.safetySource ? { safetySource: safety.safetySource } : {})
  };
  const merged = { ...record, ...safety, raw };
  return {
    ...merged,
    imageUrl: imageForRecord(merged),
    checkStatus: record.checkStatus || raw.checkStatus || (raw.source || raw.raw?.source ? "accepted" : "curated"),
    checkedAt: record.checkedAt || raw.checkedAt || "",
    searchText: record.searchText || buildSearchText(merged)
  };
}

function buildSearchText(record) {
  return [
    record.type,
    record.typeLabel,
    record.title,
    record.subtitle,
    record.body,
    record.domain,
    record.family,
    record.risk,
    record.formula,
    record.hazardLevel,
    record.signalWord,
    ...(record.hazardStatements || []),
    ...(record.precautionaryStatements || []),
    record.disposalMethod,
    ...(record.tags || [])
  ].filter(Boolean).join(" ").toLowerCase();
}

function normaliseSafety(record) {
  const raw = record.raw || {};
  const explicitHazards = uniqueStrings([
    ...(record.hazardStatements || raw.hazardStatements || []),
    ...(record.ghsHazards || raw.ghsHazards || []),
    record.hazardStatement,
    raw.hazardStatement
  ]);
  const safetyNotes = uniqueStrings([
    record.safety,
    raw.safety
  ]);
  const hazardStatements = explicitHazards.length ? explicitHazards : safetyNotes;
  if (!hazardStatements.length && !isSafetyRelevant(record)) {
    return {
      hazardStatements: [],
      hazardLevel: "",
      signalWord: "",
      precautionaryStatements: [],
      disposalMethod: "",
      safetySource: ""
    };
  }
  const hazardLevel = record.hazardLevel || raw.hazardLevel || hazardLevelFrom(hazardStatements, record.signalWord || raw.signalWord || "");
  return {
    hazardStatements: hazardStatements.length ? hazardStatements : [fallbackHazardStatement(record, hazardLevel)],
    hazardLevel,
    signalWord: record.signalWord || raw.signalWord || signalFromLevel(hazardLevel),
    precautionaryStatements: uniqueStrings([...(record.precautionaryStatements || raw.precautionaryStatements || [])]),
    disposalMethod: record.disposalMethod || raw.disposalMethod || disposalFromHazards(hazardStatements, record),
    safetySource: record.safetySource || raw.safetySource || (raw.source === "PubChem" || raw.raw?.source === "PubChem" || record.sourceHref?.includes("pubchem") ? "PubChem GHS summary" : "Local safety summary")
  };
}

function isSafetyRelevant(record) {
  const text = `${record.type || ""} ${record.typeLabel || ""} ${record.family || ""} ${record.domain || ""} ${record.risk || ""}`.toLowerCase();
  return Boolean(record.formula || record.cas || record.risk || record.safety || record.raw?.safety)
    || /compound|reagent|reactant|material|solvent|acid|base|oxidizer|halogen|salt|polymer|nanomaterial|catalyst/.test(text);
}

function fallbackHazardStatement(record, level) {
  if (level === "Not classified") return "No local GHS hazard statement is currently classified for this record; verify the current SDS before use.";
  if (record.risk === "corrosive") return "Corrosive material or reagent system; may cause burns or serious eye damage depending on concentration.";
  if (record.risk === "oxidizer") return "Oxidizing material or reagent system; may intensify fire and react with incompatible reducing or organic materials.";
  if (record.risk === "dry") return "Moisture-sensitive or reactive material; contact with water, air or protic media may create additional hazards.";
  if (record.risk === "toxic") return "Toxic material or reagent system; avoid exposure and verify route-specific hazards from the SDS.";
  if (record.risk === "energetic") return "Potential energetic or instability hazard; avoid heat, friction, impact and incompatible storage conditions.";
  return "Hazard statement not fully classified in local data; verify the current SDS before handling.";
}

function hazardLevelFrom(statements = [], signalWord = "") {
  const text = `${signalWord} ${statements.join(" ")}`.toLowerCase();
  if (/fatal|cancer|mutagen|reproductive|damage to organs|explosive|pyrophoric|energetic/.test(text)) return "Severe";
  if (/toxic|corrosive|skin burns|serious eye damage|highly flammable|extremely flammable|oxidizer|may intensify fire/.test(text)) return "High";
  if (/harmful|irritation|drowsiness|dizziness|flammable/.test(text)) return "Moderate";
  return statements.length ? "Low" : "Not classified";
}

function signalFromLevel(level) {
  if (level === "Severe" || level === "High") return "Danger";
  if (level === "Moderate" || level === "Low") return "Warning";
  return "Not available";
}

function disposalFromHazards(statements = [], context = {}) {
  const text = `${context.title || ""} ${context.formula || ""} ${context.family || ""} ${context.domain || ""} ${context.risk || ""} ${statements.join(" ")}`.toLowerCase();
  if (/chlorinated|halogenated|chloroform|dichloromethane|methylene chloride|bromine|iodine|chlorine/.test(text)) return "Collect as halogenated or toxic hazardous waste in a compatible labelled container; do not pour to drain.";
  if (/chrom|osmium|lead|mercury|cadmium|nickel|silver|copper|manganese|metal|catalyst/.test(text)) return "Collect as heavy-metal or catalyst waste for institutional hazardous-waste pickup.";
  if (/azide|cyanide|diazonium|energetic|explosive|pyrophoric/.test(text)) return "Collect as reactive/toxic hazardous waste and keep segregated under institutional EHS guidance.";
  if (/corrosive|acid|base|amine|pyridine|anhydride|skin burns|serious eye damage/.test(text)) return "Collect as corrosive hazardous waste or neutralize only under an approved institutional procedure.";
  if (/flammable|solvent|ether|toluene|hexane|acetone|ethanol|methanol|acetonitrile|tetrahydrofuran|ethyl acetate|dimethylformamide/.test(text) && !/oxidizer|hypochlorite|permanganate|nitrate|may intensify fire/.test(text)) return "Collect in a compatible flammable organic-waste container; keep ignition sources excluded and do not pour to drain.";
  if (/oxidizer|peroxide|hypochlorite|permanganate|nitrate|may intensify fire/.test(text)) return "Collect as oxidizing hazardous waste; keep separate from organics, reducers and incompatible containers.";
  if (/flammable|solvent|ether|toluene|hexane|acetone|ethanol|methanol|acetonitrile|tetrahydrofuran|ethyl acetate|dimethylformamide/.test(text)) return "Collect in a compatible flammable organic-waste container; keep ignition sources excluded and do not pour to drain.";
  if (/toxic|cancer|mutagen|reproductive|damage to organs|fatal/.test(text)) return "Collect as toxic hazardous waste; keep segregated and route through institutional EHS.";
  if (/not classified/.test(text)) return "Use local non-hazardous or aqueous-waste rules only after checking the current SDS and institutional policy.";
  return "Dispose through approved chemical-waste channels according to SDS, institutional EHS guidance and local regulations.";
}

function uniqueStrings(values) {
  return [...new Set((values || []).flat().filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function imageForRecord(record) {
  if (record.imageUrl) return record.imageUrl;
  if (record.raw?.imageUrl) return record.raw.imageUrl;
  const cid = record.raw?.cid || record.cid || pubChemCidFrom(record);
  if (cid && canUsePubChemImage(record)) return pubChemImageUrl(cid);
  return placeholderImage(record.typeLabel || record.type || "Record", record.title || record.id || "ChemVault", record.family || record.domain || "");
}

function canUsePubChemImage(record) {
  const title = String(record.title || record.id || "").trim();
  return Boolean(title) && !/\breference\b/i.test(title) && !/^syscat-/i.test(title);
}

function pubChemImageUrl(cid) {
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${encodeURIComponent(cid)}/PNG?record_type=2d&image_size=large`;
}

function pubChemCidFrom(record = {}) {
  const raw = record.raw || {};
  const href = String(record.sourceHref || raw.sourceHref || raw.href || raw.url || "");
  const match = href.match(/pubchem\.ncbi\.nlm\.nih\.gov\/compound\/(\d+)/i);
  return match?.[1] || "";
}

function placeholderImage(type, title, subtitle = "") {
  const palette = imagePalette(type);
  const formula = imageFormula(subtitle);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420" role="img" aria-label="${svgEsc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${palette.bg}"/>
      <stop offset="1" stop-color="${palette.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="420" fill="url(#bg)"/>
  <rect x="28" y="28" width="584" height="364" rx="28" fill="#fff" stroke="${palette.border}"/>
  <text x="54" y="76" fill="${palette.accent}" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="800">${svgEsc(type).slice(0, 34)}</text>
  <g transform="translate(74 112)" fill="none" stroke="${palette.line}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M104 0 184 46v92l-80 46-80-46V46Z" stroke-width="10" opacity=".74"/>
    <path d="M184 46h82M184 138h82M24 46l-54-32M24 138l-54 32" stroke-width="8" opacity=".48"/>
    <path d="M266 46 318 16M266 138l52 30" stroke-width="7" opacity=".38"/>
    <circle cx="104" cy="0" r="18" fill="${palette.accent}" stroke="none"/>
    <circle cx="184" cy="138" r="18" fill="${palette.accent2}" stroke="none"/>
    <circle cx="318" cy="16" r="15" fill="${palette.accent}" stroke="none"/>
  </g>
  <text x="372" y="168" fill="${palette.text}" font-family="SFMono-Regular,Menlo,Consolas,monospace" font-size="36" font-weight="800">${svgEsc(formula || "Chem record").slice(0, 18)}</text>
  <text x="372" y="206" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="700">curated preview</text>
  <text x="54" y="338" fill="${palette.text}" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="850">${svgEsc(title).slice(0, 30)}</text>
  <text x="54" y="370" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="19" font-weight="650">${svgEsc(subtitle).slice(0, 48)}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function imagePalette(type) {
  const key = String(type || "").toLowerCase();
  if (key.includes("compound") || key.includes("reagent")) {
    return { bg: "#f5f5f7", bg2: "#eef4ff", border: "#d2d2d7", line: "#1d1d1f", accent: "#0071e3", accent2: "#2bbbad", text: "#1d1d1f", muted: "#6e6e73" };
  }
  if (key.includes("literature") || key.includes("article") || key.includes("source")) {
    return { bg: "#f5f5f7", bg2: "#fff7ed", border: "#d2d2d7", line: "#52525b", accent: "#0071e3", accent2: "#f59e0b", text: "#1d1d1f", muted: "#6e6e73" };
  }
  if (key.includes("material")) {
    return { bg: "#f5f5f7", bg2: "#ecf6f4", border: "#d2d2d7", line: "#64748b", accent: "#0071e3", accent2: "#2bbbad", text: "#1d1d1f", muted: "#6e6e73" };
  }
  return { bg: "#f5f5f7", bg2: "#eef4ff", border: "#d2d2d7", line: "#1d1d1f", accent: "#0071e3", accent2: "#2bbbad", text: "#1d1d1f", muted: "#6e6e73" };
}

function imageFormula(subtitle) {
  const value = String(subtitle || "").split("·")[0].trim();
  if (!value || value.length > 28) return "";
  return /[A-Z][A-Za-z0-9()[\].+\-/ ]/.test(value) ? value : "";
}

async function ensureCommercialSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      organization TEXT,
      role TEXT,
      team_size TEXT,
      interests_json TEXT NOT NULL DEFAULT '[]',
      message TEXT,
      source TEXT,
      page TEXT,
      form_id TEXT,
      consent INTEGER NOT NULL DEFAULT 0,
      ip_hash TEXT,
      user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notified_at TEXT,
      subscribed_at TEXT
    )
  `).run();
  await Promise.all([
    safeAddColumn(db, "leads", "source", "TEXT"),
    safeAddColumn(db, "leads", "page", "TEXT"),
    safeAddColumn(db, "leads", "form_id", "TEXT"),
    safeAddColumn(db, "leads", "consent", "INTEGER NOT NULL DEFAULT 0"),
    safeAddColumn(db, "leads", "ip_hash", "TEXT"),
    safeAddColumn(db, "leads", "user_agent", "TEXT"),
    safeAddColumn(db, "leads", "status", "TEXT NOT NULL DEFAULT 'new'"),
    safeAddColumn(db, "leads", "last_error", "TEXT"),
    safeAddColumn(db, "leads", "updated_at", "TEXT"),
    safeAddColumn(db, "leads", "notified_at", "TEXT"),
    safeAddColumn(db, "leads", "subscribed_at", "TEXT")
  ]);
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      source TEXT,
      consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      unsubscribe_token_hash TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      unsubscribed_at TEXT,
      last_error TEXT
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      organization_id TEXT,
      provider TEXT,
      provider_customer_id TEXT,
      provider_subscription_id TEXT,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      current_period_end TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS feature_entitlements (
      id TEXT PRIMARY KEY,
      plan TEXT NOT NULL,
      feature_key TEXT NOT NULL,
      usage_limit INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS usage_records (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      organization_id TEXT,
      feature_key TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 1,
      period_start TEXT,
      period_end TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS account_deletion_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'pending',
      reason_optional TEXT,
      admin_notes TEXT,
      completed_at TEXT
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS data_export_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'pending',
      export_scope TEXT NOT NULL DEFAULT 'account',
      admin_notes TEXT,
      completed_at TEXT
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      actor_email TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await Promise.all([
    db.prepare("CREATE INDEX IF NOT EXISTS leads_type_idx ON leads (type)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON newsletter_subscribers (email)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx ON newsletter_subscribers (status)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS newsletter_subscribers_token_idx ON newsletter_subscribers (unsubscribe_token_hash)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS subscriptions_plan_idx ON subscriptions (plan)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS usage_records_feature_idx ON usage_records (feature_key)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS account_deletion_requests_email_idx ON account_deletion_requests (email)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx ON account_deletion_requests (status)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS data_export_requests_email_idx ON data_export_requests (email)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS data_export_requests_status_idx ON data_export_requests (status)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS admin_audit_logs_action_idx ON admin_audit_logs (action)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx ON admin_audit_logs (target_type, target_id)").run()
  ]);
}

async function safeAddColumn(db, table, column, definition) {
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } catch (error) {
    const message = String(error?.message || error || "");
    if (/duplicate column|already exists/i.test(message)) return;
    throw error;
  }
}

async function purgeExpiredFormSubmissions(env, hasDb, request, adminIdentity) {
  if (!hasDb) return { ok: false, error: "Forms database is not configured." };
  await ensureFormsSchema(env.DB);
  const configuredDays = Number(env.FORMS_RETENTION_DAYS || 90);
  const retentionDays = Number.isFinite(configuredDays) ? clamp(configuredDays, 30, 730) : 90;
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  const countRow = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM forms_submissions WHERE closed_at < ? AND type != 'security'"
  ).bind(cutoff).first();
  const count = Number(countRow?.count || 0);
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM forms_replies WHERE submission_id IN (SELECT id FROM forms_submissions WHERE closed_at < ? AND type != 'security')"
    ).bind(cutoff),
    env.DB.prepare("DELETE FROM forms_submissions WHERE closed_at < ? AND type != 'security'").bind(cutoff)
  ]);
  await writeAdminAuditLog(env, request, {
    actorEmail: adminIdentity?.email || "admin",
    action: "forms.retention.purge",
    targetType: "forms_submission",
    targetId: "retention",
    metadata: { retentionDays, cutoff, submissionsDeleted: count }
  });
  return { ok: true, retentionDays, cutoff, submissionsDeleted: count };
}

async function ensureFormsSchema(db) {
  if (formsSchemaReady) return;
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS forms_submissions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      priority TEXT NOT NULL DEFAULT 'normal',
      name TEXT,
      email TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      source_url TEXT,
      user_agent TEXT,
      ip_hash TEXT,
      assigned_to TEXT,
      internal_notes TEXT,
      public_tracking_id TEXT,
      idempotency_key TEXT,
      metadata_json TEXT,
      closed_at TEXT
    )
  `).run();
  await safeAddColumn(db, "forms_submissions", "closed_at", "TEXT");
  await safeAddColumn(db, "forms_submissions", "idempotency_key", "TEXT");
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS forms_replies (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      admin_user TEXT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      provider_message_id TEXT,
      status TEXT NOT NULL DEFAULT 'sent',
      FOREIGN KEY (submission_id) REFERENCES forms_submissions(id)
    )
  `).run();
  await Promise.all([
    db.prepare("CREATE INDEX IF NOT EXISTS forms_submissions_created_idx ON forms_submissions (created_at)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS forms_submissions_status_idx ON forms_submissions (status)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS forms_submissions_type_idx ON forms_submissions (type)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS forms_submissions_priority_idx ON forms_submissions (priority)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS forms_submissions_email_idx ON forms_submissions (email)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS forms_submissions_closed_idx ON forms_submissions (closed_at)").run(),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS forms_submissions_tracking_idx ON forms_submissions (public_tracking_id)").run(),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS forms_submissions_idempotency_idx ON forms_submissions (idempotency_key) WHERE idempotency_key IS NOT NULL").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS forms_replies_submission_idx ON forms_replies (submission_id)").run(),
    db.prepare("CREATE INDEX IF NOT EXISTS forms_replies_created_idx ON forms_replies (created_at)").run()
  ]);
  formsSchemaReady = true;
}

function formListQuery(params, options = {}) {
  const limit = clamp(Number(params.get("limit") || (options.exportMode ? 1000 : 50)), 1, options.exportMode ? 5000 : 100);
  const page = clamp(Number(params.get("page") || 1), 1, 100000);
  const rawOffset = params.get("offset");
  const offset = options.exportMode
    ? 0
    : rawOffset == null
      ? (page - 1) * limit
      : clamp(Number(rawOffset), 0, 1000000);
  const direction = clean(params.get("direction") || params.get("order")).toLowerCase() === "asc" ? "ASC" : "DESC";
  const q = clean(params.get("q") || params.get("search")).slice(0, 120);
  const rawStatus = clean(params.get("status"));
  const rawType = clean(params.get("type"));
  const rawPriority = clean(params.get("priority"));
  const status = rawStatus ? normalizeFormStatus(rawStatus) : "";
  const type = rawType ? normalizeFormType(rawType) : "";
  const priority = rawPriority ? normalizeFormPriority(rawPriority, "") : "";
  const where = [];
  const values = [];
  if (q) {
    where.push("(subject LIKE ? OR message LIKE ? OR email LIKE ? OR public_tracking_id LIKE ?)");
    const like = `%${q}%`;
    values.push(like, like, like, like);
  }
  if (status) {
    where.push("status = ?");
    values.push(status);
  }
  if (type) {
    where.push("type = ?");
    values.push(type);
  }
  if (priority) {
    where.push("priority = ?");
    values.push(priority);
  }
  return {
    limit,
    page,
    offset,
    direction,
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
    filters: { q, status: status || "", type: type || "", priority: priority || "", direction }
  };
}

function normalizeFormType(value) {
  const text = clean(value || "feedback").toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  if (/security|abuse|vulnerability|vuln|responsible_disclosure/.test(text)) return "security";
  if (/bug|error|defect/.test(text)) return "bug";
  if (/feature|idea|request/.test(text)) return "feature";
  if (/question|support|help/.test(text)) return "question";
  if (/privacy|gdpr|data/.test(text)) return "privacy";
  if (/account|login|delete|export/.test(text)) return "account";
  if (/billing|payment|invoice|subscription/.test(text)) return "billing";
  if (/testflight|beta/.test(text)) return text.includes("testflight") ? "testflight" : "beta";
  if (/enterprise|sales|lab|team/.test(text)) return "enterprise";
  if (/compliance|legal/.test(text)) return "compliance";
  return formTypes.has(text) ? text : "feedback";
}

function normalizeFormStatus(value) {
  const status = clean(value).toLowerCase();
  return formStatuses.has(status) ? status : "";
}

function normalizeFormPriority(value, fallback = "normal") {
  const priority = clean(value || fallback).toLowerCase();
  if (formPriorities.has(priority)) return priority;
  return fallback && formPriorities.has(fallback) ? fallback : "";
}

function normalizeLegacyAnswers(answers) {
  if (!Array.isArray(answers)) return [];
  return answers.map((answer) => {
    const label = limitText(answer?.label || answer?.question || answer?.name || answer?.field || "", 120);
    const rawValue = Array.isArray(answer?.value || answer?.answer)
      ? (answer.value || answer.answer).join(", ")
      : answer?.value ?? answer?.answer ?? answer?.text ?? "";
    return {
      label,
      value: limitText(rawValue, 2000)
    };
  }).filter((answer) => answer.label || answer.value);
}

function findAnswerValue(answers, pattern) {
  return clean((answers || []).find((answer) => pattern.test(answer.label))?.value || "");
}

function legacyAnswersToMessage(answers) {
  return (answers || []).map((answer) => {
    const label = answer.label || "Response";
    return `${label}: ${answer.value || ""}`;
  }).join("\n");
}

function trimMetadata(value) {
  if (Array.isArray(value)) return value.slice(0, 40).map(trimMetadata);
  if (!value || typeof value !== "object") return limitText(value, 1000);
  return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, entry]) => [
    limitText(key, 80),
    trimMetadata(entry)
  ]));
}

function stringifyMetadata(metadata) {
  const text = JSON.stringify(redactMetadata(metadata || {}));
  if (text.length <= 20000) return text;
  return JSON.stringify({ truncated: true, reason: "metadata_size_limit" });
}

function publicSubmissionShape(submission) {
  return {
    trackingId: submission.publicTrackingId,
    type: submission.type,
    status: submission.status,
    priority: submission.priority,
    subject: submission.subject,
    createdAt: submission.createdAt
  };
}

function publicLookupSubmissionShape(row) {
  const metadata = safeJSON(row.metadata_json, {});
  return {
    trackingId: row.public_tracking_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    type: row.type,
    status: row.status,
    priority: row.priority,
    name: row.name || "",
    email: row.email || "",
    subject: row.subject,
    message: row.message,
    sourceUrl: row.source_url || "",
    answers: publicAnswerShapes(metadata.legacy_answers)
  };
}

function publicAnswerShapes(answers) {
  if (!Array.isArray(answers)) return [];
  return answers.slice(0, 40).map((answer) => ({
    label: limitText(answer?.label, 120),
    value: limitText(answer?.value, 4000)
  })).filter((answer) => answer.label || answer.value);
}

function publicReplyShape(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    toEmail: row.to_email || "",
    subject: row.subject,
    body: row.body,
    status: row.status
  };
}

function adminSubmissionShape(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    type: row.type,
    status: row.status,
    priority: row.priority,
    name: row.name || "",
    email: row.email || "",
    subject: row.subject,
    message: row.message,
    sourceUrl: row.source_url || "",
    userAgent: row.user_agent || "",
    ipHash: row.ip_hash || "",
    assignedTo: row.assigned_to || "",
    internalNotes: row.internal_notes || "",
    trackingId: row.public_tracking_id || "",
    metadata: safeJSON(row.metadata_json, {})
  };
}

function adminReplyShape(row) {
  return {
    id: row.id,
    submissionId: row.submission_id,
    createdAt: row.created_at,
    adminUser: row.admin_user || "",
    toEmail: row.to_email,
    subject: row.subject,
    body: row.body,
    providerMessageId: row.provider_message_id || "",
    status: row.status
  };
}

async function sendFormTriageEvent(env, submission, request) {
  const endpoint = clean(env.NOTIFICATIONS_EVENT_URL).replace(/\/+$/, "");
  const secret = clean(env.EVENT_DELIVERY_SECRET);
  const triageUserId = clean(env.FORMS_TRIAGE_USER_ID);
  if (!endpoint || !secret || !triageUserId) {
    return { ok: false, reason: "not_configured" };
  }
  const payload = {
    specVersion: "1.0",
    id: `forms:${submission.id}`,
    type: "forms.submission.received",
    source: "chemvault-forms",
    subject: `forms/${submission.id}`,
    time: submission.createdAt,
    user: { id: triageUserId },
    data: {
      title: "New Forms triage item",
      summary: `${submission.type} submission · ${submission.priority} priority · ${submission.publicTrackingId}`,
      deepLink: buildAdminFormUrl(env, request, submission.id),
      ticketId: submission.id,
      priority: submission.priority
    }
  };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-chemvault-event-key": secret
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });
    return response.ok ? { ok: true, status: response.status } : { ok: false, status: response.status, reason: `http_${response.status}` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message.slice(0, 160) : "request_failed" };
  }
}

async function sendFormSubmissionNotification(env, submission, request) {
  const adminUrl = buildAdminFormUrl(env, request, submission.id);
  return sendResendEmail(env, {
    to: formsNotifyAddresses(env),
    from: formsFromAddress(env),
    subject: `[ChemVault Forms] ${submission.type}: ${submission.subject}`,
    text: [
      "New ChemVault Forms submission",
      "",
      `Submitted: ${submission.createdAt}`,
      `Tracking ID: ${submission.publicTrackingId}`,
      `Submission ID: ${submission.id}`,
      `Name: ${submission.name || "Not provided"}`,
      `Email: ${submission.email || "Not provided"}`,
      `Type: ${submission.type}`,
      `Priority: ${submission.priority}`,
      `Subject: ${submission.subject}`,
      `Source page: ${submission.sourceUrl || "Not provided"}`,
      `Admin link: ${adminUrl}`,
      "",
      "Message:",
      submission.message
    ].join("\n")
  });
}

async function sendResendEmail(env, email) {
  return sendResendEmailProvider(env, email);
}

function formsNotifyAddresses(env = {}) {
  const configured = clean(env.FORMS_NOTIFY_TO || "forms@chemvault.science");
  const recipients = configured.split(",").map((entry) => entry.trim()).filter(isEmail);
  return recipients.length ? recipients : ["forms@chemvault.science"];
}

function formsFromAddress(env = {}) {
  return clean(env.FORMS_FROM || "forms@chemvault.science");
}

function buildAdminFormUrl(env, request, id) {
  const configuredOrigin = clean(env.PUBLIC_APP_URL).replace(/\/+$/, "");
  const origin = configuredOrigin || new URL(request.url).origin;
  return `${origin}/admin/forms/${encodeURIComponent(id)}`;
}

async function hashClientIp(request, env = {}) {
  const ip = getClientIp(request);
  const salt = clean(env.FORMS_IP_HASH_SALT || "chemvault-forms");
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || !globalThis.TextEncoder) return "";
  const input = new TextEncoder().encode(`${ip}:${salt}`);
  const digest = await subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createTrackingId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const uuid = globalThis.crypto?.randomUUID?.().replace(/-/g, "") || Math.random().toString(36).slice(2);
  return `CVF-${date}-${uuid.slice(0, 16).toUpperCase()}`;
}

function normalizeTrackingId(value) {
  const ticket = clean(value).toUpperCase().replace(/\s+/g, "").slice(0, 80);
  return /^CVF-\d{8}-[A-Z0-9]{6,32}$/.test(ticket) ? ticket : "";
}

function limitText(value, max) {
  return clean(value).slice(0, max);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function handleAdminSessionRequest(request, env = {}) {
  if (request.method === "GET") {
    const admin = await requireAdminAccess(request, env, { permission: ADMIN_ACCESS_PERMISSION, label: "Admin session" });
    if (!admin.ok) return json({ ...admin, legacyTokenEnabled: legacyAdminTokenEnabled(env) }, 403);
    return json({
      ok: true,
      identity: publicAdminIdentity(admin.identity),
      legacyTokenEnabled: legacyAdminTokenEnabled(env),
      meta: { version: API_VERSION }
    });
  }

  if (request.method === "POST") {
    if (!legacyAdminTokenEnabled(env)) {
      return json({ ok: false, error: "Legacy admin token login is disabled." }, 403);
    }
    const body = await readJSONBody(request);
    const token = clean(body.token);
    const expected = clean(env.CHEMVAULT_ADMIN_TOKEN);
    if (!expected || token !== expected) {
      return json({ ok: false, error: "Admin access required." }, 403);
    }
    return json({
      ok: true,
      identity: publicAdminIdentity({
        email: "",
        source: "legacy_admin_token",
        authMode: "legacy_admin_token",
        permission: ADMIN_ACCESS_PERMISSION,
        warning: "Legacy token fallback is enabled. Prefer Cloudflare Access or ChemVault User permissions."
      }),
      legacyTokenEnabled: true,
      meta: { version: API_VERSION }
    }, 200, { "set-cookie": adminSessionCookie(env, request, expected) });
  }

  if (request.method === "DELETE") {
    return json({ ok: true, signedOut: true }, 200, { "set-cookie": clearAdminSessionCookie(env, request) });
  }

  return json({ error: "Method not allowed" }, 405);
}

function publicAdminIdentity(identity = {}) {
  return {
    email: identity.email || "",
    source: identity.source || "",
    authMode: identity.authMode || "",
    permission: identity.permission || "",
    permissions: identity.permissions || [],
    systemRole: identity.systemRole || "",
    warning: identity.warning || ""
  };
}

async function writeAdminAuditLog(env, request, event) {
  if (!env?.DB?.prepare) return;
  const metadata = redactMetadata(event.metadata || {});
  await env.DB.prepare(`
    INSERT INTO admin_audit_logs (
      id, actor_user_id, actor_email, action, target_type, target_id, ip_address, user_agent, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    randomId("audit"),
    clean(event.actorUserId),
    clean(event.actorEmail),
    clean(event.action),
    clean(event.targetType),
    clean(event.targetId),
    getClientIp(request),
    clean(request.headers.get("user-agent")).slice(0, 500),
    JSON.stringify(metadata),
    new Date().toISOString()
  ).run();
}

function checkRateLimit(request, scope, policy) {
  const now = Date.now();
  const key = `${scope}:${getClientIp(request)}:${clean(request.headers.get("authorization")).slice(0, 32)}`;
  const bucket = rateLimitStore.get(key) || [];
  const fresh = bucket.filter((timestamp) => now - timestamp < policy.windowMs);
  if (fresh.length >= policy.limit) {
    rateLimitStore.set(key, fresh);
    return {
      ok: false,
      limit: policy.limit,
      retryAfterSeconds: Math.max(1, Math.ceil((policy.windowMs - (now - fresh[0])) / 1000))
    };
  }
  fresh.push(now);
  rateLimitStore.set(key, fresh);
  return { ok: true };
}

function rateLimitResponse(result) {
  return json({
    error: "Too many requests. Please try again later.",
    retryAfterSeconds: result.retryAfterSeconds
  }, 429);
}

function getClientIp(request) {
  return clean(request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]
    || "local");
}

function normaliseExportScope(value) {
  const scope = clean(value || "account").toLowerCase();
  return ["account", "account_files", "account_mail", "account_ai", "all"].includes(scope) ? scope : "account";
}

function redactMetadata(value) {
  if (Array.isArray(value)) return value.map(redactMetadata);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (/secret|token|password|key|credential|authorization|cookie/i.test(key)) return [key, "[redacted]"];
    return [key, redactMetadata(entry)];
  }));
}

async function resolveServerContext(request, env, db) {
  const runtime = commercialRuntime(env);
  if (!runtime.mockAuthEnabled) {
    const context = await resolveSubscriptionContext(request, env, db);
    return { ...context, authMode: "chemvault-user" };
  }

  const auth = request.headers.get("authorization") || "";
  const token = clean(env.CHEMVAULT_ADMIN_TOKEN);
  const plan = token && auth === `Bearer ${token}`
    ? "admin"
    : normaliseServerPlan(env.DEFAULT_USER_PLAN || "free");
  return { identity: null, plan, subscription: null, authMode: "placeholder" };
}

async function resolveServerPlan(request, env, db) {
  return (await resolveServerContext(request, env, db)).plan;
}

function normaliseServerPlan(value) {
  const plan = clean(value).toLowerCase();
  return Object.prototype.hasOwnProperty.call(serverPlanOrder, plan) ? plan : "free";
}

function hasServerFeatureAccess(plan, featureKey) {
  const required = serverFeatureEntitlements[featureKey];
  if (!required) return false;
  return serverPlanOrder[normaliseServerPlan(plan)] >= serverPlanOrder[required];
}

function requireServerFeatureAccess(plan, featureKey) {
  if (hasServerFeatureAccess(plan, featureKey)) return { ok: true };
  return {
    ok: false,
    error: "Feature access denied.",
    featureKey,
    requiredPlan: serverFeatureEntitlements[featureKey] || "pro",
    currentPlan: normaliseServerPlan(plan),
    message: "Server-side entitlement checks default to Free until real authentication/subscription state is connected."
  };
}

function commercialRuntime(env = {}) {
  const environment = normaliseEnvironment(env.ENVIRONMENT);
  const explicitMode = clean(env.COMMERCIAL_MODE).toLowerCase();
  const commercialMode = commercialModes.has(explicitMode)
    ? explicitMode
    : environment === "production"
      ? "production"
      : environment === "staging"
        ? "staging"
        : "mock";
  const production = environment === "production" || commercialMode === "production";
  const staging = environment === "staging" || commercialMode === "staging";
  return {
    environment,
    commercialMode,
    production,
    staging,
    mockBillingEnabled: production ? false : parseBoolean(env.ENABLE_MOCK_BILLING, true),
    mockAuthEnabled: production ? false : parseBoolean(env.ENABLE_MOCK_AUTH, true)
  };
}

function normaliseEnvironment(value) {
  const environment = clean(value).toLowerCase();
  return deploymentEnvironments.has(environment) ? environment : "development";
}

function parseBoolean(value, fallback) {
  const text = clean(value).toLowerCase();
  if (!text) return fallback;
  if (["1", "true", "yes", "on"].includes(text)) return true;
  if (["0", "false", "no", "off"].includes(text)) return false;
  return fallback;
}

function paymentProvider(env = {}) {
  return clean(env.PAYMENT_PROVIDER || "placeholder").toLowerCase() || "placeholder";
}

function isPaymentProviderConfigured(env = {}) {
  const provider = paymentProvider(env);
  return provider !== "placeholder" && provider !== "mock" && Boolean(env.STRIPE_SECRET_KEY);
}

function checkoutRequiredEnv() {
  return [
    "PAYMENT_PROVIDER",
    "PUBLIC_APP_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_PRO_MONTHLY_PRICE_ID",
    "STRIPE_PRO_YEARLY_PRICE_ID",
    "STRIPE_TEAM_MONTHLY_PRICE_ID",
    "STRIPE_TEAM_YEARLY_PRICE_ID"
  ];
}

function stripHttpStatus(payload) {
  const { httpStatus, ...publicPayload } = payload || {};
  return publicPayload;
}

function checkoutPriceEnvName(planId, billingInterval) {
  const interval = billingInterval === "yearly" || billingInterval === "annual" ? "YEARLY" : "MONTHLY";
  const plan = planId === "team" ? "TEAM" : planId === "pro" ? "PRO" : "";
  return plan ? `STRIPE_${plan}_${interval}_PRICE_ID` : "";
}

function normalizeInterests(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 12);
  return String(value || "")
    .split(/[,|]/)
    .map(clean)
    .filter(Boolean)
    .slice(0, 12);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function randomId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}_${uuid}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function svgEsc(value) {
  return String(value || "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[char]));
}

async function readJSONBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getPathSegments(pathParam) {
  const path = Array.isArray(pathParam) ? pathParam.join("/") : pathParam || "";
  return path.split("/").filter(Boolean);
}

function decodePathSegment(value) {
  try {
    return decodeURIComponent(clean(value));
  } catch {
    return "";
  }
}

function bindStatement(statement, values) {
  return values.length ? statement.bind(...values) : statement;
}

function clean(value) {
  return String(value || "").trim();
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function safeJSON(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: { ...jsonHeaders, ...headers } });
}
