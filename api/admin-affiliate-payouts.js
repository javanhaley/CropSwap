// GET/POST /api/admin-affiliate-payouts
//
// GET lists every referral that's hit day 31 and is awaiting a decision
// (eligible_awaiting_approval), plus the recently approved/paid/failed ones
// for context. POST approves one — per the hybrid payout design, approving
// doesn't necessarily pay out immediately: if the affiliate has already
// finished Stripe Connect onboarding (payouts_enabled), the transfer fires
// right now; if not, it's marked "approved" and sits there until they set
// up payout info, at which point stripe-webhook.js's account.updated
// handler pays out the whole approved backlog automatically.
//
// Same admin gate as every other admin-*.js route.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";
import { getStripe, payoutReferral } from "./_stripe.js";

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
    console.error("admin-affiliate-payouts: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (gate.error) return gate.error;

  try {
    const admin = getSupabaseAdmin();
    const { data: rows, error } = await admin
      .from("affiliate_referrals")
      .select("id, referrer_user_id, referred_email, signed_up_at, status, plan_tier, payout_amount_cents, approved_at, paid_at, failure_reason")
      .in("status", ["eligible_awaiting_approval", "approved", "paid", "failed"])
      .order("signed_up_at", { ascending: false })
      .limit(300);
    if (error) throw error;

    // Referrer name/email + payout readiness, looked up in bulk rather than
    // per-row — same batching pattern as admin-directory.js.
    const referrerIds = [...new Set((rows || []).map((r) => r.referrer_user_id))];
    const { data: profileRows } = await admin.from("kv").select("owner_id, value").eq("key", "me:profile").in("owner_id", referrerIds);
    const profileByOwner = new Map();
    (profileRows || []).forEach((row) => {
      try {
        profileByOwner.set(row.owner_id, JSON.parse(row.value));
      } catch {
        /* skip */
      }
    });
    const { data: affiliateRows } = await admin.from("affiliates").select("user_id, code, payouts_enabled").in("user_id", referrerIds);
    const affiliateByOwner = new Map((affiliateRows || []).map((a) => [a.user_id, a]));

    const referrals = (rows || []).map((r) => {
      const profile = profileByOwner.get(r.referrer_user_id) || null;
      const affiliate = affiliateByOwner.get(r.referrer_user_id) || null;
      return {
        id: r.id,
        referrerUserId: r.referrer_user_id,
        referrerName: profile?.name || null,
        referrerEmail: profile?.email || null,
        affiliateCode: affiliate?.code || null,
        payoutsReady: !!affiliate?.payouts_enabled,
        referredEmail: r.referred_email,
        signedUpAt: r.signed_up_at ? new Date(r.signed_up_at).getTime() : null,
        status: r.status,
        planTier: r.plan_tier,
        payoutAmountCents: r.payout_amount_cents,
        approvedAt: r.approved_at ? new Date(r.approved_at).getTime() : null,
        paidAt: r.paid_at ? new Date(r.paid_at).getTime() : null,
        failureReason: r.failure_reason || null,
      };
    });

    return Response.json({ referrals });
  } catch (err) {
    console.error("admin-affiliate-payouts GET error:", err);
    return Response.json({ error: "Couldn't load payouts" }, { status: 500 });
  }
}

export async function POST(request) {
  let gate;
  try {
    gate = await requireAdmin(request);
  } catch (err) {
    console.error("admin-affiliate-payouts: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (gate.error) return gate.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const referralId = body?.referralId;
  if (!referralId) return Response.json({ error: "Missing referralId" }, { status: 400 });

  try {
    const admin = getSupabaseAdmin();
    const { data: referral, error: refErr } = await admin.from("affiliate_referrals").select("*").eq("id", referralId).maybeSingle();
    if (refErr || !referral) return Response.json({ error: "Referral not found" }, { status: 404 });
    if (referral.status !== "eligible_awaiting_approval") {
      return Response.json({ error: "This referral isn't awaiting approval" }, { status: 400 });
    }

    const { error: approveErr } = await admin
      .from("affiliate_referrals")
      .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: gate.adminUser.email, updated_at: new Date().toISOString() })
      .eq("id", referralId);
    if (approveErr) throw approveErr;

    const { data: affiliate } = await admin.from("affiliates").select("stripe_connect_account_id, payouts_enabled").eq("user_id", referral.referrer_user_id).maybeSingle();

    if (affiliate?.payouts_enabled && affiliate?.stripe_connect_account_id) {
      const stripe = getStripe();
      const result = await payoutReferral(stripe, admin, { ...referral, id: referralId }, affiliate.stripe_connect_account_id);
      return Response.json({ status: result.paid ? "paid" : "failed" });
    }

    return Response.json({ status: "approved", awaitingPayoutInfo: true });
  } catch (err) {
    console.error("admin-affiliate-payouts POST error:", err);
    return Response.json({ error: "Couldn't approve this payout" }, { status: 500 });
  }
}
