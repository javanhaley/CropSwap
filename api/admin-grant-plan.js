// POST /api/admin-grant-plan
// body: { userId, tier: "free"|"basic"|"premium", billing?: "monthly"|"annual" }
//
// TEST-ONLY TOOL: instantly grants (or revokes) a subscription on an
// account's profile WITHOUT touching Stripe at all — no checkout session,
// no card, no real charge. Exists so the whole "subscribe → do X → see the
// downstream effect" chain can be tested while real checkout is paused
// (CHECKOUT_TEMP_DISABLED in create-checkout-session.js) — the affiliate
// payout pipeline is the reason this was built: cron-affiliate-sweep.js
// needs a referred account to actually be on a live ANNUAL paid plan
// before it'll move that referral past "pending", and there was no way to
// get an account into that state without a real card. Remove this route
// (and its one entry point on the Admin User Detail screen) once real
// checkout goes live, since as it stands it's a free way to grant Premium.
//
// Writes the exact same profile.plan shape a real Stripe checkout/webhook
// would (see the patchProfile calls in create-checkout-session.js and
// stripe-webhook.js) — anything downstream that reads plan.tier/billing/
// status (ToolLock, the vendor dashboard, the affiliate sweep) can't tell
// the difference. Deliberately does NOT touch affiliate_referrals — a
// referral tied to this account still goes through the normal
// pending → eligible_awaiting_approval → approved → paid lifecycle
// exactly as it would for a real subscriber.
import { getUserFromRequest, patchProfile, patchShopBillingStatusForUser } from "./_supabaseAdmin.js";

// Keep in sync with ADMIN_EMAIL in src/App.jsx.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
const VALID_TIERS = new Set(["free", "basic", "premium"]);
const VALID_BILLING = new Set(["monthly", "annual"]);

export async function POST(request) {
  let adminUser;
  try {
    adminUser = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-grant-plan: auth check failed:", err);
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
  const { userId } = body || {};
  const tier = body?.tier;
  const billing = body?.billing || "annual";
  if (!userId || !VALID_TIERS.has(tier)) {
    return Response.json({ error: "Missing userId or invalid tier" }, { status: 400 });
  }
  if (tier !== "free" && !VALID_BILLING.has(billing)) {
    return Response.json({ error: "Invalid billing interval" }, { status: 400 });
  }

  try {
    if (tier === "free") {
      const updated = await patchProfile(userId, {
        plan: { tier: "free", billing: null, status: "canceled", startedAt: null, periodEnd: null, cancelledAt: Date.now(), refundPct: null },
      });
      if (!updated) return Response.json({ error: "Account has no profile yet" }, { status: 404 });
      await patchShopBillingStatusForUser(userId, false);
      return Response.json({ ok: true, plan: updated.plan });
    }

    const periodDays = billing === "annual" ? 365 : 30;
    const updated = await patchProfile(userId, {
      plan: {
        tier,
        billing,
        status: "active",
        startedAt: Date.now(),
        periodEnd: Date.now() + periodDays * 86400000,
        cancelledAt: null,
        refundPct: null,
      },
    });
    if (!updated) return Response.json({ error: "Account has no profile yet" }, { status: 404 });
    await patchShopBillingStatusForUser(userId, true);
    return Response.json({ ok: true, plan: updated.plan });
  } catch (err) {
    console.error("admin-grant-plan error:", err);
    return Response.json({ error: "Couldn't update this account's plan" }, { status: 500 });
  }
}
