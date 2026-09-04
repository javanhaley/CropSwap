// GET /api/admin-billing-summary
//
// Platform-wide revenue snapshot for the Admin Dashboard's company-health
// tiles (MRR, active paying users, last-30-day revenue). Sourced LIVE from
// Stripe rather than reconstructed from our own KV store — CropSwap doesn't
// keep its own transaction ledger, so Stripe subscriptions/charges are the
// only trustworthy source for these numbers. Same admin gate as
// /api/admin-users.
import { getUserFromRequest } from "./_supabaseAdmin.js";
import { getStripe, PRICE_IDS } from "./_stripe.js";

// Keep in sync with ADMIN_EMAIL in src/App.jsx.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";

function tierBillingFromPriceId(priceId) {
  for (const tier of Object.keys(PRICE_IDS)) {
    for (const billing of Object.keys(PRICE_IDS[tier])) {
      if (PRICE_IDS[tier][billing] === priceId) return { tier, billing };
    }
  }
  return { tier: "unknown", billing: "unknown" };
}

export async function GET(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-billing-summary: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user || !user.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: "Not authorised" }, { status: 403 });
  }

  try {
    const stripe = getStripe();

    // Every subscription that's still a live billing relationship —
    // mirrors LIVE_SUB_STATUSES' intent in _stripe.js, but "paused" and
    // "unpaid"/"incomplete" aren't counted toward MRR since they aren't
    // reliably collecting revenue right now.
    const LIVE = new Set(["active", "trialing", "past_due"]);
    let subs = [];
    let startingAfter;
    for (let page = 0; page < 20; page++) {
      const batch = await stripe.subscriptions.list({ status: "all", limit: 100, starting_after: startingAfter });
      subs = subs.concat(batch.data.filter((s) => LIVE.has(s.status)));
      if (!batch.has_more) break;
      startingAfter = batch.data[batch.data.length - 1]?.id;
    }

    let mrr = 0;
    const byTier = { basic: { monthly: 0, annual: 0 }, premium: { monthly: 0, annual: 0 }, unknown: { monthly: 0, annual: 0 } };
    subs.forEach((s) => {
      const price = s.items?.data?.[0]?.price;
      const amount = (price?.unit_amount || 0) / 100;
      const { tier, billing } = tierBillingFromPriceId(price?.id);
      if (!byTier[tier]) byTier[tier] = { monthly: 0, annual: 0 };
      byTier[tier][billing] = (byTier[tier][billing] || 0) + 1;
      mrr += billing === "annual" ? amount / 12 : amount;
    });

    // Last 30 days of actual collected revenue (paid, not refunded) —
    // subscriptions plus one-off charges alike, paginated.
    const since30d = Math.floor((Date.now() - 30 * 86400000) / 1000);
    let revenue30d = 0;
    let chargeCount = 0;
    let hasMore = true;
    let after;
    for (let page = 0; page < 20 && hasMore; page++) {
      const batch = await stripe.charges.list({ created: { gte: since30d }, limit: 100, starting_after: after });
      batch.data.forEach((c) => {
        if (c.paid && !c.refunded) {
          revenue30d += c.amount / 100;
          chargeCount += 1;
        }
      });
      hasMore = batch.has_more;
      after = batch.data[batch.data.length - 1]?.id;
    }

    return Response.json({
      activeSubscriptions: subs.length,
      mrr: Math.round(mrr * 100) / 100,
      byTier,
      revenue30d: Math.round(revenue30d * 100) / 100,
      chargeCount30d: chargeCount,
    });
  } catch (err) {
    console.error("admin-billing-summary error:", err);
    return Response.json({ error: "Couldn't load billing summary" }, { status: 500 });
  }
}
