// POST /api/check-email-locked
// body: { email }
//
// Public, unauthenticated on purpose — there's no session yet at the sign-in
// screen. AuthGate calls this only after a sign-in attempt has already
// failed, to tell a locked-out person that clearly instead of leaving them
// staring at a generic "Invalid login credentials" that reads identically
// to a typo'd password (Supabase Auth doesn't distinguish the two on a
// signInWithPassword call — a banned account fails the same generic way a
// wrong password does; the "user_banned" error code only shows up on token
// refresh, which is no help here since there's no session to refresh yet).
//
// Deliberately returns the SAME {locked:false} shape for "no account with
// this email" and "account exists but isn't locked" — it never reveals
// whether an email has an account at all, only whether an existing,
// already-admin-locked account matches it. Same non-enumeration posture as
// the forgot-password flow.
import { getSupabaseAdmin } from "./_supabaseAdmin.js";

const PAGE_SIZE = 1000;

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

    // Same "real future timestamp within 50 years" check as
    // admin-directory.js / admin-user-detail.js — Supabase represents "not
    // banned" with a far-future sentinel that still parses as a valid date.
    const bannedUntilMs = match.banned_until ? new Date(match.banned_until).getTime() : null;
    const now = Date.now();
    const locked = !!bannedUntilMs && bannedUntilMs > now && bannedUntilMs < now + 50 * 365 * 86400000;
    return Response.json({ locked });
  } catch (err) {
    console.error("check-email-locked error:", err);
    // Fail closed toward the generic message, not toward alarming someone
    // who isn't actually locked.
    return Response.json({ locked: false });
  }
}
