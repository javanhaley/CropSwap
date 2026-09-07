/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled straight from the two greens in the wordmark
        // (public/branding/cropswap-wordmark-transparent.png): "Crop" is the
        // bright leaf green, "Swap" is the deep forest green. Kept as named
        // brand colors (rather than one-off hex classes scattered around)
        // so "make it the Crop green" / "make it the Swap green" always
        // means exactly the same value everywhere in the app.
        brand: {
          crop: "#2CD827",
          swap: "#0D4923",
        },
      },
    },
  },
  plugins: [],
};
