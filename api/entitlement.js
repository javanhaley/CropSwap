// GET /api/entitlement
//
// The authoritative answer to "what plan is this account actually on?",
// derived from Stripe rather than from anything the browser sent.
//
// The app stores its plan on the user's own profile row, which that user can
// write — so a free account could simply set plan.tier = "premium" in its own
// row and keep every paid feature forever. The client now asks this endpoint
// on load and treats its answer as the truth, and this endpoint repairs the
// stored profile whenever the two disagree (which also self-heals a webhook
// that never landed).
//
// Note the honest limit of this: gating still HAPPENS in the browser, so
// someone determined can still patch their own JavaScript. What this removes
// is the durable, cross-device, no-tools-needed version of that — writing a
// tier into your own database row and having the whole app believe it.
import { getStripe, listLiveSubscriptions, tierFromPriceId } from "./_stripe.js";
import { getUserFromRequest, patchProfile } from "./_supabaseAdmin.js";

const FREE_PLAN = { tier: "free", billing: null, status: null, startedAt: null, periodEnd: null, cancelledAt: null, refundPct: null };

export async function GET(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("entitlement: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user || !user.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    const subs = customer ? await listLiveSubscriptions(stripe, customer.id) : [];
    // past_due counts as entitled: Stripe is still retrying a renewal that may
    // well succeed, and cutting a paying customer off mid-dunning is worse
    // than carrying them for a few days. incomplete/unpaid do not — nothing
    // was ever successfully collected on those.
    const sub = subs.find((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due") || null;
    // The PRICE attached to the subscription decides the tier, with the
    // subscription's own metadata as a fallback (same pair of sources the
    // webhook uses). Both can miss — a price archived or replaced in the
    // Stripe Dashboard, a grandfathered or promotional price that was never
    // added to PRICE_IDS — and when they do, the honest answer is "don't
    // know", NOT "free". Downgrading on a lookup miss would strip Premium
    // from a real subscriber on every device and write it to their profile,
    // while Stripe carried on billing them, with nothing to put it back.
    const priceId = sub?.items?.data?.[0]?.price?.id || null;
    const fromPrice = priceId ? tierFromPriceId(priceId) : null;
    const fromMetadata = sub?.metadata?.tier ? { tier: sub.metadata.tier, billing: sub.metadata.billing || null } : null;
    const resolved = fromPrice || fromMetadata;

    if (sub && !resolved) {
      console.error("entitlement: live subscription with unrecognised price", { subId: sub.id, priceId });
      return Response.json({ plan: null, unresolved: true });
    }

    const plan = sub
      ? {
          tier: resolved.tier,
          billing: resolved.billing,
          status: sub.status === "past_due" ? "past_due" : "active",
          startedAt: sub.metadata?.startedAtMs ? Number(sub.metadata.startedAtMs) : sub.created * 1000,
          periodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null,
          cancelledAt: null,
          refundPct: null,
        }
      : FREE_PLAN;

    // Best-effort reconciliation — the answer above is what the client uses
    // either way, so a write failure here must not fail the request.
    try {
      await patchProfile(user.id, { plan });
    } catch (err) {
      console.error("entitlement: profile reconcile failed:", err);
    }

    return Response.json({ plan });
  } catch (err) {
    console.error("entitlement error:", err);
    return Response.json({ error: "Couldn't verify plan" }, { status: 500 });
  }
}
