// POST /api/admin-set-account-lock
// body: { userId: string, locked: boolean }
//
// Actually locks an account out — not a flag on a profile row someone could
// edit their way around, but a real ban at the Supabase Auth level, so a
// locked account can't sign in or refresh a session at all. Takes effect at
// their next sign-in / token refresh (typically within the hour), not an
// instant kill of a session they already have open. Same admin gate as
// /api/admin-users.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
// Supabase's ban_duration wants a Postgres interval string, not "forever" —
// ~100 years is the accepted way to mean "indefinitely."
const LOCK_DURATION = "876000h";

export async function POST(request) {
  let adminUser;
  try {
    adminUser = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-set-account-lock: auth check failed:", err);
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
  const { userId, locked } = body || {};
  if (!userId || typeof locked !== "boolean") {
    return Response.json({ error: "Missing userId or locked" }, { status: 400 });
  }
  if (userId === adminUser.id) {
    return Response.json({ error: "Can't lock the admin account itself" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: locked ? LOCK_DURATION : "none",
    });
    if (error) throw error;
    const bannedUntil = data?.user?.banned_until ? new Date(data.user.banned_until).getTime() : null;
    return Response.json({ locked, bannedUntil });
  } catch (err) {
    console.error("admin-set-account-lock error:", err);
    return Response.json({ error: "Couldn't update this account's lock status" }, { status: 500 });
  }
}
