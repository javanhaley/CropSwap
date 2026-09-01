// GET /api/admin-users
//
// The account list behind the Admin Dashboard, including email addresses.
//
// Those addresses used to be kept in `admin:userIndex` — a row in shared_kv,
// which every signed-in account can read — so the whole platform's email list
// was one query away from any user. They're served from here instead: the
// caller's token is verified server-side and checked against the admin
// address before anything is returned, and the addresses themselves come from
// Supabase Auth via the service-role key rather than from a mirror the app
// has to remember to keep in sync.
import { getSupabaseAdmin, getUserFromRequest } from "./_supabaseAdmin.js";

// Keep in sync with ADMIN_EMAIL in src/App.jsx.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "cropswapadmin@gmail.com";
const PAGE_SIZE = 1000;

export async function GET(request) {
  let user;
  try {
    user = await getUserFromRequest(request);
  } catch (err) {
    console.error("admin-users: auth check failed:", err);
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  if (!user || !user.email) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  // The email on the verified access token, not one the client claimed.
  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: "Not authorised" }, { status: 403 });
  }

  try {
    const admin = getSupabaseAdmin();
    const users = [];
    // Paginated so this doesn't quietly stop at the first 1000 accounts.
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error) throw error;
      const batch = data?.users || [];
      users.push(
        ...batch.map((u) => ({
          id: u.id,
          email: u.email || null,
          createdAt: u.created_at ? new Date(u.created_at).getTime() : null,
          lastSignInAt: u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null,
        }))
      );
      if (batch.length < PAGE_SIZE) break;
    }
    return Response.json({ users });
  } catch (err) {
    console.error("admin-users error:", err);
    return Response.json({ error: "Couldn't load accounts" }, { status: 500 });
  }
}
