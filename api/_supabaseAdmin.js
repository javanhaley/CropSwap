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
export async function patchProfile(userId, patch) {
  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin.from("kv").select("value").eq("owner_id", userId).eq("key", "me:profile").maybeSingle();
  if (error) throw error;
  if (!row?.value) return null; // no profile yet — nothing to patch
  const next = { ...row.value, ...patch };
  const nowIso = new Date().toISOString();
  const { error: kvErr } = await admin.from("kv").upsert({ owner_id: userId, key: "me:profile", value: next, updated_at: nowIso }, { onConflict: "owner_id,key" });
  if (kvErr) throw kvErr;
  const { error: sharedErr } = await admin.from("shared_kv").upsert({ key: `users:${userId}`, value: next, updated_by: userId, updated_at: nowIso }, { onConflict: "key" });
  if (sharedErr) throw sharedErr;
  return next;
}

// Flips a vendor's storefront active/inactive to match their subscription
// status — mirrors the billingStatus side effect the old client-side
// purchasePlan/cancelPlan used to apply directly to the market:v7 blob.
export async function patchShopBillingStatusForUser(userId, isActive) {
  const admin = getSupabaseAdmin();
  const { data: profileRow } = await admin.from("kv").select("value").eq("owner_id", userId).eq("key", "me:profile").maybeSingle();
  const shopId = profileRow?.value?.shopId;
  if (!shopId) return;
  const { data: marketRow, error } = await admin.from("shared_kv").select("value").eq("key", "market:v7").maybeSingle();
  if (error || !marketRow?.value) return;
  const marketData = marketRow.value;
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
    .upsert({ key: "market:v7", value: { ...marketData, shops: nextShops }, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (writeErr) throw writeErr;
}
