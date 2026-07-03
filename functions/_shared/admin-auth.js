export const ADMIN_ACCESS_PERMISSION = "main_admin:access";
export const ADMIN_FORMS_READ_PERMISSION = "main_admin:forms:read";
export const ADMIN_FORMS_WRITE_PERMISSION = "main_admin:forms:write";
export const ADMIN_FORMS_REPLY_PERMISSION = "main_admin:forms:reply";
export const ADMIN_LEADS_READ_PERMISSION = "main_admin:leads:read";
export const ADMIN_LEADS_WRITE_PERMISSION = "main_admin:leads:write";
export const ADMIN_LEADS_NOTIFY_PERMISSION = "main_admin:leads:notify";
export const ADMIN_COMPLIANCE_READ_PERMISSION = "main_admin:compliance:read";
export const ADMIN_COMPLIANCE_WRITE_PERMISSION = "main_admin:compliance:write";

const defaultAdminEmails = new Set([
  "ziwen.mu@chemvault.science",
  "admin@chemvault.science"
]);
const adminSessionCookieName = "chemvault_admin_session";

export function adminRequirementForSegments(segments = [], method = "GET") {
  const area = segments[1] || "";
  const action = segments[3] || "";
  const write = ["POST", "PATCH", "PUT", "DELETE"].includes(String(method).toUpperCase());

  if (area === "forms") {
    if (action === "reply") return { permission: ADMIN_FORMS_REPLY_PERMISSION, label: "Forms reply" };
    return { permission: write ? ADMIN_FORMS_WRITE_PERMISSION : ADMIN_FORMS_READ_PERMISSION, label: "Forms admin" };
  }
  if (area === "leads") {
    if (action === "notify") return { permission: ADMIN_LEADS_NOTIFY_PERMISSION, label: "Lead notification" };
    return { permission: write ? ADMIN_LEADS_WRITE_PERMISSION : ADMIN_LEADS_READ_PERMISSION, label: "Leads admin" };
  }
  if (area === "deletion-requests" || area === "export-requests") {
    return { permission: write ? ADMIN_COMPLIANCE_WRITE_PERMISSION : ADMIN_COMPLIANCE_READ_PERMISSION, label: "Compliance requests" };
  }
  return { permission: ADMIN_ACCESS_PERMISSION, label: "ChemVault main admin" };
}

export async function requireAdminAccess(request, env = {}, requirement = {}) {
  const result = await resolveAdminIdentity(request, env, requirement);
  if (result.ok) return result;
  return {
    ok: false,
    error: "Admin access required.",
    message: result.message || "Use a ChemVault administrator account or Cloudflare Access identity allowed for this admin area."
  };
}

export async function resolveAdminIdentity(request, env = {}, requirement = {}) {
  const permission = requirement.permission || ADMIN_ACCESS_PERMISSION;
  const allowedEmails = allowedAdminEmails(env);

  const accessIdentity = accessEmailIdentity(request, env);
  if (accessIdentity.email) {
    return allowedEmails.has(accessIdentity.email)
      ? { ok: true, identity: { ...accessIdentity, permission, permissions: ["cloudflare_access"] } }
      : deniedIdentity(accessIdentity.email, "cloudflare_access");
  }

  const userCenterIdentity = await userCenterPermissionIdentity(request, env, permission);
  if (userCenterIdentity.email) {
    return allowedEmails.has(userCenterIdentity.email)
      ? { ok: true, identity: userCenterIdentity }
      : deniedIdentity(userCenterIdentity.email, "user_system");
  }

  const tokenIdentity = legacyTokenIdentity(request, env, permission);
  if (tokenIdentity) return { ok: true, identity: tokenIdentity };

  return {
    ok: false,
    message: "No allowed ChemVault admin identity was found on this request."
  };
}

export function adminActorFromRequest(request, identity) {
  if (identity?.email) return identity.email;
  const accessEmail = normalizeEmail(request.headers.get("cf-access-authenticated-user-email"));
  if (accessEmail) return accessEmail;
  const devEmail = normalizeEmail(request.headers.get("x-admin-user"));
  if (devEmail) return devEmail;
  return "chemvault-admin";
}

export function adminSessionCookie(env = {}, request, token) {
  const maxAge = Number(env.CHEMVAULT_ADMIN_SESSION_MAX_AGE_SECONDS || 8 * 60 * 60);
  return buildCookie(env, request, token, `Max-Age=${Math.max(60, maxAge)}`);
}

