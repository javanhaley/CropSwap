import { createClient } from "@supabase/supabase-js";

// The Supabase anon/publishable key is meant to be public — it's the same key
// shipped to every browser and is only as powerful as the Row Level Security
// policies on the project allow. It's safe to fall back to a hardcoded value
// here so the app works out of the box even if VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY aren't set as Vercel project env vars. Override them
// via .env (see .env.example) to point at a different Supabase project.
const url = import.meta.env.VITE_SUPABASE_URL || "https://vymhrelyooqwxpfhcryh.supabase.co";
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5bWhyZWx5b29xd3hwZmhjcnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MTc3MzYsImV4cCI6MjEwMjQ5MzczNn0.ZZ-7lduqBX2KuRxfa4JJtGD8ZD8D1ICVK13GSG4dQas";

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
