// POST /api/create-checkout-session  { tier: "basic"|"premium", billing: "monthly"|"annual" }
//
// A brand-new (or lapsed-free) account gets a real Stripe Checkout Session
// URL to redirect to. An account that already has an active subscription
// gets that subscription updated in place instead (Stripe prorates
// automatically) — no second subscription is ever created for the same
// person, and no second trip through Checkout is needed since a card is
// already on file.
import { getStripe, PRICE_IDS } from "./_stripe.js";
import { getUserFromRequest, patchProfile, patchShopBillingStatusForUser } from "./_supabaseAdmin.js";

export async function POST(request) {
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

    const activeSubs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
    const currentSub = activeSubs.data[0];
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

    const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      subscription_data: { metadata },
      metadata,
      allow_promotion_codes: true,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return Response.json({ error: "Couldn't start checkout — please try again" }, { status: 500 });
  }
}
