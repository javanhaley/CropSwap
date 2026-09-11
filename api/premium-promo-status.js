// GET /api/premium-promo-status
//
// Public (no auth) — the Plans page needs to know whether the launch promo
// ("first N shop owners get a free 12-month Premium plan, no card needed")
// still has slots left even before someone's signed in, so a guest sees
// accurate copy instead of an offer that's already gone, and so the promo
// popup knows whether to show itself at all.
//
// The limit is stored in shared_kv rather than hardcoded, specifically so
// it can be raised later with one SQL update to this row's `limit` field —
// no code change or redeploy needed if a few more free slots need adding.
import { getSupabaseAdmin } from "./_supabaseAdmin.js";

const PROMO_KEY = "promo:free_premium_launch";
const DEFAULT_LIMIT = 5;

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data: row } = await admin.from("shared_kv").select("value").eq("key", PROMO_KEY).maybeSingle();
    let state = { limit: DEFAULT_LIMIT, redeemedUserIds: [] };
    if (row?.value) {
      try {
        state = JSON.parse(row.value);
      } catch {
        // Corrupt row — fall back to the default rather than 500ing the
        // Plans page over a promo popup.
      }
    }
    const limit = Number.isFinite(state.limit) ? state.limit : DEFAULT_LIMIT;
    const redeemedCount = Array.isArray(state.redeemedUserIds) ? state.redeemedUserIds.length : 0;
    const remaining = Math.max(0, limit - redeemedCount);
    return Response.json({ available: remaining > 0, remaining, limit });
  } catch (err) {
    console.error("premium-promo-status error:", err);
    // Fail closed — never advertise a gift that might not actually work,
    // but never break the Plans page itself over this either.
    return Response.json({ available: false, remaining: 0, limit: DEFAULT_LIMIT });
  }
}
