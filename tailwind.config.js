/** @type {import('tailwindcss').Config} */

// ---------------------------------------------------------------------------
// BRAND PALETTE — derived directly from the CropSwap wordmark logo:
//   "Crop" is a vivid bright green (#2cd827)
//   "Swap" is a dark forest green (#0d4923)
// Rather than hand-editing every bg-emerald-*/text-amber-*/border-rose-* class
// across src/App.jsx (thousands of instances), the two logo colors are used to
// build one cohesive green scale, and that scale + a true neutral gray scale
// are substituted in for every Tailwind color family already used in the
// codebase. Existing class names (bg-emerald-800, text-stone-500, bg-rose-100,
// etc.) keep working exactly as before — they just resolve to new hex values,
// so the whole app repaints from one file instead of thousands of edits.
//   - emerald / green / teal  -> the Crop-to-Swap green scale (brand actions,
//     success states, gradients — anything that was "the app's green")
//   - every other named color (amber, rose, orange, yellow, lime, violet,
//     blue, sky, indigo, cyan, fuchsia, pink, purple, red, stone, zinc,
//     slate, gray) -> one shared true-neutral gray scale, so nothing on the
//     site can read as a third color or as warm/cream
// ---------------------------------------------------------------------------
const BRAND_GREEN = {
  50: "#f2fdf2",
  100: "#e1fae1",
  200: "#c0f3be",
  300: "#96ec93",
  400: "#61e25d",
  500: "#2cd827", // "Crop" green, sampled from the logo
  600: "#25b926",
  700: "#1c9025",
  800: "#146824",
  900: "#0d4923", // "Swap" dark green, sampled from the logo
  950: "#08301a",
};

// A true (cool, not warm/cream) neutral gray scale — matches Tailwind's own
// "neutral" numbers, reused for every non-brand color family so anything that
// used to read as cream/stone, amber, rose, violet, blue, etc. becomes clean
// black/white/gray instead.
const TRUE_NEUTRAL = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#e5e5e5",
  300: "#d4d4d4",
  400: "#a3a3a3",
  500: "#737373",
  600: "#525252",
  700: "#404040",
  800: "#262626",
  900: "#171717",
  950: "#0a0a0a",
};

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        emerald: BRAND_GREEN,
        green: BRAND_GREEN,
        teal: BRAND_GREEN,

        stone: TRUE_NEUTRAL,
        zinc: TRUE_NEUTRAL,
        slate: TRUE_NEUTRAL,
        gray: TRUE_NEUTRAL,
        neutral: TRUE_NEUTRAL,

        amber: TRUE_NEUTRAL,
        yellow: TRUE_NEUTRAL,
        orange: TRUE_NEUTRAL,
        lime: TRUE_NEUTRAL,
        rose: TRUE_NEUTRAL,
        red: TRUE_NEUTRAL,
        pink: TRUE_NEUTRAL,
        fuchsia: TRUE_NEUTRAL,
        purple: TRUE_NEUTRAL,
        violet: TRUE_NEUTRAL,
        indigo: TRUE_NEUTRAL,
        blue: TRUE_NEUTRAL,
        sky: TRUE_NEUTRAL,
        cyan: TRUE_NEUTRAL,
      },
    },
  },
  plugins: [],
};
