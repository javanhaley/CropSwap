// POST /api/track-visit
//
// Fire-and-forget site-visit beacon — called once per in-app screen change
// from RootShell (see trackVisit()/the route-change effect in src/App.jsx).
// Deliberately open to anyone, signed in or not: the whole point is
// counting every visitor, including guests who never create an account.
//
// Geography comes from Vercel's own edge-injected request headers
// (x-vercel-ip-country / -country-region / -city) rather than anything the
// client claims about itself — Vercel adds these automatically once the
// project is deployed there (both Edge and Node serverless functions get
// them), and unlike a client-supplied "country" field they can't be spoofed
// by editing the request body. Locally (not deployed on Vercel) they're
// simply absent, so visits still record with null geo instead of failing.
import { getSupabaseAdmin } from "./_supabaseAdmin.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REF_CODE_RE = /^[a-z0-9-]{1,40}$/;
const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days — see src/referral.js

function clip(value, max) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(request) {
  // Affiliate-referral resilience (see src/referral.js for the full
  // picture): this beacon already fires once per in-app screen change for
  // every visitor, guest or not, so it doubles as a way to keep a pending
  // referral code's cookie alive server-side. A cookie this route sets via
  // a real Set-Cookie response header isn't subject to Safari ITP's 7-day
  // cap on cookies JavaScript sets directly with document.cookie — so as
  // long as someone who clicked a referral link keeps browsing (which
  // re-fires this beacon on every screen), the attribution window keeps
  // rolling forward the full 30 days even in Safari. Computed up front and
  // attached to every response below (success or failure) — a dropped
  // analytics row should never also cost someone their referral cookie.
  let setCookie = null;
  try {
    const bodyForCookie = await request.clone().json().catch(() => ({}));
    const refCode = clip(bodyForCookie.ref, 40);
    if (refCode && REF_CODE_RE.test(refCode)) {
      setCookie = `cs_ref_srv=${refCode}; Path=/; Max-Age=${REF_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax; Secure`;
    }
  } catch {}
  const headers = setCookie ? { "Set-Cookie": setCookie } : undefined;

  try {
    const body = await request.json().catch(() => ({}));
    const path = clip(body.path, 80) || "/explore";
    const referrerHost = clip(body.referrerHost, 120);
    const visitorId = clip(body.visitorId, 60);
    const device = body.device === "mobile" ? "mobile" : "desktop";
    const userIdRaw = clip(body.userId, 64);
    const userId = userIdRaw && UUID_RE.test(userIdRaw) ? userIdRaw : null;

    // Vercel URL-encodes the city header per its own docs (spaces, accents,
    // etc.) — decode defensively so a malformed value never 500s the beacon.
    let city = null;
    try {
      const rawCity = request.headers.get("x-vercel-ip-city");
      city = rawCity ? decodeURIComponent(rawCity) : null;
    } catch {
      city = null;
    }
    const country = request.headers.get("x-vercel-ip-country") || null;
    const region = request.headers.get("x-vercel-ip-country-region") || null;

    const admin = getSupabaseAdmin();
    await admin.from("site_visits").insert({
      path,
      referrer_host: referrerHost,
      country,
      region,
      city,
      device,
      visitor_id: visitorId,
      user_id: userId,
    });

    return Response.json({ ok: true }, { headers });
  } catch (err) {
    // A dropped visit row is a rounding error on a chart, never worth
    // surfacing to whoever's just browsing.
    console.error("track-visit error:", err);
    return Response.json({ ok: false }, { status: 200, headers });
  }
}
