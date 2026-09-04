// GET /api/admin-directory
//
// The full account directory behind the Admin Dashboard's CRM — every real
// account in one call, enriched with everything a filterable/sortable
// directory needs: name, shop, email, phone, city/state/country, plan,
// join date, and lock status. The app's own storage has no "list all X with
// a filter" query (see storage.js — kv only supports exact-key get/set), so
// this reads straight from Postgres with the service-role key instead of
// trying to retrofit that into the shared_kv blobs the client uses. Same
// admin gate as /api/admin-users.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
const PAGE_SIZE = 1000;

export async function GET(request) {
  let adminUser;
  try {
    adminUser = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-directory: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!adminUser || !adminUser.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (adminUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: "Not authorised" }, { status: 403 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Every auth account — real email, signup time, last sign-in, and ban
    // status (a banned_until in the future is what "locked" means; the
    // lock/unlock action just sets or clears this via Supabase Auth itself,
    // so it's enforced at the token level, not just a flag in our own data).
    const authUsers = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error) throw error;
      const batch = data?.users || [];
      authUsers.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }

    // Every private profile row in one query — the owner_id column is what
    // ties it back to the auth user above.
    const { data: profileRows, error: profileErr } = await admin.from("kv").select("owner_id, value").eq("key", "me:profile");
    if (profileErr) throw profileErr;
    const profileByOwner = new Map();
    (profileRows || []).forEach((row) => {
      try {
        profileByOwner.set(row.owner_id, JSON.parse(row.value));
      } catch {
        /* skip a row that somehow isn't valid JSON rather than failing the whole directory */
      }
    });

    // The platform-wide shop list, for shop name / city / state / country on
    // vendor accounts — same shared_kv row the app's own Admin Dashboard and
    // StoreScreen already read, just fetched directly with the service role
    // here instead of through the client SDK.
    const { data: marketRow } = await admin.from("shared_kv").select("value").eq("key", "market:v7").maybeSingle();
    let shops = [];
    try {
      shops = marketRow?.value ? JSON.parse(marketRow.value)?.shops || [] : [];
    } catch {
      shops = [];
    }
    const shopByOwner = new Map(shops.map((s) => [s.ownerId, s]));

    const now = Date.now();
    const users = authUsers.map((u) => {
      const profile = profileByOwner.get(u.id) || null;
      const shop = shopByOwner.get(u.id) || null;
      const bannedUntil = u.banned_until ? new Date(u.banned_until).getTime() : null;
      // Supabase represents "not banned" with a far-future sentinel
      // ("none") that still parses as a valid (huge) date — only trust it
      // as a lock if that date is in the future AND not implausibly distant
      // the way "none" would be after Date parsing quirks; simplest robust
      // check is just: is it a real future timestamp within, say, 50 years.
      const locked = !!bannedUntil && bannedUntil > now && bannedUntil < now + 50 * 365 * 86400000;
      return {
        id: u.id,
        email: u.email || null,
        name: profile?.name || null,
        avatar: profile?.avatar || null,
        createdAt: u.created_at ? new Date(u.created_at).getTime() : null,
        lastSignInAt: u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null,
        isVendor: !!profile?.isVendor,
        shopId: profile?.shopId || null,
        shopName: shop?.name || null,
        city: shop?.city || profile?.homeLocation?.label?.split(",")?.[0]?.trim() || null,
        state: shop?.state || null,
        country: shop?.country || null,
        phone: profile?.billingProfile?.phone || null,
        planTier: profile?.plan?.tier || "free",
        locked,
      };
    });

    return Response.json({ users });
  } catch (err) {
    console.error("admin-directory error:", err);
    return Response.json({ error: "Couldn't load the directory" }, { status: 500 });
  }
}
