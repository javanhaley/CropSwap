// POST /api/affiliate-connect-onboarding
//
// Payouts to a third party aren't something Stripe can do onto a saved
// card — cards can only be CHARGED, never paid out to. Real third-party
// payouts need a Stripe Connect Express account (a lightweight,
// Stripe-hosted flow that collects the bank details + light identity
// verification Stripe requires before it'll move money to someone). This
// creates that Express account for the caller the first time they ask to
// get paid (see affiliate-me.js — hasConnectAccount / payoutsEnabled tell
// the client whether this is even needed yet), and returns a fresh,
// one-time-use onboarding link for them to complete it. Comes back to
// `return_url` either way; a webhook (see api/stripe-webhook.js's
// account.updated handler) is what actually flips payouts_enabled once
// Stripe finishes verifying them — polling affiliate-me.js from that
// return screen picks up the change.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";
import { getStripe } from "./_stripe.js";

const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://cropswapmarket.com";

export async function POST(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("affiliate-connect-onboarding: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data: affiliate } = await admin.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
    if (!affiliate) {
      return Response.json({ error: "Open your Affiliate Link page once first, then try again" }, { status: 400 });
    }

    const stripe = getStripe();
    let accountId = affiliate.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email || undefined,
        capabilities: { transfers: { requested: true } },
        business_type: "individual",
        metadata: { userId: user.id, affiliateCode: affiliate.code },
      });
      accountId = account.id;
      const { error: writeErr } = await admin
        .from("affiliates")
        .update({ stripe_connect_account_id: accountId, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (writeErr) throw writeErr;
    }

    const returnUrl = `${SITE_ORIGIN}/?screen=incentives&connect=return`;
    const refreshUrl = `${SITE_ORIGIN}/?screen=incentives&connect=refresh`;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return Response.json({ url: link.url });
  } catch (err) {
    console.error("affiliate-connect-onboarding error:", err);
    return Response.json({ error: "Couldn't start payout setup — try again in a moment" }, { status: 500 });
  }
}
