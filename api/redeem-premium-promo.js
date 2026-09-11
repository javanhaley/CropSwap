// POST /api/redeem-premium-promo
//
// The launch promo behind the Plans page's "Congratulations" popup: grants
// a full 12-month Premium plan directly, with zero Stripe involvement — no
// checkout session, no card. Real checkout has too much friction for early
// signups right now, so this is the deliberate bypass while that's true.
//
// Deliberately has NO headcount cap — every signed-in account that clicks
// Choose Premium gets the grant, whether that's 5 people or 500 in a
// single afternoon. The popup's own copy still says "1st 5 shop owners"
// (see PremiumPromoModal in src/App.jsx) because that's the framing that
// was asked for, but it's just copy now, not an enforced limit — don't
// wire a count-based check back in without updating that comment too.
// The only real on/off switch is the `enabled` flag on the shared_kv row
// below (PROMO_KEY), flippable with a single SQL update any time the
// promo should stop — no code change or redeploy needed:
//   update shared_kv set value = jsonb_set(value::jsonb, '{enabled}', 'false')::text where key = 'promo:free_premium_launch';
// (or, if the row doesn't exist yet: insert into shared_kv (key, value) values ('promo:free_premium_launch', '{"enabled":false,"redeemedUserIds":[]}'))
// `redeemedUserIds` is kept purely as a record of who's claimed it (handy
// to glance at, and it makes a double-click/reopen idempotent) — it is
// never compared against a limit.
//
// Writes plan.manualGrant: true, the same marker admin-grant-plan.js uses,
// so entitlement.js's Stripe-derived reconciliation leaves this alone
// instead of silently finding "no real subscription" and overwriting it —
// see entitlement.js for the full reasoning. A real Stripe event still
// takes back over correctly later if this account ever does go through
// actual checkout, since patchProfile replaces `plan` wholesale.
import { getSupabaseAdmin, getUserFromRequest, patchProfile, patchShopBillingStatusForUser } from "./_supabaseAdmin.js";

const PROMO_KEY = "promo:free_premium_launch";
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

    let state = { enabled: true, redeemedUserIds: [] };
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value);
        if (parsed && typeof parsed === "object") state = { enabled: true, redeemedUserIds: [], ...parsed };
      } catch {
        // Corrupt row — start fresh rather than fail the whole request.
      }
    }
    if (!Array.isArray(state.redeemedUserIds)) state.redeemedUserIds = [];

    // The only gate left: has this been turned off on purpose? Absent or
    // anything other than `false` means it's still on — a missing row (the
    // very first redemption ever) defaults to enabled so the promo works
    // out of the box with nothing to seed first.
    if (state.enabled === false) {
      return Response.json({ error: "This offer has ended — free Premium signups are closed for now.", available: false }, { status: 409 });
    }

    // Idempotent — a double-click or someone reopening the popup after
    // already claiming it just re-affirms the same grant rather than
    // erroring or double-recording them.
    const alreadyRedeemed = state.redeemedUserIds.includes(user.id);
    if (!alreadyRedeemed) {
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
