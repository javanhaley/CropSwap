// GET /api/cron-lock-inactivity-sweep — runs daily via Vercel Cron (see
// vercel.json). Protected by CRON_SECRET, same as cron-affiliate-sweep.js.
//
// Implements "a locked account stays locked until the admin unlocks it, or
// until it automatically deletes after 1 year of inactivity": any account
// that's been sitting in account_moderation with status="locked" for 365+
// days (locked_at is set the moment admin-moderate-account.js locks one,
// and never touched again while it stays locked) gets converted to
// "deleted" — access was already cut off by the lock, so this only changes
// its bucket in the CRM and the messaging a returning visitor sees.
import { getSupabaseAdmin, checkCronAuth, setShopVisibilityOverride, recordModerationAction } from "./_supabaseAdmin.js";

const LOCK_AUTO_DELETE_DAYS = 365;
const BATCH_SIZE = 200;

export async function GET(request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  try {
    const admin = getSupabaseAdmin();
    const cutoffIso = new Date(Date.now() - LOCK_AUTO_DELETE_DAYS * 86400000).toISOString();
    const { data: staleLocks, error } = await admin
      .from("account_moderation")
      .select("user_id, email")
      .eq("status", "locked")
      .lte("locked_at", cutoffIso)
      .limit(BATCH_SIZE);
    if (error) throw error;

    for (const row of staleLocks || []) {
      await setShopVisibilityOverride(row.user_id, "deleted");
      await recordModerationAction({
        userId: row.user_id,
        email: row.email,
        action: "auto_delete_inactivity",
        status: "deleted",
        reason: `Locked for over ${LOCK_AUTO_DELETE_DAYS} days with no admin action`,
        note: null,
        actorEmail: "system (automated 1-year lock sweep)",
      });
    }

    return Response.json({ converted: (staleLocks || []).length });
  } catch (err) {
    console.error("cron-lock-inactivity-sweep error:", err);
    return Response.json({ error: "Sweep failed" }, { status: 500 });
  }
}
