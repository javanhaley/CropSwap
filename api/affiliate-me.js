// GET /api/affiliate-me
//
// Backs the "Your Affiliate Link" section (AccountModal + the dedicated
// /incentives screen). Lazily creates the caller's affiliate code and row
// the first time they open it — nobody has to "sign up" for the program
// separately. Returns everything that screen needs in one call: the code,
// the full cropswapmarket.com/incentives/<code> link, Stripe Connect
// payout-readiness, and every referral this person has generated with its
// current status.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";

const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://cropswapmarket.com";

function slugFromName(name) {
  const base = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16);
  return base || "grower";
}

async function ensureAffiliate(admin, userId, name) {
  const { data: existing } = await admin.from("affiliates").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing;

  const base = slugFromName(name);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = attempt === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
    const { data: inserted, error } = await admin
      .from("affiliates")
      .insert({ user_id: userId, code })
      .select("*")
      .maybeSingle();
    if (!error && inserted) return inserted;
    // A unique-constraint violation on `code` just means try again with a
    // different suffix; anything else is a real failure worth surfacing.
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Couldn't generate a unique affiliate code");
}

const PAYOUT_CENTS = { basic: 3000, premium: 5000 };

export async function GET(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("affiliate-me: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data: profileRow } = await admin.from("kv").select("value").eq("owner_id", user.id).eq("key", "me:profile").maybeSingle();
    const profile = profileRow?.value ? JSON.parse(profileRow.value) : null;

    const affiliate = await ensureAffiliate(admin, user.id, profile?.name);

    const { data: referralRows, error: refErr } = await admin
      .from("affiliate_referrals")
      .select("id, referred_user_id, referred_email, signed_up_at, eligible_check_at, status, plan_tier, payout_amount_cents, approved_at, paid_at")
      .eq("referrer_user_id", user.id)
      .order("signed_up_at", { ascending: false });
    if (refErr) throw refErr;

    // A still-"pending" row (day-31 check hasn't run yet) has no
    // payout_amount_cents on file — that column is only ever set once the
    // cron sweep or an admin approval confirms the tier. But a referrer who
    // sees a brand-new referral already sitting on a live, paid annual plan
    // reasonably expects to see that reflected as pending money right away,
    // not a flat $0 for a full month. So for pending rows only, look up the
    // referred account's CURRENT profile and estimate what day 31 would pay
    // out if their plan holds — same eligibility rule cron-affiliate-sweep.js
    // uses (live, paid, ANNUAL billing). This is only an estimate: it can
    // still change or fall through to "ineligible" if they downgrade or
    // cancel before day 31, which is exactly why the real payout_amount_cents
    // is never set this early.
    const pendingUserIds = [...new Set((referralRows || []).filter((r) => r.status === "pending" && r.referred_user_id).map((r) => r.referred_user_id))];
    const profileByUserId = {};
    if (pendingUserIds.length) {
      const { data: profileRows } = await admin.from("kv").select("owner_id, value").eq("key", "me:profile").in("owner_id", pendingUserIds);
      for (const row of profileRows || []) {
        try {
          profileByUserId[row.owner_id] = row.value ? JSON.parse(row.value) : null;
        } catch {
          profileByUserId[row.owner_id] = null;
        }
      }
    }
    function estimatePendingPayoutCents(referredUserId) {
      const plan = profileByUserId[referredUserId]?.plan;
      const isLiveAnnualPaid = plan && (plan.tier === "basic" || plan.tier === "premium") && plan.billing === "annual" && plan.status === "active" && !plan.cancelledAt;
      return isLiveAnnualPaid ? PAYOUT_CENTS[plan.tier] : 0;
    }

    const referrals = (referralRows || []).map((r) => ({
      id: r.id,
      // Masked — the referrer doesn't need the referred person's full
      // address, just enough to recognize who it was.
      email: maskEmail(r.referred_email),
      signedUpAt: r.signed_up_at ? new Date(r.signed_up_at).getTime() : null,
      eligibleCheckAt: r.eligible_check_at ? new Date(r.eligible_check_at).getTime() : null,
      status: r.status,
      planTier: r.plan_tier,
      payoutAmountCents: r.payout_amount_cents,
      estimatedPayoutCents: r.status === "pending" ? estimatePendingPayoutCents(r.referred_user_id) || null : null,
      approvedAt: r.approved_at ? new Date(r.approved_at).getTime() : null,
      paidAt: r.paid_at ? new Date(r.paid_at).getTime() : null,
    }));

    // "Pending" covers the whole in-progress lifecycle from the referrer's
    // point of view: a brand-new signup still counting down to day 31
    // ("pending"), and one that's already cleared that check and is
    // waiting on admin approval or an approved-but-not-yet-paid transfer
    // ("eligible_awaiting_approval" / "approved"). The latter two always
    // have a known payout_amount_cents (set once the cron sweep or an admin
    // approval confirms the tier); a fresh "pending" row falls back to its
    // live estimate above so it isn't shown as $0 while someone's paid
    // annual subscription is sitting right there.
    const totals = referrals.reduce(
      (acc, r) => {
        if (r.status === "pending" || r.status === "eligible_awaiting_approval" || r.status === "approved") {
          acc.pendingCount += 1;
          acc.pendingCents += r.payoutAmountCents || r.estimatedPayoutCents || 0;
        } else if (r.status === "paid") {
          acc.paidCount += 1;
          acc.paidCents += r.payoutAmountCents || 0;
        }
        return acc;
      },
      { pendingCount: 0, pendingCents: 0, paidCount: 0, paidCents: 0 }
    );

    return Response.json({
      code: affiliate.code,
      link: `${SITE_ORIGIN}/incentives/${affiliate.code}`,
      payoutsEnabled: !!affiliate.payouts_enabled,
      hasConnectAccount: !!affiliate.stripe_connect_account_id,
      payoutRates: { basic: PAYOUT_CENTS.basic / 100, premium: PAYOUT_CENTS.premium / 100 },
      totals,
      referrals,
    });
  } catch (err) {
    console.error("affiliate-me error:", err);
    return Response.json({ error: "Couldn't load your affiliate info" }, { status: 500 });
  }
}

function maskEmail(email) {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - visible.length))}@${domain}`;
}
