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
