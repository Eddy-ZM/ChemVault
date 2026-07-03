const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export async function sendAdminLeadNotification(env = {}, lead = {}) {
  const adminUrl = lead.adminUrl || adminLeadUrl(env, lead.id);
  const message = lead.message || "Not provided";
  const subject = `[ChemVault Leads] ${lead.type || "lead"} from ${lead.email}`;
  return sendResendEmail(env, {
    to: leadNotifyAddresses(env),
    from: leadFromAddress(env),
    subject,
    text: [
      "New ChemVault lead",
      "",
      `Email: ${lead.email}`,
      `Name: ${lead.name || "Not provided"}`,
      `Type: ${lead.type || "lead"}`,
      `Source: ${lead.source || lead.page || "Not provided"}`,
      `Form ID: ${lead.formId || "Not provided"}`,
      `Submitted: ${lead.createdAt || "Not provided"}`,
      `Status: ${lead.status || "new"}`,
      `Admin view: ${adminUrl}`,
      "",
      "Message:",
      message
    ].join("\n"),
    html: leadAdminHtml(lead, adminUrl, message)
  });
}

export async function sendUserLeadConfirmation(env = {}, lead = {}) {
  return sendResendEmail(env, {
    to: lead.email,
    from: leadFromAddress(env),
    subject: "ChemVault received your request",
    text: [
      "ChemVault received your request.",
      "",
      "Thanks for contacting ChemVault. We have recorded your request and will review the relevant chemistry workflow, beta access, or commercial follow-up.",
      "",
      "If you did not submit this request, you can ignore this email.",
      "",
      "ChemVault"
    ].join("\n"),
    html: baseEmailHtml({
      eyebrow: "Request received",
      title: "ChemVault received your request.",
      body: [
        "Thanks for contacting ChemVault. We have recorded your request and will review the relevant chemistry workflow, beta access, or commercial follow-up.",
        "If you did not submit this request, you can ignore this email."
      ]
    })
  });
}

export async function sendNewsletterConfirmation(env = {}, subscriber = {}) {
  const unsubscribeUrl = subscriber.unsubscribeUrl || "";
  const lines = [
    "Your ChemVault subscription is active.",
    "",
    "We will use this address only for ChemVault product, research workflow, and beta access updates.",
    "",
    "If you did not request this, you can ignore this email."
  ];
  if (unsubscribeUrl) {
    lines.push("", `Unsubscribe: ${unsubscribeUrl}`);
  }
  return sendResendEmail(env, {
    to: subscriber.email,
    from: leadFromAddress(env),
    subject: "ChemVault updates subscription confirmed",
    text: lines.join("\n"),
    html: baseEmailHtml({
      eyebrow: "Subscription confirmed",
      title: "Your ChemVault subscription is active.",
      body: [
        "We will use this address only for ChemVault product, research workflow, and beta access updates.",
        "If you did not request this, you can ignore this email."
      ],
      action: unsubscribeUrl ? { href: unsubscribeUrl, label: "Unsubscribe" } : null
    })
  });
}

export async function sendResendEmail(env = {}, email = {}) {
  const apiKey = stringValue(env.RESEND_API_KEY);
  const recipients = normalizeRecipients(email.to);
  const from = stringValue(email.from || leadFromAddress(env));
  if (!apiKey || !recipients.length || !from || typeof fetch !== "function") {
    safeWarn("Resend not configured");
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: stringValue(email.subject).slice(0, 180),
        text: stringValue(email.text),
        html: stringValue(email.html)
      })
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: "provider_rejected",
        providerError: stringValue(payload?.message || payload?.error).slice(0, 300)
      };
    }
    return { ok: true, providerMessageId: stringValue(payload?.id) };
  } catch {
    return { ok: false, reason: "provider_unavailable" };
  }
}

export function leadNotifyAddresses(env = {}) {
  const configured = stringValue(env.LEADS_NOTIFY_TO || env.FORMS_NOTIFY_TO || "forms@chemvault.science");
  const recipients = configured.split(",").map((entry) => entry.trim()).filter(isEmail);
  return recipients.length ? recipients : ["forms@chemvault.science"];
}

export function leadFromAddress(env = {}) {
  return stringValue(env.LEADS_FROM || env.FORMS_FROM || "ChemVault <forms@chemvault.science>");
}

function leadAdminHtml(lead, adminUrl, message) {
  const rows = [
    ["Email", lead.email],
    ["Name", lead.name || "Not provided"],
    ["Type", lead.type || "lead"],
    ["Source", lead.source || lead.page || "Not provided"],
    ["Form ID", lead.formId || "Not provided"],
    ["Submitted", lead.createdAt || "Not provided"],
    ["Status", lead.status || "new"]
  ];
  return baseEmailHtml({
    eyebrow: "New lead",
    title: "New ChemVault lead received.",
    body: ["A new website lead was recorded. Review it in the protected admin workflow."],
    rows,
    note: message,
    action: adminUrl ? { href: adminUrl, label: "Open admin lead" } : null
  });
}

function baseEmailHtml({ eyebrow, title, body = [], rows = [], note = "", action = null }) {
  const rowsHtml = rows.length
    ? `<table style="width:100%;border-collapse:collapse;margin:18px 0">${rows.map(([key, value]) => `
        <tr>
          <td style="padding:8px 0;color:#5b6472;font-size:13px;border-bottom:1px solid #e5e7eb">${escapeHtml(key)}</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #e5e7eb">${escapeHtml(value)}</td>
        </tr>`).join("")}</table>`
    : "";
  const actionHtml = action?.href
    ? `<p style="margin:22px 0 0"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;padding:11px 16px;font-weight:700">${escapeHtml(action.label)}</a></p>`
    : "";
  const noteHtml = note
    ? `<div style="margin-top:18px;padding:14px;border-radius:8px;background:#f4f7fb;color:#243044;white-space:pre-wrap">${escapeHtml(note)}</div>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827">
    <main style="max-width:620px;margin:0 auto;padding:28px 18px">
      <section style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:26px">
        <p style="margin:0 0 8px;color:#1f6feb;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15;color:#07111f">${escapeHtml(title)}</h1>
        ${body.map((paragraph) => `<p style="margin:0 0 12px;color:#5b6472;line-height:1.65">${escapeHtml(paragraph)}</p>`).join("")}
        ${rowsHtml}
        ${noteHtml}
        ${actionHtml}
      </section>
      <p style="margin:14px 4px 0;color:#6b7280;font-size:12px">ChemVault scientific infrastructure</p>
    </main>
  </body>
</html>`;
}

function adminLeadUrl(env = {}, id = "") {
  const origin = stringValue(env.PUBLIC_APP_URL || env.CHEMVAULT_SITE_ORIGIN || "https://chemvault.science").replace(/\/+$/, "");
  return id ? `${origin}/admin/leads/${encodeURIComponent(id)}` : `${origin}/admin/leads`;
}

function normalizeRecipients(value) {
  const raw = Array.isArray(value) ? value : [value];
  return raw.map(stringValue).filter(isEmail);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue(value));
}

function stringValue(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function safeWarn(message) {
  try {
    console.warn(message);
  } catch {
    return false;
  }
  return true;
}
