// POST /api/cancel-subscription
//
// Cancels the caller's real Stripe subscription immediately (not at period
// end — CropSwap pulls paid features the moment someone cancels) and, if
// they're within the 30-day refund window of when they started this paid
// term, refunds 50% of the invoice that started it. Mirrors the exact
// policy the old test-mode cancelPlan() used to simulate.
import { getStripe } from "./_stripe.js";
import { getUserFromRequest, patchProfile, patchShopBillingStatusForUser } from "./_supabaseAdmin.js";

const REFUND_WINDOW_DAYS = 30;

export async function POST(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("cancel-subscription: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user || !user.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    const activeSubs = customer ? await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 }) : { data: [] };
    const sub = activeSubs.data[0];

    if (!sub) {
      // Nothing active on Stripe's side (already cancelled, or never
      // subscribed) — just make sure our own record agrees.
      await patchProfile(user.id, {
        plan: { tier: "free", billing: null, status: "cancelled", startedAt: null, periodEnd: null, cancelledAt: Date.now(), refundPct: null },
      });
      await patchShopBillingStatusForUser(user.id, false);
      return Response.json({ refundPct: 0 });
    }

    const startedAt = sub.metadata?.startedAtMs ? Number(sub.metadata.startedAtMs) : sub.created * 1000;
    const daysIn = Math.floor((Date.now() - startedAt) / 86400000);
    const refundPct = daysIn <= REFUND_WINDOW_DAYS ? 50 : 0;

    await stripe.subscriptions.cancel(sub.id);

    let refundedAmount = 0;
    if (refundPct > 0 && sub.latest_invoice) {
      const invoice = await stripe.invoices.retrieve(sub.latest_invoice);
      if (invoice.payment_intent && invoice.amount_paid > 0) {
        refundedAmount = Math.round(invoice.amount_paid * (refundPct / 100));
        await stripe.refunds.create({ payment_intent: invoice.payment_intent, amount: refundedAmount });
      }
    }

    await patchProfile(user.id, {
      plan: { tier: "free", billing: null, status: "cancelled", startedAt: null, periodEnd: null, cancelledAt: Date.now(), refundPct },
    });
    await patchShopBillingStatusForUser(user.id, false);

    return Response.json({ refundPct, refundedAmount });
  } catch (err) {
    console.error("cancel-subscription error:", err);
    return Response.json({ error: "Couldn't cancel — please try again" }, { status: 500 });
  }
}