export function clearAdminSessionCookie(env = {}, request) {
  return buildCookie(env, request, "", "Max-Age=0");
}

export function legacyAdminTokenEnabled(env = {}) {
  const value = clean(env.CHEMVAULT_ADMIN_TOKEN_FALLBACK || env.CHEMVAULT_ADMIN_TOKEN_ENABLED).toLowerCase();
  return value === "true" || value === "enabled" || value === "1" || value === "yes";
}

function accessEmailIdentity(request, env = {}) {
  const cloudflareEmail = normalizeEmail(request.headers.get("cf-access-authenticated-user-email"));
  if (cloudflareEmail) {
    return { email: cloudflareEmail, source: "cloudflare_access", authMode: "cloudflare_access" };
  }

  if (allowDevelopmentAdminEmailHeader(env)) {
    const devEmail = normalizeEmail(request.headers.get("x-admin-user") || request.headers.get("x-chemvault-user-email"));
    if (devEmail) return { email: devEmail, source: "development_header", authMode: "development_header" };
  }

  return { email: "" };
}

async function userCenterPermissionIdentity(request, env = {}, permission) {
  const cookie = request.headers.get("cookie") || "";
  if (!cookie) return { email: "" };
  const origin = userCenterOrigin(env);
  if (!origin) return { email: "" };

  try {
    const params = new URLSearchParams({ permission });
    const response = await fetch(`${origin}/api/access/check?${params.toString()}`, {
      headers: {
        cookie,
        "x-chemvault-auth-mode": "cookie",
        "user-agent": "chemvault-main-admin-gate"
      }
    });
    if (!response.ok) return { email: "" };
    const body = await response.json();
    const email = normalizeEmail(body?.user?.email);
    if (!body?.allowed || !email) return { email: "" };
    return {
      email,
      source: "user_system",
      authMode: "user_system",
      userId: clean(body.user.id),
      systemRole: clean(body.user.systemRole),
      permission,
      permissions: [permission],
      reason: clean(body.reason)
    };
  } catch {
    return { email: "" };
  }
}

function legacyTokenIdentity(request, env = {}, permission) {
  const token = clean(env.CHEMVAULT_ADMIN_TOKEN);
  if (!token || !legacyAdminTokenEnabled(env)) return null;
  const auth = request.headers.get("authorization") || "";
  const sessionToken = parseCookies(request).get(adminSessionCookieName) || "";
  if (auth === `Bearer ${token}` || sessionToken === token) {
    return {
      email: "",
      source: "legacy_admin_token",
      authMode: "legacy_admin_token",
      permission,
      permissions: [permission],
      warning: "Legacy token fallback is enabled. Prefer Cloudflare Access or ChemVault User permissions."
    };
  }
  return null;
}

function deniedIdentity(email, source) {
  return {
    ok: false,
    message: `${email} is authenticated through ${source}, but is not in CHEMVAULT_ADMIN_EMAILS.`
  };
}

function allowedAdminEmails(env = {}) {
  const configured = clean(env.CHEMVAULT_ADMIN_EMAILS || env.ADMIN_EMAILS);
  const emails = configured
    ? configured.split(/[,\s]+/).map(normalizeEmail).filter(Boolean)
    : [...defaultAdminEmails];
  return new Set(emails);
}

function userCenterOrigin(env = {}) {
  const value = clean(env.USER_SYSTEM_ORIGIN || env.CHEMVAULT_USER_ORIGIN || "https://user.chemvault.science");
  return value.replace(/\/+$/, "");
}

function allowDevelopmentAdminEmailHeader(env = {}) {
  const explicit = clean(env.ALLOW_LOCAL_ADMIN_EMAIL_HEADER).toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  const environment = clean(env.ENVIRONMENT || env.NODE_ENV).toLowerCase();
  return environment === "development" || environment === "test";
}

function parseCookies(request) {
  const cookies = new Map();
  const cookieHeader = request.headers.get("cookie") || "";
  for (const pair of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) continue;
    cookies.set(rawKey, decodeURIComponent(rawValue.join("=")));
  }
  return cookies;
}

function buildCookie(env = {}, request, value, maxAgePart) {
  const secure = new URL(request.url).protocol === "https:" || clean(env.ENVIRONMENT).toLowerCase() === "production" ? "; Secure" : "";
  return `${adminSessionCookieName}=${encodeURIComponent(value)}; ${maxAgePart}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function clean(value) {
  return String(value || "").trim();
}
