// POST /api/user-set-pause
// body: { paused: boolean, note?: string }
//
// Self-service — this is the "pause my account" toggle from the user's own
// Account modal, not an admin action. Per the pause design: the person can
// still sign in anytime (no Auth ban at all here, unlike lock/ban/delete),
// but their shop stops showing up for buyers and can't take new orders
// while paused. Also flips a row in account_moderation so the CRM's
// "Paused accounts" section... actually paused accounts are read straight
// off the profile (see admin-moderated-accounts.js) since this is a
// self-service state, not an admin action — this route's only job is the
// profile flag + the shop visibility override.
import { getUserFromRequest, patchProfile, setShopVisibilityOverride } from "./_supabaseAdmin.js";

export async function POST(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("user-set-pause: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const paused = !!body?.paused;
  const note = typeof body?.note === "string" ? body.note.slice(0, 300) : null;

  try {
    const next = await patchProfile(user.id, {
      accountPaused: paused,
      accountPausedAt: paused ? Date.now() : null,
      pauseNote: paused ? note : null,
    });
    if (!next) return Response.json({ error: "No profile found for this account" }, { status: 404 });
    // Only touches shop visibility if there's actually a shop — a no-op for
    // a buyer-only account, and setShopVisibilityOverride itself no-ops if
    // the value is already correct.
    await setShopVisibilityOverride(user.id, paused ? "paused" : null);
    return Response.json({ paused });
  } catch (err) {
    console.error("user-set-pause error:", err);
    return Response.json({ error: "Couldn't update your account" }, { status: 500 });
  }
}
