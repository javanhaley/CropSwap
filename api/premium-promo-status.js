// GET /api/premium-promo-status
//
// Public (no auth) — the Plans page needs to know whether the launch promo
// ("free 12-month Premium plan, no card needed") is currently turned on,
// even before someone's signed in, so the popup knows whether to show
// itself at all.
//
// There's no headcount limit here (see api/redeem-premium-promo.js) — this
// is purely an on/off switch, driven by the `enabled` field on the
// shared_kv row keyed PROMO_KEY. Missing row or missing field both default
// to enabled, so the promo works with nothing to seed first; turning it
// off is one SQL update (see the comment in redeem-premium-promo.js) with
// no redeploy needed.
import { getSupabaseAdmin } from "./_supabaseAdmin.js";

const PROMO_KEY = "promo:free_premium_launch";

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data: row } = await admin.from("shared_kv").select("value").eq("key", PROMO_KEY).maybeSingle();
    let state = { enabled: true, redeemedUserIds: [] };
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value);
        if (parsed && typeof parsed === "object") state = { enabled: true, redeemedUserIds: [], ...parsed };
      } catch {
        // Corrupt row — fall back to the default rather than 500ing the
        // Plans page over a promo popup.
      }
    }
    const available = state.enabled !== false;
    const redeemedCount = Array.isArray(state.redeemedUserIds) ? state.redeemedUserIds.length : 0;
    return Response.json({ available, redeemedCount });
  } catch (err) {
    console.error("premium-promo-status error:", err);
    // Fail closed — never advertise a gift that might not actually work,
    // but never break the Plans page itself over this either.
    return Response.json({ available: false, redeemedCount: 0 });
  }
}
