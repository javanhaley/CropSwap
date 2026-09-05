// Shared Supabase service-role client + profile/shop write helpers for the
// api/*.js billing functions. A leading underscore keeps Vercel from
// deploying this file itself as a route.
//
// This is the ONLY place in the whole project that uses the service-role
// key — it bypasses Row Level Security entirely, which is exactly what a
// webhook needs (there's no signed-in user making the request, Stripe is)
// but must never be exposed to the browser. It only ever lives as the
// SUPABASE_SERVICE_ROLE_KEY Vercel environment variable, never in client code.
import { createClient } from "@supabase/supabase-js";

let cachedAdmin = null;
export function getSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
  }
  cachedAdmin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return cachedAdmin;
}

// Verifies the Supabase access token a client sent in its Authorization
// header and returns the authenticated user, or null if missing/invalid.
// Every billing endpoint uses this instead of trusting a client-supplied
// user id, so nobody can start or cancel a subscription on someone else's
// account just by editing a request body.
export async function getUserFromRequest(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Merges `patch` into a user's stored profile and writes it to both the
// private `kv` row and the public `shared_kv` mirror — the exact same two
// writes useCurrentUser().updateMe() does client-side (see src/storage.js
// and useCurrentUser in src/App.jsx), so a webhook or API route updating
// billing state looks, from the client's perspective, like any other
// profile edit.
// The subset of a profile that's safe to publish to `users:{id}` in
// shared_kv, which any signed-in account can read. Mirrors
// publicProfileProjection() in src/App.jsx — keep the two in step. Writing
// the whole profile there (which this used to do) published every user's
// legal name, phone number, zip code and email address to the entire signed-in
// population.
function publicProfileProjection(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name || "",
    avatar: profile.avatar || "",
    avatarPhotoId: profile.avatarPhotoId || null,
    profileBackgroundId: profile.profileBackgroundId || null,
    createdAt: profile.createdAt || null,
    isVendor: !!profile.isVendor,
    shopId: profile.shopId || null,
    plan: { tier: profile.plan?.tier || "free" },
    blockedUserIds: profile.blockedUserIds || [],
  };
}

export async function patchProfile(userId, patch) {
  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin.from("kv").select("value").eq("owner_id", userId).eq("key", "me:profile").maybeSingle();
  if (error) throw error;
  if (!row?.value) return null; // no profile yet — nothing to patch
  // `value` is a plain TEXT column, not jsonb — the client only ever treats
  // it as an object via its own getJSON/setJSON wrappers (see SECTION 5 of
  // src/App.jsx), which JSON.parse on the way out and JSON.stringify on the
  // way in. Reading/writing this column directly has to do the same thing.
  const current = JSON.parse(row.value);
  const next = { ...current, ...patch };
  const nextText = JSON.stringify(next);
  const nowIso = new Date().toISOString();
  const { error: kvErr } = await admin.from("kv").upsert({ owner_id: userId, key: "me:profile", value: nextText, updated_at: nowIso }, { onConflict: "owner_id,key" });
  if (kvErr) throw kvErr;
  const { error: sharedErr } = await admin
    .from("shared_kv")
    .upsert(
      { key: `users:${userId}`, value: JSON.stringify(publicProfileProjection(next)), updated_by: userId, updated_at: nowIso },
      { onConflict: "key" }
    );
  if (sharedErr) throw sharedErr;
  return next;
}

