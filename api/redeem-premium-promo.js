// POST /api/redeem-premium-promo
//
// The launch promo behind the Plans page's "Congratulations" popup: grants
// a full 12-month Premium plan directly, with zero Stripe involvement — no
// checkout session, no card. Real checkout has too much friction for early
// signups right now, so this is the deliberate bypass for the first
// several shop owners. Limited to a set number of redemptions, tracked in
// shared_kv (see PROMO_KEY below) rather than hardcoded, so the limit can
// be raised later with a single SQL update — no code change or redeploy
// needed to open up a few more free slots.
//
// Writes plan.manualGrant: true, the same marker admin-grant-plan.js uses,
// so entitlement.js's Stripe-derived reconciliation leaves this alone
// instead of silently finding "no real subscription" and overwriting it —
// see entitlement.js for the full reasoning. A real Stripe event still
// takes back over correctly later if this account ever does go through
// actual checkout, since patchProfile replaces `plan` wholesale.
import { getSupabaseAdmin, getUserFromRequest, patchProfile, patchShopBillingStatusForUser } from "./_supabaseAdmin.js";

const PROMO_KEY = "promo:free_premium_launch";
const DEFAULT_LIMIT = 5;
const GRANT_DAYS = 365;

export async function POST(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("redeem-premium-promo: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data: row, error: rowErr } = await admin.from("shared_kv").select("value").eq("key", PROMO_KEY).maybeSingle();
    if (rowErr) throw rowErr;

    let state = { limit: DEFAULT_LIMIT, redeemedUserIds: [] };
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value);
        if (parsed && typeof parsed === "object") state = { limit: DEFAULT_LIMIT, redeemedUserIds: [], ...parsed };
      } catch {
        // Corrupt row — start fresh rather than fail the whole request.
      }
    }
    if (!Array.isArray(state.redeemedUserIds)) state.redeemedUserIds = [];

    // Already redeemed — idempotent, just re-affirm the grant rather than
    // erroring (covers a double-click, or someone reopening the popup
    // after already claiming it).
    const alreadyRedeemed = state.redeemedUserIds.includes(user.id);
    if (!alreadyRedeemed) {
      if (state.redeemedUserIds.length >= state.limit) {
        return Response.json({ error: "This offer has ended — all the free spots have been claimed.", available: false }, { status: 409 });
      }
      state.redeemedUserIds.push(user.id);
      const { error: upsertErr } = await admin
        .from("shared_kv")
        .upsert({ key: PROMO_KEY, value: JSON.stringify(state), updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (upsertErr) throw upsertErr;
    }

    const updated = await patchProfile(user.id, {
      plan: {
        tier: "premium",
        billing: "annual",
        status: "active",
        startedAt: Date.now(),
        periodEnd: Date.now() + GRANT_DAYS * 86400000,
        cancelledAt: null,
        refundPct: null,
        manualGrant: true,
      },
    });
    if (!updated) return Response.json({ error: "Account has no profile yet" }, { status: 404 });
    await patchShopBillingStatusForUser(user.id, true);

    return Response.json({ ok: true, plan: updated.plan });
  } catch (err) {
    console.error("redeem-premium-promo error:", err);
    return Response.json({ error: "Couldn't claim this right now — please try again" }, { status: 500 });
  }
}
