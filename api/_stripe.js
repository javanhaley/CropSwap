// Shared Stripe client + price catalog for the api/*.js billing functions.
// A leading underscore keeps Vercel from deploying this file itself as a
// route — it's a plain module the real endpoints import from.
import Stripe from "stripe";

let cachedStripe = null;
export function getStripe() {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY env var");
  cachedStripe = new Stripe(key);
  return cachedStripe;
}

// The four real recurring Prices created in the Stripe Dashboard for
// CropSwap's two paid tiers. Keep these in sync with PLAN_CATALOG in
// src/App.jsx (same dollar amounts, just referenced by Stripe's price ID
// here instead of a hardcoded number).
export const PRICE_IDS = {
  basic: {
    monthly: "price_1UANSxPS7a21IDFmyDksBdOW", // $10/mo
    annual: "price_1UANSxPS7a21IDFmAF41miT4", // $70/yr
  },
  premium: {
    monthly: "price_1UANmePS7a21IDFmelvmtdap", // $15/mo
    annual: "price_1UANnGPS7a21IDFmuXuSRivl", // $100/yr
  },
};

// Every subscription status that still represents a live billing
// relationship — one that can charge the customer again, or is waiting on a
// payment that might yet succeed. Anything not listed here (canceled,
// incomplete_expired) is terminal and safe to ignore.
//
// Listing subscriptions with `status: "active"` — which both billing routes
// used to do — silently misses every one of the others. A renewal that fails
// moves a subscription to past_due while Stripe retries it, so an "active"
// lookup found nothing: cancelling reported success without cancelling
// anything in Stripe (the retry then succeeded and billed a customer whose
// app said Free), and upgrading created a SECOND subscription on the same
// customer instead of updating the one already there.
const LIVE_SUB_STATUSES = new Set(["active", "past_due", "trialing", "unpaid", "incomplete", "paused"]);
// The subset that can be repriced in place. An incomplete/unpaid subscription
// has no settled payment behind it, so it's cancelled and replaced with a
// fresh Checkout rather than silently switched to a different price.
const UPDATABLE_SUB_STATUSES = new Set(["active", "past_due", "trialing"]);

// All of a customer's live subscriptions, newest first. Fetches every status
// (`status: "all"`) and filters locally, since Stripe's list endpoint only
// takes one status at a time.
export async function listLiveSubscriptions(stripe, customerId) {
  if (!customerId) return [];
  const all = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  return all.data.filter((s) => LIVE_SUB_STATUSES.has(s.status)).sort((a, b) => b.created - a.created);
}

export function isUpdatableSubscription(sub) {
  return !!sub && UPDATABLE_SUB_STATUSES.has(sub.status);
}

// Cancels a list of subscriptions, tolerating one that's already gone (a
// concurrent cancel, or a webhook that beat us to it) so a stale id can't
// fail the whole request.
export async function cancelSubscriptions(stripe, subs) {
  const cancelled = [];
  for (const s of subs) {
    try {
      await stripe.subscriptions.cancel(s.id);
      cancelled.push(s.id);
    } catch (err) {
      if (err?.code === "resource_missing" || err?.raw?.code === "resource_missing") continue;
      throw err;
    }
  }
  return cancelled;
}

// Reverse lookup used by the webhook as a fallback in case a subscription's
// metadata is ever missing tier/billing (e.g. someone edits it by hand in
// the Stripe Dashboard) — the price actually attached to the subscription
// is still authoritative.
export function tierFromPriceId(priceId) {
  for (const tier of Object.keys(PRICE_IDS)) {
    for (const billing of Object.keys(PRICE_IDS[tier])) {
      if (PRICE_IDS[tier][billing] === priceId) return { tier, billing };
    }
  }
  return null;
}

// Attempts the actual money movement for one approved affiliate referral —
// shared by admin-affiliate-payouts.js (an admin approving one right now,
// with payout info already on file) and stripe-webhook.js's account.updated
// handler (a backlog of already-approved referrals becoming payable the
// moment an affiliate finishes Connect onboarding). Always ends with the
// referral in "paid" or "failed" — never left silently "approved" after
// this was actually attempted, so nothing needs a human to notice a quiet
// half-done transfer.
export async function payoutReferral(stripe, admin, referral, connectAccountId) {
  try {
    const transfer = await stripe.transfers.create({
      amount: referral.payout_amount_cents,
      currency: "usd",
      destination: connectAccountId,
      metadata: { referralId: String(referral.id) },
    });
    await admin
      .from("affiliate_referrals")
      .update({ status: "paid", paid_at: new Date().toISOString(), stripe_transfer_id: transfer.id, updated_at: new Date().toISOString() })
      .eq("id", referral.id);
    return { paid: true };
  } catch (err) {
    console.error(`payoutReferral: transfer failed for referral ${referral.id}:`, err);
    await admin
      .from("affiliate_referrals")
      .update({ status: "failed", failure_reason: err.message || "Transfer failed", updated_at: new Date().toISOString() })
      .eq("id", referral.id);
    return { paid: false, error: err.message };
  }
}
