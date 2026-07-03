import { adminRequirementForSegments, resolveAdminIdentity } from "./_shared/admin-auth.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith("/admin")) return context.next();
  if (url.pathname.startsWith("/admin/login")) return context.next();

  const segments = url.pathname.split("/").filter(Boolean);
  const requirement = adminRequirementForSegments(["admin", segments[1] || ""], context.request.method);
  const result = await resolveAdminIdentity(context.request, context.env, requirement);
  if (result.ok) return context.next();

  if (context.request.method === "GET" || context.request.method === "HEAD") {
    const redirect = new URL("/admin/login/", url.origin);
    redirect.searchParams.set("return_to", `${url.pathname}${url.search}`);
    return Response.redirect(redirect.toString(), 302);
  }

  return new Response("Admin access required.", {
    status: 403,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8"
    }
  });
}
