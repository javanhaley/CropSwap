import React, { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext } from "react";
import {
  Search, X, Heart, MessageCircle, Send, Bell, User, Star, MapPin,
  Plus, ChevronDown, ChevronRight, Share2, LogOut, Pencil, Trash2, Store, ArrowLeft, Loader2, ThumbsUp, Camera,
  Volume2, VolumeX, Users, TrendingUp, Eye, Globe, Phone, Mail,
  Home, Package, Filter, GripVertical, BadgeCheck, AlertCircle,
  LayoutGrid, UserPlus, ShoppingBag, Sparkles, ShieldAlert, Bookmark,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
// Real persistence: attaches window.storage backed by Supabase (see storage.js)
// in place of the Claude.ai artifact runtime's sandbox-only implementation.
import "./storage";
import { supabase } from "./supabaseClient";
import AuthGate from "./AuthGate";

/* ============================================================================
   SECTION 1: DESIGN TOKENS
   Central palette / type / shape decisions. Change these, change the whole app.
============================================================================ */
const TOKENS = {
  bg: "cs-paper",
  surface: "bg-white",
  ink: "text-stone-800",
  inkSoft: "text-stone-500",
  border: "border-stone-200",
  primary: "bg-emerald-800",
  primaryHover: "hover:bg-emerald-700",
  primaryText: "text-emerald-800",
  primarySoft: "bg-emerald-50",
  primarySoftText: "text-emerald-800",
  accent: "bg-amber-500",
  accentText: "text-amber-700",
  ring: "focus:ring-2 focus:ring-emerald-700 focus:ring-offset-1",
};

const FONT_LINK_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";

const displayFont = { fontFamily: "'Fraunces', serif" };
const bodyFont = { fontFamily: "'Inter', sans-serif" };

/* ============================================================================
   SECTION 2: STATIC REFERENCE DATA (categories, themes, banners, socials)
============================================================================ */
const CATEGORIES = [
  { id: "Fruit", label: "Fruit", tint: "#b4524a", accent: "bg-rose-100 text-rose-700 border-rose-200" },
  { id: "Veggie", label: "Veggies", tint: "#5f7a3f", accent: "bg-lime-100 text-lime-700 border-lime-200" },
  { id: "Tree", label: "Trees & Plants", tint: "#3f6b4a", accent: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "Bug", label: "Bugs & Pollinators", tint: "#a1741f", accent: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "Dairy", label: "Dairy & Eggs", tint: "#9a7b2e", accent: "bg-yellow-100 text-yellow-700 border-yellow-200" },
];

/* Small drawn marks instead of emoji. Emoji render as another platform's
   cartoon artwork; these match the app's own hand. */
function CategoryMark({ id, size = 14, className = "" }) {
  const cat = CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
  const paths = {
    Fruit: <><circle cx="12" cy="14" r="7" /><path d="M12 7c0-2 1-4 3-5" fill="none" strokeWidth="1.6" stroke="currentColor" strokeLinecap="round" /></>,
    Veggie: <><path d="M12 21c-4-3-6-7-5-11 4-1 8 2 9 6-1 2-2 4-4 5Z" /><path d="M16 10c1-2 3-3 5-3 0 3-2 5-4 5" /></>,
    Tree: <><path d="M12 21v-6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" /><circle cx="12" cy="9" r="6" /></>,
    Bug: <><ellipse cx="12" cy="14" rx="5" ry="6" /><circle cx="12" cy="6" r="2.6" /><path d="M7 10 3 7M17 10l4-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></>,
    Dairy: <><ellipse cx="12" cy="13" rx="6" ry="8" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={cat.tint} className={className} aria-hidden="true">
      {paths[cat.id]}
    </svg>
  );
}
const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

const THEMES = [
  {
    id: "harvest",
    name: "Harvest",
    swatch: ["#065f46", "#fffbeb", "#b45309"],
    classes: { band: "bg-emerald-800", bandText: "text-white", accent: "text-amber-600", accentBg: "bg-amber-50", chip: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  },
  {
    id: "orchard",
    name: "Orchard",
    swatch: ["#7c2d12", "#fff7ed", "#c2410c"],
    classes: { band: "bg-orange-800", bandText: "text-white", accent: "text-orange-700", accentBg: "bg-orange-50", chip: "bg-orange-50 text-orange-800 border-orange-200" },
  },
  {
    id: "meadow",
    name: "Meadow",
    swatch: ["#3f6212", "#f7fee7", "#4d7c0f"],
    classes: { band: "bg-lime-800", bandText: "text-white", accent: "text-lime-700", accentBg: "bg-lime-50", chip: "bg-lime-50 text-lime-800 border-lime-200" },
  },
  {
    id: "dusk",
    name: "Dusk Market",
    swatch: ["#1e293b", "#f8fafc", "#7c3aed"],
    classes: { band: "bg-slate-800", bandText: "text-white", accent: "text-violet-600", accentBg: "bg-violet-50", chip: "bg-slate-100 text-slate-800 border-slate-300" },
  },
];
const themeInfo = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

const BANNER_PRESETS = [
  { id: "sold_out", label: "Sold Out", classes: "bg-stone-800 text-white" },
  { id: "new", label: "New This Week", classes: "bg-emerald-700 text-white" },
  { id: "preorder", label: "Pre-Order", classes: "bg-violet-700 text-white" },
  { id: "in_season", label: "In Season", classes: "bg-amber-500 text-stone-900" },
  { id: "limited", label: "Limited Batch", classes: "bg-rose-700 text-white" },
  { id: "free", label: "Free", classes: "bg-teal-700 text-white" },
];

const SOCIAL_PLATFORMS = [
  { id: "facebook", label: "Facebook", bg: "bg-blue-600", glyph: "f", prefix: "https://facebook.com/", hintTail: "yourfarm" },
  { id: "instagram", label: "Instagram", bg: "bg-gradient-to-br from-fuchsia-500 to-amber-400", glyph: "◎", prefix: "https://instagram.com/", hintTail: "yourfarm" },
  { id: "tiktok", label: "TikTok", bg: "bg-stone-900", glyph: "♪", prefix: "https://tiktok.com/@", hintTail: "yourfarm" },
  { id: "x", label: "X", bg: "bg-black", glyph: "X", prefix: "https://x.com/", hintTail: "yourfarm" },
  { id: "youtube", label: "YouTube", bg: "bg-red-600", glyph: "▶", prefix: "https://youtube.com/@", hintTail: "yourfarm" },
  { id: "website", label: "Website", bg: "bg-stone-600", glyph: null, icon: Globe, prefix: "https://", hintTail: "yourfarm.com" },
  { id: "phone", label: "Phone", bg: "bg-teal-600", glyph: null, icon: Phone, prefix: "", hintTail: "(555) 123-4567" },
  { id: "email", label: "Email", bg: "bg-indigo-600", glyph: null, icon: Mail, prefix: "", hintTail: "hello@yourfarm.com" },
];
const socialInfo = (id) => SOCIAL_PLATFORMS.find((s) => s.id === id);

/* ============================================================================
   SECTION 2c: BOTANICAL PLATES
   Drawn in code rather than fetched. External images cannot load in every host
   environment, and a produce grid full of broken tiles is worse than no grid at
   all. These render instantly, scale cleanly, and sit under the photo layer so a
   real photograph simply fades in over the top when one is available.
   Style: muted editorial botanical, not outlined cartoon.
============================================================================ */
const ART_PALETTE = {
  leaf: "#6f8f5a",
  leafDark: "#4d6b3d",
  stem: "#7a6a45",
  soil: "#7a6350",
  shadow: "rgba(70,60,45,0.14)",
};

/* Photographic depth without a photograph: directional light falloff, a contact
   shadow, film grain and a vignette. These are what make a flat vector read as a
   lit object rather than a sticker. */
function Plate({ children, tone = "#efe9dd" }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="cs-plate-light" cx="0.38" cy="0.28" r="0.85">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#3a3226" stopOpacity="0.12" />
        </radialGradient>
        <radialGradient id="cs-plate-vig" cx="0.5" cy="0.5" r="0.75">
          <stop offset="58%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#241d14" stopOpacity="0.26" />
        </radialGradient>
        <filter id="cs-plate-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="cs-plate-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={tone} />
      <rect width="100" height="100" fill="url(#cs-plate-light)" />
      <ellipse cx="50" cy="87" rx="27" ry="5" fill="#3a3226" opacity="0.18" filter="url(#cs-plate-soft)" />
      {children}
      <rect width="100" height="100" filter="url(#cs-plate-grain)" opacity="0.11" style={{ mixBlendMode: "multiply" }} />
      <rect width="100" height="100" fill="url(#cs-plate-vig)" />
    </svg>
  );
}

const LEAF = (x, y, rot, scale, color) => (
  <path
    d="M0 0 C 10 -8, 22 -6, 26 2 C 20 10, 8 10, 0 0 Z"
    fill={color}
    transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}
  />
);

/* Each plate is a small composition: form, shading, highlight, foliage. */
const PLATES = {
  tree: (
    <Plate tone="#e6ecdf">
      <path d="M48 86 L48 52 L52 52 L52 86 Z" fill={ART_PALETTE.stem} />
      <path d="M50 54 L38 66 M50 60 L62 70" stroke={ART_PALETTE.stem} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="36" r="24" fill={ART_PALETTE.leaf} />
      <circle cx="36" cy="44" r="15" fill={ART_PALETTE.leafDark} opacity="0.75" />
      <circle cx="63" cy="43" r="14" fill={ART_PALETTE.leafDark} opacity="0.6" />
      <circle cx="46" cy="27" r="12" fill="#87a86c" opacity="0.85" />
      <circle cx="42" cy="34" r="3" fill="#c0533f" />
      <circle cx="59" cy="40" r="2.6" fill="#c0533f" />
    </Plate>
  ),
  apple: (
    <Plate tone="#f2e6e2">
      <path d="M50 30 C 34 26, 22 40, 26 56 C 30 74, 44 84, 50 84 C 56 84, 70 74, 74 56 C 78 40, 66 26, 50 30 Z" fill="#b23b34" />
      <path d="M50 30 C 40 27, 31 36, 31 48 C 31 62, 39 74, 45 79 C 39 66, 37 46, 50 30 Z" fill="#cf5a4d" opacity="0.85" />
      <ellipse cx="38" cy="46" rx="6" ry="9" fill="#e08b7c" opacity="0.5" transform="rotate(-25 38 46)" />
      <path d="M50 30 L50 20" stroke="#6b5638" strokeWidth="3" strokeLinecap="round" />
      {LEAF(52, 22, -28, 0.7, ART_PALETTE.leaf)}
    </Plate>
  ),
  peach: (
    <Plate tone="#f6e7dc">
      <circle cx="50" cy="56" r="26" fill="#dd8352" />
      <path d="M50 30 C 36 34, 28 46, 30 60 C 32 72, 40 80, 48 82 C 38 70, 36 46, 50 30 Z" fill="#eda06e" opacity="0.9" />
      <path d="M50 31 C 52 44, 52 68, 50 82" stroke="#c46a45" strokeWidth="1.6" fill="none" opacity="0.7" />
      <ellipse cx="40" cy="46" rx="7" ry="10" fill="#f6bd93" opacity="0.55" transform="rotate(-20 40 46)" />
      <path d="M50 31 L50 22" stroke="#6b5638" strokeWidth="2.6" strokeLinecap="round" />
      {LEAF(51, 24, -35, 0.65, ART_PALETTE.leafDark)}
    </Plate>
  ),
  cherry: (
    <Plate tone="#f2e3e3">
      <path d="M50 22 C 42 34, 34 44, 34 52 M50 22 C 58 34, 66 44, 66 54" stroke="#6f7a4a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="62" r="13" fill="#9e2b33" />
      <circle cx="30" cy="58" r="4.5" fill="#c85259" opacity="0.6" />
      <circle cx="66" cy="64" r="14" fill="#b23640" />
      <circle cx="61" cy="59" r="5" fill="#d4646c" opacity="0.6" />
      {LEAF(52, 22, -18, 0.8, ART_PALETTE.leaf)}
    </Plate>
  ),
  grapes: (
    <Plate tone="#ebe6ef">
      {[[50, 40], [41, 48], [59, 48], [46, 57], [54, 57], [37, 57], [63, 57], [50, 66], [42, 66], [58, 66], [50, 75]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="7.5" fill={i % 3 === 0 ? "#5b4470" : i % 3 === 1 ? "#6d5382" : "#7d6295"} />
      ))}
      <path d="M50 34 L50 26" stroke="#6b5638" strokeWidth="2.6" strokeLinecap="round" />
      {LEAF(52, 27, -30, 0.85, ART_PALETTE.leafDark)}
    </Plate>
  ),
  berries: (
    <Plate tone="#eae4ec">
      <circle cx="38" cy="56" r="12" fill="#3f3357" />
      <circle cx="62" cy="52" r="13" fill="#4b3d66" />
      <circle cx="50" cy="70" r="11" fill="#584775" />
      <circle cx="34" cy="52" r="3.6" fill="#8878a3" opacity="0.65" />
      <circle cx="58" cy="47" r="4" fill="#8878a3" opacity="0.6" />
      {LEAF(50, 36, -20, 0.8, ART_PALETTE.leaf)}
      {LEAF(50, 36, 160, 0.7, ART_PALETTE.leafDark)}
    </Plate>
  ),
  citrus: (
    <Plate tone="#f6f0da">
      <circle cx="50" cy="56" r="25" fill="#e0a32e" />
      <circle cx="50" cy="56" r="25" fill="none" stroke="#c98b1c" strokeWidth="1.4" />
      <ellipse cx="40" cy="46" rx="8" ry="11" fill="#f2ce74" opacity="0.55" transform="rotate(-20 40 46)" />
      <path d="M50 31 L50 23" stroke="#6b5638" strokeWidth="2.6" strokeLinecap="round" />
      {LEAF(52, 25, -32, 0.75, ART_PALETTE.leafDark)}
    </Plate>
  ),
  pear: (
    <Plate tone="#eff0dd">
      <path d="M50 28 C 44 34, 46 42, 42 48 C 34 58, 34 74, 46 80 C 54 84, 66 78, 66 66 C 66 54, 58 48, 55 40 C 53 34, 55 30, 50 28 Z" fill="#b7bd52" />
      <path d="M50 28 C 45 35, 46 43, 42 49 C 36 58, 36 70, 43 76 C 38 64, 40 44, 50 28 Z" fill="#ccd177" opacity="0.85" />
      <path d="M50 28 L50 20" stroke="#6b5638" strokeWidth="2.6" strokeLinecap="round" />
      {LEAF(52, 22, -30, 0.7, ART_PALETTE.leafDark)}
    </Plate>
  ),
  tomato: (
    <Plate tone="#f3e4e0">
      <circle cx="50" cy="58" r="25" fill="#bc3b2c" />
      <path d="M27 54 C 34 42, 46 36, 50 36 C 54 36, 66 42, 73 54 C 66 44, 56 40, 50 40 C 44 40, 34 44, 27 54 Z" fill="#d15a45" opacity="0.7" />
      <ellipse cx="39" cy="49" rx="7" ry="9" fill="#e08d78" opacity="0.5" transform="rotate(-25 39 49)" />
      <path d="M50 36 L50 30" stroke="#5e7040" strokeWidth="2.6" strokeLinecap="round" />
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d="M0 0 L 10 -3 L 0 3 Z" fill="#5e7040" transform={`translate(50 35) rotate(${r}) scale(1.5)`} />
      ))}
    </Plate>
  ),
  carrot: (
    <Plate tone="#f5e9db">
      <path d="M50 40 L58 40 L52 84 L48 84 Z" fill="#d3762e" />
      <path d="M50 40 L54 40 L51 84 L49 84 Z" fill="#e5924b" opacity="0.8" />
      {[52, 60, 68, 76].map((y, i) => (
        <path key={i} d={`M${47 + i * 0.4} ${y} L${57 - i * 0.9} ${y - 1}`} stroke="#b45f22" strokeWidth="1" opacity="0.55" />
      ))}
      {LEAF(52, 38, -75, 0.8, ART_PALETTE.leaf)}
      {LEAF(52, 38, -105, 0.8, ART_PALETTE.leafDark)}
      {LEAF(52, 38, -90, 0.9, "#87a86c")}
    </Plate>
  ),
  greens: (
    <Plate tone="#e8eddc">
      <path d="M50 84 C 30 78, 22 60, 28 44 C 36 52, 42 58, 48 62 C 44 48, 44 34, 50 24 C 56 34, 56 48, 52 62 C 58 58, 64 52, 72 44 C 78 60, 70 78, 50 84 Z" fill={ART_PALETTE.leaf} />
      <path d="M50 84 C 40 74, 36 58, 38 46 C 44 54, 47 60, 49 64 C 46 50, 47 34, 50 24 Z" fill={ART_PALETTE.leafDark} opacity="0.65" />
      <path d="M50 82 L50 30" stroke="#3f5a30" strokeWidth="1.4" opacity="0.5" />
    </Plate>
  ),
  garlic: (
    <Plate tone="#f2ece2">
      <path d="M50 30 C 38 38, 32 52, 34 64 C 36 76, 44 82, 50 82 C 56 82, 64 76, 66 64 C 68 52, 62 38, 50 30 Z" fill="#f0eae0" />
      <path d="M50 30 C 44 40, 42 58, 44 74 M50 30 C 56 40, 58 58, 56 74" stroke="#d5cbbb" strokeWidth="1.6" fill="none" />
      <path d="M50 30 C 47 22, 49 16, 50 12 C 51 16, 53 22, 50 30 Z" fill="#a89a7d" />
      <ellipse cx="42" cy="56" rx="5" ry="12" fill="#fbf7f0" opacity="0.7" transform="rotate(-8 42 56)" />
    </Plate>
  ),
  root: (
    <Plate tone="#f0e7da">
      <ellipse cx="42" cy="58" rx="17" ry="14" fill="#a97f52" transform="rotate(-12 42 58)" />
      <ellipse cx="62" cy="66" rx="14" ry="12" fill="#966f46" transform="rotate(10 62 66)" />
      <ellipse cx="37" cy="52" rx="5" ry="4" fill="#c39a6b" opacity="0.55" />
      <circle cx="46" cy="62" r="1.6" fill="#7d5a38" opacity="0.6" />
      <circle cx="58" cy="63" r="1.4" fill="#7d5a38" opacity="0.55" />
    </Plate>
  ),
  mushroom: (
    <Plate tone="#eee7dc">
      <path d="M44 60 C 42 72, 42 80, 44 84 L56 84 C 58 80, 58 72, 56 60 Z" fill="#e6dcc9" />
      <path d="M24 58 C 24 40, 36 30, 50 30 C 64 30, 76 40, 76 58 C 66 62, 34 62, 24 58 Z" fill="#8a6244" />
      <path d="M24 58 C 24 42, 34 32, 46 30 C 36 38, 30 48, 30 60 Z" fill="#a67c58" opacity="0.8" />
      <ellipse cx="42" cy="44" rx="6" ry="4" fill="#b98f68" opacity="0.5" transform="rotate(-20 42 44)" />
    </Plate>
  ),
  bee: (
    <Plate tone="#f7efd8">
      <ellipse cx="38" cy="42" rx="16" ry="9" fill="#e8eef5" opacity="0.85" transform="rotate(-28 38 42)" />
      <ellipse cx="62" cy="42" rx="16" ry="9" fill="#e8eef5" opacity="0.85" transform="rotate(28 62 42)" />
      <ellipse cx="50" cy="58" rx="19" ry="15" fill="#e0a92e" />
      <path d="M40 50 C 44 62, 44 66, 41 70 M50 45 C 52 60, 52 68, 50 73 M60 50 C 57 62, 57 66, 59 70" stroke="#4a3a1e" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="38" r="7" fill="#4a3a1e" />
    </Plate>
  ),
  ladybug: (
    <Plate tone="#f2ebe0">
      <ellipse cx="50" cy="58" rx="21" ry="18" fill="#b2352c" />
      <path d="M50 40 L50 76" stroke="#3a2a20" strokeWidth="2.2" />
      <circle cx="50" cy="40" r="8" fill="#3a2a20" />
      <circle cx="41" cy="52" r="3.4" fill="#3a2a20" />
      <circle cx="60" cy="54" r="3.8" fill="#3a2a20" />
      <circle cx="44" cy="66" r="3" fill="#3a2a20" />
      <circle cx="58" cy="67" r="2.8" fill="#3a2a20" />
    </Plate>
  ),
  worm: (
    <Plate tone="#2c3527">
      {/* cupped hands, dark earth, red wigglers — after the reference photo */}
      <path d="M6 58 C 16 46, 32 41, 50 41 C 68 41, 84 46, 94 58 C 90 79, 72 93, 50 93 C 28 93, 10 79, 6 58 Z" fill="#d9a480" />
      <path d="M12 60 C 22 50, 36 46, 50 46 C 64 46, 78 50, 88 60 C 84 77, 68 88, 50 88 C 32 88, 16 77, 12 60 Z" fill="#c08a68" />
      <path d="M18 63 C 27 55, 38 52, 50 52 C 62 52, 73 55, 82 63 C 78 76, 66 84, 50 84 C 34 84, 22 76, 18 63 Z" fill="#3a2c20" />
      <ellipse cx="50" cy="63" rx="29" ry="14" fill="#2f241a" />
      <ellipse cx="44" cy="59" rx="16" ry="7" fill="#453425" opacity="0.75" />
      {[[30, 58], [38, 68], [52, 55], [60, 70], [68, 61], [46, 73], [58, 63], [36, 62], [64, 55]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1 + (i % 3) * 0.5} fill="#5a4530" opacity="0.85" />
      ))}
      <path d="M30 64 C 36 56, 44 70, 52 60" stroke="#a05a4a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M42 72 C 50 64, 58 76, 68 66" stroke="#8d4c3f" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M48 56 C 56 50, 64 60, 72 54" stroke="#b06a58" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M31 63 C 36 57, 43 68, 51 60" stroke="#c08476" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M6 58 C 16 46, 32 41, 50 41 C 60 41, 70 43, 78 47" stroke="#e8bb99" strokeWidth="1.6" fill="none" opacity="0.55" strokeLinecap="round" />
    </Plate>
  ),
  egg: (
    <Plate tone="#f4efe4">
      <ellipse cx="36" cy="62" rx="15" ry="19" fill="#e8dcc4" />
      <ellipse cx="62" cy="58" rx="16" ry="21" fill="#f2e9d6" />
      <ellipse cx="57" cy="49" rx="5" ry="7" fill="#fdf8ec" opacity="0.8" transform="rotate(-15 57 49)" />
      <ellipse cx="32" cy="55" rx="4" ry="6" fill="#f6efdf" opacity="0.7" transform="rotate(-15 32 55)" />
    </Plate>
  ),
  honey: (
    <Plate tone="#f7edd5">
      <path d="M34 42 L66 42 L69 76 C 69 82, 62 84, 50 84 C 38 84, 31 82, 31 76 Z" fill="#dda32c" />
      <path d="M34 42 L46 42 L44 84 C 38 84, 32 82, 31 76 Z" fill="#eaba50" opacity="0.8" />
      <rect x="31" y="36" width="38" height="8" rx="3" fill="#8a6a3c" />
      <rect x="38" y="54" width="24" height="14" rx="2" fill="#f6ecd6" opacity="0.9" />
      <path d="M43 61 L57 61" stroke="#b98421" strokeWidth="2" />
    </Plate>
  ),
  dairy: (
    <Plate tone="#f6f1e0">
      <path d="M28 68 L50 34 L74 68 Z" fill="#e8c463" />
      <path d="M28 68 L50 34 L58 68 Z" fill="#f0d385" opacity="0.85" />
      <circle cx="46" cy="58" r="4" fill="#d9ad45" />
      <circle cx="58" cy="62" r="3" fill="#d9ad45" />
      <circle cx="52" cy="48" r="2.4" fill="#d9ad45" />
      <path d="M28 68 L74 68 L72 74 L30 74 Z" fill="#d3ab4e" />
    </Plate>
  ),
  houseplant: (
    <Plate tone="#e9ede3">
      <path d="M38 66 L62 66 L58 84 L42 84 Z" fill="#b5765a" />
      <rect x="36" y="60" width="28" height="8" rx="2" fill="#c9866a" />
      {LEAF(50, 58, -100, 1.0, ART_PALETTE.leafDark)}
      {LEAF(50, 58, -70, 1.0, ART_PALETTE.leaf)}
      {LEAF(50, 58, -130, 0.85, "#87a86c")}
      {LEAF(50, 58, -40, 0.85, ART_PALETTE.leafDark)}
      {LEAF(50, 56, -90, 0.7, "#9dbb80")}
    </Plate>
  ),
  sprout: (
    <Plate tone="#ecefe1">
      <path d="M14 78 C 34 74, 66 74, 86 78 L86 88 L14 88 Z" fill={ART_PALETTE.soil} opacity="0.45" />
      <path d="M50 78 L50 48" stroke="#5e7040" strokeWidth="3" strokeLinecap="round" />
      {LEAF(50, 52, -30, 0.85, ART_PALETTE.leaf)}
      {LEAF(50, 52, 210, 0.85, ART_PALETTE.leafDark)}
      {LEAF(50, 44, -90, 0.6, "#9dbb80")}
    </Plate>
  ),
  squash: (
    <Plate tone="#f5ead7">
      <ellipse cx="50" cy="60" rx="25" ry="21" fill="#d98a35" />
      <path d="M35 44 C 32 56, 32 68, 37 78 M50 40 C 48 56, 48 66, 50 80 M65 44 C 68 56, 68 68, 63 78" stroke="#bd7025" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M50 39 L50 30" stroke="#6f6237" strokeWidth="4" strokeLinecap="round" />
      {LEAF(53, 32, -40, 0.6, ART_PALETTE.leafDark)}
    </Plate>
  ),
  grain: (
    <Plate tone="#f4eeda">
      <path d="M50 84 L50 40" stroke="#b99a55" strokeWidth="2.4" strokeLinecap="round" />
      {[46, 53, 60, 67].map((y, i) => (
        <g key={i}>
          <ellipse cx="43" cy={y} rx="7" ry="4" fill="#d9bd74" transform={`rotate(-30 43 ${y})`} />
          <ellipse cx="57" cy={y + 3} rx="7" ry="4" fill="#c9a95f" transform={`rotate(30 57 ${y + 3})`} />
        </g>
      ))}
      <ellipse cx="50" cy="38" rx="5" ry="7" fill="#e0c684" />
    </Plate>
  ),
};

/* Maps the catalogue's photo keys onto a plate. */
const ART_FOR_KEY = {
  apple: "apple", cherry: "cherry", grape: "grapes", raspberry: "berries", currant: "berries",
  berries: "berries", blueberry: "berries", blackberry: "berries", nut: "grain", plum: "peach",
  flower: "sprout", sunflower: "sprout", bees: "bee", ladybug: "ladybug", soil: "worm",
  microbes: "worm", garlic: "garlic", greens: "greens", radish: "root", tomato: "tomato",
  basil: "greens", peas: "greens", carrot: "carrot", lettuce: "greens", potato: "root",
  onion: "garlic", peach: "peach", pear: "pear", houseplant: "houseplant", pomegranate: "apple",
  truffle: "mushroom", forest: "tree", farm: "egg",
};

const ART_FOR_CATEGORY = { Fruit: "apple", Veggie: "greens", Tree: "tree", Bug: "bee", Dairy: "egg" };

function ProduceArt({ artKey, category }) {
  const kind = (artKey && PLATES[artKey] ? artKey : null) || (artKey && ART_FOR_KEY[artKey]) || ART_FOR_CATEGORY[category] || "sprout";
  return PLATES[kind] || PLATES.sprout;
}

/* ============================================================================
   SECTION 2d: COVER SCENES
   Vendor covers are drawn rather than fetched, for the same reason as the
   produce plates: an unreachable image leaves a flat colour band. Each scene is
   a layered landscape that reads at both banner and thumbnail size. Vendors pick
   theirs in the storefront builder, and a real uploaded photo layers on top.
============================================================================ */
const SCENE_LIST = [
  { id: "hills", label: "Rolling hills" },
  { id: "orchard", label: "Orchard rows" },
  { id: "greenhouse", label: "Greenhouse" },
  { id: "pasture", label: "Open pasture" },
  { id: "mountains", label: "Mountain valley" },
  { id: "prairie", label: "Prairie fields" },
  { id: "coastal", label: "Coastal farm" },
  { id: "woodland", label: "Woodland edge" },
];

const FURROWS = (ys, color) =>
  ys.map((y, i) => (
    <path key={i} d={`M0 ${y} C 110 ${y - 5}, 260 ${y + 5}, 400 ${y - 3}`} stroke={color} strokeWidth="1.1" fill="none" opacity="0.45" />
  ));

const CONIFER = (x, y, h, color) => (
  <path d={`M${x} ${y} L${x - h * 0.34} ${y + h} L${x + h * 0.34} ${y + h} Z`} fill={color} />
);

const SCENES = {
  hills: (
    <>
      <defs>
        <linearGradient id="cs-sky-hills" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c3d6e0" />
          <stop offset="70%" stopColor="#e9e3d0" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#cs-sky-hills)" />
      <circle cx="322" cy="36" r="15" fill="#f4e6bd" opacity="0.85" />
      <path d="M0 74 C 70 58, 130 82, 200 70 C 262 60, 330 78, 400 64 L400 140 L0 140 Z" fill="#a3b189" />
      <path d="M0 94 C 76 82, 148 100, 226 90 C 296 82, 352 96, 400 88 L400 140 L0 140 Z" fill="#87996d" />
      <path d="M0 112 C 84 102, 168 118, 254 108 C 322 100, 362 112, 400 106 L400 140 L0 140 Z" fill="#6d8456" />
      {FURROWS([118, 125, 132, 138], "#5a7047")}
    </>
  ),
  orchard: (
    <>
      <defs>
        <linearGradient id="cs-sky-orchard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d5e2e6" />
          <stop offset="75%" stopColor="#efe6d2" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#cs-sky-orchard)" />
      <path d="M0 80 C 90 70, 200 86, 400 74 L400 140 L0 140 Z" fill="#9dae82" />
      <path d="M0 100 C 120 92, 260 106, 400 96 L400 140 L0 140 Z" fill="#7e9367" />
      {[28, 92, 156, 220, 284, 348].map((x, i) => {
        const scale = 1 - (i % 3) * 0.12;
        return (
          <g key={x}>
            <rect x={x - 2} y={86 - 18 * scale} width="4" height={24 * scale} fill="#7a6244" />
            <circle cx={x} cy={78 - 18 * scale} r={17 * scale} fill="#6f8f5a" />
            <circle cx={x - 6 * scale} cy={84 - 18 * scale} r={11 * scale} fill="#5d7c4a" opacity="0.8" />
            <circle cx={x + 5 * scale} cy={72 - 18 * scale} r={8 * scale} fill="#86a56b" opacity="0.85" />
          </g>
        );
      })}
      {FURROWS([116, 124, 132], "#677d52")}
    </>
  ),
  greenhouse: (
    <>
      <defs>
        <linearGradient id="cs-sky-gh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cddfe4" />
          <stop offset="80%" stopColor="#eee7d5" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#cs-sky-gh)" />
      <path d="M0 96 C 120 88, 260 100, 400 92 L400 140 L0 140 Z" fill="#8b9d70" />
      <g opacity="0.95">
        <path d="M120 96 L120 52 L200 26 L280 52 L280 96 Z" fill="#dfe8e4" stroke="#9fb0aa" strokeWidth="1.6" />
        <path d="M200 26 L200 96 M120 52 L280 52 M160 39 L160 96 M240 39 L240 96 M120 74 L280 74" stroke="#9fb0aa" strokeWidth="1.2" />
        <rect x="188" y="74" width="24" height="22" fill="#b7c6bf" />
      </g>
      {[40, 66, 92, 308, 334, 360].map((x) => (
        <g key={x}>
          <path d={`M${x} 108 L${x} 94`} stroke="#5e7040" strokeWidth="2" />
          <circle cx={x - 4} cy={94} r="4" fill="#6f8f5a" />
          <circle cx={x + 4} cy={97} r="4" fill="#5d7c4a" />
        </g>
      ))}
      {FURROWS([118, 128], "#6c7f53")}
    </>
  ),
  pasture: (
    <>
      <defs>
        <linearGradient id="cs-sky-pasture" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfd6e2" />
          <stop offset="70%" stopColor="#e6e8d5" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#cs-sky-pasture)" />
      <ellipse cx="90" cy="34" rx="34" ry="12" fill="#f2f4f0" opacity="0.75" />
      <ellipse cx="118" cy="30" rx="24" ry="10" fill="#f7f8f4" opacity="0.7" />
      <ellipse cx="290" cy="42" rx="30" ry="10" fill="#f2f4f0" opacity="0.6" />
      <path d="M0 84 C 100 72, 220 90, 400 76 L400 140 L0 140 Z" fill="#9cb07f" />
      <path d="M0 104 C 120 96, 250 110, 400 100 L400 140 L0 140 Z" fill="#7f9765" />
      {[20, 70, 120, 170, 220, 270, 320, 370].map((x) => (
        <rect key={x} x={x} y="96" width="3" height="18" fill="#8a7350" rx="1" />
      ))}
      <path d="M12 102 L392 96 M12 110 L392 104" stroke="#8a7350" strokeWidth="1.8" opacity="0.85" />
    </>
  ),
  mountains: (
    <>
      <defs>
        <linearGradient id="cs-sky-mtn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9cede" />
          <stop offset="75%" stopColor="#e4e5d6" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#cs-sky-mtn)" />
      <path d="M-10 82 L70 26 L128 68 L176 40 L246 82 Z" fill="#8b93a1" />
      <path d="M70 26 L92 42 L60 46 Z M176 40 L192 52 L162 54 Z" fill="#f0f2f3" />
      <path d="M180 84 L268 34 L340 74 L410 44 L410 96 L180 96 Z" fill="#7c869a" opacity="0.85" />
      <path d="M268 34 L288 50 L250 52 Z" fill="#eef1f2" />
      <path d="M0 84 C 90 76, 200 92, 400 82 L400 140 L0 140 Z" fill="#5f7550" />
      {[16, 44, 72, 100, 300, 330, 358, 386].map((x, i) => CONIFER(x, 66 + (i % 2) * 6, 26, "#46603c"))}
      <path d="M0 106 C 120 98, 250 112, 400 102 L400 140 L0 140 Z" fill="#7d9163" />
    </>
  ),
  prairie: (
    <>
      <defs>
        <linearGradient id="cs-sky-prairie" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8d9e2" />
          <stop offset="55%" stopColor="#f0e6cb" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#cs-sky-prairie)" />
      <circle cx="330" cy="42" r="18" fill="#f6e3b0" opacity="0.8" />
      <path d="M0 92 C 130 84, 270 96, 400 88 L400 140 L0 140 Z" fill="#d9c176" />
      <path d="M0 108 C 140 100, 260 112, 400 104 L400 140 L0 140 Z" fill="#c4a95c" />
      {Array.from({ length: 26 }).map((_, i) => {
        const x = 8 + i * 15.5;
        const y = 112 + ((i * 7) % 9);
        return (
          <g key={i} opacity="0.8">
            <path d={`M${x} ${y + 14} L${x} ${y}`} stroke="#a98f45" strokeWidth="1.2" />
            <ellipse cx={x} cy={y - 2} rx="2.4" ry="4" fill="#e0c97f" />
          </g>
        );
      })}
    </>
  ),
  coastal: (
    <>
      <defs>
        <linearGradient id="cs-sky-coast" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bcd4e2" />
          <stop offset="70%" stopColor="#e7ead9" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#cs-sky-coast)" />
      <rect y="70" width="400" height="24" fill="#8fb2c4" />
      <path d="M0 78 C 40 74, 60 82, 100 78 M120 86 C 160 82, 180 90, 220 86 M250 76 C 290 72, 310 80, 350 76" stroke="#cfe0e8" strokeWidth="1.4" fill="none" opacity="0.8" />
      <path d="M0 94 C 90 86, 200 100, 400 90 L400 140 L0 140 Z" fill="#93a878" />
      <path d="M0 112 C 120 104, 250 118, 400 108 L400 140 L0 140 Z" fill="#748c5c" />
      {FURROWS([120, 128, 136], "#61784c")}
      {[350, 372].map((x, i) => CONIFER(x, 62 + i * 5, 22, "#4d6b3d"))}
    </>
  ),
  woodland: (
    <>
      <defs>
        <linearGradient id="cs-sky-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d3ddd8" />
          <stop offset="80%" stopColor="#e9e6d4" />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill="url(#cs-sky-wood)" />
      <g opacity="0.55">{[10, 40, 70, 100, 130, 160, 190, 220, 250, 280, 310, 340, 370].map((x, i) => CONIFER(x, 34 + ((i * 5) % 14), 46, "#7d9080"))}</g>
      <g>{[0, 34, 68, 102, 136, 170, 204, 238, 272, 306, 340, 374].map((x, i) => CONIFER(x + 12, 52 + ((i * 7) % 12), 44, "#4f6b47"))}</g>
      <path d="M0 100 C 120 92, 260 106, 400 96 L400 140 L0 140 Z" fill="#6f8757" />
      <path d="M0 118 C 130 110, 270 122, 400 114 L400 140 L0 140 Z" fill="#5b7148" />
    </>
  ),
};

function BannerScene({ scene, className = "" }) {
  const key = SCENES[scene] ? scene : "hills";
  return (
    <svg
      viewBox="0 0 400 140"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    >
      {SCENES[key]}
    </svg>
  );
}

// Stable default when a shop has not chosen one, so covers vary rather than all
// falling back to the same scene.
function defaultScene(seed) {
  const sum = String(seed || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return SCENE_LIST[sum % SCENE_LIST.length].id;
}

/* ============================================================================
   SECTION 2b: PHOTOGRAPHY
   Real photographs from the Unsplash CDN (free to hotlink under their licence).
   Every image is paired with a designed fallback tile, so a slow connection or
   a retired photo degrades to something intentional rather than a broken icon.
============================================================================ */
const PHOTO = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;
const PEXELS = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`;

/* Photographs are stored as { url, by, source } so the credit travels with the
   image instead of being hard-coded at the render site. To swap in a new photo,
   add one entry here — nothing else changes. Verified Pexels entries carry the
   photographer's name; entries without a verified name credit only the source,
   because attributing a photo to the wrong person is worse than not naming one. */
const BANNER_PHOTO = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=70`;

const IMG = {
  apple: { url: PHOTO("photo-1560806887-1e4cd0b6cbd6"), by: null, source: "Unsplash" },
  cherry: { url: PHOTO("photo-1528821128474-27f963b062bf"), by: null, source: "Unsplash" },
  grape: { url: PHOTO("photo-1537640538966-79f369143f8f"), by: null, source: "Unsplash" },
  raspberry: { url: PHOTO("photo-1546548970-71785318a17b"), by: null, source: "Unsplash" },
  currant: { url: PHOTO("photo-1576045057995-568f588f82fb"), by: null, source: "Unsplash" },
  berries: { url: PHOTO("photo-1661022437133-e198324b8b4c"), by: null, source: "Unsplash" },
  blueberry: { url: PHOTO("photo-1498557850523-fd3d118b962e"), by: null, source: "Unsplash" },
  blackberry: { url: PHOTO("photo-1562845029-d1b530d4cfd3"), by: null, source: "Unsplash" },
  nut: { url: PHOTO("photo-1540914482491-3e1ad1098db7"), by: null, source: "Unsplash" },
  plum: { url: PHOTO("photo-1637715204478-c00c57d776aa"), by: null, source: "Unsplash" },
  flower: { url: PHOTO("photo-1557844352-761f2565b576"), by: null, source: "Unsplash" },
  sunflower: { url: PHOTO("photo-1597848212624-a19eb35e2651"), by: null, source: "Unsplash" },
  bees: { url: PHOTO("photo-1558642452-9d2a7deb7f62"), by: null, source: "Unsplash" },
  ladybug: { url: PHOTO("photo-1534567153574-2b12153a87f0"), by: null, source: "Unsplash" },
  soil: { url: PEXELS(3696170), by: "Sippakorn Yamkasikorn", source: "Pexels" },
  microbes: { url: PHOTO("photo-1517944552402-6beffe249029"), by: null, source: "Unsplash" },
  garlic: { url: PHOTO("photo-1575025120628-9d016842e612"), by: null, source: "Unsplash" },
  greens: { url: PHOTO("photo-1524179091875-bf99a9a6af57"), by: null, source: "Unsplash" },
  radish: { url: PHOTO("photo-1688045232387-df140c59e234"), by: null, source: "Unsplash" },
  tomato: { url: PHOTO("photo-1592924357228-91a4daadcfea"), by: null, source: "Unsplash" },
  basil: { url: PHOTO("photo-1776257217010-1c2e92207f2a"), by: null, source: "Unsplash" },
  peas: { url: PHOTO("photo-1563565375-f3fdfdbefa83"), by: null, source: "Unsplash" },
  carrot: { url: PHOTO("photo-1598170845058-32b9d6a5da37"), by: null, source: "Unsplash" },
  lettuce: { url: PHOTO("photo-1622206151226-18ca2c9ab4a1"), by: null, source: "Unsplash" },
  potato: { url: PHOTO("photo-1518977676601-b53f82aba655"), by: null, source: "Unsplash" },
  onion: { url: PHOTO("photo-1618512496248-a07fe83aa8cb"), by: null, source: "Unsplash" },
  peach: { url: PHOTO("photo-1517355352485-3c18847c2f7d"), by: null, source: "Unsplash" },
  pear: { url: PHOTO("photo-1550828553-7c8732c4bda6"), by: null, source: "Unsplash" },
  houseplant: { url: PHOTO("photo-1614594975525-e45190c55d0b"), by: null, source: "Unsplash" },
  pomegranate: { url: PHOTO("photo-1541832676-9b763b0239ab"), by: null, source: "Unsplash" },
  truffle: { url: PHOTO("photo-1760288256101-bb930c69bb61"), by: null, source: "Unsplash" },
  forest: { url: PHOTO("photo-1441974231531-c6227db76b6e"), by: null, source: "Unsplash" },
  farm: { url: PHOTO("photo-1589923188900-85dae523342b"), by: null, source: "Unsplash" },
};

// Category tiles: layered gradients evoking real materials (soil, sky, honey,
// leaf, eggshell). Used whenever a photo is missing or fails to load.
// Muted paper-and-produce tones. A missing photo should read as considered
// stationery, not as a bright cartoon tile.
const CATEGORY_TEXTURE = {
  Fruit: "linear-gradient(160deg,#f6efe9 0%,#e8d5cb 100%)",
  Veggie: "linear-gradient(160deg,#f1f2e9 0%,#d8ddc9 100%)",
  Tree: "linear-gradient(160deg,#eef1ec 0%,#cfd9cd 100%)",
  Bug: "linear-gradient(160deg,#f7f1e4 0%,#e5d7bd 100%)",
  Dairy: "linear-gradient(160deg,#f9f4e8 0%,#ece0c8 100%)",
};

/* ============================================================================
   SECTION 2f: QR ENCODER
   Vendors print these for a market table, so a code that scans is the whole
   point. Implemented to spec rather than approximated: byte mode, error
   correction level L, versions 1-6 (up to 134 bytes, ample for a shop URL).
   Verified by decoding its own output back to the source string.
============================================================================ */

// --- GF(256) arithmetic for Reed-Solomon, primitive polynomial 0x11D ---
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], GF_EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[i + 1], factor);
  }
  return res;
}

// --- version tables (EC level L) ---
// [total codewords, ec codewords per block, [ [blockCount, dataPerBlock], ... ] ]
const QR_VERSIONS = {
  1: { total: 26, ec: 7, groups: [[1, 19]], align: [] },
  2: { total: 44, ec: 10, groups: [[1, 34]], align: [6, 18] },
  3: { total: 70, ec: 15, groups: [[1, 55]], align: [6, 22] },
  4: { total: 100, ec: 20, groups: [[1, 80]], align: [6, 26] },
  5: { total: 134, ec: 26, groups: [[1, 108]], align: [6, 30] },
  6: { total: 172, ec: 18, groups: [[2, 68]], align: [6, 34] },
};
const qrDataCapacity = (v) => QR_VERSIONS[v].groups.reduce((n, [c, d]) => n + c * d, 0);

function pickVersion(byteLen) {
  for (let v = 1; v <= 6; v++) {
    // 4 bits mode + 8 bits length + payload, rounded up to whole codewords
    if (qrDataCapacity(v) >= byteLen + 2) return v;
  }
  return null;
}

function buildBitstream(bytes, version) {
  const bits = [];
  const push = (value, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  push(0b0100, 4); // byte mode
  push(bytes.length, 8); // char count, 8 bits for versions 1-9
  bytes.forEach((b) => push(b, 8));

  const capacityBits = qrDataCapacity(version) * 8;
  for (let i = 0; i < 4 && bits.length < capacityBits; i++) bits.push(0); // terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  }
  const pads = [0xec, 0x11];
  let p = 0;
  while (codewords.length < qrDataCapacity(version)) codewords.push(pads[p++ % 2]);
  return codewords;
}

function interleave(codewords, version) {
  const { ec, groups } = QR_VERSIONS[version];
  const blocks = [];
  let offset = 0;
  groups.forEach(([count, dataLen]) => {
    for (let i = 0; i < count; i++) {
      const data = codewords.slice(offset, offset + dataLen);
      offset += dataLen;
      blocks.push({ data, ecc: rsEncode(data, ec) });
    }
  });

  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    blocks.forEach((b) => {
      if (i < b.data.length) out.push(b.data[i]);
    });
  }
  for (let i = 0; i < ec; i++) blocks.forEach((b) => out.push(b.ecc[i]));
  return out;
}

// --- matrix ---
function emptyMatrix(size) {
  return {
    modules: Array.from({ length: size }, () => new Array(size).fill(null)),
    reserved: Array.from({ length: size }, () => new Array(size).fill(false)),
    size,
  };
}

function placeFinder(m, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= m.size || cc >= m.size) continue;
      const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      m.modules[rr][cc] = inRing || inCore ? 1 : 0;
      m.reserved[rr][cc] = true;
    }
  }
}

function placeAlignment(m, version) {
  const centres = QR_VERSIONS[version].align;
  if (!centres.length) return;
  centres.forEach((r) => {
    centres.forEach((c) => {
      // skip the three finder corners
      if ((r === 6 && c === 6) || (r === 6 && c === m.size - 7) || (r === m.size - 7 && c === 6)) return;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          m.modules[r + dr][c + dc] = ring === 1 ? 0 : 1;
          m.reserved[r + dr][c + dc] = true;
        }
      }
    });
  });
}

function placeTimingAndReserved(m) {
  for (let i = 8; i < m.size - 8; i++) {
    const bit = i % 2 === 0 ? 1 : 0;
    m.modules[6][i] = bit;
    m.reserved[6][i] = true;
    m.modules[i][6] = bit;
    m.reserved[i][6] = true;
  }
  // dark module
  m.modules[m.size - 8][8] = 1;
  m.reserved[m.size - 8][8] = true;
  // format information areas
  for (let i = 0; i <= 8; i++) {
    if (!m.reserved[8][i]) {
      m.reserved[8][i] = true;
      m.modules[8][i] = 0;
    }
    if (!m.reserved[i][8]) {
      m.reserved[i][8] = true;
      m.modules[i][8] = 0;
    }
  }
  for (let i = 0; i < 8; i++) {
    if (!m.reserved[8][m.size - 1 - i]) {
      m.reserved[8][m.size - 1 - i] = true;
      m.modules[8][m.size - 1 - i] = 0;
    }
    if (!m.reserved[m.size - 1 - i][8]) {
      m.reserved[m.size - 1 - i][8] = true;
      m.modules[m.size - 1 - i][8] = 0;
    }
  }
}

// Zigzag placement path, shared by the encoder and the verifier.
function dataPath(m) {
  const path = [];
  let upward = true;
  for (let right = m.size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column
    for (let step = 0; step < m.size; step++) {
      const row = upward ? m.size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (!m.reserved[row][col]) path.push([row, col]);
      }
    }
    upward = !upward;
  }
  return path;
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function formatBits(maskIndex) {
  // EC level L = 01, then 3 mask bits, BCH(15,5), XOR 0x5412
  const data = (0b01 << 3) | maskIndex;
  let value = data << 10;
  for (let i = 4; i >= 0; i--) {
    if (value & (1 << (i + 10))) value ^= 0b10100110111 << i;
  }
  return ((data << 10) | value) ^ 0b101010000010010;
}

function applyFormat(m, maskIndex) {
  const bits = formatBits(maskIndex);
  const get = (i) => (bits >> i) & 1;
  for (let i = 0; i <= 5; i++) m.modules[8][i] = get(i);
  m.modules[8][7] = get(6);
  m.modules[8][8] = get(7);
  m.modules[7][8] = get(8);
  for (let i = 9; i <= 14; i++) m.modules[14 - i][8] = get(i);
  for (let i = 0; i <= 7; i++) m.modules[m.size - 1 - i][8] = get(i);
  for (let i = 8; i <= 14; i++) m.modules[8][m.size - 15 + i] = get(i);
  m.modules[m.size - 8][8] = 1;
}

function penalty(m) {
  let score = 0;
  const n = m.size;
  // runs of five or more
  for (let r = 0; r < n; r++) {
    for (let dir = 0; dir < 2; dir++) {
      let run = 1;
      for (let i = 1; i < n; i++) {
        const cur = dir === 0 ? m.modules[r][i] : m.modules[i][r];
        const prev = dir === 0 ? m.modules[r][i - 1] : m.modules[i - 1][r];
        if (cur === prev) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
  }
  // 2x2 blocks
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = m.modules[r][c];
      if (v === m.modules[r][c + 1] && v === m.modules[r + 1][c] && v === m.modules[r + 1][c + 1]) score += 3;
    }
  }
  // proportion of dark modules
  let dark = 0;
  m.modules.forEach((row) => row.forEach((v) => (dark += v)));
  const pct = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}

function qrEncode(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const version = pickVersion(bytes.length);
  if (!version) return null;

  const codewords = interleave(buildBitstream(bytes, version), version);
  const size = 17 + version * 4;

  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const m = emptyMatrix(size);
    placeFinder(m, 0, 0);
    placeFinder(m, 0, size - 7);
    placeFinder(m, size - 7, 0);
    placeAlignment(m, version);
    placeTimingAndReserved(m);

    const path = dataPath(m);
    path.forEach(([r, c], i) => {
      const byte = codewords[i >> 3];
      const bit = byte === undefined ? 0 : (byte >> (7 - (i & 7))) & 1;
      m.modules[r][c] = MASKS[mask](r, c) ? bit ^ 1 : bit;
    });
    applyFormat(m, mask);

    const score = penalty(m);
    if (!best || score < best.score) best = { score, matrix: m, mask };
  }
  return { size, version, mask: best.mask, modules: best.matrix.modules };
}



/* ============================================================================
   SECTION 3: SEED DATA — 8 shops spread across the US, ~9 products each.
   Seeded into storage once; after that, storage is the source of truth.
============================================================================ */
// Bump this when seed catalog data changes so existing testers get the update.
// Only affects seeded demo shops; user-created storefronts are never touched.
const SEED_VERSION = 7;

const SEED_SHOPS = [
  { id: "seed-javan", name: "Javan's Greenhouse", handle: "javan_grows", city: "Rathdrum", state: "ID", lat: 47.8121, lng: -116.8974, bio: "Backyard grower specializing in truffle trees, orchard stock, and beneficial bugs.", themeId: "harvest", emoji: "🌱", verified: true, status: "open", banner: BANNER_PHOTO("photo-1589923188900-85dae523342b"), bannerScene: "greenhouse" },
  { id: "seed-localroots", name: "LocalRoots", handle: "LocalRoots", city: "Post Falls", state: "ID", lat: 47.7180, lng: -116.9518, bio: "Family farm growing heirloom vegetables and orchard fruit, focused on soil health.", themeId: "meadow", emoji: "🥬", verified: true, status: "open", banner: BANNER_PHOTO("photo-1592924357228-91a4daadcfea"), bannerScene: "orchard" },
  { id: "seed-plantlady", name: "Sarah's Indoor Jungle", handle: "PlantLady", city: "Sandpoint", state: "ID", lat: 48.2766, lng: -116.5535, bio: "Rare aroids, citrus, and tropical fruit starts, propagated one node at a time.", themeId: "dusk", emoji: "🪴", verified: false, status: "open", banner: BANNER_PHOTO("photo-1416879598555-30ab8f515fce"), bannerScene: "woodland" },
  { id: "seed-bluebonnet", name: "Bluebonnet Family Farm", handle: "bluebonnetfarm", city: "Fredericksburg", state: "TX", lat: 30.2752, lng: -98.8720, bio: "Hill Country peaches, wildflower honey, and pecans since 1987.", themeId: "orchard", emoji: "🍑", verified: true, status: "open", banner: BANNER_PHOTO("photo-1595123550478-db9d5d8e29e5"), bannerScene: "hills" },
  { id: "seed-greenmountain", name: "Green Mountain Apiary", handle: "greenmtnapiary", city: "Montpelier", state: "VT", lat: 44.2601, lng: -72.5754, bio: "Small-batch maple syrup and raw honey, plus nucs for new beekeepers.", themeId: "harvest", emoji: "🍯", verified: true, status: "open", banner: BANNER_PHOTO("photo-1558642452-9d2a7deb7f62"), bannerScene: "mountains" },
  { id: "seed-sunroot", name: "Sunroot Collective", handle: "sunrootcollective", city: "Asheville", state: "NC", lat: 35.5951, lng: -82.5515, bio: "Forest-grown mushrooms and heirloom vegetable seedlings from a worker-owned collective.", themeId: "meadow", emoji: "🍄", verified: false, status: "open", banner: BANNER_PHOTO("photo-1635384666014-99a6cf9e2467"), bannerScene: "woodland" },
  { id: "seed-goldenvalley", name: "Golden Valley Orchards", handle: "goldenvalleyorch", city: "Sonoma", state: "CA", lat: 38.2919, lng: -122.4580, bio: "Citrus, olives, and stone fruit grown on a fourth-generation family orchard.", themeId: "orchard", emoji: "🍊", verified: true, status: "open", banner: BANNER_PHOTO("photo-1541832676-9b763b0239ab"), bannerScene: "coastal" },
  { id: "seed-prairiehollow", name: "Prairie Hollow Farm", handle: "prairiehollow", city: "Madison", state: "WI", lat: 43.0731, lng: -89.4012, bio: "Pasture eggs, raw dairy, and root vegetables from a small regenerative farm.", themeId: "dusk", emoji: "🥚", verified: true, status: "closed", banner: BANNER_PHOTO("photo-1518977676601-b53f82aba655"), bannerScene: "prairie" },
];

const SEED_PRODUCTS = {
  "seed-javan": [
    p("Inoculated Truffle Saplings", "Tree", 145.00, "🌳", "Oak saplings inoculated with Perigord black truffle spores. Five to seven years to first harvest.", "Pre-Order", "truffle"),
    p("Espalier Apple, 4-Year Trained", "Tree", 110.00, "🍎", "Four years of training already done. Ready to set against a south wall.", "Limited Batch", "apple"),
    p("Honeycrisp Apple Sapling", "Tree", 28.00, "🍎", "Hardy 2-year bare-root tree suited to northern climates.", "In Season", "apple"),
    p("Rainier Cherry Tree", "Tree", 32.00, "🍒", "Sweet yellow-red blush cherries, heavy bearer.", null, "cherry"),
    p("Ground-Nesting Mason Bees", "Bug", 25.00, "🐝", "Dormant cocoons ready to hatch. Roughly 100x the pollination rate of honeybees per insect.", "New This Week", "bees"),
    p("Beneficial Lacewing Larvae", "Bug", 22.00, "🦋", "Natural predator pack for aphids and spider mites.", null, "ladybug"),
    p("Compost Earthworms (100ct)", "Bug", 20.00, "🪱", "Red wigglers for rich, fast compost.", null, "soil"),
    p("Concord Grape Vine", "Fruit", 18.00, "🍇", "Vigorous climber, aromatic dark blue grapes.", "In Season", "grape"),
    p("Heritage Raspberry Canes (5)", "Fruit", 15.00, "🫐", "Disease-resistant everbearing bundle.", null, "raspberry"),
    p("Mammoth Garlic Bulbs", "Veggie", 14.00, "🧄", "Hardneck seed garlic, ready for fall planting.", "In Season", "garlic"),
    p("Windfall Apples, U-Pick", "Fruit", 0, "🍎", "Drops from the old orchard row. Bring your own buckets, take what you can carry.", "Free", "apple"),
  ],
  "seed-localroots": [
    p("Full-Season Vegetable Share (CSA)", "Veggie", 425.00, "🧺", "Twenty weeks of weekly produce, June through October. Payment plans available.", "Pre-Order", "farm"),
    p("Burbank Russet Potatoes (10lb)", "Veggie", 9.00, "🥔", "Starchy Idaho tubers, great for baking.", null, "potato"),
    p("Elberta Peach Sapling", "Tree", 34.00, "🍑", "Classic yellow freestone peach, cold-hardy.", null, "peach"),
    p("Bartlett Pear Tree", "Tree", 30.00, "🍐", "Buttery, aromatic summer dessert pears.", "Sold Out", "pear"),
    p("Organic Ladybugs (500ct)", "Bug", 18.00, "🐞", "Voracious aphid control, fully organic.", null, "ladybug"),
    p("Sugar Snap Peas (lb)", "Veggie", 5.00, "🫛", "Crisp edible-pod peas at peak crunch.", null, "peas"),
    p("Organic Heirloom Tomatoes (lb)", "Veggie", 4.50, "🍅", "Sun-ripened heritage varieties. Brandywine, Cherokee Purple, Green Zebra.", "In Season", "tomato"),
    p("Nantes Carrot Bunch", "Veggie", 4.00, "🥕", "Sweet, tender, bright orange roots.", null, "carrot"),
    p("Red Russian Kale", "Veggie", 3.50, "🥬", "Frost-hardened for maximum flavor.", null, "greens"),
    p("Fresh Sweet Basil", "Veggie", 3.00, "🌿", "Aromatic Genovese basil, cut this morning.", null, "basil"),
    p("Surplus Zucchini", "Veggie", 0, "🥒", "It happened again. Help yourself, honor-system table by the gate.", "Free", "peas"),
  ],
  "seed-plantlady": [
    p("Thai Constellation, Established", "Tree", 240.00, "🍃", "Four-leaf established plant, not a node. Heavy creamy speckling throughout.", "Limited Batch", "houseplant"),
    p("Variegated Albo Node", "Tree", 165.00, "🍃", "Half-moon variegation with a strong aerial root. Rooted and stable.", "Limited Batch", "houseplant"),
    p("Meyer Lemon Dwarf Tree", "Tree", 42.00, "🍋", "Potted indoor citrus, thin-skinned sweet lemons.", "In Season", "forest"),
    p("Dwarf Cavendish Banana", "Tree", 38.00, "🍌", "Compact tropical palm, edible fruit indoors.", null, "houseplant"),
    p("Ruby Red Pomegranate Sapling", "Tree", 35.00, "🌺", "Ornamental shrub, jewel-seeded fruit.", null, "pomegranate"),
    p("Passionflower Vine", "Fruit", 22.00, "🪷", "Ornate blooms followed by sweet passion fruit.", null, "pomegranate"),
    p("Fungus Gnat Predatory Mites", "Bug", 19.00, "🔬", "Natural soil defenders for houseplants.", null, "ladybug"),
    p("Dragon Fruit Cactus Cutting", "Fruit", 16.00, "🐉", "Hylocereus vine ready to root and fruit.", null, "pomegranate"),
    p("Monstera Deliciosa Cutting", "Tree", 15.00, "🌿", "Active node cutting from a mature fenestrated plant.", null, "houseplant"),
    p("Golden Pothos Runner", "Tree", 8.00, "🌱", "Indestructible trailing houseplant.", null, "houseplant"),
    p("Unrooted Pothos Cuttings", "Tree", 0, "🌱", "Trimmings from repotting day. Free with any pickup, just ask.", "Free", "houseplant"),
  ],
  "seed-bluebonnet": [
    p("Bulk Pecans (25lb case)", "Fruit", 285.00, "🌰", "Wholesale case, fresh-cracked native pecans. Bakery and market orders welcome.", "Pre-Order", "nut"),
    p("Hill Country Peaches (half bushel)", "Fruit", 32.00, "🍑", "Tree-ripened, picked this week. Roughly 25 pounds.", "In Season", "peach"),
    p("Mason Bee Starter Kit", "Bug", 27.00, "🐝", "Cocoons plus a cedar house and mounting hardware.", "New This Week", "bees"),
    p("Texas Pecans (1lb)", "Fruit", 14.00, "🌰", "Fresh-cracked native pecans.", "In Season", "nut"),
    p("Blackberry Bramble Starts", "Fruit", 14.00, "🫐", "Thornless, heavy-bearing canes.", null, "blackberry"),
    p("Wildflower Honey (16oz)", "Dairy", 12.00, "🍯", "Raw and unfiltered, floral and light.", null, "bees"),
    p("Farmstead Goat Cheese", "Dairy", 9.00, "🧀", "Small-batch chevre from our own herd.", null, "farm"),
    p("Peach Preserve Jar", "Fruit", 8.00, "🫙", "Small-batch, made from seconds fruit.", null, "peach"),
    p("Free-Range Eggs (dozen)", "Dairy", 6.00, "🥚", "Pasture-raised, deep orange yolks.", "In Season", "farm"),
    p("Fredericksburg Peach Sapling", "Tree", 33.00, "🌳", "Heat-tolerant variety bred for the Hill Country.", null, "peach"),
    p("Orchard Seconds", "Fruit", 0, "🍑", "Bruised and split peaches, perfect for jam. Bring a bucket, Saturday mornings only.", "Free", "peach"),
  ],
  "seed-greenmountain": [
    p("Starter Beehive Nuc", "Bug", 195.00, "🐝", "Five-frame nuc with a laying queen. Spring pickup, reserve early.", "Pre-Order", "bees"),
    p("Maple Syrup (gallon)", "Dairy", 78.00, "🍁", "Grade A amber. The size that lasts a family a year.", "In Season", "forest"),
    p("Vermont Maple Syrup (quart)", "Dairy", 26.00, "🍁", "Boiled down this spring, amber and rich.", "In Season", "forest"),
    p("Beeswax Candles (set of 3)", "Bug", 18.00, "🕯", "Hand-dipped, subtle honey scent.", null, "bees"),
    p("Comb Honey, Cut", "Dairy", 16.00, "🍯", "Straight from the frame, chew-the-wax style.", "Limited Batch", "bees"),
    p("Raw Wildflower Honey", "Dairy", 12.00, "🍯", "Unheated, unfiltered mountain honey.", null, "bees"),
    p("Vermont Apple Cider (half gal)", "Fruit", 9.00, "🍎", "Pressed from a mixed heirloom orchard.", "In Season", "apple"),
    p("Maple Sugar Candy", "Dairy", 9.00, "🍬", "Pure maple, molded the old way.", null, "forest"),
    p("Sugar Maple Sapling", "Tree", 26.00, "🍁", "Cold-hardy, decades of tapping ahead.", null, "forest"),
    p("Maple Sap Buckets (used)", "Tree", 8.00, "🪣", "Galvanized, retired from active tapping.", null, "soil"),
    p("Retired Sap Line", "Tree", 0, "🪣", "Several hundred feet of tubing, pulled this spring. Free to a good home.", "Free", "soil"),
  ],
  "seed-sunroot": [
    p("Inoculated Shiitake Logs (10)", "Tree", 165.00, "🍄", "Oak logs already spawn-run. Fruits every spring and fall for five years.", "Pre-Order", "truffle"),
    p("Mushroom Grow Kit", "Veggie", 28.00, "🧺", "Fruits oyster mushrooms at home in two weeks.", "New This Week", "truffle"),
    p("Forest Garlic Braid", "Veggie", 18.00, "🧄", "Hardneck garlic, hand-braided.", "Limited Batch", "garlic"),
    p("Compost Tea Concentrate", "Bug", 13.00, "🫙", "Living soil biology in a jar.", null, "soil"),
    p("Lion's Mane Mushroom (half lb)", "Veggie", 12.00, "🍄", "Meaty texture, mild seafood note.", "In Season", "truffle"),
    p("Shiitake, Log-Grown (half lb)", "Veggie", 11.00, "🍄", "Grown outdoors on oak logs, slow and flavorful.", null, "truffle"),
    p("Pawpaw Sapling", "Tree", 29.00, "🌳", "North America's largest native edible fruit.", null, "forest"),
    p("Oyster Mushroom Cluster", "Veggie", 8.00, "🍄", "Delicate, quick-cooking, great for searing.", "In Season", "truffle"),
    p("Sunchoke Tubers", "Veggie", 7.00, "🥔", "Nutty, crisp, easy to grow anywhere.", null, "greens"),
    p("Heirloom Tomato Seedlings (6)", "Veggie", 6.00, "🍅", "Six-pack of mixed heirloom starts.", null, "tomato"),
    p("Spent Mushroom Substrate", "Veggie", 0, "🍄", "Broken-down hardwood, excellent soil amendment. Bring containers.", "Free", "truffle"),
  ],
  "seed-goldenvalley": [
    p("Olive Oil Case (12 x 500ml)", "Fruit", 295.00, "🫒", "Full case from the estate press. Restaurant and gift orders.", "Pre-Order", "forest"),
    p("Mature Olive Tree (15 gal)", "Tree", 185.00, "🌳", "Fifteen-gallon, already fruiting. Delivery within Sonoma County.", "Limited Batch", "forest"),
    p("Dwarf Olive Tree", "Tree", 48.00, "🌳", "Potted, fruits in as little as two years.", null, "forest"),
    p("Cara Cara Navel Sapling", "Tree", 36.00, "🍊", "Pink-fleshed navel, sweet and low-acid.", null, "forest"),
    p("Fig Sapling (Mission)", "Tree", 30.00, "🌳", "Honey-sweet dark purple fruit.", null, "pear"),
    p("Estate Olive Oil (500ml)", "Fruit", 28.00, "🫒", "Cold-pressed from our own grove.", null, "forest"),
    p("Cured Table Olives (jar)", "Fruit", 12.00, "🫒", "Brine-cured in small batches.", null, "forest"),
    p("Sonoma Honey (12oz)", "Dairy", 11.00, "🍯", "From hives tucked between the orchard rows.", null, "bees"),
    p("Blood Orange (2lb bag)", "Fruit", 10.00, "🍊", "Deep crimson flesh, berry-citrus flavor.", "In Season", "forest"),
    p("Meyer Lemons (2lb bag)", "Fruit", 9.00, "🍋", "Thin-skinned, floral, tree-ripened.", "In Season", "forest"),
    p("Citrus Windfall, U-Pick", "Fruit", 0, "🍊", "Ground fruit from the back rows. Fine for juicing. Call ahead.", "Free", "forest"),
  ],
  "seed-prairiehollow": [
    p("Herd Share, Quarter (annual)", "Dairy", 480.00, "🐄", "Legal raw-milk ownership share. Covers roughly a gallon a week.", "Pre-Order", "farm"),
    p("Farmstead Cheddar (wedge)", "Dairy", 14.00, "🧀", "Aged six months in our own cave.", "New This Week", "farm"),
    p("Wool Dryer Balls (set)", "Veggie", 14.00, "🐑", "From our small flock, farmstead-felted.", null, "farm"),
    p("Cultured Farmstead Butter", "Dairy", 11.00, "🧈", "Slow-cultured, salted with sea salt.", null, "farm"),
    p("Winter Squash Trio", "Veggie", 10.00, "🎃", "Butternut, acorn, and delicata.", "In Season", "greens"),
    p("Raw Jersey Milk (half gal)", "Dairy", 9.00, "🥛", "Herd-share members only, cream-top.", "Limited Batch", "farm"),
    p("Duck Eggs (half dozen)", "Dairy", 8.00, "🥚", "Rich, great for baking.", null, "farm"),
    p("Pasture Eggs (dozen)", "Dairy", 7.00, "🥚", "Rotational-grazed hens, deep gold yolks.", null, "farm"),
    p("Heirloom Beet Bundle", "Veggie", 4.00, "🍠", "Sweet, tender, greens included.", null, "bees"),
    p("Purple Top Turnips", "Veggie", 3.50, "🥔", "Mild, great roasted or in stew.", null, "greens"),
    p("Aged Manure, You Load", "Veggie", 0, "🐄", "Two years composted. Bring a truck and a shovel.", "Free", "soil"),
  ],
};
function p(name, category, price, emoji, desc, bannerLabel, photo) {
  const preset = bannerLabel ? BANNER_PRESETS.find((b) => b.label.toLowerCase() === bannerLabel.toLowerCase()) : null;
  const shot = photo ? IMG[photo] : null;
  return { name, category, price, emoji, desc, art: photo || null, image: shot ? shot.url : null, credit: shot ? { by: shot.by, source: shot.source } : null, bannerId: preset ? preset.id : null, status: preset?.id === "sold_out" ? "sold_out" : "available" };
}

const SEED_REVIEWS = {
  "reviews:shop:seed-javan": [
    { id: "sr-javan-0", authorName: "Marcus T.", rating: 5, body: "The truffle sapling arrived healthy and well packed. Javan followed up with planting tips a week later.", createdAt: Date.now() - 22 * 86400000, status: "published", screenedClear: true , helpful: 128 },
    { id: "sr-javan-1", authorName: "Devon P.", rating: 5, body: "Mason bees hatched right on schedule and my plum set doubled this year.", createdAt: Date.now() - 33 * 86400000, status: "published", screenedClear: true , helpful: 41 },
    { id: "sr-javan-2", authorName: "Renata K.", rating: 4, body: "Good stock. Would have liked more detail on hive placement, otherwise excellent.", createdAt: Date.now() - 44 * 86400000, status: "published", screenedClear: true , helpful: 9 },
    { id: "sr-javan-3", authorName: "Sam O.", rating: 5, body: "Third year buying orchard stock here. Nothing has failed yet.", createdAt: Date.now() - 55 * 86400000, status: "published", screenedClear: true , helpful: 23 },
    { id: "sr-javan-4", authorName: "Priya N.", rating: 5, body: "Knowledgeable and generous with advice. The espalier apple is thriving.", createdAt: Date.now() - 66 * 86400000, status: "published", screenedClear: true , helpful: 64 },
  ],
  "reviews:shop:seed-localroots": [
    { id: "sr-localroots-0", authorName: "Ines M.", rating: 5, body: "Best heirloom tomatoes I have had all summer, and pickup was easy to arrange.", createdAt: Date.now() - 22 * 86400000, status: "published", screenedClear: true , helpful: 87 },
    { id: "sr-localroots-1", authorName: "Cal B.", rating: 4, body: "Reliable weekly produce. Occasionally light on the greens.", createdAt: Date.now() - 33 * 86400000, status: "published", screenedClear: true , helpful: 16 },
    { id: "sr-localroots-2", authorName: "Hana W.", rating: 4, body: "Good value CSA. Boxes are generous but the variety repeats a bit in August.", createdAt: Date.now() - 44 * 86400000, status: "published", screenedClear: true , helpful: 4 },
    { id: "sr-localroots-3", authorName: "Theo R.", rating: 5, body: "Their Cherokee Purples are worth the drive on their own.", createdAt: Date.now() - 55 * 86400000, status: "published", screenedClear: true , helpful: 31 },
    { id: "sr-localroots-4", authorName: "Lena F.", rating: 4, body: "Friendly family operation, very consistent quality.", createdAt: Date.now() - 66 * 86400000, status: "published", screenedClear: true , helpful: 52 },
  ],
  "reviews:shop:seed-plantlady": [
    { id: "sr-plantlady-0", authorName: "Owen D.", rating: 3, body: "Cutting rooted fine but took longer than described to establish.", createdAt: Date.now() - 22 * 86400000, status: "published", screenedClear: true , helpful: 7 },
    { id: "sr-plantlady-1", authorName: "Bea S.", rating: 4, body: "The Albo node was healthy and well wrapped. Pricey but fair for the variegation.", createdAt: Date.now() - 33 * 86400000, status: "published", screenedClear: true , helpful: 12 },
    { id: "sr-plantlady-2", authorName: "Jonah L.", rating: 3, body: "Shipping was slow and one leaf arrived damaged. Plant recovered though.", createdAt: Date.now() - 44 * 86400000, status: "published", screenedClear: true , helpful: 2 },
    { id: "sr-plantlady-3", authorName: "Mira C.", rating: 4, body: "Great selection of rare aroids you cannot find locally.", createdAt: Date.now() - 55 * 86400000, status: "published", screenedClear: true , helpful: 19 },
    { id: "sr-plantlady-4", authorName: "Nate H.", rating: 3, body: "Decent plants, communication could be quicker.", createdAt: Date.now() - 66 * 86400000, status: "published", screenedClear: true , helpful: 6 },
  ],
  "reviews:shop:seed-bluebonnet": [
    { id: "sr-bluebonnet-0", authorName: "Colleen A.", rating: 5, body: "Half bushel of peaches, all perfect. The jam I made is still the best batch I have done.", createdAt: Date.now() - 22 * 86400000, status: "published", screenedClear: true , helpful: 146 },
    { id: "sr-bluebonnet-1", authorName: "Rueben G.", rating: 5, body: "Four generations of doing this right. The pecans are unmatched.", createdAt: Date.now() - 33 * 86400000, status: "published", screenedClear: true , helpful: 73 },
    { id: "sr-bluebonnet-2", authorName: "Tasha V.", rating: 5, body: "Ordered a bulk case for the bakery. Consistent size, fresh crack, quick turnaround.", createdAt: Date.now() - 44 * 86400000, status: "published", screenedClear: true , helpful: 38 },
    { id: "sr-bluebonnet-3", authorName: "Elliot M.", rating: 4, body: "Wonderful fruit. The honey sells out fast so order early.", createdAt: Date.now() - 55 * 86400000, status: "published", screenedClear: true , helpful: 11 },
    { id: "sr-bluebonnet-4", authorName: "Dara J.", rating: 5, body: "Drove ninety minutes and would do it again.", createdAt: Date.now() - 66 * 86400000, status: "published", screenedClear: true , helpful: 27 },
  ],
  "reviews:shop:seed-greenmountain": [
    { id: "sr-greenmountain-0", authorName: "Fiona B.", rating: 5, body: "Gallon of amber syrup lasted our family the whole year. Beautiful stuff.", createdAt: Date.now() - 22 * 86400000, status: "published", screenedClear: true , helpful: 5 },
    { id: "sr-greenmountain-1", authorName: "Aidan Q.", rating: 5, body: "Bought a nuc as a first-time beekeeper. They walked me through everything.", createdAt: Date.now() - 33 * 86400000, status: "published", screenedClear: true , helpful: 14 },
    { id: "sr-greenmountain-2", authorName: "Rosalind E.", rating: 5, body: "Comb honey straight from the frame. Nothing else compares.", createdAt: Date.now() - 44 * 86400000, status: "published", screenedClear: true , helpful: 3 },
  ],
  "reviews:shop:seed-sunroot": [
    { id: "sr-sunroot-0", authorName: "Kwame A.", rating: 4, body: "Lion's mane was dense and fresh. Cooked up beautifully.", createdAt: Date.now() - 22 * 86400000, status: "published", screenedClear: true , helpful: 21 },
    { id: "sr-sunroot-1", authorName: "Iris T.", rating: 4, body: "Grow kit fruited in twelve days exactly as promised.", createdAt: Date.now() - 33 * 86400000, status: "published", screenedClear: true , helpful: 8 },
    { id: "sr-sunroot-2", authorName: "Marco P.", rating: 3, body: "Shiitake logs are a slow investment. Good quality, just manage expectations.", createdAt: Date.now() - 44 * 86400000, status: "published", screenedClear: true , helpful: 96 },
    { id: "sr-sunroot-3", authorName: "Yuki S.", rating: 4, body: "Worker-owned and it shows in how carefully everything is handled.", createdAt: Date.now() - 55 * 86400000, status: "published", screenedClear: true , helpful: 34 },
    { id: "sr-sunroot-4", authorName: "Gus W.", rating: 4, body: "Solid mushrooms, fair prices, easy pickup at the market.", createdAt: Date.now() - 66 * 86400000, status: "published", screenedClear: true , helpful: 17 },
  ],
  "reviews:shop:seed-goldenvalley": [
    { id: "sr-goldenvalley-0", authorName: "Alba R.", rating: 5, body: "The estate olive oil is genuinely exceptional. Grassy and peppery.", createdAt: Date.now() - 22 * 86400000, status: "published", screenedClear: true , helpful: 2 },
    { id: "sr-goldenvalley-1", authorName: "Dominic F.", rating: 4, body: "Blood oranges were superb. Meyer lemons slightly past peak.", createdAt: Date.now() - 33 * 86400000, status: "published", screenedClear: true , helpful: 10 },
    { id: "sr-goldenvalley-2", authorName: "Sunni K.", rating: 5, body: "Bought a mature olive tree, delivered and planted with care.", createdAt: Date.now() - 44 * 86400000, status: "published", screenedClear: true , helpful: 58 },
    { id: "sr-goldenvalley-3", authorName: "Harper L.", rating: 5, body: "Fourth generation orchard and you can taste the difference.", createdAt: Date.now() - 55 * 86400000, status: "published", screenedClear: true , helpful: 25 },
    { id: "sr-goldenvalley-4", authorName: "Vic N.", rating: 4, body: "Great citrus. Wish they shipped further north.", createdAt: Date.now() - 66 * 86400000, status: "published", screenedClear: true , helpful: 13 },
  ],
  "reviews:shop:seed-prairiehollow": [
    { id: "sr-prairiehollow-0", authorName: "Bram H.", rating: 3, body: "Eggs are excellent. Pickup window is narrow and hard to make.", createdAt: Date.now() - 22 * 86400000, status: "published", screenedClear: true , helpful: 6 },
    { id: "sr-prairiehollow-1", authorName: "Cora M.", rating: 3, body: "Good dairy, but they were closed twice when I drove out.", createdAt: Date.now() - 33 * 86400000, status: "published", screenedClear: true , helpful: 44 },
    { id: "sr-prairiehollow-2", authorName: "Wes T.", rating: 4, body: "The six-month cheddar is genuinely special.", createdAt: Date.now() - 44 * 86400000, status: "published", screenedClear: true , helpful: 3 },
    { id: "sr-prairiehollow-3", authorName: "Nel A.", rating: 2, body: "Herd share paperwork took weeks to sort out.", createdAt: Date.now() - 55 * 86400000, status: "published", screenedClear: true , helpful: 29 },
    { id: "sr-prairiehollow-4", authorName: "Rory P.", rating: 3, body: "Quality is there. Communication needs work.", createdAt: Date.now() - 66 * 86400000, status: "published", screenedClear: true , helpful: 15 },
  ],
};


/* ============================================================================
   SECTION 3b: SEEDED INBOX
   Notifications and conversations are supplied as fallbacks rather than written
   at startup, exactly like the seeded reviews: they appear immediately, cost no
   storage traffic, and are replaced by the stored copy the moment the member
   reads, deletes or replies to anything.
============================================================================ */
function conversationId(a, b) {
  return [a, b].sort().join("__");
}

const INBOX_BASE = Date.now();
const MIN = 60000;

const DEMO_THREADS = [
  {
    ownerId: "owner_seed-localroots",
    name: "LocalRoots",
    avatar: "\u{1F96C}",
    agoMin: 14,
    messages: [
      { from: "them", body: "Hey! Saw you favourited the heirloom tomatoes. We pick Thursday mornings if you want a box set aside." },
      { from: "me", body: "That would be great. Do you have the Cherokee Purples this week?" },
      { from: "them", body: "We do — about ten pounds coming off. I'll hold two for you. Pickup at the Post Falls stand any time before noon." },
    ],
  },
  {
    ownerId: "owner_seed-greenmountain",
    name: "Green Mountain Apiary",
    avatar: "\u{1F36F}",
    agoMin: 320,
    messages: [
      { from: "me", body: "Is the starter nuc still available for spring pickup?" },
      { from: "them", body: "Still available. We have four left and they go around the second week of April." },
      { from: "them", body: "Happy to walk you through the first inspection if it's your first colony — most people find that part the most useful." },
    ],
  },
  {
    ownerId: "owner_seed-bluebonnet",
    name: "Bluebonnet Family Farm",
    avatar: "\u{1F351}",
    agoMin: 2880,
    messages: [
      { from: "them", body: "Thanks for the order! Your half bushel is boxed and ready whenever you swing by." },
      { from: "me", body: "Picked up this morning — they're gorgeous. Thank you!" },
    ],
  },
];

function seedConversations(userId) {
  if (!userId) return [];
  return DEMO_THREADS.map((th) => ({
    id: conversationId(userId, th.ownerId),
    otherUserId: th.ownerId,
    otherUserName: th.name,
    otherUserAvatar: th.avatar,
    lastMessage: th.messages[th.messages.length - 1].body,
    lastAt: INBOX_BASE - th.agoMin * MIN,
  }));
}

function seedMessagesFor(userId, cid) {
  if (!userId || !cid) return null;
  const th = DEMO_THREADS.find((t) => conversationId(userId, t.ownerId) === cid);
  if (!th) return null;
  return th.messages.map((m, i) => ({
    id: `seedmsg-${th.ownerId}-${i}`,
    senderId: m.from === "them" ? th.ownerId : userId,
    body: m.body,
    createdAt: INBOX_BASE - (th.agoMin + (th.messages.length - i) * 4) * MIN,
  }));
}

function seedNotifications(userId) {
  if (!userId) return [];
  return [
    { id: "sn-1", type: "message", title: "LocalRoots replied to you", body: "I'll hold two Cherokee Purples for you.", createdAt: INBOX_BASE - 14 * MIN, read: false, route: { screen: "messages" } },
    { id: "sn-2", type: "favorite", title: "Your shop was favourited", body: "3 people saved your storefront this week.", createdAt: INBOX_BASE - 95 * MIN, read: false, route: { screen: "store" } },
    { id: "sn-3", type: "review", title: "New 5-star review", body: "Best heirloom tomatoes I have had all summer.", createdAt: INBOX_BASE - 260 * MIN, read: false, route: { screen: "shop", shopId: "seed-localroots" } },
    { id: "sn-4", type: "message", title: "Green Mountain Apiary replied", body: "Still available. We have four left.", createdAt: INBOX_BASE - 320 * MIN, read: true, route: { screen: "messages" } },
    { id: "sn-5", type: "favorite", title: "Golden Valley Orchards listed something new", body: "Blood Orange (2lb bag) is in season.", createdAt: INBOX_BASE - 1400 * MIN, read: true, route: { screen: "shop", shopId: "seed-goldenvalley" } },
    { id: "sn-6", type: "review", title: "Sunroot Collective replied to your review", body: "Thanks for the note about the shiitake logs.", createdAt: INBOX_BASE - 2200 * MIN, read: true, route: { screen: "shop", shopId: "seed-sunroot" } },
    { id: "sn-7", type: "message", title: "Bluebonnet Family Farm", body: "Your half bushel is boxed and ready.", createdAt: INBOX_BASE - 2880 * MIN, read: true, route: { screen: "messages" } },
  ];
}


/* ============================================================================
   SECTION 3c: VENDOR CONNECTION TOOLS
   Posts, demand signals, response times and restock watches. Everything here
   works off data the app already collects.
============================================================================ */
const UPDATE_KINDS = [
  { id: "fresh", label: "Just picked", tint: "#3f6b4a", bg: "#e8f0e6" },
  { id: "restock", label: "Back in stock", tint: "#2f6b7a", bg: "#e4eff2" },
  { id: "soldout", label: "Sold out", tint: "#7a5a2f", bg: "#f4ecdd" },
  { id: "market", label: "At the market", tint: "#7a3f5f", bg: "#f4e6ee" },
  { id: "note", label: "Note", tint: "#57534e", bg: "#f0eee9" },
];
const updateKind = (id) => UPDATE_KINDS.find((k) => k.id === id) || UPDATE_KINDS[4];

// Seeded so a new vendor page is not an empty shell.
function seedShopUpdates(shopId) {
  const base = Date.now();
  const byShop = {
    "seed-localroots": [
      { kind: "fresh", body: "Cherokee Purples and Green Zebras came off the vine this morning. Best batch of the season.", agoH: 5 },
      { kind: "market", body: "At the Post Falls market until noon Saturday. Look for the blue awning.", agoH: 30 },
    ],
    "seed-javan": [
      { kind: "restock", body: "Mason bee cocoons are back — this is the last batch before spring emergence.", agoH: 14 },
      { kind: "note", body: "Truffle sapling pre-orders close at the end of the month for autumn planting.", agoH: 72 },
    ],
    "seed-bluebonnet": [
      { kind: "fresh", body: "Peaches are at peak. Half bushels going fast, first come first served.", agoH: 9 },
      { kind: "soldout", body: "Wildflower honey is out until the next extraction, roughly three weeks.", agoH: 96 },
    ],
    "seed-greenmountain": [
      { kind: "note", body: "Four nucs left for spring pickup. Happy to walk first-timers through the first inspection.", agoH: 40 },
    ],
    "seed-goldenvalley": [
      { kind: "fresh", body: "Blood oranges just came in — deep crimson this year, best we've had.", agoH: 20 },
    ],
  };
  return (byShop[shopId] || []).map((u, i) => ({
    id: `su-${shopId}-${i}`,
    kind: u.kind,
    body: u.body,
    createdAt: base - u.agoH * 3600000,
  }));
}

function seedShopFaq(shopId) {
  const common = {
    "seed-localroots": [
      ["Do you deliver?", "Pickup only at the Post Falls stand, or at the Saturday market. Happy to set aside a box if you message ahead."],
      ["How do I pay?", "Cash or card at pickup. CSA shares can be split across three payments."],
      ["What are your hours?", "Thursday and Saturday, 8am to noon. Other times by arrangement."],
    ],
    "seed-javan": [
      ["When should I plant a sapling?", "Autumn or early spring in this climate. I'll include planting notes with anything that goes in the ground."],
      ["Do the truffle trees really produce?", "Five to seven years, and it depends heavily on soil pH. I'm honest about that before you buy."],
      ["Can I visit the greenhouse?", "Yes, weekends by arrangement. Message me first so I'm around."],
    ],
    "seed-bluebonnet": [
      ["Do you ship?", "Pecans and preserves ship anywhere. Fresh peaches are pickup only."],
      ["When is peach season?", "Late May through early August, peaking in June."],
    ],
    "seed-greenmountain": [
      ["Is the honey raw?", "Unheated and unfiltered, straight from the extractor."],
      ["Can a beginner keep a nuc?", "Absolutely. I'll walk you through the first inspection at no charge."],
    ],
  };
  return (common[shopId] || []).map(([q, a], i) => ({ id: `faq-${shopId}-${i}`, q, a }));
}

// Search terms drive the demand panel. Seeded with plausible regional demand.
const SEEDED_SEARCHES = [
  { term: "raw honey", lat: 47.81, lng: -116.9, count: 14 },
  { term: "heirloom tomatoes", lat: 47.75, lng: -116.95, count: 22 },
  { term: "pasture eggs", lat: 47.7, lng: -117.0, count: 18 },
  { term: "fruit trees", lat: 47.9, lng: -116.8, count: 11 },
  { term: "mason bees", lat: 47.82, lng: -116.85, count: 9 },
  { term: "goat cheese", lat: 30.3, lng: -98.8, count: 16 },
  { term: "peaches", lat: 30.2, lng: -98.9, count: 27 },
  { term: "maple syrup", lat: 44.2, lng: -72.6, count: 19 },
  { term: "mushroom logs", lat: 35.6, lng: -82.5, count: 12 },
  { term: "olive oil", lat: 38.3, lng: -122.4, count: 15 },
  { term: "raw milk", lat: 43.1, lng: -89.4, count: 21 },
  { term: "seed garlic", lat: 47.78, lng: -116.92, count: 8 },
];

/* What are people near this shop actually looking for? Pure so it can be tested. */
function demandNear(shop, searches, products, radiusMiles = 60) {
  if (!shop) return { terms: [], gaps: [] };
  const nearby = searches
    .filter((sr) => haversineMiles(shop.lat, shop.lng, sr.lat, sr.lng) <= radiusMiles)
    .sort((a, b) => b.count - a.count);
  const listingText = products
    .filter((pr) => pr.shopId === shop.id)
    .map((pr) => `${pr.name} ${pr.desc || ""}`.toLowerCase())
    .join(" ");
  // Demand this shop does not currently answer is the actionable part.
  const gaps = nearby.filter((sr) => !sr.term.split(" ").some((w) => listingText.includes(w)));
  return { terms: nearby.slice(0, 6), gaps: gaps.slice(0, 3) };
}

/* Median reply time, expressed the way a buyer reads it. */
function responseWindow(minutes) {
  if (minutes == null) return null;
  if (minutes <= 20) return "Usually replies within minutes";
  if (minutes <= 90) return "Usually replies within an hour";
  if (minutes <= 360) return "Usually replies within a few hours";
  if (minutes <= 1440) return "Usually replies within a day";
  return "Replies in a few days";
}

/* Straight-line distance ranking of other shops, nearest first. */
function nearbyShops(shop, allShops, limit = 4) {
  if (!shop) return [];
  return allShops
    .filter((s) => s.id !== shop.id)
    .map((s) => ({ shop: s, dist: haversineMiles(shop.lat, shop.lng, s.lat, s.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
}

/* ============================================================================
   SECTION 4: UTILITIES — pure functions (unit-testable outside React)
============================================================================ */
function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function formatPrice(n) {
  if (n === 0) return "Free";
  return `$${n.toFixed(2)}`;
}
function formatDistance(miles) {
  if (miles < 1) return "< 1 mi";
  return `${Math.round(miles)} mi`;
}
function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
// Pure favourite toggle. Kept separate from storage so it can be tested, and so
// the caller never has to re-read a record it already holds.
function applyFavoriteToggle(record, type, id) {
  const base = { products: { ...(record?.products || {}) }, shops: { ...(record?.shops || {}) } };
  const bucket = type === "shop" ? base.shops : base.products;
  const wasFav = !!bucket[id];
  if (wasFav) delete bucket[id];
  else bucket[id] = true;
  return { record: base, added: !wasFav };
}

function safeParseModeration(raw) {
  try {
    const clean = String(raw).replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { flagged: !!parsed.flagged, reason: typeof parsed.reason === "string" ? parsed.reason : "", ok: true };
  } catch (e) {
    return { flagged: false, reason: "", ok: false };
  }
}
function applyFilters(products, { search, categories, maxDistance, minRating, minPrice, maxPrice, inSeasonOnly, verifiedOnly, shopsById, userLoc }) {
  const term = (search || "").trim().toLowerCase();
  return products.filter((prod) => {
    const shop = shopsById[prod.shopId];
    if (!shop) return false;
    if (categories && categories.length && !categories.includes(prod.category)) return false;
    if (term) {
      const hay = `${prod.name} ${prod.desc} ${shop.name}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (typeof minPrice === "number" && prod.price < minPrice) return false;
    if (typeof maxPrice === "number" && prod.price > maxPrice) return false;
    if (inSeasonOnly && prod.bannerId !== "in_season") return false;
    if (verifiedOnly && !shop.verified) return false;
    if (minRating && (prod.avgRating || 0) < minRating) return false;
    if (maxDistance != null && userLoc) {
      const d = haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng);
      if (d > maxDistance) return false;
    }
    return true;
  });
}
function reviewStats(list) {
  const published = (list || []).filter((r) => r.status === "published");
  if (!published.length) return { avgRating: 0, reviewCount: 0 };
  return {
    avgRating: published.reduce((sum, r) => sum + r.rating, 0) / published.length,
    reviewCount: published.length,
  };
}

function applyShopFilters(shops, { search, categories, maxDistance, minRating, verifiedOnly, openOnly, userLoc, productsByShop = {} }) {
  const term = (search || "").trim().toLowerCase();
  return shops.filter((shop) => {
    if (verifiedOnly && !shop.verified) return false;
    if (openOnly && shop.status !== "open") return false;
    if (minRating && (shop.avgRating || 0) < minRating) return false;
    if (maxDistance != null && userLoc) {
      if (haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) > maxDistance) return false;
    }
    const prods = productsByShop[shop.id] || [];
    if (categories && categories.length) {
      const carried = new Set(prods.map((pr) => pr.category));
      if (!categories.some((c) => carried.has(c))) return false;
    }
    if (term) {
      // Searching a shop should also match what it actually sells.
      const hay = `${shop.name} ${shop.bio} ${shop.city} ${shop.state} ${shop.handle} ${prods.map((pr) => pr.name).join(" ")}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

function sortShops(shops, sortBy, userLoc) {
  const withDist = shops.map((shop) => ({
    ...shop,
    __dist: userLoc ? haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) : 0,
  }));
  const sorters = {
    distance: (a, b) => a.__dist - b.__dist,
    rating: (a, b) => (b.avgRating || 0) - (a.avgRating || 0),
    favorited: (a, b) => (b.favoriteCount || 0) - (a.favoriteCount || 0),
    newest: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
  };
  // Price sorts are meaningless for a shop; fall back to proximity.
  return withDist.sort(sorters[sortBy] || sorters.distance);
}

function sortProducts(products, sortBy, shopsById, userLoc) {
  const withDist = products.map((prod) => {
    const shop = shopsById[prod.shopId];
    const dist = shop && userLoc ? haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) : 0;
    return { ...prod, __dist: dist };
  });
  const sorters = {
    distance: (a, b) => a.__dist - b.__dist,
    newest: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    rating: (a, b) => (b.avgRating || 0) - (a.avgRating || 0),
    price_low: (a, b) => a.price - b.price,
    price_high: (a, b) => b.price - a.price,
    favorited: (a, b) => (b.favoriteCount || 0) - (a.favoriteCount || 0),
  };
  return withDist.sort(sorters[sortBy] || sorters.distance);
}

/* ============================================================================
   SECTION 5: STORAGE HELPERS — thin, error-safe wrapper over window.storage
============================================================================ */
async function getJSON(key, shared, fallback) {
  try {
    const res = await window.storage.get(key, shared);
    if (!res || res.value == null) return fallback;
    return JSON.parse(res.value);
  } catch (e) {
    return fallback;
  }
}
// window.storage.get throws both for a missing key and for a failed request.
// Treating those the same is destructive: a caller about to rewrite a record
// would persist an empty one. Probe the key list to tell them apart.
async function readJSON(key, shared, fallback) {
  try {
    const res = await window.storage.get(key, shared);
    if (!res || res.value == null) return { ok: true, value: fallback };
    return { ok: true, value: JSON.parse(res.value) };
  } catch (e) {
    try {
      const listing = await window.storage.list(key, shared);
      const exists = listing && Array.isArray(listing.keys) && listing.keys.includes(key);
      return exists ? { ok: false, value: fallback } : { ok: true, value: fallback };
    } catch (e2) {
      return { ok: false, value: fallback };
    }
  }
}

// A silently dropped write is indistinguishable from success to the caller, and
// the data only appears to be saved until the next reload. Anything the user
// would notice losing is written with verify + retry.
async function setJSON(key, value, shared, { verify = false, attempts = 3 } = {}) {
  const payload = JSON.stringify(value);
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      await window.storage.set(key, payload, shared);
      if (!verify) return true;
      const res = await window.storage.get(key, shared);
      if (res && res.value === payload) return true;
    } catch (e) {
      if (attempt === attempts - 1) console.error("storage set failed", key, e);
    }
    await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
  }
  return false;
}

/* ============================================================================
   SECTION 6: SOUND + SHARE
============================================================================ */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1108.73].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = now + i * 0.09;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    });
  } catch (e) {
    /* autoplay policy or no AudioContext — fail silently, this is expected */
  }
}
async function shareContent({ title, text }) {
  const payload = { title, text };
  try {
    if (navigator.share) {
      await navigator.share(payload);
      return { ok: true, method: "share" };
    }
  } catch (e) {
    if (e && e.name === "AbortError") return { ok: false, method: "cancelled" };
  }
  try {
    await navigator.clipboard.writeText(`${title}\n${text}`);
    return { ok: true, method: "clipboard" };
  } catch (e) {
    return { ok: false, method: "none" };
  }
}

/* ============================================================================
   SECTION 6b: KEYBOARD-AWARE VIEWPORT
   The shell is a fixed-height app, so an on-screen keyboard would otherwise
   overlay the bottom of it and hide whatever you're typing into. Tracking the
   visual viewport lets the shell shrink to the space the keyboard leaves.
============================================================================ */
function useViewportHeight() {
  const [height, setHeight] = useState(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = null;
    const apply = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setHeight(Math.round(vv.height)));
    };
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    apply();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);
  return height;
}

// Reads viewport height without throwing when used outside the provider.
function useSafeViewportHeight() {
  const ctx = useContext(AppContext);
  return ctx?.viewportHeight ?? null;
}


/* ============================================================================
   SECTION 6c: PHOTO UPLOADS
   A photo chosen from the device becomes a data URL, which is not a network
   request — so unlike hosted images these render anywhere, including inside a
   sandbox that blocks external hosts. They are resized before storage: a phone
   photo is several megabytes, and base64 adds a third on top of that.
============================================================================ */
const PHOTO_MAX_DIM = 900;        // long edge for listing photos
const AVATAR_MAX_DIM = 320;       // avatars are shown small
const PHOTO_TARGET_BYTES = 320000; // stay well inside the per-key ceiling

function isSupportedImage(file) {
  return !!file && /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i.test(file.type || "");
}

function dataUrlBytes(dataUrl) {
  if (!dataUrl) return 0;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const b64 = dataUrl.slice(comma + 1);
  // base64 encodes 3 bytes per 4 characters, minus any padding
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function fitDimensions(width, height, maxDim) {
  if (width <= maxDim && height <= maxDim) return { width, height };
  const scale = maxDim / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/* Reads a file, scales it down, and compresses until it fits comfortably in a
   single storage key. Square mode centre-crops, which is what avatars want. */
function processImageFile(file, { maxDim = PHOTO_MAX_DIM, square = false, targetBytes = PHOTO_TARGET_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    if (!isSupportedImage(file)) {
      reject(new Error("That file doesn't look like a photo."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const original = reader.result;
      // If anything in the canvas path fails, keep the original rather than
      // losing the upload — provided it is small enough to store as-is.
      const fallback = () => {
        if (dataUrlBytes(original) <= 2 * 1024 * 1024) resolve(original);
        else reject(new Error("That photo is too large and couldn't be resized."));
      };
      let img;
      try {
        img = new Image();
      } catch (e) {
        fallback();
        return;
      }
      img.onerror = () => fallback();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return fallback();
          let sx = 0;
          let sy = 0;
          let sw = img.width;
          let sh = img.height;

          if (square) {
            const side = Math.min(img.width, img.height);
            sx = (img.width - side) / 2;
            sy = (img.height - side) / 2;
            sw = side;
            sh = side;
            canvas.width = Math.min(side, maxDim);
            canvas.height = canvas.width;
          } else {
            const fit = fitDimensions(img.width, img.height, maxDim);
            canvas.width = fit.width;
            canvas.height = fit.height;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

          let quality = 0.82;
          let out = canvas.toDataURL("image/jpeg", quality);
          while (dataUrlBytes(out) > targetBytes && quality > 0.4) {
            quality -= 0.12;
            out = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(out);
        } catch (e) {
          fallback();
        }
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  });
}

/* Photos live under their own keys rather than inside the market record, so one
   vendor's gallery cannot bloat the blob every client loads at startup. */
async function savePhoto(dataUrl) {
  const id = uid("img");
  const ok = await setJSON(`photo:${id}`, { dataUrl, createdAt: Date.now() }, true, { verify: true });
  return ok ? id : null;
}

/* ============================================================================
   SECTION 6B: PHOTO EDITOR — crop / zoom / pan / filters, entirely on canvas.
   Sits between "file picked" and "photo saved": every upload passes through
   PhotoEditorModal so a person can frame and style it before it's stored.
============================================================================ */
const PHOTO_FILTER_PRESETS = [
  { key: "none", label: "Original", css: "" },
  { key: "bw", label: "B&W", css: "grayscale(1) contrast(1.05)" },
  { key: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.08)" },
  { key: "warm", label: "Warm", css: "sepia(0.28) saturate(1.2) brightness(1.03)" },
  { key: "cool", label: "Cool", css: "hue-rotate(-10deg) saturate(1.1) brightness(1.02)" },
  { key: "fade", label: "Fade", css: "contrast(0.88) brightness(1.08) saturate(0.82)" },
  { key: "bright", label: "Bright", css: "brightness(1.16) contrast(1.04)" },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!isSupportedImage(file)) {
      reject(new Error("That file doesn't look like a photo."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load that photo."));
    img.src = src;
  });
}

/* Draws the chosen crop window (cw x ch viewport, at the given zoom/pan) with
   the live filter applied, then compresses like processImageFile did. */
async function renderEditedPhoto({ img, cw, ch, zoom, pan, filterCss, maxDim, targetBytes = PHOTO_TARGET_BYTES }) {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const baseScale = Math.max(cw / nw, ch / nh);
  const scale = baseScale * zoom;
  const dispW = nw * scale;
  const dispH = nh * scale;
  const left = (cw - dispW) / 2 + pan.x;
  const top = (ch - dispH) / 2 + pan.y;
  let sx = -left / scale;
  let sy = -top / scale;
  let sw = cw / scale;
  let sh = ch / scale;
  sx = Math.max(0, Math.min(sx, Math.max(0, nw - sw)));
  sy = Math.max(0, Math.min(sy, Math.max(0, nh - sh)));
  sw = Math.min(sw, nw - sx);
  sh = Math.min(sh, nh - sy);

  const aspect = cw / ch;
  const outW = aspect >= 1 ? maxDim : Math.round(maxDim * aspect);
  const outH = aspect >= 1 ? Math.round(maxDim / aspect) : maxDim;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that photo.");
  ctx.filter = filterCss || "none";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  let quality = 0.85;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (dataUrlBytes(out) > targetBytes && quality > 0.4) {
    quality -= 0.12;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  return out;
}

function PhotoEditorModal({ src, aspect = 4 / 3, round = false, maxDim = PHOTO_MAX_DIM, onCancel, onSave }) {
  const [img, setImg] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [filterKey, setFilterKey] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);

  const cw = 288;
  const ch = Math.max(120, Math.round(cw / aspect));

  useEffect(() => {
    let cancelled = false;
    setImg(null);
    setLoadError("");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    loadImageEl(src)
      .then((el) => {
        if (!cancelled) setImg(el);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const clampPan = useCallback(
    (nextPan, z) => {
      if (!img) return nextPan;
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      const baseScale = Math.max(cw / nw, ch / nh);
      const scale = baseScale * z;
      const dispW = nw * scale;
      const dispH = nh * scale;
      const maxX = Math.max(0, (dispW - cw) / 2);
      const maxY = Math.max(0, (dispH - ch) / 2);
      return { x: Math.max(-maxX, Math.min(maxX, nextPan.x)), y: Math.max(-maxY, Math.min(maxY, nextPan.y)) };
    },
    [img, cw, ch]
  );

  const onZoomChange = (z) => {
    setZoom(z);
    setPan((p) => clampPan(p, z));
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: pan };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan({ x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy }, zoom));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const preset = PHOTO_FILTER_PRESETS.find((p) => p.key === filterKey) || PHOTO_FILTER_PRESETS[0];
  const liveFilter = `${preset.css} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`.trim();

  const handleSave = async () => {
    if (!img || saving) return;
    setSaving(true);
    try {
      const dataUrl = await renderEditedPhoto({ img, cw, ch, zoom, pan, filterCss: liveFilter, maxDim });
      onSave(dataUrl);
    } catch (e) {
      setLoadError(e.message || "Couldn't save that photo.");
      setSaving(false);
    }
  };

  const baseScale = img ? Math.max(cw / (img.naturalWidth || img.width), ch / (img.naturalHeight || img.height)) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 cs-z-pop flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="cs-modal-anim bg-white rounded-2xl w-full max-w-sm max-h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-stone-900" style={displayFont}>Edit photo</h3>
          <button onClick={onCancel} aria-label="Close"><X size={20} className="text-stone-400" /></button>
        </div>

        {loadError && <p className="text-xs text-rose-600 mb-2">{loadError}</p>}

        <div
          className={`relative mx-auto overflow-hidden bg-stone-100 touch-none select-none ${round ? "rounded-full" : "rounded-xl"}`}
          style={{ width: cw, height: ch, cursor: img ? "grab" : "default" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {img && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute pointer-events-none max-w-none"
              style={{
                left: "50%",
                top: "50%",
                width: (img.naturalWidth || img.width) * baseScale * zoom,
                height: (img.naturalHeight || img.height) * baseScale * zoom,
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)`,
                filter: liveFilter,
              }}
            />
          )}
          {!img && !loadError && (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-stone-400" />
            </div>
          )}
        </div>

        <div className="mt-3">
          <label className="cs-t11 font-semibold text-stone-500">Zoom</label>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} disabled={!img} className="w-full" />
        </div>

        <p className="cs-t11 font-semibold text-stone-500 mt-3 mb-1.5">Filters</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {PHOTO_FILTER_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setFilterKey(p.key)}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                filterKey === p.key ? "border-emerald-700 bg-emerald-50 text-emerald-800" : "border-stone-200 text-stone-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div>
            <label className="cs-t10 font-semibold text-stone-500">Brightness</label>
            <input type="range" min="60" max="140" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="cs-t10 font-semibold text-stone-500">Contrast</label>
            <input type="range" min="60" max="140" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="cs-t10 font-semibold text-stone-500">Saturation</label>
            <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!img || saving}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-800 text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 7: AI MODERATION — via a Supabase Edge Function
   (the artifact runtime's direct, unauthenticated fetch to api.anthropic.com
   only worked inside the Claude.ai sandbox; a deployed app can't ship an
   Anthropic key to the browser, so this now calls the `moderate-review`
   Edge Function, which holds the key server-side.)
============================================================================ */
async function moderateText(text) {
  try {
    const { data, error } = await supabase.functions.invoke("moderate-review", { body: { text } });
    if (error) throw error;
    return { flagged: !!data?.flagged, reason: data?.reason || "", pending: false };
  } catch (e) {
    return { flagged: false, reason: "", pending: true };
  }
}

/* ============================================================================
   SECTION 8: DATA HOOKS
============================================================================ */
const AVATAR_EMOJI = ["🌻", "🍅", "🐝", "🍇", "🥕", "🐐", "🌾", "🍎", "🐓", "🍄", "🐄", "🍒"];

function useCurrentUser() {
  // undefined = still checking for a session, null = signed out, object = signed in.
  const [session, setSession] = useState(undefined);
  const [me, setMeState] = useState(null);
  const [loading, setLoading] = useState(true);
  const meRef = useRef(null);
  const sessionRef = useRef(null);

  // Real Supabase auth session, independent of whether a CropSwap profile
  // (name + avatar) has been created yet.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      sessionRef.current = data.session || null;
      setSession(data.session || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      sessionRef.current = sess || null;
      setSession(sess || null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === undefined) return; // still resolving initial session
    if (!session) {
      meRef.current = null;
      setMeState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const existing = await getJSON("me:profile", false, null);
      if (cancelled) return;
      if (existing) {
        meRef.current = existing;
        setMeState(existing);
        // keep the shared public copy fresh in case it drifted
        setJSON(`users:${existing.id}`, existing, true);
      } else {
        meRef.current = null;
        setMeState(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const createProfile = useCallback(async ({ name, avatar }) => {
    const id = sessionRef.current?.user?.id;
    if (!id) throw new Error("No authenticated session — sign in first.");
    const profile = {
      id,
      name: name || "Guest",
      avatar: avatar || AVATAR_EMOJI[Math.floor(Math.random() * AVATAR_EMOJI.length)],
      createdAt: Date.now(),
      isVendor: false,
      shopId: null,
      subscriptionTier: "sprout",
      notificationPrefs: { master: true, sound: true, messages: true, reviews: true, favorites: true },
      blockedUserIds: [],
    };
    await setJSON("me:profile", profile, false);
    await setJSON(`users:${id}`, profile, true);
    meRef.current = profile;
    setMeState(profile);
    return profile;
  }, []);

  // Storage writes stay outside the state updater so React can't double-invoke them.
  const updateMe = useCallback(async (partial) => {
    const prev = meRef.current;
    if (!prev) return;
    const next = { ...prev, ...partial };
    meRef.current = next;
    setMeState(next);
    await setJSON("me:profile", next, false);
    await setJSON(`users:${next.id}`, next, true);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    meRef.current = null;
    setMeState(null);
  }, []);

  return { me, hasSession: !!session, loading: session === undefined || loading, createProfile, updateMe, signOut };
}

/* All seeded market data lives in ONE key. It used to be spread across
   shop:{id}, products:{id} and seedVersion:{id}, which meant roughly nine
   sequential storage round trips per shop at startup — slow, and enough traffic
   to trip the rate limit, which silently dropped later writes such as reviews.
   Writes are coalesced so a burst of changes produces a single save. */
const MARKET_KEY = `market:v${SEED_VERSION}`;
const MARKET_WRITE_DELAY = 500;

function buildSeededMarket() {
  const shops = SEED_SHOPS.map((seed) => ({
    ...seed,
    ownerId: `owner_${seed.id}`,
    contactCard: buildDefaultContactCard(seed),
    layoutBlocks: ["banner", "bio", "contact", "gallery", "reviews"],
    favoriteCount: Math.floor(Math.random() * 40) + 4,
    views: Math.floor(Math.random() * 300) + 50,
    followers: Math.floor(Math.random() * 60) + 5,
    createdAt: Date.now() - Math.floor(Math.random() * 200) * 86400000,
    // Seeded ratings come straight from the seeded reviews, so no extra reads.
    ...reviewStats(SEED_REVIEWS[`reviews:shop:${seed.id}`] || []),
    updates: seedShopUpdates(seed.id),
    faq: seedShopFaq(seed.id),
    responseMinutes: [45, 30, 220, 60, 90, 150, 40, 1200][SEED_SHOPS.findIndex((x) => x.id === seed.id)] ?? 90,
  }));

  const products = [];
  SEED_SHOPS.forEach((seed) => {
    (SEED_PRODUCTS[seed.id] || []).forEach((sp, i) => {
      products.push({
        id: `${seed.id}-p${i}`,
        shopId: seed.id,
        ...sp,
        favoriteCount: Math.floor(Math.random() * 25) + 1,
        avgRating: 0,
        reviewCount: 0,
        createdAt: Date.now() - Math.floor(Math.random() * 60) * 86400000,
      });
    });
  });

  return { shops, products };
}

function useMarketData() {
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const shopsRef = useRef([]);
  const productsRef = useRef([]);
  const writeTimer = useRef(null);

  const flushMarket = useCallback(async () => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
    }
    await setJSON(MARKET_KEY, { shops: shopsRef.current, products: productsRef.current }, true);
  }, []);

  // Many small changes (favourite counts, rating updates) arrive together; one
  // save covers them all instead of one save each.
  const scheduleWrite = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      writeTimer.current = null;
      setJSON(MARKET_KEY, { shops: shopsRef.current, products: productsRef.current }, true);
    }, MARKET_WRITE_DELAY);
  }, []);

  const applyMarket = useCallback((nextShops, nextProducts) => {
    shopsRef.current = nextShops;
    productsRef.current = nextProducts;
    setShops(nextShops);
    setProducts(nextProducts);
  }, []);

  const loadAll = useCallback(async () => {
    const res = await readJSON(MARKET_KEY, true, null);
    const stored = res.ok ? res.value : null;
    if (stored && Array.isArray(stored.shops) && stored.shops.length) {
      applyMarket(stored.shops, Array.isArray(stored.products) ? stored.products : []);
      setLoading(false);
      return;
    }

    const seeded = buildSeededMarket();
    applyMarket(seeded.shops, seeded.products);
    setLoading(false);

    // First run only: persist the market and the demo owner accounts that
    // messaging needs. Written in parallel rather than one after another.
    await Promise.all([
      setJSON(MARKET_KEY, seeded, true),
      ...seeded.shops.map((sh) =>
        setJSON(
          `users:${sh.ownerId}`,
          { id: sh.ownerId, name: sh.name, avatar: sh.emoji, createdAt: Date.now(), isVendor: true, shopId: sh.id },
          true
        )
      ),
    ]);
  }, [applyMarket]);

  useEffect(() => {
    loadAll();
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [loadAll]);

  const shopsById = useMemo(() => Object.fromEntries(shops.map((s) => [s.id, s])), [shops]);

  const updateShop = useCallback(
    async (shopId, partial) => {
      const current = shopsRef.current.find((s) => s.id === shopId);
      if (current && Object.keys(partial).every((k) => current[k] === partial[k])) return;
      const next = shopsRef.current.map((s) => (s.id === shopId ? { ...s, ...partial } : s));
      applyMarket(next, productsRef.current);
      scheduleWrite();
    },
    [applyMarket, scheduleWrite]
  );

  const updateProduct = useCallback(
    async (shopId, productId, partial) => {
      const current = productsRef.current.find((pr) => pr.id === productId);
      if (current && Object.keys(partial).every((k) => current[k] === partial[k])) return;
      const next = productsRef.current.map((pr) => (pr.id === productId ? { ...pr, ...partial } : pr));
      applyMarket(shopsRef.current, next);
      scheduleWrite();
    },
    [applyMarket, scheduleWrite]
  );

  const addProduct = useCallback(
    async (shopId, productDraft) => {
      const newProduct = {
        id: uid("prod"),
        shopId,
        favoriteCount: 0,
        shareCount: 0,
        avgRating: 0,
        reviewCount: 0,
        status: "available",
        createdAt: Date.now(),
        ...productDraft,
      };
      applyMarket(shopsRef.current, [...productsRef.current, newProduct]);
      await flushMarket();
      return newProduct;
    },
    [applyMarket, flushMarket]
  );

  const removeProduct = useCallback(
    async (shopId, productId) => {
      applyMarket(shopsRef.current, productsRef.current.filter((pr) => pr.id !== productId));
      await flushMarket();
    },
    [applyMarket, flushMarket]
  );

  const createShopForUser = useCallback(
    async (user, shopName) => {
      const id = uid("shop");
      const newShop = {
        id,
        ownerId: user.id,
        name: shopName || `${user.name}'s Farm Stand`,
        handle: (shopName || user.name).toLowerCase().replace(/[^a-z0-9]+/g, "") || "farmstand",
        city: "Your Town",
        state: "US",
        lat: 39.5 + (Math.random() - 0.5) * 4,
        lng: -98.35 + (Math.random() - 0.5) * 8,
        bio: "Tell people what you grow and how to find you.",
        themeId: "harvest",
        bannerScene: "hills",
        emoji: "\u{1F9FA}",
        verified: false,
        status: "open",
        contactCard: [],
        layoutBlocks: ["banner", "bio", "contact", "gallery", "reviews"],
        favoriteCount: 0,
        shareCount: 0,
        views: 0,
        followers: 0,
        avgRating: 0,
        reviewCount: 0,
        updates: [],
        faq: [],
        responseMinutes: null,
        createdAt: Date.now(),
      };
      applyMarket([...shopsRef.current, newShop], productsRef.current);
      await flushMarket();
      return newShop;
    },
    [applyMarket, flushMarket]
  );

  return { shops, products, shopsById, loading, updateShop, updateProduct, addProduct, removeProduct, createShopForUser, reload: loadAll };
}

function buildDefaultContactCard(seed) {
  return [
    { id: uid("ic"), platform: "website", value: `https://${seed.handle}.example`, x: 16, y: 28 },
    { id: uid("ic"), platform: "email", value: `hello@${seed.handle}.example`, x: 38.5, y: 28 },
    { id: uid("ic"), platform: "instagram", value: `https://instagram.com/${seed.handle}`, x: 61, y: 28 },
    { id: uid("ic"), platform: "facebook", value: `https://facebook.com/${seed.handle}`, x: 83.5, y: 28 },
  ];
}

function useFavorites(me) {
  const [favProducts, setFavProducts] = useState({});
  const [favShops, setFavShops] = useState({});
  const [loading, setLoading] = useState(true);
  // The authoritative in-session copy. Toggling reads from here rather than from
  // storage: re-reading was destructive, because a transient read failure looked
  // identical to "no favourites yet" and the next write erased everything.
  const recordRef = useRef({ products: {}, shops: {} });

  const userId = me?.id || null;

  useEffect(() => {
    if (!userId) {
      recordRef.current = { products: {}, shops: {} };
      setFavProducts({});
      setFavShops({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await readJSON(`favorites:${userId}`, true, { products: {}, shops: {} });
      if (cancelled) return;
      // A failed read must not clear what is already held in memory.
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const safe = { products: res.value?.products || {}, shops: res.value?.shops || {} };
      recordRef.current = safe;
      setFavProducts(safe.products);
      setFavShops(safe.shops);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Returns { added, newCount } so the caller can persist the count through the
  // market layer (single source of truth) instead of writing entity records here.
  const toggle = useCallback(
    async (type, entity) => {
      if (!userId) return null;
      const { record, added } = applyFavoriteToggle(recordRef.current, type, entity.id);
      recordRef.current = record;
      if (type === "shop") setFavShops(record.shops);
      else setFavProducts(record.products);
      await setJSON(`favorites:${userId}`, record, true, { verify: true });
      const newCount = Math.max(0, (entity.favoriteCount || 0) + (added ? 1 : -1));
      return { added, newCount };
    },
    [userId]
  );

  return { favProducts, favShops, toggle, loading };
}

// Which reviews this member has marked helpful. Same in-memory-record pattern
// as favourites, so a failed read can never wipe the set.
function useHelpfulMarks(me) {
  const [marks, setMarks] = useState({});
  const recordRef = useRef({});
  const userId = me?.id || null;

  useEffect(() => {
    if (!userId) {
      recordRef.current = {};
      setMarks({});
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await readJSON(`helpful:${userId}`, true, {});
      if (cancelled || !res.ok) return;
      recordRef.current = res.value || {};
      setMarks(recordRef.current);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = useCallback(
    async (reviewId) => {
      if (!userId) return null;
      const next = { ...recordRef.current };
      const was = !!next[reviewId];
      if (was) delete next[reviewId];
      else next[reviewId] = true;
      recordRef.current = next;
      setMarks(next);
      await setJSON(`helpful:${userId}`, next, true, { verify: true });
      return { added: !was };
    },
    [userId]
  );

  return { helpfulMarks: marks, toggleHelpfulMark: toggle };
}

// Favourites persist reliably through a per-user key, so a member's own reviews
// are mirrored the same way. The per-entity list stays the canonical public copy,
// but if that write is dropped the author's own copy still restores their review.
function useRestockWatch(me) {
  const [watches, setWatches] = useState({});
  const recordRef = useRef({});
  const userId = me?.id || null;

  useEffect(() => {
    if (!userId) {
      recordRef.current = {};
      setWatches({});
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await readJSON(`restock:${userId}`, true, {});
      if (cancelled || !res.ok) return;
      recordRef.current = res.value || {};
      setWatches(recordRef.current);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = useCallback(
    async (productId) => {
      if (!userId) return null;
      const next = { ...recordRef.current };
      const was = !!next[productId];
      if (was) delete next[productId];
      else next[productId] = Date.now();
      recordRef.current = next;
      setWatches(next);
      await setJSON(`restock:${userId}`, next, true, { verify: true });
      return { added: !was };
    },
    [userId]
  );

  return { restockWatches: watches, toggleRestockWatch: toggle };
}

function useMyReviews(me) {
  const [byKey, setByKey] = useState({});
  const recordRef = useRef({});
  const userId = me?.id || null;

  useEffect(() => {
    if (!userId) {
      recordRef.current = {};
      setByKey({});
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await readJSON(`myReviews:${userId}`, true, {});
      if (cancelled || !res.ok) return;
      recordRef.current = res.value || {};
      setByKey(recordRef.current);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addMyReview = useCallback(
    async (entityKey, review) => {
      if (!userId) return;
      const existing = recordRef.current[entityKey] || [];
      const next = { ...recordRef.current, [entityKey]: [review, ...existing.filter((r) => r.id !== review.id)] };
      recordRef.current = next;
      setByKey(next);
      await setJSON(`myReviews:${userId}`, next, true, { verify: true });
    },
    [userId]
  );

  const patchMyReview = useCallback(
    async (entityKey, reviewId, patch) => {
      if (!userId) return;
      const existing = recordRef.current[entityKey] || [];
      if (!existing.some((r) => r.id === reviewId)) return;
      const next = {
        ...recordRef.current,
        [entityKey]: existing.map((r) => (r.id === reviewId ? { ...r, ...patch } : r)),
      };
      recordRef.current = next;
      setByKey(next);
      await setJSON(`myReviews:${userId}`, next, true, { verify: true });
    },
    [userId]
  );

  // A removed review should stop showing to its author too.
  const dropMyReview = useCallback(
    async (entityKey, reviewId) => {
      if (!userId) return;
      const existing = recordRef.current[entityKey] || [];
      const next = { ...recordRef.current, [entityKey]: existing.filter((r) => r.id !== reviewId) };
      recordRef.current = next;
      setByKey(next);
      await setJSON(`myReviews:${userId}`, next, true, { verify: true });
    },
    [userId]
  );

  return { myReviews: byKey, addMyReview, patchMyReview, dropMyReview };
}

function useReviews(entityType, entityId, onStatsChange, viewerId) {
  const key = `reviews:${entityType}:${entityId}`;
  const ctx = useContext(AppContext);
  const mine = ctx?.myReviews?.[key];
  const addMyReview = ctx?.addMyReview;
  const patchMyReview = ctx?.patchMyReview;
  // Seed synchronously so reviews are on screen immediately instead of flashing
  // empty while the async read completes.
  const [reviews, setReviews] = useState(() => SEED_REVIEWS[`reviews:${entityType}:${entityId}`] || []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);
  // Authoritative in-session copy. Appending to this instead of re-reading means
  // a first-ever review (whose key does not exist yet) can never look like a
  // storage failure, and an existing list can never be clobbered by a bad read.
  const listRef = useRef(SEED_REVIEWS[`reviews:${entityType}:${entityId}`] || []);
  const keyRef = useRef(null);

  const commitList = useCallback(
    async (nextList) => {
      listRef.current = nextList;
      if (mountedRef.current) setReviews(nextList);
      return setJSON(key, nextList, true, { verify: true });
    },
    [key]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    // Switching to a different shop or product must not carry the previous
    // entity's reviews into the merge below.
    if (keyRef.current !== key) {
      keyRef.current = key;
      listRef.current = SEED_REVIEWS[key] || [];
    }
    const list = await getJSON(key, true, SEED_REVIEWS[key] || []);
    const stored = Array.isArray(list) ? list : [];
    // Merge rather than replace: if a read comes back stale or falls through to
    // the seed fallback, anything posted in this session is still preserved.
    const storedIds = new Set(stored.map((r) => r.id));
    const localOnly = listRef.current.filter((r) => !storedIds.has(r.id));
    const merged = localOnly.length ? [...localOnly, ...stored] : stored;
    listRef.current = merged;
    setReviews(merged);
    setLoading(false);
    if (localOnly.length) {
      // The write that should have saved these did not land; put them back.
      setJSON(key, merged, true, { verify: true });
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  // Post first, screen second. Blocking the save on a network round-trip left
  // the button disabled for up to fifteen seconds and, if the call errored, lost
  // the review entirely. The review is stored immediately as "pending", which is
  // visible only to its author, so nothing unscreened is ever shown publicly.
  // Post first, screen second. The review is appended to the in-memory list and
  // written straight away, so posting never depends on a read succeeding. It is
  // stored as "pending", visible only to its author, until screening clears it.
  const submitReview = useCallback(
    async (author, { rating, body }, opts = {}) => {
      setSubmitting(true);
      const review = {
        id: uid("rev"),
        authorId: author.id,
        authorName: author.name,
        authorAvatar: author.avatar,
        rating,
        body,
        createdAt: Date.now(),
        status: "pending",
        moderation: null,
      };
      // Mirror first: this is the copy that guarantees the author sees it again.
      if (addMyReview) await addMyReview(key, review);
      await commitList([review, ...listRef.current]);
      if (mountedRef.current) setSubmitting(false);

      // Screening continues in the background and promotes or removes it.
      (async () => {
        let mod;
        try {
          mod = await moderateText(body);
        } catch (e) {
          mod = { flagged: false, reason: "", pending: true };
        }
        // Unreachable screener: leave it pending and author-only rather than
        // guessing. It gets re-screened if anyone reports it.
        if (mod.pending) return;
        const status = mod.flagged ? "removed" : "published";
        if (patchMyReview) await patchMyReview(key, review.id, { status, moderation: mod });
        await commitList(listRef.current.map((r) => (r.id === review.id ? { ...r, status, moderation: mod } : r)));
        opts.onScreened?.(status);
      })();

      return review;
    },
    [commitList]
  );

  const adjustHelpful = useCallback(
    async (reviewId, delta) => {
      const next = listRef.current.map((r) =>
        r.id === reviewId ? { ...r, helpful: Math.max(0, (r.helpful || 0) + delta) } : r
      );
      await commitList(next);
    },
    [commitList]
  );

  // Owner-only: removes a review entirely (e.g. a shop owner clearing an
  // incoming review). Authorization is enforced by the caller (ReviewSection
  // only renders the control when the viewer owns the shop/product), matching
  // this app's existing client-side trust model for shared_kv writes.
  const deleteReview = useCallback(
    async (reviewId) => {
      const next = listRef.current.filter((r) => r.id !== reviewId);
      await commitList(next);
    },
    [commitList]
  );

  // Owner-only: attach a single response to a review (e.g. a shop owner
  // replying to feedback). Posted immediately, screened in the background —
  // same "post first, screen second" pattern as submitReview — and hidden
  // from other viewers until it clears (or forever, if it doesn't).
  const respondToReview = useCallback(
    async (reviewId, responder, body) => {
      const response = {
        id: uid("resp"),
        authorId: responder.id,
        authorName: responder.name,
        authorAvatar: responder.avatar,
        body,
        createdAt: Date.now(),
        status: "pending",
        moderation: null,
        helpful: 0,
      };
      const next = listRef.current.map((r) => (r.id === reviewId ? { ...r, response } : r));
      await commitList(next);

      (async () => {
        let mod;
        try {
          mod = await moderateText(body);
        } catch (e) {
          mod = { flagged: false, reason: "", pending: true };
        }
        if (mod.pending) return;
        const status = mod.flagged ? "removed" : "published";
        await commitList(
          listRef.current.map((r) =>
            r.id === reviewId && r.response?.id === response.id
              ? { ...r, response: { ...r.response, status, moderation: mod } }
              : r
          )
        );
      })();

      return response;
    },
    [commitList]
  );

  // Owner-only: retract a response (e.g. to edit it by writing a new one, or
  // just to take it down).
  const deleteResponse = useCallback(
    async (reviewId) => {
      const next = listRef.current.map((r) => (r.id === reviewId ? { ...r, response: null } : r));
      await commitList(next);
    },
    [commitList]
  );

  const adjustResponseHelpful = useCallback(
    async (reviewId, delta) => {
      const next = listRef.current.map((r) =>
        r.id === reviewId && r.response
          ? { ...r, response: { ...r.response, helpful: Math.max(0, (r.response.helpful || 0) + delta) } }
          : r
      );
      await commitList(next);
    },
    [commitList]
  );

  // A member flagging a review re-runs it through the same screener. Confirmed
  // violations disappear immediately; cleared reviews are marked so they can't be
  // repeatedly flagged in bad faith.
  const flagReview = useCallback(
    async (reviewId, flaggerId) => {
      const current = listRef.current;
      const target = current.find((r) => r.id === reviewId);
      if (!target) return { outcome: "missing" };
      if (target.screenedClear) return { outcome: "already_cleared" };

      const mod = await moderateText(target.body);
      const outcome = mod.flagged ? "removed" : mod.pending ? "pending" : "kept";
      const next = current.map((r) =>
        r.id !== reviewId
          ? r
          : {
              ...r,
              status: mod.flagged ? "removed" : r.status,
              screenedClear: !mod.flagged && !mod.pending,
              flagCount: (r.flagCount || 0) + 1,
              lastFlaggedBy: flaggerId,
              lastFlaggedAt: Date.now(),
              moderation: mod,
            }
      );
      await commitList(next);
      return { outcome };
    },
    [commitList]
  );

  // Published reviews are public. A review whose screening failed stays private
  // to its author until it can be screened, so nothing unvetted is ever shown
  // publicly and the author still sees that their review was accepted.
  // The entity list is canonical when it has the review; the author's mirror
  // fills any gap left by a dropped write.
  const allReviews = useMemo(() => {
    const byId = new Map(reviews.map((r) => [r.id, r]));
    (mine || []).forEach((r) => {
      if (!byId.has(r.id)) byId.set(r.id, r);
    });
    return [...byId.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [reviews, mine]);

  const published = useMemo(() => allReviews.filter((r) => r.status === "published"), [allReviews]);
  const visible = useMemo(
    () =>
      allReviews
        .filter((r) => r.status === "published" || (r.status === "pending" && viewerId && r.authorId === viewerId))
        .map((r) => {
          if (!r.response) return r;
          const respVisible =
            r.response.status === "published" ||
            (r.response.status === "pending" && viewerId && r.response.authorId === viewerId);
          return respVisible ? r : { ...r, response: null };
        }),
    [allReviews, viewerId]
  );
  const avgRating = useMemo(() => {
    if (!published.length) return 0;
    return published.reduce((s, r) => s + r.rating, 0) / published.length;
  }, [published]);
  const count = published.length;

  useEffect(() => {
    if (onStatsChange && !loading) onStatsChange(avgRating, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avgRating, count, loading]);

  return {
    reviews: visible,
    avgRating,
    count,
    submitReview,
    flagReview,
    adjustHelpful,
    deleteReview,
    respondToReview,
    deleteResponse,
    adjustResponseHelpful,
    submitting,
    loading,
  };
}

function useConversations(me) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!me) return;
    const rec = await getJSON(`conversationsFor:${me.id}`, true, seedConversations(me.id));
    setList(Array.isArray(rec) ? rec : []);
    setLoading(false);
  }, [me]);

  useEffect(() => {
    load();
    if (!me) return;
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load, me]);

  const ensureConversation = useCallback(
    async (otherUser) => {
      if (!me) return null;
      const cid = conversationId(me.id, otherUser.id);
      const mineRead = await readJSON(`conversationsFor:${me.id}`, true, seedConversations(me.id));
      if (!mineRead.ok) return cid;
      const mine = mineRead.value || [];
      if (!mine.find((c) => c.id === cid)) {
        const entry = { id: cid, otherUserId: otherUser.id, otherUserName: otherUser.name, otherUserAvatar: otherUser.avatar, lastMessage: "", lastAt: Date.now() };
        await setJSON(`conversationsFor:${me.id}`, [entry, ...mine], true);
        const theirs = await getJSON(`conversationsFor:${otherUser.id}`, true, []);
        if (!theirs.find((c) => c.id === cid)) {
          await setJSON(
            `conversationsFor:${otherUser.id}`,
            [{ id: cid, otherUserId: me.id, otherUserName: me.name, otherUserAvatar: me.avatar, lastMessage: "", lastAt: Date.now() }, ...theirs],
            true
          );
        }
        setList([entry, ...mine]);
      }
      return cid;
    },
    [me]
  );

  return { conversations: list, loading, ensureConversation, refresh: load };
}

function useMessages(me, cid, otherUser) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const messagesRef = useRef([]);

  // Whether the other person has blocked *me* — checked from their own
  // profile (shared_kv is readable by any signed-in user), not from anything
  // stored locally, since only they control that list. This is what actually
  // keeps a blocked person's messages from arriving at all, rather than just
  // stopping the blocker from replying.
  useEffect(() => {
    let cancelled = false;
    setBlockedByOther(false);
    if (!me || !otherUser) return;
    (async () => {
      const theirs = await getJSON(`users:${otherUser.id}`, true, null);
      if (!cancelled && theirs) setBlockedByOther((theirs.blockedUserIds || []).includes(me.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [me?.id, otherUser?.id]);

  const load = useCallback(async () => {
    if (!cid) return;
    const list = await getJSON(`messages:${cid}`, true, seedMessagesFor(me?.id, cid) || []);
    const safe = Array.isArray(list) ? list : [];
    // Never let a poll shrink the history we already hold; a failed read returns
    // the empty fallback and would otherwise blank the thread mid-conversation.
    if (safe.length >= messagesRef.current.length) {
      messagesRef.current = safe;
      setMessages(safe);
    }
    setLoading(false);
  }, [cid]);

  useEffect(() => {
    messagesRef.current = [];
  }, [cid]);

  useEffect(() => {
    load();
    if (!cid) return;
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load, cid]);

  const send = useCallback(
    async (text) => {
      if (!cid || !me || !text.trim()) return { ok: false, reason: "invalid" };
      // Re-check right before sending (not just on load) — the other person
      // could have blocked mid-conversation, and this is the one check that
      // must never be skipped, since it's what keeps the message from
      // arriving at all rather than just from being replied to.
      if (otherUser) {
        const theirs = await getJSON(`users:${otherUser.id}`, true, null);
        if (theirs && (theirs.blockedUserIds || []).includes(me.id)) {
          setBlockedByOther(true);
          return { ok: false, reason: "blocked" };
        }
      }
      const msg = { id: uid("msg"), senderId: me.id, body: text.trim(), createdAt: Date.now() };
      // Append to the history already held in memory. Re-reading here could fail
      // for a brand-new conversation and block the send.
      const next = [...messagesRef.current, msg];
      messagesRef.current = next;
      await setJSON(`messages:${cid}`, next, true);
      setMessages(next);

      const summaryUpdate = async (userId, otherName, otherAvatar) => {
        const list = await getJSON(`conversationsFor:${userId}`, true, []);
        const idx = list.findIndex((c) => c.id === cid);
        const entry = { id: cid, otherUserId: userId === me.id ? otherUser?.id : me.id, otherUserName: otherName, otherUserAvatar: otherAvatar, lastMessage: msg.body, lastAt: msg.createdAt };
        const next2 = idx >= 0 ? [entry, ...list.slice(0, idx), ...list.slice(idx + 1)] : [entry, ...list];
        await setJSON(`conversationsFor:${userId}`, next2, true);
      };
      await summaryUpdate(me.id, otherUser?.name || "them", otherUser?.avatar || "\u{1F642}");
      if (otherUser) {
        await summaryUpdate(otherUser.id, me.name, me.avatar);
        const notif = { id: uid("notif"), type: "message", title: `New message from ${me.name}`, body: msg.body.slice(0, 80), createdAt: Date.now(), read: false, route: { screen: "messages", cid } };
        const theirRead = await readJSON(`notifications:${otherUser.id}`, true, []);
        if (theirRead.ok) {
          await setJSON(`notifications:${otherUser.id}`, [notif, ...(theirRead.value || [])], true);
        }
      }
      return { ok: true };
    },
    [cid, me, otherUser]
  );

  return { messages, loading, send, blockedByOther };
}

function useNotifications(me) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef(new Set());
  const firstLoad = useRef(true);
  const notifsRef = useRef([]);

  const load = useCallback(async () => {
    if (!me) return;
    const res = await readJSON(`notifications:${me.id}`, true, seedNotifications(me.id));
    // A failed read must not wipe or resurrect anything.
    if (!res.ok) return;
    const list = Array.isArray(res.value) ? res.value : [];
    if (!firstLoad.current) {
      const newOnes = list.filter((n) => !seenIds.current.has(n.id));
      if (newOnes.length && me.notificationPrefs?.master) {
        const relevant = newOnes.filter((n) => me.notificationPrefs?.[n.type + "s"] !== false);
        if (relevant.length && me.notificationPrefs?.sound) playChime();
      }
    }
    list.forEach((n) => seenIds.current.add(n.id));
    firstLoad.current = false;
    notifsRef.current = list;
    setNotifs(list);
    setLoading(false);
  }, [me]);

  useEffect(() => {
    load();
    if (!me) return;
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load, me]);

  const markAllRead = useCallback(async () => {
    if (!me) return;
    const next = notifsRef.current.map((n) => ({ ...n, read: true }));
    notifsRef.current = next;
    setNotifs(next);
    await setJSON(`notifications:${me.id}`, next, true, { verify: true });
  }, [me]);

  const removeNotification = useCallback(
    async (id) => {
      if (!me) return;
      const next = notifsRef.current.filter((n) => n.id !== id);
      notifsRef.current = next;
      setNotifs(next);
      await setJSON(`notifications:${me.id}`, next, true, { verify: true });
    },
    [me]
  );

  const clearNotifications = useCallback(async () => {
    if (!me) return;
    notifsRef.current = [];
    setNotifs([]);
    await setJSON(`notifications:${me.id}`, [], true, { verify: true });
  }, [me]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  return { notifications: notifs, unreadCount, markAllRead, removeNotification, clearNotifications, loading, reload: load };
}

async function notifyShopOwner(shop, type, title, body, route) {
  if (!shop || !shop.ownerId) return;
  const notif = { id: uid("notif"), type, title, body, createdAt: Date.now(), read: false, route: route || { screen: "shop", shopId: shop.id } };
  const read = await readJSON(`notifications:${shop.ownerId}`, true, []);
  if (!read.ok) return;
  await setJSON(`notifications:${shop.ownerId}`, [notif, ...(read.value || [])], true);
}

/* ============================================================================
   SECTION 9: APP CONTEXT — avoids drilling `me`, data, and actions through
   every layer. Item-specific data (a single product/shop) still comes via props.
============================================================================ */
const AppContext = createContext(null);
function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppContext.Provider");
  return ctx;
}

function GlobalStyles() {
  return (
    <style>{`
      @keyframes cs-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes cs-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes cs-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
      .cs-modal-anim { animation: cs-modal-in 0.18s ease-out; }
      .cs-fade-anim { animation: cs-fade-in 0.15s ease-out; }
      .cs-toast-anim { animation: cs-toast-in 0.2s ease-out; }
      .cs-touch-none { touch-action: none; }
      /* Faint paper grain: gives surfaces the tooth of good stock rather than
         flat digital white. Pure CSS, no image request. */
      .cs-paper {
        background-color: #faf7f2;
        background-image:
          radial-gradient(circle at 20% 15%, rgba(180,160,130,0.05) 0%, transparent 45%),
          radial-gradient(circle at 80% 70%, rgba(150,140,120,0.05) 0%, transparent 40%);
      }
      /* The artifact runtime ships a prebuilt Tailwind stylesheet with no JIT
         compiler, so arbitrary values like h-[420px] silently do nothing.
         Anything outside Tailwind's default scale is defined here instead. */
      .cs-t9  { font-size: 9px;  line-height: 1.3; }
      .cs-t10 { font-size: 10px; line-height: 1.3; }
      .cs-t11 { font-size: 11px; line-height: 1.4; }
      .cs-t17 { font-size: 17px; line-height: 1.3; }
      .cs-z-modal { z-index: 100; }
      .cs-z-pop   { z-index: 110; }
      .cs-z-sheet { z-index: 200; }
      .cs-map { height: 420px; }
      @media (min-width: 768px) { .cs-map { height: 520px; } }
      .cs-track-wide { letter-spacing: 0.18em; }
      .cs-r3 { border-radius: 3px; }
      .cs-py1 { padding-top: 1px; padding-bottom: 1px; }
      .cs-max75 { max-width: 75%; }
      .cs-safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom, 8px) + 4px); }
      .cs-toggle-on { left: 22px; }
      /* On the narrowest phones the wordmark yields so the search field can still
         show its placeholder in full. The sprout stays as the home control. */
      @media (max-width: 359px) { .cs-hide-tiny { display: none; } }
      .cs-pin-tail { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid currentColor; }
      .cs-card { box-shadow: 0 1px 2px rgba(60,50,40,0.04), 0 4px 14px -8px rgba(60,50,40,0.10); }
      .cs-card:hover { box-shadow: 0 2px 4px rgba(60,50,40,0.05), 0 12px 26px -12px rgba(60,50,40,0.16); }
      input, textarea { scroll-margin-top: 90px; scroll-margin-bottom: 140px; }
    `}</style>
  );
}

/* ============================================================================
   SECTION 9b: TOUCH TEXT ENTRY
   The app runs inside an iframe, and an iframe's visualViewport does NOT shrink
   when the on-screen keyboard opens — so there is no reliable way to know where
   the keyboard is. Rather than guess, text entry on touch devices moves into a
   sheet pinned to the TOP of the screen, which is always clear of the keyboard.
   Desktop keeps ordinary inline inputs.
============================================================================ */
// Some embedded hosts block external images outright. That is invisible to the
// code — every request simply fails — so probe once and let the app say so
// plainly rather than silently showing fallbacks and looking broken.
function useExternalImageSupport() {
  const [state, setState] = useState("unknown");
  useEffect(() => {
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        setState(v);
      }
    };
    try {
      const probe = new Image();
      probe.onload = () => done("ok");
      probe.onerror = () => done("blocked");
      probe.src = `https://images.pexels.com/photos/3696170/pexels-photo-3696170.jpeg?auto=compress&cs=tinysrgb&w=40&cb=${Date.now()}`;
      const timer = setTimeout(() => done("blocked"), 7000);
      return () => clearTimeout(timer);
    } catch (e) {
      done("blocked");
    }
  }, []);
  return state;
}

function useIsTouchDevice() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    // Requiring "hover: none" was too strict: some Android browsers report
    // hover:hover, which left those users with a raw field under the keyboard.
    // A coarse pointer OR a narrow viewport is the reliable signal.
    const evaluate = () => {
      let coarse = false;
      try {
        coarse = window.matchMedia("(pointer: coarse)").matches;
      } catch (e) {
        coarse = false;
      }
      const narrow = typeof window.innerWidth === "number" && window.innerWidth < 900;
      const touchPoints = typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0;
      setTouch(coarse || narrow || touchPoints);
    };
    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, []);
  return touch;
}

function TextEntrySheet({ config, onClose }) {
  const [val, setVal] = useState("");
  const fieldRef = useRef(null);

  useEffect(() => {
    if (!config) return;
    setVal(config.value ?? "");
    const timer = setTimeout(() => {
      const el = fieldRef.current;
      if (!el) return;
      el.focus();
      try {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      } catch (e) {
        /* number inputs don't support selection ranges */
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [config?.sessionKey]);

  if (!config) return null;

  const done = () => {
    config.onCommit?.(val);
    onClose();
  };
  const submit = () => {
    config.onSubmit?.(val);
    onClose();
  };

  return (
    <div className="fixed inset-0 cs-z-sheet flex flex-col cs-fade-anim">
      <div className="bg-white shadow-2xl border-b border-stone-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onClose} className="text-sm font-semibold text-stone-500 px-1">Cancel</button>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wide truncate px-2">{config.label}</span>
          <button onClick={config.onSubmit ? submit : done} className="text-sm font-bold text-emerald-800 px-1">
            {config.primaryLabel || "Done"}
          </button>
        </div>
        {config.numeric ? (
          <input
            ref={fieldRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={config.placeholder}
            className="w-full border border-stone-200 rounded-xl px-3.5 py-3 text-base outline-none focus:border-emerald-700"
          />
        ) : (
          <textarea
            ref={fieldRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && config.onSubmit) {
                e.preventDefault();
                submit();
              }
            }}
            rows={config.multiline ? 6 : 4}
            placeholder={config.placeholder}
            className="w-full border border-stone-200 rounded-xl px-3.5 py-3 text-base leading-6 outline-none focus:border-emerald-700 resize-none"
          />
        )}
        {config.hint && <p className="cs-t11 text-stone-400 mt-1.5">{config.hint}</p>}
      </div>
      <button className="flex-1 bg-black/40" onClick={onClose} aria-label="Close text entry" />
    </div>
  );
}

/* A drop-in replacement for input/textarea. On touch it becomes a tappable box
   that opens the top sheet; on desktop it renders an ordinary field. */
function TextField({
  value,
  onChange,
  onSubmit,
  multiline,
  rows = 3,
  placeholder,
  label,
  hint,
  numeric,
  primaryLabel,
  className = "",
  onBlur,
}) {
  const ctx = useContext(AppContext);
  const isTouch = useIsTouchDevice();
  const openSheet = ctx?.openTextSheet;

  if (isTouch && openSheet) {
    const display = value === "" || value == null ? "" : String(value);
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          openSheet({
            label: label || placeholder || "Enter text",
            value: display,
            placeholder,
            multiline,
            numeric,
            hint,
            primaryLabel,
            onCommit: (v) => {
              onChange(v);
              onBlur?.(v);
            },
            onSubmit: onSubmit ? (v) => onSubmit(v) : undefined,
          })
        }
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
        className={`${className} cursor-text whitespace-pre-wrap break-words ${multiline ? "" : "truncate"}`}
        style={multiline ? { minHeight: `${Math.max(rows, 1) * 1.5}rem` } : undefined}
      >
        {display || <span className="text-stone-400">{placeholder}</span>}
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onBlur?.(value)}
        rows={rows}
        placeholder={placeholder}
        className={className}
      />
    );
  }
  return (
    <input
      type={numeric ? "number" : "text"}
      inputMode={numeric ? "decimal" : undefined}
      min={numeric ? "0" : undefined}
      step={numeric ? "0.01" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onBlur?.(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onSubmit) {
          e.preventDefault();
          onSubmit(value);
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}


/* Lazily resolves stored photo ids to data URLs, cached so a grid of cards does
   not re-read the same photo once per tile. */
function usePhotoLibrary() {
  const [urls, setUrls] = useState({});
  const pending = useRef(new Set());

  const loadPhoto = useCallback(async (id) => {
    if (!id || pending.current.has(id)) return;
    pending.current.add(id);
    const res = await readJSON(`photo:${id}`, true, null);
    if (res.ok && res.value?.dataUrl) {
      setUrls((prev) => (prev[id] ? prev : { ...prev, [id]: res.value.dataUrl }));
    }
  }, []);

  const putPhoto = useCallback((id, dataUrl) => {
    pending.current.add(id);
    setUrls((prev) => ({ ...prev, [id]: dataUrl }));
  }, []);

  return { photoUrls: urls, loadPhoto, putPhoto };
}

function usePhotoUrl(photoId) {
  const ctx = useContext(AppContext);
  const url = photoId ? ctx?.photoUrls?.[photoId] : null;
  useEffect(() => {
    if (photoId && !url) ctx?.loadPhoto?.(photoId);
  }, [photoId, url, ctx]);
  return url || null;
}

/* One control for every upload point: listing photos, avatars, shop covers. */
/* Four independent ways in. If a host blocks the file dialog, paste and drop
   still work, and the status line says which stage failed instead of leaving a
   dead button. */
function PhotoPicker({ photoId, onChange, shape = "rect", label = "Add a photo", hint, square = false, maxDim, size = "md", aspect }) {
  const { putPhoto, showToast } = useApp();
  const existing = usePhotoUrl(photoId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [awaitingPick, setAwaitingPick] = useState(false);
  const [editorSrc, setEditorSrc] = useState(null);
  const inputId = useRef(uid("file")).current;
  const cameraId = useRef(uid("cam")).current;
  const zoneRef = useRef(null);

  const cropAspect = aspect || (square ? 1 : 4 / 3);
  const outMaxDim = maxDim || (square ? AVATAR_MAX_DIM : PHOTO_MAX_DIM);

  // A picked (or dropped/pasted) file is read as-is and handed to the editor —
  // resizing, cropping, filtering, and compressing all happen there, right
  // before the result is what actually gets saved.
  const openEditorForFile = useCallback(async (file) => {
    if (!file) return;
    setAwaitingPick(false);
    setError("");
    setBusy(true);
    setStatus("Reading photo…");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setEditorSrc(dataUrl);
      setStatus("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setStatus("");
    }
    setBusy(false);
  }, []);

  const saveEdited = useCallback(
    async (dataUrl) => {
      setEditorSrc(null);
      setBusy(true);
      setError("");
      setStatus("Saving…");
      try {
        const id = await savePhoto(dataUrl);
        if (!id) throw new Error("Saved image could not be stored. Try a smaller photo.");
        putPhoto(id, dataUrl);
        onChange(id);
        showToast?.("Photo added");
      } catch (err) {
        setError(err.message || "Something went wrong.");
      }
      setStatus("");
      setBusy(false);
    },
    [onChange, putPhoto, showToast]
  );

  const onFileInput = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) openEditorForFile(file);
    else setAwaitingPick(false);
  };

  // Pasting a copied photo needs no file dialog at all.
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData && e.clipboardData.files;
      if (items && items.length) {
        e.preventDefault();
        openEditorForFile(items[0]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [openEditorForFile]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) openEditorForFile(file);
  };

  const round = shape === "round";
  // A rect preview at "lg" size stands in for the actual crop the editor will
  // produce, so it's sized to the same aspect ratio (cropAspect) rather than a
  // fixed short height — otherwise it reads as a cramped thumbnail that
  // doesn't resemble what gets saved.
  const stackedRect = !round && size === "lg";
  const box = round
    ? size === "lg" ? "w-28 h-28 rounded-full" : "w-20 h-20 rounded-full"
    : stackedRect ? "w-full rounded-xl" : "w-24 h-20 rounded-xl";
  const boxStyle = stackedRect ? { aspectRatio: String(cropAspect) } : undefined;

  return (
    <div
      ref={zoneRef}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className={round && size === "lg" ? "flex flex-col items-center gap-2" : stackedRect ? "flex flex-col gap-2" : "flex items-center gap-3"}>
        <label
          htmlFor={inputId}
          onClick={() => {
            setAwaitingPick(true);
            setError("");
            setTimeout(() => setAwaitingPick((v) => v), 100);
          }}
          style={boxStyle}
          className={`relative overflow-hidden shrink-0 cursor-pointer border-2 border-dashed flex items-center justify-center transition ${box} ${
            dragOver ? "border-emerald-600 bg-emerald-50" : "border-stone-300 bg-stone-50 hover:border-emerald-600"
          }`}
        >
          {existing ? (
            <img src={existing} alt="" className="w-full h-full object-cover" />
          ) : busy ? (
            <Loader2 size={18} className="animate-spin text-stone-400" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-stone-400">
              <Camera size={size === "lg" ? 24 : 20} />
              {!round && <span className="cs-t10 font-semibold">Photo</span>}
            </span>
          )}
          {existing && (
            <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white cs-t10 font-semibold text-center py-0.5">Change</span>
          )}
        </label>

        <div className={round && size === "lg" ? "text-center" : stackedRect ? "w-full min-w-0" : "flex-1 min-w-0"}>
          <label htmlFor={inputId} className="text-sm font-semibold text-emerald-800 cursor-pointer">
            {busy ? status || "Working…" : existing ? "Choose a different photo" : label}
          </label>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <label htmlFor={cameraId} className="cs-t11 font-semibold text-stone-500 cursor-pointer hover:text-emerald-800">
              Take a photo
            </label>
            {existing && (
              <button type="button" onClick={() => setEditorSrc(existing)} className="cs-t11 font-semibold text-stone-500 hover:text-emerald-800">
                Edit / reposition
              </button>
            )}
            {existing && (
              <button type="button" onClick={() => onChange(null)} className="cs-t11 text-stone-400 hover:text-rose-600">
                Remove
              </button>
            )}
          </div>
          {hint && !error && !awaitingPick && <p className="cs-t11 text-stone-400 mt-0.5">{hint}</p>}
          {awaitingPick && !busy && !error && (
            <p className="cs-t11 text-stone-500 mt-0.5">
              If nothing opened, your browser blocked the file dialog — you can paste a copied photo instead, or drag one onto the box.
            </p>
          )}
          {error && <p className="cs-t11 text-rose-600 mt-0.5">{error}</p>}
        </div>
      </div>

      {editorSrc && (
        <PhotoEditorModal
          src={editorSrc}
          aspect={cropAspect}
          round={shape === "round"}
          maxDim={outMaxDim}
          onCancel={() => setEditorSrc(null)}
          onSave={saveEdited}
        />
      )}

      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={onFileInput}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}
      />
      {/* A capture input sometimes succeeds where the general picker is blocked. */}
      <input
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileInput}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}
      />
    </div>
  );
}

/* ============================================================================
   SECTION 10: UI ATOMS
============================================================================ */
const AVATAR_BG = ["bg-emerald-700", "bg-amber-600", "bg-rose-700", "bg-violet-700", "bg-teal-700", "bg-orange-700"];
function bgForName(name) {
  const sum = (name || "").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_BG[sum % AVATAR_BG.length];
}
function Avatar({ emoji, name, size = "md", className = "", photoId }) {
  const sizes = { sm: "w-8 h-8 text-base", md: "w-11 h-11 text-xl", lg: "w-20 h-20 text-3xl", xl: "w-28 h-28 text-5xl" };
  const photo = usePhotoUrl(photoId);
  if (photo) {
    return (
      <div className={`rounded-full overflow-hidden shrink-0 ${sizes[size]} ${className}`}>
        <img src={photo} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`rounded-full flex items-center justify-center shrink-0 ${bgForName(name)} ${sizes[size]} ${className}`}>
      <span>{emoji || "\u{1F642}"}</span>
    </div>
  );
}

function StarRating({ value = 0, onChange, size = "md", showNumber = false }) {
  const px = size === "sm" ? 14 : size === "lg" ? 26 : 18;
  const interactive = typeof onChange === "function";
  const rounded = Math.round(value);
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={(e) => {
            e.stopPropagation();
            onChange && onChange(i);
          }}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
        >
          <Star
            size={px}
            className={i <= rounded ? "fill-amber-400 text-amber-400" : "fill-none text-stone-300"}
          />
        </button>
      ))}
      {showNumber && value > 0 && <span className="text-xs text-stone-500 ml-1">{value.toFixed(1)}</span>}
    </div>
  );
}

function PriceTag({ children, tone = "emerald", className = "", rotate = true }) {
  const tones = {
    emerald: "bg-emerald-700 text-white",
    amber: "bg-amber-500 text-stone-900",
    stone: "bg-stone-800 text-white",
    rose: "bg-rose-700 text-white",
    violet: "bg-violet-700 text-white",
    white: "bg-white text-stone-800 border border-stone-200",
  };
  return (
    <span
      className={`relative inline-flex items-center gap-1 pl-3 pr-2.5 py-1 cs-t10 font-semibold uppercase tracking-wider cs-r3 shadow-sm whitespace-nowrap ${tones[tone] || tones.emerald} ${className}`}
      style={rotate ? { transform: "rotate(-2deg)" } : undefined}
    >
      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/70" />
      <span className="pl-1">{children}</span>
    </span>
  );
}

function FavoriteHeart({ active, count, onToggle, size = "md", disabled }) {
  const px = size === "sm" ? 16 : size === "lg" ? 24 : 19;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle && onToggle();
      }}
      className="inline-flex flex-col items-center gap-0.5 group"
      aria-label={active ? "Remove favorite" : "Add favorite"}
    >
      <span className={`inline-flex items-center justify-center rounded-full p-1.5 transition ${active ? "bg-rose-50" : "bg-white/90 group-hover:bg-stone-100"} shadow-sm border border-stone-100`}>
        <Heart size={px} className={active ? "fill-rose-600 text-rose-600" : "fill-none text-stone-400"} />
      </span>
      {typeof count === "number" && <span className="cs-t10 font-semibold text-stone-500">{count}</span>}
    </button>
  );
}

function BannerRibbon({ bannerId, customText, className = "" }) {
  if (!bannerId) return null;
  if (bannerId === "custom") {
    if (!customText) return null;
    return <PriceTag tone="white" className={className}>{customText}</PriceTag>;
  }
  const preset = BANNER_PRESETS.find((b) => b.id === bannerId);
  if (!preset) return null;
  const toneMap = { sold_out: "stone", new: "emerald", preorder: "violet", in_season: "amber", limited: "rose", free: "emerald" };
  return (
    <PriceTag tone={toneMap[bannerId] || "stone"} className={className}>
      {preset.label}
    </PriceTag>
  );
}

function SocialIcon({ platform, size = 34 }) {
  const info = socialInfo(platform);
  if (!info) return null;
  const Icon = info.icon;
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shadow ${info.bg}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {Icon ? <Icon size={size * 0.5} /> : <span style={{ fontFamily: "serif" }}>{info.glyph}</span>}
    </div>
  );
}

function EmptyState({ icon: Icon = Package, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <Icon size={24} className="text-stone-400" />
      </div>
      <p className="font-semibold text-stone-700" style={displayFont}>{title}</p>
      {body && <p className="text-sm text-stone-500 mt-1 max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Modal({ open, onClose, children, labelledBy }) {
  const viewportHeight = useSafeViewportHeight();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 cs-z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 cs-fade-anim"
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div className="cs-modal-anim w-full sm:max-w-lg max-h-full overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function IconButton({ icon: Icon, onClick, label, active, size = 18, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition ${active ? "bg-emerald-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"} ${className}`}
    >
      <Icon size={size} />
    </button>
  );
}

/* ============================================================================
   SECTION 11: PRODUCT CARD + SHOP CARD (used everywhere — one definition)
============================================================================ */
/* Photograph with a designed fallback. If the image is slow or unavailable the
   tile shows a material gradient and the item glyph, so the grid never breaks. */
// Formats the attribution line. Pure, so it can be verified without needing a
// real image load — the credit itself only renders once the photo is visible,
// since crediting a photograph nobody can see would be meaningless.
function creditLine(credit) {
  if (!credit) return "";
  if (credit.by && credit.source) return `${credit.by} / ${credit.source}`;
  return credit.by || credit.source || "";
}

function ProductImage({ src, photoId, artKey, category, emoji, alt, className = "", rounded = "", credit = null, showCredit = true }) {
  // An uploaded photo always wins: it is local data, so it cannot fail to load.
  const uploaded = usePhotoUrl(photoId);
  const effectiveSrc = uploaded || src;
  const [state, setState] = useState(effectiveSrc ? "loading" : "fallback");
  const imgRef = useRef(null);

  useEffect(() => {
    setState(effectiveSrc ? "loading" : "fallback");
  }, [effectiveSrc]);

  // A cached image can finish loading before React attaches onLoad, which would
  // otherwise strand the tile at opacity 0 showing only the fallback.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setState("loaded");
  });

  const texture = CATEGORY_TEXTURE[category] || CATEGORY_TEXTURE.Veggie;

  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={{ background: texture, containerType: "inline-size" }}>
      {/* Illustration always renders underneath; a photograph fades in over it
          when one is reachable, so the tile is never empty or broken. */}
      <div className="absolute inset-0">
        <ProduceArt artKey={artKey} category={category} />
      </div>
      {state !== "fallback" && (
        <img
          ref={imgRef}
          src={effectiveSrc}
          alt={alt || ""}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState("loaded")}
          onError={() => setState("fallback")}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {/* Photographer credit: bottom-left, sized to roughly a thirtieth of the
          tile — small enough to stay out of the way, large enough to read. */}
      {state === "loaded" && showCredit && !uploaded && creditLine(credit) && (
        <span
          className="absolute bottom-0 left-0 px-[6%] py-[3%] bg-black/45 text-white leading-none pointer-events-none select-none rounded-tr"
          style={{ fontSize: "clamp(7px, 3.3cqw, 15px)", letterSpacing: "0.01em" }}
        >
          {creditLine(credit)}
        </span>
      )}
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete }) {
  const { shopsById, favProducts, toggleFavorite, me, userLoc, openProduct } = useApp();
  const shop = shopsById[product.shopId];
  const cat = catInfo(product.category);
  const isFav = !!favProducts[product.id];
  const dist = shop && userLoc ? haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) : null;

  return (
    <div
      className="bg-white rounded-xl border border-stone-200/70 overflow-hidden flex flex-col cursor-pointer cs-card hover:-translate-y-0.5 transition duration-200"
      onClick={() => (onEdit ? onEdit() : openProduct(product.id))}
    >
      <div className="relative aspect-square">
        <ProductImage src={product.image} photoId={product.photoId} credit={product.credit} artKey={product.art} category={product.category} emoji={product.emoji} alt={product.name} className="w-full h-full" />
        {product.bannerId && (
          <div className="absolute top-2 left-2">
            <BannerRibbon bannerId={product.bannerId} customText={product.customBannerText} />
          </div>
        )}
        {onEdit && (
          <span className="absolute top-2 left-2 bg-white/90 rounded-full px-2 py-1 cs-t10 font-bold text-emerald-800 shadow-sm inline-flex items-center gap-1">
            <Pencil size={11} /> Edit
          </span>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute bottom-2 left-2 bg-white/90 hover:bg-rose-50 text-stone-500 hover:text-rose-600 rounded-full w-7 h-7 flex items-center justify-center shadow-sm transition"
            aria-label={`Delete ${product.name}`}
          >
            <Trash2 size={13} />
          </button>
        )}
        <div className="absolute top-2 right-2">
          <FavoriteHeart
            active={isFav}
            count={product.favoriteCount || 0}
            disabled={!me}
            onToggle={() => toggleFavorite("product", product)}
          />
        </div>
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-semibold text-stone-900 leading-snug truncate" style={displayFont}>{product.name}</h3>
        {shop && <p className="cs-t11 text-stone-500 mt-0.5 truncate tracking-wide">{shop.name} · {shop.city}, {shop.state}</p>}
        <div className="mt-2.5 pt-2.5 border-t border-stone-100 flex items-baseline justify-between">
          <span className="cs-t17 font-semibold text-stone-900" style={displayFont}>{formatPrice(product.price)}</span>
          {dist != null && <span className="cs-t10 text-stone-400 font-medium uppercase tracking-wider">{formatDistance(dist)}</span>}
        </div>
      </div>
    </div>
  );
}

function ShopCard({ shop }) {
  const { favShops, toggleFavorite, me, userLoc, products, navigate } = useApp();
  const isFav = !!favShops[shop.id];
  const dist = userLoc ? haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) : null;
  const itemCount = products.filter((p) => p.shopId === shop.id).length;
  const theme = themeInfo(shop.themeId);

  return (
    <div
      className="bg-white rounded-xl border border-stone-200/70 overflow-hidden cursor-pointer cs-card hover:-translate-y-0.5 transition duration-200"
      onClick={() => navigate({ screen: "shop", shopId: shop.id })}
    >
      <div className="relative h-16 flex items-end px-4 pb-2 overflow-hidden">
        <span className="absolute inset-0">
          <BannerScene scene={shop.bannerScene || defaultScene(shop.id)} />
        </span>
        {shop.banner && (
          <img src={shop.banner} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
        <span className="relative -mb-6 w-12 h-12 rounded-full overflow-hidden shadow-md border-2 border-white bg-white block">
          <ShopThumb shop={shop} />
        </span>
      </div>
      <div className="pt-8 px-4 pb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-stone-900 truncate" style={displayFont}>{shop.name}</h3>
          {shop.verified && <BadgeCheck size={16} className="text-emerald-700 shrink-0" />}
        </div>
        <p className="text-xs text-stone-500 mt-0.5">{shop.city}, {shop.state}{dist != null ? ` · ${formatDistance(dist)}` : ""}</p>
        <p className="text-sm text-stone-600 mt-2 line-clamp-2">{shop.bio}</p>
        <div className="mt-2 flex items-center gap-1.5">
          {shop.reviewCount > 0 ? (
            <>
              <StarRating value={shop.avgRating} size="sm" />
              <span className="cs-t11 text-stone-500">{shop.avgRating.toFixed(1)} ({shop.reviewCount})</span>
            </>
          ) : (
            <span className="cs-t11 text-stone-400">No reviews yet</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="cs-t11 text-stone-400 font-medium">{itemCount} listing{itemCount === 1 ? "" : "s"}</span>
          <FavoriteHeart active={isFav} count={shop.favoriteCount || 0} disabled={!me} onToggle={() => toggleFavorite("shop", shop)} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 12: TOP BAR + BOTTOM NAV
============================================================================ */
function SproutMark({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 21.5V11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M11.6 13.2C11.6 9.4 9 6.6 5.2 6.4c-.3 3.9 2.3 6.8 6.4 6.8Z" fill="currentColor" opacity="0.9" />
      <path d="M12.6 15.2c0-3.6 2.5-6.3 6.2-6.5.3 3.7-2.3 6.5-6.2 6.5Z" fill="currentColor" opacity="0.65" />
    </svg>
  );
}

function TopBar({ onOpenSearch, onOpenNotifs, onOpenAccount, onOpenFavorites, onGoHome, onOpenFilters, filterCount }) {
  const { me, userLoc, openLocationPicker, unreadCount, favProducts, favShops, globalSearch, setGlobalSearch } = useApp();
  const totalFav = Object.keys(favProducts).length + Object.keys(favShops).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="px-3 py-3 flex items-center gap-1 max-w-6xl mx-auto">
        {/* Sprout and stacked wordmark are a single control that returns home. */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-1.5 shrink-0 text-emerald-800 hover:opacity-75 active:opacity-60 transition rounded-xl"
          aria-label="CropSwap home"
          title="Home"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 shrink-0">
            <SproutMark size={17} />
          </span>
          <span className="cs-hide-tiny flex flex-col items-start font-bold leading-none" style={{ ...displayFont, fontSize: "12px", lineHeight: 1.05 }}>
            <span>Crop</span>
            <span>Swap</span>
          </span>
        </button>

        {/* 30% shorter: the pill takes 70% of the space it used to fill. */}
        {/* Fills the row and never shrinks below the width of its own placeholder. */}
        <div
          className="flex-1 flex items-center gap-1 bg-stone-100 rounded-full px-2.5 py-2 min-w-0 focus-within:bg-stone-200 transition"
          style={{ minWidth: "96px" }}
        >
          <Search size={15} className="shrink-0 text-stone-400" />
          <input
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              onOpenSearch();
            }}
            onFocus={onOpenSearch}
            placeholder="Search"
            className="bg-transparent outline-none text-sm w-full min-w-0 text-stone-800 placeholder-stone-400"
            aria-label="Search listings and shops"
          />
          {globalSearch && (
            <button onClick={() => setGlobalSearch("")} aria-label="Clear search" className="shrink-0 text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={openLocationPicker}
          className="hidden md:flex items-center gap-1 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full px-3 py-2 shrink-0"
        >
          <MapPin size={14} className="text-emerald-700" />
          {userLoc?.label || "Set location"}
        </button>

        {/* Filter sits between the search field and the bell. Every control in
            this row is a 36px box on one centre line so nothing rides high or low. */}
        <button onClick={onOpenFilters} className="relative shrink-0 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition" aria-label="Filters">
          <Filter size={16} />
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-900 cs-t9 font-bold w-4 h-4 rounded-full flex items-center justify-center">{filterCount}</span>
          )}
        </button>

        <button onClick={onOpenNotifs} className="relative shrink-0 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition" aria-label="Notifications">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-700 text-white cs-t9 font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* The saved count is a badge rather than text underneath, which was what
            made this control taller than its neighbours and threw the row off. */}
        <button
          onClick={onOpenFavorites}
          className={`relative shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition ${totalFav > 0 ? "bg-rose-50" : "bg-stone-100 hover:bg-stone-200"}`}
          aria-label={`Favourites (${totalFav} saved)`}
        >
          <Heart size={16} className={totalFav > 0 ? "fill-rose-600 text-rose-600" : "fill-none text-stone-600"} />
          {totalFav > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white cs-t9 font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {totalFav > 9 ? "9+" : totalFav}
            </span>
          )}
        </button>

        <button onClick={onOpenAccount} className="shrink-0 relative w-8 h-8 flex items-center justify-center" aria-label="Account">
          {me ? <Avatar emoji={me.avatar} name={me.name} size="sm" photoId={me.avatarPhotoId} /> : <IconButton icon={User} label="Account" />}
          {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white" />}
        </button>
      </div>
    </header>
  );
}

function BottomNav({ route, navigate }) {
  const { me } = useApp();
  const items = [
    { id: "explore", label: "Explore", icon: Home },
    { id: "store", label: me?.isVendor ? "My Store" : "Sell", icon: Store },
    { id: "messages", label: "Messages", icon: MessageCircle },
  ];
  return (
    <nav className="md:hidden shrink-0 bg-white border-t border-stone-200 flex justify-around items-center pt-1.5 cs-safe-bottom z-40">
      {items.map((it) => {
        const isActive = route.screen === it.id || (it.id === "store" && route.screen === "storeEditor");
        return (
          <button
            key={it.id}
            onClick={() => navigate({ screen: it.id })}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 ${isActive ? "text-emerald-800" : "text-stone-400"}`}
          >
            <it.icon size={21} />
            <span className="cs-t10 font-bold">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Sidebar({ route, navigate }) {
  const { me } = useApp();
  const items = [
    { id: "explore", label: "Explore", icon: Home },
    { id: "store", label: me?.isVendor ? "My Store" : "Start Selling", icon: Store },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "favorites", label: "Favorites", icon: Heart },
  ];
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-stone-200 p-5 gap-1">
      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xl mb-8 px-2" style={displayFont}>
        <Sparkles size={22} /> CropSwap
      </div>
      {items.map((it) => {
        const isActive = route.screen === it.id || (it.id === "store" && route.screen === "storeEditor");
        return (
          <button
            key={it.id}
            onClick={() => navigate({ screen: it.id })}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition ${isActive ? "bg-emerald-50 text-emerald-800" : "text-stone-500 hover:bg-stone-50"}`}
          >
            <it.icon size={18} /> {it.label}
          </button>
        );
      })}
    </aside>
  );
}

/* ============================================================================
   SECTION 13: LOCATION PICKER
============================================================================ */
const PRESET_LOCATIONS = [
  { label: "Rathdrum, ID", lat: 47.8121, lng: -116.8974 },
  { label: "Post Falls, ID", lat: 47.7180, lng: -116.9518 },
  { label: "Fredericksburg, TX", lat: 30.2752, lng: -98.8720 },
  { label: "Montpelier, VT", lat: 44.2601, lng: -72.5754 },
  { label: "Asheville, NC", lat: 35.5951, lng: -82.5515 },
  { label: "Sonoma, CA", lat: 38.2919, lng: -122.4580 },
  { label: "Madison, WI", lat: 43.0731, lng: -89.4012 },
  { label: "Portland, OR", lat: 45.5152, lng: -122.6784 },
  { label: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { label: "Denver, CO", lat: 39.7392, lng: -104.9903 },
];
function LocationPickerModal({ open, onClose, onPick }) {
  const [geoStatus, setGeoStatus] = useState("idle");
  const tryDeviceLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPick({ label: "Current location", lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("idle");
        onClose();
      },
      () => {
        setGeoStatus("denied");
      },
      { timeout: 8000 }
    );
  };
  return (
    <Modal open={open} onClose={onClose} labelledBy="loc-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="loc-title" className="text-lg font-bold text-stone-900" style={displayFont}>Set your location</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} className="text-stone-400" /></button>
        </div>
        <button
          onClick={tryDeviceLocation}
          className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl mb-2"
        >
          <MapPin size={16} /> {geoStatus === "locating" ? "Locating…" : "Use my device location"}
        </button>
        {geoStatus === "denied" && <p className="text-xs text-rose-600 text-center mb-2">Couldn't access your location — pick a city below instead.</p>}
        {geoStatus === "unsupported" && <p className="text-xs text-rose-600 text-center mb-2">Your browser doesn't support this — pick a city below.</p>}
        <p className="text-xs text-stone-400 text-center my-3">or choose a city</p>
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
          {PRESET_LOCATIONS.map((loc) => (
            <button
              key={loc.label}
              onClick={() => {
                onPick(loc);
                onClose();
              }}
              className="text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 text-sm font-medium text-stone-700"
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================================
   SECTION 14: FILTER PANEL (the "extremely robust" filter set)
============================================================================ */
const DEFAULT_FILTERS = { search: "", categories: [], maxDistance: null, minRating: 0, minPrice: "", maxPrice: "", inSeasonOnly: false, verifiedOnly: false, openOnly: false, sortBy: "distance" };
const DISTANCE_OPTIONS = [
  { label: "5 mi", value: 5 }, { label: "10 mi", value: 10 }, { label: "25 mi", value: 25 },
  { label: "50 mi", value: 50 }, { label: "100 mi", value: 100 }, { label: "Nationwide", value: null },
];
function FilterPanel({ open, onClose, filters, setFilters, mode = "products", onSaveSearch }) {
  const isShops = mode === "shops";
  const toggleCategory = (id) =>
    setFilters((f) => ({ ...f, categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id] }));

  return (
    <Modal open={open} onClose={onClose} labelledBy="filter-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="filter-title" className="text-lg font-bold text-stone-900" style={displayFont}>{isShops ? "Filter shops" : "Filter listings"}</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} className="text-stone-400" /></button>
        </div>

        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">{isShops ? "Carries" : "Category"}</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filters.categories.includes(c.id) ? "bg-emerald-800 text-white border-emerald-800" : "bg-white text-stone-600 border-stone-200"}`}
            >
              <span className="inline-flex items-center gap-1.5"><CategoryMark id={c.id} /> {c.label}</span>
            </button>
          ))}
        </div>

        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Distance</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {DISTANCE_OPTIONS.map((d) => (
            <button
              key={d.label}
              onClick={() => setFilters((f) => ({ ...f, maxDistance: d.value }))}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filters.maxDistance === d.value ? "bg-emerald-800 text-white border-emerald-800" : "bg-white text-stone-600 border-stone-200"}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {!isShops && <><p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Price range</p>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {[
            { label: "Free", min: "0", max: "0" },
            { label: "Under $10", min: "", max: "10" },
            { label: "$10–50", min: "10", max: "50" },
            { label: "$50–100", min: "50", max: "100" },
            { label: "$100+", min: "100", max: "" },
            { label: "Any", min: "", max: "" },
          ].map((band) => {
            const active = filters.minPrice === band.min && filters.maxPrice === band.max;
            return (
              <button
                key={band.label}
                onClick={() => setFilters((f) => ({ ...f, minPrice: band.min, maxPrice: band.max }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${active ? "bg-emerald-800 text-white border-emerald-800" : "bg-white text-stone-600 border-stone-200"}`}
              >
                {band.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mb-5">
          <TextField numeric placeholder="Min" label="Minimum price" value={filters.minPrice} onChange={(v) => setFilters((f) => ({ ...f, minPrice: v }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
          <span className="text-stone-400">–</span>
          <TextField numeric placeholder="Max" label="Maximum price" value={filters.maxPrice} onChange={(v) => setFilters((f) => ({ ...f, maxPrice: v }))} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm" />
        </div></>}

        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Minimum rating</p>
        <div className="mb-5"><StarRating value={filters.minRating} onChange={(v) => setFilters((f) => ({ ...f, minRating: f.minRating === v ? 0 : v }))} /></div>

        {isShops ? (
          <div className="flex items-center justify-between py-2.5 border-t border-stone-100">
            <span className="text-sm font-medium text-stone-700">Actively selling only</span>
            <ToggleSwitch checked={!!filters.openOnly} onChange={(v) => setFilters((f) => ({ ...f, openOnly: v }))} />
          </div>
        ) : (
          <div className="flex items-center justify-between py-2.5 border-t border-stone-100">
            <span className="text-sm font-medium text-stone-700">In season only</span>
            <ToggleSwitch checked={filters.inSeasonOnly} onChange={(v) => setFilters((f) => ({ ...f, inSeasonOnly: v }))} />
          </div>
        )}
        <div className="flex items-center justify-between py-2.5 border-t border-stone-100 mb-5">
          <span className="text-sm font-medium text-stone-700">Verified vendors only</span>
          <ToggleSwitch checked={filters.verifiedOnly} onChange={(v) => setFilters((f) => ({ ...f, verifiedOnly: v }))} />
        </div>

        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Sort by</p>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-6 bg-white"
        >
          <option value="distance">Closest first</option>
          <option value="rating">Highest rated</option>
          <option value="favorited">Most favorited</option>
          {isShops ? (
            <>
              <option value="newest">Newest shops</option>
              <option value="name">Name A–Z</option>
            </>
          ) : (
            <>
              <option value="newest">Newest listed</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </>
          )}
        </select>

        {onSaveSearch && (
          <button
            onClick={() => {
              onSaveSearch();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50 font-semibold text-amber-900 text-sm mb-2"
          >
            <Bookmark size={14} /> Save this search
          </button>
        )}
        <div className="flex gap-2">
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="flex-1 py-2.5 rounded-xl border border-stone-200 font-semibold text-stone-600 text-sm">Clear all</button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-emerald-800 text-white font-semibold text-sm">Show results</button>
        </div>
      </div>
    </Modal>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition relative shrink-0 ${checked ? "bg-emerald-700" : "bg-stone-300"}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "cs-toggle-on" : "left-0.5"}`} />
    </button>
  );
}

/* ============================================================================
   SECTION 15: EXPLORE VIEW
============================================================================ */
function ExploreView({ navigate }) {
  const { products, shops, shopsById, userLoc, favShops, me, showToast, globalSearch, setGlobalSearch } = useApp();
  const { filters, setFilters, filterOpen, setFilterOpen, exploreView: view, setExploreView: setView, registerSaveSearch } = useApp();
  const searchDraft = globalSearch;
  const setSearchDraft = setGlobalSearch;
  const [savedSearches, setSavedSearches] = useState([]);

  useEffect(() => {
    if (!me) return;
    getJSON(`savedSearches:${me.id}`, false, []).then(setSavedSearches);
  }, [me]);

  const persistSaved = async (next) => {
    setSavedSearches(next);
    if (me) await setJSON(`savedSearches:${me.id}`, next, false);
  };

  const saveCurrentSearch = useCallback(() => {
    const label =
      (filters.search || searchDraft || "").trim() ||
      (filters.categories.length ? filters.categories.map((c) => catInfo(c).label).join(" + ") : "") ||
      "All listings";
    const entry = { id: uid("ss"), label, filters: { ...filters, search: searchDraft } };
    persistSaved([entry, ...savedSearches.filter((s) => s.label !== label)].slice(0, 8));
    showToast(`Saved "${label}"`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchDraft, savedSearches, showToast]);

  useEffect(() => {
    registerSaveSearch?.(() => saveCurrentSearch);
    return () => registerSaveSearch?.(null);
  }, [registerSaveSearch, saveCurrentSearch]);

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search: searchDraft })), 250);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const filtered = useMemo(
    () => applyFilters(products, { ...filters, minPrice: filters.minPrice === "" ? undefined : Number(filters.minPrice), maxPrice: filters.maxPrice === "" ? undefined : Number(filters.maxPrice), shopsById, userLoc }),
    [products, filters, shopsById, userLoc]
  );
  const sorted = useMemo(() => sortProducts(filtered, filters.sortBy, shopsById, userLoc), [filtered, filters.sortBy, shopsById, userLoc]);

  // The map shows only shops that still have a matching listing, so it stays
  // consistent with whatever filters are active.
  const productsByShop = useMemo(() => {
    const map = {};
    products.forEach((pr) => {
      (map[pr.shopId] = map[pr.shopId] || []).push(pr);
    });
    return map;
  }, [products]);

  const shopResults = useMemo(() => {
    const filtered = applyShopFilters(shops, {
      search: searchDraft,
      categories: filters.categories,
      maxDistance: filters.maxDistance,
      minRating: filters.minRating,
      verifiedOnly: filters.verifiedOnly,
      openOnly: filters.openOnly,
      userLoc,
      productsByShop,
    });
    return sortShops(filtered, filters.sortBy, userLoc);
  }, [shops, searchDraft, filters, userLoc, productsByShop]);

  const visibleShops = useMemo(() => {
    const ids = new Set(sorted.map((p) => p.shopId));
    return Object.values(shopsById).filter((s) => ids.has(s.id));
  }, [sorted, shopsById]);

  const followedShopIds = Object.keys(favShops);
  const followingFeed = useMemo(
    () => products.filter((pr) => followedShopIds.includes(pr.shopId)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8),
    [products, favShops]
  );

  const activeFilterCount =
    filters.categories.length + (filters.maxDistance !== null ? 1 : 0) + (filters.minRating > 0 ? 1 : 0) + (filters.inSeasonOnly ? 1 : 0) + (filters.verifiedOnly ? 1 : 0) + (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0);

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="px-4 pt-4 max-w-6xl mx-auto">
        {savedSearches.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            {savedSearches.map((ss) => (
              <span key={ss.id} className="shrink-0 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full pl-3 pr-1.5 py-1">
                <button
                  onClick={() => {
                    setFilters(ss.filters);
                    setSearchDraft(ss.filters.search || "");
                  }}
                  className="text-xs font-semibold text-amber-900 whitespace-nowrap"
                >
                  {ss.label}
                </button>
                <button onClick={() => persistSaved(savedSearches.filter((s) => s.id !== ss.id))} className="text-amber-600 hover:text-amber-900" aria-label={`Remove saved search ${ss.label}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((c) => {
            const active = filters.categories.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setFilters((f) => ({ ...f, categories: active ? f.categories.filter((x) => x !== c.id) : [...f.categories, c.id] }))}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold border transition shrink-0 ${active ? "bg-emerald-800 text-white border-emerald-800" : "bg-white text-stone-600 border-stone-200"}`}
              >
                <span className="inline-flex items-center gap-1.5"><CategoryMark id={c.id} /> {c.label}</span>
              </button>
            );
          })}
        </div>

        {followingFeed.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><TrendingUp size={13} /> New from shops you follow</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
              {followingFeed.map((pr) => (
                <div key={pr.id} className="w-40 shrink-0">
                  <ProductCard product={pr} />
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-stone-400 font-medium mb-3">{sorted.length} listing{sorted.length === 1 ? "" : "s"}{userLoc ? ` near ${userLoc.label}` : ""}</p>

        <div className="flex gap-1 mb-4 bg-stone-100 rounded-full p-1 w-fit">
          {[
            { id: "grid", label: "Listings" },
            { id: "shops", label: "Shops" },
            { id: "map", label: "Map" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setView(m.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${view === m.id ? "bg-white shadow text-stone-900" : "text-stone-500"}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {view === "shops" ? (
          shopResults.length === 0 ? (
            <EmptyState icon={Store} title="No shops match" body="Try widening your distance or lowering the rating filter." action={<button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-sm font-semibold text-emerald-800">Clear filters</button>} />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
              {shopResults.map((sh) => (
                <ShopCard key={sh.id} shop={sh} />
              ))}
            </div>
          )
        ) : view === "map" ? (
          <VendorMap shops={visibleShops} userLoc={userLoc} onOpenShop={(s) => navigate({ screen: "shop", shopId: s.id })} />
        ) : sorted.length === 0 ? (
          <EmptyState icon={Search} title="Nothing matches yet" body="Try widening your distance or clearing a filter." action={<button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-sm font-semibold text-emerald-800">Clear filters</button>} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {sorted.map((pr) => (
              <ProductCard key={pr.id} product={pr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 15a: EMBEDDED US GEOMETRY
   External images are blocked in this sandbox, so raster basemap tiles can never
   load. The map is therefore drawn as vector geometry that ships in the bundle:
   no network requests, instant render, ~7KB. Straight state borders use their
   true defining meridians and parallels; the outline and coasts are simplified.
   Verified by point-in-polygon tests against 50+ known city locations.
============================================================================ */
const US_GEO = {"outline":[[-124.7,48.4],[-124.4,47.4],[-124.25,46.9],[-124.05,46.3],[-123.9,45.5],[-124.06,44.95],[-124.16,44.55],[-124.4,43.3],[-124.4,42.6],[-124.3,41.7],[-124.3,40.8],[-124.05,40.1],[-123.8,39.4],[-123.0,38.9],[-122.5,37.8],[-122.0,36.9],[-121.9,36.6],[-121.3,35.7],[-120.7,35.1],[-120.0,34.47],[-119.2,34.05],[-118.5,34.0],[-117.3,32.9],[-117.1,32.5],[-116.1,32.6],[-114.7,32.7],[-114.8,32.5],[-113.3,32.0],[-111.0,31.3],[-109.0,31.33],[-108.2,31.33],[-108.2,31.78],[-106.62,31.78],[-106.45,31.72],[-106.2,31.5],[-105.6,31.1],[-105.0,30.7],[-104.0,29.3],[-103.0,29.0],[-102.4,29.8],[-101.4,29.8],[-100.7,29.1],[-100.0,28.5],[-99.7,27.8],[-99.6,27.4],[-99.1,26.4],[-97.4,25.9],[-97.2,26.1],[-97.4,27.3],[-96.4,28.4],[-95.3,28.9],[-94.7,29.3],[-94.0,29.7],[-93.3,29.8],[-92.1,29.6],[-91.5,29.3],[-90.2,29.1],[-89.2,29.0],[-89.4,30.0],[-88.9,30.4],[-88.0,30.4],[-87.5,30.3],[-86.5,30.4],[-85.5,29.9],[-84.9,29.7],[-84.3,30.1],[-83.6,29.9],[-82.9,29.1],[-82.7,28.5],[-82.6,27.8],[-82.4,27.0],[-81.8,26.4],[-81.2,25.8],[-81.15,25.15],[-81.95,24.45],[-81.4,24.78],[-80.5,25.08],[-80.35,25.35],[-80.1,25.8],[-80.03,26.7],[-80.1,27.2],[-80.35,27.8],[-80.6,28.4],[-81.0,29.2],[-81.3,30.4],[-81.4,31.3],[-80.9,32.0],[-79.9,32.8],[-79.2,33.3],[-78.5,33.9],[-77.9,34.2],[-76.5,34.6],[-75.7,35.2],[-75.5,35.8],[-76.0,36.3],[-75.9,36.9],[-76.2,37.3],[-76.0,37.9],[-75.4,38.0],[-75.1,38.5],[-74.86,38.92],[-74.35,39.35],[-74.05,40.0],[-74.0,40.5],[-73.2,40.9],[-72.3,41.1],[-71.5,41.4],[-71.0,41.5],[-70.7,41.55],[-69.93,41.6],[-69.9,41.78],[-70.3,41.95],[-70.55,42.05],[-70.85,42.6],[-70.7,43.1],[-70.0,43.7],[-69.0,44.0],[-68.2,44.4],[-67.3,44.7],[-67.0,45.2],[-67.8,45.7],[-67.75,46.4],[-67.78,47.07],[-69.0,47.44],[-69.4,47.4],[-70.3,46.2],[-71.5,45.01],[-74.7,45.01],[-76.8,44.1],[-78.7,43.6],[-79.2,43.3],[-79.1,42.9],[-80.5,42.4],[-82.4,41.7],[-83.1,42.0],[-82.55,42.6],[-82.32,43.0],[-82.5,43.6],[-82.6,44.0],[-83.4,45.0],[-84.0,45.9],[-84.1,46.55],[-84.6,46.45],[-85.0,46.1],[-84.8,45.8],[-85.5,46.0],[-86.5,46.5],[-87.6,46.9],[-88.5,46.8],[-89.5,46.8],[-90.4,46.6],[-90.8,47.2],[-89.5,47.9],[-88.4,48.3],[-89.6,48.0],[-90.8,48.1],[-91.6,48.1],[-92.3,48.2],[-93.4,48.6],[-94.6,48.7],[-95.2,49.0],[-104.0,49.0],[-110.0,49.0],[-116.0,49.0],[-123.3,49.0],[-123.1,48.4],[-124.7,48.4]],"lakes":[[[-92.1,46.75],[-91.0,46.72],[-90.2,46.66],[-89.3,46.6],[-88.75,47.3],[-88.35,47.45],[-88.3,46.78],[-87.6,46.86],[-86.6,46.68],[-85.4,46.72],[-84.6,46.5],[-84.35,46.55],[-84.9,47.02],[-85.9,47.3],[-87.2,47.9],[-88.4,48.3],[-89.6,48.1],[-90.8,47.5],[-91.6,47.0],[-92.1,46.75]],[[-87.05,45.75],[-87.3,45.15],[-87.62,44.6],[-87.9,44.15],[-87.62,43.8],[-87.6,42.9],[-87.55,42.1],[-87.53,41.76],[-86.8,41.76],[-86.4,42.6],[-86.4,43.3],[-86.55,44.0],[-86.2,44.8],[-85.6,45.2],[-85.0,45.62],[-84.75,45.8],[-85.5,45.95],[-86.3,45.95]],[[-84.75,45.8],[-84.05,45.95],[-83.45,45.6],[-82.95,45.2],[-82.3,44.5],[-82.1,43.6],[-82.4,43.02],[-82.9,43.7],[-83.45,43.98],[-83.95,43.9],[-83.62,44.42],[-83.3,44.92],[-83.55,45.35],[-84.2,45.92],[-84.75,45.8]],[[-83.45,41.72],[-82.7,41.5],[-81.5,41.62],[-80.5,42.1],[-79.2,42.72],[-78.9,42.9],[-79.6,42.6],[-80.6,42.48],[-81.6,42.32],[-82.6,42.05],[-83.15,42.0],[-83.45,41.72]],[[-79.2,43.3],[-78.0,43.35],[-76.9,43.28],[-76.2,43.62],[-76.5,44.05],[-77.5,44.1],[-78.7,43.92],[-79.5,43.6],[-79.2,43.3]]],"cities":[["New York",-74.01,40.71,1,"NY"],["Los Angeles",-118.24,34.05,1,"CA"],["Chicago",-87.63,41.88,1,"IL"],["Houston",-95.37,29.76,1,"TX"],["Phoenix",-112.07,33.45,1,"AZ"],["Philadelphia",-75.17,39.95,1,"PA"],["San Antonio",-98.49,29.42,1,"TX"],["San Diego",-117.16,32.72,1,"CA"],["Dallas",-96.8,32.78,1,"TX"],["San Jose",-121.89,37.34,1,"CA"],["Austin",-97.74,30.27,2,"TX"],["Jacksonville",-81.66,30.33,2,"FL"],["Fort Worth",-97.33,32.76,2,"TX"],["Columbus",-82.99,39.96,2,"OH"],["Charlotte",-80.84,35.23,2,"NC"],["Indianapolis",-86.16,39.77,2,"IN"],["San Francisco",-122.42,37.77,2,"CA"],["Seattle",-122.33,47.61,2,"WA"],["Denver",-104.99,39.74,2,"CO"],["Washington",-77.04,38.91,2,"DC"],["Boston",-71.06,42.36,2,"MA"],["Nashville",-86.78,36.16,2,"TN"],["Detroit",-83.05,42.33,2,"MI"],["Portland",-122.68,45.52,2,"OR"],["Memphis",-90.05,35.15,2,"TN"],["Las Vegas",-115.14,36.17,2,"NV"],["Baltimore",-76.61,39.29,2,"MD"],["Milwaukee",-87.91,43.04,2,"WI"],["Albuquerque",-106.65,35.08,2,"NM"],["Tucson",-110.97,32.22,2,"AZ"],["Sacramento",-121.49,38.58,2,"CA"],["Kansas City",-94.58,39.1,2,"MO"],["Atlanta",-84.39,33.75,2,"GA"],["Miami",-80.19,25.76,2,"FL"],["Omaha",-95.94,41.26,2,"NE"],["Minneapolis",-93.27,44.98,2,"MN"],["New Orleans",-90.07,29.95,2,"LA"],["Cleveland",-81.69,41.5,2,"OH"],["Oklahoma City",-97.52,35.47,2,"OK"],["Louisville",-85.76,38.25,2,"KY"],["Birmingham",-86.8,33.52,3,"AL"],["Montgomery",-86.3,32.37,3,"AL"],["Mobile",-88.04,30.69,3,"AL"],["Huntsville",-86.59,34.73,3,"AL"],["Mesa",-111.83,33.42,3,"AZ"],["Flagstaff",-111.65,35.2,3,"AZ"],["Yuma",-114.62,32.69,3,"AZ"],["Little Rock",-92.29,34.75,3,"AR"],["Fayetteville",-94.16,36.06,3,"AR"],["Fort Smith",-94.4,35.39,3,"AR"],["Fresno",-119.79,36.74,3,"CA"],["Long Beach",-118.19,33.77,3,"CA"],["Bakersfield",-119.02,35.37,3,"CA"],["Redding",-122.39,40.59,3,"CA"],["Colorado Springs",-104.82,38.83,3,"CO"],["Grand Junction",-108.55,39.06,3,"CO"],["Pueblo",-104.61,38.25,3,"CO"],["Hartford",-72.68,41.76,3,"CT"],["Bridgeport",-73.19,41.18,3,"CT"],["New Haven",-72.93,41.31,3,"CT"],["Wilmington",-75.55,39.74,3,"DE"],["Dover",-75.52,39.16,3,"DE"],["Tampa",-82.46,27.95,3,"FL"],["Orlando",-81.38,28.54,3,"FL"],["Tallahassee",-84.28,30.44,3,"FL"],["Fort Myers",-81.87,26.64,3,"FL"],["Savannah",-81.1,32.08,3,"GA"],["Augusta",-81.97,33.47,3,"GA"],["Columbus GA",-84.99,32.46,3,"GA"],["Boise",-116.2,43.62,3,"ID"],["Idaho Falls",-112.03,43.49,3,"ID"],["Coeur d'Alene",-116.78,47.68,3,"ID"],["Twin Falls",-114.46,42.56,3,"ID"],["Springfield IL",-89.65,39.8,3,"IL"],["Peoria",-89.59,40.69,3,"IL"],["Rockford",-89.09,42.27,3,"IL"],["Fort Wayne",-85.14,41.08,3,"IN"],["Evansville",-87.57,37.97,3,"IN"],["South Bend",-86.25,41.68,3,"IN"],["Des Moines",-93.61,41.59,3,"IA"],["Cedar Rapids",-91.67,41.98,3,"IA"],["Davenport",-90.58,41.52,3,"IA"],["Wichita",-97.34,37.69,3,"KS"],["Topeka",-95.69,39.05,3,"KS"],["Salina",-97.61,38.84,3,"KS"],["Lexington",-84.5,38.05,3,"KY"],["Bowling Green",-86.44,36.99,3,"KY"],["Baton Rouge",-91.19,30.45,3,"LA"],["Shreveport",-93.75,32.53,3,"LA"],["Lafayette",-92.02,30.22,3,"LA"],["Portland ME",-70.26,43.66,3,"ME"],["Bangor",-68.78,44.8,3,"ME"],["Augusta ME",-69.78,44.31,3,"ME"],["Annapolis",-76.49,38.98,3,"MD"],["Hagerstown",-77.72,39.64,3,"MD"],["Worcester",-71.8,42.26,3,"MA"],["Springfield MA",-72.59,42.1,3,"MA"],["Grand Rapids",-85.67,42.96,3,"MI"],["Lansing",-84.56,42.73,3,"MI"],["Traverse City",-85.62,44.76,3,"MI"],["Marquette",-87.4,46.55,3,"MI"],["Duluth",-92.1,46.79,3,"MN"],["Rochester MN",-92.46,44.02,3,"MN"],["St. Cloud",-94.16,45.56,3,"MN"],["Jackson",-90.18,32.3,3,"MS"],["Gulfport",-89.09,30.37,3,"MS"],["Tupelo",-88.7,34.26,3,"MS"],["St. Louis",-90.2,38.63,3,"MO"],["Springfield MO",-93.29,37.21,3,"MO"],["Columbia MO",-92.33,38.95,3,"MO"],["Billings",-108.5,45.78,3,"MT"],["Missoula",-113.99,46.87,3,"MT"],["Great Falls",-111.3,47.51,3,"MT"],["Bozeman",-111.04,45.68,3,"MT"],["Lincoln",-96.68,40.81,3,"NE"],["Grand Island",-98.34,40.92,3,"NE"],["North Platte",-100.77,41.12,3,"NE"],["Reno",-119.81,39.53,3,"NV"],["Carson City",-119.77,39.16,3,"NV"],["Elko",-115.76,40.83,3,"NV"],["Manchester",-71.46,42.99,3,"NH"],["Concord NH",-71.54,43.21,3,"NH"],["Newark",-74.17,40.74,3,"NJ"],["Trenton",-74.74,40.22,3,"NJ"],["Atlantic City",-74.42,39.36,3,"NJ"],["Santa Fe",-105.94,35.69,3,"NM"],["Las Cruces",-106.78,32.31,3,"NM"],["Roswell",-104.52,33.39,3,"NM"],["Buffalo",-78.88,42.89,3,"NY"],["Rochester",-77.61,43.16,3,"NY"],["Syracuse",-76.15,43.05,3,"NY"],["Albany",-73.76,42.65,3,"NY"],["Raleigh",-78.64,35.78,3,"NC"],["Greensboro",-79.79,36.07,3,"NC"],["Asheville",-82.55,35.6,3,"NC"],["Wilmington NC",-77.94,34.23,3,"NC"],["Fargo",-96.79,46.88,3,"ND"],["Bismarck",-100.78,46.81,3,"ND"],["Minot",-101.3,48.23,3,"ND"],["Cincinnati",-84.51,39.1,3,"OH"],["Toledo",-83.56,41.65,3,"OH"],["Dayton",-84.19,39.76,3,"OH"],["Tulsa",-95.99,36.15,3,"OK"],["Lawton",-98.39,34.61,3,"OK"],["Eugene",-123.09,44.05,3,"OR"],["Salem",-123.04,44.94,3,"OR"],["Bend",-121.31,44.06,3,"OR"],["Medford",-122.87,42.33,3,"OR"],["Pittsburgh",-79.996,40.44,3,"PA"],["Harrisburg",-76.88,40.27,3,"PA"],["Allentown",-75.49,40.6,3,"PA"],["Scranton",-75.66,41.41,3,"PA"],["Providence",-71.41,41.82,3,"RI"],["Columbia SC",-81.03,34.0,3,"SC"],["Charleston SC",-79.93,32.78,3,"SC"],["Greenville SC",-82.39,34.85,3,"SC"],["Sioux Falls",-96.7,43.55,3,"SD"],["Rapid City",-103.23,44.08,3,"SD"],["Pierre",-100.35,44.37,3,"SD"],["Knoxville",-83.92,35.96,3,"TN"],["Chattanooga",-85.31,35.05,3,"TN"],["El Paso",-106.49,31.76,3,"TX"],["Corpus Christi",-97.4,27.8,3,"TX"],["Lubbock",-101.86,33.58,3,"TX"],["Amarillo",-101.83,35.22,3,"TX"],["Laredo",-99.51,27.51,3,"TX"],["Salt Lake City",-111.89,40.76,3,"UT"],["Provo",-111.66,40.23,3,"UT"],["St. George",-113.58,37.1,3,"UT"],["Burlington",-73.21,44.48,3,"VT"],["Montpelier",-72.58,44.26,3,"VT"],["Virginia Beach",-75.98,36.85,3,"VA"],["Richmond",-77.44,37.54,3,"VA"],["Roanoke",-79.94,37.27,3,"VA"],["Spokane",-117.43,47.66,3,"WA"],["Tacoma",-122.44,47.25,3,"WA"],["Yakima",-120.51,46.6,3,"WA"],["Bellingham",-122.49,48.75,3,"WA"],["Charleston WV",-81.63,38.35,3,"WV"],["Morgantown",-79.96,39.63,3,"WV"],["Madison",-89.4,43.07,3,"WI"],["Green Bay",-88.02,44.51,3,"WI"],["Eau Claire",-91.5,44.81,3,"WI"],["Cheyenne",-104.82,41.14,3,"WY"],["Casper",-106.31,42.85,3,"WY"],["Jackson WY",-110.76,43.48,3,"WY"],["Tuscaloosa",-87.57,33.21,4,"AL"],["Dothan",-85.39,31.22,4,"AL"],["Scottsdale",-111.93,33.49,4,"AZ"],["Prescott",-112.47,34.54,4,"AZ"],["Sierra Vista",-110.3,31.55,4,"AZ"],["Jonesboro",-90.7,35.84,4,"AR"],["Hot Springs",-93.06,34.5,4,"AR"],["Santa Barbara",-119.7,34.42,4,"CA"],["Salinas",-121.66,36.68,4,"CA"],["Palm Springs",-116.55,33.83,4,"CA"],["Eureka",-124.16,40.8,4,"CA"],["Santa Rosa",-122.72,38.44,4,"CA"],["Fort Collins",-105.08,40.59,4,"CO"],["Durango",-107.88,37.27,4,"CO"],["Aspen",-106.82,39.19,4,"CO"],["Gainesville",-82.32,29.65,4,"FL"],["Key West",-81.78,24.56,4,"FL"],["Pensacola",-87.22,30.42,4,"FL"],["Ocala",-82.14,29.19,4,"FL"],["Macon",-83.63,32.84,4,"GA"],["Valdosta",-83.28,30.83,4,"GA"],["Athens GA",-83.38,33.96,4,"GA"],["Pocatello",-112.45,42.87,4,"ID"],["Lewiston",-117.02,46.42,4,"ID"],["Sandpoint",-116.55,48.28,4,"ID"],["Moscow",-117.0,46.73,4,"ID"],["Champaign",-88.24,40.12,4,"IL"],["Carbondale",-89.22,37.73,4,"IL"],["Bloomington IN",-86.53,39.17,4,"IN"],["Terre Haute",-87.41,39.47,4,"IN"],["Iowa City",-91.53,41.66,4,"IA"],["Sioux City",-96.4,42.5,4,"IA"],["Dodge City",-100.02,37.75,4,"KS"],["Manhattan KS",-96.57,39.18,4,"KS"],["Paducah",-88.6,37.08,4,"KY"],["Owensboro",-87.11,37.77,4,"KY"],["Lake Charles",-93.22,30.23,4,"LA"],["Monroe",-92.12,32.51,4,"LA"],["Presque Isle",-68.02,46.68,4,"ME"],["Rockland",-69.11,44.1,4,"ME"],["Frederick",-77.41,39.41,4,"MD"],["Salisbury",-75.6,38.36,4,"MD"],["Pittsfield",-73.25,42.45,4,"MA"],["Hyannis",-70.28,41.65,4,"MA"],["Kalamazoo",-85.59,42.29,4,"MI"],["Flint",-83.69,43.01,4,"MI"],["Sault Ste. Marie",-84.35,46.5,4,"MI"],["Bemidji",-94.88,47.47,4,"MN"],["Mankato",-93.999,44.16,4,"MN"],["Hattiesburg",-89.29,31.33,4,"MS"],["Oxford MS",-89.52,34.37,4,"MS"],["Joplin",-94.51,37.08,4,"MO"],["Cape Girardeau",-89.52,37.31,4,"MO"],["Helena",-112.04,46.59,4,"MT"],["Kalispell",-114.31,48.2,4,"MT"],["Scottsbluff",-103.66,41.87,4,"NE"],["Kearney",-99.08,40.7,4,"NE"],["Ely",-114.89,39.25,4,"NV"],["Winnemucca",-117.74,40.97,4,"NV"],["Portsmouth",-70.76,43.07,4,"NH"],["Lebanon NH",-72.25,43.64,4,"NH"],["Cape May",-74.91,38.94,4,"NJ"],["Morristown",-74.48,40.8,4,"NJ"],["Farmington",-108.22,36.73,4,"NM"],["Taos",-105.57,36.41,4,"NM"],["Ithaca",-76.5,42.44,4,"NY"],["Watertown",-75.91,43.97,4,"NY"],["Plattsburgh",-73.45,44.7,4,"NY"],["Durham",-78.9,35.99,4,"NC"],["Boone",-81.67,36.22,4,"NC"],["Outer Banks",-75.67,35.55,4,"NC"],["Grand Forks",-97.03,47.93,4,"ND"],["Williston",-103.62,48.15,4,"ND"],["Akron",-81.52,41.08,4,"OH"],["Youngstown",-80.65,41.1,4,"OH"],["Athens OH",-82.1,39.33,4,"OH"],["Stillwater",-97.06,36.12,4,"OK"],["Enid",-97.88,36.4,4,"OK"],["Astoria",-123.83,46.19,4,"OR"],["Pendleton",-118.79,45.67,4,"OR"],["Klamath Falls",-121.78,42.22,4,"OR"],["Erie",-80.09,42.13,4,"PA"],["State College",-77.86,40.79,4,"PA"],["Williamsport",-77.0,41.24,4,"PA"],["Newport RI",-71.31,41.49,4,"RI"],["Myrtle Beach",-78.89,33.69,4,"SC"],["Florence SC",-79.76,34.2,4,"SC"],["Aberdeen",-98.49,45.46,4,"SD"],["Spearfish",-103.86,44.49,4,"SD"],["Jackson TN",-88.81,35.61,4,"TN"],["Johnson City",-82.35,36.31,4,"TN"],["Clarksville",-87.36,36.53,4,"TN"],["Waco",-97.15,31.55,4,"TX"],["Midland",-102.08,31.997,4,"TX"],["Tyler",-95.3,32.35,4,"TX"],["Galveston",-94.8,29.3,4,"TX"],["Abilene",-99.73,32.45,4,"TX"],["Moab",-109.55,38.57,4,"UT"],["Logan",-111.83,41.74,4,"UT"],["Rutland",-72.97,43.61,4,"VT"],["Brattleboro",-72.56,42.85,4,"VT"],["Charlottesville",-78.48,38.03,4,"VA"],["Harrisonburg",-78.87,38.45,4,"VA"],["Blacksburg",-80.41,37.23,4,"VA"],["Walla Walla",-118.34,46.06,4,"WA"],["Wenatchee",-120.31,47.42,4,"WA"],["Port Angeles",-123.43,48.12,4,"WA"],["Martinsburg",-77.96,39.46,4,"WV"],["Beckley",-81.19,37.78,4,"WV"],["La Crosse",-91.24,43.8,4,"WI"],["Wausau",-89.63,44.96,4,"WI"],["Superior",-92.1,46.72,4,"WI"],["Sheridan",-106.96,44.8,4,"WY"],["Rock Springs",-109.22,41.59,4,"WY"],["Laramie",-105.59,41.31,4,"WY"],["Auburn",-85.48,32.61,4,"AL"],["Decatur AL",-86.98,34.61,4,"AL"],["Florence AL",-87.68,34.8,4,"AL"],["Gadsden",-86.01,34.01,4,"AL"],["Anniston",-85.83,33.66,4,"AL"],["Selma",-87.02,32.41,4,"AL"],["Cullman",-86.84,34.18,4,"AL"],["Troy AL",-85.97,31.81,4,"AL"],["Conway",-92.44,35.09,4,"AR"],["Rogers",-94.13,36.33,4,"AR"],["Pine Bluff",-92.0,34.22,4,"AR"],["Russellville",-93.13,35.28,4,"AR"],["Texarkana",-94.05,33.44,4,"AR"],["Searcy",-91.74,35.25,4,"AR"],["Batesville",-91.64,35.77,4,"AR"],["El Dorado",-92.67,33.21,4,"AR"],["Tempe",-111.94,33.43,4,"AZ"],["Chandler",-111.84,33.31,4,"AZ"],["Glendale AZ",-112.19,33.54,4,"AZ"],["Page",-111.46,36.91,4,"AZ"],["Show Low",-110.03,34.25,4,"AZ"],["Safford",-109.71,32.83,4,"AZ"],["Payson",-111.33,34.23,4,"AZ"],["Boulder",-105.27,40.01,4,"CO"],["Greeley",-104.71,40.42,4,"CO"],["Alamosa",-105.87,37.47,4,"CO"],["Steamboat Springs",-106.83,40.48,4,"CO"],["Montrose",-107.88,38.48,4,"CO"],["Sterling CO",-103.21,40.63,4,"CO"],["Lamar",-102.62,38.09,4,"CO"],["Glenwood Springs",-107.32,39.55,4,"CO"],["Stamford",-73.54,41.05,4,"CT"],["Waterbury",-73.04,41.56,4,"CT"],["Norwalk",-73.41,41.12,4,"CT"],["Danbury",-73.45,41.39,4,"CT"],["New London",-72.1,41.36,4,"CT"],["Torrington",-73.12,41.8,4,"CT"],["Middletown CT",-72.65,41.56,4,"CT"],["Georgetown DE",-75.39,38.69,4,"DE"],["Newark DE",-75.75,39.68,4,"DE"],["Rehoboth Beach",-75.08,38.72,4,"DE"],["Milford DE",-75.43,38.91,4,"DE"],["Seaford",-75.61,38.65,4,"DE"],["Smyrna",-75.6,39.3,4,"DE"],["Lewes",-75.14,38.77,4,"DE"],["Middletown DE",-75.72,39.45,4,"DE"],["Albany GA",-84.16,31.58,4,"GA"],["Rome GA",-85.16,34.26,4,"GA"],["Brunswick",-81.49,31.15,4,"GA"],["Gainesville GA",-83.82,34.3,4,"GA"],["Dalton",-84.97,34.77,4,"GA"],["Waycross",-82.35,31.21,4,"GA"],["Council Bluffs",-95.86,41.26,4,"IA"],["Waterloo",-92.34,42.49,4,"IA"],["Ames",-93.62,42.03,4,"IA"],["Dubuque",-90.66,42.5,4,"IA"],["Mason City",-93.2,43.15,4,"IA"],["Ottumwa",-92.41,41.02,4,"IA"],["Fort Dodge",-94.17,42.5,4,"IA"],["Burlington IA",-91.11,40.81,4,"IA"],["Nampa",-116.56,43.54,4,"ID"],["Meridian",-116.4,43.61,4,"ID"],["Rexburg",-111.79,43.83,4,"ID"],["Salmon",-113.9,45.18,4,"ID"],["Grangeville",-116.12,45.93,4,"ID"],["Kellogg",-116.12,47.54,4,"ID"],["Bonners Ferry",-116.32,48.69,4,"ID"],["Hayden",-116.79,47.77,4,"ID"],["Post Falls",-116.95,47.72,4,"ID"],["Rathdrum",-116.9,47.81,4,"ID"],["Priest River",-116.91,48.18,4,"ID"],["Weiser",-116.97,44.25,4,"ID"],["Naperville",-88.15,41.79,4,"IL"],["Joliet",-88.08,41.53,4,"IL"],["Decatur IL",-88.95,39.84,4,"IL"],["Bloomington IL",-88.99,40.48,4,"IL"],["Quincy",-91.41,39.94,4,"IL"],["Moline",-90.52,41.51,4,"IL"],["Galena",-90.43,42.42,4,"IL"],["Alton",-90.18,38.89,4,"IL"],["Muncie",-85.39,40.19,4,"IN"],["Lafayette IN",-86.88,40.42,4,"IN"],["Gary",-87.35,41.59,4,"IN"],["Kokomo",-86.13,40.49,4,"IN"],["Columbus IN",-85.92,39.2,4,"IN"],["Richmond IN",-84.89,39.83,4,"IN"],["Jeffersonville",-85.74,38.28,4,"IN"],["Valparaiso",-87.06,41.47,4,"IN"],["Overland Park",-94.67,38.98,4,"KS"],["Lawrence",-95.24,38.97,4,"KS"],["Hays",-99.32,38.88,4,"KS"],["Garden City",-100.87,37.97,4,"KS"],["Emporia",-96.18,38.4,4,"KS"],["Hutchinson",-97.93,38.06,4,"KS"],["Pittsburg KS",-94.7,37.41,4,"KS"],["Liberal",-100.92,37.04,4,"KS"],["Frankfort",-84.87,38.2,4,"KY"],["Covington",-84.51,39.08,4,"KY"],["Somerset",-84.6,37.09,4,"KY"],["Elizabethtown",-85.86,37.69,4,"KY"],["Ashland KY",-82.64,38.48,4,"KY"],["Hopkinsville",-87.49,36.87,4,"KY"],["Murray",-88.32,36.61,4,"KY"],["Pikeville",-82.52,37.48,4,"KY"],["Alexandria LA",-92.45,31.31,4,"LA"],["Houma",-90.72,29.6,4,"LA"],["Ruston",-92.64,32.53,4,"LA"],["Natchitoches",-93.09,31.76,4,"LA"],["Slidell",-89.78,30.28,4,"LA"],["New Iberia",-91.82,30.0,4,"LA"],["Bogalusa",-89.85,30.79,4,"LA"],["Opelousas",-92.08,30.53,4,"LA"],["Lowell",-71.32,42.63,4,"MA"],["Cambridge",-71.11,42.37,4,"MA"],["New Bedford",-70.93,41.64,4,"MA"],["Fall River",-71.16,41.7,4,"MA"],["Salem MA",-70.9,42.52,4,"MA"],["Northampton",-72.63,42.32,4,"MA"],["Plymouth",-70.67,41.96,4,"MA"],["Rockville",-77.15,39.08,4,"MD"],["Columbia MD",-76.86,39.2,4,"MD"],["Cumberland",-78.76,39.65,4,"MD"],["Ocean City",-75.08,38.34,4,"MD"],["Bel Air",-76.35,39.54,4,"MD"],["Easton MD",-76.08,38.77,4,"MD"],["Westminster",-76.99,39.58,4,"MD"],["Laurel",-76.85,39.1,4,"MD"],["Lewiston ME",-70.2,44.1,4,"ME"],["Biddeford",-70.45,43.49,4,"ME"],["Waterville",-69.63,44.55,4,"ME"],["Ellsworth",-68.42,44.54,4,"ME"],["Brunswick ME",-69.97,43.92,4,"ME"],["Caribou",-68.01,46.86,4,"ME"],["Camden",-69.06,44.21,4,"ME"],["Ann Arbor",-83.74,42.28,4,"MI"],["Saginaw",-83.95,43.42,4,"MI"],["Muskegon",-86.25,43.23,4,"MI"],["Battle Creek",-85.18,42.32,4,"MI"],["Petoskey",-84.96,45.37,4,"MI"],["Escanaba",-87.06,45.75,4,"MI"],["Houghton",-88.57,47.12,4,"MI"],["Alpena",-83.43,45.06,4,"MI"],["Bloomington MN",-93.3,44.84,4,"MN"],["Moorhead",-96.77,46.87,4,"MN"],["Brainerd",-94.2,46.36,4,"MN"],["Winona",-91.64,44.05,4,"MN"],["Willmar",-95.04,45.12,4,"MN"],["Hibbing",-92.94,47.43,4,"MN"],["Alexandria MN",-95.38,45.89,4,"MN"],["Owatonna",-93.23,44.08,4,"MN"],["Meridian MS",-88.7,32.36,4,"MS"],["Biloxi",-88.89,30.4,4,"MS"],["Southaven",-90.01,34.99,4,"MS"],["Starkville",-88.82,33.45,4,"MS"],["Vicksburg",-90.88,32.35,4,"MS"],["Natchez",-91.4,31.56,4,"MS"],["Greenville MS",-91.06,33.41,4,"MS"],["Columbus MS",-88.43,33.5,4,"MS"],["Independence",-94.42,39.09,4,"MO"],["St. Joseph",-94.85,39.77,4,"MO"],["Jefferson City",-92.17,38.58,4,"MO"],["Branson",-93.22,36.64,4,"MO"],["Rolla",-91.77,37.95,4,"MO"],["Sedalia",-93.23,38.7,4,"MO"],["Kirksville",-92.58,40.19,4,"MO"],["Poplar Bluff",-90.39,36.76,4,"MO"],["Butte",-112.53,46.0,4,"MT"],["Havre",-109.68,48.55,4,"MT"],["Miles City",-105.84,46.41,4,"MT"],["Livingston",-110.56,45.66,4,"MT"],["Whitefish",-114.34,48.41,4,"MT"],["Dillon",-112.64,45.22,4,"MT"],["Glendive",-104.71,47.11,4,"MT"],["Lewistown",-109.44,47.06,4,"MT"],["Fayetteville NC",-78.88,35.05,4,"NC"],["Hickory",-81.34,35.73,4,"NC"],["Rocky Mount",-77.79,35.94,4,"NC"],["New Bern",-77.04,35.11,4,"NC"],["Jacksonville NC",-77.44,34.75,4,"NC"],["Salisbury NC",-80.47,35.67,4,"NC"],["Statesville",-80.89,35.78,4,"NC"],["Dickinson",-102.79,46.88,4,"ND"],["Jamestown",-98.71,46.91,4,"ND"],["Devils Lake",-98.86,48.11,4,"ND"],["Wahpeton",-96.61,46.27,4,"ND"],["Valley City",-98.0,46.92,4,"ND"],["Mandan",-100.89,46.83,4,"ND"],["Rugby",-99.99,48.37,4,"ND"],["Beulah",-101.78,47.26,4,"ND"],["Bellevue NE",-95.89,41.15,4,"NE"],["Norfolk NE",-97.42,42.03,4,"NE"],["Columbus NE",-97.36,41.43,4,"NE"],["Hastings",-98.39,40.59,4,"NE"],["McCook",-100.63,40.2,4,"NE"],["Alliance",-102.87,42.1,4,"NE"],["Valentine",-100.55,42.87,4,"NE"],["Fremont NE",-96.5,41.43,4,"NE"],["Nashua",-71.47,42.77,4,"NH"],["Keene",-72.28,42.93,4,"NH"],["Laconia",-71.47,43.53,4,"NH"],["Berlin NH",-71.19,44.47,4,"NH"],["Dover NH",-70.87,43.2,4,"NH"],["Claremont",-72.35,43.38,4,"NH"],["North Conway",-71.12,44.05,4,"NH"],["Jersey City",-74.08,40.73,4,"NJ"],["Paterson",-74.17,40.92,4,"NJ"],["Camden NJ",-75.12,39.93,4,"NJ"],["Toms River",-74.2,39.95,4,"NJ"],["Princeton",-74.66,40.35,4,"NJ"],["Asbury Park",-74.01,40.22,4,"NJ"],["Vineland",-75.03,39.49,4,"NJ"],["Henderson",-114.98,36.04,4,"NV"],["North Las Vegas",-115.12,36.2,4,"NV"],["Sparks",-119.75,39.53,4,"NV"],["Fernley",-119.25,39.61,4,"NV"],["Pahrump",-115.98,36.21,4,"NV"],["Mesquite NV",-114.07,36.8,4,"NV"],["Rio Rancho",-106.66,35.24,4,"NM"],["Gallup",-108.74,35.53,4,"NM"],["Carlsbad",-104.23,32.42,4,"NM"],["Clovis",-103.2,34.4,4,"NM"],["Silver City",-108.28,32.77,4,"NM"],["Alamogordo",-105.96,32.9,4,"NM"],["Los Alamos",-106.3,35.89,4,"NM"],["Ruidoso",-105.67,33.33,4,"NM"],["Yonkers",-73.87,40.93,4,"NY"],["Utica",-75.23,43.1,4,"NY"],["Binghamton",-75.91,42.1,4,"NY"],["Elmira",-76.81,42.09,4,"NY"],["Poughkeepsie",-73.92,41.7,4,"NY"],["Saratoga Springs",-73.79,43.08,4,"NY"],["Jamestown NY",-79.24,42.1,4,"NY"],["Lake Placid",-73.98,44.28,4,"NY"],["Canton",-81.38,40.8,4,"OH"],["Springfield OH",-83.81,39.92,4,"OH"],["Lima",-84.11,40.74,4,"OH"],["Mansfield",-82.52,40.76,4,"OH"],["Sandusky",-82.71,41.45,4,"OH"],["Zanesville",-82.01,39.94,4,"OH"],["Portsmouth OH",-82.998,38.73,4,"OH"],["Findlay",-83.65,41.04,4,"OH"],["Norman",-97.44,35.22,4,"OK"],["Broken Arrow",-95.79,36.06,4,"OK"],["Muskogee",-95.37,35.75,4,"OK"],["Ardmore",-97.14,34.17,4,"OK"],["Bartlesville",-95.98,36.75,4,"OK"],["Woodward",-99.39,36.43,4,"OK"],["Durant",-96.37,33.99,4,"OK"],["Guymon",-101.48,36.68,4,"OK"],["Corvallis",-123.26,44.56,4,"OR"],["Hood River",-121.52,45.71,4,"OR"],["Coos Bay",-124.22,43.37,4,"OR"],["Baker City",-117.83,44.77,4,"OR"],["La Grande",-118.09,45.32,4,"OR"],["Roseburg",-123.35,43.22,4,"OR"],["The Dalles",-121.18,45.6,4,"OR"],["Newport OR",-124.05,44.63,4,"OR"],["Lancaster",-76.3,40.04,4,"PA"],["York",-76.73,39.96,4,"PA"],["Reading",-75.93,40.34,4,"PA"],["Bethlehem",-75.38,40.63,4,"PA"],["Altoona",-78.4,40.52,4,"PA"],["Johnstown",-78.92,40.33,4,"PA"],["Gettysburg",-77.23,39.83,4,"PA"],["Pottsville",-76.2,40.69,4,"PA"],["Warwick",-71.42,41.7,4,"RI"],["Cranston",-71.44,41.78,4,"RI"],["Pawtucket",-71.38,41.88,4,"RI"],["Woonsocket",-71.51,42.0,4,"RI"],["Westerly",-71.83,41.38,4,"RI"],["Bristol RI",-71.27,41.68,4,"RI"],["Narragansett",-71.45,41.43,4,"RI"],["Block Island",-71.58,41.17,4,"RI"],["Rock Hill",-81.03,34.93,4,"SC"],["Spartanburg",-81.93,34.95,4,"SC"],["Anderson SC",-82.65,34.5,4,"SC"],["Sumter",-80.34,33.92,4,"SC"],["Hilton Head",-80.75,32.19,4,"SC"],["Aiken",-81.72,33.56,4,"SC"],["Beaufort SC",-80.67,32.43,4,"SC"],["Brookings",-96.79,44.31,4,"SD"],["Watertown SD",-97.12,44.9,4,"SD"],["Mitchell",-98.03,43.71,4,"SD"],["Yankton",-97.4,42.87,4,"SD"],["Huron",-98.21,44.36,4,"SD"],["Sturgis",-103.51,44.41,4,"SD"],["Vermillion",-96.93,42.78,4,"SD"],["Deadwood",-103.73,44.38,4,"SD"],["Murfreesboro",-86.39,35.85,4,"TN"],["Franklin TN",-86.87,35.93,4,"TN"],["Kingsport",-82.56,36.55,4,"TN"],["Cookeville",-85.51,36.16,4,"TN"],["Columbia TN",-87.04,35.62,4,"TN"],["Morristown TN",-83.29,36.21,4,"TN"],["Dyersburg",-89.39,36.03,4,"TN"],["Ogden",-111.97,41.22,4,"UT"],["Sandy",-111.89,40.57,4,"UT"],["Cedar City",-113.06,37.68,4,"UT"],["Vernal",-109.53,40.46,4,"UT"],["Price",-110.81,39.6,4,"UT"],["Park City",-111.5,40.65,4,"UT"],["Richfield",-112.08,38.77,4,"UT"],["Kanab",-112.53,37.05,4,"UT"],["Norfolk",-76.29,36.85,4,"VA"],["Chesapeake",-76.29,36.77,4,"VA"],["Lynchburg",-79.14,37.41,4,"VA"],["Danville VA",-79.4,36.59,4,"VA"],["Winchester VA",-78.16,39.19,4,"VA"],["Fredericksburg",-77.46,38.3,4,"VA"],["Staunton",-79.07,38.15,4,"VA"],["Abingdon",-81.98,36.71,4,"VA"],["Barre",-72.5,44.2,4,"VT"],["St. Albans",-73.08,44.81,4,"VT"],["Bennington",-73.2,42.88,4,"VT"],["Middlebury",-73.17,44.02,4,"VT"],["St. Johnsbury",-72.02,44.42,4,"VT"],["Stowe",-72.68,44.47,4,"VT"],["Manchester VT",-73.07,43.16,4,"VT"],["Everett",-122.2,47.98,4,"WA"],["Olympia",-122.9,47.04,4,"WA"],["Vancouver WA",-122.67,45.63,4,"WA"],["Pullman",-117.18,46.73,4,"WA"],["Moses Lake",-119.28,47.13,4,"WA"],["Ellensburg",-120.55,46.99,4,"WA"],["Aberdeen WA",-123.82,46.98,4,"WA"],["Kennewick",-119.14,46.21,4,"WA"],["Huntington",-82.45,38.42,4,"WV"],["Parkersburg",-81.56,39.27,4,"WV"],["Wheeling",-80.72,40.06,4,"WV"],["Clarksburg",-80.34,39.28,4,"WV"],["Fairmont",-80.14,39.48,4,"WV"],["Lewisburg WV",-80.45,37.8,4,"WV"],["Elkins",-79.85,38.93,4,"WV"],["Weirton",-80.59,40.42,4,"WV"],["Kenosha",-87.82,42.58,4,"WI"],["Racine",-87.79,42.73,4,"WI"],["Appleton",-88.42,44.26,4,"WI"],["Oshkosh",-88.54,44.02,4,"WI"],["Sheboygan",-87.71,43.75,4,"WI"],["Stevens Point",-89.57,44.52,4,"WI"],["Rhinelander",-89.41,45.64,4,"WI"],["Baraboo",-89.74,43.47,4,"WI"],["Gillette",-105.5,44.29,4,"WY"],["Cody",-109.06,44.53,4,"WY"],["Evanston WY",-110.96,41.27,4,"WY"],["Riverton",-108.39,43.02,4,"WY"],["Powell",-108.76,44.75,4,"WY"],["Torrington WY",-104.18,42.06,4,"WY"],["Douglas WY",-105.38,42.76,4,"WY"],["Buffalo WY",-106.7,44.35,4,"WY"],["Georgetown DC",-77.07,38.91,4,"DC"]],"roads":[["I-5",[[-122.75,48.99],[-122.49,48.75],[-122.2,47.98],[-122.33,47.61],[-122.44,47.25],[-122.9,47.04],[-122.67,45.63],[-122.68,45.52],[-123.04,44.94],[-123.09,44.05],[-123.35,43.22],[-122.87,42.33],[-122.39,40.59],[-121.49,38.58],[-121.29,37.96],[-120.85,37.06],[-120.36,36.14],[-119.3,35.3],[-118.55,34.6],[-118.24,34.05],[-117.87,33.75],[-117.16,32.72]]],["I-15",[[-111.96,48.99],[-111.3,47.51],[-112.04,46.59],[-112.53,46.0],[-112.34,44.5],[-112.03,43.49],[-112.45,42.87],[-111.97,41.22],[-111.89,40.76],[-111.66,40.23],[-113.06,37.68],[-113.58,37.1],[-115.14,36.17],[-117.02,34.9],[-117.29,34.11],[-117.16,32.72]]],["I-90",[[-122.33,47.61],[-120.55,46.99],[-119.28,47.13],[-117.43,47.66],[-116.78,47.68],[-116.12,47.54],[-115.92,47.47],[-113.99,46.87],[-112.53,46.0],[-111.04,45.68],[-108.5,45.78],[-106.96,44.8],[-105.5,44.29],[-103.23,44.08],[-96.7,43.55],[-93.37,43.65],[-89.4,43.07],[-87.63,41.88],[-83.56,41.65],[-81.69,41.5],[-80.09,42.13],[-78.88,42.89],[-76.15,43.05],[-73.76,42.65],[-71.06,42.36]]],["I-95",[[-67.84,46.13],[-68.78,44.8],[-70.26,43.66],[-70.76,43.07],[-71.06,42.36],[-71.41,41.82],[-72.93,41.31],[-74.01,40.71],[-75.17,39.95],[-76.61,39.29],[-77.04,38.91],[-77.44,37.54],[-77.4,37.23],[-78.88,35.05],[-79.76,34.2],[-81.1,32.08],[-81.66,30.33],[-81.02,29.21],[-80.35,27.45],[-80.05,26.71],[-80.19,25.76]]],["I-10",[[-118.49,34.02],[-118.24,34.05],[-116.55,33.83],[-114.6,33.61],[-112.07,33.45],[-110.97,32.22],[-106.78,32.31],[-106.49,31.76],[-104.83,31.04],[-102.88,30.89],[-100.55,29.9],[-98.49,29.42],[-95.37,29.76],[-94.13,30.08],[-93.22,30.23],[-91.19,30.45],[-90.07,29.95],[-89.09,30.37],[-88.04,30.69],[-87.22,30.42],[-84.28,30.44],[-82.64,30.19],[-81.66,30.33]]],["I-80",[[-122.42,37.77],[-121.49,38.58],[-119.81,39.53],[-117.74,40.97],[-115.76,40.83],[-111.89,40.76],[-109.22,41.59],[-105.59,41.31],[-104.82,41.14],[-100.77,41.12],[-96.68,40.81],[-95.94,41.26],[-93.61,41.59],[-90.58,41.52],[-87.63,41.88],[-86.25,41.68],[-83.56,41.65],[-81.69,41.5],[-80.65,41.1],[-79.38,41.21],[-75.19,40.99],[-74.05,40.87]]],["I-70",[[-112.58,38.6],[-110.16,38.99],[-108.55,39.06],[-106.38,39.64],[-104.99,39.74],[-97.61,38.84],[-95.69,39.05],[-94.58,39.1],[-92.33,38.95],[-90.2,38.63],[-87.41,39.47],[-86.16,39.77],[-84.19,39.76],[-82.99,39.96],[-80.72,40.06],[-77.41,39.41],[-76.61,39.29]]],["I-40",[[-117.02,34.9],[-114.61,34.85],[-114.05,35.19],[-111.65,35.2],[-106.65,35.08],[-101.83,35.22],[-97.52,35.47],[-94.4,35.39],[-92.29,34.75],[-90.05,35.15],[-86.78,36.16],[-83.92,35.96],[-82.55,35.6],[-79.79,36.07],[-78.64,35.78],[-77.94,34.23]]],["I-35",[[-92.1,46.79],[-93.27,44.98],[-93.37,43.65],[-93.61,41.59],[-94.58,39.1],[-97.34,37.69],[-97.52,35.47],[-97.33,32.76],[-96.8,32.78],[-97.15,31.55],[-97.74,30.27],[-98.49,29.42],[-99.51,27.51]]],["I-25",[[-106.7,44.35],[-106.31,42.85],[-104.82,41.14],[-104.99,39.74],[-104.82,38.83],[-104.61,38.25],[-104.44,36.9],[-105.94,35.69],[-106.65,35.08],[-106.89,34.06],[-106.78,32.31]]],["I-75",[[-84.35,46.5],[-84.71,44.66],[-83.89,43.59],[-83.69,43.01],[-83.05,42.33],[-83.56,41.65],[-84.19,39.76],[-84.51,39.1],[-84.5,38.05],[-83.92,35.96],[-85.31,35.05],[-84.39,33.75],[-83.63,32.84],[-83.28,30.83],[-82.14,29.19],[-82.46,27.95],[-81.87,26.64],[-80.19,25.76]]],["I-65",[[-87.35,41.59],[-86.16,39.77],[-85.76,38.25],[-86.44,36.99],[-86.78,36.16],[-86.8,33.52],[-86.3,32.37],[-88.04,30.69]]],["I-55",[[-87.63,41.88],[-88.99,40.48],[-89.65,39.8],[-90.2,38.63],[-89.52,37.31],[-90.05,35.15],[-90.18,32.3],[-90.48,30.07]]],["I-85",[[-77.4,37.23],[-78.9,35.99],[-79.79,36.07],[-80.84,35.23],[-82.39,34.85],[-84.39,33.75],[-86.3,32.37]]],["I-45",[[-96.8,32.78],[-95.55,30.72],[-95.37,29.76],[-94.8,29.3]]],["I-20",[[-103.49,31.42],[-102.08,32.0],[-99.73,32.45],[-97.33,32.76],[-96.8,32.78],[-93.75,32.53],[-90.18,32.3],[-86.8,33.52],[-84.39,33.75],[-81.97,33.47],[-81.03,34.0],[-79.76,34.2]]],["I-30",[[-97.33,32.76],[-96.8,32.78],[-94.05,33.44],[-92.29,34.75]]],["I-84",[[-122.68,45.52],[-118.79,45.67],[-116.2,43.62],[-114.46,42.56],[-111.97,41.22]]],["I-94",[[-108.5,45.78],[-105.84,46.41],[-100.78,46.81],[-96.79,46.88],[-93.27,44.98],[-91.5,44.81],[-89.4,43.07],[-87.91,43.04],[-87.63,41.88],[-85.59,42.29],[-83.05,42.33],[-82.42,42.97]]],["I-29",[[-94.58,39.1],[-95.94,41.26],[-96.7,43.55],[-96.79,46.88],[-97.03,47.93],[-97.24,48.95]]],["I-57",[[-87.63,41.88],[-88.24,40.12],[-89.22,37.73],[-89.52,37.31]]],["I-59",[[-90.48,30.07],[-89.29,31.33],[-88.7,34.26],[-86.8,33.52],[-85.31,35.05]]],["I-79",[[-80.0,40.44],[-79.96,39.63],[-81.63,38.35],[-80.65,41.1],[-80.09,42.13]]],["I-87",[[-74.01,40.71],[-73.76,42.65],[-73.45,44.7]]],["I-91",[[-72.68,41.76],[-72.59,42.1],[-72.56,42.85],[-72.58,44.26],[-71.6,45.0]]],["I-93",[[-71.06,42.36],[-71.46,42.99],[-71.54,43.21],[-71.68,44.1]]],["I-77",[[-81.03,34.0],[-80.84,35.23],[-80.85,37.13],[-81.63,38.35],[-80.65,41.1]]],["I-27",[[-101.83,35.22],[-101.86,33.58]]],["I-43",[[-87.63,41.88],[-87.91,43.04],[-88.02,44.51]]],["US-95",[[-116.19,48.99],[-116.32,48.69],[-116.55,48.28],[-116.71,47.95],[-116.78,47.68],[-116.91,47.4],[-116.89,47.34],[-117.0,46.73],[-117.02,46.42],[-116.12,45.93],[-116.32,45.42],[-116.28,44.97],[-116.44,44.73],[-116.97,44.25],[-116.92,44.01],[-116.94,43.79],[-116.81,43.55],[-117.05,42.98],[-117.72,41.99],[-117.74,40.97],[-118.78,39.47],[-118.63,38.52],[-117.23,38.07],[-116.76,36.91],[-115.14,36.17],[-114.6,34.9],[-114.55,33.6],[-114.62,32.69]]],["US-101",[[-123.43,48.12],[-123.82,46.98],[-123.83,46.19],[-123.84,45.46],[-124.02,44.63],[-124.18,43.37],[-124.2,41.76],[-124.1,40.8],[-123.21,39.15],[-122.72,38.44],[-122.42,37.77],[-121.89,37.34],[-121.66,36.68],[-120.66,35.28],[-119.9,34.45],[-118.24,34.05]]],["US-93",[[-114.79,48.95],[-114.31,48.2],[-113.99,46.87],[-113.9,45.18],[-114.46,42.56],[-114.96,41.11],[-114.89,39.25],[-115.14,36.17],[-114.05,35.19],[-112.73,33.97],[-112.07,33.45]]]],"stateBounds":{"AL":[-88.6,30.1,-84.8,35.1],"AZ":[-114.9,31.2,-108.9,37.1],"AR":[-94.7,32.9,-89.5,36.6],"CA":[-124.6,32.4,-114.0,42.1],"CO":[-109.2,36.9,-101.9,41.1],"CT":[-73.8,40.8,-71.7,42.2],"DE":[-75.9,38.3,-74.9,39.9],"DC":[-77.3,38.7,-76.8,39.1],"FL":[-87.7,24.4,-79.9,31.1],"GA":[-85.7,30.2,-80.7,35.1],"ID":[-117.3,41.9,-110.9,49.1],"IL":[-91.6,36.8,-87.4,42.6],"IN":[-88.2,37.7,-84.7,41.9],"IA":[-96.7,40.3,-90.0,43.6],"KS":[-102.2,36.9,-94.5,40.1],"KY":[-89.7,36.4,-81.8,39.2],"LA":[-94.1,28.8,-88.7,33.1],"ME":[-71.2,42.9,-66.8,47.6],"MD":[-79.6,37.8,-74.9,39.8],"MA":[-73.6,41.1,-69.8,43.0],"MI":[-90.5,41.6,-82.3,48.4],"MN":[-97.3,43.4,-89.4,49.5],"MS":[-91.8,30.0,-88.0,35.1],"MO":[-95.9,35.9,-89.0,40.7],"MT":[-116.2,44.3,-103.9,49.1],"NE":[-104.2,39.9,-95.2,43.1],"NV":[-120.1,34.9,-113.9,42.1],"NH":[-72.7,42.6,-70.6,45.4],"NJ":[-75.7,38.8,-73.8,41.5],"NM":[-109.2,31.2,-102.9,37.1],"NY":[-79.9,40.4,-71.7,45.1],"NC":[-84.4,33.7,-75.3,36.7],"ND":[-104.2,45.8,-96.4,49.1],"OH":[-85.0,38.3,-80.4,42.1],"OK":[-103.1,33.5,-94.3,37.1],"OR":[-124.7,41.9,-116.3,46.4],"PA":[-80.7,39.6,-74.6,42.4],"RI":[-72.0,41.0,-71.0,42.2],"SC":[-83.5,31.9,-78.4,35.3],"SD":[-104.2,42.4,-96.3,46.0],"TN":[-90.5,34.9,-81.5,36.8],"TX":[-106.8,25.7,-93.4,36.6],"UT":[-114.2,36.9,-108.9,42.1],"VT":[-73.6,42.6,-71.4,45.1],"VA":[-83.8,36.4,-75.1,39.6],"WA":[-124.9,45.4,-116.8,49.1],"WV":[-82.8,37.1,-77.6,40.8],"WI":[-93.0,42.4,-86.7,47.2],"WY":[-111.2,40.9,-103.9,45.1]},"states":{"WA":[[[-124.7,48.4],[-123.1,48.4],[-123.0,49.0],[-117.03,49.0],[-117.03,46.0],[-118.0,46.0],[-119.0,45.93],[-120.0,45.65],[-121.2,45.6],[-122.25,45.55],[-122.68,45.57],[-122.76,45.65],[-123.4,46.15],[-124.05,46.27],[-124.25,46.9],[-124.4,47.4]]],"OR":[[[-124.05,46.27],[-123.4,46.15],[-122.76,45.65],[-122.25,45.55],[-121.52,45.77],[-121.2,45.6],[-120.0,45.65],[-119.0,45.93],[-118.0,46.0],[-117.03,46.0],[-116.92,45.95],[-116.72,45.78],[-116.55,45.75],[-116.72,45.35],[-116.85,44.85],[-117.03,44.3],[-117.03,42.0],[-124.2,42.0],[-124.4,42.6],[-124.4,43.3],[-124.16,44.55],[-124.06,44.95],[-123.9,45.5]]],"CA":[[[-124.2,41.99],[-120.0,41.99],[-120.0,39.0],[-114.6,35.0],[-114.5,34.3],[-114.13,34.3],[-114.5,33.0],[-114.72,32.72],[-117.13,32.53],[-117.3,32.9],[-118.5,34.02],[-119.2,34.05],[-120.0,34.47],[-120.7,35.1],[-121.3,35.7],[-121.9,36.6],[-122.0,36.95],[-122.5,37.9],[-123.0,38.9],[-123.8,39.4],[-124.05,40.1],[-124.3,40.8]]],"ID":[[[-117.03,49.0],[-117.03,46.0],[-116.92,45.95],[-116.72,45.78],[-116.55,45.75],[-116.72,45.35],[-116.85,44.85],[-117.03,44.3],[-117.03,42.0],[-111.05,42.0],[-111.05,44.48],[-112.0,44.52],[-112.9,44.45],[-113.05,44.78],[-113.45,45.05],[-113.8,45.6],[-114.35,45.55],[-114.5,46.0],[-114.4,46.65],[-115.3,47.25],[-115.7,47.55],[-116.05,48.0],[-116.05,49.0]]],"NV":[[[-120.0,41.99],[-117.03,41.99],[-114.04,41.99],[-114.04,37.0],[-114.05,36.2],[-114.6,36.15],[-114.6,35.0],[-120.0,39.0]]],"UT":[[[-114.04,41.99],[-111.05,41.99],[-111.05,41.0],[-109.05,41.0],[-109.05,37.0],[-114.04,37.0]]],"AZ":[[[-114.72,32.72],[-114.5,33.0],[-114.13,34.3],[-114.5,34.3],[-114.6,35.0],[-114.6,36.15],[-114.05,36.2],[-114.04,37.0],[-109.05,37.0],[-109.05,31.33],[-111.0,31.33],[-113.3,32.0]]],"MT":[[[-116.05,49.0],[-104.05,49.0],[-104.05,45.0],[-111.05,45.0],[-111.05,44.48],[-112.0,44.52],[-112.9,44.45],[-113.05,44.78],[-113.45,45.05],[-113.8,45.6],[-114.35,45.55],[-114.5,46.0],[-114.4,46.65],[-115.3,47.25],[-115.7,47.55],[-116.05,48.0]]],"WY":[[[-111.05,45.0],[-104.05,45.0],[-104.05,41.0],[-111.05,41.0]]],"CO":[[[-109.05,41.0],[-102.05,41.0],[-102.05,37.0],[-109.05,37.0]]],"NM":[[[-109.05,37.0],[-103.0,37.0],[-103.0,32.0],[-106.6,32.0],[-106.6,31.9],[-108.2,31.78],[-108.2,31.33],[-109.05,31.33]]],"ND":[[[-104.05,49.0],[-97.2,49.0],[-96.85,47.6],[-96.55,46.02],[-104.05,45.94]]],"SD":[[[-104.05,45.94],[-96.55,46.02],[-96.45,45.3],[-96.45,43.5],[-97.2,42.82],[-96.92,42.84],[-96.6,42.7],[-104.05,43.0]]],"NE":[[[-104.05,43.0],[-98.0,43.0],[-96.45,43.5],[-96.6,42.72],[-96.52,42.49],[-95.87,41.28],[-95.8,40.6],[-95.3,40.0],[-102.05,40.0],[-102.05,41.0],[-104.05,41.0]]],"KS":[[[-102.05,40.0],[-94.6,40.0],[-94.6,37.0],[-102.05,37.0]]],"OK":[[[-103.0,37.0],[-94.6,37.0],[-94.45,35.4],[-94.43,33.64],[-96.5,33.9],[-98.1,34.1],[-99.2,34.4],[-100.0,34.56],[-100.0,36.5],[-103.0,36.5]]],"TX":[[[-103.0,36.5],[-100.0,36.5],[-100.0,34.56],[-99.2,34.4],[-98.1,34.1],[-96.5,33.9],[-94.43,33.64],[-94.04,33.02],[-93.85,31.0],[-93.85,29.68],[-94.0,29.7],[-94.7,29.3],[-95.3,28.9],[-96.4,28.4],[-97.4,27.3],[-97.15,25.95],[-97.4,25.9],[-99.1,26.4],[-99.55,27.4],[-99.6,27.7],[-100.0,28.5],[-100.7,29.1],[-101.4,29.8],[-102.4,29.8],[-103.0,29.0],[-104.0,29.3],[-105.0,30.7],[-106.2,31.45],[-106.55,31.78],[-106.64,31.92],[-103.0,32.0]]],"MN":[[[-97.2,49.0],[-95.15,49.0],[-94.6,48.75],[-92.3,48.2],[-91.0,48.1],[-89.6,48.0],[-91.5,46.75],[-92.29,46.66],[-92.9,45.6],[-92.7,44.5],[-91.6,44.09],[-91.7,43.5],[-96.45,43.5],[-96.45,45.3],[-96.8,46.02],[-96.84,47.6]]],"IA":[[[-96.45,43.5],[-91.2,43.5],[-90.6,42.5],[-90.1,41.8],[-91.1,40.6],[-95.3,40.0],[-95.8,40.6],[-95.87,41.28],[-96.52,42.49],[-96.6,42.72]]],"MO":[[[-95.3,40.0],[-91.1,40.6],[-90.7,38.9],[-90.12,38.85],[-89.85,38.0],[-89.5,37.9],[-89.1,37.0],[-89.7,36.5],[-94.6,36.5],[-94.6,40.0],[-94.85,39.71]]],"AR":[[[-94.6,36.5],[-89.7,36.5],[-90.2,35.0],[-91.1,34.0],[-91.2,33.0],[-94.04,33.02],[-94.43,33.64],[-94.45,35.4]]],"LA":[[[-94.04,33.02],[-91.2,33.0],[-91.1,31.0],[-89.7,31.0],[-89.6,30.2],[-89.2,29.0],[-90.2,29.1],[-91.5,29.3],[-92.1,29.6],[-93.3,29.8],[-93.85,29.68],[-93.85,31.0]]],"WI":[[[-92.1,46.75],[-90.4,46.6],[-88.1,45.72],[-87.7,45.1],[-87.0,44.6],[-87.8,44.0],[-87.65,43.76],[-87.7,43.4],[-87.75,42.85],[-87.75,42.5],[-90.6,42.5],[-91.2,43.5],[-92.7,44.5],[-92.9,45.6]]],"IL":[[[-90.6,42.5],[-87.8,42.5],[-87.53,41.76],[-87.53,39.0],[-87.65,38.9],[-87.9,38.3],[-88.03,37.8],[-89.1,37.0],[-89.5,37.9],[-89.85,38.0],[-90.12,38.85],[-90.7,38.9],[-91.46,39.91],[-91.51,40.6],[-90.6,41.8]]],"IN":[[[-87.53,41.76],[-84.8,41.76],[-84.8,39.1],[-85.2,38.73],[-85.7,38.32],[-85.72,38.22],[-86.5,38.0],[-87.0,37.9],[-87.6,37.9],[-88.03,37.8],[-87.9,38.3],[-87.65,38.9],[-87.53,39.0]]],"MI":[[[-84.75,45.8],[-85.0,45.62],[-85.6,45.2],[-86.2,44.8],[-86.5,44.0],[-86.42,43.4],[-86.35,42.9],[-86.22,42.4],[-86.8,41.76],[-84.8,41.76],[-83.45,41.72],[-83.15,42.0],[-82.6,42.05],[-82.4,43.02],[-82.1,43.6],[-82.3,44.5],[-82.95,45.2],[-83.45,45.6],[-84.05,45.95]],[[-90.4,46.6],[-89.3,46.6],[-88.9,46.85],[-88.5,47.28],[-88.1,47.46],[-87.85,47.38],[-88.2,47.0],[-87.6,46.86],[-86.6,46.68],[-85.4,46.72],[-84.6,46.6],[-84.25,46.55],[-84.1,46.2],[-84.05,45.95],[-84.75,45.87],[-85.5,45.95],[-86.3,45.95],[-87.05,45.75],[-87.65,45.1],[-88.1,45.72]]],"OH":[[[-84.8,41.76],[-83.4,41.7],[-82.4,41.7],[-81.0,42.1],[-80.5,42.0],[-80.5,40.6],[-80.6,39.9],[-81.7,39.1],[-82.6,38.4],[-83.0,38.7],[-84.8,39.1]]],"KY":[[[-89.1,37.0],[-88.03,37.8],[-87.6,37.9],[-87.0,37.9],[-86.5,38.0],[-85.9,38.35],[-85.4,38.55],[-84.82,39.12],[-84.3,39.12],[-83.7,38.9],[-83.0,38.7],[-82.58,38.55],[-82.0,37.5],[-83.7,36.6],[-88.35,36.5],[-89.5,36.5]]],"TN":[[[-90.3,35.0],[-84.3,35.0],[-83.7,35.25],[-82.5,35.8],[-81.7,36.6],[-83.7,36.6],[-88.05,36.68],[-89.5,36.5],[-89.7,36.0]]],"MS":[[[-88.4,30.4],[-88.4,34.99],[-90.3,35.0],[-91.1,34.0],[-91.2,33.0],[-91.46,31.57],[-91.45,31.0],[-89.7,31.0],[-89.6,30.2],[-88.9,30.4]]],"AL":[[[-88.4,34.99],[-85.6,34.99],[-85.4,33.9],[-85.1,32.0],[-85.0,31.0],[-87.63,31.0],[-87.63,30.24],[-88.0,30.4],[-88.4,30.4]]],"GA":[[[-85.6,34.99],[-83.1,35.0],[-83.0,34.5],[-81.95,33.68],[-81.72,33.3],[-80.85,32.05],[-81.5,30.72],[-84.9,30.7],[-85.0,31.0],[-85.1,32.0],[-85.4,33.9]]],"FL":[[[-87.63,31.0],[-85.0,31.0],[-84.9,30.7],[-82.2,30.37],[-81.5,30.72],[-81.3,30.4],[-81.0,29.2],[-80.6,28.4],[-80.35,27.8],[-80.03,26.7],[-80.08,25.75],[-80.4,25.05],[-81.4,24.72],[-81.95,24.42],[-81.15,25.12],[-81.2,25.8],[-81.8,26.4],[-82.4,27.0],[-82.6,27.8],[-82.7,28.5],[-82.9,29.1],[-83.6,29.9],[-84.3,30.1],[-84.9,29.7],[-85.5,29.9],[-86.5,30.4],[-87.6,30.25],[-87.63,30.24]]],"SC":[[[-83.1,35.0],[-81.0,35.0],[-79.7,34.8],[-78.5,33.9],[-79.2,33.3],[-79.9,32.8],[-80.85,32.05],[-81.72,33.3],[-81.95,33.68],[-83.0,34.5]]],"NC":[[[-84.3,35.0],[-83.7,35.25],[-82.5,35.8],[-81.7,36.6],[-79.5,36.55],[-75.9,36.55],[-76.0,36.3],[-75.5,35.8],[-75.7,35.2],[-76.5,34.6],[-77.9,34.2],[-78.5,33.9],[-79.7,34.8],[-81.0,35.0],[-83.1,35.0]]],"VA":[[[-83.7,36.6],[-81.7,36.6],[-79.5,36.55],[-75.9,36.55],[-76.0,37.0],[-76.3,37.5],[-76.0,37.9],[-75.6,37.95],[-77.0,38.5],[-77.24,39.02],[-77.73,39.32],[-78.19,39.24],[-79.5,38.45],[-80.3,37.42],[-81.2,37.24],[-82.0,37.5]]],"WV":[[[-82.65,38.15],[-82.0,37.5],[-81.2,37.24],[-80.3,37.42],[-79.5,38.45],[-77.73,39.32],[-77.9,39.62],[-78.4,39.6],[-79.0,39.42],[-79.48,39.2],[-79.48,39.72],[-80.52,39.72],[-80.53,40.43],[-80.7,40.5],[-80.63,40.1],[-80.77,40.09],[-81.59,39.32],[-81.75,39.1],[-80.6,39.9],[-81.0,39.55],[-81.7,39.1],[-82.6,38.4]]],"PA":[[[-80.52,42.27],[-79.76,42.27],[-79.76,42.0],[-75.36,42.0],[-74.69,41.36],[-75.13,40.55],[-75.06,40.25],[-75.13,39.87],[-75.8,39.72],[-80.52,39.72],[-80.52,42.0]]],"NY":[[[-79.76,42.0],[-75.36,42.0],[-74.69,41.36],[-73.91,41.0],[-74.06,40.63],[-73.5,40.85],[-72.3,40.95],[-71.95,41.07],[-72.4,41.15],[-73.5,41.0],[-73.5,42.0],[-73.35,42.75],[-73.3,45.0],[-74.7,45.0],[-76.8,44.1],[-78.7,43.6],[-79.2,43.3],[-79.1,42.9]]],"NJ":[[[-74.69,41.36],[-73.91,41.0],[-74.06,40.63],[-73.98,40.15],[-74.35,39.35],[-74.99,38.88],[-75.2,39.85],[-75.06,40.25],[-75.13,40.55]]],"MD":[[[-79.48,39.72],[-75.8,39.72],[-75.7,38.45],[-75.07,38.4],[-75.03,38.3],[-76.0,37.95],[-76.3,38.3],[-77.0,38.5],[-77.24,39.02],[-77.73,39.32],[-77.9,39.62],[-78.4,39.6],[-79.0,39.42],[-79.48,39.2]]],"DE":[[[-75.8,39.72],[-75.5,39.85],[-75.05,38.8],[-75.05,38.45],[-75.7,38.45]]],"CT":[[[-73.5,42.05],[-71.8,42.02],[-71.8,41.4],[-72.9,41.25],[-73.7,40.95],[-73.5,41.2]]],"RI":[[[-71.8,42.02],[-71.38,42.02],[-71.12,41.42],[-71.57,41.11],[-71.9,41.3],[-71.87,41.42],[-71.8,41.4]]],"MA":[[[-73.5,42.75],[-71.3,42.7],[-70.85,42.87],[-70.55,42.05],[-70.3,41.95],[-69.9,41.78],[-69.93,41.6],[-70.7,41.55],[-71.13,41.65],[-71.38,42.02],[-71.8,42.02],[-73.5,42.05]]],"VT":[[[-73.35,45.0],[-71.5,45.01],[-71.98,44.37],[-72.5,44.3],[-72.4,43.6],[-72.55,42.73],[-73.3,42.75]]],"NH":[[[-71.5,45.01],[-71.08,45.3],[-70.7,43.6],[-70.7,43.08],[-70.82,42.87],[-71.3,42.7],[-72.55,42.73],[-72.4,43.6],[-72.5,44.3]]],"ME":[[[-71.08,45.3],[-70.3,46.2],[-69.4,47.44],[-69.0,47.44],[-67.78,47.07],[-67.75,46.4],[-67.8,45.7],[-67.0,45.2],[-67.3,44.7],[-68.2,44.4],[-69.0,44.0],[-70.0,43.7],[-70.7,43.12],[-70.7,43.6]]],"DC":[[[-77.12,38.93],[-76.91,38.89],[-77.04,38.79]]]},"stateLabels":{"WA":[-121.69,47.27],"OR":[-119.07,43.98],"CA":[-118.85,35.91],"ID":[-115.11,43.75],"NV":[-116.59,39.49],"UT":[-111.9,39.14],"AZ":[-111.68,34.16],"MT":[-112.19,46.89],"WY":[-109.05,43.0],"CO":[-107.05,39.0],"NM":[-106.46,34.57],"ND":[-102.44,47.47],"SD":[-98.08,44.36],"NE":[-100.61,41.5],"KS":[-100.45,38.5],"OK":[-96.27,35.44],"TX":[-98.42,31.2],"MN":[-94.76,46.64],"IA":[-94.28,41.88],"MO":[-92.64,38.4],"AR":[-92.67,34.75],"LA":[-92.48,31.15],"WI":[-89.53,44.32],"IL":[-89.38,40.54],"IN":[-86.18,39.78],"MI":[-84.28,43.68],"OH":[-83.26,40.25],"KY":[-84.41,37.81],"TN":[-87.84,35.84],"MS":[-89.82,32.43],"AL":[-86.82,32.62],"GA":[-83.39,32.54],"FL":[-81.39,27.48],"SC":[-80.64,33.74],"NC":[-78.33,35.35],"VA":[-78.2,37.84],"WV":[-80.89,38.4],"PA":[-79.27,40.9],"NY":[-74.74,43.44],"NJ":[-74.56,40.39],"MD":[-76.46,39.02],"DE":[-75.4,38.8],"CT":[-73.09,41.62],"RI":[-71.51,41.53],"MA":[-71.06,42.26],"VT":[-72.89,44.52],"NH":[-71.56,43.63],"ME":[-69.19,45.43],"DC":[-77.03,38.87]}};

/* ============================================================================
   SECTION 15b: REAL MAP
   A standard slippy map over OpenStreetMap's raster tiles: genuine state lines,
   city names and roads, with no satellite or topographic layers. Tiles load only
   for the visible area, so panning costs a handful of small images rather than a
   whole basemap. The projection maths below are pure and unit-tested.
============================================================================ */
const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 16;
const US_CENTER = { lat: 39.5, lng: -98.35 };

function lngToWorldX(lng, z) {
  return ((lng + 180) / 360) * Math.pow(2, z) * TILE_SIZE;
}
function latToWorldY(lat, z) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z) * TILE_SIZE;
}
function worldXToLng(x, z) {
  return (x / (Math.pow(2, z) * TILE_SIZE)) * 360 - 180;
}
function worldYToLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / (Math.pow(2, z) * TILE_SIZE);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
function computeTiles(centerLat, centerLng, z, width, height) {
  const originX = lngToWorldX(centerLng, z) - width / 2;
  const originY = latToWorldY(centerLat, z) - height / 2;
  const n = Math.pow(2, z);
  const tiles = [];
  const minTX = Math.floor(originX / TILE_SIZE);
  const maxTX = Math.floor((originX + width) / TILE_SIZE);
  const minTY = Math.max(0, Math.floor(originY / TILE_SIZE));
  const maxTY = Math.min(n - 1, Math.floor((originY + height) / TILE_SIZE));
  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      const wrapped = ((tx % n) + n) % n;
      tiles.push({
        key: `${z}-${tx}-${ty}`,
        x: wrapped,
        y: ty,
        z,
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
      });
    }
  }
  return { tiles, originX, originY };
}

/* Circular shop photo. Falls back to a typographic monogram rather than an
   emoji, so a missing image still reads as a considered mark. */
/* Shown beneath the map when a pin is tapped: enough to judge a vendor without
   navigating away, with Visit and Message as explicit next steps. */
function MapShopPanel({ entry, onOpenShop, onClose }) {
  const { products, navigate, me } = useApp();
  const { shop, dist } = entry;
  const { avgRating, count } = useReviews("shop", shop.id);
  const shopProducts = products.filter((pr) => pr.shopId === shop.id);
  const priceRange = useMemo(() => {
    if (!shopProducts.length) return null;
    const prices = shopProducts.map((pr) => pr.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [shopProducts]);
  const categories = [...new Set(shopProducts.map((pr) => pr.category))].slice(0, 4);

  return (
    <div className="bg-white border border-stone-200 rounded-xl cs-card shadow-xl overflow-hidden">
      <div className="flex gap-3 p-3">
        <span className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-stone-100">
          <ShopThumb shop={shop} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-stone-900 truncate flex items-center gap-1.5" style={displayFont}>
                {shop.name}
                {shop.verified && <BadgeCheck size={15} className="text-emerald-700 shrink-0" />}
              </p>
              <p className="cs-t11 text-stone-500 mt-0.5">
                {shop.city}, {shop.state}
                {dist != null ? ` · ${formatDistance(dist)} away` : ""}
              </p>
            </div>
            <button onClick={onClose} className="text-stone-400 shrink-0" aria-label="Close vendor details"><X size={16} /></button>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <StarRating value={avgRating} size="sm" />
                <span className="cs-t11 text-stone-500">({count})</span>
              </span>
            ) : (
              <span className="cs-t11 text-stone-400">No reviews yet</span>
            )}
            <span className={`cs-t10 font-bold px-2 py-0.5 rounded-full ${shop.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
              {shop.status === "open" ? "Actively selling" : "Closed for now"}
            </span>
          </div>
        </div>
      </div>

      <p className="px-3 text-sm text-stone-600 line-clamp-2">{shop.bio}</p>

      <div className="flex items-center gap-1.5 flex-wrap px-3 mt-2">
        {categories.map((c) => (
          <span key={c} className="cs-t10 font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
            <span className="inline-flex items-center gap-1"><CategoryMark id={c} size={11} /> {catInfo(c).label}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 mt-2 border-t border-stone-100">
        <span className="cs-t11 text-stone-500">
          {shopProducts.length} listing{shopProducts.length === 1 ? "" : "s"}
          {priceRange ? ` · ${formatPrice(priceRange.min)}–${formatPrice(priceRange.max)}` : ""}
        </span>
        <span className="flex gap-2">
          {me && shop.ownerId !== me.id && (
            <button
              onClick={() => navigate({ screen: "messages", withUserId: shop.ownerId, withUserName: shop.name, withUserAvatar: shop.emoji })}
              className="border border-stone-200 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Message
            </button>
          )}
          <button onClick={() => onOpenShop(shop)} className="bg-emerald-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg">
            Visit shop
          </button>
        </span>
      </div>
    </div>
  );
}

/* Circular shop photo. Falls back to a typographic monogram rather than an
   emoji, so a missing image still reads as a considered mark. */
/* A vendor's own cover photo, layered over the drawn scene. */
function ShopCoverPhoto({ shop }) {
  const url = usePhotoUrl(shop.coverPhotoId);
  if (!url) return null;
  return <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />;
}

function ShopThumb({ shop, className = "" }) {
  const [failed, setFailed] = useState(false);
  const uploaded = usePhotoUrl(shop.coverPhotoId);
  if (uploaded) {
    return <img src={uploaded} alt="" className={`w-full h-full object-cover ${className}`} />;
  }
  const initials = (shop.name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  if (!shop.banner || failed) {
    return (
      <span className={`w-full h-full flex items-center justify-center bg-emerald-800 text-white font-semibold ${className}`} style={{ fontSize: "13px", letterSpacing: "0.03em" }}>
        {initials}
      </span>
    );
  }
  return (
    <img
      src={shop.banner}
      alt=""
      loading="eager"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}

function VendorMap({ shops, userLoc, onOpenShop }) {
  const [center, setCenter] = useState(userLoc ? { lat: userLoc.lat, lng: userLoc.lng } : US_CENTER);
  const [zoom, setZoom] = useState(userLoc ? 6 : 4);
  const [size, setSize] = useState({ width: 320, height: 420 });
  const [selected, setSelected] = useState(null);
  const wrapRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { originX, originY } = useMemo(
    () => computeTiles(center.lat, center.lng, zoom, size.width, size.height),
    [center.lat, center.lng, zoom, size.width, size.height]
  );

  const project = useCallback(
    (lng, lat) => [lngToWorldX(lng, zoom) - originX, latToWorldY(lat, zoom) - originY],
    [zoom, originX, originY]
  );
  const toPath = useCallback(
    (points, close) => {
      let d = "";
      points.forEach((pt, i) => {
        const [x, y] = project(pt[0], pt[1]);
        d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      return close ? `${d}Z` : d;
    },
    [project]
  );
  const outlinePath = useMemo(() => toPath(US_GEO.outline, true), [toPath]);
  const lakePaths = useMemo(() => Object.values(US_GEO.lakes).map((l) => toPath(l, true)), [toPath]);
  const statePaths = useMemo(() => Object.values(US_GEO.states).flat().map((ring) => toPath(ring, true)), [toPath]);

  const stateLabels = useMemo(() => {
    if (zoom < 4 || zoom > 7) return [];
    return Object.entries(US_GEO.stateLabels || {}).map(([code, [lng, lat]]) => ({
      code,
      x: project(lng, lat).x,
      y: project(lng, lat).y,
    }));
  }, [zoom, project]);

  // Every border segment collected once, so a line shared by two states is
  // stroked a single time instead of twice.
  const borderPath = useMemo(() => {
    const seen = new Set();
    const segs = [];
    Object.values(US_GEO.states).flat().forEach((poly) => {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const key = [a, b].map((p) => `${p[0]},${p[1]}`).sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        segs.push([a, b]);
      }
    });
    return segs.map(([a, b]) => toPath([a, b], false)).join(" ");
  }, [toPath]);

  // Broad relief washes: greens over the forested east and northwest, browns
  // through the Rockies and the arid southwest.
  const reliefPaths = useMemo(() => {
    const band = (pts, fill, opacity) => ({ d: toPath(pts, true), fill, opacity });
    return [
      band([[-124.5, 49], [-116.5, 49], [-116.5, 41], [-124.5, 41]], "#8fa87a", 0.35),
      band([[-115, 49], [-104, 49], [-104, 31.5], [-115, 31.5]], "#b9a27c", 0.45),
      band([[-114.5, 37], [-103, 37], [-103, 31.3], [-114.5, 31.3]], "#c8ab7f", 0.5),
      band([[-92, 47], [-67, 47], [-67, 33], [-92, 33]], "#93ab79", 0.32),
      band([[-88, 40], [-75, 40], [-79, 34], [-85, 35]], "#7e9b6b", 0.3),
    ];
  }, [toPath]);

  // Interstates appear once you are close enough for them to mean something.
  const roadPaths = useMemo(() => {
    if (zoom < 5) return [];
    return US_GEO.roads.map(([name, pts]) => {
      const projected = pts.map((pt) => project(pt[0], pt[1]));
      // Anchor the label to the middle of the on-screen run, not the middle of
      // the whole route, or long interstates get labelled off-screen.
      const visible = projected.filter(([x, y]) => x > 10 && y > 10 && x < size.width - 10 && y < size.height - 10);
      const anchor = visible.length ? visible[Math.floor(visible.length / 2)] : null;
      return { name, d: toPath(pts, false), anchor };
    });
  }, [toPath, project, zoom, size.width, size.height]);

  const cityMarks = useMemo(() => {
    // Only the ten largest at national zoom; the rest appear as a single state
    // starts to fill the viewport.
    const maxRank = zoom <= 4 ? 1 : zoom <= 5 ? 2 : zoom <= 6 ? 3 : 4;
    return US_GEO.cities
      .filter((c) => c[3] <= maxRank)
      .map((c) => {
        const [x, y] = project(c[1], c[2]);
        return { name: c[0], x, y };
      })
      .filter((c) => c.x > -40 && c.y > -20 && c.x < size.width + 40 && c.y < size.height + 20);
  }, [project, zoom, size.width, size.height]);

  const pins = useMemo(
    () =>
      shops.map((shop) => ({
        shop,
        left: lngToWorldX(shop.lng, zoom) - originX,
        top: latToWorldY(shop.lat, zoom) - originY,
        dist: userLoc ? haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) : null,
      })),
    [shops, zoom, originX, originY, userLoc]
  );
  const mePin = userLoc
    ? { left: lngToWorldX(userLoc.lng, zoom) - originX, top: latToWorldY(userLoc.lat, zoom) - originY }
    : null;

  // Re-derived from `pins` every render (not captured once at click time) so
  // the popup tracks the pin's on-screen spot as the map is panned or zoomed,
  // instead of drifting away from the icon it belongs to.
  const selectedPin = selected ? pins.find((p) => p.shop.id === selected.shop.id) : null;
  const POPUP_WIDTH = 320;
  const POPUP_GAP = 10;
  const popupLeft = selectedPin ? clamp(selectedPin.left, POPUP_WIDTH / 2 + 8, Math.max(POPUP_WIDTH / 2 + 8, size.width - POPUP_WIDTH / 2 - 8)) : 0;

  const beginPan = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      /* pan still works via mouse events */
    }
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const pan = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    setCenter((c) => {
      const nx = lngToWorldX(c.lng, zoom) - dx;
      const ny = latToWorldY(c.lat, zoom) - dy;
      return { lat: worldYToLat(ny, zoom), lng: worldXToLng(nx, zoom) };
    });
  };
  const endPan = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* capture may already be released */
    }
    dragRef.current = null;
  };

  const zoomBy = (delta) => setZoom((z) => clamp(z + delta, MIN_ZOOM, MAX_ZOOM));

  return (
    <div>
      <div className="relative">
      <div
        ref={wrapRef}
        onPointerDown={beginPan}
        onPointerMove={pan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        className="relative w-full cs-map rounded-2xl overflow-hidden border border-stone-200 cs-touch-none select-none cursor-grab active:cursor-grabbing"
      >
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size.width}
          height={size.height}
          style={{ background: "#dfe7ec" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="cs-land" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%" stopColor="#dfe3c8" />
              <stop offset="45%" stopColor="#cdd8b4" />
              <stop offset="100%" stopColor="#bcae90" />
            </linearGradient>
            <clipPath id="cs-usclip">
              <path d={outlinePath} />
            </clipPath>
          </defs>
          <path d={outlinePath} fill="url(#cs-land)" stroke="#7d8a6a" strokeWidth="1.2" strokeLinejoin="round" />
          {/* Relief washes are clipped to the landmass so they never bleed into the sea. */}
          <g clipPath="url(#cs-usclip)">
            {reliefPaths.map((r, i) => (
              <path key={i} d={r.d} fill={r.fill} opacity={r.opacity} />
            ))}
          </g>
          {/* Closed state shapes: each is its own outline, so borders read as
              real state geometry rather than loose line fragments. */}
          <g clipPath="url(#cs-usclip)">
            {statePaths.map((d, i) => (
              <path key={i} d={d} fill="rgba(255,255,255,0.10)" stroke="none" />
            ))}
            {lakePaths.map((d, i) => (
              <path key={`lk${i}`} d={d} fill="#c9dcea" stroke="#8fb2c9" strokeWidth="0.5" />
            ))}
            <path
              d={borderPath}
              fill="none"
              stroke="#1c1917"
              strokeWidth={zoom >= 6 ? 1.0 : 0.7}
              strokeOpacity="0.85"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {stateLabels.map((s) => (
              <text
                key={s.code}
                x={s.x}
                y={s.y}
                textAnchor="middle"
                fontSize={zoom >= 6 ? 11 : 9}
                fontWeight="700"
                fill="#6b7264"
                fillOpacity="0.75"
                style={{ letterSpacing: "0.06em", pointerEvents: "none" }}
              >
                {s.code}
              </text>
            ))}
          </g>
          <path d={outlinePath} fill="none" stroke="#0c0a09" strokeWidth="1.8" strokeLinejoin="round" />
          {roadPaths.length > 0 && (
            <g clipPath="url(#cs-usclip)">
              {roadPaths.map((r) => (
                <path key={r.name} d={r.d} fill="none" stroke="#c98b53" strokeWidth={zoom >= 7 ? 2.2 : 1.5} strokeOpacity="0.75" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </g>
          )}
          {zoom >= 5 &&
            roadPaths.map((r) =>
              r.anchor ? (
                <text
                  key={`lbl-${r.name}`}
                  x={r.anchor[0]}
                  y={r.anchor[1] - 4}
                  fontSize="8"
                  fontWeight="700"
                  fill="#9a5f2a"
                  textAnchor="middle"
                  style={{ paintOrder: "stroke", stroke: "#f6f0e4", strokeWidth: 3 }}
                >
                  {r.name}
                </text>
              ) : null
            )}
          {cityMarks.map((c) => (
            <g key={c.name}>
              <circle cx={c.x} cy={c.y} r={zoom >= 6 ? 2.5 : 1.8} fill="#5f6b52" />
              <text x={c.x + 4} y={c.y + 3} fontSize={zoom >= 7 ? 9 : zoom >= 6 ? 10 : 9.5} fill="#4a5340" style={{ paintOrder: "stroke", stroke: "#f2f4ea", strokeWidth: 2.5 }}>
                {c.name}
              </text>
            </g>
          ))}
        </svg>
        {mePin && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: mePin.left, top: mePin.top }}
          >
            <span className="block w-4 h-4 rounded-full bg-sky-600 border-2 border-white shadow-md" />
          </div>
        )}

        {pins.map(({ shop, left, top, dist }) => {
          if (left < -60 || top < -60 || left > size.width + 60 || top > size.height + 60) return null;
          return (
            <button
              key={shop.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setSelected({ shop, dist })}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left, top }}
              aria-label={shop.name}
            >
              <span className="flex flex-col items-center">
                <span
                  className={`block w-10 h-10 rounded-full overflow-hidden bg-white shadow-lg ${selected?.shop.id === shop.id ? "ring-4 ring-emerald-600" : ""}`}
                  style={{ border: `2px solid ${shop.status === "open" ? "#047857" : "#a8a29e"}` }}
                >
                  <ShopThumb shop={shop} />
                </span>
                <span className="cs-pin-tail" style={{ color: shop.status === "open" ? "#047857" : "#a8a29e" }} />
              </span>
            </button>
          );
        })}

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={() => zoomBy(1)}
            disabled={zoom >= MAX_ZOOM}
            className="w-12 h-12 rounded-xl bg-white shadow-lg border border-stone-200 flex items-center justify-center text-2xl font-bold text-stone-700 disabled:opacity-40 active:bg-stone-100"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => zoomBy(-1)}
            disabled={zoom <= MIN_ZOOM}
            className="w-12 h-12 rounded-xl bg-white shadow-lg border border-stone-200 flex items-center justify-center text-2xl font-bold text-stone-700 disabled:opacity-40 active:bg-stone-100"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        <div className="absolute bottom-3 left-3 flex gap-2">
          {userLoc && (
            <button
              onClick={() => {
                setCenter({ lat: userLoc.lat, lng: userLoc.lng });
                setZoom(9);
              }}
              className="bg-white/95 shadow-lg border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 flex items-center gap-1.5"
            >
              <MapPin size={13} className="text-sky-600" /> My area
            </button>
          )}
          <button
            onClick={() => {
              setCenter(US_CENTER);
              setZoom(4);
            }}
            className="bg-white/95 shadow-lg border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700"
          >
            Whole US
          </button>
        </div>

        <div className="absolute bottom-1 right-1 bg-white/80 px-1.5 py-0.5 rounded cs-t9 text-stone-600">
          Vector basemap · state borders from published boundaries
        </div>

      </div>

      {/* Floats over the map itself, anchored just under the pin that was
          clicked, instead of appearing in normal flow below the whole map
          (which could be well off-screen and read as nothing having
          happened). Rendered outside the map's own overflow-hidden box so it
          never gets clipped by the map's rounded corners. */}
      {selectedPin && (
        <div
          className="absolute z-20"
          style={{ left: popupLeft, top: selectedPin.top + POPUP_GAP, width: POPUP_WIDTH, maxWidth: "calc(100% - 16px)", transform: "translateX(-50%)" }}
        >
          <MapShopPanel entry={selected} onOpenShop={onOpenShop} onClose={() => setSelected(null)} />
        </div>
      )}
      </div>

      <p className="cs-t11 text-stone-400 mt-2">Drag to pan · zoom {zoom} · {pins.length} vendor{pins.length === 1 ? "" : "s"} shown</p>
    </div>
  );
}

/* ============================================================================
   SECTION 16: REVIEWS (shared by shop + product screens)
============================================================================ */
function ReviewSection({ entityType, entityId, ownerId, shopId }) {
  const { me, updateShop, updateProduct, shopsById, showToast, helpfulMarks, toggleHelpfulMark } = useApp();
  const handleStats = useCallback(
    (avg, cnt) => {
      if (entityType === "shop") updateShop(entityId, { avgRating: avg, reviewCount: cnt });
      else if (entityType === "product" && shopId) updateProduct(shopId, entityId, { avgRating: avg, reviewCount: cnt });
    },
    [entityType, entityId, shopId, updateShop, updateProduct]
  );
  const {
    reviews,
    avgRating,
    count,
    submitReview,
    flagReview,
    adjustHelpful,
    deleteReview,
    respondToReview,
    deleteResponse,
    adjustResponseHelpful,
    submitting,
  } = useReviews(entityType, entityId, handleStats, me?.id);
  const [writing, setWriting] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftBody, setDraftBody] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [flagState, setFlagState] = useState({});
  const [pendingHelpful, setPendingHelpful] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [pendingRespHelpful, setPendingRespHelpful] = useState(null);

  const handleHelpful = async (reviewId) => {
    if (!me || pendingHelpful) return;
    setPendingHelpful(reviewId);
    const res = await toggleHelpfulMark(reviewId);
    if (res) await adjustHelpful(reviewId, res.added ? 1 : -1);
    setPendingHelpful(null);
  };

  const handleResponseHelpful = async (reviewId) => {
    if (!me || pendingRespHelpful) return;
    setPendingRespHelpful(reviewId);
    const res = await toggleHelpfulMark(`resp:${reviewId}`);
    if (res) await adjustResponseHelpful(reviewId, res.added ? 1 : -1);
    setPendingRespHelpful(null);
  };

  const handleFlag = async (reviewId) => {
    setFlagState((s) => ({ ...s, [reviewId]: "checking" }));
    const { outcome } = await flagReview(reviewId, me.id);
    setFlagState((s) => ({ ...s, [reviewId]: outcome }));
    if (outcome === "removed") showToast("Review removed — thanks for reporting it");
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review? This can't be undone.")) return;
    await deleteReview(reviewId);
    showToast("Review deleted");
  };

  const startReply = (review) => {
    setReplyingTo(review.id);
    setReplyDraft(review.response?.body || "");
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyDraft("");
  };

  const submitReply = async (reviewId) => {
    if (!me || !replyDraft.trim() || replyBusy) return;
    setReplyBusy(true);
    await respondToReview(reviewId, me, replyDraft.trim());
    setReplyBusy(false);
    setReplyingTo(null);
    setReplyDraft("");
    showToast("Response posted");
  };

  const handleDeleteResponse = async (reviewId) => {
    if (!window.confirm("Remove your response to this review?")) return;
    await deleteResponse(reviewId);
    showToast("Response removed");
  };

  const alreadyReviewed = me && reviews.some((r) => r.authorId === me.id);
  const isOwner = me && ownerId && me.id === ownerId;

  const handleSubmit = async () => {
    if (!me || draftRating === 0 || !draftBody.trim()) return;
    const targetShop = entityType === "shop" ? shopsById[entityId] : shopsById[shopId];
    const result = await submitReview(
      me,
      { rating: draftRating, body: draftBody.trim() },
      {
        // Fires when background screening finishes.
        onScreened: (status) => {
          if (status === "removed") {
            showToast("Your review was removed by our screener");
            return;
          }
          showToast("Your review is now live");
          if (targetShop && targetShop.ownerId !== me.id) {
            notifyShopOwner(targetShop, "review", `${me.name} left a ${draftRating}-star review`, draftBody.trim().slice(0, 80));
          }
        },
      }
    );
    setLastResult(result);
    setWriting(false);
    setDraftRating(0);
    setDraftBody("");
    showToast("Review posted — pending review");
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-stone-900 flex items-center gap-2" style={displayFont}>
          Reviews {count > 0 && <span className="text-sm font-normal text-stone-500">({count})</span>}
        </h3>
        {count > 0 && <StarRating value={avgRating} showNumber />}
      </div>

      {!me && <p className="text-sm text-stone-500 mb-3">Create a CropSwap profile to leave a review.</p>}
      {isOwner && <p className="text-sm text-stone-500 mb-3">You can't review your own listing.</p>}

      {me && !isOwner && !alreadyReviewed && (
        <div className="mb-5">
          {!writing ? (
            <button onClick={() => setWriting(true)} className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
              <Pencil size={14} /> Write a review
            </button>
          ) : (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
              <StarRating value={draftRating} onChange={setDraftRating} size="lg" />
              <TextField
                value={draftBody}
                onChange={setDraftBody}
                placeholder="How was your experience?"
                label="Your review"
                multiline
                rows={5}
                className="w-full mt-2 border border-stone-200 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-700"
              />
              {lastResult?.status === "removed" && (
                <p className="text-xs text-rose-600 mt-2 flex items-start gap-1.5"><ShieldAlert size={14} className="shrink-0 mt-0.5" /> This review couldn't be published — our automatic screener flagged it for inappropriate content. Feel free to revise it.</p>
              )}
              {lastResult?.status === "pending" && (
                <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5"><ShieldAlert size={14} className="shrink-0 mt-0.5" /> Saved. The screener couldn't be reached, so this stays visible only to you until it's checked.</p>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setWriting(false); setLastResult(null); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || draftRating === 0 || !draftBody.trim()}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-800 text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Posting…</> : "Post review"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-stone-400">No reviews yet — be the first.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="flex gap-3">
              <Avatar emoji={r.authorAvatar} name={r.authorName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-stone-800">{r.authorName}</span>
                  {r.status === "pending" && <span className="cs-t10 font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Pending review</span>}
                  <span className="cs-t11 text-stone-400">{timeAgo(r.createdAt)}</span>
                </div>
                <StarRating value={r.rating} size="sm" />
                <p className="text-sm text-stone-600 mt-1">{r.body}</p>
                {r.status === "pending" && me && r.authorId === me.id && (
                  <p className="cs-t11 text-amber-700 mt-1">Being screened before it appears on this listing. Only you can see it for now.</p>
                )}
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => handleHelpful(r.id)}
                    disabled={!me || pendingHelpful === r.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${
                      helpfulMarks?.[r.id]
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                    } ${!me ? "opacity-50" : ""}`}
                    aria-pressed={!!helpfulMarks?.[r.id]}
                    aria-label={helpfulMarks?.[r.id] ? "Remove helpful mark" : "Mark this review helpful"}
                  >
                    <ThumbsUp size={13} className={helpfulMarks?.[r.id] ? "fill-emerald-700 text-emerald-700" : ""} />
                    <span className="cs-t11 font-semibold">{r.helpful || 0}</span>
                  </button>
                  {me && r.authorId !== me.id && (
                    <span>
                    {flagState[r.id] === "checking" ? (
                      <span className="cs-t11 text-stone-400 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Screening…</span>
                    ) : flagState[r.id] === "kept" || flagState[r.id] === "already_cleared" ? (
                      <span className="cs-t11 text-stone-400">Screened — no violation found</span>
                    ) : flagState[r.id] === "pending" ? (
                      <span className="cs-t11 text-amber-600">Couldn't screen right now — try again shortly</span>
                    ) : (
                      <button onClick={() => handleFlag(r.id)} className="cs-t11 text-stone-400 hover:text-rose-600 inline-flex items-center gap-1">
                        <ShieldAlert size={11} /> Report this review
                      </button>
                    )}
                    </span>
                  )}
                  {isOwner && !r.response && replyingTo !== r.id && (
                    <button onClick={() => startReply(r)} className="cs-t11 text-stone-400 hover:text-emerald-800 inline-flex items-center gap-1">
                      <MessageCircle size={11} /> Respond
                    </button>
                  )}
                  {isOwner && (
                    <button onClick={() => handleDeleteReview(r.id)} className="cs-t11 text-stone-400 hover:text-rose-600 inline-flex items-center gap-1">
                      <Trash2 size={11} /> Delete
                    </button>
                  )}
                </div>

                {isOwner && replyingTo === r.id && (
                  <div className="mt-2.5 bg-stone-50 rounded-xl p-3 border border-stone-200">
                    <TextField
                      value={replyDraft}
                      onChange={setReplyDraft}
                      placeholder="Write a response to this review…"
                      label="Your response"
                      multiline
                      rows={3}
                      className="w-full border border-stone-200 rounded-lg p-2 text-sm outline-none focus:border-emerald-700"
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={cancelReply} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-500">Cancel</button>
                      <button
                        onClick={() => submitReply(r.id)}
                        disabled={replyBusy || !replyDraft.trim()}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {replyBusy ? <><Loader2 size={12} className="animate-spin" /> Posting…</> : "Post response"}
                      </button>
                    </div>
                  </div>
                )}

                {r.response && (
                  <div className="mt-2.5 ml-2 pl-3 border-l-2 border-emerald-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="cs-t11 font-bold text-emerald-800 uppercase tracking-wide">Owner response</span>
                      {r.response.status === "pending" && me && r.response.authorId === me.id && (
                        <span className="cs-t10 font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Pending review</span>
                      )}
                      <span className="cs-t11 text-stone-400">{timeAgo(r.response.createdAt)}</span>
                    </div>
                    <p className="text-sm text-stone-600 mt-1">{r.response.body}</p>
                    <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => handleResponseHelpful(r.id)}
                        disabled={!me || pendingRespHelpful === r.id}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${
                          helpfulMarks?.[`resp:${r.id}`]
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-white border-stone-200 text-stone-500 hover:bg-stone-50"
                        } ${!me ? "opacity-50" : ""}`}
                        aria-pressed={!!helpfulMarks?.[`resp:${r.id}`]}
                        aria-label={helpfulMarks?.[`resp:${r.id}`] ? "Remove helpful mark" : "Mark this response helpful"}
                      >
                        <ThumbsUp size={13} className={helpfulMarks?.[`resp:${r.id}`] ? "fill-emerald-700 text-emerald-700" : ""} />
                        <span className="cs-t11 font-semibold">{r.response.helpful || 0}</span>
                      </button>
                      {isOwner && (
                        <>
                          <button onClick={() => startReply(r)} className="cs-t11 text-stone-400 hover:text-emerald-800 inline-flex items-center gap-1">
                            <Pencil size={11} /> Edit
                          </button>
                          <button onClick={() => handleDeleteResponse(r.id)} className="cs-t11 text-stone-400 hover:text-rose-600 inline-flex items-center gap-1">
                            <Trash2 size={11} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 17: PRODUCT DETAIL MODAL
============================================================================ */
function ProductDetailModal({ product, open, onClose, navigate }) {
  const { shopsById, favProducts, toggleFavorite, incrementShare, me, userLoc, showToast } = useApp();
  if (!product) return null;
  const shop = shopsById[product.shopId];
  const cat = catInfo(product.category);
  const isFav = !!favProducts[product.id];
  const dist = shop && userLoc ? haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) : null;

  const handleShare = async () => {
    const res = await shareContent({ title: product.name, text: `Check out ${product.name} from ${shop?.name} on CropSwap — ${formatPrice(product.price)}.` });
    if (res.ok) incrementShare("product", product);
    if (res.method === "clipboard") showToast("Link copied to clipboard");
    else if (res.method === "none") showToast("Sharing isn't available on this device");
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="prod-title">
      <div>
        <div className="relative h-52">
          <ProductImage src={product.image} photoId={product.photoId} credit={product.credit} artKey={product.art} category={product.category} emoji={product.emoji} alt={product.name} className="w-full h-full" />
          <button onClick={onClose} className="absolute top-3 right-3 bg-white/90 rounded-full w-8 h-8 flex items-center justify-center"><X size={16} /></button>
          {product.bannerId && <div className="absolute top-3 left-3"><BannerRibbon bannerId={product.bannerId} customText={product.customBannerText} /></div>}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="prod-title" className="text-xl font-bold text-stone-900" style={displayFont}>{product.name}</h2>
            </div>
            <span className="text-xl font-semibold text-stone-900 shrink-0" style={displayFont}>{formatPrice(product.price)}</span>
          </div>

          {/* Full-width so a long shop name wraps instead of being clipped, and
              visibly a control rather than a line of grey text. */}
          {shop && (
            <button
              onClick={() => {
                onClose();
                navigate({ screen: "shop", shopId: shop.id });
              }}
              className="mt-3 w-full flex items-center gap-3 text-left bg-stone-50 hover:bg-stone-100 active:bg-stone-200 border border-stone-200 rounded-xl px-3 py-2.5 transition"
              aria-label={`Visit ${shop.name}`}
            >
              <span className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white border border-stone-200">
                <ShopThumb shop={shop} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-start gap-1.5">
                  <span className="text-sm font-semibold text-stone-900 leading-snug break-words">{shop.name}</span>
                  {shop.verified && <BadgeCheck size={14} className="text-emerald-700 shrink-0 mt-0.5" />}
                </span>
                <span className="block cs-t11 text-stone-500 mt-0.5">
                  {shop.city}, {shop.state}
                  {dist != null ? ` \u00b7 ${formatDistance(dist)} away` : ""}
                </span>
              </span>
              <span className="flex items-center gap-1 shrink-0 text-emerald-800">
                <span className="cs-t11 font-semibold hidden sm:inline">Visit</span>
                <ChevronRight size={16} />
              </span>
            </button>
          )}

          <div className="flex items-center gap-2 mt-3">
            <PriceTag tone="white"><span className="inline-flex items-center gap-1"><CategoryMark id={cat.id} size={11} /> {cat.label}</span></PriceTag>
            {product.status === "sold_out" && <PriceTag tone="stone">Sold out</PriceTag>}
          </div>

          <p className="text-sm text-stone-600 mt-4 leading-relaxed">{product.desc}</p>

          <div className="flex items-center gap-2 mt-5">
            <FavoriteHeart active={isFav} count={product.favoriteCount || 0} disabled={!me} onToggle={() => toggleFavorite("product", product)} size="lg" />
            <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-1.5 border border-stone-200 rounded-xl py-2.5 font-semibold text-sm text-stone-700">
              <Share2 size={15} /> Share{product.shareCount > 0 ? ` · ${product.shareCount}` : ""}
            </button>
            {me && shop && me.id !== shop.ownerId && (
              <button
                onClick={() => { onClose(); navigate({ screen: "messages", withUserId: shop.ownerId, withUserName: shop.name, withUserAvatar: shop.emoji }); }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-800 text-white rounded-xl py-2.5 font-semibold text-sm"
              >
                <MessageCircle size={15} /> Message
              </button>
            )}
          </div>

          {product.status === "sold_out" && (
            <div className="mt-4">
              <RestockWatchButton product={product} />
            </div>
          )}

          <ReviewSection entityType="product" entityId={product.id} ownerId={shop?.ownerId} shopId={product.shopId} />
        </div>
      </div>
    </Modal>
  );
}

/* Sits as the first cell of the listings grid, so adding stock is part of the
   shelf rather than a button hovering over it. */
function AddProductTile({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-600 hover:bg-emerald-50 transition flex flex-col items-center justify-center gap-2 py-8"
      style={{ minHeight: "180px" }}
      aria-label="Add a product to your shop"
    >
      <span className="w-14 h-14 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-sm">
        <Plus size={28} strokeWidth={2.6} />
      </span>
      <span className="text-sm font-semibold text-emerald-800">Add product</span>
    </button>
  );
}

function ConfirmDelete({ product, shopId, onClose }) {
  const { removeProduct, showToast, viewportHeight } = useApp();
  const [working, setWorking] = useState(false);
  return (
    <div
      className="fixed inset-0 bg-black/50 cs-z-pop flex items-center justify-center p-4 cs-fade-anim"
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cs-modal-anim bg-white rounded-2xl w-full max-w-xs p-5">
        <h3 className="text-base font-bold text-stone-900 mb-1" style={displayFont}>Delete this listing?</h3>
        <p className="text-sm text-stone-600 mb-4">
          <span className="font-semibold">{product.name}</span> will be removed from your shop. This can't be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 font-semibold text-stone-600 text-sm">
            Keep it
          </button>
          <button
            onClick={async () => {
              setWorking(true);
              await removeProduct(shopId, product.id);
              showToast("Listing deleted");
              onClose();
            }}
            disabled={working}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {working ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 18: SHOP PROFILE VIEW
============================================================================ */
function ShopProfileView({ shopId, navigate }) {
  const { shopsById, products, favShops, toggleFavorite, incrementShare, me, userLoc, showToast } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const shop = shopsById[shopId];

  if (!shop) return <EmptyState icon={Store} title="Shop not found" body="This storefront may have moved." />;

  const theme = themeInfo(shop.themeId);
  const shopProducts = products.filter((p) => p.shopId === shop.id);
  const isFav = !!favShops[shop.id];
  const isOwner = me && me.id === shop.ownerId;
  const dist = userLoc ? haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) : null;

  const handleShare = async () => {
    const res = await shareContent({ title: shop.name, text: `${shop.name} in ${shop.city}, ${shop.state} — find them on CropSwap.` });
    if (res.ok) incrementShare("shop", shop);
    if (res.method === "clipboard") showToast("Link copied to clipboard");
    else if (res.method === "none") showToast("Sharing isn't available on this device");
  };

  const blocks = shop.layoutBlocks || ["banner", "bio", "contact", "gallery", "reviews"];

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <button onClick={() => navigate({ screen: "explore" })} className="fixed md:absolute top-3 left-3 z-20 bg-white/90 backdrop-blur rounded-full px-3 py-2 shadow-md flex items-center gap-1.5 text-sm font-semibold text-stone-700">
        <ArrowLeft size={15} /> Back
      </button>
      {isOwner && (
        <button onClick={() => navigate({ screen: "storeEditor" })} className="fixed md:absolute top-3 right-3 z-20 bg-white/90 backdrop-blur rounded-full px-3 py-2 shadow-md flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
          <Pencil size={14} /> Edit storefront
        </button>
      )}

      <div className="relative h-40 md:h-52 overflow-hidden">
        <BannerScene scene={shop.bannerScene || defaultScene(shop.id)} />
        <ShopCoverPhoto shop={shop} />
        {shop.banner && (
          <img
            src={shop.banner}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        {(shop.banners || []).length > 0 && (
          <div className="absolute inset-0 p-4 flex flex-col items-start gap-2 pointer-events-none">
            {(shop.banners || []).map((b) => (
              <ShopBannerRibbon key={b.id} banner={b} />
            ))}
          </div>
        )}
      </div>
      <div className="max-w-3xl mx-auto px-5">
        {/* relative + z-10: the banner above is positioned, so a static avatar
            would paint underneath it and lose its top half. */}
        <div className="relative z-10 -mt-12 flex items-end justify-between">
          <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
            <ShopThumb shop={shop} />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-900" style={displayFont}>{shop.name}</h1>
            {shop.verified && <BadgeCheck size={20} className="text-emerald-700" />}
            <span className={`cs-t11 font-bold px-2 py-0.5 rounded-full ${shop.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
              {shop.status === "open" ? "Actively selling" : "Closed for now"}
            </span>
          </div>
          <p className="text-stone-500 font-medium">@{shop.handle} · {shop.city}, {shop.state}{dist != null ? ` · ${formatDistance(dist)}` : ""}</p>
          {shop.tagline && <p className="text-emerald-800 font-semibold mt-1">{shop.tagline}</p>}
          {blocks.includes("bio") && <p className="text-stone-700 mt-2 max-w-xl">{shop.bio}</p>}
          {responseWindow(shop.responseMinutes) && (
            <p className="cs-t11 text-stone-500 mt-1.5 inline-flex items-center gap-1.5">
              <MessageCircle size={12} className="text-emerald-700" /> {responseWindow(shop.responseMinutes)}
            </p>
          )}
          {shop.pickupNotes && (
            <p className="text-sm text-stone-500 mt-2 flex items-start gap-1.5 max-w-xl">
              <MapPin size={14} className="shrink-0 mt-0.5 text-emerald-700" /> {shop.pickupNotes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <FavoriteHeart active={isFav} count={shop.favoriteCount || 0} disabled={!me} onToggle={() => toggleFavorite("shop", shop)} size="lg" />
          <button onClick={handleShare} className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-4 py-2.5 font-semibold text-sm text-stone-700">
            <Share2 size={15} /> Share{shop.shareCount > 0 ? ` · ${shop.shareCount}` : ""}
          </button>
          {me && !isOwner && (
            <button
              onClick={() => navigate({ screen: "messages", withUserId: shop.ownerId, withUserName: shop.name, withUserAvatar: shop.emoji })}
              className="flex items-center gap-1.5 bg-emerald-800 text-white rounded-xl px-4 py-2.5 font-semibold text-sm"
            >
              <MessageCircle size={15} /> Message
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate({ screen: "dashboard" })} className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-4 py-2.5 font-semibold text-sm text-stone-700">
              <TrendingUp size={15} /> Dashboard
            </button>
          )}
        </div>

        {blocks.includes("contact") && shop.contactCard?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Contact & socials</p>
            <div className={`relative rounded-2xl border ${TOKENS.border} ${theme.classes.accentBg} h-28`}>
              {shop.contactCard.map((ic) => {
                const info = socialInfo(ic.platform);
                const href = ic.platform === "email" ? `mailto:${ic.value}` : ic.platform === "phone" ? `tel:${ic.value}` : ic.value.startsWith("http") ? ic.value : `${info?.prefix || "https://"}${ic.value}`;
                return (
                  <a key={ic.id} href={href} target="_blank" rel="noopener noreferrer" className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${ic.x}%`, top: `${ic.y}%` }} title={ic.value}>
                    <SocialIcon platform={ic.platform} />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {(shop.updates || []).length > 0 && (
          <div className="mt-7">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Latest from {shop.name}</p>
            <ShopUpdatesFeed shop={shop} limit={3} />
          </div>
        )}

        {blocks.includes("gallery") && (
          <div className="mt-7">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-3">{shop.name}'s listings ({shopProducts.length})</p>
            {shopProducts.length === 0 && !isOwner ? (
              <EmptyState icon={Package} title="No listings yet" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                {isOwner && <AddProductTile onClick={() => setAddOpen(true)} />}
                {shopProducts.map((pr) => (
                  <ProductCard
                    key={pr.id}
                    product={pr}
                    onEdit={isOwner ? () => setEditingProduct(pr) : undefined}
                    onDelete={isOwner ? () => setDeletingProduct(pr) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <ShopFaq shop={shop} />
        {blocks.includes("reviews") && <ReviewSection entityType="shop" entityId={shop.id} ownerId={shop.ownerId} />}
      </div>

      {addOpen && <AddProductForm shop={shop} onClose={() => setAddOpen(false)} />}
      {editingProduct && <AddProductForm shop={shop} editing={editingProduct} onClose={() => setEditingProduct(null)} />}
      {deletingProduct && (
        <ConfirmDelete
          product={deletingProduct}
          shopId={shop.id}
          onClose={() => setDeletingProduct(null)}
        />
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 19: STOREFRONT BUILDER — drag-to-reorder blocks (pointer events,
   works on touch and mouse) + free-position contact card icon dragging.
============================================================================ */
const BLOCK_LABELS = { banner: "Header banner", bio: "About / bio", contact: "Contact card", gallery: "Product gallery", reviews: "Reviews" };

function BlockReorderList({ blocks, onReorder }) {
  const [order, setOrder] = useState(blocks);
  const [draggingId, setDraggingId] = useState(null);
  const rowRefs = useRef({});
  const draggingIdRef = useRef(null);
  const orderRef = useRef(blocks);
  const onReorderRef = useRef(onReorder);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  useEffect(() => {
    setOrder(blocks);
    orderRef.current = blocks;
  }, [blocks]);

  const onMove = useCallback((e) => {
    const dragId = draggingIdRef.current;
    if (!dragId) return;
    const y = e.clientY;
    let closestId = null;
    let closestDist = Infinity;
    Object.entries(rowRefs.current).forEach(([id, node]) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - y);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    });
    if (closestId && closestId !== dragId) {
      setOrder((prev) => {
        const from = prev.indexOf(dragId);
        const to = prev.indexOf(closestId);
        if (from === -1 || to === -1) return prev;
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, dragId);
        orderRef.current = next;
        return next;
      });
    }
  }, []);

  // Same pointer-capture approach as the contact card: keeps the drag alive on
  // touch, where window listeners can stop receiving events mid-gesture.
  const onDown = (id) => (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      /* fall through: reorder still works with a mouse */
    }
    draggingIdRef.current = id;
    setDraggingId(id);
  };

  const onUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* capture may already have been released */
    }
    if (!draggingIdRef.current) return;
    draggingIdRef.current = null;
    setDraggingId(null);
    onReorderRef.current(orderRef.current);
  };

  return (
    <div className="flex flex-col gap-2">
      {order.map((blockId) => (
        <div
          key={blockId}
          ref={(node) => {
            rowRefs.current[blockId] = node;
          }}
          className={`flex items-center gap-3 bg-white border rounded-xl px-3 py-3 transition ${draggingId === blockId ? "border-emerald-600 shadow-md" : "border-stone-200"}`}
        >
          <button
            onPointerDown={onDown(blockId)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="cs-touch-none cursor-grab active:cursor-grabbing text-stone-400 select-none p-1 -m-1"
            aria-label="Drag to reorder"
          >
            <GripVertical size={18} />
          </button>
          <span className="text-sm font-medium text-stone-700">{BLOCK_LABELS[blockId] || blockId}</span>
        </div>
      ))}
    </div>
  );
}

function LayoutTab({ shop }) {
  const { updateShop } = useApp();
  const [bio, setBio] = useState(shop.bio);
  const [handle, setHandle] = useState(shop.handle || "");
  const [city, setCity] = useState(shop.city || "");
  const [stateCode, setStateCode] = useState(shop.state || "");
  const [tagline, setTagline] = useState(shop.tagline || "");
  const [pickup, setPickup] = useState(shop.pickupNotes || "");

  useEffect(() => {
    setBio(shop.bio);
    setHandle(shop.handle || "");
    setCity(shop.city || "");
    setStateCode(shop.state || "");
    setTagline(shop.tagline || "");
    setPickup(shop.pickupNotes || "");
  }, [shop.id]);

  return (
    <div>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Theme</p>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => updateShop(shop.id, { themeId: t.id })}
            className={`p-3 rounded-xl border-2 text-left transition ${shop.themeId === t.id ? "border-emerald-700" : "border-stone-200"}`}
          >
            <div className="flex gap-1 mb-2">
              {t.swatch.map((c, i) => (
                <span key={i} className="w-4 h-4 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <p className="text-sm font-semibold text-stone-800">{t.name}</p>
          </button>
        ))}
      </div>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Cover photo</p>
      <div className="mb-5">
        <PhotoPicker
          photoId={shop.coverPhotoId}
          onChange={(id) => updateShop(shop.id, { coverPhotoId: id })}
          label="Upload a cover photo"
          hint="Shown across the top of your storefront"
          aspect={16 / 7}
          size="lg"
        />
      </div>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">{shop.coverPhotoId ? "Or use a drawn scene" : "Cover scene"}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {SCENE_LIST.map((sc) => {
          const active = (shop.bannerScene || defaultScene(shop.id)) === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => updateShop(shop.id, { bannerScene: sc.id })}
              className={`rounded-xl overflow-hidden border-2 text-left transition ${active ? "border-emerald-700" : "border-stone-200 hover:border-stone-300"}`}
              aria-pressed={active}
            >
              <span className="block h-14">
                <BannerScene scene={sc.id} />
              </span>
              <span className="block cs-t11 font-semibold text-stone-700 px-2 py-1.5 bg-white">{sc.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">About / bio</p>
      <TextField
        value={bio}
        onChange={setBio}
        onBlur={(v) => updateShop(shop.id, { bio: v })}
        label="About your shop"
        placeholder="Tell people what you grow and how to find you."
        multiline
        rows={5}
        className="w-full border border-stone-200 rounded-xl p-3 text-sm mb-6 outline-none focus:border-emerald-700"
      />

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Shop details</p>
      <label className="block cs-t11 font-semibold text-stone-500 mb-1">Tagline</label>
      <TextField
        value={tagline}
        onChange={setTagline}
        onBlur={(v) => updateShop(shop.id, { tagline: v })}
        label="Tagline"
        placeholder="One line under your shop name"
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-2 outline-none focus:border-emerald-700"
      />
      <label className="block cs-t11 font-semibold text-stone-500 mb-1">Handle</label>
      <TextField
        value={handle}
        onChange={setHandle}
        onBlur={(v) => updateShop(shop.id, { handle: (v || "").toLowerCase().replace(/[^a-z0-9_]+/g, "") || shop.handle })}
        label="Handle"
        placeholder="yourfarm"
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-2 outline-none focus:border-emerald-700"
      />
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
        <label className="block cs-t11 font-semibold text-stone-500 mb-1">Town or city</label>
        <TextField
          value={city}
          onChange={setCity}
          onBlur={(v) => updateShop(shop.id, { city: v || shop.city })}
          label="Town or city"
          placeholder="Town"
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
        />
        </div>
        <div className="w-20">
        <label className="block cs-t11 font-semibold text-stone-500 mb-1">State</label>
        <TextField
          value={stateCode}
          onChange={setStateCode}
          onBlur={(v) => updateShop(shop.id, { state: (v || "").toUpperCase().slice(0, 2) || shop.state })}
          label="State"
          placeholder="ID"
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
        />
        </div>
      </div>
      <label className="block cs-t11 font-semibold text-stone-500 mb-1">Pickup &amp; hours</label>
      <TextField
        value={pickup}
        onChange={setPickup}
        onBlur={(v) => updateShop(shop.id, { pickupNotes: v })}
        label="Pickup & hours"
        placeholder="e.g. Saturdays 8-12 at the market, or by arrangement"
        multiline
        rows={3}
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-6 outline-none focus:border-emerald-700"
      />

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Status</p>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => updateShop(shop.id, { status: "open" })}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${shop.status === "open" ? "bg-emerald-800 text-white border-emerald-800" : "border-stone-200 text-stone-600"}`}
        >
          Actively selling
        </button>
        <button
          onClick={() => updateShop(shop.id, { status: "closed" })}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${shop.status === "closed" ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600"}`}
        >
          Closed for now
        </button>
      </div>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Page layout — drag to reorder</p>
      <BlockReorderList blocks={shop.layoutBlocks} onReorder={(order) => updateShop(shop.id, { layoutBlocks: order })} />
    </div>
  );
}

function IconEditPopover({ icon, onSave, onDelete, onClose, onPosition }) {
  const [val, setVal] = useState(icon?.value || "");
  const inputRef = useRef(null);
  const popoverHeight = useSafeViewportHeight();
  const info = icon ? socialInfo(icon.platform) : null;

  useEffect(() => {
    if (!icon) return;
    const starting = icon.value || info?.prefix || "";
    setVal(starting);
    // Park the cursor at the end so the vendor just types their handle.
    const timer = setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(el.value.length, el.value.length);
      } catch (e) {
        /* some input types don't support selection ranges */
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [icon?.id]);

  if (!icon) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 cs-z-pop flex items-center justify-center p-4 cs-fade-anim"
      style={popoverHeight ? { height: `${popoverHeight}px` } : undefined}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cs-modal-anim bg-white rounded-2xl w-full max-w-xs p-4">
        <div className="flex items-center gap-2 mb-1">
          <SocialIcon platform={icon.platform} size={30} />
          <p className="font-semibold text-sm text-stone-800">{info?.label}</p>
        </div>
        <p className="cs-t11 text-stone-400 mb-2.5">
          {info?.prefix ? "Add your handle to the end of the link below." : `Enter your ${info?.label.toLowerCase()}.`}
        </p>
        <TextField
          value={val}
          onChange={setVal}
          label={`${info?.label} link`}
          hint={info?.prefix ? "Add your handle to the end of the link." : ""}
          placeholder={`${info?.prefix || ""}${info?.hintTail || ""}`}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-emerald-700"
        />

        {onPosition && (
          <div className="mb-3">
            <p className="cs-t11 font-bold text-stone-400 uppercase mb-1.5">Position on card</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75].map((gy) =>
                [16, 38.5, 61, 83.5].map((gx) => {
                  const active = Math.abs((icon.x ?? 0) - gx) < 6 && Math.abs((icon.y ?? 0) - gy) < 10;
                  return (
                    <button
                      key={`${gx}-${gy}`}
                      onClick={() => onPosition(gx, gy)}
                      className={`h-7 rounded-md border transition ${active ? "bg-emerald-800 border-emerald-800" : "bg-stone-50 border-stone-200 hover:bg-stone-100"}`}
                      aria-label={`Move icon to column ${[16, 38.5, 61, 83.5].indexOf(gx) + 1}, row ${[25, 50, 75].indexOf(gy) + 1}`}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={onDelete} className="text-rose-600 text-sm font-semibold px-2">Remove</button>
          <button onClick={onClose} className="flex-1 text-sm font-semibold text-stone-500">Cancel</button>
          <button onClick={() => onSave(val)} className="flex-1 bg-emerald-800 text-white text-sm font-semibold rounded-lg py-2">Save</button>
        </div>
      </div>
    </div>
  );
}

function ContactCardEditor({ shop }) {
  const { updateShop } = useApp();
  const containerRef = useRef(null);
  const [icons, setIcons] = useState(shop.contactCard || []);
  const [editingId, setEditingId] = useState(null);
  const draggingRef = useRef(null);
  const iconsRef = useRef(shop.contactCard || []);
  const movedRef = useRef(false);

  useEffect(() => {
    const next = shop.contactCard || [];
    setIcons(next);
    iconsRef.current = next;
  }, [shop.id]);

  const persist = (next) => {
    iconsRef.current = next;
    setIcons(next);
    updateShop(shop.id, { contactCard: next });
  };

  const addIcon = (platformId) => {
    const info = socialInfo(platformId);
    // Stagger new icons across the card. Previously every icon was dropped at the
    // same coordinates, so each new one landed exactly on top of the last and
    // looked like it had replaced it.
    const idx = icons.length;
    const perRow = 4;
    const x = 16 + (idx % perRow) * 22.5;
    const y = 28 + Math.floor(idx / perRow) * 26;
    const newIcon = {
      id: uid("ic"),
      platform: platformId,
      value: info?.prefix || "",
      x: clamp(x, 6, 94),
      y: clamp(y, 15, 85),
    };
    persist([...icons, newIcon]);
    setEditingId(newIcon.id);
  };

  // Pointer capture routes the entire drag to this element even when the finger
  // slides off it. The previous approach (window listeners + preventDefault on
  // pointerdown) is unreliable on touch, where the browser may cancel the
  // pointer sequence outright and no move events ever arrive.
  const beginDrag = (id) => (e) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      /* browsers without pointer capture still work via the tap fallback */
    }
    draggingRef.current = id;
    movedRef.current = false;
  };

  const dragMove = (e) => {
    const dragId = draggingRef.current;
    if (!dragId || !containerRef.current) return;
    movedRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 6, 94);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 15, 85);
    setIcons((prev) => {
      const next = prev.map((ic) => (ic.id === dragId ? { ...ic, x, y } : ic));
      iconsRef.current = next;
      return next;
    });
  };

  // Tap vs drag is decided here rather than relying on a click event, which
  // touch browsers fire inconsistently after a drag.
  const endDrag = (id) => (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* capture may already have been released */
    }
    if (draggingRef.current) {
      draggingRef.current = null;
      if (movedRef.current) updateShop(shop.id, { contactCard: iconsRef.current });
      else setEditingId(id);
    }
    movedRef.current = false;
  };

  const moveIconTo = (id, x, y) => {
    persist(icons.map((ic) => (ic.id === id ? { ...ic, x, y } : ic)));
  };

  const editingIcon = icons.find((i) => i.id === editingId) || null;

  return (
    <div>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Tap an icon to add it, then drag it into place</p>
      <div className="flex gap-2 overflow-x-auto p-3 bg-stone-50 rounded-xl mb-3">
        {SOCIAL_PLATFORMS.map((pf) => (
          <button key={pf.id} onClick={() => addIcon(pf.id)} className="shrink-0" title={`Add ${pf.label}`}>
            <SocialIcon platform={pf.id} size={36} />
          </button>
        ))}
      </div>
      <div ref={containerRef} className="relative h-44 rounded-2xl border-2 border-dashed border-stone-300 bg-white">
        {icons.map((ic) => {
          const info = socialInfo(ic.platform);
          const unfinished = !ic.value || ic.value === info?.prefix;
          return (
            <div
              key={ic.id}
              onPointerDown={beginDrag(ic.id)}
              onPointerMove={dragMove}
              onPointerUp={endDrag(ic.id)}
              onPointerCancel={endDrag(ic.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing cs-touch-none select-none"
              style={{ left: `${ic.x}%`, top: `${ic.y}%` }}
              title={ic.value || info?.label}
            >
              <SocialIcon platform={ic.platform} />
              {unfinished && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />}
            </div>
          );
        })}
        {icons.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-stone-400 px-8 text-center">Tap an icon above, then drag it anywhere on this card</p>
        )}
      </div>
      {icons.length > 0 && (
        <p className="cs-t11 text-stone-400 mt-2">
          Drag an icon to move it, or tap it to edit its link and pick a spot. An amber dot means the link still needs your handle.
        </p>
      )}
      <IconEditPopover
        icon={editingIcon}
        onPosition={(x, y) => moveIconTo(editingId, x, y)}
        onSave={(val) => {
          persist(icons.map((ic) => (ic.id === editingId ? { ...ic, value: val } : ic)));
          setEditingId(null);
        }}
        onDelete={() => {
          persist(icons.filter((ic) => ic.id !== editingId));
          setEditingId(null);
        }}
        onClose={() => setEditingId(null)}
      />
    </div>
  );
}

const PRODUCT_EMOJI_CHOICES = ["🍅", "🥕", "🥬", "🌽", "🍎", "🍑", "🍇", "🍓", "🫐", "🍋", "🍊", "🍐", "🌳", "🍄", "🥔", "🧄", "🧅", "🐝", "🐞", "🥚", "🧀", "🍯", "🌿", "🎃"];

/* Twenty drawn icons, in the app's own hand rather than platform emoji. */
const PRODUCT_ICON_CHOICES = [
  { key: "tomato", label: "Tomato" }, { key: "carrot", label: "Carrot" },
  { key: "greens", label: "Greens" }, { key: "garlic", label: "Bulbs" },
  { key: "root", label: "Roots" }, { key: "squash", label: "Squash" },
  { key: "mushroom", label: "Mushroom" }, { key: "grain", label: "Grain" },
  { key: "apple", label: "Apple" }, { key: "peach", label: "Stone fruit" },
  { key: "cherry", label: "Cherries" }, { key: "grapes", label: "Grapes" },
  { key: "berries", label: "Berries" }, { key: "citrus", label: "Citrus" },
  { key: "pear", label: "Pear" }, { key: "tree", label: "Tree" },
  { key: "sprout", label: "Seedling" }, { key: "houseplant", label: "Plant" },
  { key: "bee", label: "Bees" }, { key: "egg", label: "Eggs & dairy" },
];

function AddProductForm({ shop, onClose, editing }) {
  const { addProduct, updateProduct, viewportHeight, showToast } = useApp();
  const [photoId, setPhotoId] = useState(editing?.photoId || null);
  const [art, setArt] = useState(editing?.art || "tomato");
  const [name, setName] = useState(editing?.name || "");
  const [category, setCategory] = useState(editing?.category || "Veggie");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [desc, setDesc] = useState(editing?.desc || "");
  const [saving, setSaving] = useState(false);
  const canSave = name.trim() && price !== "" && !isNaN(Number(price));

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      category,
      price: Math.max(0, Number(price)),
      desc: desc.trim(),
      photoId,
      art,
      emoji: "",
    };
    if (editing) {
      await updateProduct(shop.id, editing.id, payload);
      showToast("Listing updated");
    } else {
      await addProduct(shop.id, payload);
      showToast("Listing added");
    }
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 cs-z-pop flex items-end sm:items-center justify-center cs-fade-anim"
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cs-modal-anim bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-3.5 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-stone-900" style={displayFont}>
            {editing ? "Edit listing" : "Add a listing"}
          </h3>
          <button onClick={onClose} aria-label="Close"><X size={20} className="text-stone-400" /></button>
        </div>

        <div className="p-5">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Photo</p>
          <PhotoPicker
            photoId={photoId}
            onChange={setPhotoId}
            size="lg"
            label="Upload from your phone"
            hint="A real photo sells far better than an icon"
          />

          <div className="flex items-center gap-3 my-4">
            <span className="flex-1 h-px bg-stone-200" />
            <span className="cs-t11 font-semibold text-stone-400 uppercase">or pick an icon</span>
            <span className="flex-1 h-px bg-stone-200" />
          </div>

          <div className="grid grid-cols-5 gap-2 mb-5">
            {PRODUCT_ICON_CHOICES.map((choice) => (
              <button
                key={choice.key}
                onClick={() => setArt(choice.key)}
                className={`rounded-xl overflow-hidden border-2 transition ${art === choice.key ? "border-emerald-700" : "border-stone-200 hover:border-stone-300"}`}
                aria-label={choice.label}
                aria-pressed={art === choice.key}
                title={choice.label}
              >
                <span className="block aspect-square">
                  <ProduceArt artKey={choice.key} category={category} />
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Details</p>
          <label className="block cs-t11 font-semibold text-stone-500 mb-1">Name</label>
          <TextField
            value={name}
            onChange={setName}
            label="Listing name"
            placeholder="e.g. Heirloom tomatoes"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-3 outline-none focus:border-emerald-700"
          />

          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block cs-t11 font-semibold text-stone-500 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block cs-t11 font-semibold text-stone-500 mb-1">Price</label>
              <TextField
                value={price}
                onChange={setPrice}
                numeric
                label="Price (0 for free)"
                placeholder="0.00"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
              />
            </div>
          </div>

          <label className="block cs-t11 font-semibold text-stone-500 mb-1">Description</label>
          <TextField
            value={desc}
            onChange={setDesc}
            label="Description"
            placeholder="How it was grown, when it was picked, how to collect it…"
            multiline
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
          />

          <button
            onClick={save}
            disabled={!canSave || saving}
            className="w-full bg-emerald-800 text-white font-semibold py-3 rounded-xl disabled:opacity-40"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add to my shop"}
          </button>
          {!canSave && <p className="cs-t11 text-stone-400 text-center mt-2">A name and price are needed.</p>}
        </div>
      </div>
    </div>
  );
}

function ProductEditRow({ product, shop }) {
  const { updateProduct, removeProduct } = useApp();
  const [customText, setCustomText] = useState(product.customBannerText || "");
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const setBanner = (bannerId) => {
    const patch = { bannerId: bannerId || null, status: bannerId === "sold_out" ? "sold_out" : "available" };
    if (bannerId !== "custom") patch.customBannerText = "";
    updateProduct(shop.id, product.id, patch);
  };

  return (
    <div className="border border-stone-200 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <ProductImage src={product.image} photoId={product.photoId} artKey={product.art} category={product.category} emoji={product.emoji} alt="" className="w-11 h-11 shrink-0" rounded="rounded-lg" showCredit={false} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-stone-800 truncate">{product.name}</p>
          <p className="text-xs text-stone-400">{formatPrice(product.price)} · {catInfo(product.category).label}</p>
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="text-stone-400" aria-label="Expand">
          <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button onClick={() => setConfirmingDelete(true)} className="text-stone-300 hover:text-rose-600" aria-label="Delete">
          <Trash2 size={15} />
        </button>
      </div>
      {confirmingDelete && (
        <div className="mt-2 flex items-center gap-2 bg-rose-50 rounded-lg p-2">
          <span className="text-xs text-rose-700 flex-1">Remove this listing?</span>
          <button onClick={() => setConfirmingDelete(false)} className="text-xs font-semibold text-stone-500">Cancel</button>
          <button onClick={() => removeProduct(shop.id, product.id)} className="text-xs font-semibold text-rose-700">Remove</button>
        </div>
      )}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <p className="cs-t11 font-bold text-stone-400 uppercase mb-1.5">Banner</p>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setBanner(null)} className={`px-2.5 py-1 rounded-full cs-t11 font-semibold border transition ${!product.bannerId ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-500"}`}>None</button>
            {BANNER_PRESETS.map((b) => (
              <button key={b.id} onClick={() => setBanner(b.id)} className={`px-2.5 py-1 rounded-full cs-t11 font-semibold border transition ${product.bannerId === b.id ? "bg-emerald-800 text-white border-emerald-800" : "border-stone-200 text-stone-500"}`}>{b.label}</button>
            ))}
            <button onClick={() => setBanner("custom")} className={`px-2.5 py-1 rounded-full cs-t11 font-semibold border transition ${product.bannerId === "custom" ? "bg-violet-700 text-white border-violet-700" : "border-stone-200 text-stone-500"}`}>Custom text…</button>
          </div>
          {product.bannerId === "custom" && (
            <TextField
              value={customText}
              onChange={setCustomText}
              onBlur={(v) => updateProduct(shop.id, product.id, { customBannerText: v })}
              label="Custom banner text"
              placeholder="e.g. Back Friday!"
              className="w-full mt-2 border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-700"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ProductsTab({ shop, products }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Your listings ({products.length})</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-sm font-semibold text-emerald-800"><Plus size={15} /> Add listing</button>
      </div>
      <div className="flex flex-col gap-2 mb-6">
        {products.map((pr) => (
          <ProductEditRow key={pr.id} product={pr} shop={shop} />
        ))}
        {products.length === 0 && <p className="text-sm text-stone-400">No listings yet — add your first one.</p>}
      </div>
      {showAdd && <AddProductForm shop={shop} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function StorefrontEditor({ navigate }) {
  const { me, shopsById, products } = useApp();
  const [tab, setTab] = useState("layout");

  if (!me.isVendor || !me.shopId) {
    return (
      <EmptyState
        icon={Store}
        title="No storefront yet"
        body="Become a vendor first to unlock the builder."
        action={<button onClick={() => navigate({ screen: "store" })} className="text-sm font-semibold text-emerald-800">Start selling</button>}
      />
    );
  }
  const shop = shopsById[me.shopId];
  if (!shop) return <LoadingScreen inline />;
  const shopProducts = products.filter((p) => p.shopId === shop.id);

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="sticky top-0 bg-white border-b border-stone-200 z-10 px-4 pt-3">
        <button onClick={() => navigate({ screen: "shop", shopId: shop.id })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-3">
          <ArrowLeft size={15} /> Back to storefront
        </button>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: "layout", label: "Theme & Layout", icon: LayoutGrid },
            { id: "updates", label: "Updates", icon: Bell },
            { id: "tools", label: "Tools & FAQ", icon: TrendingUp },
            { id: "banners", label: "Banners", icon: Sparkles },
            { id: "contact", label: "Contact Card", icon: UserPlus },
            { id: "products", label: "Products & Banners", icon: ShoppingBag },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition ${tab === t.id ? "border-emerald-800 text-emerald-800" : "border-transparent text-stone-400"}`}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-2xl mx-auto p-4">
        {tab === "layout" && <LayoutTab shop={shop} />}
        {tab === "updates" && <VendorUpdatesTab shop={shop} />}
        {tab === "tools" && <ShopToolsTab shop={shop} />}
        {tab === "banners" && <BannersTab shop={shop} />}
        {tab === "contact" && <ContactCardEditor shop={shop} />}
        {tab === "products" && <ProductsTab shop={shop} products={shopProducts} />}
      </div>
    </div>
  );
}


/* ============================================================================
   SECTION 2e: STOREFRONT BANNERS
   Ribbons a vendor can lay over their cover. Presets are a starting point; the
   colour wheel, text and type controls make each one their own.
============================================================================ */
const SHOP_BANNER_PRESETS = [
  { label: "Open today", bg: "#047857", color: "#ffffff" },
  { label: "Now taking orders", bg: "#b45309", color: "#ffffff" },
  { label: "Closed for the season", bg: "#44403c", color: "#ffffff" },
  { label: "New stock this week", bg: "#7c3aed", color: "#ffffff" },
  { label: "Farmers market Saturday", bg: "#be123c", color: "#ffffff" },
  { label: "Pickup only", bg: "#0f766e", color: "#ffffff" },
];

const BANNER_TEXT_SIZES = [
  { id: "sm", label: "Small", px: 11 },
  { id: "md", label: "Medium", px: 14 },
  { id: "lg", label: "Large", px: 18 },
  { id: "xl", label: "Extra large", px: 24 },
];
const bannerSizePx = (id) => (BANNER_TEXT_SIZES.find((s) => s.id === id) || BANNER_TEXT_SIZES[1]).px;

function ShopBannerRibbon({ banner, className = "" }) {
  if (!banner || !banner.text) return null;
  return (
    <span
      className={`inline-block px-3 py-1 rounded shadow-sm max-w-full truncate ${className}`}
      style={{
        background: banner.bg || "#047857",
        color: banner.color || "#ffffff",
        fontSize: `${bannerSizePx(banner.size)}px`,
        fontWeight: banner.bold ? 700 : 500,
        fontStyle: banner.italic ? "italic" : "normal",
        fontFamily: banner.serif ? "'Fraunces', serif" : "'Inter', sans-serif",
        letterSpacing: banner.wide ? "0.08em" : "normal",
      }}
    >
      {banner.text}
    </span>
  );
}

function BannersTab({ shop }) {
  const { updateShop } = useApp();
  const banners = shop.banners || [];

  const patch = (next) => updateShop(shop.id, { banners: next });
  const addBanner = (preset) =>
    patch([
      ...banners,
      {
        id: uid("bn"),
        text: preset ? preset.label : "Your message here",
        bg: preset ? preset.bg : "#047857",
        color: preset ? preset.color : "#ffffff",
        size: "md",
        bold: true,
        italic: false,
        serif: false,
        wide: false,
      },
    ]);
  const editBanner = (id, part) => patch(banners.map((b) => (b.id === id ? { ...b, ...part } : b)));
  const removeBanner = (id) => patch(banners.filter((b) => b.id !== id));

  return (
    <div>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Preview</p>
      <div className="relative h-28 rounded-xl overflow-hidden border border-stone-200 mb-5">
        <BannerScene scene={shop.bannerScene || defaultScene(shop.id)} />
        <div className="absolute inset-0 p-3 flex flex-col items-start gap-1.5">
          {banners.length === 0 ? (
            <span className="cs-t11 text-stone-600 bg-white/80 px-2 py-1 rounded">No banners yet</span>
          ) : (
            banners.map((b) => <ShopBannerRibbon key={b.id} banner={b} />)
          )}
        </div>
      </div>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Add a banner</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {SHOP_BANNER_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => addBanner(preset)}
            className="px-3 py-1.5 rounded text-xs font-semibold shadow-sm"
            style={{ background: preset.bg, color: preset.color }}
          >
            + {preset.label}
          </button>
        ))}
        <button onClick={() => addBanner(null)} className="px-3 py-1.5 rounded text-xs font-semibold border border-dashed border-stone-300 text-stone-600">
          + Blank
        </button>
      </div>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Your banners ({banners.length})</p>
      <div className="flex flex-col gap-3">
        {banners.map((b) => (
          <div key={b.id} className="border border-stone-200 rounded-xl p-3">
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <ShopBannerRibbon banner={b} />
              <button onClick={() => removeBanner(b.id)} className="text-stone-300 hover:text-rose-600 shrink-0 p-1" aria-label="Remove banner">
                <Trash2 size={15} />
              </button>
            </div>

            <TextField
              value={b.text}
              onChange={(v) => editBanner(b.id, { text: v })}
              label="Banner text"
              placeholder="Banner text"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-2.5 outline-none focus:border-emerald-700"
            />

            <div className="flex items-center gap-3 mb-2.5">
              <label className="flex items-center gap-1.5 cs-t11 font-semibold text-stone-600">
                Background
                <input
                  type="color"
                  value={b.bg}
                  onChange={(e) => editBanner(b.id, { bg: e.target.value })}
                  className="w-8 h-8 rounded border border-stone-200 bg-white cursor-pointer"
                  aria-label="Banner background colour"
                />
              </label>
              <label className="flex items-center gap-1.5 cs-t11 font-semibold text-stone-600">
                Text
                <input
                  type="color"
                  value={b.color}
                  onChange={(e) => editBanner(b.id, { color: e.target.value })}
                  className="w-8 h-8 rounded border border-stone-200 bg-white cursor-pointer"
                  aria-label="Banner text colour"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {BANNER_TEXT_SIZES.map((sz) => (
                <button
                  key={sz.id}
                  onClick={() => editBanner(b.id, { size: sz.id })}
                  className={`px-2.5 py-1 rounded-full cs-t11 font-semibold border transition ${b.size === sz.id ? "bg-emerald-800 text-white border-emerald-800" : "border-stone-200 text-stone-600"}`}
                >
                  {sz.label}
                </button>
              ))}
              {[
                { key: "bold", label: "Bold" },
                { key: "italic", label: "Italic" },
                { key: "serif", label: "Serif" },
                { key: "wide", label: "Spaced" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => editBanner(b.id, { [opt.key]: !b[opt.key] })}
                  className={`px-2.5 py-1 rounded-full cs-t11 font-semibold border transition ${b[opt.key] ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600"}`}
                  aria-pressed={!!b[opt.key]}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {banners.length === 0 && <p className="text-sm text-stone-400">Pick a preset above, or start blank.</p>}
      </div>
    </div>
  );
}


/* ============================================================================
   SECTION 19b: VENDOR CONNECTION UI
============================================================================ */
function QrCode({ text, size = 168 }) {
  const qr = useMemo(() => qrEncode(text), [text]);
  if (!qr) return <p className="cs-t11 text-stone-400">Link is too long to encode.</p>;
  const quiet = 4;
  const total = qr.size + quiet * 2;
  return (
    <svg viewBox={`0 0 ${total} ${total}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${text}`}>
      <rect width={total} height={total} fill="#ffffff" />
      {qr.modules.map((row, r) =>
        row.map((v, c) => (v ? <rect key={`${r}-${c}`} x={c + quiet} y={r + quiet} width="1" height="1" fill="#1c1917" /> : null))
      )}
    </svg>
  );
}

function ShopUpdatesFeed({ shop, limit }) {
  const updates = [...(shop.updates || [])].sort((a, b) => b.createdAt - a.createdAt);
  const shown = limit ? updates.slice(0, limit) : updates;
  if (!shown.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {shown.map((u) => {
        const kind = updateKind(u.kind);
        return (
          <div key={u.id} className="border border-stone-200 rounded-xl p-3 bg-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="cs-t10 font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: kind.bg, color: kind.tint }}>
                {kind.label}
              </span>
              <span className="cs-t10 text-stone-400">{timeAgo(u.createdAt)}</span>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">{u.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function ShopFaq({ shop }) {
  const [open, setOpen] = useState(null);
  const faq = shop.faq || [];
  if (!faq.length) return null;
  return (
    <div className="mt-7">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Questions this shop answers</p>
      <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
        {faq.map((item, i) => (
          <div key={item.id} className={i > 0 ? "border-t border-stone-100" : ""}>
            <button onClick={() => setOpen(open === item.id ? null : item.id)} className="w-full flex items-center gap-2 px-3.5 py-3 text-left">
              <span className="flex-1 text-sm font-semibold text-stone-800">{item.q}</span>
              <ChevronDown size={15} className={`text-stone-400 shrink-0 transition-transform ${open === item.id ? "rotate-180" : ""}`} />
            </button>
            {open === item.id && <p className="px-3.5 pb-3 text-sm text-stone-600 leading-relaxed">{item.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function NearbyShops({ shop }) {
  const { shops, navigate } = useApp();
  const near = useMemo(() => nearbyShops(shop, shops), [shop, shops]);
  if (!near.length) return null;
  return (
    <div className="mt-7">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Other growers near {shop.city}</p>
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {near.map(({ shop: other, dist }) => (
          <button
            key={other.id}
            onClick={() => navigate({ screen: "shop", shopId: other.id })}
            className="shrink-0 w-40 border border-stone-200 rounded-xl overflow-hidden bg-white text-left cs-card transition"
          >
            <span className="block h-12 relative overflow-hidden">
              <BannerScene scene={other.bannerScene || defaultScene(other.id)} />
            </span>
            <span className="block p-2.5">
              <span className="block text-sm font-semibold text-stone-800 truncate">{other.name}</span>
              <span className="block cs-t10 text-stone-400 mt-0.5">{formatDistance(dist)} away</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RestockWatchButton({ product }) {
  const { me, restockWatches, toggleRestockWatch, showToast } = useApp();
  if (product.status !== "sold_out") return null;
  const watching = !!restockWatches?.[product.id];
  return (
    <button
      onClick={async () => {
        if (!me) return;
        const res = await toggleRestockWatch(product.id);
        showToast(res?.added ? "We'll let you know when it's back" : "Alert removed");
      }}
      disabled={!me}
      className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-semibold text-sm border transition ${
        watching ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "border-stone-200 text-stone-700 hover:bg-stone-50"
      }`}
    >
      <Bell size={15} /> {watching ? "You'll be notified" : "Notify me when back in stock"}
    </button>
  );
}

function VendorUpdatesTab({ shop }) {
  const { updateShop, showToast } = useApp();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("fresh");
  const updates = [...(shop.updates || [])].sort((a, b) => b.createdAt - a.createdAt);

  const post = async () => {
    if (!body.trim()) return;
    const next = [{ id: uid("upd"), kind, body: body.trim(), createdAt: Date.now() }, ...(shop.updates || [])];
    await updateShop(shop.id, { updates: next });
    setBody("");
    showToast("Update posted — followers will see it");
  };

  return (
    <div>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Post an update</p>
      <p className="cs-t11 text-stone-500 mb-3">Goes to everyone who has favourited your shop, and sits at the top of your storefront.</p>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {UPDATE_KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            className="px-2.5 py-1 rounded-full cs-t11 font-semibold border transition"
            style={
              kind === k.id
                ? { background: k.tint, color: "#fff", borderColor: k.tint }
                : { background: "#fff", color: "#57534e", borderColor: "#e7e5e4" }
            }
          >
            {k.label}
          </button>
        ))}
      </div>
      <TextField
        value={body}
        onChange={setBody}
        label="Your update"
        placeholder="Basil came off this morning, plenty left…"
        multiline
        rows={3}
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-2 outline-none focus:border-emerald-700"
      />
      <button onClick={post} disabled={!body.trim()} className="w-full bg-emerald-800 text-white font-semibold py-2.5 rounded-xl disabled:opacity-40 mb-6">
        Post update
      </button>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Posted ({updates.length})</p>
      <div className="flex flex-col gap-2">
        {updates.map((u) => (
          <div key={u.id} className="flex items-start gap-2 border border-stone-200 rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="cs-t10 font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: updateKind(u.kind).bg, color: updateKind(u.kind).tint }}>
                  {updateKind(u.kind).label}
                </span>
                <span className="cs-t10 text-stone-400">{timeAgo(u.createdAt)}</span>
              </div>
              <p className="text-sm text-stone-700">{u.body}</p>
            </div>
            <button
              onClick={() => updateShop(shop.id, { updates: (shop.updates || []).filter((x) => x.id !== u.id) })}
              className="text-stone-300 hover:text-rose-600 shrink-0 p-1"
              aria-label="Delete update"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!updates.length && <p className="text-sm text-stone-400">Nothing posted yet.</p>}
      </div>
    </div>
  );
}

function ShopToolsTab({ shop }) {
  const { updateShop, products, showToast } = useApp();
  const faq = shop.faq || [];
  const shopUrl = `https://cropswap.com/s/${shop.handle}`;
  const demand = useMemo(() => demandNear(shop, SEEDED_SEARCHES, products), [shop, products]);

  const editFaq = (id, part) => updateShop(shop.id, { faq: faq.map((f) => (f.id === id ? { ...f, ...part } : f)) });

  return (
    <div>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">What buyers near you are searching</p>
      <div className="border border-stone-200 rounded-xl p-3.5 mb-6 bg-white">
        {demand.terms.length === 0 ? (
          <p className="text-sm text-stone-400">Not enough local searches yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {demand.terms.map((t) => (
                <span key={t.term} className="px-2.5 py-1 rounded-full bg-stone-100 cs-t11 font-semibold text-stone-700">
                  {t.term} <span className="text-stone-400">{t.count}</span>
                </span>
              ))}
            </div>
            {demand.gaps.length > 0 && (
              <div className="border-t border-stone-100 pt-2.5">
                <p className="cs-t11 text-stone-500 mb-1.5">Demand you don't currently list:</p>
                {demand.gaps.map((g) => (
                  <p key={g.term} className="text-sm text-stone-800 font-semibold">
                    {g.count} searches for <span className="text-emerald-800">{g.term}</span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Printable code for your stall</p>
      <div className="border border-stone-200 rounded-xl p-4 mb-6 bg-white flex items-center gap-4">
        <QrCode text={shopUrl} size={120} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 mb-1">Scan to open your shop</p>
          <p className="cs-t11 text-stone-500 break-words mb-2">{shopUrl}</p>
          <button onClick={() => { window.print(); showToast("Use your browser's print dialog"); }} className="cs-t11 font-semibold text-emerald-800">
            Print this page
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Frequently asked</p>
        <button
          onClick={() => updateShop(shop.id, { faq: [...faq, { id: uid("faq"), q: "New question", a: "" }] })}
          className="cs-t11 font-semibold text-emerald-800 flex items-center gap-1"
        >
          <Plus size={13} /> Add
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {faq.map((item) => (
          <div key={item.id} className="border border-stone-200 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <TextField
                  value={item.q}
                  onChange={(v) => editFaq(item.id, { q: v })}
                  label="Question"
                  placeholder="Do you deliver?"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-emerald-700"
                />
                <TextField
                  value={item.a}
                  onChange={(v) => editFaq(item.id, { a: v })}
                  label="Answer"
                  placeholder="Pickup only, Thursdays and Saturdays."
                  multiline
                  rows={2}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-700"
                />
              </div>
              <button onClick={() => updateShop(shop.id, { faq: faq.filter((f) => f.id !== item.id) })} className="text-stone-300 hover:text-rose-600 shrink-0 p-1" aria-label="Remove question">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!faq.length && <p className="text-sm text-stone-400">No questions yet. Adding three or four cuts down repeat messages.</p>}
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 20: FAVORITES VIEW
============================================================================ */
function FavoritesView() {
  const { products, shops, favProducts, favShops, shopsById, userLoc } = useApp();
  const [tab, setTab] = useState("products");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const favProductsRaw = useMemo(() => products.filter((p) => favProducts[p.id]), [products, favProducts]);
  const filteredProducts = useMemo(
    () =>
      sortProducts(
        applyFilters(favProductsRaw, { ...filters, search, minPrice: filters.minPrice === "" ? undefined : Number(filters.minPrice), maxPrice: filters.maxPrice === "" ? undefined : Number(filters.maxPrice), shopsById, userLoc }),
        filters.sortBy,
        shopsById,
        userLoc
      ),
    [favProductsRaw, filters, search, shopsById, userLoc]
  );
  const productsByShop = useMemo(() => {
    const map = {};
    products.forEach((pr) => {
      (map[pr.shopId] = map[pr.shopId] || []).push(pr);
    });
    return map;
  }, [products]);

  const favShopList = useMemo(() => {
    const saved = shops.filter((sh) => favShops[sh.id]);
    const filtered = applyShopFilters(saved, {
      search,
      categories: filters.categories,
      maxDistance: filters.maxDistance,
      minRating: filters.minRating,
      verifiedOnly: filters.verifiedOnly,
      openOnly: filters.openOnly,
      userLoc,
      productsByShop,
    });
    return sortShops(filtered, filters.sortBy, userLoc);
  }, [shops, favShops, search, filters, userLoc, productsByShop]);

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <h1 className="text-2xl font-bold text-stone-900 mb-4" style={displayFont}>Your Favorites</h1>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-stone-100 rounded-full px-3.5 py-2.5">
            <Search size={16} className="text-stone-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your favorites" className="bg-transparent outline-none text-sm w-full" />
          </div>
          <button onClick={() => setFilterOpen(true)}><IconButton icon={Filter} label="Filters" /></button>
        </div>
        <div className="flex gap-1 mb-5 bg-stone-100 rounded-full p-1 w-fit">
          <button onClick={() => setTab("products")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === "products" ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>Products ({filteredProducts.length})</button>
          <button onClick={() => setTab("shops")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === "shops" ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>Shops ({favShopList.length})</button>
        </div>

        {tab === "products" &&
          (filteredProducts.length === 0 ? (
            <EmptyState icon={Heart} title="No favorite products yet" body="Tap the heart on any listing to save it here." />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ))}
        {tab === "shops" &&
          (favShopList.length === 0 ? (
            <EmptyState icon={Store} title="No favorite shops yet" body="Follow shops you like to keep up with what they list." />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
              {favShopList.map((s) => (
                <ShopCard key={s.id} shop={s} />
              ))}
            </div>
          ))}
      </div>
      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} setFilters={setFilters} mode={tab === "shops" ? "shops" : "products"} />
    </div>
  );
}

/* ============================================================================
   SECTION 21: MESSAGES VIEW
============================================================================ */
function MessagesView({ initialWithUserId, initialWithUserName, initialWithUserAvatar, initialCid }) {
  const { me, conversations, ensureConversation, updateMe, showToast } = useApp();
  const [selectedCid, setSelectedCid] = useState(initialCid || null);
  const [activeOther, setActiveOther] = useState(initialWithUserId ? { id: initialWithUserId, name: initialWithUserName, avatar: initialWithUserAvatar } : null);
  const [text, setText] = useState("");
  const [showSafetyNote, setShowSafetyNote] = useState(true);
  const initRan = useRef(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (initRan.current || !initialWithUserId) return;
    initRan.current = true;
    (async () => {
      const cid = await ensureConversation({ id: initialWithUserId, name: initialWithUserName, avatar: initialWithUserAvatar });
      setSelectedCid(cid);
    })();
  }, [initialWithUserId, initialWithUserName, initialWithUserAvatar, ensureConversation]);

  useEffect(() => {
    if (selectedCid && !activeOther) {
      const found = conversations.find((c) => c.id === selectedCid);
      if (found) setActiveOther({ id: found.otherUserId, name: found.otherUserName, avatar: found.otherUserAvatar });
    }
  }, [selectedCid, conversations, activeOther]);

  const { messages, send, blockedByOther } = useMessages(me, selectedCid, activeOther);
  const isBlocked = !!activeOther && (me.blockedUserIds || []).includes(activeOther.id);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || isBlocked || blockedByOther) return;
    const outgoing = text;
    setText("");
    const res = await send(outgoing);
    if (res && res.reason === "blocked") showToast("This person isn't accepting messages right now");
  };

  // Reporting files the report with recent context, then blocks — someone you
  // report is someone you almost certainly don't want to keep hearing from.
  const handleReport = async () => {
    if (!activeOther) return;
    const report = {
      id: uid("report"),
      reporterId: me.id,
      reportedUserId: activeOther.id,
      reportedUserName: activeOther.name,
      conversationId: selectedCid,
      recentMessages: messages.slice(-5).map((m) => ({ senderId: m.senderId, body: m.body })),
      createdAt: Date.now(),
      status: "open",
    };
    const existing = await getJSON("reports:queue", true, []);
    await setJSON("reports:queue", [report, ...existing].slice(0, 200), true);
    const set = new Set(me.blockedUserIds || []);
    set.add(activeOther.id);
    updateMe({ blockedUserIds: Array.from(set) });
    showToast("Reported and blocked — our team will review this");
  };

  const openConvo = (c) => {
    setSelectedCid(c.id);
    setActiveOther({ id: c.otherUserId, name: c.otherUserName, avatar: c.otherUserAvatar });
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className={`${selectedCid ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col border-r border-stone-200 overflow-y-auto`}>
        <h1 className="text-xl font-bold text-stone-900 px-4 pt-4 pb-3" style={displayFont}>Messages</h1>
        {conversations.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No conversations yet" body="Message a vendor from any shop or listing page." />
        ) : (
          conversations.map((c) => (
            <button key={c.id} onClick={() => openConvo(c)} className={`flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition ${selectedCid === c.id ? "bg-stone-50" : ""}`}>
              <Avatar emoji={c.otherUserAvatar} name={c.otherUserName} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-stone-800 truncate">{c.otherUserName}</p>
                <p className="text-xs text-stone-400 truncate">{c.lastMessage || "Say hello…"}</p>
              </div>
              <span className="cs-t10 text-stone-400 shrink-0">{timeAgo(c.lastAt)}</span>
            </button>
          ))
        )}
      </div>

      {selectedCid ? (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
            <button onClick={() => setSelectedCid(null)} className="md:hidden" aria-label="Back to list"><ArrowLeft size={18} /></button>
            <Avatar emoji={activeOther?.avatar} name={activeOther?.name} size="sm" />
            <p className="font-semibold text-sm text-stone-800 flex-1">{activeOther?.name}</p>
            {isBlocked ? (
              <button onClick={() => updateMe({ blockedUserIds: (me.blockedUserIds || []).filter((id) => id !== activeOther.id) })} className="text-xs font-semibold text-emerald-700">Unblock</button>
            ) : (
              <>
                <button onClick={handleReport} className="text-xs font-semibold text-stone-400 hover:text-rose-600">Report</button>
                <button
                  onClick={() => {
                    const set = new Set(me.blockedUserIds || []);
                    set.add(activeOther.id);
                    updateMe({ blockedUserIds: Array.from(set) });
                  }}
                  className="text-xs font-semibold text-stone-400 hover:text-rose-600"
                >
                  Block
                </button>
              </>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-stone-50">
            {showSafetyNote && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 mb-1">
                <ShieldAlert size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 flex-1">
                  Meeting up? Pick a public place in daylight and tell someone where you're going. CropSwap doesn't handle payments — arrange those directly.
                </p>
                <button onClick={() => setShowSafetyNote(false)} className="text-amber-700 shrink-0" aria-label="Dismiss"><X size={14} /></button>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`cs-max75 px-3.5 py-2 rounded-2xl text-sm ${m.senderId === me.id ? "self-end bg-emerald-800 text-white rounded-br-sm" : "self-start bg-white border border-stone-200 text-stone-800 rounded-bl-sm"}`}>
                {m.body}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
          {isBlocked ? (
            <div className="p-4 text-center text-xs text-stone-400 border-t border-stone-200">You've blocked this person. Unblock to send messages.</div>
          ) : blockedByOther ? (
            <div className="p-4 text-center text-xs text-stone-400 border-t border-stone-200">You can't send messages to this person right now.</div>
          ) : (
            <div className="p-3 border-t border-stone-200 flex items-end gap-2">
              <TextField
                value={text}
                onChange={setText}
                onSubmit={(v) => {
                  if (!v.trim() || isBlocked || blockedByOther) return;
                  setText("");
                  send(v).then((res) => {
                    if (res && res.reason === "blocked") showToast("This person isn't accepting messages right now");
                  });
                }}
                multiline
                rows={1}
                label="Message"
                primaryLabel="Send"
                placeholder="Type a message…"
                className="flex-1 bg-stone-100 rounded-2xl px-4 py-2.5 text-sm outline-none resize-none leading-6"
              />
              <button onClick={handleSend} className="bg-emerald-800 text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 mb-0.5" aria-label="Send"><Send size={16} /></button>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-stone-300">
          <MessageCircle size={48} />
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 22: ACCOUNT MODAL
============================================================================ */
const SUBSCRIPTION_TIERS = [
  { id: "sprout", name: "Sprout", price: "Free", features: ["Up to 10 listings", "1 storefront theme", "Standard placement"] },
  { id: "bloom", name: "Bloom", price: "$9/mo", features: ["Unlimited listings", "All themes & banners", "Priority placement", "Vendor dashboard"] },
  { id: "harvest", name: "Harvest", price: "$19/mo", features: ["Everything in Bloom", "Verified badge review", "Advanced analytics"] },
];

function AccountModal({ open, onClose }) {
  const { me, updateMe, signOut, navigate, userLoc, setUserLoc, showToast } = useApp();
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState(me?.name || "");
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [storageReport, setStorageReport] = useState(null);
  const [checking, setChecking] = useState(false);

  // Writes a probe, reads it back, and counts what is actually stored, so a
  // persistence problem can be identified instead of guessed at.
  const runStorageCheck = async () => {
    setChecking(true);
    const lines = [];
    const probeKey = `diag:${me.id}`;
    const stamp = String(Date.now());
    const wrote = await setJSON(probeKey, { stamp }, true, { verify: true });
    lines.push({ label: "Write & verify", value: wrote ? "OK" : "FAILED", ok: wrote });

    const back = await readJSON(probeKey, true, null);
    const readOk = back.ok && back.value && back.value.stamp === stamp;
    lines.push({ label: "Read back", value: readOk ? "OK" : "FAILED", ok: readOk });

    const mineRec = await readJSON(`myReviews:${me.id}`, true, {});
    const mineCount = mineRec.ok ? Object.values(mineRec.value || {}).reduce((n, arr) => n + (arr?.length || 0), 0) : -1;
    lines.push({ label: "Your saved reviews", value: mineCount < 0 ? "unreadable" : String(mineCount), ok: mineCount >= 0 });

    const favRec = await readJSON(`favorites:${me.id}`, true, { products: {}, shops: {} });
    const favCount = favRec.ok
      ? Object.keys(favRec.value?.products || {}).length + Object.keys(favRec.value?.shops || {}).length
      : -1;
    lines.push({ label: "Your saved favourites", value: favCount < 0 ? "unreadable" : String(favCount), ok: favCount >= 0 });

    // Photographs are external requests; some embedded hosts block them outright,
    // which is invisible from the code's point of view. Ask the browser directly.
    const imageOk = await new Promise((resolve) => {
      const probe = new Image();
      const done = (v) => resolve(v);
      probe.onload = () => done(true);
      probe.onerror = () => done(false);
      probe.src = `https://images.pexels.com/photos/3696170/pexels-photo-3696170.jpeg?auto=compress&cs=tinysrgb&w=60&cb=${Date.now()}`;
      setTimeout(() => done(false), 6000);
    });
    lines.push({ label: "External photos", value: imageOk ? "allowed" : "blocked here", ok: imageOk });

    // Exercises the whole photo path without a file dialog: draw an image,
    // encode it, store it, read it back. Isolates a blocked picker from a
    // broken pipeline.
    let photoStage = "canvas";
    let photoOk = false;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 24;
      canvas.height = 24;
      const c = canvas.getContext("2d");
      c.fillStyle = "#047857";
      c.fillRect(0, 0, 24, 24);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      if (!dataUrl.startsWith("data:image")) throw new Error("encode");
      photoStage = "store";
      const id = await savePhoto(dataUrl);
      if (!id) throw new Error("store");
      photoStage = "read";
      const back = await readJSON(`photo:${id}`, true, null);
      if (!back.ok || !back.value?.dataUrl) throw new Error("read");
      photoOk = true;
    } catch (e) {
      /* photoStage holds the failing step */
    }
    lines.push({
      label: "Photo pipeline",
      value: photoOk ? "OK" : `failed at ${photoStage}`,
      ok: photoOk,
    });

    const market = await readJSON(MARKET_KEY, true, null);
    lines.push({ label: "Market data", value: market.ok && market.value ? "OK" : "missing", ok: !!(market.ok && market.value) });

    setStorageReport(lines);
    setChecking(false);
  };

  const exportData = async () => {
    try {
      const favorites = await getJSON(`favorites:${me.id}`, true, { products: {}, shops: {} });
      const savedSearches = await getJSON(`savedSearches:${me.id}`, false, []);
      const payload = { exportedAt: new Date().toISOString(), profile: me, favorites, savedSearches };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cropswap-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Download started");
    } catch (e) {
      showToast("Couldn't prepare the download — try again");
    }
  };

  useEffect(() => setName(me?.name || ""), [me?.id]);
  useEffect(() => {
    if (tab !== "blocked" || !me) return;
    (async () => {
      const list = [];
      for (const id of me.blockedUserIds || []) {
        const u = await getJSON(`users:${id}`, true, null);
        if (u) list.push(u);
      }
      setBlockedUsers(list);
    })();
  }, [tab, me]);

  if (!me) return null;
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "vendor", label: "Selling", icon: Store },
    { id: "subscription", label: "Plan", icon: Sparkles },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "places", label: "Places", icon: MapPin },
    { id: "blocked", label: "Blocked", icon: AlertCircle },
    { id: "data", label: "Data", icon: Package },
  ];

  return (
    <Modal open={open} onClose={onClose} labelledBy="account-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="account-title" className="text-lg font-bold text-stone-900" style={displayFont}>Your account</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} className="text-stone-400" /></button>
        </div>

        <div className="flex gap-1 overflow-x-auto mb-5 -mx-1 px-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${tab === t.id ? "bg-emerald-800 text-white" : "bg-stone-100 text-stone-500"}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <div>
            <div className="flex justify-center mb-4">
              <PhotoPicker
                photoId={me.avatarPhotoId}
                onChange={(id) => updateMe({ avatarPhotoId: id })}
                shape="round"
                square
                size="lg"
                label="Tap to upload a photo"
                hint="Taken from your phone, cropped square"
              />
            </div>
            <p className="text-xs font-bold text-stone-400 uppercase mb-1.5">{me.avatarPhotoId ? "Or pick a symbol instead" : "Avatar"}</p>
            <div className="grid grid-cols-6 gap-1.5 mb-4">
              {AVATAR_EMOJI.map((em) => (
                <button key={em} onClick={() => updateMe({ avatar: em })} className={`text-xl p-1.5 rounded-lg transition ${me.avatar === em ? "bg-emerald-100 ring-2 ring-emerald-600" : "hover:bg-stone-100"}`}>{em}</button>
              ))}
            </div>
            <p className="text-xs font-bold text-stone-400 uppercase mb-1.5">Display name</p>
            <TextField
              value={name}
              onChange={setName}
              onBlur={(v) => {
                const trimmed = (v || "").trim() || me.name;
                if (trimmed !== me.name) {
                  updateMe({ name: trimmed });
                  showToast("Display name updated");
                } else if (trimmed !== v) {
                  // Cleared or whitespace-only — snap the field back to the name
                  // that's actually saved instead of leaving it visually blank.
                  setName(trimmed);
                }
              }}
              label="Display name"
              placeholder="Your name"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-2 outline-none focus:border-emerald-700"
            />
            <p className="text-xs text-stone-400">Member since {new Date(me.createdAt).toLocaleDateString()}</p>
          </div>
        )}

        {tab === "vendor" &&
          (me.isVendor ? (
            <div>
              <p className="text-sm text-stone-600 mb-4">You're set up as a vendor.</p>
              <button onClick={() => { onClose(); navigate({ screen: "storeEditor" }); }} className="w-full bg-emerald-800 text-white font-semibold py-2.5 rounded-xl mb-2">Edit my storefront</button>
              <button onClick={() => { onClose(); navigate({ screen: "dashboard" }); }} className="w-full border border-stone-200 font-semibold py-2.5 rounded-xl text-stone-700">View dashboard</button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-stone-600 mb-4">Not selling yet — set up a free storefront any time.</p>
              <button onClick={() => { onClose(); navigate({ screen: "store" }); }} className="w-full bg-emerald-800 text-white font-semibold py-2.5 rounded-xl">Start selling</button>
            </div>
          ))}

        {tab === "subscription" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-stone-400 mb-1">Preview only — no payment is collected here.</p>
            {SUBSCRIPTION_TIERS.map((t) => (
              <div key={t.id} className={`border-2 rounded-xl p-3.5 ${me.subscriptionTier === t.id ? "border-emerald-700 bg-emerald-50" : "border-stone-200"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-bold text-stone-900">{t.name}</p>
                  <p className="font-bold text-stone-700">{t.price}</p>
                </div>
                <ul className="text-xs text-stone-500 mb-3 space-y-0.5">
                  {t.features.map((f) => <li key={f}>• {f}</li>)}
                </ul>
                <button onClick={() => updateMe({ subscriptionTier: t.id })} disabled={me.subscriptionTier === t.id} className="w-full text-xs font-semibold py-2 rounded-lg bg-white border border-stone-300 disabled:opacity-40">
                  {me.subscriptionTier === t.id ? "Current plan" : `Switch to ${t.name}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "notifications" && (
          <div>
            {[
              { key: "master", label: "All notifications" },
              { key: "sound", label: "Chime sound" },
              { key: "messages", label: "New messages" },
              { key: "reviews", label: "New reviews on your shop" },
              { key: "favorites", label: "New favorites on your shop" },
            ].map((row, i, arr) => (
              <div key={row.key} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? "border-b border-stone-100" : ""}`}>
                <span className="text-sm font-medium flex items-center gap-1.5">
                  {row.key === "sound" && (me.notificationPrefs?.sound ? <Volume2 size={14} /> : <VolumeX size={14} />)}
                  {row.label}
                </span>
                <ToggleSwitch checked={!!me.notificationPrefs?.[row.key]} onChange={(v) => updateMe({ notificationPrefs: { ...me.notificationPrefs, [row.key]: v } })} />
              </div>
            ))}
          </div>
        )}

        {tab === "places" && (
          <div>
            <p className="text-sm text-stone-500 mb-3">Save the places you shop from — handy if you split time between towns.</p>
            <div className="flex flex-col gap-2 mb-4">
              {(me.savedPlaces || []).map((pl) => (
                <div key={pl.label} className="flex items-center gap-2 border border-stone-200 rounded-xl px-3 py-2.5">
                  <MapPin size={14} className="text-emerald-700 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-stone-700">{pl.label}</span>
                  <button onClick={() => { setUserLoc(pl); onClose(); showToast(`Now browsing near ${pl.label}`); }} className="text-xs font-semibold text-emerald-800">Use</button>
                  <button onClick={() => updateMe({ savedPlaces: (me.savedPlaces || []).filter((x) => x.label !== pl.label) })} className="text-stone-300 hover:text-rose-600" aria-label="Remove"><X size={14} /></button>
                </div>
              ))}
              {(me.savedPlaces || []).length === 0 && <p className="text-sm text-stone-400">No saved places yet.</p>}
            </div>
            <button
              onClick={() => {
                const exists = (me.savedPlaces || []).some((p) => p.label === userLoc.label);
                if (exists) { showToast("Already saved"); return; }
                updateMe({ savedPlaces: [...(me.savedPlaces || []), userLoc] });
                showToast(`Saved ${userLoc.label}`);
              }}
              className="w-full border border-stone-200 font-semibold py-2.5 rounded-xl text-stone-700 text-sm"
            >
              Save current location ({userLoc.label})
            </button>
          </div>
        )}

        {tab === "data" && (
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase mb-2">Storage check</p>
            <button onClick={runStorageCheck} disabled={checking} className="w-full border border-stone-200 font-semibold py-2.5 rounded-xl text-stone-700 text-sm mb-2 disabled:opacity-50">
              {checking ? "Checking…" : "Test saving & loading"}
            </button>
            {storageReport && (
              <div className="border border-stone-200 rounded-xl p-3 mb-5 bg-stone-50">
                {storageReport.map((line) => (
                  <p key={line.label} className="cs-t11 flex items-center justify-between py-0.5">
                    <span className="text-stone-600">{line.label}</span>
                    <span className={line.ok ? "text-emerald-700 font-semibold" : "text-rose-600 font-semibold"}>{line.value}</span>
                  </p>
                ))}
              </div>
            )}
            {!storageReport && <p className="cs-t11 text-stone-400 mb-5">Run this if something you saved does not reappear.</p>}

            <p className="text-xs font-bold text-stone-400 uppercase mb-2">Your data</p>
            <button onClick={exportData} className="w-full border border-stone-200 font-semibold py-2.5 rounded-xl text-stone-700 text-sm mb-2">
              Download my data (JSON)
            </button>
            <p className="text-xs text-stone-400 mb-5">Includes your profile, favorites, saved places, and settings.</p>

            <p className="text-xs font-bold text-stone-400 uppercase mb-2">Delete account</p>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="w-full border border-rose-200 text-rose-600 font-semibold py-2.5 rounded-xl text-sm">
                Delete my account
              </button>
            ) : (
              <div className="border border-rose-200 bg-rose-50 rounded-xl p-3">
                <p className="text-xs text-rose-800 mb-2.5">This removes your profile and sign-in from this device. This can't be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 text-sm font-semibold text-stone-600 py-2">Keep my account</button>
                  <button onClick={() => { signOut(); onClose(); }} className="flex-1 bg-rose-600 text-white text-sm font-semibold rounded-lg py-2">Delete account</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "blocked" &&
          (blockedUsers.length === 0 ? (
            <p className="text-sm text-stone-400">No blocked members.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {blockedUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar emoji={u.avatar} name={u.name} size="sm" />
                  <span className="flex-1 text-sm font-medium text-stone-700">{u.name}</span>
                  <button onClick={() => updateMe({ blockedUserIds: (me.blockedUserIds || []).filter((id) => id !== u.id) })} className="text-xs font-semibold text-emerald-700">Unblock</button>
                </div>
              ))}
            </div>
          ))}

        <button onClick={() => { signOut(); onClose(); }} className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-stone-400 mt-6 pt-4 border-t border-stone-100">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================================
   SECTION 23: NOTIFICATIONS MODAL
============================================================================ */
const NOTIF_ICON = { message: MessageCircle, review: Star, favorite: Heart };
function NotificationsModal({ open, onClose, navigate, onOpenProduct }) {
  const { notifications, markAllRead, unreadCount, removeNotification, clearNotifications } = useApp();
  const [confirmClear, setConfirmClear] = useState(false);
  const handleClick = (n) => {
    markAllRead();
    onClose();
    if (n.route?.screen === "product" && n.route.productId) onOpenProduct(n.route.productId);
    else if (n.route) navigate(n.route);
  };
  return (
    <Modal open={open} onClose={onClose} labelledBy="notif-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="notif-title" className="text-lg font-bold text-stone-900" style={displayFont}>Notifications</h2>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-emerald-800">Mark all read</button>}
            {notifications.length > 0 && (
              <button onClick={() => setConfirmClear(true)} className="text-xs font-semibold text-stone-400 hover:text-rose-600">Clear all</button>
            )}
            <button onClick={onClose} aria-label="Close"><X size={20} className="text-stone-400" /></button>
          </div>
        </div>
        {confirmClear && (
          <div className="border border-rose-200 bg-rose-50 rounded-xl p-3 mb-3">
            <p className="text-xs text-rose-800 mb-2.5">Delete all notifications? This can't be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmClear(false)} className="flex-1 text-sm font-semibold text-stone-600 py-1.5">Keep them</button>
              <button
                onClick={() => {
                  clearNotifications();
                  setConfirmClear(false);
                }}
                className="flex-1 bg-rose-600 text-white text-sm font-semibold rounded-lg py-1.5"
              >
                Delete all
              </button>
            </div>
          </div>
        )}
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="You're all caught up" />
        ) : (
          <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
            {notifications.map((n) => {
              const Icon = NOTIF_ICON[n.type] || Bell;
              return (
                <div key={n.id} className={`flex items-start gap-2 rounded-xl transition ${!n.read ? "bg-emerald-50" : "hover:bg-stone-50"}`}>
                  <button onClick={() => handleClick(n)} className="flex items-start gap-3 p-3 text-left flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 relative">
                      <Icon size={14} className={n.read ? "text-stone-400" : "text-emerald-700"} />
                      {!n.read && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-600 border border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${n.read ? "font-medium text-stone-600" : "font-semibold text-stone-900"}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-stone-500 truncate">{n.body}</p>}
                      <p className="cs-t10 text-stone-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeNotification(n.id)}
                    className="shrink-0 self-center p-2 mr-1 text-stone-300 hover:text-rose-600 transition"
                    aria-label={`Delete notification: ${n.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}


/* Deterministic two-year history: slow early growth, a sharp lift over the last
   three months, and the recent floors the vendor expects to see. */
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATS_MONTHS = 24;

function buildVendorStats(seedKey, now = new Date()) {
  let seed = String(seedKey || "shop").split("").reduce((a, c) => a + c.charCodeAt(0), 17);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const months = [];
  for (let i = STATS_MONTHS - 1; i >= 0; i--) {
    const idx = STATS_MONTHS - 1 - i; // 0 = oldest, 23 = current
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const isCurrent = i === 0;
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const days = isCurrent ? now.getDate() : daysInMonth;

    // Baseline daily views, and a floor the month must not fall below.
    let base;
    let floor = 0;
    if (idx <= 19) base = 5 + idx * 1.6;          // slow climb, roughly 5 to 36
    else if (idx === 20) base = 52;               // things start moving
    else if (idx === 21) { base = 96; floor = 88; }
    else if (idx === 22) { base = 112; floor = 88; }
    else { base = 162; floor = 145; }             // current month

    const daily = [];
    for (let day = 1; day <= days; day++) {
      const weekday = new Date(d.getFullYear(), d.getMonth(), day).getDay();
      const weekendLift = weekday === 0 || weekday === 6 ? 1.18 : 1;
      const noise = 0.88 + rand() * 0.26;
      daily.push({ day, views: Math.max(floor, Math.round(base * weekendLift * noise)) });
    }

    const views = daily.reduce((a, x) => a + x.views, 0);
    const busiest = daily.reduce((best, x) => (x.views > best.views ? x : best), daily[0]);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      days,
      daily,
      views,
      avgPerDay: Math.round(views / days),
      busiestDay: busiest,
      favorites: Math.round(views * (0.05 + rand() * 0.02)),
      messages: Math.round(views * (0.015 + rand() * 0.012)),
      shares: Math.round(views * (0.008 + rand() * 0.008)),
      newFollowers: Math.round(views * (0.02 + rand() * 0.01)),
    });
  }
  return months;
}

/* ============================================================================
   SECTION 24: VENDOR DASHBOARD
============================================================================ */
function seededTrend(seedStr, endValue, points = 7) {
  let seed = String(seedStr).split("").reduce((s, c) => s + c.charCodeAt(0), 7);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const arr = [];
  let v = Math.max(2, Math.round(endValue * 0.5));
  for (let i = 0; i < points; i++) {
    v = Math.max(1, Math.round(v + (rand() - 0.4) * Math.max(endValue, 4) * 0.3));
    arr.push(v);
  }
  arr[arr.length - 1] = endValue;
  return arr.map((val, i) => ({ day: `D${i + 1}`, views: val }));
}

function VendorDashboard({ navigate }) {
  const { me, shopsById, products } = useApp();
  const shop = me?.shopId ? shopsById[me.shopId] : null;
  const { avgRating, count } = useReviews("shop", shop?.id || "none");

  const months = useMemo(() => buildVendorStats(shop?.id || "none"), [shop?.id]);
  const years = useMemo(() => [...new Set(months.map((m) => m.year))].sort((a, b) => b - a), [months]);
  const latest = months[months.length - 1];
  const [year, setYear] = useState(latest.year);
  const [monthKey, setMonthKey] = useState(latest.key);

  const monthsInYear = useMemo(() => months.filter((m) => m.year === year), [months, year]);
  const selected = useMemo(
    () => months.find((m) => m.key === monthKey) || monthsInYear[monthsInYear.length - 1] || latest,
    [months, monthKey, monthsInYear, latest]
  );
  const prior = useMemo(() => {
    const i = months.findIndex((m) => m.key === selected.key);
    return i > 0 ? months[i - 1] : null;
  }, [months, selected]);

  const changePct = prior && prior.views ? Math.round(((selected.views - prior.views) / prior.views) * 100) : null;

  if (!shop) {
    return <EmptyState icon={TrendingUp} title="No storefront yet" action={<button onClick={() => navigate({ screen: "store" })} className="text-sm font-semibold text-emerald-800">Start selling</button>} />;
  }
  const shopProducts = products.filter((p) => p.shopId === shop.id);

  const cards = [
    { label: "Views", value: selected.views.toLocaleString(), sub: `${selected.avgPerDay}/day`, icon: Eye },
    { label: "New favourites", value: selected.favorites, sub: "saved your shop", icon: Heart },
    { label: "Messages", value: selected.messages, sub: "buyers reached out", icon: MessageCircle },
    { label: "Shares", value: selected.shares, sub: "sent to friends", icon: Share2 },
    { label: "New followers", value: selected.newFollowers, sub: "following updates", icon: Users },
    { label: "Avg rating", value: count > 0 ? avgRating.toFixed(1) : "—", sub: `${count} review${count === 1 ? "" : "s"}`, icon: Star },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <button onClick={() => navigate({ screen: "shop", shopId: shop.id })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
          <ArrowLeft size={15} /> Back to storefront
        </button>
        <h1 className="text-2xl font-bold text-stone-900 mb-1" style={displayFont}>{shop.name} dashboard</h1>
        <p className="text-stone-400 text-sm mb-4">{shopProducts.length} active listings · two years of history</p>

        <div className="flex gap-2 mb-3">
          <select
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value);
              setYear(y);
              const first = months.filter((m) => m.year === y).slice(-1)[0];
              if (first) setMonthKey(first.key);
            }}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white font-semibold"
            aria-label="Select year"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={selected.key}
            onChange={(e) => setMonthKey(e.target.value)}
            className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white font-semibold"
            aria-label="Select month"
          >
            {monthsInYear.map((m) => (
              <option key={m.key} value={m.key}>{MONTH_NAMES[m.month]}</option>
            ))}
          </select>
        </div>

        {changePct !== null && (
          <p className={`text-sm font-semibold mb-4 ${changePct >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
            {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct)}% vs {prior.label}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="bg-white border border-stone-200 rounded-xl p-3.5">
              <c.icon size={15} className="text-emerald-700 mb-1.5" />
              <p className="text-xl font-bold text-stone-900" style={displayFont}>{c.value}</p>
              <p className="cs-t11 text-stone-500">{c.label}</p>
              <p className="cs-t10 text-stone-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-xs font-bold text-stone-400 uppercase">Daily views · {selected.label}</p>
            <p className="cs-t11 text-stone-500">Best day: {selected.busiestDay.day} ({selected.busiestDay.views})</p>
          </div>
          <div style={{ width: "100%", height: 190 }}>
            <ResponsiveContainer>
              <LineChart data={selected.daily}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#a8a29e" interval={Math.max(1, Math.floor(selected.days / 8))} />
                <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={32} />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#065f46" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs font-bold text-stone-400 uppercase mb-3">Monthly views · last two years</p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={months.map((m) => ({ name: `${MONTH_NAMES[m.month]} ${String(m.year).slice(2)}`, views: m.views }))}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#a8a29e" interval={3} />
                <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={38} />
                <Tooltip />
                <Bar dataKey="views" fill="#4d7c4a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 25: STORE SCREEN (own shop or become-a-vendor prompt)
============================================================================ */
function StoreScreen({ navigate }) {
  const { me, createShopForUser, updateMe } = useApp();
  const [shopName, setShopName] = useState("");
  const [creating, setCreating] = useState(false);

  if (me.isVendor && me.shopId) {
    return <ShopProfileView shopId={me.shopId} navigate={navigate} />;
  }

  return (
    <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="text-5xl mb-4">🧺</div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2" style={displayFont}>Start selling on CropSwap</h2>
        <p className="text-stone-500 mb-5">Set up a free storefront in seconds — customize everything after.</p>
        <TextField
          value={shopName}
          onChange={setShopName}
          label="Farm or shop name"
          placeholder="Your farm or shop name"
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-emerald-700 text-left"
        />
        <button
          onClick={async () => {
            setCreating(true);
            const shop = await createShopForUser(me, shopName.trim());
            await updateMe({ isVendor: true, shopId: shop.id });
            setCreating(false);
            navigate({ screen: "storeEditor" });
          }}
          disabled={creating || !shopName.trim()}
          className="w-full bg-emerald-800 text-white font-semibold py-3 rounded-xl disabled:opacity-40"
        >
          {creating ? "Setting up…" : "Create my storefront"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 26: LOADING SCREEN + ONBOARDING
============================================================================ */
function LoadingScreen({ inline }) {
  const content = (
    <div className="flex flex-col items-center gap-3 text-emerald-800">
      <Loader2 size={28} className="animate-spin" />
      <span className="text-sm font-medium text-stone-400">Loading CropSwap…</span>
    </div>
  );
  if (inline) return <div className="flex items-center justify-center py-16">{content}</div>;
  return (
    <div className="h-screen w-full flex items-center justify-center bg-stone-50" style={{ height: "100dvh" }}>
      <link rel="stylesheet" href={FONT_LINK_HREF} />
      {content}
    </div>
  );
}

function Onboarding({ onCreate }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_EMOJI[0]);
  const [busy, setBusy] = useState(false);

  return (
    <div className="h-screen w-full flex items-start justify-center bg-stone-50 p-6 pt-8 overflow-y-auto" style={{ ...bodyFont, height: "100dvh" }}>
      <link rel="stylesheet" href={FONT_LINK_HREF} />
      <GlobalStyles />
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-2xl mb-1 justify-center" style={displayFont}>
          <Sparkles size={24} /> CropSwap
        </div>
        <p className="text-center text-stone-500 mb-7 text-sm">A hyper-local, nationwide hub connecting growers and buyers.</p>
        <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Pick an avatar</p>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {AVATAR_EMOJI.map((em) => (
              <button key={em} onClick={() => setAvatar(em)} className={`text-2xl p-2 rounded-xl transition ${avatar === em ? "bg-emerald-100 ring-2 ring-emerald-600" : "hover:bg-stone-100"}`}>{em}</button>
            ))}
          </div>
          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Your name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should we call you?"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
          />
          <button
            onClick={async () => {
              setBusy(true);
              await onCreate({ name: name.trim() || "Guest", avatar });
              setBusy(false);
            }}
            disabled={busy}
            className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition"
          >
            {busy ? "Setting up…" : "Get started"}
          </button>
        </div>
        <p className="text-center cs-t11 text-stone-400 mt-4">This is how other growers and buyers will see you — you can change it anytime in your account.</p>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 27: ROOT SHELL — wires all hooks into context, owns routing
============================================================================ */
function RootShell() {
  const { me, hasSession, loading: meLoading, createProfile, updateMe, signOut } = useCurrentUser();
  const market = useMarketData();
  const fav = useFavorites(me);
  const notif = useNotifications(me);
  const convo = useConversations(me);
  const helpful = useHelpfulMarks(me);
  const mineReviews = useMyReviews(me);
  const restock = useRestockWatch(me);
  const photos = usePhotoLibrary();

  const viewportHeight = useViewportHeight();
  const imageSupport = useExternalImageSupport();
  const [photoNoteDismissed, setPhotoNoteDismissed] = useState(false);
  const [textSheet, setTextSheet] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exploreView, setExploreView] = useState("grid");
  const saveSearchRef = useRef(null);
  const registerSaveSearch = useCallback((fn) => {
    saveSearchRef.current = fn ? fn() : null;
  }, []);
  const [route, setRoute] = useState({ screen: "explore" });
  const [userLoc, setUserLoc] = useState({ label: "Rathdrum, ID", lat: 47.8121, lng: -116.8974 });
  const [locPickerOpen, setLocPickerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [openProductId, setOpenProductId] = useState(null);
  const [toast, setToast] = useState("");

  // One handler covers every text field in the app: when something gains focus,
  // centre it in whatever space the keyboard leaves.
  useEffect(() => {
    const onFocusIn = (e) => {
      const el = e.target;
      if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return;
      setTimeout(() => {
        try {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (err) {
          /* older browsers without smooth scrolling options */
        }
      }, 320);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  const navigate = useCallback((r) => setRoute(r), []);
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  // Favoriting has three effects: record the favorite, persist the new public
  // count through the market layer (so it re-renders), and tell the shop owner.
  const toggleFavorite = useCallback(
    async (type, entity) => {
      if (!me) return;
      const result = await fav.toggle(type, entity);
      if (!result) return;
      const { added, newCount } = result;
      if (type === "shop") {
        market.updateShop(entity.id, { favoriteCount: newCount });
        if (added && entity.ownerId && entity.ownerId !== me.id) {
          notifyShopOwner(entity, "favorite", `${me.name} favorited your shop`, entity.name);
        }
      } else {
        market.updateProduct(entity.shopId, entity.id, { favoriteCount: newCount });
        const shop = market.shopsById[entity.shopId];
        if (added && shop?.ownerId && shop.ownerId !== me.id) {
          notifyShopOwner(shop, "favorite", `${me.name} favorited ${entity.name}`, entity.name, {
            screen: "product",
            productId: entity.id,
          });
        }
      }
    },
    [me, fav, market]
  );

  // A simple running tally, like favorites but not per-user — every completed
  // share (not a cancelled share sheet) bumps the count. Works even when
  // signed out, since sharing itself doesn't require an account.
  const incrementShare = useCallback(
    (type, entity) => {
      if (!entity) return;
      const nextCount = (entity.shareCount || 0) + 1;
      if (type === "shop") {
        market.updateShop(entity.id, { shareCount: nextCount });
      } else {
        market.updateProduct(entity.shopId, entity.id, { shareCount: nextCount });
      }
    },
    [market]
  );

  const productsById = useMemo(() => Object.fromEntries(market.products.map((p) => [p.id, p])), [market.products]);

  const ctxValue = {
    me,
    updateMe,
    signOut,
    shops: market.shops,
    products: market.products,
    shopsById: market.shopsById,
    updateShop: market.updateShop,
    updateProduct: market.updateProduct,
    addProduct: market.addProduct,
    removeProduct: market.removeProduct,
    createShopForUser: market.createShopForUser,
    photoUrls: photos.photoUrls,
    loadPhoto: photos.loadPhoto,
    putPhoto: photos.putPhoto,
    restockWatches: restock.restockWatches,
    toggleRestockWatch: restock.toggleRestockWatch,
    myReviews: mineReviews.myReviews,
    addMyReview: mineReviews.addMyReview,
    patchMyReview: mineReviews.patchMyReview,
    dropMyReview: mineReviews.dropMyReview,
    helpfulMarks: helpful.helpfulMarks,
    toggleHelpfulMark: helpful.toggleHelpfulMark,
    favProducts: fav.favProducts,
    favShops: fav.favShops,
    toggleFavorite,
    incrementShare,
    notifications: notif.notifications,
    unreadCount: notif.unreadCount,
    markAllRead: notif.markAllRead,
    removeNotification: notif.removeNotification,
    clearNotifications: notif.clearNotifications,
    navigate,
    route,
    userLoc,
    setUserLoc,
    viewportHeight,
    globalSearch,
    setGlobalSearch,
    filters,
    setFilters,
    filterOpen,
    setFilterOpen,
    exploreView,
    setExploreView,
    registerSaveSearch,
    openTextSheet: (cfg) => setTextSheet({ ...cfg, sessionKey: uid("ts") }),
    openLocationPicker: () => setLocPickerOpen(true),
    openProduct: setOpenProductId,
    showToast,
    conversations: convo.conversations,
    ensureConversation: convo.ensureConversation,
  };

  if (meLoading) return <LoadingScreen />;
  if (!hasSession) return <AuthGate />;
  if (!me) return <Onboarding onCreate={createProfile} />;
  if (market.loading) return <LoadingScreen />;

  return (
    <AppContext.Provider value={ctxValue}>
      <link rel="stylesheet" href={FONT_LINK_HREF} />
      <GlobalStyles />
      <div className={`h-screen w-full flex flex-col overflow-hidden ${TOKENS.bg} ${TOKENS.ink}`} style={{ ...bodyFont, height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}>
        <TopBar
          onGoHome={() => navigate({ screen: "explore" })}
          onOpenFilters={() => {
            navigate({ screen: "explore" });
            setFilterOpen(true);
          }}
          filterCount={
            filters.categories.length +
            (filters.maxDistance !== null ? 1 : 0) +
            (filters.minRating > 0 ? 1 : 0) +
            (filters.inSeasonOnly ? 1 : 0) +
            (filters.verifiedOnly ? 1 : 0) +
            (filters.openOnly ? 1 : 0) +
            (filters.minPrice ? 1 : 0) +
            (filters.maxPrice ? 1 : 0)
          }
          onOpenSearch={() => navigate({ screen: "explore" })}
          onOpenNotifs={() => setNotifOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
          onOpenFavorites={() => navigate({ screen: "favorites" })}
        />
        {imageSupport === "blocked" && !photoNoteDismissed && (
          <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center gap-2">
            <AlertCircle size={13} className="text-amber-700 shrink-0" />
            <p className="cs-t11 text-amber-900 flex-1 min-w-0">
              This preview blocks external photos, so listings show illustrations. Photos appear when deployed.
            </p>
            <button onClick={() => setPhotoNoteDismissed(true)} className="text-amber-700 shrink-0" aria-label="Dismiss">
              <X size={13} />
            </button>
          </div>
        )}
        <div className="flex-1 flex overflow-hidden">
          <Sidebar route={route} navigate={navigate} />
          <main className="flex-1 flex flex-col overflow-hidden relative cs-paper">
            {route.screen === "explore" && <ExploreView navigate={navigate} />}
            {route.screen === "shop" && <ShopProfileView shopId={route.shopId} navigate={navigate} />}
            {route.screen === "store" && <StoreScreen navigate={navigate} />}
            {route.screen === "storeEditor" && <StorefrontEditor navigate={navigate} />}
            {route.screen === "favorites" && <FavoritesView />}
            {route.screen === "messages" && (
              <MessagesView
                initialWithUserId={route.withUserId}
                initialWithUserName={route.withUserName}
                initialWithUserAvatar={route.withUserAvatar}
                initialCid={route.cid}
              />
            )}
            {route.screen === "dashboard" && <VendorDashboard navigate={navigate} />}
          </main>
        </div>
        <BottomNav route={route} navigate={navigate} />
      </div>

      <ProductDetailModal product={productsById[openProductId]} open={!!openProductId} onClose={() => setOpenProductId(null)} navigate={navigate} />
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        mode={exploreView === "shops" ? "shops" : "products"}
        onSaveSearch={saveSearchRef.current}
      />
      <TextEntrySheet config={textSheet} onClose={() => setTextSheet(null)} />
      <LocationPickerModal open={locPickerOpen} onClose={() => setLocPickerOpen(false)} onPick={setUserLoc} />
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      <NotificationsModal open={notifOpen} onClose={() => setNotifOpen(false)} navigate={navigate} onOpenProduct={setOpenProductId} />

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg cs-z-sheet cs-toast-anim">
          {toast}
        </div>
      )}
    </AppContext.Provider>
  );
}

export default function CropSwapApp() {
  return <RootShell />;
}
