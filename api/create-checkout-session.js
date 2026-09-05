// POST /api/create-checkout-session  { tier: "basic"|"premium", billing: "monthly"|"annual" }
//
// A brand-new (or lapsed-free) account gets a real Stripe Checkout Session
// URL to redirect to. An account that already has an active subscription
// gets that subscription updated in place instead (Stripe prorates
// automatically) — no second subscription is ever created for the same
// person, and no second trip through Checkout is needed since a card is
// already on file.
import { getStripe, PRICE_IDS, listLiveSubscriptions, isUpdatableSubscription, cancelSubscriptions } from "./_stripe.js";
import { getUserFromRequest, patchProfile, patchShopBillingStatusForUser } from "./_supabaseAdmin.js";

// ===== TEMP CHECKOUT BLOCK =====
// Real subscription checkout is fully wired up and working — this just
// pauses it while the account is still being tested end-to-end, so nobody
// (including a tester) can actually be charged a real card before it's
// time to go live on Stripe. This is the ONE authoritative gate: it's
// server-side, so it can't be bypassed by re-enabling the disabled button
// in the browser. src/App.jsx's CheckoutScreen has a matching flag purely
// for the on-screen message — search "CHECKOUT_TEMP_DISABLED" in both
// files and flip both to false (or delete both blocks) to go live.
const CHECKOUT_TEMP_DISABLED = true;

export async function POST(request) {
  if (CHECKOUT_TEMP_DISABLED) {
    return Response.json({ error: "Checkout is temporarily paused for testing — please check back soon." }, { status: 503 });
  }
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("create-checkout-session: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user || !user.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { tier, billing } = body || {};
  const priceId = PRICE_IDS[tier]?.[billing];
  if (!priceId) {
    return Response.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const stripe = getStripe();

    // Reuse an existing Stripe customer for this user rather than ever
    // creating a second one — keeps their receipts/card history in one place.
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customer = existingCustomers.data[0];
    if (!customer) {
      customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
    }

    // Includes past_due/trialing, not just active: skipping those is what let
    // a subscriber whose renewal was mid-retry buy a SECOND subscription on
    // the same customer and get billed for both.
    const liveSubs = await listLiveSubscriptions(stripe, customer.id);
    const currentSub = liveSubs.find(isUpdatableSubscription) || null;
    // Any plan change (tier, billing interval, or both) restarts the
    // "current paid term" for refund-window purposes, matching the app's
    // existing cancellation policy.
    const metadata = { userId: user.id, tier, billing, startedAtMs: String(Date.now()) };

    if (currentSub) {
      const itemId = currentSub.items.data[0].id;
      const updated = await stripe.subscriptions.update(currentSub.id, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
        metadata,
      });
      // One subscription per customer, always. Anything else still live here
      // is either an orphan left by the old "active"-only lookup or a stalled
      // incomplete attempt; either way it must not keep billing alongside the
      // one we just repriced.
      // Best-effort: the reprice above has already happened, so a failure to
      // tidy up an orphan must not fail the request and leave the profile
      // un-patched while Stripe has moved on.
      try {
        await cancelSubscriptions(stripe, liveSubs.filter((s) => s.id !== currentSub.id));
      } catch (err) {
        console.error("create-checkout-session: orphan cleanup failed:", err);
      }
      await patchProfile(user.id, {
        plan: {
          tier,
          billing,
          status: "active",
          startedAt: Date.now(),
          periodEnd: updated.current_period_end * 1000,
          cancelledAt: null,
          refundPct: null,
        },
        stripeCustomerId: customer.id,
        stripeSubscriptionId: updated.id,
      });
      await patchShopBillingStatusForUser(user.id, true);
      return Response.json({ updatedInPlace: true });
    }

    // Nothing repriceable, but there can still be a dead-weight subscription
    // (unpaid, or an incomplete attempt that was never paid) on this customer.
    // Clear it before Checkout so the new one is the only subscription they
    // have.
    await cancelSubscriptions(stripe, liveSubs);

    const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      subscription_data: { metadata },
      metadata,
      // Managed Payments is a Stripe feature for platforms that route money
      // between buyers and connected sellers (Connect-style marketplaces).
      // CropSwap only ever collects its own subscription fees, so this is
      // switched off — leaving it on would require every product to carry a
      // tax code it has no other use for.
      managed_payments: { enabled: false },
      allow_promotion_codes: true,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return Response.json({ error: "Couldn't start checkout — please try again" }, { status: 500 });
  }
}
