// GET/POST/DELETE /api/admin-banned-emails
//
// Manages the permanent signup blocklist directly, separate from banning a
// specific ACCOUNT (api/admin-moderate-account.js): banning an account
// always adds its email here too, but an admin can also block an email
// that never signed up at all (a known bad actor), and — deliberately, as
// its own explicit step — remove an email from this list, which
// admin-moderate-account.js's "reactivate" action never does on its own so
// undoing a ban on an account doesn't silently let the email itself back in.
//
// Same admin gate as every other admin-*.js route.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";

async function requireAdmin(request) {
  const adminUser = await getUserFromRequest(request);
  if (!adminUser || !adminUser.email) return { error: Response.json({ error: "Not signed in" }, { status: 401 }) };
  if (adminUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { error: Response.json({ error: "Not authorised" }, { status: 403 }) };
  }
  return { adminUser };
}

export async function GET(request) {
  let gate;
  try {
    gate = await requireAdmin(request);
  } catch (err) {
    console.error("admin-banned-emails: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (gate.error) return gate.error;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("banned_emails").select("email, reason, note, banned_by, banned_at").order("banned_at", { ascending: false });
    if (error) throw error;
    return Response.json({ emails: data || [] });
  } catch (err) {
    console.error("admin-banned-emails GET error:", err);
    return Response.json({ error: "Couldn't load the banned-email list" }, { status: 500 });
  }
}

export async function POST(request) {
  let gate;
  try {
    gate = await requireAdmin(request);
  } catch (err) {
    console.error("admin-banned-emails: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (gate.error) return gate.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const email = (body?.email || "").trim().toLowerCase();
  const reason = (body?.reason || "").trim();
  if (!email || !reason) return Response.json({ error: "Missing email or reason" }, { status: 400 });

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("banned_emails")
      .upsert({ email, reason, note: body?.note || null, banned_by: gate.adminUser.email, banned_at: new Date().toISOString() }, { onConflict: "email" });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("admin-banned-emails POST error:", err);
    return Response.json({ error: "Couldn't add that email" }, { status: 500 });
  }
}

export async function DELETE(request) {
  let gate;
  try {
    gate = await requireAdmin(request);
  } catch (err) {
    console.error("admin-banned-emails: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (gate.error) return gate.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const email = (body?.email || "").trim().toLowerCase();
  if (!email) return Response.json({ error: "Missing email" }, { status: 400 });

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("banned_emails").delete().eq("email", email);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("admin-banned-emails DELETE error:", err);
    return Response.json({ error: "Couldn't remove that email" }, { status: 500 });
  }
}
