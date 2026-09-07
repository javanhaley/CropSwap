// POST /api/affiliate-track-signup
// body: { code }
//
// Called once, right after a brand-new account finishes onboarding (see
// createProfile's caller in src/App.jsx), if a pending referral code was
// captured from a /incentives/<code> link earlier in the browser (see
// AffiliateScreen / the RootShell pathname check for where that's stashed
// in localStorage and read back here). Records the referral; the actual
// payout eligibility isn't decided here — that's api/cron-affiliate-sweep.js,
// 31 days later, based on whatever plan this account is actually on then.
//
// Deliberately quiet about failures: a bad/stale code, a self-referral
// attempt, or a double-call (unique constraint on referred_user_id) should
// never block or error out a signup that already succeeded.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";

const ELIGIBILITY_WINDOW_DAYS = 31;

export async function POST(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("affiliate-track-signup: auth check failed:", err);
    return Response.json({ ok: false }, { status: 200 });
  }
  if (!user) return Response.json({ ok: false }, { status: 200 });

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  let code = (body?.code || "").trim().toLowerCase();
  // Fallback for the case the client-side stores (localStorage + the plain
  // JS-set cookie — see src/referral.js) both got wiped between the click
  // and the signup: cs_ref_srv is set by api/track-visit.js via a real
  // Set-Cookie response header, which survives things client-set storage
  // doesn't (Safari's 7-day cap on script-set cookies, "clear site data" in
  // some browsers' privacy modes). Read straight off the request here since
  // it's HttpOnly-equivalent in practice — no client JS ever touches it.
  if (!code) {
    try {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)cs_ref_srv=([^;]+)/);
      if (match) code = decodeURIComponent(match[1]).trim().toLowerCase();
    } catch {}
  }
  if (!code) return Response.json({ ok: false }, { status: 200 });

  try {
    const admin = getSupabaseAdmin();
    const { data: affiliate } = await admin.from("affiliates").select("user_id").eq("code", code).maybeSingle();
    if (!affiliate) return Response.json({ ok: false }, { status: 200 });
    if (affiliate.user_id === user.id) return Response.json({ ok: false }, { status: 200 }); // no self-referral payouts

    const nowMs = Date.now();
    const { error } = await admin.from("affiliate_referrals").insert({
      referrer_user_id: affiliate.user_id,
      referred_user_id: user.id,
      referred_email: (user.email || "").toLowerCase(),
      signed_up_at: new Date(nowMs).toISOString(),
      eligible_check_at: new Date(nowMs + ELIGIBILITY_WINDOW_DAYS * 86400000).toISOString(),
      status: "pending",
    });
    // A unique-violation here just means this account already has a
    // referral on file (e.g. a duplicate call) — not worth surfacing.
    if (error && error.code !== "23505") throw error;
    return Response.json({ ok: !error });
  } catch (err) {
    console.error("affiliate-track-signup error:", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}