// Flips a vendor's storefront active/inactive to match their subscription
// status — mirrors the billingStatus side effect the old client-side
// purchasePlan/cancelPlan used to apply directly to the market:v7 blob.
export async function patchShopBillingStatusForUser(userId, isActive) {
  const admin = getSupabaseAdmin();
  const { data: profileRow } = await admin.from("kv").select("value").eq("owner_id", userId).eq("key", "me:profile").maybeSingle();
  if (!profileRow?.value) return;
  const profile = JSON.parse(profileRow.value); // see patchProfile — text column, not jsonb
  const shopId = profile?.shopId;
  if (!shopId) return;
  const { data: marketRow, error } = await admin.from("shared_kv").select("value").eq("key", "market:v7").maybeSingle();
  if (error || !marketRow?.value) return;
  const marketData = JSON.parse(marketRow.value);
  const shops = Array.isArray(marketData.shops) ? marketData.shops : [];
  const idx = shops.findIndex((s) => s.id === shopId);
  if (idx === -1) return;
  const current = shops[idx];
  const alreadyCorrect = isActive ? current.billingStatus !== "inactive" : current.billingStatus === "inactive";
  if (alreadyCorrect) return;
  const nextShops = shops.slice();
  nextShops[idx] = isActive ? { ...current, billingStatus: "active", inactiveSince: null } : { ...current, billingStatus: "inactive", inactiveSince: Date.now() };
  const { error: writeErr } = await admin
    .from("shared_kv")
    .upsert(
      { key: "market:v7", value: JSON.stringify({ ...marketData, shops: nextShops }), updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (writeErr) throw writeErr;
}

// Sets or clears a shop's `visibilityOverride` — a field completely
// separate from `billingStatus` above. billingStatus tracks whether a
// subscription is currently paying for the storefront; visibilityOverride
// tracks whether a HUMAN decision (the owner pausing their own account, or
// an admin banning/deleting it) says buyers shouldn't see this shop right
// now. Keeping them apart means pausing an account doesn't get silently
// undone by an unrelated billing-status flip, and un-pausing doesn't
// accidentally resurrect a shop whose subscription lapsed while paused.
// `override` is "paused" | "banned" | "deleted" | null (null clears it —
// the buyer-facing visibility check in src/App.jsx treats any non-null
// value here as hidden, same as inactive billing, except the owner can
// still see and manage their own shop while merely paused).
export async function setShopVisibilityOverride(userId, override) {
  const admin = getSupabaseAdmin();
  const { data: profileRow } = await admin.from("kv").select("value").eq("owner_id", userId).eq("key", "me:profile").maybeSingle();
  if (!profileRow?.value) return;
  const profile = JSON.parse(profileRow.value);
  const shopId = profile?.shopId;
  if (!shopId) return;
  const { data: marketRow, error } = await admin.from("shared_kv").select("value").eq("key", "market:v7").maybeSingle();
  if (error || !marketRow?.value) return;
  const marketData = JSON.parse(marketRow.value);
  const shops = Array.isArray(marketData.shops) ? marketData.shops : [];
  const idx = shops.findIndex((s) => s.id === shopId);
  if (idx === -1) return;
  const current = shops[idx];
  if ((current.visibilityOverride || null) === (override || null)) return; // already correct
  const nextShops = shops.slice();
  nextShops[idx] = { ...current, visibilityOverride: override || null };
  const { error: writeErr } = await admin
    .from("shared_kv")
    .upsert(
      { key: "market:v7", value: JSON.stringify({ ...marketData, shops: nextShops }), updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (writeErr) throw writeErr;
}

// Applies or clears a real Supabase Auth ban on an account — the same
// ~100-year "indefinite" duration admin-set-account-lock.js established,
// now shared by every moderation action that needs to cut off sign-in
// (lock, ban, delete) and by reactivate (which clears it). This is what
// actually stops someone from signing in or refreshing a session — the
// account_moderation table below is just the human-readable record of
// status/reason/who/when layered on top of it.
const INDEFINITE_BAN_DURATION = "876000h";
export async function setAuthBan(userId, banned) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? INDEFINITE_BAN_DURATION : "none",
  });
  if (error) throw error;
  return data?.user?.banned_until ? new Date(data.user.banned_until).getTime() : null;
}

// Upserts the current-status row in account_moderation and appends the
// matching audit-trail row in account_moderation_history. Every admin
// moderation action (and the two cron sweeps) goes through this single
// function so the two tables can never drift apart.
export async function recordModerationAction({ userId, email, action, status, reason, note, actorEmail }) {
  const admin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await admin.from("account_moderation").upsert(
    {
      user_id: userId,
      email: (email || "").toLowerCase(),
      status,
      reason: reason || null,
      note: note || null,
      actor_email: actorEmail || null,
      locked_at: status === "locked" ? nowIso : null,
      updated_at: nowIso,
    },
    { onConflict: "user_id" }
  );
  if (upsertErr) throw upsertErr;
  const { error: historyErr } = await admin.from("account_moderation_history").insert({
    user_id: userId,
    email: (email || "").toLowerCase(),
    action,
    reason: reason || null,
    note: note || null,
    actor_email: actorEmail || "system",
  });
  if (historyErr) throw historyErr;
}

// Shared gate for the two Vercel Cron routes (cron-affiliate-sweep.js,
// cron-lock-inactivity-sweep.js). Vercel automatically sends
// `Authorization: Bearer <CRON_SECRET>` on requests it makes to a
// cron-configured path when that env var is set — this just checks it
// matches, so nobody can trigger either sweep (or the payouts it can
// trigger) by guessing the URL. Returns an error Response to return
// straight from the route, or null if the check passed.
export function checkCronAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("cron route: CRON_SECRET is not set");
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const header = request.headers.get("authorization") || "";
  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }
  return null;
}

// "Real future timestamp within 50 years" — the same guard used across
// admin-directory.js / admin-user-detail.js / check-email-locked.js to tell
// an actual ban from Supabase's far-future "not banned" sentinel, which
// still parses as a valid (huge) date.
export function isRealBan(bannedUntil) {
  const ms = bannedUntil ? new Date(bannedUntil).getTime() : null;
  const now = Date.now();
  return !!ms && ms > now && ms < now + 50 * 365 * 86400000;
}
