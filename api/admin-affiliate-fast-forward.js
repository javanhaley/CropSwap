// POST /api/admin-affiliate-fast-forward
//
// TEMPORARY TEST-ONLY TOOL. Lets someone see the whole affiliate payout
// pipeline run end-to-end without actually waiting 31 real days: for every
// one of the CALLER'S OWN "pending" referrals, this does in one request
// everything that would otherwise take a month and two separate systems —
//   1. api/cron-affiliate-sweep.js's day-31 eligibility check, run right now
//      instead of waiting for eligible_check_at (same rule: the referred
//      account has to be on a live, paid ANNUAL plan today).
//   2. api/admin-affiliate-payouts.js's admin-approval step, run
//      automatically instead of waiting for a human to click Approve in
//      the CRM.
//   3. The actual Stripe transfer (api/_stripe.js's payoutReferral), IF
//      the affiliate has already finished Stripe Connect payout setup —
//      otherwise this ends at "approved, awaiting payout info," exactly
//      like a real admin approval would for an affiliate who hasn't set
//      that up yet. This never bypasses Connect onboarding — there's
//      nowhere for money to go without it.
//
// This is intentionally NOT the same admin gate as every other admin-*.js
// route (that requires being signed in as cropswapadmin@gmail.com
// specifically, which isn't who's signed in while testing a vendor
// account's own referral link). Instead it's restricted to the admin email
// OR one of the two designated test-vendor accounts (see
// TEST_ACCOUNT_SHOP_IDS in src/App.jsx — keep this list in sync with that
// one) — real customers' accounts can never reach this route, but whoever
// is testing with a test account can, without needing to also be logged in
// as the admin. DELETE THIS FILE (and its one button in src/App.jsx's
// AffiliateScreen) once the payout flow has been verified — it exists
// purely to make that one manual test fast.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";
import { getStripe, payoutReferral } from "./_stripe.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
// Buzzy Bee Farm, The Long Beach Peach — keep in sync with
// TEST_ACCOUNT_SHOP_IDS in src/App.jsx.
const TEST_ACCOUNT_SHOP_IDS = new Set(["shop_mt63gwqz_wscj5t", "shop_mtgq4fsp_7qzv2w"]);
const PAYOUT_CENTS = { basic: 3000, premium: 5000 };

export async function POST(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-affiliate-fast-forward: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user || !user.email) return Response.json({ error: "Not signed in" }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();

    const { data: callerProfileRow } = await admin.from("kv").select("value").eq("owner_id", user.id).eq("key", "me:profile").maybeSingle();
    let callerProfile = null;
    try {
      callerProfile = callerProfileRow?.value ? JSON.parse(callerProfileRow.value) : null;
    } catch {
      callerProfile = null;
    }
    const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const isTestAccount = !!callerProfile?.shopId && TEST_ACCOUNT_SHOP_IDS.has(callerProfile.shopId);
    if (!isAdmin && !isTestAccount) {
      return Response.json({ error: "This test tool is only available on designated test accounts" }, { status: 403 });
    }

    const { data: dueReferrals, error: refErr } = await admin
      .from("affiliate_referrals")
      .select("*")
      .eq("referrer_user_id", user.id)
      .eq("status", "pending");
    if (refErr) throw refErr;

    const { data: affiliate } = await admin
      .from("affiliates")
      .select("stripe_connect_account_id, payouts_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    let ineligible = 0;
    let approvedAwaitingPayout = 0;
    let paid = 0;
    let failed = 0;

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
        plan && (plan.tier === "basic" || plan.tier === "premium") && plan.billing === "annual" && plan.status === "active" && !plan.cancelledAt;

      if (!isLiveAnnualPaid) {
        await admin.from("affiliate_referrals").update({ status: "ineligible", updated_at: new Date().toISOString() }).eq("id", referral.id);
        ineligible += 1;
        continue;
      }

      const payoutAmountCents = PAYOUT_CENTS[plan.tier];
      const nowIso = new Date().toISOString();
      await admin
        .from("affiliate_referrals")
        .update({
          status: "approved",
          plan_tier: plan.tier,
          payout_amount_cents: payoutAmountCents,
          approved_at: nowIso,
          approved_by: `${user.email} (test fast-forward)`,
          updated_at: nowIso,
        })
        .eq("id", referral.id);

      if (affiliate?.payouts_enabled && affiliate?.stripe_connect_account_id) {
        const stripe = getStripe();
        const result = await payoutReferral(
          stripe,
          admin,
          { ...referral, payout_amount_cents: payoutAmountCents },
          affiliate.stripe_connect_account_id
        );
        if (result.paid) paid += 1;
        else failed += 1;
      } else {
        approvedAwaitingPayout += 1;
      }
    }

    return Response.json({
      processed: (dueReferrals || []).length,
      ineligible,
      approvedAwaitingPayout,
      paid,
      failed,
      payoutsReady: !!(affiliate?.payouts_enabled && affiliate?.stripe_connect_account_id),
    });
  } catch (err) {
    console.error("admin-affiliate-fast-forward error:", err);
    return Response.json({ error: "Couldn't fast-forward these referrals" }, { status: 500 });
  }
}
