// POST /api/admin-moderate-account
// body: { userId, action: "lock"|"ban"|"delete"|"reactivate", reason?, note? }
//
// The one endpoint behind every account-moderation button in the CRM. It
// replaces the old admin-set-account-lock.js (that lock/unlock behavior is
// now the "lock"/"reactivate" actions here) so lock, ban and delete all go
// through the exact same real-Auth-ban + account_moderation bookkeeping
// instead of three near-duplicate routes.
//
//   lock       — reversible by the admin. Reason optional. Auto-reverses
//                after 1 year of staying locked (see
//                api/cron-lock-inactivity-sweep.js), at which point it
//                becomes a "deleted" account.
//   ban        — reason required. Adds the email to banned_emails, which
//                is enforced at the database level (see the
//                enforce_email_ban_trigger migration) — that email can
//                never sign up again, on this account or a new one, even
//                if this account is later reactivated.
//   delete     — reason required. Actually removes the account: the
//                Supabase Auth user itself is deleted, not just banned, so
//                the email is genuinely free again afterward — signing up
//                with it creates a brand-new account (new user id, a real
//                new confirmation email with a real new code), exactly as
//                if this person never had one. That's deliberately
//                different from lock/ban: those leave the Auth user in
//                place (just banned), so trying to sign up again with that
//                email hits Supabase's silent "already registered, no
//                email sent" behavior instead of ever getting a fresh code
//                — the exact dead end this action exists to avoid. Because
//                the Auth user is actually gone, there's no reactivating a
//                deleted account (see "reactivate" below) — the CRM's
//                Deleted accounts list still remembers it happened (the
//                account_moderation / account_moderation_history rows
//                aren't touched by this), it just can't be undone. The
//                private profile itself (kv.owner_id → auth.users.id is a
//                CASCADE foreign key) is removed along with the login as a
//                direct consequence — there's no account left to attach it
//                to. Does NOT touch banned_emails, so a *different* new
//                signup with this same email later is never blocked.
//   reactivate — clears the Auth ban and sets status back to "active" from
//                locked or banned. Deleted accounts can't be reactivated —
//                see "delete" above, there's no Auth user left to restore.
//                This is an admin override for mistakes; it does not
//                remove a banned_emails entry — that's a separate,
//                deliberate action in the Banned Emails section
//                (api/admin-banned-emails.js), so undoing a ban on the
//                ACCOUNT doesn't quietly let the EMAIL back in the door too.
//
// Same admin gate (real password + emailed 2FA, enforced client-side by
// AdminLoginGate and here by checking the caller's actual signed-in email)
// as every other admin-*.js route.
import { getSupabaseAdmin, getUserFromRequest, setAuthBan, setShopVisibilityOverride, recordModerationAction } from "./_supabaseAdmin.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
const VALID_ACTIONS = new Set(["lock", "ban", "delete", "reactivate"]);
const REASON_REQUIRED_ACTIONS = new Set(["ban", "delete"]);

export async function POST(request) {
  let adminUser;
  try {
    adminUser = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-moderate-account: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!adminUser || !adminUser.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (adminUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: "Not authorised" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { userId, action, note } = body || {};
  const reason = (body?.reason || "").trim();
  if (!userId || !VALID_ACTIONS.has(action)) {
    return Response.json({ error: "Missing userId or invalid action" }, { status: 400 });
  }
  if (userId === adminUser.id) {
    return Response.json({ error: "Can't moderate the admin account itself" }, { status: 400 });
  }
  if (REASON_REQUIRED_ACTIONS.has(action) && !reason) {
    return Response.json({ error: "A reason is required for this action" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data: targetData, error: targetErr } = await admin.auth.admin.getUserById(userId);
    if (targetErr || !targetData?.user) {
      return Response.json({ error: "Account not found" }, { status: 404 });
    }
    const email = (targetData.user.email || "").toLowerCase();

    if (action === "lock") {
      const bannedUntil = await setAuthBan(userId, true);
      await recordModerationAction({ userId, email, action: "lock", status: "locked", reason: reason || null, note, actorEmail: adminUser.email });
      return Response.json({ status: "locked", bannedUntil });
    }

    if (action === "ban") {
      const bannedUntil = await setAuthBan(userId, true);
      const { error: banErr } = await admin.from("banned_emails").upsert(
        { email, reason, note: note || null, banned_by: adminUser.email, banned_at: new Date().toISOString() },
        { onConflict: "email" }
      );
      if (banErr) throw banErr;
      await setShopVisibilityOverride(userId, "banned");
      await recordModerationAction({ userId, email, action: "ban", status: "banned", reason, note, actorEmail: adminUser.email });
      return Response.json({ status: "banned", bannedUntil });
    }

    if (action === "delete") {
      // Order matters: setShopVisibilityOverride and recordModerationAction
      // both still need the account's own kv profile row (to find its
      // shopId, and just generally to exist) — that row cascades away the
      // moment the Auth user is deleted below, so both run first.
      await setShopVisibilityOverride(userId, "deleted");
      await recordModerationAction({ userId, email, action: "delete", status: "deleted", reason, note, actorEmail: adminUser.email });

      // shared_kv_updated_by_fkey has no cascade (unlike kv_owner_id_fkey),
      // so deleting the Auth user while any shared_kv row still lists them
      // as its last editor — their own notifications feed, or market:v7 if
      // they happened to be the last person anywhere to touch the
      // marketplace blob — would fail outright with a foreign-key
      // violation. Clearing that attribution first (the rows themselves,
      // and their content, are untouched) is required, not optional.
      const { error: clearErr } = await admin.from("shared_kv").update({ updated_by: null }).eq("updated_by", userId);
      if (clearErr) throw clearErr;

      // The actual removal: unlike lock/ban, this deletes the Supabase Auth
      // user outright rather than banning it, which is what makes the email
      // genuinely available for a fresh signup afterward (see the big
      // comment above this file's action list for why that distinction
      // matters). No bannedUntil to report back — there's no Auth user left
      // to have one.
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) throw delErr;
      return Response.json({ status: "deleted", bannedUntil: null });
    }

    // reactivate
    await setAuthBan(userId, false);
    await setShopVisibilityOverride(userId, null);
    await recordModerationAction({ userId, email, action: "reactivate", status: "active", reason: reason || null, note, actorEmail: adminUser.email });
    return Response.json({ status: "active", bannedUntil: null });
  } catch (err) {
    console.error("admin-moderate-account error:", err);
    return Response.json({ error: "Couldn't update this account" }, { status: 500 });
  }
}
