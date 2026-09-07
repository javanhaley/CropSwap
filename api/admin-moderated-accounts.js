// GET /api/admin-moderated-accounts?status=deleted|banned|paused|locked
//
// Backs the three new CRM sections (Deleted accounts / Banned accounts /
// Paused accounts) plus the existing Locked view. "locked"/"banned"/
// "deleted" come straight from the account_moderation table written by
// admin-moderate-account.js. "paused" is self-service (see
// user-set-pause.js) so it isn't in that table at all — it's read straight
// off each account's own profile instead, same source useCurrentUser()
// itself would read.
//
// "locked" has one extra wrinkle: an account can end up with a real Auth-
// level ban (banned_until far in the future) WITHOUT ever going through
// admin-moderate-account.js -- e.g. a ban applied by hand directly in
// Supabase. That account has no account_moderation row at all, so the
// query below would silently omit it even though it's genuinely locked
// (isRealBan() is what admin-directory.js / admin-user-detail.js use to
// detect it there). For status === "locked" specifically, this route
// also scans Auth directly and synthesizes an entry for any such
// "orphaned" real ban, so it shows up here too instead of only on its own
// detail page and in the full Directory.
import { getSupabaseAdmin, getUserFromRequest, isRealBan } from "./_supabaseAdmin.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
const VALID_STATUSES = new Set(["deleted", "banned", "paused", "locked"]);
const PAGE_SIZE = 1000;

export async function GET(request) {
  let adminUser;
  try {
    adminUser = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-moderated-accounts: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!adminUser || !adminUser.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  if (adminUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: "Not authorised" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  if (!VALID_STATUSES.has(status)) {
    return Response.json({ error: "Missing or invalid status" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Every private profile row, so names/avatars/plan can be shown next
    // to the raw moderation record without a second round trip per row.
    const { data: profileRows, error: profileErr } = await admin.from("kv").select("owner_id, value").eq("key", "me:profile");
    if (profileErr) throw profileErr;
    const profileByOwner = new Map();
    (profileRows || []).forEach((row) => {
      try {
        profileByOwner.set(row.owner_id, JSON.parse(row.value));
      } catch {
        /* skip a row that isn't valid JSON rather than failing the whole list */
      }
    });

    if (status === "paused") {
      const accounts = [];
      for (const [ownerId, profile] of profileByOwner.entries()) {
        if (!profile?.accountPaused) continue;
        accounts.push({
          userId: ownerId,
          email: profile.email || null,
          name: profile.name || null,
          avatar: profile.avatar || null,
          reason: null,
          note: profile.pauseNote || null,
          actorEmail: null,
          updatedAt: profile.accountPausedAt || null,
        });
      }
      accounts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return Response.json({ accounts });
    }

    const { data: rows, error } = await admin
      .from("account_moderation")
      .select("user_id, email, reason, note, actor_email, locked_at, updated_at")
      .eq("status", status)
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const accounts = (rows || []).map((r) => {
      const profile = profileByOwner.get(r.user_id) || null;
      return {
        userId: r.user_id,
        email: r.email,
        name: profile?.name || null,
        avatar: profile?.avatar || null,
        reason: r.reason,
        note: r.note,
        actorEmail: r.actor_email,
        lockedAt: r.locked_at ? new Date(r.locked_at).getTime() : null,
        updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : null,
      };
    });

    // "locked" only: fall back to Auth directly for any real ban with no
    // account_moderation row at all (see the big comment up top). Every
    // OTHER status here (banned/deleted) genuinely requires a moderation
    // record to mean anything -- there's no equivalent Auth-only signal for
    // "deleted" or a permanent "banned" beyond what's already a "locked"
    // ban under the hood -- so this fallback is intentionally scoped to
    // "locked" alone.
    if (status === "locked") {
      const alreadyListedIds = new Set(accounts.map((a) => a.userId));

      // Every user_id that has ANY moderation record, regardless of status,
      // so an account properly recorded as "banned" or "deleted" is never
      // double-counted as an orphaned "locked" entry too.
      const { data: allModRows, error: allModErr } = await admin.from("account_moderation").select("user_id");
      if (allModErr) throw allModErr;
      const hasAnyRecord = new Set((allModRows || []).map((r) => r.user_id));

      const authUsers = [];
      for (let page = 1; page <= 20; page++) {
        const { data, error: authErr } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
        if (authErr) throw authErr;
        const batch = data?.users || [];
        authUsers.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }

      for (const u of authUsers) {
        if (alreadyListedIds.has(u.id) || hasAnyRecord.has(u.id)) continue;
        if (!isRealBan(u.banned_until)) continue;
        const profile = profileByOwner.get(u.id) || null;
        accounts.push({
          userId: u.id,
          email: u.email || null,
          name: profile?.name || null,
          avatar: profile?.avatar || null,
          reason: null,
          note: "Locked outside the admin dashboard (no moderation record on file)",
          actorEmail: null,
          lockedAt: null,
          updatedAt: u.banned_until ? new Date(u.banned_until).getTime() : null,
        });
      }
      accounts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    return Response.json({ accounts });
  } catch (err) {
    console.error("admin-moderated-accounts error:", err);
    return Response.json({ error: "Couldn't load this list" }, { status: 500 });
  }
}
