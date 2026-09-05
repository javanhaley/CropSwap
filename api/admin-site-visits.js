// GET /api/admin-site-visits?sinceMs=...&untilMs=...
//
// Backs the Admin Dashboard's "Website visitors" panel. Admin-gated the
// same way as /api/admin-billing-summary. Deliberately returns raw rows
// (same shape fetchAnalyticsEvents already returns for every other
// dashboard chart) rather than pre-aggregated numbers, so the client can
// bucket/group them with the exact same bucketSeries + range-selector
// machinery already driving the rest of this page instead of duplicating
// that logic here.
import { getUserFromRequest, getSupabaseAdmin } from "./_supabaseAdmin.js";

// Keep in sync with ADMIN_EMAIL in src/App.jsx.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";

export async function GET(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-site-visits: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user || !user.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: "Not authorised" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const sinceParam = Number(url.searchParams.get("sinceMs"));
    const untilParam = Number(url.searchParams.get("untilMs"));
    const sinceMs = Number.isFinite(sinceParam) && sinceParam > 0 ? sinceParam : Date.now() - 14 * 86400000;
    const untilMs = Number.isFinite(untilParam) && untilParam > 0 ? untilParam : null;

    const admin = getSupabaseAdmin();
    let q = admin
      .from("site_visits")
      .select("path, referrer_host, country, region, city, device, visitor_id, created_at")
      .gte("created_at", new Date(sinceMs).toISOString())
      .order("created_at", { ascending: true })
      .limit(6000);
    if (untilMs) q = q.lt("created_at", new Date(untilMs).toISOString());
    const { data, error } = await q;
    if (error) throw error;

    return Response.json({ visits: data || [] });
  } catch (err) {
    console.error("admin-site-visits error:", err);
    return Response.json({ error: "Couldn't load visitor data" }, { status: 500 });
  }
}
