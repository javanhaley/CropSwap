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
import { getSupabaseAdmin, getUserFromRequest, notifyUserServer } from "./_supabaseAdmin.js";

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
    return Response.json({ ok: false }, { status: 200 });
  }
  const code = (body?.code || "").trim().toLowerCase();
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

    // Let the referrer know right away, rather than making them wait 31 days
    // for the eligibility sweep to surface anything. This is purely a "hey,
    // someone signed up" ping — it doesn't imply the referral is payable
    // yet, so it's sent regardless of what the sweep later decides.
    if (!error) {
      let referredName = null;
      try {
        const { data: profileRow } = await admin.from("kv").select("value").eq("owner_id", user.id).eq("key", "me:profile").maybeSingle();
        if (profileRow?.value) referredName = JSON.parse(profileRow.value)?.name || null;
      } catch {
        // Best-effort only — fall back to the email below.
      }
      const who = referredName || user.email || "Someone";
      await notifyUserServer(
        affiliate.user_id,
        "affiliate_signup",
        "New referral! \u{1F331}",
        `${who} just signed up using your invite link.`,
        { screen: "incentives" }
      ).catch((err) => console.error("affiliate-track-signup: notify failed:", err));
    }

    return Response.json({ ok: !error });
  } catch (err) {
    console.error("affiliate-track-signup error:", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}
