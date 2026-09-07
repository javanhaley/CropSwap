// POST /api/admin-send-user-email
// body: { userId, subject, message }
//
// Sends a plain email straight to one account's real address, from the
// Admin Dashboard's user detail page. Exists specifically for accounts
// that are locked/banned/deleted (see api/admin-moderate-account.js) --
// those can't sign in, so an in-app notification would never reach them.
// This is the one channel that still works regardless of their access
// status.
//
// Uses Resend (https://resend.com). Set RESEND_API_KEY as a Vercel env
// var -- same rule as every other secret in this app: added directly in
// Vercel, never pasted into chat. Until a sending domain is verified in
// Resend, this falls back to Resend's own onboarding@resend.dev test
// sender, which works with zero setup (it can send to any address) but
// shows up looking like a test email rather than official CropSwap
// correspondence -- verify cropswapmarket.com in Resend and set
// RESEND_FROM_EMAIL (e.g. "CropSwap <support@cropswapmarket.com>") once
// that's done, and this switches over with no other code changes.
//
// Same admin gate as every other admin-*.js route.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "CropSwap <onboarding@resend.dev>";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br/>");
}

export async function POST(request) {
  let adminUser;
  try {
    adminUser = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-send-user-email: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!adminUser || !adminUser.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (adminUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: "Not authorised" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { userId } = body || {};
  const subject = (body?.subject || "").trim();
  const message = (body?.message || "").trim();
  if (!userId || !subject || !message) {
    return Response.json({ error: "Missing userId, subject, or message" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("admin-send-user-email: RESEND_API_KEY is not set");
    return Response.json({ error: "Email sending isn't set up yet — add RESEND_API_KEY in Vercel" }, { status: 500 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: targetData, error: targetErr } = await admin.auth.admin.getUserById(userId);
    if (targetErr || !targetData?.user?.email) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    const toEmail = targetData.user.email;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        subject,
        text: message,
        html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#1c1917;">${escapeHtml(message)}</div>`,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("admin-send-user-email: Resend error:", payload);
      return Response.json({ error: payload?.message || "Couldn't send the email" }, { status: 502 });
    }
    return Response.json({ ok: true, id: payload?.id || null });
  } catch (err) {
    console.error("admin-send-user-email error:", err);
    return Response.json({ error: "Couldn't send the email" }, { status: 500 });
  }
}
