// Drop-in replacement for the Claude.ai artifact runtime's `window.storage`
// API, backed by two Supabase tables instead of the artifact sandbox:
//
//   - `shared` = false  ->  public.kv        (row-owned, private to auth.uid())
//   - `shared` = true   ->  public.shared_kv  (readable/writable by any signed-in user)
//
// The app's own SECTION 5 helpers (getJSON/readJSON/setJSON) already wrap
// every call site through window.storage.get/set/delete/list, so this is the
// only piece that needs to change for persistence to become real and
// cross-device instead of an in-memory demo.
import { supabase } from "./supabaseClient";

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  const uid = data?.session?.user?.id;
  if (!uid) throw new Error("storage: no authenticated session");
  return uid;
}

window.storage = {
  async get(key, shared) {
    if (shared) {
      const { data, error } = await supabase
        .from("shared_kv")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return { value: data ? data.value : null };
    }
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("kv")
      .select("value")
      .eq("owner_id", uid)
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return { value: data ? data.value : null };
  },

  async set(key, payload, shared) {
    if (shared) {
      const uid = (await supabase.auth.getSession()).data?.session?.user?.id || null;
      const { error } = await supabase
        .from("shared_kv")
        .upsert({ key, value: payload, updated_by: uid, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      return true;
    }
    const uid = await currentUserId();
    const { error } = await supabase
      .from("kv")
      .upsert({ owner_id: uid, key, value: payload, updated_at: new Date().toISOString() }, { onConflict: "owner_id,key" });
    if (error) throw error;
    return true;
  },

  async delete(key, shared) {
    if (shared) {
      const { error } = await supabase.from("shared_kv").delete().eq("key", key);
      if (error) throw error;
      return true;
    }
    const uid = await currentUserId();
    const { error } = await supabase.from("kv").delete().eq("owner_id", uid).eq("key", key);
    if (error) throw error;
    return true;
  },

  // Only ever called with the exact key it's probing for (a missing-key
  // existence check), so an equality match is all that's needed here.
  async list(prefix, shared) {
    if (shared) {
      const { data, error } = await supabase.from("shared_kv").select("key").eq("key", prefix);
      if (error) throw error;
      return { keys: (data || []).map((r) => r.key) };
    }
    const uid = await currentUserId();
    const { data, error } = await supabase.from("kv").select("key").eq("owner_id", uid).eq("key", prefix);
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key) };
  },
};
