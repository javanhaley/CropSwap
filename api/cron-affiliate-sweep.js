// GET /api/cron-affiliate-sweep — runs daily via Vercel Cron (see
// vercel.json). Protected by CRON_SECRET (see checkCronAuth in
// _supabaseAdmin.js) so it can't be triggered by anyone else hitting the URL.
//
// Finds every referral whose 31-day eligibility window has passed and is
// still "pending", and decides, once, whether it's eligible: the referred
// person has to be on a live, paid ANNUAL subscription (Basic or Premium)
// right now for their referrer to get paid — if they cancelled or
// downgraded on or before day 30, nothing is owed. Eligible referrals move
// to "eligible_awaiting_approval" for the admin to review in the CRM
// (api/admin-affiliate-payouts.js); nothing is paid automatically here —
// the payout itself always requires that explicit admin approval.
import { getSupabaseAdmin, checkCronAuth } from "./_supabaseAdmin.js";

const PAYOUT_CENTS = { basic: 3000, premium: 5000 };
const BATCH_SIZE = 200;

export async function GET(request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  try {
    const admin = getSupabaseAdmin();
    const nowIso = new Date().toISOString();
    const { data: dueReferrals, error } = await admin
      .from("affiliate_referrals")
      .select("id, referred_user_id")
      .eq("status", "pending")
      .lte("eligible_check_at", nowIso)
      .limit(BATCH_SIZE);
    if (error) throw error;

    let eligible = 0;
    let ineligible = 0;

    for (const referral of dueReferrals || []) {
      const { data: profileRow } = await admin
        .from("kv")
        .select("value")
        .eq("owner_id", referral.referred_user_id)
        .eq("key", "me:profile")
        .maybeSingle();
      let profile = null;
      try {
        profile = profileRow?.value ? JSON.parse(profileRow.value) : null;
      } catch {
        profile = null;
      }

      const plan = profile?.plan;
      const isLiveAnnualPaid =
        plan &&
        (plan.tier === "basic" || plan.tier === "premium") &&
        plan.billing === "annual" &&
        plan.status === "active" &&
        !plan.cancelledAt;

      if (isLiveAnnualPaid) {
        const { error: updErr } = await admin
          .from("affiliate_referrals")
          .update({
            status: "eligible_awaiting_approval",
            plan_tier: plan.tier,
            payout_amount_cents: PAYOUT_CENTS[plan.tier],
            updated_at: new Date().toISOString(),
          })
          .eq("id", referral.id);
        if (updErr) throw updErr;
        eligible += 1;
      } else {
        const { error: updErr } = await admin
          .from("affiliate_referrals")
          .update({ status: "ineligible", updated_at: new Date().toISOString() })
          .eq("id", referral.id);
        if (updErr) throw updErr;
        ineligible += 1;
      }
    }

    return Response.json({ checked: (dueReferrals || []).length, eligible, ineligible });
  } catch (err) {
    console.error("cron-affiliate-sweep error:", err);
    return Response.json({ error: "Sweep failed" }, { status: 500 });
  }
}
