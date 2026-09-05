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
// Same admin gate as every other admin-*.js route.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
const VALID_STATUSES = new Set(["deleted", "banned", "paused", "locked"]);

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
    return Response.json({ accounts });
  } catch (err) {
    console.error("admin-moderated-accounts error:", err);
    return Response.json({ error: "Couldn't load this list" }, { status: 500 });
  }
}
