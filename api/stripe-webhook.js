// POST /api/stripe-webhook — registered in the Stripe Dashboard
// (Developers > Webhooks), listening for checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted, and (new,
// for the affiliate program's Connect payouts — this event needs to be
// added to the webhook's event list in the Stripe Dashboard for the
// account.updated handler below to ever actually fire) account.updated.
//
// This is the source of truth for billing state: create-checkout-session
// and cancel-subscription also write the profile directly (so the person
// who just paid/cancelled sees it reflected instantly, without waiting on
// a webhook round trip), but this handler is what keeps things correct for
// everything that can happen OUTSIDE those two code paths — a card that
// fails on renewal, a subscription cancelled from the Stripe Dashboard
// instead of the app, Stripe's own retry logic, etc. Every write here is
// idempotent (patchShopBillingStatusForUser no-ops if already correct), so
// it's safe for this to run again for the same event.
import { getStripe, tierFromPriceId, payoutReferral } from "./_stripe.js";
import { getSupabaseAdmin, patchProfile, patchShopBillingStatusForUser } from "./_supabaseAdmin.js";

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("stripe-webhook: STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  // Signature verification needs the exact raw bytes Stripe sent — request
  // is the Web-standard Request object, so .text() hands back the
  // unmodified body with nothing having parsed or re-serialized it first.
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("stripe-webhook: signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await applyActiveSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        if (subscription.status === "active" || subscription.status === "trialing") {
          await applyActiveSubscription(subscription);
        } else if (["canceled", "unpaid", "incomplete_expired"].includes(subscription.status)) {
          await applyCancelledSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.deleted": {
        await applyCancelledSubscription(event.data.object);
        break;
      }
      case "account.updated": {
        await applyConnectAccountUpdate(stripe, event.data.object);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`stripe-webhook: failed handling ${event.type}:`, err);
    // A non-2xx tells Stripe to retry this event later instead of dropping it.
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}

async function applyActiveSubscription(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  const item = subscription.items.data[0];
  const fallback = tierFromPriceId(item.price.id);
  const tier = subscription.metadata?.tier || fallback?.tier || null;
  const billing = subscription.metadata?.billing || fallback?.billing || (item.price.recurring?.interval === "year" ? "annual" : "monthly");
  const startedAt = subscription.metadata?.startedAtMs ? Number(subscription.metadata.startedAtMs) : subscription.current_period_start * 1000;

  await patchProfile(userId, {
    plan: {
      tier,
      billing,
      status: "active",
      startedAt,
      periodEnd: subscription.current_period_end * 1000,
      cancelledAt: null,
      refundPct: null,
    },
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    stripeSubscriptionId: subscription.id,
  });
  await patchShopBillingStatusForUser(userId, true);
}

async function applyCancelledSubscription(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  await patchProfile(userId, {
    plan: { tier: "free", billing: null, status: "cancelled", startedAt: null, periodEnd: null, cancelledAt: Date.now(), refundPct: null },
  });
  await patchShopBillingStatusForUser(userId, false);
}

// Fires whenever a Connect Express account's status changes — most
// importantly, the moment Stripe finishes verifying an affiliate's payout
// info and flips payouts_enabled from false to true. That's also exactly
// the moment any referral the admin already approved (but couldn't pay out
// yet, because this wasn't ready) becomes payable, so this both updates
// the affiliates row AND clears any backlog of approved-but-unpaid
// referrals for that person in the same pass.
async function applyConnectAccountUpdate(stripe, account) {
  const admin = getSupabaseAdmin();
  const userId = account.metadata?.userId;
  if (!userId) return; // not one of ours (or missing metadata) — ignore
  const payoutsEnabled = !!account.payouts_enabled;

  const { error: updateErr } = await admin
    .from("affiliates")
    .update({ payouts_enabled: payoutsEnabled, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (updateErr) throw updateErr;
  if (!payoutsEnabled) return;

  const { data: pending, error: pendingErr } = await admin
    .from("affiliate_referrals")
    .select("id, payout_amount_cents")
    .eq("referrer_user_id", userId)
    .eq("status", "approved");
  if (pendingErr) throw pendingErr;

  for (const referral of pending || []) {
    await payoutReferral(stripe, admin, referral, account.id);
  }
}
