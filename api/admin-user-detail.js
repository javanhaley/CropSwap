// GET /api/admin-user-detail?userId=...
//
// Single-account deep-dive behind the Admin Dashboard's user detail page:
// real email, signup + last-sign-in time, plan/billing state, and payment
// history pulled LIVE from Stripe. CropSwap doesn't keep its own transaction
// ledger (see plan.tier/status on the profile — that's current-state only),
// so Stripe is the only accurate source for "what did this person pay, and
// when." Same admin gate as /api/admin-users: the caller's verified token
// email must match ADMIN_EMAIL before anything about another account is
// returned.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";
import { getStripe } from "./_stripe.js";

// Keep in sync with ADMIN_EMAIL in src/App.jsx.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";

export async function GET(request) {
  let adminUser;
  try {
    adminUser = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-user-detail: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!adminUser || !adminUser.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  // The email on the verified access token, not one the client claimed.
  if (adminUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: "Not authorised" }, { status: 403 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return Response.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Auth-side facts: the real email, exact signup time, exact last sign-in.
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
    if (authErr || !authData?.user) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    const authUser = authData.user;

    // The private profile row — same text-column JSON.parse pattern as
    // patchProfile() in _supabaseAdmin.js (the `value` column is TEXT, not
    // jsonb; the client's own getJSON/setJSON wrappers stringify/parse it).
    const { data: profileRow } = await admin
      .from("kv")
      .select("value")
      .eq("owner_id", userId)
      .eq("key", "me:profile")
      .maybeSingle();
    const profile = profileRow?.value ? JSON.parse(profileRow.value) : null;

    // Shop name + location, for a vendor account — same shared market row
    // the client's own StoreScreen/Admin Dashboard read.
    let shop = null;
    if (profile?.shopId) {
      const { data: marketRow } = await admin.from("shared_kv").select("value").eq("key", "market:v7").maybeSingle();
      try {
        const shops = marketRow?.value ? JSON.parse(marketRow.value)?.shops || [] : [];
        shop = shops.find((s) => s.id === profile.shopId) || null;
      } catch {
        shop = null;
      }
    }

    // Lock status lives on the Supabase Auth user itself (see
    // admin-set-account-lock.js) — a real ban, not a flag on the profile.
    const bannedUntilMs = authUser.banned_until ? new Date(authUser.banned_until).getTime() : null;
    const now = Date.now();
    const locked = !!bannedUntilMs && bannedUntilMs > now && bannedUntilMs < now + 50 * 365 * 86400000;

    // Real receipts, straight from Stripe — nothing here is reconstructed
    // from our own storage, so it can't drift out of sync with what was
    // actually charged.
    let invoices = [];
    const stripeCustomerId = profile?.stripeCustomerId || null;
    if (stripeCustomerId) {
      try {
        const stripe = getStripe();
        const list = await stripe.invoices.list({ customer: stripeCustomerId, limit: 50 });
        invoices = list.data.map((inv) => ({
          id: inv.id,
          amountPaid: inv.amount_paid / 100,
          currency: inv.currency,
          status: inv.status, // "paid" | "open" | "void" | "uncollectible" | "draft"
          created: inv.created * 1000,
          description: inv.lines?.data?.[0]?.description || inv.description || "CropSwap subscription",
          hostedInvoiceUrl: inv.hosted_invoice_url || null,
          invoicePdf: inv.invoice_pdf || null,
        }));
      } catch (stripeErr) {
        // Don't fail the whole page over a Stripe hiccup — just show no
        // payment history rather than a broken screen.
        console.error("admin-user-detail: stripe lookup failed:", stripeErr);
      }
    }

    return Response.json({
      id: authUser.id,
      email: authUser.email || null,
      name: profile?.name || null,
      createdAt: authUser.created_at ? new Date(authUser.created_at).getTime() : null,
      lastSignInAt: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).getTime() : null,
      plan: profile?.plan || null,
      billingProfile: profile?.billingProfile || null,
      phone: profile?.billingProfile?.phone || null,
      homeLabel: profile?.homeLocation?.label || null,
      isVendor: !!profile?.isVendor,
      shopId: profile?.shopId || null,
      shopName: shop?.name || null,
      city: shop?.city || null,
      state: shop?.state || null,
      country: shop?.country || null,
      locked,
      bannedUntil: bannedUntilMs,
      hasStripeCustomer: !!stripeCustomerId,
      invoices,
    });
  } catch (err) {
    console.error("admin-user-detail error:", err);
    return Response.json({ error: "Couldn't load account" }, { status: 500 });
  }
}
