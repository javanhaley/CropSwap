import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "./supabaseClient";

const displayFont = { fontFamily: "'Fraunces', serif" };
const bodyFont = { fontFamily: "'Inter', sans-serif" };

// Supabase's own built-in email sender (the one active until a project adds
// custom SMTP) shares one very small hourly quota across every auth email —
// signup confirmations AND password-recovery codes both draw from it. Once
// that's tripped, the raw error is a blunt "Email rate limit exceeded" that
// reads like the app is broken rather than "please wait a bit." This turns
// it into something a person can actually act on, and the resend cooldown
// below keeps a frustrated retry from digging the hole deeper.
function friendlyAuthError(err, fallback) {
  const msg = err?.message || "";
  if (/rate limit/i.test(msg)) {
    return "We've sent a lot of emails in a short time and hit a temporary sending limit. Please wait a few minutes before trying again.";
  }
  return msg || fallback;
}

const RESEND_COOLDOWN_SECONDS = 60;

// Sits in front of the app's existing name+avatar Onboarding screen. CropSwap
// itself never asks for a password — but a deployed, multi-device app needs a
// real account behind that friendly profile, so this is the thin real-auth
// layer the rest of the app (and Supabase RLS) relies on.
//
// `mode` covers two flows: signin/signup (the normal tabs) and a 3-step
// "forgot password" flow that runs entirely on typed codes rather than
// clicking a link — request a code, enter the 6-digit code emailed to you,
// then pick a new password. Verifying that code signs you straight in
// (Supabase hands back a real session for it), so by the time someone's
// picked a new password they're already logged in — no separate sign-in
// step needed afterward.
export default function AuthGate({ onSignedIn, reason, onCancel, initialMode = "signin" }) {
  const [mode, setMode] = useState(initialMode); // signin | signup | forgot-request | forgot-verify | forgot-newpassword
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Blocks the "Send code" / "Resend code" buttons for a bit after each
  // attempt — signup confirmation and password recovery draw from the same
  // shared email quota, so hammering either one just digs the rate limit
  // deeper. Ticks down once a second while active.
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    cooldownRef.current = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(cooldownRef.current);
  }, [resendCooldown]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        // Explicitly pointing the confirmation link back at wherever this
        // copy of the app is actually running (rather than leaving it to
        // whatever "Site URL" happens to be configured in Supabase) is what
        // keeps that link from ever landing somewhere stale.
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (data.session) {
          onSignedIn?.();
        } else {
          setNotice("Check your email to confirm your account, then sign in below.");
          setMode("signin");
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.session) onSignedIn?.();
      }
    } catch (err) {
      setError(friendlyAuthError(err, "Something went wrong. Try again."));
      if (/rate limit/i.test(err?.message || "")) setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setBusy(false);
    }
  }

  async function sendResetCode(e) {
    e.preventDefault();
    if (resendCooldown > 0) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (err) throw err;
      setMode("forgot-verify");
      setNotice(`We sent a 6-digit code to ${email}. Enter it below — it expires shortly, so grab it fresh.`);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(friendlyAuthError(err, "Couldn't send a reset code. Check the email and try again."));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setBusy(false);
    }
  }

  async function verifyResetCode(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { data, error: err } = await supabase.auth.verifyOtp({
        email,
        token: resetCode.trim(),
        type: "recovery",
      });
      if (err) throw err;
      if (!data.session) throw new Error("That code didn't work. Double-check it and try again.");
      setMode("forgot-newpassword");
      setNotice("Code verified — choose a new password.");
    } catch (err) {
      setError(err?.message || "That code didn't work. Double-check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
      // verifyOtp already returned a real session above, so this is a
      // genuine login — no separate sign-in step needed.
      onSignedIn?.();
    } catch (err) {
      setError(err?.message || "Couldn't update your password. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const isForgotFlow = mode.startsWith("forgot-");

  return (
    <div className="h-screen w-full flex items-start justify-center bg-stone-50 p-6 pt-10 overflow-y-auto" style={{ ...bodyFont, height: "100dvh" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-2xl mb-1 justify-center" style={displayFont}>
          <Sparkles size={24} /> CropSwap
        </div>
        {isForgotFlow ? (
          <p className="text-center text-stone-500 mb-7 text-sm">Reset your password — no need to remember the old one.</p>
        ) : reason ? (
          <p className="text-center text-stone-500 mb-7 text-sm">Create a free account to {reason} — browsing is always open, this is just for that.</p>
        ) : (
          <p className="text-center text-stone-500 mb-7 text-sm">A hyper-local, nationwide hub connecting growers and buyers.</p>
        )}

        {onCancel && !isForgotFlow && (
          <button type="button" onClick={onCancel} className="text-xs font-semibold text-stone-400 hover:text-stone-600 mb-3 block mx-auto">
            Not now — keep browsing
          </button>
        )}

        {!isForgotFlow && (
          <form onSubmit={submit} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
            <div className="flex mb-4 bg-stone-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setNotice("");
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === "signin" ? "bg-white text-emerald-800 shadow-sm" : "text-stone-500"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setNotice("");
                }}
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

            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-stone-400 uppercase">Password</p>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setNotice("");
                    setMode("forgot-request");
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Forgot password?
                </button>
              )}
            </div>
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
        )}

        {mode === "forgot-request" && (
          <form onSubmit={sendResetCode} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
                setMode("signin");
              }}
              className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-stone-600 mb-4"
            >
              <ArrowLeft size={13} /> Back to sign in
            </button>
            <p className="text-xs font-bold text-stone-400 uppercase mb-2">Email</p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
            />
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <button
              type="submit"
              disabled={busy || resendCooldown > 0}
              className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {resendCooldown > 0 ? `Try again in ${resendCooldown}s` : "Send reset code"}
            </button>
          </form>
        )}

        {mode === "forgot-verify" && (
          <form onSubmit={verifyResetCode} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
                setMode("forgot-request");
              }}
              className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-stone-600 mb-4"
            >
              <ArrowLeft size={13} /> Use a different email
            </button>
            {notice && <p className="text-xs text-emerald-700 mb-3">{notice}</p>}
            <p className="text-xs font-bold text-stone-400 uppercase mb-2">6-digit code</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700 tracking-[0.3em] text-center font-mono text-lg"
            />
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <button
              type="submit"
              disabled={busy || resetCode.length < 6}
              className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Verify code
            </button>
            <button
              type="button"
              onClick={sendResetCode}
              disabled={busy || resendCooldown > 0}
              className="w-full text-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:text-stone-400 mt-3"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get it? Resend code"}
            </button>
          </form>
        )}

        {mode === "forgot-newpassword" && (
          <form onSubmit={submitNewPassword} className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
            {notice && <p className="text-xs text-emerald-700 mb-3">{notice}</p>}
            <p className="text-xs font-bold text-stone-400 uppercase mb-2">New password</p>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
            />
            <p className="text-xs font-bold text-stone-400 uppercase mb-2">Confirm new password</p>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
            />
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Save new password &amp; log in
            </button>
          </form>
        )}

        {!isForgotFlow && (
          <p className="text-center text-[11px] text-stone-400 mt-4">
            Your name and avatar are set up on the next screen — this just secures your account across devices.
          </p>
        )}
      </div>
    </div>
  );
}
