// Affiliate/referral-code attribution.
//
// The moment someone arrives via another grower's
// cropswapmarket.com/incentives/<code> link, the code needs to survive
// however long it takes them to actually create an account — could be the
// same minute, could be three weeks from now after browsing on and off —
// and still get credited to the right affiliate when they do. That's a lot
// of ways for a single storage mechanism to quietly drop it:
//
//   - localStorage alone survives reloads and new tabs, but is wiped by
//     "clear site data", private-browsing cleanup, some ad/privacy
//     extensions, and iOS Safari's periodic storage eviction for sites that
//     haven't been visited in a while.
//   - A plain JS-set cookie (document.cookie) survives most of the same
//     clears localStorage does, and — unlike localStorage — is something a
//     server route can also read directly off the request. But Safari's ITP
//     caps the lifetime of ANY cookie set via document.cookie at 7 days,
//     no matter what Max-Age says, so a 30-day window needs help.
//   - A cookie set by the SERVER via a Set-Cookie response header isn't
//     subject to that 7-day cap. api/track-visit.js already fires on every
//     screen change (see trackVisit() in App.jsx) — once a ref is seen, it
//     rides along on that beacon so the server keeps re-issuing the cookie
//     with a fresh 30-day expiry on every screen a real visitor looks at.
//
// So: write to both localStorage and a client cookie on capture, refresh
// both (and ask the server to refresh its own copy) on every screen view,
// and treat whichever store has the newer un-expired timestamp as the
// source of truth when it's time to actually credit a signup.
const CODE_KEY = "cs_pendingReferralCode";
const TS_KEY = "cs_pendingReferralCodeAt";
const COOKIE_NAME = "cs_ref";
const COOKIE_TS_NAME = "cs_ref_at";
export const REFERRAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function readCookie(name) {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(name, value, maxAgeMs) {
  try {
    const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", `Max-Age=${Math.round(maxAgeMs / 1000)}`, "SameSite=Lax"];
    if (window.location.protocol === "https:") parts.push("Secure");
    document.cookie = parts.join("; ");
  } catch {}
}

function safeGetLS(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetLS(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function safeRemoveLS(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// Pull a code out of the current URL: the normal /incentives/<code> link, or
// a ?ref=/?aff= query param as a fallback in case a link ever gets shared,
// shortened, or wrapped by something that drops the path but keeps a query
// string (some social apps' in-app browsers and link shorteners do exactly
// this).
export function extractReferralCodeFromLocation() {
  try {
    const pathMatch = window.location.pathname.match(/^\/incentives\/([A-Za-z0-9-]+)\/?$/);
    if (pathMatch) return pathMatch[1].toLowerCase();
    const params = new URLSearchParams(window.location.search || "");
    const fromQuery = (params.get("ref") || params.get("aff") || "").trim();
    if (fromQuery) return fromQuery.toLowerCase();
  } catch {}
  return null;
}

// True only for the dedicated share-link path — a bare ?ref=/?aff= fallback
// should just be remembered quietly, not yank someone straight into sign-up
// the way clicking an actual invite link does.
export function isIncentivesLinkPath() {
  try {
    return /^\/incentives\/[A-Za-z0-9-]+\/?$/.test(window.location.pathname);
  } catch {
    return false;
  }
}

// Stash a freshly-seen code into every client-readable store, and (fire and
// forget) ask the server to mirror it into an HttpOnly-equivalent cookie of
// its own via the same beacon endpoint that already logs the visit.
export function captureReferralCode(code) {
  if (!code) return;
  const now = Date.now();
  safeSetLS(CODE_KEY, code);
  safeSetLS(TS_KEY, String(now));
  writeCookie(COOKIE_NAME, code, REFERRAL_WINDOW_MS);
  writeCookie(COOKIE_TS_NAME, String(now), REFERRAL_WINDOW_MS);
}

// Re-issues the cookies for whatever code is already on file, with a fresh
// 30-day window, without changing which code it is. Called on every screen
// view (see the trackVisit effect in App.jsx) so an active visitor's
// attribution window keeps rolling forward instead of quietly lapsing —
// this is what actually gets a real visit past Safari's 7-day cap on
// script-set cookies, since it re-sets the cookie well before day 7 as long
// as they're still around using the app.
export function refreshReferralWindow() {
  const code = getPendingReferralCode();
  if (code) captureReferralCode(code);
}

// The code to credit, or null if there isn't one on file or it's aged out
// past the 30-day window. Cookie and localStorage are checked
// independently — either one surviving on its own is enough.
export function getPendingReferralCode() {
  const now = Date.now();

  const fromCookie = readCookie(COOKIE_NAME);
  const cookieTs = Number(readCookie(COOKIE_TS_NAME) || 0);
  if (fromCookie && cookieTs && now - cookieTs < REFERRAL_WINDOW_MS) return fromCookie;

  const fromLS = safeGetLS(CODE_KEY);
  const lsTs = Number(safeGetLS(TS_KEY) || 0);
  if (fromLS && lsTs && now - lsTs < REFERRAL_WINDOW_MS) return fromLS;

  return null;
}

export function clearPendingReferralCode() {
  safeRemoveLS(CODE_KEY);
  safeRemoveLS(TS_KEY);
  writeCookie(COOKIE_NAME, "", -1);
  writeCookie(COOKIE_TS_NAME, "", -1);
}
