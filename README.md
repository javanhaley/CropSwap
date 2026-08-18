# CropSwap

A hyper-local, nationwide marketplace connecting growers and buyers — produce, plants, trees, pollinators, dairy & eggs, sold through customizable vendor storefronts.

This app started life as a single-file React artifact. It's now a standalone Vite + React app backed by real Supabase persistence and auth.

## Stack

- **React 18 + Vite** — the UI (`src/App.jsx`) is almost entirely untouched from the original artifact; only the storage, auth, and AI-moderation glue changed.
- **Supabase** — Postgres (via a small `kv` / `shared_kv` key-value schema that mirrors the app's original storage calls), Auth (email/password), and an Edge Function (`moderate-review`) for review moderation.
- **Tailwind CSS**, **lucide-react** icons, **recharts** for the vendor dashboard.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` if you want to point at a different Supabase project (the app ships with working defaults for the project it was created with — the anon key is safe to be public, it's protected by Row Level Security).

## Architecture notes

- `src/storage.js` implements a `window.storage.get/set/delete/list` polyfill backed by two Supabase tables (`kv` for private per-user rows, `shared_kv` for everything else — market data, message threads, notifications, reviews). This is what the original artifact's `window.storage` API talked to inside the Claude.ai sandbox; swapping it for Supabase meant the ~850 lines of data hooks in `src/App.jsx` (Section 8) needed **no changes at all**.
- `src/AuthGate.jsx` is a new email/password sign-in screen shown before the app's existing name+avatar onboarding. The original had no auth at all (single-session demo); a real deployed app needs a real account behind that profile.
- `supabase/functions/moderate-review/index.ts` replaces the original's direct, unauthenticated client-side fetch to the Anthropic API (which only worked inside the Claude.ai artifact sandbox). It calls Anthropic server-side if an `ANTHROPIC_API_KEY` secret is configured on the Supabase project; otherwise it auto-approves reviews instead of leaving them stuck pending forever.

## Known simplifications

- Reviews auto-publish unless you set an `ANTHROPIC_API_KEY` secret on the Supabase project (`supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <ref>`).
- Shared marketplace data (`shared_kv`) is writable by any signed-in user, matching the original app's own trust model (it had no per-vendor authorization either). If you want real per-vendor ownership enforcement, that needs a follow-up migration to a normalized schema with row-level ownership.
- Email confirmation is on by default for new Supabase projects — new sign-ups may need to confirm their email before their first sign-in.
