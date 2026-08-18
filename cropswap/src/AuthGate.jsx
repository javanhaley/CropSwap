import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";

const displayFont = { fontFamily: "'Fraunces', serif" };
const bodyFont = { fontFamily: "'Inter', sans-serif" };

// Sits in front of the app's existing name+avatar Onboarding screen. CropSwap
// itself never asks for a password — but a deployed, multi-device app needs a
// real account behind that friendly profile, so this is the thin real-auth
// layer the rest of the app (and Supabase RLS) relies on.
export default function AuthGate({ onSignedIn }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.session) {
          onSignedIn?.();
        } else {
          setNotice("Check your email to confirm your account, then sign in below.");
          setMode("signin");
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.session) onSignedIn?.();
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-full flex items-start justify-center bg-stone-50 p-6 pt-10 overflow-y-auto" style={{ ...bodyFont, height: "100dvh" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-2xl mb-1 justify-center" style={displayFont}>
          <Sparkles size={24} /> CropSwap
        </div>
        <p className="text-center text-stone-500 mb-7 text-sm">A hyper-local, nationwide hub connecting growers and buyers.</p>

        <form onSubmit={submit} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
          <div className="flex mb-4 bg-stone-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === "signin" ? "bg-white text-emerald-800 shadow-sm" : "text-stone-500"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === "signup" ? "bg-white text-emerald-800 shadow-sm" : "text-stone-500"}`}
            >
              Create account
            </button>
          </div>

          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Email</p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
          />

          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Password</p>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
          />

          {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
          {notice && <p className="text-xs text-emerald-700 mb-3">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-[11px] text-stone-400 mt-4">
          Your name and avatar are set up on the next screen — this just secures your account across devices.
        </p>
      </div>
    </div>
  );
}
