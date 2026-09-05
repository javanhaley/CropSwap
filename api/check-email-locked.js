// POST /api/check-email-locked
// body: { email }
//
// Public, unauthenticated on purpose — there's no session yet at the sign-in
// screen. AuthGate calls this only after a sign-in attempt has already
// failed, to tell a blocked person clearly what happened instead of leaving
// them staring at a generic "Invalid login credentials" that reads
// identically to a typo'd password (Supabase Auth doesn't distinguish the
// two on a signInWithPassword call — a banned account fails the same
// generic way a wrong password does; the "user_banned" error code only
// shows up on token refresh, which is no help here since there's no
// session to refresh yet).
//
// Now also distinguishes WHY an account is blocked (locked / banned /
// deleted) via account_moderation, so a banned or deleted account isn't
// told "contact the admin to get unlocked" when reactivation isn't the
// point for those statuses the way it is for a lock.
//
// Deliberately returns the SAME {locked:false} shape for "no account with
// this email" and "account exists but isn't blocked" — it never reveals
// whether an email has an account at all, only whether an existing,
// already-blocked account matches it. Same non-enumeration posture as
// the forgot-password flow.
import { getSupabaseAdmin, isRealBan } from "./_supabaseAdmin.js";

const PAGE_SIZE = 1000;
const ADMIN_CONTACT = "cropswapadmin@gmail.com";

const MESSAGES = {
  locked: `This account has been locked by an administrator. Contact ${ADMIN_CONTACT} to get it unlocked.`,
  banned: `This account has been permanently banned and can't be used to sign in.`,
  deleted: `This account's access has been removed. Contact ${ADMIN_CONTACT} if you believe this is a mistake.`,
};

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ locked: false });
  }
  const email = (body?.email || "").trim().toLowerCase();
  if (!email) return Response.json({ locked: false });

  try {
    const admin = getSupabaseAdmin();
    let match = null;
    for (let page = 1; page <= 20 && !match; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error) break;
      const batch = data?.users || [];
      match = batch.find((u) => (u.email || "").toLowerCase() === email) || null;
      if (batch.length < PAGE_SIZE) break;
    }
    if (!match) return Response.json({ locked: false });
    if (!isRealBan(match.banned_until)) return Response.json({ locked: false });

    // A real ban is in effect — look up account_moderation for which of
    // locked/banned/deleted it actually is, to pick the right message.
    // Falls back to the generic "locked" wording if that lookup somehow
    // comes back empty (e.g. a ban set by hand outside this app).
    const { data: modRow } = await admin.from("account_moderation").select("status").eq("user_id", match.id).maybeSingle();
    const status = modRow?.status && MESSAGES[modRow.status] ? modRow.status : "locked";
    return Response.json({ locked: true, status, message: MESSAGES[status] });
  } catch (err) {
    console.error("check-email-locked error:", err);
    // Fail closed toward the generic message, not toward alarming someone
    // who isn't actually locked.
    return Response.json({ locked: false });
  }
}
