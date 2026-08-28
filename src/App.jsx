import React, { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext } from "react";
import {
  Search, X, Heart, MessageCircle, Send, Bell, User, Star, MapPin,
  Plus, ChevronDown, ChevronRight, Share2, LogOut, Pencil, Trash2, Store, ArrowLeft, Loader2, ThumbsUp, Camera,
  Volume2, VolumeX, Users, TrendingUp, Eye, Globe, Phone, Mail,
  Home, Package, Filter, GripVertical, BadgeCheck, AlertCircle,
  LayoutGrid, UserPlus, ShoppingBag, Sparkles, ShieldAlert, Bookmark,
  Crown, Lock, Calendar, Clock, Target, Award, Zap, TrendingDown, Megaphone,
  Bug, Save, ChevronLeft, Minus, ClipboardList, Boxes, Archive, Check, ChevronUp,
  AlertTriangle, Image as ImageIcon, Video, PlayCircle,
  DollarSign, Receipt, Repeat, UserCheck, Percent, CreditCard, Landmark, Rss,
  Folder, MoreVertical, Inbox, Menu, Tag,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, Legend, ComposedChart } from "recharts";
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
  { id: "Baked", label: "Baked Goods", tint: "#8b5e34", accent: "bg-orange-100 text-orange-800 border-orange-200" },
  // Catch-all: anything a vendor's listing doesn't fit elsewhere. Also
  // doubles as the "everything the other filters don't cover" option in
  // the filter panel, since every listing must pick one category.
  { id: "Other", label: "Other", tint: "#6b7280", accent: "bg-stone-100 text-stone-600 border-stone-200" },
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
    Baked: <><path d="M4 15c0-4 3.5-7 8-7s8 3 8 7c0 2.8-3.6 5-8 5s-8-2.2-8-5Z" /><path d="M8.5 9c1-1.7 2-2.5 3.5-2.5s2.5.8 3.5 2.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" /></>,
    Other: <><circle cx="7" cy="12" r="2.3" /><circle cx="12" cy="12" r="2.3" /><circle cx="17" cy="12" r="2.3" /></>,
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
// Promotional specials sit in the same single-badge slot as the status
// presets above — a listing shows one badge at a time, so "Buy One Get One"
// and "Sold Out" are mutually exclusive rather than stacked.
const SPECIAL_PRESETS = [
  { id: "bogo", label: "Buy 1 Get 1 Free", classes: "bg-rose-600 text-white" },
  { id: "bogo_half", label: "BOGO 50% Off", classes: "bg-amber-600 text-white" },
  { id: "bundle", label: "Bundle & Save", classes: "bg-violet-700 text-white" },
  { id: "flash_sale", label: "Flash Sale", classes: "bg-rose-700 text-white" },
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
  truffle: "mushroom", forest: "tree", farm: "egg", bread: "grain",
};

const ART_FOR_CATEGORY = { Fruit: "apple", Veggie: "greens", Tree: "tree", Bug: "bee", Dairy: "egg", Baked: "grain", Other: "sprout" };

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
  root: { url: PHOTO("photo-1533231040102-5ec7a63e6d0a"), by: null, source: "Unsplash" },
  squash: { url: PHOTO("photo-1570586437263-ab629fccc818"), by: null, source: "Unsplash" },
  mushroom: { url: PHOTO("photo-1543904856-8257e34283d9"), by: null, source: "Unsplash" },
  grain: { url: PHOTO("photo-1714168526009-2d0d333640d5"), by: null, source: "Unsplash" },
  citrus: { url: PHOTO("photo-1585939268339-886c9643ee98"), by: null, source: "Unsplash" },
  tree: { url: PHOTO("photo-1782855242105-21215cefe24e"), by: null, source: "Unsplash" },
  sprout: { url: PHOTO("photo-1734794049686-38f3e8df8b98"), by: null, source: "Unsplash" },
  egg: { url: PHOTO("photo-1506976785307-8732e854ad03"), by: null, source: "Unsplash" },
  bread: { url: PHOTO("photo-1566698629409-787a68fc5724"), by: null, source: "Unsplash" },
  // Aliases: the icon-picker keys are "bee" (singular) and "grapes" (plural),
  // but the existing verified photos above are keyed "bees"/"grape" — reuse
  // those same photo IDs here under the icon-picker's own key spelling.
  bee: { url: PHOTO("photo-1558642452-9d2a7deb7f62"), by: null, source: "Unsplash" },
  grapes: { url: PHOTO("photo-1537640538966-79f369143f8f"), by: null, source: "Unsplash" },
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
  Baked: "linear-gradient(160deg,#f8f0e6 0%,#e8d2b8 100%)",
  Other: "linear-gradient(160deg,#f2f2f0 0%,#dcdcd8 100%)",
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
   SECTION 3b: US GEOGRAPHY
   A state picker plus enough of an approximate location per state to place a
   new shop somewhere real on the map immediately, rather than leaving it
   sitting on a placeholder point until someone happens to edit it by hand.
============================================================================ */
const US_STATES = [
  { code: "AL", name: "Alabama", lat: 32.8, lng: -86.8 },
  { code: "AK", name: "Alaska", lat: 64.2, lng: -149.4 },
  { code: "AZ", name: "Arizona", lat: 34.2, lng: -111.9 },
  { code: "AR", name: "Arkansas", lat: 34.9, lng: -92.4 },
  { code: "CA", name: "California", lat: 37.2, lng: -119.4 },
  { code: "CO", name: "Colorado", lat: 39.0, lng: -105.5 },
  { code: "CT", name: "Connecticut", lat: 41.6, lng: -72.7 },
  { code: "DE", name: "Delaware", lat: 39.0, lng: -75.5 },
  { code: "DC", name: "District of Columbia", lat: 38.9, lng: -77.0 },
  { code: "FL", name: "Florida", lat: 28.6, lng: -82.4 },
  { code: "GA", name: "Georgia", lat: 32.6, lng: -83.4 },
  { code: "HI", name: "Hawaii", lat: 20.3, lng: -156.3 },
  { code: "ID", name: "Idaho", lat: 44.4, lng: -114.6 },
  { code: "IL", name: "Illinois", lat: 40.0, lng: -89.2 },
  { code: "IN", name: "Indiana", lat: 39.9, lng: -86.3 },
  { code: "IA", name: "Iowa", lat: 42.0, lng: -93.5 },
  { code: "KS", name: "Kansas", lat: 38.5, lng: -98.4 },
  { code: "KY", name: "Kentucky", lat: 37.5, lng: -85.3 },
  { code: "LA", name: "Louisiana", lat: 31.0, lng: -92.0 },
  { code: "ME", name: "Maine", lat: 45.4, lng: -69.2 },
  { code: "MD", name: "Maryland", lat: 39.0, lng: -76.7 },
  { code: "MA", name: "Massachusetts", lat: 42.3, lng: -71.8 },
  { code: "MI", name: "Michigan", lat: 44.3, lng: -85.4 },
  { code: "MN", name: "Minnesota", lat: 46.3, lng: -94.3 },
  { code: "MS", name: "Mississippi", lat: 32.7, lng: -89.7 },
  { code: "MO", name: "Missouri", lat: 38.5, lng: -92.5 },
  { code: "MT", name: "Montana", lat: 47.0, lng: -109.6 },
  { code: "NE", name: "Nebraska", lat: 41.5, lng: -99.8 },
  { code: "NV", name: "Nevada", lat: 39.3, lng: -116.6 },
  { code: "NH", name: "New Hampshire", lat: 43.7, lng: -71.6 },
  { code: "NJ", name: "New Jersey", lat: 40.1, lng: -74.7 },
  { code: "NM", name: "New Mexico", lat: 34.4, lng: -106.1 },
  { code: "NY", name: "New York", lat: 42.9, lng: -75.5 },
  { code: "NC", name: "North Carolina", lat: 35.6, lng: -79.4 },
  { code: "ND", name: "North Dakota", lat: 47.5, lng: -100.5 },
  { code: "OH", name: "Ohio", lat: 40.3, lng: -82.8 },
  { code: "OK", name: "Oklahoma", lat: 35.5, lng: -97.5 },
  { code: "OR", name: "Oregon", lat: 43.9, lng: -120.6 },
  { code: "PA", name: "Pennsylvania", lat: 40.9, lng: -77.7 },
  { code: "RI", name: "Rhode Island", lat: 41.7, lng: -71.5 },
  { code: "SC", name: "South Carolina", lat: 33.9, lng: -80.9 },
  { code: "SD", name: "South Dakota", lat: 44.4, lng: -100.2 },
  { code: "TN", name: "Tennessee", lat: 35.9, lng: -86.3 },
  { code: "TX", name: "Texas", lat: 31.5, lng: -99.3 },
  { code: "UT", name: "Utah", lat: 39.3, lng: -111.7 },
  { code: "VT", name: "Vermont", lat: 44.0, lng: -72.7 },
  { code: "VA", name: "Virginia", lat: 37.5, lng: -78.8 },
  { code: "WA", name: "Washington", lat: 47.4, lng: -120.5 },
  { code: "WV", name: "West Virginia", lat: 38.6, lng: -80.6 },
  { code: "WI", name: "Wisconsin", lat: 44.6, lng: -89.9 },
  { code: "WY", name: "Wyoming", lat: 43.0, lng: -107.5 },
];
function stateInfo(code) {
  return US_STATES.find((s) => s.code === (code || "").toUpperCase()) || null;
}
// A small deterministic spread so shops in the same state don't all stack on
// exactly one point — same seed always lands on the same offset, rather than
// drifting on every reload.
function jitterFromSeed(seed, spread) {
  let h = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const a = ((h % 1000) / 1000) * 2 - 1;
  const b = (((Math.floor(h / 1000)) % 1000) / 1000) * 2 - 1;
  return { dLat: a * spread, dLng: b * spread * 1.4 };
}
function stateApproxLatLng(code, seed) {
  const st = stateInfo(code);
  if (!st) return null;
  const { dLat, dLng } = jitterFromSeed(seed, 0.45);
  return { lat: st.lat + dLat, lng: st.lng + dLng };
}

// United States pinned first so it's the easy default; everything else is
// alphabetical by name. Coordinates are rough country centroids — good
// enough to drop a shop's map pin in the right part of the world when it
// doesn't have (or hasn't granted) an exact device location, the same way
// US_STATES above does for state-level fallback placement.
const COUNTRIES = [
  { code: "US", name: "United States", lat: 39.8, lng: -98.6 },
  { code: "AF", name: "Afghanistan", lat: 33.9, lng: 67.7 },
  { code: "AL", name: "Albania", lat: 41.0, lng: 20.0 },
  { code: "DZ", name: "Algeria", lat: 28.0, lng: 3.0 },
  { code: "AD", name: "Andorra", lat: 42.5, lng: 1.6 },
  { code: "AO", name: "Angola", lat: -11.2, lng: 17.9 },
  { code: "AG", name: "Antigua and Barbuda", lat: 17.1, lng: -61.8 },
  { code: "AR", name: "Argentina", lat: -38.4, lng: -63.6 },
  { code: "AM", name: "Armenia", lat: 40.1, lng: 45.0 },
  { code: "AU", name: "Australia", lat: -25.3, lng: 133.8 },
  { code: "AT", name: "Austria", lat: 47.5, lng: 14.6 },
  { code: "AZ", name: "Azerbaijan", lat: 40.1, lng: 47.6 },
  { code: "BS", name: "Bahamas", lat: 25.0, lng: -77.4 },
  { code: "BH", name: "Bahrain", lat: 26.0, lng: 50.6 },
  { code: "BD", name: "Bangladesh", lat: 23.7, lng: 90.4 },
  { code: "BB", name: "Barbados", lat: 13.2, lng: -59.5 },
  { code: "BY", name: "Belarus", lat: 53.7, lng: 27.9 },
  { code: "BE", name: "Belgium", lat: 50.5, lng: 4.5 },
  { code: "BZ", name: "Belize", lat: 17.2, lng: -88.5 },
  { code: "BJ", name: "Benin", lat: 9.3, lng: 2.3 },
  { code: "BT", name: "Bhutan", lat: 27.5, lng: 90.4 },
  { code: "BO", name: "Bolivia", lat: -16.3, lng: -63.6 },
  { code: "BA", name: "Bosnia and Herzegovina", lat: 43.9, lng: 17.7 },
  { code: "BW", name: "Botswana", lat: -22.3, lng: 24.7 },
  { code: "BR", name: "Brazil", lat: -14.2, lng: -51.9 },
  { code: "BN", name: "Brunei", lat: 4.5, lng: 114.7 },
  { code: "BG", name: "Bulgaria", lat: 42.7, lng: 25.5 },
  { code: "BF", name: "Burkina Faso", lat: 12.2, lng: -1.6 },
  { code: "BI", name: "Burundi", lat: -3.4, lng: 29.9 },
  { code: "CV", name: "Cabo Verde", lat: 16.0, lng: -24.0 },
  { code: "KH", name: "Cambodia", lat: 12.6, lng: 105.0 },
  { code: "CM", name: "Cameroon", lat: 7.4, lng: 12.4 },
  { code: "CA", name: "Canada", lat: 56.1, lng: -106.3 },
  { code: "CF", name: "Central African Republic", lat: 6.6, lng: 20.9 },
  { code: "TD", name: "Chad", lat: 15.5, lng: 19.0 },
  { code: "CL", name: "Chile", lat: -35.7, lng: -71.5 },
  { code: "CN", name: "China", lat: 35.9, lng: 104.2 },
  { code: "CO", name: "Colombia", lat: 4.6, lng: -74.3 },
  { code: "KM", name: "Comoros", lat: -11.9, lng: 43.9 },
  { code: "CD", name: "Congo (DRC)", lat: -4.0, lng: 21.8 },
  { code: "CG", name: "Congo (Republic)", lat: -0.2, lng: 15.8 },
  { code: "CR", name: "Costa Rica", lat: 9.7, lng: -83.8 },
  { code: "HR", name: "Croatia", lat: 45.1, lng: 15.2 },
  { code: "CU", name: "Cuba", lat: 21.5, lng: -77.8 },
  { code: "CY", name: "Cyprus", lat: 35.1, lng: 33.4 },
  { code: "CZ", name: "Czechia", lat: 49.8, lng: 15.5 },
  { code: "DK", name: "Denmark", lat: 56.3, lng: 9.5 },
  { code: "DJ", name: "Djibouti", lat: 11.8, lng: 42.6 },
  { code: "DM", name: "Dominica", lat: 15.4, lng: -61.4 },
  { code: "DO", name: "Dominican Republic", lat: 18.7, lng: -70.2 },
  { code: "EC", name: "Ecuador", lat: -1.8, lng: -78.2 },
  { code: "EG", name: "Egypt", lat: 26.8, lng: 30.8 },
  { code: "SV", name: "El Salvador", lat: 13.8, lng: -88.9 },
  { code: "GQ", name: "Equatorial Guinea", lat: 1.7, lng: 10.3 },
  { code: "ER", name: "Eritrea", lat: 15.2, lng: 39.8 },
  { code: "EE", name: "Estonia", lat: 58.6, lng: 25.0 },
  { code: "SZ", name: "Eswatini", lat: -26.5, lng: 31.5 },
  { code: "ET", name: "Ethiopia", lat: 9.1, lng: 40.5 },
  { code: "FJ", name: "Fiji", lat: -17.7, lng: 178.1 },
  { code: "FI", name: "Finland", lat: 61.9, lng: 25.7 },
  { code: "FR", name: "France", lat: 46.6, lng: 1.9 },
  { code: "GA", name: "Gabon", lat: -0.8, lng: 11.6 },
  { code: "GM", name: "Gambia", lat: 13.4, lng: -15.3 },
  { code: "GE", name: "Georgia", lat: 42.3, lng: 43.4 },
  { code: "DE", name: "Germany", lat: 51.2, lng: 10.4 },
  { code: "GH", name: "Ghana", lat: 7.9, lng: -1.0 },
  { code: "GR", name: "Greece", lat: 39.1, lng: 21.8 },
  { code: "GD", name: "Grenada", lat: 12.1, lng: -61.7 },
  { code: "GT", name: "Guatemala", lat: 15.8, lng: -90.2 },
  { code: "GN", name: "Guinea", lat: 9.9, lng: -9.7 },
  { code: "GW", name: "Guinea-Bissau", lat: 11.8, lng: -15.2 },
  { code: "GY", name: "Guyana", lat: 4.9, lng: -58.9 },
  { code: "HT", name: "Haiti", lat: 18.9, lng: -72.3 },
  { code: "HN", name: "Honduras", lat: 15.2, lng: -86.2 },
  { code: "HU", name: "Hungary", lat: 47.2, lng: 19.5 },
  { code: "IS", name: "Iceland", lat: 64.9, lng: -19.0 },
  { code: "IN", name: "India", lat: 20.6, lng: 78.9 },
  { code: "ID", name: "Indonesia", lat: -0.8, lng: 113.9 },
  { code: "IR", name: "Iran", lat: 32.4, lng: 53.7 },
  { code: "IQ", name: "Iraq", lat: 33.2, lng: 43.7 },
  { code: "IE", name: "Ireland", lat: 53.4, lng: -8.2 },
  { code: "IL", name: "Israel", lat: 31.0, lng: 34.8 },
  { code: "IT", name: "Italy", lat: 41.9, lng: 12.6 },
  { code: "JM", name: "Jamaica", lat: 18.1, lng: -77.3 },
  { code: "JP", name: "Japan", lat: 36.2, lng: 138.3 },
  { code: "JO", name: "Jordan", lat: 30.6, lng: 36.2 },
  { code: "KZ", name: "Kazakhstan", lat: 48.0, lng: 66.9 },
  { code: "KE", name: "Kenya", lat: 0.0, lng: 37.9 },
  { code: "KI", name: "Kiribati", lat: 1.9, lng: -157.4 },
  { code: "XK", name: "Kosovo", lat: 42.6, lng: 20.9 },
  { code: "KW", name: "Kuwait", lat: 29.3, lng: 47.5 },
  { code: "KG", name: "Kyrgyzstan", lat: 41.2, lng: 74.8 },
  { code: "LA", name: "Laos", lat: 19.9, lng: 102.5 },
  { code: "LV", name: "Latvia", lat: 56.9, lng: 24.6 },
  { code: "LB", name: "Lebanon", lat: 33.9, lng: 35.9 },
  { code: "LS", name: "Lesotho", lat: -29.6, lng: 28.2 },
  { code: "LR", name: "Liberia", lat: 6.4, lng: -9.4 },
  { code: "LY", name: "Libya", lat: 26.3, lng: 17.2 },
  { code: "LI", name: "Liechtenstein", lat: 47.2, lng: 9.5 },
  { code: "LT", name: "Lithuania", lat: 55.2, lng: 23.9 },
  { code: "LU", name: "Luxembourg", lat: 49.8, lng: 6.1 },
  { code: "MG", name: "Madagascar", lat: -18.8, lng: 46.9 },
  { code: "MW", name: "Malawi", lat: -13.3, lng: 34.3 },
  { code: "MY", name: "Malaysia", lat: 4.2, lng: 101.9 },
  { code: "MV", name: "Maldives", lat: 3.2, lng: 73.2 },
  { code: "ML", name: "Mali", lat: 17.6, lng: -4.0 },
  { code: "MT", name: "Malta", lat: 35.9, lng: 14.4 },
  { code: "MH", name: "Marshall Islands", lat: 7.1, lng: 171.2 },
  { code: "MR", name: "Mauritania", lat: 21.0, lng: -10.9 },
  { code: "MU", name: "Mauritius", lat: -20.3, lng: 57.6 },
  { code: "MX", name: "Mexico", lat: 23.6, lng: -102.5 },
  { code: "FM", name: "Micronesia", lat: 6.9, lng: 158.2 },
  { code: "MD", name: "Moldova", lat: 47.4, lng: 28.4 },
  { code: "MC", name: "Monaco", lat: 43.7, lng: 7.4 },
  { code: "MN", name: "Mongolia", lat: 46.9, lng: 103.8 },
  { code: "ME", name: "Montenegro", lat: 42.7, lng: 19.4 },
  { code: "MA", name: "Morocco", lat: 31.8, lng: -7.1 },
  { code: "MZ", name: "Mozambique", lat: -18.7, lng: 35.5 },
  { code: "MM", name: "Myanmar", lat: 21.9, lng: 95.9 },
  { code: "NA", name: "Namibia", lat: -22.9, lng: 18.5 },
  { code: "NR", name: "Nauru", lat: -0.5, lng: 166.9 },
  { code: "NP", name: "Nepal", lat: 28.4, lng: 84.1 },
  { code: "NL", name: "Netherlands", lat: 52.1, lng: 5.3 },
  { code: "NZ", name: "New Zealand", lat: -40.9, lng: 174.9 },
  { code: "NI", name: "Nicaragua", lat: 12.9, lng: -85.2 },
  { code: "NE", name: "Niger", lat: 17.6, lng: 8.1 },
  { code: "NG", name: "Nigeria", lat: 9.1, lng: 8.7 },
  { code: "KP", name: "North Korea", lat: 40.3, lng: 127.5 },
  { code: "MK", name: "North Macedonia", lat: 41.6, lng: 21.7 },
  { code: "NO", name: "Norway", lat: 60.5, lng: 8.5 },
  { code: "OM", name: "Oman", lat: 21.5, lng: 55.9 },
  { code: "PK", name: "Pakistan", lat: 30.4, lng: 69.3 },
  { code: "PW", name: "Palau", lat: 7.5, lng: 134.6 },
  { code: "PS", name: "Palestine", lat: 31.9, lng: 35.2 },
  { code: "PA", name: "Panama", lat: 8.5, lng: -80.8 },
  { code: "PG", name: "Papua New Guinea", lat: -6.3, lng: 143.9 },
  { code: "PY", name: "Paraguay", lat: -23.4, lng: -58.4 },
  { code: "PE", name: "Peru", lat: -9.2, lng: -75.0 },
  { code: "PH", name: "Philippines", lat: 12.9, lng: 121.8 },
  { code: "PL", name: "Poland", lat: 51.9, lng: 19.1 },
  { code: "PT", name: "Portugal", lat: 39.4, lng: -8.2 },
  { code: "QA", name: "Qatar", lat: 25.3, lng: 51.2 },
  { code: "RO", name: "Romania", lat: 45.9, lng: 25.0 },
  { code: "RU", name: "Russia", lat: 61.5, lng: 105.3 },
  { code: "RW", name: "Rwanda", lat: -1.9, lng: 29.9 },
  { code: "KN", name: "Saint Kitts and Nevis", lat: 17.4, lng: -62.8 },
  { code: "LC", name: "Saint Lucia", lat: 13.9, lng: -60.9 },
  { code: "VC", name: "Saint Vincent and the Grenadines", lat: 13.3, lng: -61.2 },
  { code: "WS", name: "Samoa", lat: -13.8, lng: -172.1 },
  { code: "SM", name: "San Marino", lat: 43.9, lng: 12.5 },
  { code: "ST", name: "Sao Tome and Principe", lat: 0.2, lng: 6.6 },
  { code: "SA", name: "Saudi Arabia", lat: 23.9, lng: 45.1 },
  { code: "SN", name: "Senegal", lat: 14.5, lng: -14.5 },
  { code: "RS", name: "Serbia", lat: 44.0, lng: 21.0 },
  { code: "SC", name: "Seychelles", lat: -4.7, lng: 55.5 },
  { code: "SL", name: "Sierra Leone", lat: 8.5, lng: -11.8 },
  { code: "SG", name: "Singapore", lat: 1.35, lng: 103.8 },
  { code: "SK", name: "Slovakia", lat: 48.7, lng: 19.7 },
  { code: "SI", name: "Slovenia", lat: 46.2, lng: 15.0 },
  { code: "SB", name: "Solomon Islands", lat: -9.6, lng: 160.2 },
  { code: "SO", name: "Somalia", lat: 5.2, lng: 46.2 },
  { code: "ZA", name: "South Africa", lat: -30.6, lng: 22.9 },
  { code: "KR", name: "South Korea", lat: 35.9, lng: 127.8 },
  { code: "SS", name: "South Sudan", lat: 6.9, lng: 31.3 },
  { code: "ES", name: "Spain", lat: 40.5, lng: -3.7 },
  { code: "LK", name: "Sri Lanka", lat: 7.9, lng: 80.8 },
  { code: "SD", name: "Sudan", lat: 12.9, lng: 30.2 },
  { code: "SR", name: "Suriname", lat: 3.9, lng: -56.0 },
  { code: "SE", name: "Sweden", lat: 60.1, lng: 18.6 },
  { code: "CH", name: "Switzerland", lat: 46.8, lng: 8.2 },
  { code: "SY", name: "Syria", lat: 34.8, lng: 38.9 },
  { code: "TW", name: "Taiwan", lat: 23.7, lng: 121.0 },
  { code: "TJ", name: "Tajikistan", lat: 38.9, lng: 71.3 },
  { code: "TZ", name: "Tanzania", lat: -6.4, lng: 34.9 },
  { code: "TH", name: "Thailand", lat: 15.9, lng: 101.0 },
  { code: "TL", name: "Timor-Leste", lat: -8.9, lng: 125.7 },
  { code: "TG", name: "Togo", lat: 8.6, lng: 0.8 },
  { code: "TO", name: "Tonga", lat: -21.2, lng: -175.2 },
  { code: "TT", name: "Trinidad and Tobago", lat: 10.7, lng: -61.2 },
  { code: "TN", name: "Tunisia", lat: 33.9, lng: 9.5 },
  { code: "TR", name: "Turkey", lat: 38.9, lng: 35.2 },
  { code: "TM", name: "Turkmenistan", lat: 39.0, lng: 59.6 },
  { code: "TV", name: "Tuvalu", lat: -7.1, lng: 177.6 },
  { code: "UG", name: "Uganda", lat: 1.4, lng: 32.3 },
  { code: "UA", name: "Ukraine", lat: 48.4, lng: 31.2 },
  { code: "AE", name: "United Arab Emirates", lat: 23.4, lng: 53.8 },
  { code: "GB", name: "United Kingdom", lat: 55.4, lng: -3.4 },
  { code: "UY", name: "Uruguay", lat: -32.5, lng: -55.8 },
  { code: "UZ", name: "Uzbekistan", lat: 41.4, lng: 64.6 },
  { code: "VU", name: "Vanuatu", lat: -15.4, lng: 166.9 },
  { code: "VA", name: "Vatican City", lat: 41.9, lng: 12.45 },
  { code: "VE", name: "Venezuela", lat: 6.4, lng: -66.6 },
  { code: "VN", name: "Vietnam", lat: 14.1, lng: 108.3 },
  { code: "YE", name: "Yemen", lat: 15.6, lng: 48.5 },
  { code: "ZM", name: "Zambia", lat: -13.1, lng: 27.8 },
  { code: "ZW", name: "Zimbabwe", lat: -19.0, lng: 29.2 },
];
function countryInfo(code) {
  return COUNTRIES.find((c) => c.code === (code || "").toUpperCase()) || null;
}
function countryApproxLatLng(code, seed) {
  const c = countryInfo(code);
  if (!c) return null;
  const { dLat, dLng } = jitterFromSeed(seed, 0.6);
  return { lat: c.lat + dLat, lng: c.lng + dLng };
}

// Real city-level geocoding via OpenStreetMap's free Nominatim search API —
// this is what actually puts a shop's map pin on the town/city that was
// typed in, rather than the coarse state/country-centroid approximations
// above, which only exist as a last-resort fallback for when this lookup
// fails (offline, no match found, etc). US state codes are expanded to
// their full name first since structured geocoding matches names more
// reliably than 2-letter abbreviations.
async function geocodeLocation({ city, state, country }) {
  const countryName = countryInfo(country)?.name || country || "";
  const stateName = (country || "US").toUpperCase() === "US" ? stateInfo(state)?.name || state || "" : state || "";
  if (!city && !stateName) return null;
  const params = new URLSearchParams({ format: "jsonv2", limit: "1" });
  if (city) params.set("city", city);
  if (stateName) params.set("state", stateName);
  if (countryName) params.set("country", countryName);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
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
// Quick-tap choices for "priced per ___". "each" is the default and is never
// shown (a plain "$4.00" already reads as per-item), so it isn't included in
// the tap row itself — see PRICE_UNIT_CHOICES below.
const PRICE_UNITS = [
  { id: "each", label: "each" },
  { id: "lb", label: "lb" },
  { id: "oz", label: "oz" },
  { id: "doz", label: "dozen" },
  { id: "bunch", label: "bunch" },
  { id: "pint", label: "pint" },
  { id: "qt", label: "quart" },
  { id: "gal", label: "gallon" },
  { id: "L", label: "liter" },
  { id: "bushel", label: "bushel" },
  { id: "basket", label: "basket" },
];
const PRICE_UNIT_CHOICES = PRICE_UNITS.filter((u) => u.id !== "each");
function priceUnitLabel(id) {
  return (PRICE_UNITS.find((u) => u.id === id) || PRICE_UNITS[0]).label;
}
function formatPrice(n, unit) {
  if (n === 0) return "Free";
  const base = `$${n.toFixed(2)}`;
  if (!unit || unit === "each") return base;
  return `${base}/${priceUnitLabel(unit)}`;
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
function addDays(ts, days) {
  return ts + days * 86400000;
}
function daysBetween(a, b) {
  return (b - a) / 86400000;
}
// Best-effort split of a "City, ST" style location label into its parts —
// tolerant of missing input since not every account has a home location.
function splitCityState(label) {
  if (!label || typeof label !== "string") return { city: null, state: null };
  const parts = label.split(",").map((s) => s.trim());
  return { city: parts[0] || null, state: parts[1] || null };
}
// Fire-and-forget analytics logging for the premium dashboard. Never allowed
// to throw into the caller — a dropped analytics row is a rounding error on a
// chart, not something that should ever break the feature it's attached to.
async function logAnalyticsEvent(eventType, fields = {}) {
  try {
    const { data } = await supabase.auth.getSession();
    const actorId = data?.session?.user?.id || null;
    await supabase.from("analytics_events").insert({
      event_type: eventType,
      entity_id: fields.entityId ?? null,
      entity_name: fields.entityName ?? null,
      shop_id: fields.shopId ?? null,
      actor_id: actorId,
      city: fields.city ?? null,
      state: fields.state ?? null,
      meta: fields.meta ?? {},
    });
  } catch (e) {
    console.error("analytics log failed", eventType, e);
  }
}
// De-dupes view logging to once per entity per page load — a refresh resets
// it, which is an acceptable amount of over-counting for view analytics.
const _viewLogged = new Set();
function logViewOnce(key, fn) {
  if (_viewLogged.has(key)) return;
  _viewLogged.add(key);
  fn();
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
// A shop whose plan lapsed (cancelled/expired) goes offline to everyone but
// its own owner — it stays on the platform, inactive, until the ABANDON_DAYS
// sweep in useMarketData.loadAll() removes it, or the owner re-subscribes.
function isShopVisible(shop, viewerId) {
  if (!shop) return false;
  return shop.billingStatus !== "inactive" || shop.ownerId === viewerId;
}
// Stricter than isShopVisible — used for general browse/search/map results,
// where an inactive shop shouldn't appear at all, even to its own owner
// (they manage/reactivate it from Account > Selling, not by finding it mixed
// into normal listings).
function isShopBrowsable(shop) {
  return !!shop && shop.billingStatus !== "inactive";
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
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
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
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  // A photo taken with the device camera (via the capture-attribute file
  // input) sometimes comes back from the OS with no MIME type set at all —
  // a known gap in several mobile browsers — which made every fresh camera
  // shot get silently rejected right here while the exact same photo,
  // picked from the library instead, arrived with its type set and worked
  // fine. Anything already labeled image/* is trusted outright; a missing
  // label falls back to the file extension rather than being turned away.
  if (type.startsWith("image/")) return true;
  if (type) return false;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "");
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

/* ---- Review media (photos + short video clips) ----------------------------
   Stored the same way as savePhoto — one key per item, referenced by id from
   the review record — but under its own `media:` prefix and tagged with a
   `type` since a review attachment can be either a photo or a video. Videos
   can't be resized/compressed client-side the way photos are, so they're kept
   under a hard size cap instead. */
const REVIEW_VIDEO_MAX_BYTES = 20 * 1024 * 1024; // ~20MB raw, before base64 inflation
const REVIEW_MEDIA_MAX_ITEMS = 4;

function isSupportedVideo(file) {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("video/")) return true;
  if (type) return false;
  return /\.(mp4|mov|webm|m4v)$/i.test(file.name || "");
}

function readVideoFile(file, { maxBytes = REVIEW_VIDEO_MAX_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    if (!isSupportedVideo(file)) {
      reject(new Error("That file doesn't look like a video."));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error(`That video is too large — keep clips under ${Math.round(maxBytes / (1024 * 1024))}MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that video."));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function saveReviewMedia(dataUrl, type) {
  const id = uid("revmedia");
  const ok = await setJSON(`media:${id}`, { dataUrl, type, createdAt: Date.now() }, true, { verify: true });
  return ok ? id : null;
}

const reviewMediaUrlCache = new Map();
function useReviewMediaUrl(id) {
  const [url, setUrl] = useState(() => (id ? reviewMediaUrlCache.get(id) || null : null));
  useEffect(() => {
    if (!id || reviewMediaUrlCache.has(id)) return;
    let cancelled = false;
    readJSON(`media:${id}`, true, null).then((res) => {
      if (cancelled) return;
      if (res.ok && res.value?.dataUrl) {
        reviewMediaUrlCache.set(id, res.value.dataUrl);
        setUrl(res.value.dataUrl);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return url;
}

// A single review attachment — a small square thumbnail that opens a full
// lightbox on click, or (in the composer, before posting) shows a remove
// button instead.
function ReviewMediaThumb({ item, onOpen, onRemove }) {
  const url = useReviewMediaUrl(item.id);
  return (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
      {url ? (
        item.type === "video" ? (
          <button type="button" onClick={() => onOpen?.(item)} className="w-full h-full relative">
            <video src={url} className="w-full h-full object-cover" muted />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
              <PlayCircle size={20} className="text-white" />
            </span>
          </button>
        ) : (
          <button type="button" onClick={() => onOpen?.(item)} className="w-full h-full">
            <img src={url} alt="Review attachment" className="w-full h-full object-cover" />
          </button>
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 size={14} className="animate-spin text-stone-400" />
        </div>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(item)}
          aria-label="Remove attachment"
          className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full w-4 h-4 flex items-center justify-center"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// Full-size lightbox for a tapped review photo/video.
function ReviewMediaLightbox({ item, onClose }) {
  const url = useReviewMediaUrl(item?.id);
  if (!item) return null;
  return (
    <Modal open onClose={onClose} labelledBy="review-media-title">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span id="review-media-title" className="sr-only">Review attachment</span>
          <button onClick={onClose} className="ml-auto text-stone-400 hover:text-stone-600"><X size={20} /></button>
        </div>
        <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center min-h-[200px]">
          {!url ? (
            <Loader2 size={24} className="animate-spin text-white my-16" />
          ) : item.type === "video" ? (
            <video src={url} controls autoPlay className="max-h-[70vh] w-full" />
          ) : (
            <img src={url} alt="Review attachment" className="max-h-[70vh] w-full object-contain" />
          )}
        </div>
      </div>
    </Modal>
  );
}

// The "add photos or video" control used in the review composer — up to
// REVIEW_MEDIA_MAX_ITEMS attachments, each uploaded (and, for photos,
// resized/compressed the same way any other listing photo is) the moment
// it's picked, so the composer never has to hold raw files in memory.
function ReviewMediaPicker({ media, onChange }) {
  const { showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = REVIEW_MEDIA_MAX_ITEMS - media.length;
    if (room <= 0) {
      showToast(`You can attach up to ${REVIEW_MEDIA_MAX_ITEMS} photos/videos per review.`);
      return;
    }
    setBusy(true);
    const additions = [];
    for (const file of files.slice(0, room)) {
      try {
        if (isSupportedVideo(file)) {
          const dataUrl = await readVideoFile(file);
          const id = await saveReviewMedia(dataUrl, "video");
          if (id) additions.push({ id, type: "video" });
        } else {
          const dataUrl = await processImageFile(file);
          const id = await saveReviewMedia(dataUrl, "image");
          if (id) additions.push({ id, type: "image" });
        }
      } catch (err) {
        showToast(err.message || "Couldn't attach that file.");
      }
    }
    if (additions.length) onChange([...media, ...additions]);
    setBusy(false);
  };

  return (
    <div className="mt-2">
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
      <div className="flex items-center gap-2 flex-wrap">
        {media.map((item) => (
          <ReviewMediaThumb key={item.id} item={item} onRemove={(it) => onChange(media.filter((m) => m.id !== it.id))} />
        ))}
        {media.length < REVIEW_MEDIA_MAX_ITEMS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-300 text-stone-400 hover:text-emerald-700 hover:border-emerald-300 flex flex-col items-center justify-center gap-0.5 shrink-0"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : (
              <>
                <span className="flex items-center gap-0.5"><ImageIcon size={13} /><Video size={13} /></span>
                <span className="cs-t9 font-semibold">Add</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
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

  const aspect = cw / ch;
  const outW = aspect >= 1 ? maxDim : Math.round(maxDim * aspect);
  const outH = aspect >= 1 ? Math.round(maxDim / aspect) : maxDim;
  const outScale = outW / cw; // === outH / ch, since outW/outH matches cw/ch

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that photo.");

  // Zoom can now go below "cover" (see PhotoEditorModal's minZoom) so the
  // whole photo fits in the frame instead of always being cropped to fill
  // it. When that happens the image no longer spans the full crop window on
  // one or both axes, so paint a neutral backdrop first and place the photo
  // at its real size/position — stretching it to fill the canvas regardless
  // would silently undo the "fit" the person just chose.
  ctx.fillStyle = "#f5f5f4";
  ctx.fillRect(0, 0, outW, outH);

  let sx, sw, dx, dw;
  if (dispW <= cw + 0.01) {
    sx = 0;
    sw = nw;
    dx = left * outScale;
    dw = dispW * outScale;
  } else {
    sx = Math.max(0, Math.min(-left / scale, Math.max(0, nw - cw / scale)));
    sw = Math.min(cw / scale, nw - sx);
    dx = 0;
    dw = outW;
  }
  let sy, sh, dy, dh;
  if (dispH <= ch + 0.01) {
    sy = 0;
    sh = nh;
    dy = top * outScale;
    dh = dispH * outScale;
  } else {
    sy = Math.max(0, Math.min(-top / scale, Math.max(0, nh - ch / scale)));
    sh = Math.min(ch / scale, nh - sy);
    dy = 0;
    dh = outH;
  }

  ctx.filter = filterCss || "none";
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

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
  // zoom=1 fills the frame edge-to-edge ("cover"), cropping whatever
  // overflows — the only option before. minZoom is however far zoom has to
  // drop to reach "contain" instead, where the entire photo is visible with
  // the frame's own background showing in the gap on the short axis.
  const minZoom = img
    ? Math.min(cw / (img.naturalWidth || img.width), ch / (img.naturalHeight || img.height)) / baseScale
    : 1;

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
          <input
            type="range"
            min={minZoom}
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            disabled={!img}
            className="w-full"
          />
          <p className="cs-t10 text-stone-400 mt-0.5">Zoom all the way out to fit the whole photo in frame.</p>
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

// Fast, synchronous first line of defense — runs the instant someone hits
// "Post review", before anything reaches the network. It exists to catch the
// blatant stuff (slurs, explicit profanity, vulgar/hateful emoji) and stop it
// with a clear explanation immediately, rather than letting it post and only
// getting pulled after the async screener above catches up (which is the
// right tradeoff for subtler cases, but not for content this obvious). The
// two layers are complementary: this one is instant but only catches exact
// matches; moderateText() is slower but understands context and phrasing
// this can't.
//
// Deliberately narrow on emoji: this is a produce marketplace, so fruit/veg
// emoji (peaches, eggplants, etc.) are never treated as violations here even
// though they get used as innuendo elsewhere — blocking someone's honest
// "these peaches were amazing" review would be a worse outcome than letting
// genuine innuendo slip through to the AI screener.
const BLOCKED_REVIEW_WORDS = [
  "fuck", "fucking", "fucker", "shit", "bullshit", "bitch", "asshole", "bastard",
  "cunt", "dick", "piss", "cock", "pussy", "whore", "slut",
  "nigger", "nigga", "fag", "faggot", "retard", "retarded", "spic", "chink", "kike", "tranny",
  "porn", "pornographic", "nude", "nudes", "blowjob", "handjob", "cumshot", "xxx",
];
const BLOCKED_REVIEW_EMOJI = ["🖕", "💀", "☠️"];

function containsBlockedContent(text) {
  if (!text) return { blocked: false };
  for (const emoji of BLOCKED_REVIEW_EMOJI) {
    if (text.includes(emoji)) return { blocked: true, reason: "emoji" };
  }
  const lower = text.toLowerCase();
  for (const word of BLOCKED_REVIEW_WORDS) {
    if (new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i").test(lower)) return { blocked: true, reason: "language" };
  }
  return { blocked: false };
}

/* ============================================================================
   SECTION 8: DATA HOOKS
============================================================================ */

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
    // Supabase silently refreshes the auth token — including right when the
    // browser tab regains focus — and fires this same event each time, with
    // a new session object for the SAME already-signed-in user. Without this
    // guard that re-triggered the full loading gate below on every refresh,
    // which unmounts (and resets) the whole app tree: whatever screen or tab
    // someone was on would snap back to its default the instant they tabbed
    // away and back. A real sign-in or account switch still goes through.
    if (meRef.current && meRef.current.id === session.user?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const existing = await getJSON("me:profile", false, null);
      if (cancelled) return;
      if (existing) {
        // Accounts created before email capture was added won't have it —
        // backfill from the live auth session the first time they load
        // rather than needing a one-off migration script.
        const authEmail = sessionRef.current?.user?.email || null;
        const patched = authEmail && existing.email !== authEmail ? { ...existing, email: authEmail } : existing;
        meRef.current = patched;
        setMeState(patched);
        // keep the shared public copy fresh in case it drifted
        setJSON(`users:${patched.id}`, patched, true);
        if (patched !== existing) setJSON("me:profile", patched, false);
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

  const createProfile = useCallback(async ({ name, avatar, homeLocation }) => {
    const id = sessionRef.current?.user?.id;
    if (!id) throw new Error("No authenticated session — sign in first.");
    const profile = {
      id,
      name: name || "Guest",
      email: sessionRef.current?.user?.email || null,
      // No more auto-assigned farm-emoji avatars — accounts start with none
      // (Avatar falls back to a plain neutral glyph) until someone uploads a
      // real photo from the account modal.
      avatar: avatar || "",
      createdAt: Date.now(),
      isVendor: false,
      shopId: null,
      homeLocation: homeLocation || null,
      plan: { tier: "free", billing: null, status: null, startedAt: null, periodEnd: null, cancelledAt: null, refundPct: null },
      notificationPrefs: { master: true, sound: true, messages: true, reviews: true, favorites: true },
      blockedUserIds: [],
    };
    await setJSON("me:profile", profile, false);
    await setJSON(`users:${id}`, profile, true);
    meRef.current = profile;
    setMeState(profile);
    const { city, state } = splitCityState(homeLocation?.label);
    logAnalyticsEvent("signup", { entityId: id, city, state });
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

  const loadAll = useCallback(async (retry = 0) => {
    const res = await readJSON(MARKET_KEY, true, null);
    // A failed read (network hiccup, or a token-refresh race on mobile that
    // fires a request on the about-to-expire access token and gets a
    // transient 401) is NOT the same as the key being missing — readJSON
    // already tells the two apart via res.ok. Collapsing "failed" into
    // "missing" here once caused the whole shared market to be silently
    // reseeded with demo shops over a real one, because a single bad
    // request looked identical to a first-ever run. So: never reseed on a
    // failed read. Retry a couple times with a short backoff instead, and
    // if it still hasn't recovered, just leave things as they are — a
    // subsequent load (nav change, manual refresh) will try again.
    if (!res.ok) {
      if (retry < 3) {
        setTimeout(() => loadAll(retry + 1), 800 * (retry + 1));
      } else {
        setLoading(false);
      }
      return;
    }
    const stored = res.value;
    // Any stored market object — even one with zero shops — means the key
    // has already been initialized (whether by first-run seeding or by an
    // intentional reset). Only a genuinely missing key (stored === null,
    // confirmed by a *successful* read) should trigger demo reseeding;
    // otherwise an intentionally emptied market would silently repopulate
    // with fake shops on next load.
    if (stored && Array.isArray(stored.shops)) {
      // Storefronts belonging to a lapsed (cancelled/expired) plan are kept
      // around, inactive, for ABANDON_DAYS in case the owner re-subscribes —
      // this lazy sweep is what actually removes them once that window has
      // passed, since there's no server-side cron in this stack to do it.
      const now = Date.now();
      const keptShops = [];
      const droppedShopIds = new Set();
      const droppedOwnerIds = [];
      (stored.shops || []).forEach((sh) => {
        const abandoned = sh.billingStatus === "inactive" && sh.inactiveSince && daysBetween(sh.inactiveSince, now) > ABANDON_DAYS;
        if (abandoned) {
          droppedShopIds.add(sh.id);
          if (sh.ownerId) droppedOwnerIds.push(sh.ownerId);
        } else keptShops.push(sh);
      });
      const rawProducts = Array.isArray(stored.products) ? stored.products : [];
      const keptProducts = droppedShopIds.size ? rawProducts.filter((p) => !droppedShopIds.has(p.shopId)) : rawProducts;
      applyMarket(keptShops, keptProducts);
      setLoading(false);
      if (droppedShopIds.size) {
        setJSON(MARKET_KEY, { shops: keptShops, products: keptProducts }, true);
        // The public profile mirror is writable by anyone signed in, so it
        // can be corrected right here; the owner's own private me:profile
        // gets reconciled separately, the next time their own session loads
        // (see the shop-existence check in RootShell), since only they can
        // write to it.
        droppedOwnerIds.forEach(async (ownerId) => {
          const owner = await getJSON(`users:${ownerId}`, true, null);
          if (owner && owner.shopId && droppedShopIds.has(owner.shopId)) {
            setJSON(`users:${ownerId}`, { ...owner, isVendor: false, shopId: null }, true);
          }
        });
      }
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

  // Deletes a whole storefront — every listing under it goes with it. Used
  // from the multi-shop picker a signed-in vendor sees if their account owns
  // more than one shop (a leftover from creating a new storefront without
  // ever removing an old one), so they finally have a real way to clean an
  // old shop up instead of it just sitting there, unreachable, forever.
  const removeShop = useCallback(
    async (shopId) => {
      applyMarket(
        shopsRef.current.filter((s) => s.id !== shopId),
        productsRef.current.filter((p) => p.shopId !== shopId)
      );
      await flushMarket();
    },
    [applyMarket, flushMarket]
  );

  const createShopForUser = useCallback(
    async (user, shopName, location) => {
      const id = uid("shop");
      // Placed for real from the start: an exact lat/lng (device location or a
      // picked city) wins outright. Failing that, a US shop falls back to its
      // state's approximate center; a shop in any other country falls back to
      // that country's approximate center — so the pin at least lands in the
      // right part of the world instead of squatting on the geographic
      // center of the US until someone happens to notice and fix it by hand.
      const countryCode = (location?.country || "US").toUpperCase();
      const stateCode = (location?.state || "").toUpperCase().slice(0, 2);
      const hasExactPoint = typeof location?.lat === "number" && typeof location?.lng === "number";
      const approx = hasExactPoint
        ? null
        : countryCode === "US"
        ? stateApproxLatLng(stateCode, id)
        : countryApproxLatLng(countryCode, id);
      const point = hasExactPoint ? { lat: location.lat, lng: location.lng } : approx || { lat: US_CENTER.lat, lng: US_CENTER.lng };
      const newShop = {
        id,
        ownerId: user.id,
        name: shopName || `${user.name}'s Farm Stand`,
        handle: (shopName || user.name).toLowerCase().replace(/[^a-z0-9]+/g, "") || "farmstand",
        city: location?.city || "Your Town",
        state: stateCode || (countryCode === "US" ? "US" : ""),
        country: countryCode,
        lat: point.lat,
        lng: point.lng,
        bio: "Tell people what you grow and how to find you.",
        themeId: "harvest",
        // Every new real shop starts on the Orchard Rows scene until the
        // vendor uploads their own cover photo — the scene picker has been
        // removed from the storefront builder, so this is the one default.
        bannerScene: "orchard",
        emoji: "\u{1F9FA}",
        verified: false,
        status: "open",
        billingStatus: "active",
        inactiveSince: null,
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

  return { shops, products, shopsById, loading, updateShop, updateProduct, addProduct, removeProduct, removeShop, createShopForUser, reload: loadAll };
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

/* ---- Sponsored listings ----------------------------------------------------
   A shop pays a flat rate to feature one of its own listings in the
   "Sponsored" rail at the top of the homepage for a fixed real-world window.
   One shared list (every shopper needs to see everyone's active campaigns,
   not just their own), each entry a self-contained record of what was
   bought and when it actually expires — expiry is just startedAt/endsAt
   compared against the clock at render time, no server-side job required. */
const SPONSOR_RATES = [
  { id: "daily", label: "1 day", days: 1, price: 1 },
  { id: "weekly", label: "7 days", days: 7, price: 5 },
  { id: "monthly", label: "30 days", days: 30, price: 10 },
  { id: "annual", label: "365 days", days: 365, price: 100 },
];
function sponsorRate(id) {
  return SPONSOR_RATES.find((r) => r.id === id) || SPONSOR_RATES[0];
}
function sponsorIsLive(c, now = Date.now()) {
  return c.status === "active" && c.endsAt > now;
}

function useSponsorships() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef([]);

  const load = useCallback(async () => {
    const stored = await getJSON("sponsorships:list", true, []);
    const safe = Array.isArray(stored) ? stored : [];
    listRef.current = safe;
    setList(safe);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(async (next) => {
    listRef.current = next;
    setList(next);
    await setJSON("sponsorships:list", next, true, { verify: true });
  }, []);

  const createCampaign = useCallback(
    async ({ shopId, productId, objective, rateId, tagline, cardLast4, paymentType }) => {
      const rate = sponsorRate(rateId);
      const now = Date.now();
      const campaign = {
        id: uid("spon"),
        shopId,
        productId,
        objective: objective || "reach",
        rateId,
        days: rate.days,
        amount: rate.price,
        tagline: (tagline || "").trim().slice(0, 60),
        cardLast4: cardLast4 || "",
        paymentType: paymentType === "eft" ? "eft" : "card",
        status: "active",
        startedAt: now,
        endsAt: now + rate.days * 86400000,
        createdAt: now,
      };
      await persist([campaign, ...listRef.current]);
      return campaign;
    },
    [persist]
  );

  const cancelCampaign = useCallback(
    async (id) => {
      await persist(
        listRef.current.map((c) => (c.id === id ? { ...c, status: "cancelled", endsAt: Math.min(c.endsAt, Date.now()) } : c))
      );
    },
    [persist]
  );

  return { list, loading, createCampaign, cancelCampaign, reload: load };
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
  const dropMyReview = ctx?.dropMyReview;
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
    async (author, { rating, body, media }, opts = {}) => {
      setSubmitting(true);
      const review = {
        id: uid("rev"),
        authorId: author.id,
        authorName: author.name,
        authorAvatar: author.avatar,
        rating,
        body,
        media: Array.isArray(media) ? media : [],
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

  // Author-only: removes a review entirely. A shop/product owner can never
  // delete someone else's review — only report it (see flagReview below).
  // Authorization is enforced by the caller (ReviewSection only renders the
  // control for the review's own author), matching this app's existing
  // client-side trust model for shared_kv writes.
  const deleteReview = useCallback(
    async (reviewId) => {
      const next = listRef.current.filter((r) => r.id !== reviewId);
      await commitList(next);
      if (dropMyReview) await dropMyReview(key, reviewId);
    },
    [commitList, dropMyReview, key]
  );

  // Author-only: edit the rating/body of a review they wrote. Runs back
  // through the same "post first, screen second" moderation pipeline as a
  // brand-new review, so an edit can't be used to slip past the screener.
  const editReview = useCallback(
    async (reviewId, { rating, body, media }) => {
      const patch = { rating, body, status: "pending", moderation: null, editedAt: Date.now() };
      if (Array.isArray(media)) patch.media = media;
      await commitList(listRef.current.map((r) => (r.id === reviewId ? { ...r, ...patch } : r)));
      if (patchMyReview) await patchMyReview(key, reviewId, patch);

      (async () => {
        let mod;
        try {
          mod = await moderateText(body);
        } catch (e) {
          mod = { flagged: false, reason: "", pending: true };
        }
        if (mod.pending) return;
        const status = mod.flagged ? "removed" : "published";
        if (patchMyReview) await patchMyReview(key, reviewId, { status, moderation: mod });
        await commitList(listRef.current.map((r) => (r.id === reviewId ? { ...r, status, moderation: mod } : r)));
      })();
    },
    [commitList, patchMyReview, key]
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

  // A review's authorName/authorAvatar is written once, at post time — so
  // without this, renaming your profile (or a shop updating its display
  // name) would leave every review you'd already left frozen under the old
  // name forever. Instead, look up each author's *current* public profile
  // and let it override the stored snapshot at render time; the snapshot
  // itself is left untouched and still serves as a fallback if a lookup
  // fails (offline, or the account no longer exists).
  const [liveAuthors, setLiveAuthors] = useState({});
  const fetchedAuthorIdsRef = useRef(new Set());
  useEffect(() => {
    const ids = new Set();
    allReviews.forEach((r) => {
      if (r.authorId) ids.add(r.authorId);
      if (r.response?.authorId) ids.add(r.response.authorId);
    });
    const toFetch = [...ids].filter((id) => !fetchedAuthorIdsRef.current.has(id));
    if (!toFetch.length) return;
    toFetch.forEach((id) => fetchedAuthorIdsRef.current.add(id));
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        toFetch.map(async (id) => {
          const theirs = await getJSON(`users:${id}`, true, null);
          return theirs ? [id, { name: theirs.name, avatar: theirs.avatar, avatarPhotoId: theirs.avatarPhotoId }] : null;
        })
      );
      if (cancelled) return;
      const found = entries.filter(Boolean);
      if (found.length) setLiveAuthors((prev) => ({ ...prev, ...Object.fromEntries(found) }));
    })();
    return () => {
      cancelled = true;
    };
  }, [allReviews]);

  const published = useMemo(() => allReviews.filter((r) => r.status === "published"), [allReviews]);
  const visible = useMemo(
    () =>
      allReviews
        .filter((r) => r.status === "published" || (r.status === "pending" && viewerId && r.authorId === viewerId))
        .map((r) => {
          const live = liveAuthors[r.authorId];
          const withLiveAuthor = live
            ? { ...r, authorName: live.name || r.authorName, authorAvatar: live.avatar || r.authorAvatar, authorAvatarPhotoId: live.avatarPhotoId }
            : r;
          if (!withLiveAuthor.response) return withLiveAuthor;
          const respVisible =
            withLiveAuthor.response.status === "published" ||
            (withLiveAuthor.response.status === "pending" && viewerId && withLiveAuthor.response.authorId === viewerId);
          if (!respVisible) return { ...withLiveAuthor, response: null };
          const liveResp = liveAuthors[withLiveAuthor.response.authorId];
          if (!liveResp) return withLiveAuthor;
          return {
            ...withLiveAuthor,
            response: {
              ...withLiveAuthor.response,
              authorName: liveResp.name || withLiveAuthor.response.authorName,
              authorAvatar: liveResp.avatar || withLiveAuthor.response.authorAvatar,
              authorAvatarPhotoId: liveResp.avatarPhotoId,
            },
          };
        }),
    [allReviews, viewerId, liveAuthors]
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
    editReview,
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

// Shared by every path that lands a message in a thread (interactive send,
// a scheduled send firing, a mailing-list broadcast) — the single place that
// updates both sides' conversation-list summaries afterward, so
// lastMessage/lastAt/lastSenderId never drift out of sync depending on which
// path sent it. Only the sender's own entry has its draft cleared — the
// other person's in-progress reply, if any, is theirs and untouched.
async function updateConversationSummaries(cid, meId, meName, meAvatar, otherId, otherName, otherAvatar, msg) {
  const summaryUpdate = async (userId, otherUserId, otherUserName, otherUserAvatar, clearOwnDraft) => {
    const list = await getJSON(`conversationsFor:${userId}`, true, []);
    const idx = list.findIndex((c) => c.id === cid);
    const base = idx >= 0 ? list[idx] : {};
    const entry = {
      ...base,
      id: cid,
      otherUserId: otherUserId,
      otherUserName: otherUserName,
      otherUserAvatar: otherUserAvatar,
      lastMessage: msg.body,
      lastAt: msg.createdAt,
      lastSenderId: meId,
      ...(clearOwnDraft ? { draft: "" } : {}),
    };
    const next = idx >= 0 ? [entry, ...list.slice(0, idx), ...list.slice(idx + 1)] : [entry, ...list];
    await setJSON(`conversationsFor:${userId}`, next, true);
  };
  await summaryUpdate(meId, otherId, otherName, otherAvatar, true);
  if (otherId) await summaryUpdate(otherId, meId, meName, meAvatar, false);
}

// Delivers one message on behalf of `me` without an already-open thread in
// memory — used by the scheduled-send sweep, where nothing has the target
// conversation loaded when the moment to send arrives.
async function deliverMessage(me, otherUser, cid, body) {
  if (otherUser) {
    const theirs = await getJSON(`users:${otherUser.id}`, true, null);
    if (theirs && (theirs.blockedUserIds || []).includes(me.id)) return { ok: false, reason: "blocked" };
  }
  const existing = await readJSON(`messages:${cid}`, true, []);
  if (!existing.ok) return { ok: false, reason: "network" };
  const msg = { id: uid("msg"), senderId: me.id, body: body.trim(), createdAt: Date.now() };
  const next = [...(existing.value || []), msg];
  await setJSON(`messages:${cid}`, next, true);
  await updateConversationSummaries(cid, me.id, me.name, me.avatar, otherUser?.id || null, otherUser?.name || "them", otherUser?.avatar || "\u{1F642}", msg);
  if (otherUser) {
    const notif = { id: uid("notif"), type: "message", title: `New message from ${me.name}`, body: msg.body.slice(0, 80), createdAt: Date.now(), read: false, route: { screen: "messages", cid } };
    const theirRead = await readJSON(`notifications:${otherUser.id}`, true, []);
    if (theirRead.ok) await setJSON(`notifications:${otherUser.id}`, [notif, ...(theirRead.value || [])], true);
    logAnalyticsEvent("message", { entityId: otherUser.id, shopId: otherUser.shopId || null });
  }
  return { ok: true, msg };
}

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // Gmail-style: 30 days, then gone for good.

function useConversations(me) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const listRef = useRef([]);

  const load = useCallback(async () => {
    if (!me) return;
    const rec = await getJSON(`conversationsFor:${me.id}`, true, seedConversations(me.id));
    let safe = Array.isArray(rec) ? rec : [];
    // Trash auto-purges after 30 days, same as Gmail — a lazy sweep on load
    // since there's no server-side cron in this stack to do it for us.
    const now = Date.now();
    const kept = safe.filter((c) => !(c.trashed && c.trashedAt && now - c.trashedAt > TRASH_RETENTION_MS));
    if (kept.length !== safe.length) {
      safe = kept;
      setJSON(`conversationsFor:${me.id}`, safe, true);
    }
    listRef.current = safe;
    setList(safe);
    setLoading(false);
  }, [me]);

  // Labels are purely a personal organizing tool — which labels a
  // conversation carries only matters to the person who applied them — so
  // they live in the row-owned kv table (like savedSearches), never in
  // shared_kv where the other side of the conversation could see or touch
  // them.
  const loadLabels = useCallback(async () => {
    if (!me) return;
    const rec = await getJSON(`messageLabels:${me.id}`, false, []);
    setLabels(Array.isArray(rec) ? rec : []);
  }, [me]);

  const loadScheduled = useCallback(async () => {
    if (!me) return;
    const rec = await getJSON(`scheduledMessages:${me.id}`, false, []);
    setScheduled(Array.isArray(rec) ? rec : []);
  }, [me]);

  // Fires any scheduled message whose time has come. Runs on load and on
  // every poll — there's no server cron here, so "on time" means "next time
  // someone with this tab open checks," same tradeoff the abandoned-shop
  // sweep elsewhere in the app makes.
  const checkScheduled = useCallback(async () => {
    if (!me) return;
    const rec = await readJSON(`scheduledMessages:${me.id}`, false, []);
    if (!rec.ok) return;
    const items = Array.isArray(rec.value) ? rec.value : [];
    const now = Date.now();
    const due = items.filter((s) => s.sendAt <= now);
    const remaining = items.filter((s) => s.sendAt > now);
    if (due.length) {
      await setJSON(`scheduledMessages:${me.id}`, remaining, false);
      setScheduled(remaining);
      for (const item of due) {
        await deliverMessage(me, item.otherUserId ? { id: item.otherUserId, name: item.otherUserName, avatar: item.otherUserAvatar } : null, item.cid, item.body);
      }
      load();
    } else {
      setScheduled(items);
    }
  }, [me, load]);

  useEffect(() => {
    load();
    loadLabels();
    loadScheduled();
    checkScheduled();
    if (!me) return;
    const iv = setInterval(() => {
      load();
      checkScheduled();
    }, 20000);
    return () => clearInterval(iv);
  }, [load, loadLabels, loadScheduled, checkScheduled, me]);

  const persistList = useCallback(
    async (next) => {
      listRef.current = next;
      setList(next);
      if (me) await setJSON(`conversationsFor:${me.id}`, next, true);
    },
    [me]
  );

  const patchConversations = useCallback(
    async (cids, patch) => {
      const set = new Set(cids);
      await persistList(listRef.current.map((c) => (set.has(c.id) ? { ...c, ...patch } : c)));
    },
    [persistList]
  );

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
        listRef.current = [entry, ...mine];
        setList(listRef.current);

        // First-ever contact with a Premium vendor auto-subscribes the
        // customer to that vendor's mailing list — removable only by the
        // vendor today (Dashboard > Mailing list), no self-serve unsubscribe
        // yet. Lives in shared_kv, like everything else multi-writer here,
        // since the customer — not the vendor — is the one making this write.
        (async () => {
          const ownerProfile = await getJSON(`users:${otherUser.id}`, true, null);
          if (!ownerProfile?.isVendor || ownerProfile?.plan?.tier !== "premium") return;
          const listRes = await readJSON(`mailingList:${otherUser.id}`, true, []);
          if (!listRes.ok) return;
          const list = Array.isArray(listRes.value) ? listRes.value : [];
          if (list.find((s) => s.userId === me.id)) return;
          await setJSON(
            `mailingList:${otherUser.id}`,
            [...list, { userId: me.id, name: me.name, avatar: me.avatar, source: "message", addedAt: Date.now(), subscribed: true }],
            true
          );
        })();
      }
      return cid;
    },
    [me]
  );

  // Delete-for-me only, same principle as message deletion (see
  // useMessages): trashing/restoring/permanently deleting just changes *my*
  // copy of the conversation index. The other person's copy, and the shared
  // message thread itself, are untouched — they still have their side of it.
  const trashConversations = useCallback((cids) => patchConversations(cids, { trashed: true, trashedAt: Date.now(), spam: false }), [patchConversations]);
  const trashAllConversations = useCallback(async () => {
    await persistList(listRef.current.map((c) => (c.trashed ? c : { ...c, trashed: true, trashedAt: Date.now(), spam: false })));
  }, [persistList]);
  const restoreConversations = useCallback((cids) => patchConversations(cids, { trashed: false, trashedAt: null, spam: false }), [patchConversations]);
  const markAsSpam = useCallback((cids) => patchConversations(cids, { spam: true, trashed: false, trashedAt: null }), [patchConversations]);
  const markNotSpam = useCallback((cids) => patchConversations(cids, { spam: false }), [patchConversations]);
  const permanentlyDeleteConversations = useCallback(
    async (cids) => {
      const drop = new Set(cids);
      await persistList(listRef.current.filter((c) => !drop.has(c.id)));
    },
    [persistList]
  );
  const emptyTrash = useCallback(async () => {
    await persistList(listRef.current.filter((c) => !c.trashed));
  }, [persistList]);

  const toggleStar = useCallback(
    (cid) => {
      const cur = listRef.current.find((c) => c.id === cid);
      return patchConversations([cid], { starred: !cur?.starred });
    },
    [patchConversations]
  );
  const toggleImportant = useCallback(
    (cid) => {
      const cur = listRef.current.find((c) => c.id === cid);
      return patchConversations([cid], { important: !cur?.important });
    },
    [patchConversations]
  );

  // Drafts autosave like Gmail's do: every keystroke updates the list in
  // memory (so the Drafts view reflects it immediately) but the network
  // write is debounced so typing doesn't hammer storage.
  const draftTimer = useRef(null);
  const setDraft = useCallback(
    (cid, text) => {
      const next = listRef.current.map((c) => (c.id === cid ? { ...c, draft: text } : c));
      listRef.current = next;
      setList(next);
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        if (me) setJSON(`conversationsFor:${me.id}`, listRef.current, true);
      }, 600);
    },
    [me]
  );

  const scheduleMessage = useCallback(
    async (otherUser, cid, body, sendAt) => {
      if (!me || !body.trim()) return null;
      const item = { id: uid("sched"), cid, otherUserId: otherUser?.id || null, otherUserName: otherUser?.name || "them", otherUserAvatar: otherUser?.avatar || "\u{1F642}", body: body.trim(), sendAt, createdAt: Date.now() };
      const next = [item, ...scheduled];
      setScheduled(next);
      await setJSON(`scheduledMessages:${me.id}`, next, false);
      return item;
    },
    [me, scheduled]
  );
  const cancelScheduledMessage = useCallback(
    async (id) => {
      const next = scheduled.filter((s) => s.id !== id);
      setScheduled(next);
      if (me) await setJSON(`scheduledMessages:${me.id}`, next, false);
    },
    [me, scheduled]
  );

  const persistLabels = useCallback(
    async (next) => {
      setLabels(next);
      if (me) await setJSON(`messageLabels:${me.id}`, next, false);
    },
    [me]
  );

  const createLabel = useCallback(
    async (name) => {
      const trimmed = (name || "").trim();
      if (!trimmed) return null;
      const label = { id: uid("label"), name: trimmed, createdAt: Date.now() };
      await persistLabels([...labels, label]);
      return label;
    },
    [labels, persistLabels]
  );

  const renameLabel = useCallback(
    async (id, name) => {
      const trimmed = (name || "").trim();
      if (!trimmed) return;
      await persistLabels(labels.map((l) => (l.id === id ? { ...l, name: trimmed } : l)));
    },
    [labels, persistLabels]
  );

  // Deleting a label never deletes the conversations that carried it —
  // they just lose that one tag, the same way deleting a Gmail label
  // doesn't touch the mail underneath it.
  const deleteLabel = useCallback(
    async (id) => {
      await persistLabels(labels.filter((l) => l.id !== id));
      await persistList(listRef.current.map((c) => ((c.labelIds || []).includes(id) ? { ...c, labelIds: c.labelIds.filter((x) => x !== id) } : c)));
    },
    [labels, persistLabels, persistList]
  );

  const toggleLabel = useCallback(
    (cid, labelId) => {
      const cur = listRef.current.find((c) => c.id === cid);
      const has = (cur?.labelIds || []).includes(labelId);
      const nextIds = has ? (cur.labelIds || []).filter((id) => id !== labelId) : [...(cur?.labelIds || []), labelId];
      return patchConversations([cid], { labelIds: nextIds });
    },
    [patchConversations]
  );

  const addLabelToConversations = useCallback(
    (cids, labelId) => {
      const set = new Set(cids);
      return persistList(
        listRef.current.map((c) => {
          if (!set.has(c.id)) return c;
          const ids = c.labelIds || [];
          return ids.includes(labelId) ? c : { ...c, labelIds: [...ids, labelId] };
        })
      );
    },
    [persistList]
  );

  return {
    conversations: list,
    loading,
    ensureConversation,
    refresh: load,
    labels,
    createLabel,
    renameLabel,
    deleteLabel,
    toggleLabel,
    addLabelToConversations,
    toggleStar,
    toggleImportant,
    trashConversations,
    trashAllConversations,
    restoreConversations,
    markAsSpam,
    markNotSpam,
    permanentlyDeleteConversations,
    emptyTrash,
    setDraft,
    scheduled,
    scheduleMessage,
    cancelScheduledMessage,
  };
}

function useMessages(me, cid, otherUser) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const messagesRef = useRef([]);
  // "Delete" here is delete-for-me only, same as SMS/most chat apps — the
  // thread itself (messages:${cid}) is one shared record both people read,
  // so actually removing an entry would erase it for the other person too.
  // Instead each side keeps their own private list of message ids they've
  // hidden, in the row-owned kv table rather than shared_kv, so it never
  // touches the other person's copy of the conversation.
  const [hiddenIds, setHiddenIds] = useState([]);
  useEffect(() => {
    let cancelled = false;
    setHiddenIds([]);
    if (!cid) return;
    getJSON(`hiddenMsgs:${cid}`, false, []).then((ids) => {
      if (!cancelled) setHiddenIds(Array.isArray(ids) ? ids : []);
    });
    return () => {
      cancelled = true;
    };
  }, [cid]);
  const deleteMessage = useCallback(
    async (id) => {
      if (!cid) return;
      setHiddenIds((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        setJSON(`hiddenMsgs:${cid}`, next, false);
        return next;
      });
    },
    [cid]
  );

  // Per-message star/important/labels — same idea as hiddenMsgs above (a
  // private, per-viewer overlay on the shared thread), so categorizing one
  // text is entirely your own business and never touches the other side's
  // copy of the conversation.
  const [msgFlags, setMsgFlags] = useState({});
  const msgFlagsRef = useRef({});
  useEffect(() => {
    let cancelled = false;
    msgFlagsRef.current = {};
    setMsgFlags({});
    if (!cid) return;
    getJSON(`msgFlags:${cid}`, false, {}).then((flags) => {
      const safe = flags && typeof flags === "object" ? flags : {};
      if (!cancelled) {
        msgFlagsRef.current = safe;
        setMsgFlags(safe);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cid]);
  const patchMsgFlags = useCallback(
    (id, patch) => {
      const cur = msgFlagsRef.current[id] || {};
      const next = { ...msgFlagsRef.current, [id]: { ...cur, ...patch } };
      msgFlagsRef.current = next;
      setMsgFlags(next);
      if (cid) setJSON(`msgFlags:${cid}`, next, false);
    },
    [cid]
  );
  const toggleMessageStar = useCallback((id) => patchMsgFlags(id, { starred: !msgFlagsRef.current[id]?.starred }), [patchMsgFlags]);
  const toggleMessageImportant = useCallback((id) => patchMsgFlags(id, { important: !msgFlagsRef.current[id]?.important }), [patchMsgFlags]);
  const toggleMessageLabel = useCallback(
    (id, labelId) => {
      const cur = msgFlagsRef.current[id]?.labelIds || [];
      const nextIds = cur.includes(labelId) ? cur.filter((x) => x !== labelId) : [...cur, labelId];
      patchMsgFlags(id, { labelIds: nextIds });
    },
    [patchMsgFlags]
  );

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

      await updateConversationSummaries(cid, me.id, me.name, me.avatar, otherUser?.id || null, otherUser?.name || "them", otherUser?.avatar || "\u{1F642}", msg);
      if (otherUser) {
        const notif = { id: uid("notif"), type: "message", title: `New message from ${me.name}`, body: msg.body.slice(0, 80), createdAt: Date.now(), read: false, route: { screen: "messages", cid } };
        const theirRead = await readJSON(`notifications:${otherUser.id}`, true, []);
        if (theirRead.ok) {
          await setJSON(`notifications:${otherUser.id}`, [notif, ...(theirRead.value || [])], true);
        }
        logAnalyticsEvent("message", { entityId: otherUser.id, shopId: otherUser.shopId || null });
      }
      return { ok: true };
    },
    [cid, me, otherUser]
  );

  const visibleMessages = useMemo(() => messages.filter((m) => !hiddenIds.includes(m.id)), [messages, hiddenIds]);

  return { messages: visibleMessages, loading, send, blockedByOther, deleteMessage, msgFlags, toggleMessageStar, toggleMessageImportant, toggleMessageLabel };
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

// fromUser (optional) is the person who triggered this — e.g. whoever just
// favorited something — so NotificationsModal can show a small clickable
// avatar next to the notification that jumps straight to their profile.
async function notifyShopOwner(shop, type, title, body, route, fromUser) {
  if (!shop || !shop.ownerId) return;
  const notif = {
    id: uid("notif"),
    type,
    title,
    body,
    createdAt: Date.now(),
    read: false,
    route: route || { screen: "shop", shopId: shop.id },
    ...(fromUser ? { fromUserId: fromUser.id, fromUserName: fromUser.name, fromUserAvatar: fromUser.avatar, fromUserAvatarPhotoId: fromUser.avatarPhotoId } : {}),
  };
  const read = await readJSON(`notifications:${shop.ownerId}`, true, []);
  if (!read.ok) return;
  await setJSON(`notifications:${shop.ownerId}`, [notif, ...(read.value || [])], true);
}

// Generic version of notifyShopOwner for any recipient, not just a shop's
// owner — used by mailing-list broadcasts.
async function notifyUser(userId, type, title, body, route) {
  if (!userId) return;
  const notif = { id: uid("notif"), type, title, body, createdAt: Date.now(), read: false, route: route || { screen: "explore" } };
  const read = await readJSON(`notifications:${userId}`, true, []);
  if (!read.ok) return;
  await setJSON(`notifications:${userId}`, [notif, ...(read.value || [])], true);
}

// Delivers one message outside of the useMessages hook's own send() — used
// by the mailing-list broadcast, which fans a single compose action out to
// every subscriber rather than to one open conversation.
async function deliverBroadcastMessage(fromUser, toUserId, toUserName, toUserAvatar, text) {
  const cid = conversationId(fromUser.id, toUserId);
  const body = `\u{1F4E3} ${text}`.trim();
  const existing = await readJSON(`messages:${cid}`, true, []);
  // A failed read must never be treated as "no history" — that would
  // overwrite an existing thread with just the new broadcast message.
  if (!existing.ok) return false;
  const list = Array.isArray(existing.value) ? existing.value : [];
  const msg = { id: uid("msg"), senderId: fromUser.id, body, createdAt: Date.now(), broadcast: true };
  await setJSON(`messages:${cid}`, [...list, msg], true);

  await updateConversationSummaries(cid, fromUser.id, fromUser.name, fromUser.avatar, toUserId, toUserName, toUserAvatar, msg);
  await notifyUser(toUserId, "message", `Update from ${fromUser.name}`, text.slice(0, 80), { screen: "messages", cid });
  return true;
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
      /* Gentle glowing pulse on the single busiest cell in the peak-activity
         heatmap, so the "why this matters" moment reads as alive rather
         than a static grid of colored squares. */
      @keyframes cs-heat-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(153,27,27,0.6); }
        50% { box-shadow: 0 0 0 5px rgba(153,27,27,0); }
      }
      .cs-heat-peak { animation: cs-heat-pulse 1.8s ease-out infinite; }
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
      .cs-z-authprompt { z-index: 250; }
      .cs-z-sprout { z-index: 300; }
      /* Seed-to-seedling burst played once when a search is submitted: ~2s,
         styled as a little time-lapse rather than the flat logo mark — a
         seed settles into soil, a pale root pushes down while the stem
         pushes up, two cotyledon leaves unfurl in sequence, a small true
         leaf buds at the tip, then the whole scene settles and fades. */
      @keyframes cs-sprout-pop {
        0%   { opacity: 0; transform: scale(0.85); }
        8%   { opacity: 1; transform: scale(1); }
        90%  { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.04); }
      }
      @keyframes cs-sprout-seed {
        0%   { opacity: 0; transform: scale(0.3); }
        8%   { opacity: 1; transform: scale(1); }
        22%  { opacity: 1; transform: scale(1); }
        34%  { opacity: 0; transform: scale(0.4); }
        100% { opacity: 0; }
      }
      @keyframes cs-sprout-root {
        0%   { stroke-dashoffset: 1; opacity: 0; }
        20%  { stroke-dashoffset: 1; opacity: 1; }
        46%  { stroke-dashoffset: 0; opacity: 1; }
        100% { stroke-dashoffset: 0; opacity: 1; }
      }
      @keyframes cs-sprout-stem {
        0%   { stroke-dashoffset: 1; opacity: 0; }
        16%  { stroke-dashoffset: 1; opacity: 1; }
        52%  { stroke-dashoffset: 0; opacity: 1; }
        100% { stroke-dashoffset: 0; opacity: 1; }
      }
      @keyframes cs-sprout-leaf-l {
        0%   { opacity: 0; transform: scale(0.25) rotate(-18deg); }
        46%  { opacity: 0; transform: scale(0.25) rotate(-18deg); }
        64%  { opacity: 1; transform: scale(1) rotate(0deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @keyframes cs-sprout-leaf-r {
        0%   { opacity: 0; transform: scale(0.25) rotate(18deg); }
        54%  { opacity: 0; transform: scale(0.25) rotate(18deg); }
        72%  { opacity: 1; transform: scale(1) rotate(0deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @keyframes cs-sprout-bud {
        0%   { opacity: 0; transform: scale(0.2) translateY(3px); }
        76%  { opacity: 0; transform: scale(0.2) translateY(3px); }
        92%  { opacity: 1; transform: scale(1) translateY(0); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      .cs-sprout-group  { animation: cs-sprout-pop 2000ms ease-out forwards; transform-origin: 50% 88%; }
      .cs-sprout-seed   { animation: cs-sprout-seed 2000ms ease-out forwards; }
      .cs-sprout-root   { animation: cs-sprout-root 2000ms ease-out forwards; }
      .cs-sprout-stem   { animation: cs-sprout-stem 2000ms ease-out forwards; }
      .cs-sprout-leaf-l { animation: cs-sprout-leaf-l 2000ms ease-out forwards; }
      .cs-sprout-leaf-r { animation: cs-sprout-leaf-r 2000ms ease-out forwards; }
      .cs-sprout-bud    { animation: cs-sprout-bud 2000ms ease-out forwards; }
      .cs-map { height: 420px; }
      @media (min-width: 768px) { .cs-map { height: 520px; } }
      .cs-track-wide { letter-spacing: 0.18em; }
      .cs-r3 { border-radius: 3px; }
      .cs-py1 { padding-top: 1px; padding-bottom: 1px; }
      /* min-width: 0 matters here — these bubbles are children of a flex
         column (see the message list), and a flex item's default min-width
         is "auto" (its content's intrinsic width), which lets a long
         unbroken word or URL push the bubble past max-width and off the
         edge of the screen on some browsers. overflow-wrap/word-break force
         a hard break instead. */
      .cs-max75 { max-width: 75%; min-width: 0; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap; }
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

// ---- Comma-formatted number entry. The value a caller reads via onChange is
// always a plain digit string (e.g. "1000.5") — exactly what Number(value),
// formatMoney, and every other bit of math in this app already expects.
// Commas are purely how NumberField *displays* that string while someone is
// looking at it; nothing downstream has to change to get them.
function formatNumberWithCommas(raw) {
  if (raw == null) return "";
  const str = String(raw);
  const neg = str.startsWith("-");
  const body = neg ? str.slice(1) : str;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const decPart = dot === -1 ? "" : body.slice(dot);
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + withCommas + decPart;
}
function cleanNumericInput(raw, allowDecimal) {
  let s = String(raw || "").replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, "");
  if (allowDecimal) {
    const dot = s.indexOf(".");
    if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  }
  return s;
}
function countSignificantChars(str, upto) {
  let n = 0;
  for (let i = 0; i < upto && i < str.length; i++) {
    if (/[\d.]/.test(str[i])) n++;
  }
  return n;
}
function caretForSignificantCount(str, targetCount) {
  if (targetCount <= 0) return 0;
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    if (/[\d.]/.test(str[i])) {
      n++;
      if (n === targetCount) return i + 1;
    }
  }
  return str.length;
}
// A drop-in replacement for a plain numeric <input> that inserts thousands
// commas as you type (1000 -> 1,000) without disturbing where the cursor
// sits — typing in the middle of a number still lands the caret in the right
// place after the comma shifts around it.
function NumberField({ value, onChange, onBlur, allowDecimal = true, placeholder, className, inputRef, onKeyDown, disabled }) {
  const ref = useRef(null);
  const handleChange = (e) => {
    const el = e.target;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    const sigBefore = countSignificantChars(raw, caret);
    const cleaned = cleanNumericInput(raw, allowDecimal);
    const formatted = formatNumberWithCommas(cleaned);
    onChange(cleaned);
    requestAnimationFrame(() => {
      const elNow = ref.current;
      if (!elNow) return;
      const pos = caretForSignificantCount(formatted, sigBefore);
      try {
        elNow.setSelectionRange(pos, pos);
      } catch (err) {
        /* ignore — some input states don't support selection ranges */
      }
    });
  };
  return (
    <input
      ref={(el) => {
        ref.current = el;
        if (inputRef) inputRef.current = el;
      }}
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={formatNumberWithCommas(value)}
      onChange={handleChange}
      onBlur={() => onBlur?.(value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
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
          <NumberField
            inputRef={fieldRef}
            value={val}
            onChange={setVal}
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
    const raw = value === "" || value == null ? "" : String(value);
    const display = numeric ? formatNumberWithCommas(raw) : raw;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          openSheet({
            label: label || placeholder || "Enter text",
            value: raw,
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
  if (numeric) {
    return (
      <NumberField
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit(value);
          }
        }}
      />
    );
  }
  return (
    <input
      type="text"
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
          // Non-interactive (display-only) stars let clicks pass straight
          // through to whatever wraps them — otherwise a disabled <button>
          // silently eats the click and it never reaches a parent's own
          // onClick (e.g. a product card's "view reviews" row).
          style={!interactive ? { pointerEvents: "none" } : undefined}
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
  const preset = BANNER_PRESETS.find((b) => b.id === bannerId) || SPECIAL_PRESETS.find((b) => b.id === bannerId);
  if (!preset) return null;
  const toneMap = {
    sold_out: "stone",
    new: "emerald",
    preorder: "violet",
    in_season: "amber",
    limited: "rose",
    free: "emerald",
    bogo: "rose",
    bogo_half: "amber",
    bundle: "violet",
    flash_sale: "rose",
  };
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

function Modal({ open, onClose, children, labelledBy, size = "md" }) {
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
      {/* size="lg" is for detail cards that should feel like they take over the
          page (the calendar event card) rather than a small form sheet. */}
      <div className={`cs-modal-anim w-full ${size === "lg" ? "sm:max-w-3xl sm:max-h-[88vh]" : "sm:max-w-lg"} max-h-full overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl`}>
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
      title={label}
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

function ProductCard({ product, onEdit, onDelete, sponsored }) {
  const { shopsById, favProducts, toggleFavorite, me, userLoc, openProduct, openProductReviews } = useApp();
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
        {sponsored && !onDelete && (
          <span className="absolute bottom-2 left-2 bg-white/90 rounded-full px-2 py-1 cs-t10 font-bold text-stone-500 shadow-sm inline-flex items-center gap-1">
            <Megaphone size={10} /> Sponsored
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
            onToggle={() => toggleFavorite("product", product)}
          />
        </div>
        {product.showStock && product.stockQty != null && (
          <span
            className={`absolute bottom-2 right-2 cs-t10 font-bold px-2 py-1 rounded-full shadow-sm ${
              product.stockQty > 0 ? "bg-white/90 text-emerald-800" : "bg-stone-800/90 text-white"
            }`}
          >
            {product.stockQty > 0 ? `${product.stockQty} ${priceUnitLabel(product.priceUnit)} left` : "Out of stock"}
          </span>
        )}
      </div>
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-semibold text-stone-900 leading-snug truncate" style={displayFont}>{product.name}</h3>
        {shop && <p className="cs-t11 text-stone-500 mt-0.5 truncate tracking-wide">{shop.name} · {shop.city}, {shop.state}</p>}
        <div className="mt-2.5 pt-2.5 border-t border-stone-100 flex items-baseline justify-between">
          {product.hidePrice ? (
            <span className="cs-t11 font-semibold text-stone-400 italic">See listing for price</span>
          ) : (
            <span className="cs-t17 font-semibold text-stone-900" style={displayFont}>{formatPrice(product.price, product.priceUnit)}</span>
          )}
          {dist != null && <span className="cs-t10 text-stone-400 font-medium uppercase tracking-wider">{formatDistance(dist)}</span>}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            openProductReviews(product.id);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            e.stopPropagation();
            openProductReviews(product.id);
          }}
          className="mt-3.5 flex items-center gap-1.5 self-start cursor-pointer"
          aria-label={
            product.reviewCount > 0
              ? `${product.avgRating.toFixed(1)} star average, ${product.reviewCount} review${product.reviewCount === 1 ? "" : "s"} — view reviews`
              : "No reviews yet — view reviews"
          }
        >
          <span
            className="inline-flex pointer-events-none"
            style={product.reviewCount > 0 ? { filter: "drop-shadow(0 0 3px rgba(251,191,36,0.65))" } : undefined}
          >
            <StarRating value={product.avgRating || 0} size="sm" />
          </span>
          {product.reviewCount > 0 && (
            <span className="cs-t11 text-stone-500 pointer-events-none">
              {product.avgRating.toFixed(1)} ({product.reviewCount})
            </span>
          )}
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
          <FavoriteHeart active={isFav} count={shop.favoriteCount || 0} onToggle={() => toggleFavorite("shop", shop)} />
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

// The seed-to-seedling scene itself, factored out so both the full-screen
// search burst and the small above-the-save-button confirmation can share
// one drawing (and one set of keyframes) at whatever size each needs.
function SproutGrowVisual({ size = "clamp(160px, 33vmin, 420px)" }) {
  return (
      <div
        className="cs-sprout-group relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.24) 0%, rgba(16,185,129,0) 70%)" }}
        />
        <svg viewBox="0 0 100 100" width="80%" height="80%" className="relative">
          <defs>
            <linearGradient id="csSproutStem" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#4d7c3f" />
              <stop offset="100%" stopColor="#6fbf5e" />
            </linearGradient>
            <linearGradient id="csSproutLeafL" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7bc86a" />
              <stop offset="100%" stopColor="#488c42" />
            </linearGradient>
            <linearGradient id="csSproutLeafR" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7bc86a" />
              <stop offset="100%" stopColor="#488c42" />
            </linearGradient>
            <radialGradient id="csSproutSoil" cx="50%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#8a6238" />
              <stop offset="100%" stopColor="#5f4025" />
            </radialGradient>
          </defs>

          {/* soil mound — static ground the seedling grows out of */}
          <ellipse cx="50" cy="91" rx="35" ry="7" fill="#4a3320" opacity="0.16" />
          <ellipse cx="50" cy="88.5" rx="27" ry="5.2" fill="url(#csSproutSoil)" opacity="0.85" />
          <ellipse cx="42" cy="87" rx="3" ry="1.1" fill="#3d2a18" opacity="0.35" />
          <ellipse cx="60" cy="89" rx="4" ry="1.3" fill="#3d2a18" opacity="0.3" />

          {/* pale root, pushing down into the soil */}
          <path
            className="cs-sprout-root"
            d="M50 85.5 C 47.5 90, 44.5 94, 41.5 99"
            stroke="#e4d3ac"
            strokeWidth="1.3"
            strokeLinecap="round"
            fill="none"
            pathLength="1"
            style={{ strokeDasharray: 1 }}
          />

          {/* the seed itself, sitting at the soil line before it's absorbed */}
          <ellipse
            className="cs-sprout-seed"
            cx="50"
            cy="85.5"
            rx="4.4"
            ry="3.3"
            fill="#8a5a2f"
            stroke="#5f3c1d"
            strokeWidth="0.5"
            style={{ transformOrigin: "50px 85.5px" }}
          />
          <path
            className="cs-sprout-seed"
            d="M47 84.5 C 48.5 85.5, 51.5 85.5, 53 84.5"
            stroke="#5f3c1d"
            strokeWidth="0.4"
            fill="none"
            opacity="0.6"
            style={{ transformOrigin: "50px 85.5px" }}
          />

          {/* stem — a gentle natural curve rather than a straight rule */}
          <path
            className="cs-sprout-stem"
            d="M50 86 C 48.8 73, 52.8 60, 50.3 44"
            stroke="url(#csSproutStem)"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
            pathLength="1"
            style={{ strokeDasharray: 1 }}
          />

          {/* two cotyledon leaves, unfurling in sequence */}
          <g className="cs-sprout-leaf-l" style={{ transformOrigin: "50px 45px" }}>
            <path d="M50 45 C 39 42, 29 47, 30.5 56.5 C 40 59.5, 50 54, 50 45 Z" fill="url(#csSproutLeafL)" />
            <path d="M50 45 C 44 47, 37 51, 32 55.5" stroke="#356b31" strokeWidth="0.5" fill="none" opacity="0.55" />
          </g>
          <g className="cs-sprout-leaf-r" style={{ transformOrigin: "51px 45px" }}>
            <path d="M51 45 C 62 42, 72 47, 70.5 56.5 C 61 59.5, 51 54, 51 45 Z" fill="url(#csSproutLeafR)" />
            <path d="M51 45 C 57 47, 64 51, 69 55.5" stroke="#356b31" strokeWidth="0.5" fill="none" opacity="0.55" />
          </g>

          {/* a small true leaf budding at the tip — the payoff of the timelapse */}
          <path
            className="cs-sprout-bud"
            d="M50.3 44 C 48 38, 50.5 32.5, 50 29 C 52.5 32.5, 54.5 39, 50.3 44 Z"
            fill="#3f9142"
            style={{ transformOrigin: "50px 44px" }}
          />
        </svg>
      </div>
  );
}

// Plays once when a search is submitted: a little ~2s time-lapse of the seed
// sprouting, centred over the current screen. Rendered as a RootShell-level
// sibling (not inside TopBar) since TopBar's backdrop-blur would otherwise
// re-anchor a position:fixed child to the header instead of the real
// viewport. Sized off the same JS-measured viewportHeight the rest of the
// app uses for keyboard-safe overlays — a plain "fixed inset-0" was getting
// centred against the pre-keyboard layout height on some mobile browsers,
// which put the animation below the fold once the keyboard was up.
function SearchSproutBurst({ onDone }) {
  const { viewportHeight } = useApp();
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 2100);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="fixed inset-x-0 top-0 flex items-center justify-center pointer-events-none cs-z-sprout"
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
      aria-hidden="true"
    >
      <SproutGrowVisual />
    </div>
  );
}

// Small confirmation used above the Storefront Editor's floating Save
// button — same drawing and timing as the search burst, just scaled down
// and anchored to its parent instead of centred over the whole screen.
function SaveSproutBurst({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 2100);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none flex items-center justify-center" aria-hidden="true">
      <SproutGrowVisual size="76px" />
    </div>
  );
}

function TopBar({ onOpenSearch, onOpenNotifs, onOpenAccount, onOpenFavorites, onGoHome, onOpenFilters, onSubmitSearch, filterCount }) {
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
          <button
            type="button"
            onClick={() => onSubmitSearch?.(globalSearch)}
            className="shrink-0 text-stone-400 hover:text-emerald-700 transition"
            aria-label="Search"
          >
            <Search size={15} />
          </button>
          <input
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              onOpenSearch();
            }}
            onFocus={onOpenSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmitSearch?.(globalSearch);
              }
            }}
            placeholder="Search"
            className="bg-transparent outline-none text-sm w-full min-w-0 text-stone-800 placeholder-stone-400"
            aria-label="Search listings and shops"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
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

        <button onClick={onOpenAccount} className="shrink-0 relative w-8 h-8 flex items-center justify-center" aria-label={me ? "Account" : "Sign up or log in"}>
          {me?.avatarPhotoId ? (
            <Avatar emoji={me.avatar} name={me.name} size="sm" photoId={me.avatarPhotoId} />
          ) : me ? (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-800">
              <SproutMark size={16} />
            </span>
          ) : (
            // Signed out (including a brand-new guest who hasn't created a
            // profile yet): a blank, generic headshot rather than the sprout
            // mark, so the icon itself signals "you're not signed in" before
            // they even tap it.
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 text-stone-400">
              <User size={16} />
            </span>
          )}
          {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white" />}
        </button>
      </div>
    </header>
  );
}

function BottomNav({ route, navigate }) {
  const { me, exploreView, setExploreView } = useApp();
  const items = [
    { id: "explore", label: "Explore", icon: Home },
    { id: "store", label: me?.isVendor ? "My Store" : "Sell", icon: Store },
    { id: "messages", label: "Messages", icon: MessageCircle },
  ];
  return (
    <nav className="md:hidden shrink-0 bg-white border-t border-stone-200 flex justify-around items-center pt-1.5 cs-safe-bottom z-40">
      {items.map((it) => {
        // Explore and Map share the same "explore" screen, told apart by
        // exploreView — so Explore only reads as active here when the map
        // isn't the one showing (matches Sidebar's isItemActive above).
        const isActive =
          it.id === "explore"
            ? route.screen === "explore" && exploreView !== "map"
            : route.screen === it.id || (it.id === "store" && route.screen === "storeEditor");
        return (
          <button
            key={it.id}
            onClick={() => {
              // exploreView lives outside this screen and doesn't reset on
              // its own, so tapping Explore after being on the map would
              // otherwise leave you looking at the map again.
              if (it.id === "explore") setExploreView("grid");
              navigate({ screen: it.id });
            }}
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
  const { me, exploreView, setExploreView, signOut } = useApp();
  const items = [
    { id: "explore", label: "Explore", icon: Home, screen: "explore" },
    { id: "store", label: me?.isVendor ? "My Store" : "Start Selling", icon: Store, screen: "store" },
    { id: "messages", label: "Messages", icon: MessageCircle, screen: "messages" },
    { id: "favorites", label: "Favorites", icon: Heart, screen: "favorites" },
    { id: "dashboard", label: "Dashboard", icon: TrendingUp, screen: "dashboard" },
    { id: "orders", label: "Orders", icon: ClipboardList, screen: "orders", tab: "orders" },
    { id: "orders-calendar", label: "Calendar", icon: Calendar, screen: "orders", tab: "calendar" },
    { id: "orders-inventory", label: "Inventory", icon: Boxes, screen: "orders", tab: "inventory" },
    { id: "ads", label: "Sponsored Ads", icon: Megaphone, screen: "ads" },
    // A quick jump straight to the Map view of Explore, not the separate
    // saved-Places screen this used to point to.
    { id: "map", label: "Map", icon: MapPin, screen: "explore" },
  ];
  // Orders/Calendar/Inventory all point at the same "orders" screen and are
  // told apart only by which tab they ask for, so the plain screen === id
  // check every other item uses isn't enough to tell which one is "active".
  // Explore/Map share a screen too, told apart by the exploreView toggle.
  const isItemActive = (it) => {
    if (it.id === "map") return route.screen === "explore" && exploreView === "map";
    if (it.id === "explore") return route.screen === "explore" && exploreView !== "map";
    if (it.screen !== route.screen) return it.screen === "store" && route.screen === "storeEditor";
    if (it.screen === "orders") return it.tab ? route.tab === it.tab : !route.tab;
    return true;
  };
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-stone-200 p-5 overflow-y-auto">
      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xl mb-8 px-2" style={displayFont}>
        <Sparkles size={22} /> CropSwap
      </div>
      <nav className="flex-1 flex flex-col gap-1">
        {items.map((it) => {
          const isActive = isItemActive(it);
          return (
            <button
              key={it.id}
              onClick={() => {
                if (it.id === "map") setExploreView("map");
                // "Explore" and "Map" both point at the same screen and are
                // told apart only by exploreView, which lives outside this
                // screen and so doesn't reset on its own — without this,
                // clicking Explore after having been on Map left you on Map.
                if (it.id === "explore") setExploreView("grid");
                navigate(it.tab ? { screen: it.screen, tab: it.tab } : { screen: it.screen });
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition ${isActive ? "bg-emerald-50 text-emerald-800" : "text-stone-500 hover:bg-stone-50"}`}
            >
              <it.icon size={18} /> {it.label}
            </button>
          );
        })}
      </nav>
      {/* Pinned footer — sits at the bottom of the sidebar's own scroll area,
          so it stays put on a tall list of nav items instead of getting
          swept in with everything else above. */}
      <div className="flex flex-col gap-1 pt-3 mt-3 border-t border-stone-100 shrink-0">
        <button
          onClick={() => navigate({ screen: "plans" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition text-stone-500 hover:bg-stone-50"
        >
          <Crown size={18} /> My Plan
        </button>
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition text-stone-500 hover:bg-stone-50">
          <LogOut size={18} /> Sign Out
        </button>
      </div>
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
              <option value="name">Name A–Z</option>
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
  const { products: allProducts, shops: allShops, shopsById, userLoc, me, showToast, globalSearch, setGlobalSearch, requireAuth, sponsorships } = useApp();
  const { filters, setFilters, filterOpen, setFilterOpen, exploreView: view, setExploreView: setView, registerSaveSearch } = useApp();
  const searchDraft = globalSearch;
  const setSearchDraft = setGlobalSearch;

  // Shops with a lapsed plan are excluded from general browse/search/map
  // results entirely — including for their own owner, who manages a lapsed
  // shop from Account > Selling instead of finding it in normal listings.
  const shops = useMemo(() => allShops.filter(isShopBrowsable), [allShops]);
  const products = useMemo(() => {
    const visibleShopIds = new Set(shops.map((s) => s.id));
    return allProducts.filter((p) => visibleShopIds.has(p.shopId));
  }, [allProducts, shops]);
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
    if (!requireAuth("save this search")) return;
    const label =
      (filters.search || searchDraft || "").trim() ||
      (filters.categories.length ? filters.categories.map((c) => catInfo(c).label).join(" + ") : "") ||
      "All listings";
    const entry = { id: uid("ss"), label, filters: { ...filters, search: searchDraft } };
    persistSaved([entry, ...savedSearches.filter((s) => s.label !== label)].slice(0, 8));
    showToast(`Saved "${label}"`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchDraft, savedSearches, showToast, requireAuth]);

  useEffect(() => {
    registerSaveSearch?.(() => saveCurrentSearch);
    return () => registerSaveSearch?.(null);
  }, [registerSaveSearch, saveCurrentSearch]);

  // Live filtering only — this fires on every pause while typing, so it must
  // never log a "search" analytics event itself (that used to record partial
  // substrings like "mil" or "ra" mid-keystroke). Completed-search logging
  // lives in RootShell's logSearchTerm, driven by explicit submit + an idle
  // fallback long enough to be sure typing has actually stopped.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchDraft }));
    }, 250);
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

  // Every 30 minutes the Sponsored rail slides its last item around to the
  // front, so campaigns keep cycling through the top spot instead of one
  // newest campaign always dominating it. The bucket is derived purely from
  // wall-clock time, so it never needs its own storage and every shopper's
  // page agrees on the same order at the same moment. A 1-minute check is
  // cheap and only actually re-renders when the 30-minute bucket changes.
  const SPONSOR_ROTATE_MS = 30 * 60000;
  const [sponsorRotationBucket, setSponsorRotationBucket] = useState(() => Math.floor(Date.now() / SPONSOR_ROTATE_MS));
  useEffect(() => {
    const iv = setInterval(() => {
      const bucket = Math.floor(Date.now() / SPONSOR_ROTATE_MS);
      setSponsorRotationBucket((prev) => (prev === bucket ? prev : bucket));
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  // Live, paid-for campaigns, newest first, capped so the rail can't grow
  // unbounded — each one resolved back to its actual (still-browsable)
  // listing, since a sponsored product could since have been deleted or its
  // shop could have gone unbrowsable. Then rotated by the 30-minute bucket
  // above so every campaign gets a turn at the front.
  const sponsoredNow = useMemo(() => {
    const productsById = Object.fromEntries(products.map((p) => [p.id, p]));
    const live = (sponsorships || [])
      .filter((c) => sponsorIsLive(c) && productsById[c.productId])
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 10)
      .map((c) => ({ campaign: c, product: productsById[c.productId] }));
    if (live.length < 2) return live;
    const shift = sponsorRotationBucket % live.length;
    if (shift === 0) return live;
    return [...live.slice(-shift), ...live.slice(0, live.length - shift)];
  }, [sponsorships, products, sponsorRotationBucket]);

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
          {[
            { id: "shops", label: "Shops" },
            { id: "listings", label: "Listings" },
            { id: "map", label: "Map" },
            { id: "selling", label: me?.isVendor ? "My Shop" : "Start Selling" },
          ].map((btn) => {
            const isActive = (btn.id === "listings" && view === "grid") || (btn.id === "shops" && view === "shops") || (btn.id === "map" && view === "map");
            const handleClick = () => {
              if (btn.id === "listings") setView("grid");
              else if (btn.id === "shops") setView("shops");
              else if (btn.id === "map") setView("map");
              // "Start Selling"/"My Shop" points at the same "store" screen
              // for guests, non-vendors, and vendors alike — StoreScreen
              // itself decides what to show (upgrade preview, signup form,
              // or the real storefront). This matches how Sidebar/BottomNav
              // already route their own Start Selling / My Store items.
              else if (btn.id === "selling") navigate({ screen: "store" });
            };
            return (
              <button
                key={btn.id}
                onClick={handleClick}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition shrink-0 ${isActive ? "bg-emerald-700 bg-opacity-50 text-white border-emerald-600" : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"}`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {sponsoredNow.length > 0 && view === "grid" && (
          <div className="mb-6">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Megaphone size={13} /> Sponsored</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
              {sponsoredNow.map(({ campaign, product: pr }) => (
                <div key={campaign.id} className="w-40 shrink-0">
                  <ProductCard product={pr} sponsored />
                  {campaign.tagline && <p className="cs-t10 text-stone-500 mt-1 truncate">{campaign.tagline}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-stone-400 font-medium mb-3">{sorted.length} listing{sorted.length === 1 ? "" : "s"}{userLoc ? ` near ${userLoc.label}` : ""}</p>

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

const OSM_SUBDOMAINS = ["a", "b", "c"];
function osmTileUrl(x, y, z) {
  const sub = OSM_SUBDOMAINS[(x + y) % OSM_SUBDOMAINS.length];
  return `https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
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
          {(!me || shop.ownerId !== me.id) && (
            <button
              onClick={() => { if (navigate({ screen: "messages", withUserId: shop.ownerId, withUserName: shop.name, withUserAvatar: shop.emoji })) onClose(); }}
              className="border border-stone-200 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Message
            </button>
          )}
          <button onClick={() => { onClose(); onOpenShop(shop); }} className="bg-emerald-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg">
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
  // Deliberately its own field, separate from the cover/background photo —
  // a shop's circular logo and its full-width banner are two different
  // photos a vendor should be able to set independently.
  const uploaded = usePhotoUrl(shop.logoPhotoId);
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

  const { tiles, originX, originY } = useMemo(
    () => computeTiles(center.lat, center.lng, zoom, size.width, size.height),
    [center.lat, center.lng, zoom, size.width, size.height]
  );

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

  // Trackpad pinch and Ctrl+scroll arrive as wheel events with ctrlKey set.
  // Left alone, the browser treats that as a request to zoom the whole page
  // (fonts, layout, everything) rather than our map, which is what produced
  // the blank strips and stuck-zoom feeling. Attached natively (not via
  // React's onWheel) so preventDefault actually takes effect — React makes
  // its synthetic wheel listener passive by default, which silently no-ops
  // preventDefault. A plain, non-ctrl wheel is left untouched so the page
  // can still be scrolled normally while the cursor is over the map.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let accum = 0;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      accum += e.deltaY;
      const STEP = 12;
      if (Math.abs(accum) >= STEP) {
        zoomBy(accum < 0 ? 1 : -1);
        accum = 0;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Two-finger pinch and double-tap, layered on top of the single-finger pan
  // above. Pointer Events don't group multiple fingers into a gesture on
  // their own, so every active pointer is tracked by id; once a second one
  // lands, distance between the two fingers drives zoom instead of pan, and
  // the point the map zooms toward (rather than just its center) is kept
  // under the fingers/tap the same way scroll-to-zoom-at-cursor works on
  // desktop maps.
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const downPosRef = useRef(null);
  const tapRef = useRef({ time: 0, x: 0, y: 0 });

  const toLocalPoint = (clientX, clientY) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: clientX, y: clientY };
  };
  const screenToLngLat = (x, y) => ({
    lng: worldXToLng(originX + x, zoom),
    lat: worldYToLat(originY + y, zoom),
  });
  const zoomTowardScreenPoint = (screenX, screenY, targetZoomRaw) => {
    const targetZoom = clamp(Math.round(targetZoomRaw), MIN_ZOOM, MAX_ZOOM);
    const anchor = screenToLngLat(screenX, screenY);
    const nx = lngToWorldX(anchor.lng, targetZoom) - screenX + size.width / 2;
    const ny = latToWorldY(anchor.lat, targetZoom) - screenY + size.height / 2;
    setCenter({ lat: worldYToLat(ny, targetZoom), lng: worldXToLng(nx, targetZoom) });
    setZoom(targetZoom);
  };

  const handlePointerDown = (e) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      downPosRef.current = { x: e.clientX, y: e.clientY };
      beginPan(e);
    } else if (pointersRef.current.size === 2) {
      dragRef.current = null;
      downPosRef.current = null;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {
        /* pinch still works via mouse events */
      }
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = { startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, startZoom: zoom };
    }
  };
  const handlePointerMove = (e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values()).slice(0, 2);
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const mid = toLocalPoint((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      zoomTowardScreenPoint(mid.x, mid.y, pinchRef.current.startZoom + Math.log2(dist / pinchRef.current.startDist));
      return;
    }
    pan(e);
  };
  const handlePointerUp = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size !== 0) return;
    endPan(e);
    if (downPosRef.current) {
      const moved = Math.hypot(e.clientX - downPosRef.current.x, e.clientY - downPosRef.current.y);
      if (moved < 8) {
        const now = Date.now();
        const local = toLocalPoint(e.clientX, e.clientY);
        const last = tapRef.current;
        if (now - last.time < 320 && Math.hypot(local.x - last.x, local.y - last.y) < 40) {
          zoomTowardScreenPoint(local.x, local.y, zoom + 1);
          tapRef.current = { time: 0, x: 0, y: 0 };
        } else {
          tapRef.current = { time: now, x: local.x, y: local.y };
        }
      }
    }
    downPosRef.current = null;
  };
  const handlePointerCancel = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      endPan(e);
      downPosRef.current = null;
    }
  };

  return (
    <div>
      <div className="relative">
      <div
        ref={wrapRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative w-full cs-map rounded-2xl overflow-hidden border border-stone-200 cs-touch-none select-none cursor-grab active:cursor-grabbing"
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "#e8eaf0" }} aria-hidden="true">
          {tiles.map((t) => (
            <img
              key={t.key}
              src={osmTileUrl(t.x, t.y, t.z)}
              alt=""
              draggable="false"
              width={TILE_SIZE}
              height={TILE_SIZE}
              style={{ position: "absolute", left: t.left, top: t.top, width: TILE_SIZE, height: TILE_SIZE, userSelect: "none" }}
            />
          ))}
        </div>
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

        {/* Zoom controls. onPointerDown stops the click from being eaten by
            the map's own pan handler, which captures the pointer on the
            wrapping div the moment any press lands inside it — the same fix
            already applied to the shop pins below. */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => zoomBy(1)}
            disabled={zoom >= MAX_ZOOM}
            className="w-12 h-12 rounded-xl bg-white shadow-lg border border-stone-200 flex items-center justify-center text-2xl font-bold text-stone-700 disabled:opacity-40 active:bg-stone-100"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
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
              onPointerDown={(e) => e.stopPropagation()}
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
            onPointerDown={(e) => e.stopPropagation()}
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
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline pointer-events-auto"
          >
            OpenStreetMap
          </a>{" "}
          contributors
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
// Shown the instant containsBlockedContent() catches something, so the
// person understands why their review didn't post rather than just seeing
// it silently refuse to submit.
function TosWarningModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="tos-warning-title">
      <div className="p-6">
        <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
          <ShieldAlert size={22} />
        </div>
        <h2 id="tos-warning-title" className="text-lg font-bold text-stone-900" style={displayFont}>This can't be posted</h2>
        <p className="text-sm text-stone-600 mt-2">
          That review contains language or content that goes against CropSwap's Terms &amp; Conditions — things
          like profanity, slurs, explicit content, or hateful/vulgar imagery aren't allowed anywhere on the app,
          including in reviews.
        </p>
        <p className="text-sm text-stone-600 mt-2">Please rewrite it and try again.</p>
        <button onClick={onClose} className="w-full mt-4 px-4 py-2.5 rounded-lg text-sm font-semibold bg-stone-900 text-white">Got it</button>
      </div>
    </Modal>
  );
}

// Reporting a review offers two distinct paths: an actual content violation
// (re-screened immediately, same pipeline as flagReview always used), or a
// review that just seems fake/bad-faith, which nothing here can verify
// automatically — that one is only ever logged for a human to look at, never
// auto-hidden, so this can't be weaponized to silently bury real negative
// feedback.
function ReportReviewModal({ review, onClose, onReportContent, onReportSuspicious, busy }) {
  return (
    <Modal open={!!review} onClose={onClose} labelledBy="report-review-title">
      <div className="p-6">
        <h2 id="report-review-title" className="text-lg font-bold text-stone-900" style={displayFont}>Report this review</h2>
        <p className="text-sm text-stone-600 mt-1.5 mb-4">What's the issue?</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onReportContent}
            disabled={busy}
            className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-50"
          >
            <span className="block text-sm font-semibold text-stone-800">Inappropriate content</span>
            <span className="block text-xs text-stone-500 mt-0.5">Swearing, hate speech, explicit content, or similar</span>
          </button>
          <button
            onClick={onReportSuspicious}
            disabled={busy}
            className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 disabled:opacity-50"
          >
            <span className="block text-sm font-semibold text-stone-800">Doesn't seem genuine</span>
            <span className="block text-xs text-stone-500 mt-0.5">e.g. a low rating from someone who never visited or bought anything</span>
          </button>
        </div>
        <button onClick={onClose} disabled={busy} className="w-full mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Cancel</button>
      </div>
    </Modal>
  );
}

function ReviewSection({ entityType, entityId, ownerId, shopId }) {
  const { me, updateShop, updateProduct, shopsById, showToast, helpfulMarks, toggleHelpfulMark, openProfileCard, requireAuth } = useApp();
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
    editReview,
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
  const [draftMedia, setDraftMedia] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editBody, setEditBody] = useState("");
  const [editMedia, setEditMedia] = useState([]);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [flagState, setFlagState] = useState({});
  const [pendingHelpful, setPendingHelpful] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [pendingRespHelpful, setPendingRespHelpful] = useState(null);
  const [tosWarning, setTosWarning] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);

  // Logs to the same shared reports:queue the message-report flow already
  // writes to (see MessagesScreen's handleReport) — one queue, tagged by
  // `type`, is what the admin tooling planned for later will read from.
  const logReviewReport = useCallback(
    async (review, type, extra = {}) => {
      const report = {
        id: uid("report"),
        type,
        reporterId: me.id,
        reportedUserId: review.authorId,
        reportedUserName: review.authorName,
        reviewId: review.id,
        entityType,
        entityId,
        shopId: shopId || (entityType === "shop" ? entityId : null),
        reviewSnapshot: { rating: review.rating, body: review.body, createdAt: review.createdAt },
        createdAt: Date.now(),
        status: "open",
        ...extra,
      };
      const existing = await getJSON("reports:queue", true, []);
      await setJSON("reports:queue", [report, ...existing].slice(0, 200), true);
    },
    [me, entityType, entityId, shopId]
  );

  const handleHelpful = async (reviewId) => {
    if (pendingHelpful) return;
    setPendingHelpful(reviewId);
    const res = await toggleHelpfulMark(reviewId);
    if (res) await adjustHelpful(reviewId, res.added ? 1 : -1);
    setPendingHelpful(null);
  };

  const handleResponseHelpful = async (reviewId) => {
    if (pendingRespHelpful) return;
    setPendingRespHelpful(reviewId);
    const res = await toggleHelpfulMark(`resp:${reviewId}`);
    if (res) await adjustResponseHelpful(reviewId, res.added ? 1 : -1);
    setPendingRespHelpful(null);
  };

  // "Inappropriate content": re-runs the AI screener immediately (same
  // pipeline submitReview always uses) AND logs the outcome to reports:queue,
  // so even an auto-resolved report leaves a trail for the admin tooling
  // planned for later — not just the unresolved "suspicious" reports below.
  const handleReportContent = async (review) => {
    setReportBusy(true);
    setFlagState((s) => ({ ...s, [review.id]: "checking" }));
    const { outcome } = await flagReview(review.id, me.id);
    setFlagState((s) => ({ ...s, [review.id]: outcome }));
    await logReviewReport(review, "review_content", {
      outcome,
      status: outcome === "removed" ? "auto_removed" : "auto_cleared",
    });
    setReportBusy(false);
    setReportTarget(null);
    if (outcome === "removed") showToast("Review removed — thanks for reporting it");
    else showToast("Reported — our screener found no violation, but it's logged for our team");
  };

  // "Doesn't seem genuine": nothing here can actually verify whether someone
  // visited a shop or bought anything, so — unlike a content violation —
  // this never auto-hides the review. It only ever queues for a human to
  // weigh in, which also means it can't be weaponized to bury real negative
  // feedback just by claiming it's fake.
  const handleReportSuspicious = async (review) => {
    setReportBusy(true);
    await logReviewReport(review, "review_suspicious");
    setFlagState((s) => ({ ...s, [review.id]: "flagged_suspicious" }));
    setReportBusy(false);
    setReportTarget(null);
    showToast("Thanks — flagged for our team to review");
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review? This can't be undone.")) return;
    await deleteReview(reviewId);
    showToast("Review deleted");
  };

  const startEditReview = (review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditBody(review.body);
    setEditMedia(review.media || []);
  };

  const cancelEditReview = () => {
    setEditingId(null);
    setEditRating(0);
    setEditBody("");
    setEditMedia([]);
  };

  const submitEditReview = async (reviewId) => {
    if (!editBody.trim() || editRating === 0 || editBusy) return;
    if (containsBlockedContent(editBody).blocked) {
      setTosWarning(true);
      return;
    }
    setEditBusy(true);
    await editReview(reviewId, { rating: editRating, body: editBody.trim(), media: editMedia });
    setEditBusy(false);
    setEditingId(null);
    setEditRating(0);
    setEditBody("");
    setEditMedia([]);
    showToast("Review updated — pending re-screening");
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
    if (containsBlockedContent(draftBody).blocked) {
      setTosWarning(true);
      return;
    }
    const targetShop = entityType === "shop" ? shopsById[entityId] : shopsById[shopId];
    const result = await submitReview(
      me,
      { rating: draftRating, body: draftBody.trim(), media: draftMedia },
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
    setDraftMedia([]);
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

      {!me && (
        <button
          type="button"
          onClick={() => requireAuth("leave a review")}
          className="text-sm text-emerald-700 font-semibold mb-3 hover:underline"
        >
          Create a free CropSwap profile to leave a review.
        </button>
      )}
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
              <ReviewMediaPicker media={draftMedia} onChange={setDraftMedia} />
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
              <button
                onClick={() => openProfileCard({ id: r.authorId, name: r.authorName, avatar: r.authorAvatar, avatarPhotoId: r.authorAvatarPhotoId })}
                aria-label={`View ${r.authorName}'s profile`}
                className="shrink-0"
              >
                <Avatar emoji={r.authorAvatar} name={r.authorName} size="sm" photoId={r.authorAvatarPhotoId} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-stone-800">{r.authorName}</span>
                  {r.status === "pending" && <span className="cs-t10 font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Pending review</span>}
                  <span className="cs-t11 text-stone-400" title={new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}>
                    {timeAgo(r.createdAt)}{r.editedAt ? " · edited" : ""}
                  </span>
                </div>
                {editingId === r.id ? (
                  <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 mt-1.5">
                    <StarRating value={editRating} onChange={setEditRating} size="lg" />
                    <TextField
                      value={editBody}
                      onChange={setEditBody}
                      placeholder="How was your experience?"
                      label="Your review"
                      multiline
                      rows={4}
                      className="w-full mt-2 border border-stone-200 rounded-xl p-2.5 text-sm outline-none focus:border-emerald-700"
                    />
                    <ReviewMediaPicker media={editMedia} onChange={setEditMedia} />
                    <div className="flex gap-2 mt-2.5">
                      <button onClick={cancelEditReview} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-500">Cancel</button>
                      <button
                        onClick={() => submitEditReview(r.id)}
                        disabled={editBusy || editRating === 0 || !editBody.trim()}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {editBusy ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : "Save changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <StarRating value={r.rating} size="sm" />
                    <p className="text-sm text-stone-600 mt-1">{r.body}</p>
                    {r.media?.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {r.media.map((item) => (
                          <ReviewMediaThumb key={item.id} item={item} onOpen={setLightboxItem} />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {r.status === "pending" && me && r.authorId === me.id && editingId !== r.id && (
                  <p className="cs-t11 text-amber-700 mt-1">Being screened before it appears on this listing. Only you can see it for now.</p>
                )}
                {editingId !== r.id && (
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => handleHelpful(r.id)}
                    disabled={pendingHelpful === r.id}
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
                    ) : flagState[r.id] === "flagged_suspicious" ? (
                      <span className="cs-t11 text-stone-400">Reported — thanks</span>
                    ) : (
                      <button onClick={() => setReportTarget(r)} className="cs-t11 text-stone-400 hover:text-rose-600 inline-flex items-center gap-1">
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
                  {me && r.authorId === me.id && (
                    <>
                      <button onClick={() => startEditReview(r)} className="cs-t11 text-stone-400 hover:text-emerald-800 inline-flex items-center gap-1">
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => handleDeleteReview(r.id)} className="cs-t11 text-stone-400 hover:text-rose-600 inline-flex items-center gap-1">
                        <Trash2 size={11} /> Delete
                      </button>
                    </>
                  )}
                </div>
                )}

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
                        disabled={pendingRespHelpful === r.id}
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
      <TosWarningModal open={tosWarning} onClose={() => setTosWarning(false)} />
      <ReportReviewModal
        review={reportTarget}
        busy={reportBusy}
        onClose={() => !reportBusy && setReportTarget(null)}
        onReportContent={() => handleReportContent(reportTarget)}
        onReportSuspicious={() => handleReportSuspicious(reportTarget)}
      />
      {lightboxItem && <ReviewMediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
    </div>
  );
}

/* ============================================================================
   SECTION 17: PRODUCT DETAIL MODAL
============================================================================ */
function ProductDetailModal({ product, open, onClose, navigate, focusReviews }) {
  const { shopsById, favProducts, toggleFavorite, incrementShare, me, userLoc, showToast } = useApp();

  useEffect(() => {
    if (!open || !product) return;
    const shopForView = shopsById[product.shopId];
    if (shopForView && me && me.id === shopForView.ownerId) return;
    const loc = splitCityState(me?.homeLocation?.label);
    logViewOnce(`product:${product.id}`, () => {
      logAnalyticsEvent("view_product", { entityId: product.id, entityName: product.name, shopId: product.shopId, city: loc.city, state: loc.state });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id, me?.id]);

  // Opened via a product card's star rating — jump straight to the review
  // list instead of leaving the shopper to scroll and find it themselves.
  useEffect(() => {
    if (!open || !focusReviews || !product) return;
    const t = setTimeout(() => {
      document.getElementById("product-reviews-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(t);
  }, [open, focusReviews, product?.id]);

  if (!product) return null;
  const shop = shopsById[product.shopId];
  const cat = catInfo(product.category);
  const isFav = !!favProducts[product.id];
  const dist = shop && userLoc ? haversineMiles(userLoc.lat, userLoc.lng, shop.lat, shop.lng) : null;

  const handleShare = async () => {
    const res = await shareContent({ title: product.name, text: `Check out ${product.name} from ${shop?.name} on CropSwap — ${formatPrice(product.price, product.priceUnit)}.` });
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
          {product.showStock && product.stockQty != null && (
            <span
              className={`absolute bottom-3 right-3 cs-t11 font-bold px-2.5 py-1 rounded-full shadow-sm ${
                product.stockQty > 0 ? "bg-white/90 text-emerald-800" : "bg-stone-800/90 text-white"
              }`}
            >
              {product.stockQty > 0 ? `${product.stockQty} ${priceUnitLabel(product.priceUnit)} left in stock` : "Out of stock"}
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="prod-title" className="text-xl font-bold text-stone-900" style={displayFont}>{product.name}</h2>
            </div>
            <span className="text-xl font-semibold text-stone-900 shrink-0" style={displayFont}>{formatPrice(product.price, product.priceUnit)}</span>
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
            <FavoriteHeart active={isFav} count={product.favoriteCount || 0} onToggle={() => toggleFavorite("product", product)} size="lg" />
            <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-1.5 border border-stone-200 rounded-xl py-2.5 font-semibold text-sm text-stone-700">
              <Share2 size={15} /> Share{product.shareCount > 0 ? ` · ${product.shareCount}` : ""}
            </button>
            {shop && (!me || me.id !== shop.ownerId) && (
              <button
                onClick={() => { if (navigate({ screen: "messages", withUserId: shop.ownerId, withUserName: shop.name, withUserAvatar: shop.emoji })) onClose(); }}
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

          <div id="product-reviews-anchor">
            <ReviewSection entityType="product" entityId={product.id} ownerId={shop?.ownerId} shopId={product.shopId} />
          </div>
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
  const { shopsById, products, favShops, toggleFavorite, incrementShare, me, userLoc, showToast, setExploreView } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const shop = shopsById[shopId];

  useEffect(() => {
    if (!shop || (me && me.id === shop.ownerId)) return;
    // Logged with the *viewer's* home location, not the shop's — this is what
    // powers the "who's engaging with your shop, and from where" panel.
    const loc = splitCityState(me?.homeLocation?.label);
    logViewOnce(`shop:${shop.id}`, () => {
      logAnalyticsEvent("view_shop", { entityId: shop.id, entityName: shop.name, shopId: shop.id, city: loc.city, state: loc.state });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, me?.id]);

  if (!shop) return <EmptyState icon={Store} title="Shop not found" body="This storefront may have moved." />;
  if (!isShopVisible(shop, me?.id)) {
    return <EmptyState icon={Store} title="This storefront is currently unavailable" body="Its owner's plan has lapsed — it may return soon." />;
  }

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
      {/* Same Shops/Listings/Map/My Shop row as the top of Explore/Map, in
          the same top-of-page position with the same padding — so landing
          on My Store doesn't mean scrolling past the banner and bio first
          to find the nav you already saw everywhere else. Owner-only, same
          as before; a visitor viewing someone else's shop never sees it. */}
      {isOwner && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
            {[
              { id: "shops", label: "Shops" },
              { id: "listings", label: "Listings" },
              { id: "map", label: "Map" },
              { id: "store", label: "My Shop" },
            ].map((btn) => {
              // "My Shop" represents the page already on screen, so it's a
              // no-op rather than a real nav target (clicking it used to
              // send you away to Explore, which defeated the point of it
              // reading as the "you are here" button).
              const isActive = btn.id === "store";
              const handleClick = () => {
                if (btn.id === "listings") { setExploreView("grid"); navigate({ screen: "explore" }); }
                else if (btn.id === "shops") { setExploreView("shops"); navigate({ screen: "explore" }); }
                else if (btn.id === "map") { setExploreView("map"); navigate({ screen: "explore" }); }
              };
              return (
                <button
                  key={btn.id}
                  onClick={handleClick}
                  disabled={isActive}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition shrink-0 ${isActive ? "bg-emerald-700 bg-opacity-50 text-white border-emerald-600 cursor-default" : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"}`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* relative: the Back / Edit storefront buttons below are absolutely
          positioned against THIS banner (not <main>), so they stay pinned
          to its corners no matter what renders above it — the nav row when
          isOwner, nothing at all when it's a visitor viewing someone else's
          shop. */}
      <div className="relative h-40 md:h-52 overflow-hidden">
        <button onClick={() => navigate({ screen: "explore" })} className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur rounded-full px-3 py-2 shadow-md flex items-center gap-1.5 text-sm font-semibold text-stone-700">
          <ArrowLeft size={15} /> Back
        </button>
        {isOwner && (
          <button onClick={() => navigate({ screen: "storeEditor" })} className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur rounded-full px-3 py-2 shadow-md flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
            <Pencil size={14} /> Edit storefront
          </button>
        )}
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

        <div className="flex items-center gap-2 flex-wrap mt-4">
          <FavoriteHeart active={isFav} count={shop.favoriteCount || 0} onToggle={() => toggleFavorite("shop", shop)} size="lg" />
          <button onClick={handleShare} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-4 py-2 font-semibold text-sm text-stone-700 hover:bg-stone-50 transition">
            <Share2 size={15} /> Shares{shop.shareCount > 0 ? ` · ${shop.shareCount}` : ""}
          </button>
          {!isOwner && (
            <button
              onClick={() => navigate({ screen: "messages", withUserId: shop.ownerId, withUserName: shop.name, withUserAvatar: shop.emoji })}
              className="flex items-center gap-1.5 bg-emerald-800 text-white rounded-full px-4 py-2 font-semibold text-sm"
            >
              <MessageCircle size={15} /> Message
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate({ screen: "dashboard" })} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-4 py-2 font-semibold text-sm text-stone-700 hover:bg-stone-50 transition">
              <TrendingUp size={15} /> Dashboard
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate({ screen: "orders", tab: "orders" })} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-4 py-2 font-semibold text-sm text-stone-700 hover:bg-stone-50 transition">
              <ClipboardList size={15} /> Orders
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate({ screen: "orders", tab: "calendar" })} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-4 py-2 font-semibold text-sm text-stone-700 hover:bg-stone-50 transition">
              <Calendar size={15} /> Calendar
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate({ screen: "orders", tab: "inventory" })} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-4 py-2 font-semibold text-sm text-stone-700 hover:bg-stone-50 transition">
              <Boxes size={15} /> Inventory
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate({ screen: "ads" })} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-4 py-2 font-semibold text-sm text-stone-700 hover:bg-stone-50 transition">
              <Megaphone size={15} /> Sponsored Ads
            </button>
          )}
          {isOwner && (
            <button onClick={() => navigate({ screen: "plans" })} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-4 py-2 font-semibold text-sm text-stone-700 hover:bg-stone-50 transition">
              <Sparkles size={15} /> My Plan
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
  const { updateShop, userLoc, showToast } = useApp();
  const [bio, setBio] = useState(shop.bio);
  const [name, setName] = useState(shop.name || "");
  const [handle, setHandle] = useState(shop.handle || "");
  const [city, setCity] = useState(shop.city || "");
  const [stateCode, setStateCode] = useState(shop.state || "");
  const [countryCode, setCountryCode] = useState(shop.country || "US");
  const [tagline, setTagline] = useState(shop.tagline || "");
  const [pickup, setPickup] = useState(shop.pickupNotes || "");

  useEffect(() => {
    setBio(shop.bio);
    setName(shop.name || "");
    setHandle(shop.handle || "");
    setCity(shop.city || "");
    setStateCode(shop.state || "");
    setCountryCode(shop.country || "US");
    setTagline(shop.tagline || "");
    setPickup(shop.pickupNotes || "");
  }, [shop.id]);

  // Tries to put the map pin on the exact town/city typed in; falls back to
  // an approximate state/country center only if that lookup can't find a
  // match. Shared by the city, state, and country fields below since any of
  // the three changing means the pin needs to be re-placed.
  const placeShop = async (nextCity, nextState, nextCountry) => {
    const geo = await geocodeLocation({ city: nextCity, state: nextState, country: nextCountry });
    if (geo) return geo;
    return nextCountry === "US" ? stateApproxLatLng(nextState, shop.id) : countryApproxLatLng(nextCountry, shop.id);
  };

  return (
    <div>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Cover photo (background)</p>
      <div className="mb-5">
        <PhotoPicker
          photoId={shop.coverPhotoId}
          onChange={(id) => updateShop(shop.id, { coverPhotoId: id })}
          label="Upload a cover photo"
          hint="Shown across the top of your storefront. Until you upload one, your storefront shows a default Orchard Rows scene."
          aspect={16 / 7}
          size="lg"
        />
      </div>

      <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Profile icon (circle logo)</p>
      <div className="mb-5">
        <PhotoPicker
          photoId={shop.logoPhotoId}
          onChange={(id) => updateShop(shop.id, { logoPhotoId: id })}
          shape="round"
          square
          label="Upload a profile photo"
          hint="Your shop's circular icon — separate from the cover photo above"
          size="lg"
        />
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
      <label className="block cs-t11 font-semibold text-stone-500 mb-1">Shop name</label>
      <TextField
        value={name}
        onChange={setName}
        onBlur={(v) => updateShop(shop.id, { name: (v || "").trim() || shop.name })}
        label="Shop name"
        placeholder="Your farm or shop name"
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-2 outline-none focus:border-emerald-700"
      />
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
      <label className="block cs-t11 font-semibold text-stone-500 mb-1">Town or city</label>
      <TextField
        value={city}
        onChange={setCity}
        onBlur={async (v) => {
          const nextCity = v || shop.city;
          const point = await placeShop(nextCity, stateCode, countryCode);
          updateShop(shop.id, point ? { city: nextCity, lat: point.lat, lng: point.lng } : { city: nextCity });
        }}
        label="Town or city"
        placeholder="Town"
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-2 outline-none focus:border-emerald-700"
      />
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
        <label className="block cs-t11 font-semibold text-stone-500 mb-1">{countryCode === "US" ? "State" : "State / province"}</label>
        {countryCode === "US" ? (
          <select
            value={stateCode}
            onChange={async (e) => {
              const code = e.target.value;
              setStateCode(code);
              // Re-places the shop's map pin using the newly chosen state so
              // it actually shows up there, not just in the text on the page.
              const point = await placeShop(city, code, countryCode);
              updateShop(shop.id, point ? { state: code, lat: point.lat, lng: point.lng } : { state: code });
            }}
            aria-label="State"
            className="w-full border border-stone-200 rounded-xl px-2 py-2.5 text-sm bg-white"
          >
            <option value="">State…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.code}</option>
            ))}
          </select>
        ) : (
          <TextField
            value={stateCode}
            onChange={setStateCode}
            onBlur={async (v) => {
              const point = await placeShop(city, v, countryCode);
              updateShop(shop.id, point ? { state: v, lat: point.lat, lng: point.lng } : { state: v });
            }}
            label="State / province"
            placeholder="State / province"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />
        )}
        </div>
        <div className="flex-1">
        <label className="block cs-t11 font-semibold text-stone-500 mb-1">Country</label>
        <select
          value={countryCode}
          onChange={async (e) => {
            const code = e.target.value;
            const wasUS = countryCode === "US";
            const nowUS = code === "US";
            setCountryCode(code);
            // A US state code and a typed province name aren't interchangeable,
            // so crossing the US/non-US line clears the state field rather
            // than carrying over text that no longer means anything. Also
            // re-places the map pin for the new country so it doesn't stay
            // stuck wherever the old country/state left it.
            const nextState = wasUS !== nowUS ? "" : stateCode;
            if (wasUS !== nowUS) setStateCode("");
            const point = await placeShop(city, nextState, code);
            updateShop(shop.id, point ? { country: code, state: nextState, lat: point.lat, lng: point.lng } : { country: code, state: nextState });
          }}
          aria-label="Country"
          className="w-full border border-stone-200 rounded-xl px-2 py-2.5 text-sm bg-white"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        </div>
      </div>
      {userLoc && (
        <button
          type="button"
          onClick={() => {
            updateShop(shop.id, { lat: userLoc.lat, lng: userLoc.lng });
            showToast?.("Shop pinned to your exact current location");
          }}
          className="flex items-center gap-1.5 cs-t11 font-semibold text-emerald-800 mb-4"
        >
          <MapPin size={12} /> Use my exact current location for the map pin
        </button>
      )}
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
  { key: "bread", label: "Bread & baked" },
];

function AddProductForm({ shop, onClose, editing }) {
  const { addProduct, updateProduct, viewportHeight, showToast } = useApp();
  const inventory = useInventory(shop.id);
  const [photoId, setPhotoId] = useState(editing?.photoId || null);
  const [art, setArt] = useState(editing?.art || "tomato");
  const [name, setName] = useState(editing?.name || "");
  const [category, setCategory] = useState(editing?.category || "Veggie");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [priceUnit, setPriceUnit] = useState(editing?.priceUnit || "each");
  const [desc, setDesc] = useState(editing?.desc || "");
  // Only offered on a brand-new listing — an existing one manages its stock
  // from the Inventory tab (or the Inventory link on this form's edit mode
  // isn't shown here at all, to avoid two different places claiming to set
  // the same running quantity).
  const [startingStock, setStartingStock] = useState("");
  const [saving, setSaving] = useState(false);
  const canSave = name.trim() && price !== "" && !isNaN(Number(price));

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    // The chosen icon now carries a real stock photo (see IMG) rather than
    // just a cartoon — set it as the listing's fallback image/credit so a
    // vendor who skips uploading their own photo still gets a realistic
    // one. An uploaded photoId still always wins at render time.
    const stock = IMG[art];
    const payload = {
      name: name.trim(),
      category,
      price: Math.max(0, Number(price)),
      priceUnit,
      desc: desc.trim(),
      photoId,
      art,
      image: stock ? stock.url : null,
      credit: stock ? { by: stock.by, source: stock.source } : null,
      emoji: "",
    };
    if (editing) {
      await updateProduct(shop.id, editing.id, payload);
      showToast("Listing updated");
    } else {
      const product = await addProduct(shop.id, payload);
      // A starting stock number creates a linked Inventory item in the same
      // step, so a new listing can already be stock-tracked — falling out
      // of stock, showing "low," deducting on completed orders — without a
      // separate trip to the Inventory tab. Left blank, no item is created
      // and the listing just isn't inventory-tracked, same as before.
      if (startingStock.trim() !== "" && !isNaN(Number(startingStock))) {
        await inventory.addItem({
          name: product.name,
          category: product.category,
          unit: product.priceUnit,
          qty: Number(startingStock),
          price: product.price,
          linkedProductId: product.id,
        });
      }
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
            <span className="cs-t11 font-semibold text-stone-400 uppercase">or pick a photo</span>
            <span className="flex-1 h-px bg-stone-200" />
          </div>

          <div className="grid grid-cols-5 gap-2 mb-5">
            {PRODUCT_ICON_CHOICES.map((choice) => {
              const stock = IMG[choice.key];
              return (
                <button
                  key={choice.key}
                  onClick={() => setArt(choice.key)}
                  className={`rounded-xl overflow-hidden border-2 transition ${art === choice.key ? "border-emerald-700" : "border-stone-200 hover:border-stone-300"}`}
                  aria-label={choice.label}
                  aria-pressed={art === choice.key}
                  title={choice.label}
                >
                  <span className="block aspect-square relative">
                    {/* Drawn plate underneath as a graceful fallback if the
                        stock photo is slow or unreachable; matches the same
                        loading pattern used everywhere else in the app. */}
                    <ProduceArt artKey={choice.key} category={category} />
                    {stock && (
                      <img
                        src={stock.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                  </span>
                </button>
              );
            })}
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

          <label className="block cs-t11 font-semibold text-stone-500 mb-1">Priced per</label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setPriceUnit("each")}
              className={`px-2.5 py-1 rounded-full cs-t11 font-semibold border transition ${priceUnit === "each" ? "bg-emerald-800 text-white border-emerald-800" : "border-stone-200 text-stone-500"}`}
            >
              each
            </button>
            {PRICE_UNIT_CHOICES.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setPriceUnit(u.id)}
                className={`px-2.5 py-1 rounded-full cs-t11 font-semibold border transition ${priceUnit === u.id ? "bg-emerald-800 text-white border-emerald-800" : "border-stone-200 text-stone-500"}`}
              >
                {u.label}
              </button>
            ))}
          </div>

          {!editing && (
            <>
              <label className="block cs-t11 font-semibold text-stone-500 mb-1">Starting stock (optional)</label>
              <TextField
                value={startingStock}
                onChange={setStartingStock}
                numeric
                label="Starting stock"
                placeholder={`e.g. 24 ${priceUnitLabel(priceUnit)}`}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-1 outline-none focus:border-emerald-700"
              />
              <p className="cs-t10 text-stone-400 mb-3">
                Sets this listing up in your Inventory with this much in stock right away — tracked automatically from here on. Leave blank to skip inventory tracking for now; you can always add it later from the Inventory tab.
              </p>
            </>
          )}

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

function ProductEditRow({ product, shop, onEditDetails }) {
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
          <p className="text-xs text-stone-400">{formatPrice(product.price, product.priceUnit)} · {catInfo(product.category).label}</p>
        </div>
        <button onClick={onEditDetails} className="text-stone-400 hover:text-emerald-800" aria-label="Edit details">
          <Pencil size={15} />
        </button>
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
          <p className="cs-t11 font-bold text-stone-400 uppercase mb-1.5 flex items-center gap-1"><Megaphone size={12} /> Special offer</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SPECIAL_PRESETS.map((b) => (
              <button key={b.id} onClick={() => setBanner(b.id)} className={`px-2.5 py-1 rounded-full cs-t11 font-semibold border transition ${product.bannerId === b.id ? "bg-rose-700 text-white border-rose-700" : "border-stone-200 text-stone-500"}`}>{b.label}</button>
            ))}
          </div>
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
          <div className="mt-3 pt-3 border-t border-stone-100 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-700">Auto out-of-stock banner</p>
                <p className="cs-t10 text-stone-400">When this listing is linked to an inventory item, follow its stock level automatically.</p>
              </div>
              <ToggleSwitch
                checked={product.autoStockBanner !== false}
                onChange={(v) => updateProduct(shop.id, product.id, { autoStockBanner: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-700">Show price on card</p>
                <p className="cs-t10 text-stone-400">Turn off to hide the price on browse cards — shoppers still see it if they open the listing.</p>
              </div>
              <ToggleSwitch
                checked={!product.hidePrice}
                onChange={(v) => updateProduct(shop.id, product.id, { hidePrice: !v })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsTab({ shop, products }) {
  // null = closed, "new" = add flow, a product object = editing that listing.
  const [formTarget, setFormTarget] = useState(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Your listings ({products.length})</p>
        <button onClick={() => setFormTarget("new")} className="flex items-center gap-1 text-sm font-semibold text-emerald-800"><Plus size={15} /> Add listing</button>
      </div>
      <div className="flex flex-col gap-2 mb-6">
        {products.map((pr) => (
          <ProductEditRow key={pr.id} product={pr} shop={shop} onEditDetails={() => setFormTarget(pr)} />
        ))}
        {products.length === 0 && <p className="text-sm text-stone-400">No listings yet — add your first one.</p>}
      </div>
      {formTarget && (
        <AddProductForm shop={shop} onClose={() => setFormTarget(null)} editing={formTarget === "new" ? null : formTarget} />
      )}
    </div>
  );
}

let storefrontEditorLastTab = "layout";
function StorefrontEditor({ navigate, initialTab }) {
  const { me, shopsById, products, showToast } = useApp();
  const [tab, setTabState] = useState(initialTab || storefrontEditorLastTab);
  const setTab = (t) => {
    storefrontEditorLastTab = t;
    setTabState(t);
  };
  // An Account-modal quick link (e.g. "Updates") passes an explicit tab even
  // when this screen is already mounted — no remount to re-run useState's
  // initializer — so that explicit request still needs to win here.
  useEffect(() => {
    if (initialTab) setTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);
  const [justSaved, setJustSaved] = useState(false);

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

  // Every field on every tab here already writes straight through the moment
  // it changes (see the updateShop/updateProduct calls inside each tab) — this
  // button doesn't do any extra saving. It's a deliberate, reassuring "yes,
  // that's saved" moment a vendor can tap after a batch of edits, complete
  // with the little sprout as visible confirmation.
  const handleSave = () => {
    setJustSaved(false);
    requestAnimationFrame(() => setJustSaved(true));
    showToast("Storefront saved");
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8 relative">
      <div className="sticky top-0 bg-white border-b border-stone-200 z-10 px-4 pt-3">
        <button onClick={() => navigate({ screen: "shop", shopId: shop.id })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-3">
          <ArrowLeft size={15} /> Back to storefront
        </button>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: "layout", label: "Theme & Layout", icon: LayoutGrid },
            { id: "products", label: "Products", icon: ShoppingBag },
            { id: "updates", label: "Updates", icon: Bell },
            { id: "tools", label: "Tools & FAQ", icon: TrendingUp },
            { id: "banners", label: "Banners", icon: Sparkles },
            { id: "contact", label: "Contact Card", icon: UserPlus },
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

      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40 flex flex-col items-center">
        {justSaved && <SaveSproutBurst onDone={() => setJustSaved(false)} />}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-full shadow-lg transition active:scale-95"
        >
          <Save size={16} /> Save
        </button>
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

// A wavy/scalloped bottom edge, built as a zigzag rather than a true curve —
// clip-path's path() form needs fixed pixel coordinates, which can't track a
// banner that resizes with its text, so a percentage-based polygon is what
// stays correct at any width. Enough segments and it still reads as a wave.
function scallopEdgeClip(segments, depthPct) {
  const pts = ["0% 0%", "100% 0%"];
  for (let i = segments; i >= 0; i--) {
    const x = (i / segments) * 100;
    const y = i % 2 === 0 ? 100 : 100 - depthPct;
    pts.push(`${x.toFixed(2)}% ${y}%`);
  }
  return `polygon(${pts.join(", ")})`;
}

// Ten silhouettes a banner can take, purely geometric (no imagery of any
// kind — just clipped polygon edges), so a vendor picks a shape the same
// tap-to-choose way they already pick colour and size. padX widens the
// horizontal padding on shapes that cut into the sides, so their text never
// runs into a notch or point.
const BANNER_SHAPES = [
  { id: "classic", label: "Classic", clipPath: null, padX: "1rem", rounded: true },
  { id: "ribbon", label: "Ribbon", clipPath: "polygon(0% 0%, 100% 0%, 92% 50%, 100% 100%, 0% 100%, 8% 50%)", padX: "1.6rem" },
  { id: "pennant", label: "Pennant", clipPath: "polygon(0% 0%, 84% 0%, 100% 50%, 84% 100%, 0% 100%)", padX: "1.5rem" },
  { id: "arrow", label: "Arrow", clipPath: "polygon(0% 0%, 80% 0%, 100% 50%, 80% 100%, 0% 100%, 14% 50%)", padX: "1.8rem" },
  { id: "hexagon", label: "Hexagon", clipPath: "polygon(6% 0%, 94% 0%, 100% 50%, 94% 100%, 6% 100%, 0% 50%)", padX: "1.5rem" },
  { id: "wavy", label: "Wavy", clipPath: scallopEdgeClip(12, 20), padX: "1rem", padBottom: "0.9rem" },
  { id: "scalloped", label: "Scalloped", clipPath: scallopEdgeClip(6, 34), padX: "1rem", padBottom: "1.3rem" },
  { id: "flag", label: "Flag", clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 56% 100%, 50% 76%, 44% 100%, 0% 100%)", padX: "1rem", padBottom: "0.7rem" },
  { id: "slant", label: "Slant", clipPath: "polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)", padX: "1.3rem" },
  { id: "tag", label: "Tag", clipPath: "polygon(16% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 16%)", padX: "1.2rem" },
];
const bannerShapeInfo = (id) => BANNER_SHAPES.find((s) => s.id === id) || BANNER_SHAPES[0];

function ShopBannerRibbon({ banner, className = "" }) {
  if (!banner || !banner.text) return null;
  const shape = bannerShapeInfo(banner.shape);
  return (
    <span
      className={`inline-block shadow-sm max-w-full truncate ${shape.rounded ? "rounded" : ""} ${className}`}
      style={{
        background: banner.bg || "#047857",
        color: banner.color || "#ffffff",
        fontSize: `${bannerSizePx(banner.size)}px`,
        fontWeight: banner.bold ? 700 : 500,
        fontStyle: banner.italic ? "italic" : "normal",
        fontFamily: banner.serif ? "'Fraunces', serif" : "'Inter', sans-serif",
        letterSpacing: banner.wide ? "0.08em" : "normal",
        clipPath: shape.clipPath || undefined,
        paddingLeft: shape.padX,
        paddingRight: shape.padX,
        paddingTop: "0.25rem",
        paddingBottom: shape.padBottom || "0.25rem",
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
        shape: "classic",
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

            <p className="cs-t11 font-bold text-stone-400 uppercase mt-3 mb-1.5">Shape</p>
            <div className="grid grid-cols-5 gap-1.5">
              {BANNER_SHAPES.map((shape) => (
                <button
                  key={shape.id}
                  onClick={() => editBanner(b.id, { shape: shape.id })}
                  className={`rounded-lg border-2 p-1.5 flex flex-col items-center gap-1 transition ${(b.shape || "classic") === shape.id ? "border-emerald-700 bg-emerald-50" : "border-stone-200"}`}
                  aria-pressed={(b.shape || "classic") === shape.id}
                  title={shape.label}
                >
                  <span
                    className={`block w-full h-4 ${shape.rounded ? "rounded" : ""}`}
                    style={{ background: b.bg || "#047857", clipPath: shape.clipPath || undefined }}
                  />
                  <span className="cs-t9 font-semibold text-stone-500 truncate w-full text-center">{shape.label}</span>
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
        const res = await toggleRestockWatch(product.id);
        if (res) showToast(res.added ? "We'll let you know when it's back" : "Alert removed");
      }}
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
  const [tab, setTab] = useState("shops");
  const [search, setSearch] = useState("");
  // Alphabetical by default (per name, not distance) — search and the full
  // Sort by / category filters below still work the same as everywhere else
  // in the app, just starting from a name-sorted list instead of nearest-first.
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, sortBy: "name" });
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your favorites"
              className="bg-transparent outline-none text-sm w-full"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button onClick={() => setFilterOpen(true)}><IconButton icon={Filter} label="Filters" /></button>
        </div>
        <div className="flex gap-1 mb-5 bg-stone-100 rounded-full p-1 w-fit">
          <button onClick={() => setTab("shops")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === "shops" ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>Favorite Shops ({favShopList.length})</button>
          <button onClick={() => setTab("products")} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${tab === "products" ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>Favorite Items ({filteredProducts.length})</button>
        </div>

        {tab === "products" &&
          (filteredProducts.length === 0 ? (
            <EmptyState icon={Heart} title="No favorite items yet" body="Tap the heart on any listing to save it here." />
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
// Press-and-hold (or right-click on desktop) to pull up per-message actions —
// the same gesture Google Messages, WhatsApp, and iMessage all use. Pointer
// events cover touch and mouse with one set of handlers; a real move during
// the hold (scrolling, not just the finger settling) cancels it so a scroll
// gesture never gets mistaken for a long-press.
function useLongPress(onLongPress, ms = 450) {
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const start = useCallback(
    (e) => {
      startRef.current = { x: e.clientX, y: e.clientY };
      clear();
      timerRef.current = setTimeout(() => onLongPress(e), ms);
    },
    [onLongPress, ms, clear]
  );
  const onPointerMove = useCallback(
    (e) => {
      const s = startRef.current;
      if (!s) return;
      if (Math.abs(e.clientX - s.x) > 10 || Math.abs(e.clientY - s.y) > 10) clear();
    },
    [clear]
  );
  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onPointerMove,
    onContextMenu: (e) => {
      e.preventDefault();
      clear();
      onLongPress(e);
    },
  };
}

// The small "what do you want to do with this message" sheet a long-press
// opens — delete here is always delete-for-me (see useMessages), so it's
// safe to offer on a message from either side of the conversation.
// A single text's own "⋮" — star, mark important, and label it just like a
// whole conversation, plus the existing copy/delete-for-me. One tap opens
// this; nothing here requires a long-press.
function MessageActionSheet({ message, flags, onClose, onCopy, onDelete, onStar, onImportant, onLabels }) {
  return (
    <Modal open={!!message} onClose={onClose} labelledBy="msg-action-title">
      <div className="p-6">
        <h2 id="msg-action-title" className="sr-only">Message actions</h2>
        {message && <p className="text-xs text-stone-400 mb-4 line-clamp-2">"{message.body}"</p>}
        <div className="flex flex-col gap-2">
          <button onClick={onStar} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Star size={15} className={flags?.starred ? "fill-amber-400 text-amber-400" : ""} /> {flags?.starred ? "Unstar" : "Star"}
          </button>
          <button onClick={onImportant} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800 flex items-center gap-2">
            <AlertCircle size={15} className={flags?.important ? "fill-amber-100 text-amber-600" : ""} /> {flags?.important ? "Mark not important" : "Mark important"}
          </button>
          <button onClick={onLabels} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Tag size={15} /> Labels…
          </button>
          <button onClick={onCopy} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800">
            Copy text
          </button>
          <button onClick={onDelete} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-rose-50 text-sm font-semibold text-rose-600">
            Delete for me
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Cancel</button>
      </div>
    </Modal>
  );
}

// Tapping/clicking the bubble itself opens the same star/flag/label/copy/
// delete sheet as the "⋮" — no need to find a tiny button first. The "⋮"
// stays too, mainly as a visual hint that the bubble is interactive.
// Starred/important/labeled messages get a tiny badge row under the bubble
// so it's visible at a glance without opening anything.
function MessageBubble({ message, isMine, flags, onOpenActions }) {
  const hasBadges = !!(flags?.starred || flags?.important || (flags?.labelIds || []).length > 0);
  return (
    <div className={`flex items-end gap-1 max-w-[85%] ${isMine ? "self-end flex-row-reverse" : "self-start"}`}>
      <div
        onClick={() => onOpenActions(message)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenActions(message); } }}
        aria-label="Message options"
        className={`cs-max75 px-3.5 py-2 rounded-2xl text-sm cursor-pointer active:opacity-80 transition-opacity ${isMine ? "bg-emerald-800 text-white rounded-br-sm hover:bg-emerald-900" : "bg-white border border-stone-200 text-stone-800 rounded-bl-sm hover:bg-stone-50"}`}
      >
        <p>{message.body}</p>
        {hasBadges && (
          <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {flags.starred && <Star size={10} className={isMine ? "fill-amber-300 text-amber-300" : "fill-amber-400 text-amber-400"} />}
            {flags.important && <AlertCircle size={10} className={isMine ? "text-amber-200" : "text-amber-600"} />}
            {(flags.labelIds || []).length > 0 && <Tag size={10} className={isMine ? "text-amber-200" : "text-amber-600"} />}
          </div>
        )}
      </div>
      <button onClick={() => onOpenActions(message)} aria-label="Message options" className="shrink-0 text-stone-300 hover:text-stone-600 p-1">
        <MoreVertical size={14} />
      </button>
    </div>
  );
}

// A small, reusable "are you sure?" card — same look as the storefront/listing
// delete confirms elsewhere in the app — for the genuinely destructive
// conversation-history actions (delete one, delete several, delete all).
function ConfirmModal({ open, title, body, confirmLabel = "Delete", onConfirm, onClose }) {
  const [working, setWorking] = useState(false);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 cs-z-pop flex items-center justify-center p-4 cs-fade-anim"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cs-modal-anim bg-white rounded-2xl w-full max-w-xs p-5">
        <h3 className="text-base font-bold text-stone-900 mb-1" style={displayFont}>{title}</h3>
        <p className="text-sm text-stone-600 mb-4">{body}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stone-200 font-semibold text-stone-600 text-sm">
            Cancel
          </button>
          <button
            onClick={async () => {
              setWorking(true);
              await onConfirm();
              setWorking(false);
              onClose();
            }}
            disabled={working}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {working ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// The quick, single-tap alternative to a long-press: a "⋮" on every
// conversation row opens this sheet immediately, no hold required.
// The single-row "⋮" — one tap, no hold, everything Gmail's row hover
// actions plus its right-click menu would offer. Which context actions show
// up depends on which view the row is sitting in (Trash gets Restore/Delete
// forever, Spam gets Not spam, everywhere else gets Spam/Trash).
function ConversationActionSheet({ conversation, view, onClose, onStar, onImportant, onLabels, onSpam, onNotSpam, onTrash, onRestore, onDeleteForever }) {
  if (!conversation) return null;
  const inTrash = view === "trash";
  const inSpam = view === "spam";
  return (
    <Modal open={!!conversation} onClose={onClose} labelledBy="convo-action-title">
      <div className="p-6">
        <h2 id="convo-action-title" className="sr-only">Conversation actions</h2>
        <p className="text-xs text-stone-400 mb-4 line-clamp-1">{conversation.otherUserName}</p>
        <div className="flex flex-col gap-2">
          <button onClick={onStar} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Star size={15} className={conversation.starred ? "fill-amber-400 text-amber-400" : ""} /> {conversation.starred ? "Unstar" : "Star"}
          </button>
          <button onClick={onImportant} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800 flex items-center gap-2">
            <AlertCircle size={15} className={conversation.important ? "fill-amber-100 text-amber-600" : ""} /> {conversation.important ? "Mark not important" : "Mark important"}
          </button>
          <button onClick={onLabels} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Tag size={15} /> Labels…
          </button>
          {inTrash ? (
            <button onClick={onRestore} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-emerald-50 text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <Inbox size={15} /> Move to Inbox
            </button>
          ) : inSpam ? (
            <button onClick={onNotSpam} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-emerald-50 text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <Inbox size={15} /> Not spam
            </button>
          ) : (
            <>
              <button onClick={onSpam} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-amber-50 text-sm font-semibold text-amber-700 flex items-center gap-2">
                <AlertTriangle size={15} /> Mark as spam
              </button>
              <button onClick={onTrash} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-rose-50 text-sm font-semibold text-rose-600 flex items-center gap-2">
                <Trash2 size={15} /> Move to Trash
              </button>
            </>
          )}
          {(inTrash || inSpam) && (
            <button onClick={onDeleteForever} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-rose-50 text-sm font-semibold text-rose-600 flex items-center gap-2">
              <Trash2 size={15} /> Delete forever
            </button>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Cancel</button>
      </div>
    </Modal>
  );
}

// Shared by both the single-row "Labels…" action and the bulk select-mode
// toolbar. Unlike the old single-folder picker, a conversation can carry
// several labels at once — same as Gmail — so each row is its own checkbox
// rather than a destination you pick once.
function LabelPickerModal({ open, labels, count, checkedIds, onClose, onToggle, onCreateAndApply }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    if (!open) {
      setCreating(false);
      setName("");
    }
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} labelledBy="label-picker-title">
      <div className="p-6">
        <h2 id="label-picker-title" className="text-base font-bold text-stone-900 mb-3" style={displayFont}>
          Label {count > 1 ? `${count} conversations` : "conversation"}
        </h2>
        {labels.length === 0 && !creating ? (
          <p className="text-sm text-stone-400 py-2">No labels yet.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {labels.map((l) => {
              const checked = checkedIds?.has ? checkedIds.has(l.id) : false;
              return (
                <button key={l.id} onClick={() => onToggle(l.id)} className="text-left px-3 py-2.5 rounded-xl hover:bg-stone-50 text-sm font-semibold text-stone-700 flex items-center gap-2.5">
                  <span className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 ${checked ? "bg-emerald-700 border-emerald-700" : "border-stone-300"}`}>
                    {checked && <Check size={12} className="text-white" />}
                  </span>
                  <Tag size={14} className="text-amber-600 shrink-0" /> {l.name}
                </button>
              );
            })}
          </div>
        )}
        {creating ? (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onCreateAndApply(name)}
              placeholder="Label name"
              className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-700"
            />
            <button
              onClick={() => name.trim() && onCreateAndApply(name)}
              disabled={!name.trim()}
              className="px-3 py-2 rounded-xl bg-emerald-800 text-white text-sm font-semibold disabled:opacity-40"
            >
              Create
            </button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} className="w-full text-left px-3 py-2.5 mt-2 pt-3 border-t border-stone-100 text-sm font-semibold text-emerald-700 flex items-center gap-2">
            <Plus size={15} /> Create new label
          </button>
        )}
        <button onClick={onClose} className="w-full mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Done</button>
      </div>
    </Modal>
  );
}

// Rename or delete labels themselves — deleting one just removes that tag
// from whatever it was on, the same way deleting a Gmail label doesn't
// touch the mail underneath it.
function ManageLabelsModal({ open, labels, onClose, onRename, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setDraft("");
    }
  }, [open]);
  const commit = (id) => {
    if (draft.trim()) onRename(id, draft);
    setEditingId(null);
  };
  return (
    <Modal open={open} onClose={onClose} labelledBy="manage-labels-title">
      <div className="p-6">
        <h2 id="manage-labels-title" className="text-base font-bold text-stone-900 mb-3" style={displayFont}>Manage labels</h2>
        {labels.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No labels yet — create one from any conversation's "⋮" menu.</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {labels.map((l) => (
              <div key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-stone-50">
                <Tag size={15} className="text-amber-600 shrink-0" />
                {editingId === l.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commit(l.id)}
                    onKeyDown={(e) => e.key === "Enter" && commit(l.id)}
                    className="flex-1 border border-stone-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-emerald-700"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(l.id);
                      setDraft(l.name);
                    }}
                    className="flex-1 text-left text-sm font-semibold text-stone-800 truncate"
                  >
                    {l.name}
                  </button>
                )}
                <button onClick={() => onDelete(l.id)} aria-label={`Delete ${l.name} label`} className="text-stone-400 hover:text-rose-600 shrink-0 p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Done</button>
      </div>
    </Modal>
  );
}

// The Messages list's top-level "⋯" — one tap away, everything the bulk
// toolbar and nav rail don't already cover. inTrash swaps the destructive
// item to "Empty trash", which only makes sense while looking at Trash.
function MessagesOverflowMenu({ open, onClose, onSelect, onManageLabels, onDeleteAll, inTrash }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="messages-menu-title">
      <div className="p-6">
        <h2 id="messages-menu-title" className="sr-only">Messages options</h2>
        <div className="flex flex-col gap-2">
          <button onClick={onSelect} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Check size={15} /> Select conversations
          </button>
          <button onClick={onManageLabels} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-semibold text-stone-800 flex items-center gap-2">
            <Tag size={15} /> Manage labels
          </button>
          <button onClick={onDeleteAll} className="text-left px-4 py-3 rounded-xl border border-stone-200 hover:bg-rose-50 text-sm font-semibold text-rose-600 flex items-center gap-2">
            <Trash2 size={15} /> {inTrash ? "Empty Trash" : "Delete all conversations"}
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Cancel</button>
      </div>
    </Modal>
  );
}

// Gmail's "schedule send" popover — a couple of quick presets plus a custom
// date/time, applied to whatever's currently typed in the compose box.
function ScheduleSendModal({ open, onClose, onSchedule }) {
  const [custom, setCustom] = useState("");
  const presets = useMemo(() => {
    const now = new Date();
    const mk = (d) => d.getTime();
    const tonight = new Date(now);
    tonight.setHours(18, 0, 0, 0);
    if (tonight <= now) tonight.setDate(tonight.getDate() + 1);
    const tomorrowMorning = new Date(now);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(8, 0, 0, 0);
    const monday = new Date(now);
    const daysToMonday = (8 - monday.getDay()) % 7 || 7;
    monday.setDate(monday.getDate() + daysToMonday);
    monday.setHours(8, 0, 0, 0);
    return [
      { label: "In 1 hour", at: mk(new Date(now.getTime() + 60 * 60 * 1000)) },
      { label: "This evening, 6 PM", at: mk(tonight) },
      { label: "Tomorrow morning, 8 AM", at: mk(tomorrowMorning) },
      { label: "Monday morning, 8 AM", at: mk(monday) },
    ];
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} labelledBy="schedule-send-title">
      <div className="p-6">
        <h2 id="schedule-send-title" className="text-base font-bold text-stone-900 mb-3" style={displayFont}>Schedule send</h2>
        <div className="flex flex-col gap-1.5">
          {presets.map((p) => (
            <button key={p.label} onClick={() => onSchedule(p.at)} className="text-left px-4 py-2.5 rounded-xl hover:bg-stone-50 text-sm font-semibold text-stone-700 flex items-center gap-2">
              <Clock size={15} className="text-stone-400" /> {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
          <input
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-700"
          />
          <button
            onClick={() => {
              const t = new Date(custom).getTime();
              if (!isNaN(t)) onSchedule(t);
            }}
            disabled={!custom}
            className="px-3 py-2 rounded-xl bg-emerald-800 text-white text-sm font-semibold disabled:opacity-40"
          >
            Set
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-stone-500">Cancel</button>
      </div>
    </Modal>
  );
}

// Gmail's own nav-rail order: Inbox, Starred, Important, Sent, Scheduled,
// Drafts, Spam, Trash. Purchases (vendor-only) and Labels are appended
// separately below since they're conditional / dynamic lists.
const MESSAGE_NAV_ITEMS = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star },
  { id: "important", label: "Important", icon: AlertCircle },
  { id: "sent", label: "Sent", icon: Send },
  { id: "scheduled", label: "Scheduled", icon: Clock },
  { id: "drafts", label: "Drafts", icon: Pencil },
  { id: "spam", label: "Spam", icon: AlertTriangle },
  { id: "trash", label: "Trash", icon: Trash2 },
];

function MessagesView({ initialWithUserId, initialWithUserName, initialWithUserAvatar, initialCid }) {
  const {
    me, conversations, ensureConversation, updateMe, showToast, openProfileCard,
    messageLabels, createMessageLabel, renameMessageLabel, deleteMessageLabel,
    toggleConversationLabel, addLabelToConversations, toggleConversationStar, toggleConversationImportant,
    trashConversations, trashAllConversations, restoreConversations,
    markConversationsSpam, markConversationsNotSpam, permanentlyDeleteConversations, emptyMessageTrash,
    setConversationDraft, scheduledMessages, scheduleMessage, cancelScheduledMessage,
  } = useApp();
  const [selectedCid, setSelectedCid] = useState(initialCid || null);
  const [activeOther, setActiveOther] = useState(initialWithUserId ? { id: initialWithUserId, name: initialWithUserName, avatar: initialWithUserAvatar } : null);
  const [text, setText] = useState("");
  const [showSafetyNote, setShowSafetyNote] = useState(true);
  const initRan = useRef(false);
  const scrollRef = useRef(null);

  // Gmail-style layout: a nav rail of views (Inbox/Starred/.../Trash, plus
  // Purchases for vendors and a Labels section) instead of the old single
  // folder-chip row, a checkbox select mode for bulk actions, and a per-row
  // "⋮" for the single-conversation version of the same actions — no
  // long-press anywhere in this list.
  const [view, setView] = useState("inbox"); // a MESSAGE_NAV_ITEMS id, "purchases", or a label id
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [rowMenuFor, setRowMenuFor] = useState(null);
  const [labelPickerFor, setLabelPickerFor] = useState(null); // array of cids, or null when closed
  const [labelCheckedIds, setLabelCheckedIds] = useState(() => new Set());
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [confirmPermDelete, setConfirmPermDelete] = useState(null); // { cids, title, body } | null
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [scheduleSendOpen, setScheduleSendOpen] = useState(false);
  const [purchaseCustomerIds, setPurchaseCustomerIds] = useState(null); // null = not a vendor / not loaded yet

  // Purchases only exists for vendor accounts: it's built by cross-referencing
  // *our own* shop's order history (private kv — only we can read it) for
  // customers with a completed order. There's no shopper-side purchase record
  // in the schema today, so a pure shopper account never sees this tab.
  useEffect(() => {
    let cancelled = false;
    if (!me?.isVendor || !me?.shopId) {
      setPurchaseCustomerIds(null);
      return;
    }
    (async () => {
      const orders = await getJSON(`orders:${me.shopId}`, false, []);
      if (cancelled) return;
      const ids = new Set((Array.isArray(orders) ? orders : []).filter((o) => o.completed).map((o) => o.customerUserId));
      setPurchaseCustomerIds(ids);
    })();
    return () => { cancelled = true; };
  }, [me?.isVendor, me?.shopId]);

  const isVendorAccount = !!(me?.isVendor && me?.shopId);

  const visibleConversations = useMemo(() => {
    const notTrashedOrSpam = (c) => !c.trashed && !c.spam;
    if (view === "inbox") return conversations.filter(notTrashedOrSpam);
    if (view === "starred") return conversations.filter((c) => c.starred && notTrashedOrSpam(c));
    if (view === "important") return conversations.filter((c) => c.important && notTrashedOrSpam(c));
    if (view === "sent") return conversations.filter((c) => c.lastSenderId === me.id && notTrashedOrSpam(c));
    if (view === "drafts") return conversations.filter((c) => (c.draft || "").trim() && notTrashedOrSpam(c));
    if (view === "spam") return conversations.filter((c) => c.spam);
    if (view === "trash") return conversations.filter((c) => c.trashed);
    if (view === "purchases") return conversations.filter((c) => purchaseCustomerIds?.has(c.otherUserId) && notTrashedOrSpam(c));
    // Anything else is a label id.
    return conversations.filter((c) => (c.labelIds || []).includes(view) && notTrashedOrSpam(c));
  }, [conversations, view, me?.id, purchaseCustomerIds]);

  const activeLabel = messageLabels.find((l) => l.id === view) || null;
  const viewTitle =
    view === "inbox" ? "Inbox" :
    view === "starred" ? "Starred" :
    view === "important" ? "Important" :
    view === "sent" ? "Sent" :
    view === "drafts" ? "Drafts" :
    view === "spam" ? "Spam" :
    view === "trash" ? "Trash" :
    view === "scheduled" ? "Scheduled" :
    view === "purchases" ? "Purchases" :
    activeLabel ? activeLabel.name : "Messages";

  const toggleSelect = (cid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };
  const closeIfSelected = (cids) => {
    if (selectedCid && cids.includes(selectedCid)) {
      setSelectedCid(null);
      setActiveOther(null);
    }
  };
  const goToView = (v) => {
    setView(v);
    setSidebarOpen(false);
    exitSelectMode();
  };

  const runTrash = async (cids) => {
    await trashConversations(cids);
    closeIfSelected(cids);
    setSelectedIds((prev) => { const next = new Set(prev); cids.forEach((id) => next.delete(id)); return next; });
    showToast(cids.length > 1 ? "Conversations moved to trash" : "Conversation moved to trash");
  };
  const runRestore = async (cids) => {
    await restoreConversations(cids);
    setSelectedIds((prev) => { const next = new Set(prev); cids.forEach((id) => next.delete(id)); return next; });
    showToast(cids.length > 1 ? "Conversations moved to Inbox" : "Conversation moved to Inbox");
  };
  const runSpam = async (cids) => {
    await markConversationsSpam(cids);
    closeIfSelected(cids);
    setSelectedIds((prev) => { const next = new Set(prev); cids.forEach((id) => next.delete(id)); return next; });
    showToast("Marked as spam");
  };
  const runNotSpam = async (cids) => {
    await markConversationsNotSpam(cids);
    setSelectedIds((prev) => { const next = new Set(prev); cids.forEach((id) => next.delete(id)); return next; });
    showToast("Marked not spam");
  };
  const runPermDelete = async () => {
    if (!confirmPermDelete) return;
    await permanentlyDeleteConversations(confirmPermDelete.cids);
    closeIfSelected(confirmPermDelete.cids);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      confirmPermDelete.cids.forEach((id) => next.delete(id));
      return next;
    });
    showToast(confirmPermDelete.cids.length > 1 ? "Conversations deleted forever" : "Conversation deleted forever");
  };
  const runEmptyTrash = async () => {
    await emptyMessageTrash();
    setSelectedCid(null);
    setActiveOther(null);
    exitSelectMode();
    showToast("Trash emptied");
  };
  const runDeleteAllInbox = async () => {
    await trashAllConversations();
    setSelectedCid(null);
    setActiveOther(null);
    exitSelectMode();
    showToast("All conversations moved to trash");
  };

  const openLabelPicker = (cids) => {
    const first = conversations.find((c) => c.id === cids[0]);
    setLabelCheckedIds(new Set(cids.length === 1 ? first?.labelIds || [] : []));
    setLabelPickerFor(cids);
  };
  const runToggleLabel = (labelId) => {
    if (!labelPickerFor) return;
    if (labelPickerFor.length === 1) {
      toggleConversationLabel(labelPickerFor[0], labelId);
      setLabelCheckedIds((prev) => {
        const next = new Set(prev);
        if (next.has(labelId)) next.delete(labelId);
        else next.add(labelId);
        return next;
      });
    } else {
      addLabelToConversations(labelPickerFor, labelId);
      setLabelCheckedIds((prev) => new Set(prev).add(labelId));
    }
  };
  const runCreateAndApplyLabel = async (name) => {
    const label = await createMessageLabel(name);
    if (label) runToggleLabel(label.id);
  };

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

  const activeConvo = useMemo(() => conversations.find((c) => c.id === selectedCid) || null, [conversations, selectedCid]);

  const { messages, send, blockedByOther, deleteMessage, msgFlags, toggleMessageStar, toggleMessageImportant, toggleMessageLabel } = useMessages(me, selectedCid, activeOther);
  const [msgLabelPickerFor, setMsgLabelPickerFor] = useState(null); // a message id, or null when closed
  const [msgLabelCheckedIds, setMsgLabelCheckedIds] = useState(() => new Set());
  const openMessageLabelPicker = (msgId) => {
    setMsgLabelCheckedIds(new Set(msgFlags[msgId]?.labelIds || []));
    setMsgLabelPickerFor(msgId);
  };
  const runToggleMessageLabel = (labelId) => {
    if (!msgLabelPickerFor) return;
    toggleMessageLabel(msgLabelPickerFor, labelId);
    setMsgLabelCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
  };
  const runCreateAndApplyMessageLabel = async (name) => {
    const label = await createMessageLabel(name);
    if (label) runToggleMessageLabel(label.id);
  };
  const isBlocked = !!activeOther && (me.blockedUserIds || []).includes(activeOther.id);
  const [actionTarget, setActionTarget] = useState(null);

  // Compose box mirrors Gmail's autosaving drafts: prefill from whatever was
  // saved for this thread, and push every keystroke back through the
  // debounced setConversationDraft so switching away and back keeps it.
  useEffect(() => {
    setText(activeConvo?.draft || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCid]);

  const handleTextChange = (v) => {
    setText(v);
    if (selectedCid) setConversationDraft(selectedCid, v);
  };

  const copyMessage = async (m) => {
    try {
      await navigator.clipboard.writeText(m.body);
      showToast("Copied");
    } catch (e) {
      showToast("Couldn't copy — try selecting the text instead");
    }
    setActionTarget(null);
  };
  const confirmDeleteMessage = async (m) => {
    await deleteMessage(m.id);
    setActionTarget(null);
    showToast("Message deleted");
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || isBlocked || blockedByOther) return;
    const outgoing = text;
    setText("");
    if (selectedCid) setConversationDraft(selectedCid, "");
    const res = await send(outgoing);
    if (res && res.reason === "blocked") showToast("This person isn't accepting messages right now");
  };

  const handleScheduleSend = async (sendAt) => {
    if (!text.trim() || !selectedCid) return;
    await scheduleMessage(activeOther, selectedCid, text, sendAt);
    setText("");
    setConversationDraft(selectedCid, "");
    setScheduleSendOpen(false);
    showToast("Message scheduled");
  };

  const cancelSchedule = async (id) => {
    await cancelScheduledMessage(id);
    showToast("Send canceled");
  };

  // Reporting files the report with recent context, then blocks — someone you
  // report is someone you almost certainly don't want to keep hearing from.
  const handleReport = async () => {
    if (!activeOther) return;
    const report = {
      id: uid("report"),
      type: "message",
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
    <div className="flex-1 flex overflow-hidden relative">
      {/* Gmail-style nav rail: Inbox/Starred/.../Trash, Purchases for
         vendors, then a Labels section with create/manage entries.
         Collapses to a slide-over on mobile via the header's hamburger. */}
      <div
        className={`${sidebarOpen ? "flex absolute inset-y-0 left-0 z-20 shadow-xl" : "hidden"} md:flex md:relative md:shadow-none w-60 shrink-0 flex-col border-r border-stone-200 overflow-y-auto bg-white`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 md:hidden">
          <span className="font-bold text-sm text-stone-700">Menu</span>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="text-stone-400 p-1"><X size={16} /></button>
        </div>
        <button
          onClick={() => { setSelectedCid(null); setActiveOther(null); setText(""); setSidebarOpen(false); }}
          className="mx-3 mt-3 mb-1 px-4 py-2.5 rounded-2xl bg-emerald-800 text-white text-sm font-semibold flex items-center gap-2 shadow-sm hover:bg-emerald-700"
        >
          <Pencil size={15} /> Compose
        </button>
        <div className="flex flex-col gap-0.5 px-2 py-2">
          {MESSAGE_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => goToView(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-full text-sm font-semibold transition text-left ${
                view === item.id ? "bg-emerald-100 text-emerald-900" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <item.icon size={16} className="shrink-0" /> {item.label}
            </button>
          ))}
          {isVendorAccount && (
            <button
              onClick={() => goToView("purchases")}
              className={`flex items-center gap-3 px-3 py-2 rounded-full text-sm font-semibold transition text-left ${
                view === "purchases" ? "bg-emerald-100 text-emerald-900" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <ShoppingBag size={16} className="shrink-0" /> Purchases
            </button>
          )}
        </div>
        <div className="px-4 pt-2 pb-1">
          <span className="cs-t10 font-bold text-stone-400 uppercase tracking-wide">Labels</span>
        </div>
        <div className="flex flex-col gap-0.5 px-2 pb-3">
          {messageLabels.map((l) => (
            <button
              key={l.id}
              onClick={() => goToView(l.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-full text-sm font-semibold transition text-left ${
                view === l.id ? "bg-emerald-100 text-emerald-900" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Tag size={15} className="text-amber-600 shrink-0" /> <span className="truncate">{l.name}</span>
            </button>
          ))}
          <button
            onClick={async () => {
              const name = window.prompt("New label name");
              if (name && name.trim()) {
                const label = await createMessageLabel(name);
                if (label) goToView(label.id);
              }
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-full text-sm font-semibold text-stone-500 hover:bg-stone-100 text-left"
          >
            <Plus size={15} className="shrink-0" /> Create new label
          </button>
          <button
            onClick={() => { setManageLabelsOpen(true); setSidebarOpen(false); }}
            className="flex items-center gap-3 px-3 py-2 rounded-full text-sm font-semibold text-stone-500 hover:bg-stone-100 text-left"
          >
            <Folder size={15} className="shrink-0" /> Manage labels
          </button>
        </div>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-10 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className={`${selectedCid ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col border-r border-stone-200 overflow-y-auto`}>
        <div className="flex items-center gap-2 px-4 pt-4 pb-1">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="md:hidden text-stone-500 p-1 -ml-1"><Menu size={18} /></button>
          <h1 className="text-xl font-bold text-stone-900 flex-1" style={displayFont}>{view === "inbox" ? "Messages" : viewTitle}</h1>
          {conversations.length > 0 && (
            <button onClick={() => setOverflowOpen(true)} aria-label="Messages options" className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100">
              <MoreVertical size={18} />
            </button>
          )}
        </div>

        {selectMode && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-y border-stone-200 bg-stone-50 flex-wrap">
            <span className="text-xs font-semibold text-stone-600 mr-1">{selectedIds.size} selected</span>
            <button
              onClick={() => setSelectedIds(new Set(visibleConversations.map((c) => c.id)))}
              className="text-xs font-semibold text-emerald-700"
            >
              Select all
            </button>
            <button
              onClick={() => openLabelPicker(Array.from(selectedIds))}
              disabled={selectedIds.size === 0}
              className="text-xs font-semibold text-stone-600 disabled:opacity-40 ml-1"
            >
              Labels
            </button>
            {view === "trash" ? (
              <>
                <button onClick={() => runRestore(Array.from(selectedIds))} disabled={selectedIds.size === 0} className="text-xs font-semibold text-emerald-700 disabled:opacity-40">
                  Move to Inbox
                </button>
                <button
                  onClick={() => setConfirmPermDelete({ cids: Array.from(selectedIds), title: `Delete ${selectedIds.size} conversation${selectedIds.size === 1 ? "" : "s"} forever?`, body: "This can't be undone." })}
                  disabled={selectedIds.size === 0}
                  className="text-xs font-semibold text-rose-600 disabled:opacity-40"
                >
                  Delete forever
                </button>
              </>
            ) : view === "spam" ? (
              <>
                <button onClick={() => runNotSpam(Array.from(selectedIds))} disabled={selectedIds.size === 0} className="text-xs font-semibold text-emerald-700 disabled:opacity-40">
                  Not spam
                </button>
                <button
                  onClick={() => setConfirmPermDelete({ cids: Array.from(selectedIds), title: `Delete ${selectedIds.size} conversation${selectedIds.size === 1 ? "" : "s"} forever?`, body: "This can't be undone." })}
                  disabled={selectedIds.size === 0}
                  className="text-xs font-semibold text-rose-600 disabled:opacity-40"
                >
                  Delete forever
                </button>
              </>
            ) : (
              <>
                <button onClick={() => runSpam(Array.from(selectedIds))} disabled={selectedIds.size === 0} className="text-xs font-semibold text-amber-700 disabled:opacity-40">
                  Spam
                </button>
                <button onClick={() => runTrash(Array.from(selectedIds))} disabled={selectedIds.size === 0} className="text-xs font-semibold text-rose-600 disabled:opacity-40">
                  Trash
                </button>
              </>
            )}
            <button onClick={exitSelectMode} className="text-xs font-semibold text-stone-400 ml-auto">Cancel</button>
          </div>
        )}

        {view === "scheduled" ? (
          scheduledMessages.length === 0 ? (
            <EmptyState icon={Clock} title="Nothing scheduled" body="Schedule a message from the compose box's clock icon." />
          ) : (
            scheduledMessages.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
                <Avatar emoji={s.otherUserAvatar} name={s.otherUserName} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-stone-800 truncate">{s.otherUserName}</p>
                  <p className="text-xs text-stone-400 truncate">{s.body}</p>
                  <p className="cs-t10 text-emerald-700 font-semibold mt-0.5">Sends {new Date(s.sendAt).toLocaleString()}</p>
                </div>
                <button onClick={() => cancelSchedule(s.id)} className="shrink-0 text-xs font-semibold text-rose-600">Cancel</button>
              </div>
            ))
          )
        ) : conversations.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No conversations yet" body="Message a vendor from any shop or listing page." />
        ) : visibleConversations.length === 0 ? (
          <EmptyState
            icon={view === "trash" ? Trash2 : view === "spam" ? AlertTriangle : view === "purchases" ? ShoppingBag : Inbox}
            title={`Nothing in ${viewTitle}`}
            body={view === "purchases" && !isVendorAccount ? "Purchases tracking is available for shop owners right now." : "Nothing here yet."}
          />
        ) : (
          visibleConversations.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => (selectMode ? toggleSelect(c.id) : openConvo(c))}
              onKeyDown={(e) => { if (e.key === "Enter") (selectMode ? toggleSelect(c.id) : openConvo(c)); }}
              className={`flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition cursor-pointer ${selectedCid === c.id ? "bg-stone-50" : ""}`}
            >
              {selectMode && (
                <span
                  aria-hidden="true"
                  className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                    selectedIds.has(c.id) ? "bg-emerald-700 border-emerald-700" : "border-stone-300"
                  }`}
                >
                  {selectedIds.has(c.id) && <Check size={13} className="text-white" />}
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); toggleConversationStar(c.id); }}
                aria-label={c.starred ? "Unstar" : "Star"}
                className="shrink-0 text-stone-300 hover:text-amber-400"
              >
                <Star size={15} className={c.starred ? "fill-amber-400 text-amber-400" : ""} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openProfileCard({ id: c.otherUserId, name: c.otherUserName, avatar: c.otherUserAvatar }); }}
                aria-label={`View ${c.otherUserName}'s profile`}
                className="shrink-0"
              >
                <Avatar emoji={c.otherUserAvatar} name={c.otherUserName} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-stone-800 truncate flex items-center gap-1.5">
                  <span className="truncate">{c.otherUserName}</span>
                  {(c.labelIds || []).slice(0, 2).map((lid) => {
                    const l = messageLabels.find((x) => x.id === lid);
                    return l ? (
                      <span key={lid} className="cs-t10 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                        {l.name}
                      </span>
                    ) : null;
                  })}
                </p>
                <p className="text-xs text-stone-400 truncate">
                  {view === "drafts" && c.draft ? <span className="text-rose-500 font-semibold">Draft: </span> : null}
                  {view === "drafts" && c.draft ? c.draft : c.lastMessage || "Say hello…"}
                </p>
              </div>
              <span className="cs-t10 text-stone-400 shrink-0">{timeAgo(c.lastAt)}</span>
              {!selectMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); setRowMenuFor(c); }}
                  aria-label="Conversation options"
                  className="shrink-0 text-stone-300 hover:text-stone-600 p-1 -mr-1"
                >
                  <MoreVertical size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {selectedCid ? (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
            <button onClick={() => setSelectedCid(null)} className="md:hidden" aria-label="Back to list"><ArrowLeft size={18} /></button>
            <button onClick={() => activeOther && openProfileCard(activeOther)} aria-label={`View ${activeOther?.name}'s profile`}>
              <Avatar emoji={activeOther?.avatar} name={activeOther?.name} size="sm" />
            </button>
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
              <MessageBubble key={m.id} message={m} isMine={m.senderId === me.id} flags={msgFlags[m.id]} onOpenActions={setActionTarget} />
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
                onChange={handleTextChange}
                onSubmit={(v) => {
                  if (!v.trim() || isBlocked || blockedByOther) return;
                  setText("");
                  if (selectedCid) setConversationDraft(selectedCid, "");
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
              <button
                onClick={() => setScheduleSendOpen(true)}
                disabled={!text.trim()}
                className="text-stone-400 hover:text-stone-700 disabled:opacity-30 rounded-full w-9 h-9 flex items-center justify-center shrink-0 mb-0.5"
                aria-label="Schedule send"
              >
                <Clock size={17} />
              </button>
              <button onClick={handleSend} className="bg-emerald-800 text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0 mb-0.5" aria-label="Send"><Send size={16} /></button>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-stone-300">
          <MessageCircle size={48} />
        </div>
      )}

      <MessageActionSheet
        message={actionTarget}
        flags={actionTarget ? msgFlags[actionTarget.id] : null}
        onClose={() => setActionTarget(null)}
        onCopy={() => copyMessage(actionTarget)}
        onDelete={() => confirmDeleteMessage(actionTarget)}
        onStar={() => { toggleMessageStar(actionTarget.id); setActionTarget(null); }}
        onImportant={() => { toggleMessageImportant(actionTarget.id); setActionTarget(null); }}
        onLabels={() => { openMessageLabelPicker(actionTarget.id); setActionTarget(null); }}
      />

      <LabelPickerModal
        open={!!msgLabelPickerFor}
        labels={messageLabels}
        count={1}
        checkedIds={msgLabelCheckedIds}
        onClose={() => setMsgLabelPickerFor(null)}
        onToggle={runToggleMessageLabel}
        onCreateAndApply={runCreateAndApplyMessageLabel}
      />

      <ConversationActionSheet
        conversation={rowMenuFor}
        view={view}
        onClose={() => setRowMenuFor(null)}
        onStar={() => { toggleConversationStar(rowMenuFor.id); setRowMenuFor(null); }}
        onImportant={() => { toggleConversationImportant(rowMenuFor.id); setRowMenuFor(null); }}
        onLabels={() => { openLabelPicker([rowMenuFor.id]); setRowMenuFor(null); }}
        onSpam={() => { runSpam([rowMenuFor.id]); setRowMenuFor(null); }}
        onNotSpam={() => { runNotSpam([rowMenuFor.id]); setRowMenuFor(null); }}
        onTrash={() => { runTrash([rowMenuFor.id]); setRowMenuFor(null); }}
        onRestore={() => { runRestore([rowMenuFor.id]); setRowMenuFor(null); }}
        onDeleteForever={() => {
          setConfirmPermDelete({ cids: [rowMenuFor.id], title: `Delete conversation with ${rowMenuFor.otherUserName} forever?`, body: "This can't be undone." });
          setRowMenuFor(null);
        }}
      />

      <LabelPickerModal
        open={!!labelPickerFor}
        labels={messageLabels}
        count={labelPickerFor?.length || 0}
        checkedIds={labelCheckedIds}
        onClose={() => setLabelPickerFor(null)}
        onToggle={runToggleLabel}
        onCreateAndApply={runCreateAndApplyLabel}
      />

      <ManageLabelsModal
        open={manageLabelsOpen}
        labels={messageLabels}
        onClose={() => setManageLabelsOpen(false)}
        onRename={renameMessageLabel}
        onDelete={(id) => {
          if (view === id) setView("inbox");
          deleteMessageLabel(id);
        }}
      />

      <MessagesOverflowMenu
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        onSelect={() => {
          setSelectMode(true);
          setOverflowOpen(false);
        }}
        onManageLabels={() => {
          setManageLabelsOpen(true);
          setOverflowOpen(false);
        }}
        onDeleteAll={() => {
          setOverflowOpen(false);
          if (view === "trash") setConfirmEmptyTrash(true);
          else setConfirmDeleteAllOpen(true);
        }}
        inTrash={view === "trash"}
      />

      <ConfirmModal
        open={!!confirmPermDelete}
        title={confirmPermDelete?.title}
        body={confirmPermDelete?.body}
        confirmLabel="Delete forever"
        onClose={() => setConfirmPermDelete(null)}
        onConfirm={runPermDelete}
      />

      <ConfirmModal
        open={confirmEmptyTrash}
        title="Empty trash?"
        body="Every conversation in Trash will be deleted forever. This can't be undone."
        confirmLabel="Empty trash"
        onClose={() => setConfirmEmptyTrash(false)}
        onConfirm={runEmptyTrash}
      />

      <ConfirmModal
        open={confirmDeleteAllOpen}
        title="Delete all conversations?"
        body="Every conversation will be moved to Trash, where it's deleted forever after 30 days. The people you talked with keep their side of it."
        confirmLabel="Delete all"
        onClose={() => setConfirmDeleteAllOpen(false)}
        onConfirm={runDeleteAllInbox}
      />

      <ScheduleSendModal open={scheduleSendOpen} onClose={() => setScheduleSendOpen(false)} onSchedule={handleScheduleSend} />
    </div>
  );
}

/* ============================================================================
   SECTION 22: ACCOUNT MODAL
============================================================================ */
/* ============================================================================
   TIERED PLANS — Free / Basic / Premium. No real billing yet: "purchasing" a
   plan just flips the tier flags below via a clearly-labeled test-mode
   checkout, so the whole product surface can be built and demoed honestly
   before a payment processor is wired in.
============================================================================ */
const PLAN_CATALOG = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Browse, favorite, and connect",
    monthly: 0,
    annual: 0,
    features: ["Search & browse every listing", "Favorite items and shops", "Message vendors directly", "View any storefront or profile"],
  },
  basic: {
    id: "basic",
    name: "Basic",
    tagline: "Build your storefront",
    monthly: 10,
    annual: 70,
    features: ["Everything in Free", "Create your own storefront", "Unlimited listings & photos", "Reviews, responses & sharing", "Standard shop stats"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "Sell like a pro",
    monthly: 15,
    annual: 100,
    features: ["Everything in Basic", "Full analytics dashboard", "Keyword search intelligence", "Mailing list & mass messaging", "Priority placement in search"],
  },
};
const REFUND_WINDOW_DAYS = 30;
// How long a lapsed (cancelled/expired) storefront stays on the platform,
// inactive and hidden from other shoppers, before the sweep in
// useMarketData.loadAll() removes it for good. A full year gives a vendor
// plenty of room to come back before anything is actually deleted.
const ABANDON_DAYS = 365;
// Human-friendly phrasing for ABANDON_DAYS in UI copy — "a year" reads far
// better than "365 days" without hardcoding the number in two places.
function abandonWindowLabel() {
  if (ABANDON_DAYS % 365 === 0) {
    const years = ABANDON_DAYS / 365;
    return years === 1 ? "up to a year" : `up to ${years} years`;
  }
  return `up to ${ABANDON_DAYS} days`;
}

function planTier(me) {
  return me?.plan?.tier || "free";
}
function isBasicPlus(me) {
  return planTier(me) === "basic" || planTier(me) === "premium";
}
function isPremiumPlan(me) {
  return planTier(me) === "premium";
}
function planPrice(tier, billing) {
  const p = PLAN_CATALOG[tier];
  if (!p) return 0;
  return billing === "annual" ? p.annual : p.monthly;
}
function planPeriodLabel(billing) {
  return billing === "annual" ? "/yr" : "/mo";
}
function formatMoney(n) {
  // Grouped with commas above four digits so a total like $12500 always
  // reads as $12,500 rather than being misread as $1,250 or $125.
  const opts = n % 1 === 0 ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `$${n.toLocaleString(undefined, opts)}`;
}

// Small gold badge marking a feature or screen as premium. Kept as one tiny
// component instead of an emoji so every "Premium" mention in the app looks
// identical — the consistency is what makes it feel considered rather than
// bolted on.
function CrownPill({ size = "sm", className = "" }) {
  const isSm = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 font-bold shadow-sm ${isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"} ${className}`}
    >
      <Crown size={isSm ? 11 : 13} /> Premium
    </span>
  );
}

// A locked control styled to look like a real, inviting button rather than a
// greyed-out dead end — the goal is to make upgrading feel like unlocking
// something, the way Apple/LinkedIn/Tesla dangle a feature just out of reach.
// Clicking always routes straight to the plans screen.
function LockedFeatureButton({ label, sub, navigate, className = "", icon: Icon = Lock }) {
  return (
    <button
      onClick={() => navigate({ screen: "plans" })}
      className={`group relative w-full flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 text-left overflow-hidden transition hover:border-amber-300 hover:shadow-md ${className}`}
    >
      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shrink-0 shadow-sm">
        <Icon size={16} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-stone-900">{label}</span>
        <span className="block text-xs text-amber-700 font-medium">{sub || "Premium Plan feature only"}</span>
      </span>
      <ChevronRight size={16} className="text-amber-500 shrink-0 group-hover:translate-x-0.5 transition" />
    </button>
  );
}

// Small inline nudge for a feature that's already visible, rather than fully
// blocked — a hint, not a wall.
function UpgradeHint({ text = "Premium feature", navigate }) {
  return (
    <button onClick={() => navigate({ screen: "plans" })} className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800">
      <Crown size={11} /> {text}
    </button>
  );
}

/* ============================================================================
   SECTION 24b: PLANS + CHECKOUT — Free / Basic / Premium, monthly or annual.
   No payment processor yet: "purchasing" is an explicit test-mode action so
   the whole tiered product can be built and demoed honestly today.
============================================================================ */
// The Monthly/Annual switch that sits on each paid plan card. A dark track
// (not the barely-there tint a plain segmented control would have) makes it
// read as draggable/switchable at a glance rather than as two plain buttons.
function BillingSlider({ value, onChange }) {
  return (
    <div className="relative flex bg-stone-700 rounded-full p-1 mb-3 text-xs font-semibold">
      <div
        className="absolute top-1 bottom-1 rounded-full bg-white shadow transition-all duration-200"
        style={{ width: "calc(50% - 4px)", left: value === "annual" ? "calc(50% + 2px)" : "4px" }}
      />
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`relative z-10 flex-1 py-1.5 rounded-full transition ${value === "monthly" ? "text-stone-900" : "text-stone-300"}`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={`relative z-10 flex-1 py-1.5 rounded-full transition ${value === "annual" ? "text-stone-900" : "text-stone-300"}`}
      >
        Annual · save ~40%
      </button>
    </div>
  );
}

// Shown only after "Cancel plan" is tapped — a real popup rather than an
// inline expansion, since giving up a paid plan (and the refund math that
// comes with it) deserves a deliberate, can't-miss-it confirmation step.
function CancelPlanModal({ tierName, withinWindow, cancelling, onKeep, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 cs-z-pop flex items-center justify-center p-4 cs-fade-anim" onMouseDown={(e) => e.target === e.currentTarget && !cancelling && onKeep()}>
      <div className="cs-modal-anim bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-rose-50 text-rose-600 shrink-0">
            <AlertCircle size={18} />
          </span>
          <p className="font-bold text-stone-900 text-lg" style={displayFont}>Cancel {tierName}?</p>
        </div>
        <p className="text-sm text-stone-600 mb-4">
          {withinWindow
            ? `You're within the ${REFUND_WINDOW_DAYS}-day window — cancelling now refunds 50% of what you paid (test mode).`
            : `It's past day ${REFUND_WINDOW_DAYS} of this term, so no refund applies — access is removed immediately.`}
          {" "}Your storefront stays on the platform, inactive, for {abandonWindowLabel()} in case you come back.
        </p>
        <div className="flex gap-2">
          <button onClick={onKeep} disabled={cancelling} className="flex-1 text-sm font-semibold py-2.5 rounded-xl border border-stone-200 disabled:opacity-50">Keep plan</button>
          <button onClick={onConfirm} disabled={cancelling} className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-rose-600 text-white disabled:opacity-50">
            {cancelling ? "Cancelling…" : "Confirm cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlansScreen({ navigate }) {
  const { me, cancelPlan, showToast } = useApp();
  const [billingByPlan, setBillingByPlan] = useState({ basic: "monthly", premium: "monthly" });
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const currentTier = planTier(me);
  const isPaid = currentTier !== "free";

  // The slider on your OWN active plan isn't a preview like the ones on the
  // other cards — it's a real change. Sliding up to annual sends you to
  // checkout to confirm and "pay" for it; sliding an annual plan back down
  // to monthly isn't allowed here at all, since leaving annual early is
  // exactly what Cancel plan (with its refund warning) is for.
  const handleCurrentPlanBillingChange = (tierId, v) => {
    const currentBilling = me.plan?.billing || "monthly";
    if (v === currentBilling) return;
    if (v === "annual") {
      navigate({ screen: "checkout", tier: tierId, billing: "annual" });
    } else {
      showToast("To move to monthly, cancel your annual plan first");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <button onClick={() => navigate({ screen: "explore" })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-stone-900 mb-1" style={displayFont}>Choose your plan</h1>
          <p className="text-stone-500 text-sm">No payment is collected yet — this is a fully working test-mode preview.</p>
        </div>

        {isPaid && (
          <div className={`max-w-md mx-auto mb-8 rounded-xl p-4 border-2 ${currentTier === "premium" ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white" : "border-emerald-700 bg-emerald-50"}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-bold text-stone-900 flex items-center gap-1.5">
                {currentTier === "premium" && <Crown size={15} className="text-amber-500" />}
                You're on {PLAN_CATALOG[currentTier].name}
              </p>
              <button onClick={() => setCancelConfirm(true)} className="text-xs font-semibold text-rose-600 shrink-0">Cancel plan</button>
            </div>
            <p className="text-xs text-stone-500 mb-1">
              {formatMoney(planPrice(currentTier, me.plan?.billing))}
              {planPeriodLabel(me.plan?.billing)} · billed {me.plan?.billing === "annual" ? "yearly" : "monthly"}
            </p>
            {me.plan?.periodEnd && <p className="cs-t11 text-stone-400">Renews {new Date(me.plan.periodEnd).toLocaleDateString()}</p>}
            {/* Another, more visible chance to move to annual right where the
                current plan is summarized — not shown once already annual. */}
            {(me.plan?.billing || "monthly") !== "annual" && (
              <div className="mt-3 pt-3 border-t border-stone-200/70">
                <p className="cs-t11 font-semibold text-stone-500 mb-1.5">Switch to annual and save ~40%</p>
                <BillingSlider value={me.plan?.billing || "monthly"} onChange={(v) => handleCurrentPlanBillingChange(currentTier, v)} />
              </div>
            )}
          </div>
        )}

        {cancelConfirm && (
          <CancelPlanModal
            tierName={PLAN_CATALOG[currentTier].name}
            withinWindow={daysBetween(me.plan?.startedAt || Date.now(), Date.now()) <= REFUND_WINDOW_DAYS}
            cancelling={cancelling}
            onKeep={() => setCancelConfirm(false)}
            onConfirm={async () => {
              setCancelling(true);
              const { refundPct } = await cancelPlan();
              setCancelling(false);
              setCancelConfirm(false);
              showToast(refundPct > 0 ? `Cancelled — ${refundPct}% refunded (test mode)` : "Cancelled — no refund available");
            }}
          />
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {Object.values(PLAN_CATALOG).map((p) => {
            const isCurrent = currentTier === p.id;
            const billing = isCurrent ? (me.plan?.billing || "monthly") : (billingByPlan[p.id] || "monthly");
            const price = p.id === "free" ? p.monthly : billing === "annual" ? p.annual : p.monthly;
            const isPremiumCard = p.id === "premium";
            return (
              <div
                key={p.id}
                className={`rounded-2xl p-5 border-2 flex flex-col ${
                  isPremiumCard ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-lg" : isCurrent ? "border-emerald-700 bg-emerald-50" : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {isPremiumCard && <Crown size={16} className="text-amber-500" />}
                  <p className="text-lg font-bold text-stone-900" style={displayFont}>{p.name}</p>
                  {isCurrent && <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Current</span>}
                </div>
                <p className="text-sm text-stone-500 mb-3">{p.tagline}</p>
                {p.id !== "free" && (
                  <BillingSlider
                    value={billing}
                    onChange={(v) => (isCurrent ? handleCurrentPlanBillingChange(p.id, v) : setBillingByPlan((prev) => ({ ...prev, [p.id]: v })))}
                  />
                )}
                <p className="text-3xl font-bold text-stone-900 mb-1" style={displayFont}>
                  {formatMoney(price)}
                  {price > 0 && <span className="text-sm font-medium text-stone-400">{planPeriodLabel(billing)}</span>}
                </p>
                <ul className="text-xs text-stone-600 space-y-1.5 my-4 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <BadgeCheck size={13} className={`mt-0.5 shrink-0 ${isPremiumCard ? "text-amber-500" : "text-emerald-700"}`} /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => (p.id === "free" ? null : navigate({ screen: "checkout", tier: p.id, billing }))}
                  disabled={isCurrent || p.id === "free"}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-40 ${
                    isPremiumCard ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950" : "bg-emerald-800 text-white"
                  }`}
                >
                  {isCurrent ? "Current plan" : p.id === "free" ? "Included" : `Choose ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center cs-t11 text-stone-400 mt-6">
          Cancel any paid plan within {REFUND_WINDOW_DAYS} days for a 50% refund. After that, no refund — but you keep access until you cancel.
        </p>
      </div>
    </div>
  );
}

// US zip only — matches the rest of the app's address model (state
// abbreviations, US lat/lng seed data).
function isValidZip(z) {
  return /^\d{5}(-\d{4})?$/.test((z || "").trim());
}
function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}

function CheckoutScreen({ navigate, tier, billing }) {
  const { me, purchasePlan, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const plan = PLAN_CATALOG[tier];

  const existing = me?.billingProfile || null;
  // Signing up (or an earlier plan purchase) already collected name/zip/phone
  // — no need to ask again here. Only show the form if something's missing,
  // or if the person explicitly wants to change what's on file.
  const alreadyComplete = !!(existing?.fullName && existing?.zipcode && existing?.phone && existing?.phoneVerified);
  const [editingDetails, setEditingDetails] = useState(false);
  const showDetailsForm = !alreadyComplete || editingDetails;
  const [fullName, setFullName] = useState(existing?.fullName || "");
  const [zipcode, setZipcode] = useState(existing?.zipcode || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  // A phone already verified on a previous purchase stays verified as long
  // as it isn't edited — changing the digits always requires re-verifying.
  const [phoneVerified, setPhoneVerified] = useState(!!(existing?.phone && existing?.phoneVerified));
  const [codeStage, setCodeStage] = useState(false);
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);

  if (!plan || plan.id === "free") {
    return <EmptyState icon={Sparkles} title="Nothing to check out" action={<button onClick={() => navigate({ screen: "plans" })} className="text-sm font-semibold text-emerald-800">See plans</button>} />;
  }

  const price = billing === "annual" ? plan.annual : plan.monthly;
  const nameValid = fullName.trim().length >= 2;
  const zipValid = isValidZip(zipcode);
  const phoneValid = digitsOnly(phone).length === 10;
  const formReady = showDetailsForm ? nameValid && zipValid && phoneValid && phoneVerified : true;

  const handlePhoneChange = (v) => {
    setPhone(v);
    setPhoneVerified(false);
    setCodeStage(false);
    setCode("");
  };

  const sendCode = () => {
    if (!phoneValid) return;
    setCodeStage(true);
    showToast("TEST MODE — no text sent. Enter any 6 digits below.");
  };

  const verifyCode = () => {
    if (!/^\d{6}$/.test(code.trim())) {
      showToast("Enter the 6-digit code");
      return;
    }
    setCodeBusy(true);
    setTimeout(() => {
      setPhoneVerified(true);
      setCodeStage(false);
      setCodeBusy(false);
    }, 350);
  };

  const confirm = async () => {
    if (!formReady) return;
    setBusy(true);
    await purchasePlan(
      tier,
      billing,
      showDetailsForm
        ? { fullName: fullName.trim(), zipcode: zipcode.trim(), phone: digitsOnly(phone), phoneVerified: true, email: me?.email || null }
        : undefined
    );
    setBusy(false);
    showToast(
      tier === planTier(me)
        ? `Switched to annual billing — test mode, no charge made`
        : `Welcome to ${plan.name} — test mode, no charge made`
    );
    navigate({ screen: "dashboard" });
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8 flex items-start justify-center">
      <div className="max-w-md w-full px-4 pt-6">
        <button onClick={() => navigate({ screen: "plans" })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
          <ArrowLeft size={15} /> Back to plans
        </button>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2">
          <AlertCircle size={15} className="text-amber-700 shrink-0" />
          <p className="text-xs font-semibold text-amber-900">TEST MODE — no card, no charge, no real text message. This confirms instantly.</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5">
          <p className="text-xs font-bold text-stone-400 uppercase mb-3">Order summary</p>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
              {plan.id === "premium" && <Crown size={13} className="text-amber-500" />} {plan.name} plan
            </span>
            <span className="text-sm font-bold text-stone-900">
              {formatMoney(price)}
              {planPeriodLabel(billing)}
            </span>
          </div>
          <p className="cs-t11 text-stone-400 mb-3">Billed {billing === "annual" ? "yearly" : "monthly"} · cancel any time</p>
          <div className="border-t border-stone-100 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-stone-900">Due today</span>
            <span className="text-sm font-bold text-stone-900">$0.00 (test mode)</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5">
          <p className="text-xs font-bold text-stone-400 uppercase mb-3">Your details</p>

          {!showDetailsForm ? (
            <div>
              <p className="text-sm text-stone-700 mb-0.5">{existing.fullName}</p>
              <p className="text-sm text-stone-500 mb-0.5">{me?.email}</p>
              <p className="text-sm text-stone-500 mb-0.5">Zip {existing.zipcode}</p>
              <p className="cs-t11 text-emerald-700 font-semibold flex items-center gap-1 mt-1.5 mb-2">
                <BadgeCheck size={13} /> Phone on file, verified
              </p>
              <button type="button" onClick={() => setEditingDetails(true)} className="text-xs font-semibold text-emerald-800">Use different details</button>
            </div>
          ) : (
          <>
          <label className="block mb-3">
            <span className="block text-xs font-semibold text-stone-500 mb-1">Email</span>
            <input value={me?.email || "—"} disabled className="w-full border border-stone-200 bg-stone-50 rounded-xl px-3.5 py-2.5 text-sm text-stone-500" />
          </label>

          <label className="block mb-3">
            <span className="block text-xs font-semibold text-stone-500 mb-1">Full legal name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700"
            />
          </label>

          <label className="block mb-3">
            <span className="block text-xs font-semibold text-stone-500 mb-1">Zip code</span>
            <input
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value)}
              placeholder="83854"
              inputMode="numeric"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700"
            />
            {zipcode && !zipValid && <span className="block cs-t11 text-rose-600 mt-1">Enter a valid 5-digit zip code</span>}
          </label>

          <label className="block mb-1.5">
            <span className="block text-xs font-semibold text-stone-500 mb-1">Phone number</span>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(208) 555-0100"
                inputMode="tel"
                className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700"
              />
              {!phoneVerified && (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={!phoneValid}
                  className="shrink-0 px-3.5 rounded-xl text-xs font-semibold border border-stone-200 text-stone-700 disabled:opacity-40 hover:bg-stone-50"
                >
                  {codeStage ? "Resend code" : "Send code"}
                </button>
              )}
            </div>
          </label>

          {phoneVerified ? (
            <p className="cs-t11 text-emerald-700 font-semibold flex items-center gap-1 mt-1">
              <BadgeCheck size={13} /> Phone verified (test mode)
            </p>
          ) : codeStage ? (
            <div className="mt-2 bg-stone-50 rounded-xl p-3 border border-stone-200">
              <p className="cs-t11 text-stone-500 mb-2">TEST MODE — no text was actually sent. Enter any 6 digits to continue.</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm tracking-widest outline-none focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={codeBusy || code.length !== 6}
                  className="shrink-0 px-3.5 rounded-lg text-xs font-semibold bg-emerald-800 text-white disabled:opacity-40"
                >
                  {codeBusy ? "Checking…" : "Verify"}
                </button>
              </div>
            </div>
          ) : (
            <p className="cs-t11 text-stone-400 mt-1">We'll text a code to confirm this number.</p>
          )}
          </>
          )}
        </div>

        <button onClick={confirm} disabled={busy || !formReady} className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition">
          {busy ? "Setting up…" : `Confirm ${plan.name} (Test Mode)`}
        </button>
        <p className="text-center cs-t10 text-stone-400 mt-3">Real payments aren't collected yet — this is a placeholder so the product can be built and tested end to end. Phone verification is also test mode for now — no real text messages are sent.</p>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 24C: SPONSORED ADS — a small self-serve ad manager, styled after
   the familiar "campaign → ad set → ad → review" flow of the big ad
   platforms. A shop pays a flat rate to feature one listing in the homepage's
   Sponsored rail for a fixed real-world window; payment is a fake test-mode
   card, same honesty convention as the rest of checkout in this app.
============================================================================ */
const AD_OBJECTIVES = [
  { id: "reach", label: "Reach more shoppers", icon: Eye, blurb: "Show this listing to more people browsing nearby." },
  { id: "messages", label: "Get more messages", icon: MessageCircle, blurb: "Put this listing in front of shoppers likely to reach out." },
  { id: "sales", label: "Sell it faster", icon: Zap, blurb: "Prioritize shoppers who are ready to buy this week." },
];

// A countdown like "18h left" / "3d left", or "Ending soon" once under a
// minute — used anywhere an active campaign's remaining time is shown.
function sponsorCountdown(endsAt, now = Date.now()) {
  const ms = endsAt - now;
  if (ms <= 0) return "Ended";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins <= 1 ? "Ending soon" : `${mins}m left`;
  const hours = Math.round(ms / 3600000);
  if (hours < 48) return `${hours}h left`;
  return `${Math.round(hours / 24)}d left`;
}

/* ============================================================================
   SECTION 24B2: SAVED PAYMENT METHODS — a small wallet of fake test-mode
   payment methods (card or bank account/EFT), stored on the user's own
   profile (me.paymentMethods) so any payment flow in the app — Sponsored
   Ads today — can reuse one on file instead of re-entering it every time.
   Same TEST MODE honesty convention as the rest of checkout: nothing here
   ever touches a real payment processor or moves real money.
============================================================================ */
function paymentMethodLabel(m) {
  if (!m) return "";
  return m.type === "eft" ? `Bank •••• ${m.last4}` : `Card •••• ${m.last4}`;
}

// The actual entry form for one new method — used both standalone (Account
// > Payment methods, always saved) and inside a live payment flow (only
// saved if the "Save for future payments" toggle is left on).
function PaymentMethodForm({ onSaved, submitLabel, busyLabel = "Processing…", showSaveToggle = true }) {
  const { me, updateMe } = useApp();
  const [type, setType] = useState("card");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [routing, setRouting] = useState("");
  const [account, setAccount] = useState("");
  const [acctType, setAcctType] = useState("checking");
  const [save, setSave] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cardDigits = number.replace(/\D/g, "").slice(0, 16);
  const formattedNumber = cardDigits.replace(/(.{4})(?=.)/g, "$1 ");
  const expDigits = exp.replace(/\D/g, "").slice(0, 4);
  const formattedExp = expDigits.length > 2 ? `${expDigits.slice(0, 2)}/${expDigits.slice(2)}` : expDigits;
  const expValid = expDigits.length === 4 && Number(expDigits.slice(0, 2)) >= 1 && Number(expDigits.slice(0, 2)) <= 12;
  const routingDigits = routing.replace(/\D/g, "").slice(0, 9);
  const accountDigits = account.replace(/\D/g, "").slice(0, 17);

  const cardValid = name.trim().length > 1 && cardDigits.length >= 15 && expValid && cvc.length >= 3;
  const eftValid = name.trim().length > 1 && routingDigits.length === 9 && accountDigits.length >= 4;
  const valid = type === "card" ? cardValid : eftValid;

  const submit = () => {
    if (!valid) {
      setError(type === "card" ? "Check your card details — every field is required." : "Check your bank details — routing number is 9 digits, account number is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    // Simulated processing delay, same pattern as the phone-verification
    // "send code" flow elsewhere in checkout — nothing is actually charged.
    setTimeout(() => {
      const method =
        type === "card"
          ? { id: uid("pm"), type: "card", name: name.trim(), last4: cardDigits.slice(-4), expiry: formattedExp, createdAt: Date.now() }
          : { id: uid("pm"), type: "eft", name: name.trim(), last4: accountDigits.slice(-4), acctType, routingLast4: routingDigits.slice(-4), createdAt: Date.now() };
      if (save) {
        const existing = me?.paymentMethods || [];
        updateMe({ paymentMethods: [...existing, { ...method, isDefault: existing.length === 0 }] });
      }
      setSubmitting(false);
      onSaved(method);
    }, 700);
  };

  return (
    <div>
      <div className="flex mb-4 bg-stone-100 rounded-xl p-1">
        <button
          type="button"
          onClick={() => setType("card")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5 ${type === "card" ? "bg-white text-emerald-800 shadow-sm" : "text-stone-500"}`}
        >
          <CreditCard size={14} /> Card
        </button>
        <button
          type="button"
          onClick={() => setType("eft")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5 ${type === "eft" ? "bg-white text-emerald-800 shadow-sm" : "text-stone-500"}`}
        >
          <Landmark size={14} /> Bank (EFT)
        </button>
      </div>

      {type === "card" ? (
        <>
          <label className="block mb-3">
            <span className="block text-xs font-semibold text-stone-500 mb-1">Name on card</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700" />
          </label>
          <label className="block mb-3">
            <span className="block text-xs font-semibold text-stone-500 mb-1">Card number</span>
            <input
              value={formattedNumber}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 tracking-wider"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 block">
              <span className="block text-xs font-semibold text-stone-500 mb-1">Expiry (MM/YY)</span>
              <input value={formattedExp} onChange={(e) => setExp(e.target.value)} placeholder="12/29" inputMode="numeric" className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </label>
            <label className="w-24 block">
              <span className="block text-xs font-semibold text-stone-500 mb-1">CVC</span>
              <input value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" inputMode="numeric" className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </label>
          </div>
        </>
      ) : (
        <>
          <label className="block mb-3">
            <span className="block text-xs font-semibold text-stone-500 mb-1">Name on account</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700" />
          </label>
          <label className="block mb-3">
            <span className="block text-xs font-semibold text-stone-500 mb-1">Routing number</span>
            <input value={routingDigits} onChange={(e) => setRouting(e.target.value)} placeholder="123456789" inputMode="numeric" className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700" />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 block">
              <span className="block text-xs font-semibold text-stone-500 mb-1">Account number</span>
              <input value={accountDigits} onChange={(e) => setAccount(e.target.value)} placeholder="000123456789" inputMode="numeric" className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </label>
            <label className="w-32 block">
              <span className="block text-xs font-semibold text-stone-500 mb-1">Type</span>
              <select value={acctType} onChange={(e) => setAcctType(e.target.value)} className="w-full border border-stone-200 rounded-xl px-2.5 py-2.5 text-sm outline-none focus:border-emerald-700 bg-white">
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </label>
          </div>
        </>
      )}

      {showSaveToggle && (
        <div className="flex items-center justify-between py-2.5 mt-1">
          <span className="text-sm font-medium text-stone-700">Save for future payments</span>
          <ToggleSwitch checked={save} onChange={setSave} />
        </div>
      )}

      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full mt-3 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? busyLabel : submitLabel}
      </button>
    </div>
  );
}

// One saved method — either a plain manage-it row (Account > Payment
// methods) or, when `selectable`, a pickable radio-style card used inside a
// live payment flow.
function PaymentMethodRow({ m, onSetDefault, onRemove, selectable, selected, onSelect }) {
  const Icon = m.type === "eft" ? Landmark : CreditCard;
  return (
    <div
      onClick={selectable ? onSelect : undefined}
      className={`flex items-center gap-3 border rounded-xl px-3.5 py-3 transition ${selectable ? "cursor-pointer" : ""} ${selected ? "border-emerald-700 bg-emerald-50" : "border-stone-200"}`}
    >
      <span className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-800 flex items-center gap-1.5 flex-wrap">
          {paymentMethodLabel(m)}
          {m.isDefault && <span className="cs-t9 font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Default</span>}
        </p>
        <p className="cs-t11 text-stone-400 truncate">
          {m.name}
          {m.type === "card" && m.expiry ? ` · exp ${m.expiry}` : ""}
          {m.type === "eft" ? ` · ${m.acctType === "savings" ? "Savings" : "Checking"}` : ""}
        </p>
      </div>
      {!selectable && (
        <div className="flex items-center gap-1 shrink-0">
          {!m.isDefault && onSetDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault(m.id);
              }}
              className="cs-t10 font-semibold text-emerald-800 whitespace-nowrap"
            >
              Make default
            </button>
          )}
          {onRemove && (
            <IconButton
              icon={Trash2}
              label="Remove payment method"
              size={14}
              onClick={(e) => {
                e?.stopPropagation?.();
                onRemove(m.id);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// The full "wallet" management UI — list of saved methods with set-default
// and remove, plus an add-new form. Used inline inside Account > Payment
// methods (no wrapping modal needed, it's already inside one).
function PaymentMethodsManager() {
  const { me, updateMe, showToast } = useApp();
  const [adding, setAdding] = useState(false);
  const methods = me?.paymentMethods || [];

  const setDefault = (id) => updateMe({ paymentMethods: methods.map((m) => ({ ...m, isDefault: m.id === id })) });
  const remove = (id) => {
    const next = methods.filter((m) => m.id !== id);
    if (next.length && !next.some((m) => m.isDefault)) next[0] = { ...next[0], isDefault: true };
    updateMe({ paymentMethods: next });
    showToast("Payment method removed");
  };

  if (adding) {
    return (
      <div>
        <button onClick={() => setAdding(false)} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-3">
          <ArrowLeft size={14} /> Back
        </button>
        <PaymentMethodForm
          showSaveToggle={false}
          submitLabel="Save payment method"
          busyLabel="Saving…"
          onSaved={() => {
            setAdding(false);
            showToast("Payment method saved");
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-stone-500 mb-3">
        Saved once, reusable anywhere CropSwap asks for payment — like Sponsored Ads — without retyping it. TEST MODE only, nothing is ever actually charged.
      </p>
      <div className="flex flex-col gap-2 mb-3">
        {methods.map((m) => (
          <PaymentMethodRow key={m.id} m={m} onSetDefault={setDefault} onRemove={remove} />
        ))}
        {methods.length === 0 && <p className="text-sm text-stone-400">No payment methods saved yet.</p>}
      </div>
      <button onClick={() => setAdding(true)} className="w-full border border-stone-200 font-semibold py-2.5 rounded-xl text-stone-700 text-sm flex items-center justify-center gap-1.5">
        <Plus size={15} /> Add a payment method
      </button>
    </div>
  );
}

// The picker shown inside a live payment flow (Sponsored Ads today) — pick
// a saved method or add a new one, same TEST MODE honesty convention.
function PaymentPickerModal({ open, amount, onClose, onPay }) {
  const { me } = useApp();
  const methods = me?.paymentMethods || [];
  const [mode, setMode] = useState(methods.length ? "list" : "form");
  const [selectedId, setSelectedId] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(methods.length ? "list" : "form");
    setSelectedId((methods.find((m) => m.isDefault) || methods[0])?.id || null);
    setPaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const payWithSaved = () => {
    const m = methods.find((x) => x.id === selectedId);
    if (!m) return;
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      onPay({ methodId: m.id, last4: m.last4, type: m.type });
    }, 700);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="pay-modal-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="pay-modal-title" className="font-bold text-lg text-stone-800" style={displayFont}>Payment</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 mb-4 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-700 shrink-0" />
          <p className="text-xs font-semibold text-amber-900">TEST MODE — any card or bank details work, nothing is charged.</p>
        </div>

        {mode === "list" ? (
          <div>
            <div className="flex flex-col gap-2 mb-3">
              {methods.map((m) => (
                <PaymentMethodRow key={m.id} m={m} selectable selected={selectedId === m.id} onSelect={() => setSelectedId(m.id)} />
              ))}
            </div>
            <button onClick={() => setMode("form")} className="w-full border border-stone-200 font-semibold py-2.5 rounded-xl text-stone-700 text-sm mb-3 flex items-center justify-center gap-1.5">
              <Plus size={15} /> Use a different payment method
            </button>
            <button
              onClick={payWithSaved}
              disabled={!selectedId || paying}
              className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paying && <Loader2 size={16} className="animate-spin" />}
              {paying ? "Processing…" : `Pay ${formatMoney(amount)} (test mode)`}
            </button>
          </div>
        ) : (
          <>
            {methods.length > 0 && (
              <button onClick={() => setMode("list")} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-3">
                <ArrowLeft size={14} /> Use a saved method instead
              </button>
            )}
            <PaymentMethodForm submitLabel={`Pay ${formatMoney(amount)} (test mode)`} onSaved={(method) => onPay({ methodId: method.id, last4: method.last4, type: method.type })} />
          </>
        )}
      </div>
    </Modal>
  );
}

// The 4-step wizard: Campaign (objective) → Ad set (duration/placement) →
// Ad (optional tagline + live preview) → Review & pay. Deliberately modeled
// on the familiar shape of the big ad platforms' campaign builders so it
// feels familiar, without pretending to do real audience targeting.
function SponsorWizard({ shop, product, onClose, onDone }) {
  const { createSponsorCampaign, showToast } = useApp();
  const [state, setState] = useState({ step: 1, objective: "reach", rateId: "daily", tagline: "" });
  const [payOpen, setPayOpen] = useState(false);
  const rate = sponsorRate(state.rateId);
  const STEPS = ["Campaign", "Ad set", "Ad", "Review"];

  const goStep = (n) => setState((s) => ({ ...s, step: Math.min(4, Math.max(1, n)) }));

  const handlePaid = async ({ last4, type }) => {
    await createSponsorCampaign({
      shopId: shop.id,
      productId: product.id,
      objective: state.objective,
      rateId: state.rateId,
      tagline: state.tagline,
      cardLast4: last4,
      paymentType: type,
    });
    setPayOpen(false);
    showToast(`Sponsored — live now for ${rate.label.toLowerCase()}`);
    onDone();
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-lg mx-auto p-4">
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
          <ArrowLeft size={15} /> Cancel
        </button>

        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`cs-t10 font-bold px-2 py-1 rounded-full ${
                i + 1 === state.step ? "bg-emerald-800 text-white" : i + 1 < state.step ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-400"
              }`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <p className="cs-t11 text-stone-400 mb-5">Step {state.step} of {STEPS.length}</p>

        {state.step === 1 && (
          <div>
            <p className="font-bold text-stone-800 mb-1" style={displayFont}>What's the goal for this ad?</p>
            <p className="text-sm text-stone-500 mb-4">Sponsoring "{product.name}" — this just changes how the campaign is described, delivery works the same either way.</p>
            <div className="flex flex-col gap-2">
              {AD_OBJECTIVES.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setState((s) => ({ ...s, objective: o.id }))}
                  className={`text-left border rounded-xl p-3 flex items-start gap-3 transition ${state.objective === o.id ? "border-emerald-700 bg-emerald-50" : "border-stone-200"}`}
                >
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${state.objective === o.id ? "bg-emerald-800 text-white" : "bg-stone-100 text-stone-500"}`}>
                    <o.icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm text-stone-800">{o.label}</span>
                    <span className="block cs-t11 text-stone-500 mt-0.5">{o.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {state.step === 2 && (
          <div>
            <p className="font-bold text-stone-800 mb-1" style={displayFont}>Ad set</p>
            <p className="text-sm text-stone-500 mb-4">Choose how long this listing stays in the Sponsored rail.</p>
            <div className="border border-stone-200 rounded-xl p-3 flex items-center gap-3 mb-4">
              <ProductImage src={product.image} photoId={product.photoId} artKey={product.art} category={product.category} emoji={product.emoji} alt="" className="w-11 h-11 shrink-0" rounded="rounded-lg" showCredit={false} />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-stone-800 truncate">{product.name}</p>
                <p className="cs-t11 text-stone-400">{formatPrice(product.price, product.priceUnit)}</p>
              </div>
            </div>
            <p className="cs-t11 font-bold text-stone-400 uppercase mb-2">Placement</p>
            <div className="border border-stone-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-stone-600">
              <Home size={15} className="text-emerald-700 shrink-0" /> Sponsored rail, top of the homepage — automatic, the only placement available
            </div>
            <p className="cs-t11 font-bold text-stone-400 uppercase mb-2">Duration</p>
            <div className="flex flex-col gap-2">
              {SPONSOR_RATES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setState((s) => ({ ...s, rateId: r.id }))}
                  className={`flex items-center justify-between border rounded-xl px-3.5 py-2.5 transition ${state.rateId === r.id ? "border-emerald-700 bg-emerald-50" : "border-stone-200"}`}
                >
                  <span className="text-sm font-semibold text-stone-800">{r.label}</span>
                  <span className="text-sm font-bold text-stone-900">
                    {formatMoney(r.price)} <span className="cs-t10 font-normal text-stone-400">({formatMoney(r.price / r.days)}/day)</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {state.step === 3 && (
          <div>
            <p className="font-bold text-stone-800 mb-1" style={displayFont}>Ad</p>
            <p className="text-sm text-stone-500 mb-4">Optionally add a short line that shows underneath the listing while it's sponsored.</p>
            <TextField
              value={state.tagline}
              onChange={(v) => setState((s) => ({ ...s, tagline: v.slice(0, 60) }))}
              placeholder="e.g. Fresh restock today!"
              label="Sponsored tagline (optional)"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700"
            />
            <p className="cs-t10 text-stone-400 mt-1 mb-4">{(state.tagline || "").length}/60</p>
            <p className="cs-t11 font-bold text-stone-400 uppercase mb-2">Preview — how it'll look in the Sponsored rail</p>
            <div className="w-40">
              <ProductCard product={product} sponsored />
              {state.tagline && <p className="cs-t10 text-stone-500 mt-1">{state.tagline}</p>}
            </div>
          </div>
        )}

        {state.step === 4 && (
          <div>
            <p className="font-bold text-stone-800 mb-1" style={displayFont}>Review & pay</p>
            <p className="text-sm text-stone-500 mb-4">Your ad goes live the moment payment is confirmed.</p>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-1.5 gap-3">
                <span className="text-sm text-stone-600 shrink-0">Listing</span>
                <span className="text-sm font-semibold text-stone-800 truncate text-right">{product.name}</span>
              </div>
              <div className="flex items-center justify-between mb-1.5 gap-3">
                <span className="text-sm text-stone-600 shrink-0">Goal</span>
                <span className="text-sm font-semibold text-stone-800 text-right">{AD_OBJECTIVES.find((o) => o.id === state.objective)?.label}</span>
              </div>
              <div className="flex items-center justify-between mb-1.5 gap-3">
                <span className="text-sm text-stone-600 shrink-0">Duration</span>
                <span className="text-sm font-semibold text-stone-800 text-right">{rate.label}</span>
              </div>
              <div className="border-t border-stone-100 mt-2 pt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">Total</span>
                <span className="text-sm font-bold text-stone-900">{formatMoney(rate.price)}</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-700 shrink-0" />
              <p className="text-xs font-semibold text-amber-900">TEST MODE — pay with a saved method, a fake card, or fake bank details. No real charge is made.</p>
            </div>
            <button onClick={() => setPayOpen(true)} className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl">
              Pay — {formatMoney(rate.price)}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mt-6">
          {state.step > 1 && (
            <button onClick={() => goStep(state.step - 1)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-600 border border-stone-200">
              Back
            </button>
          )}
          {state.step < 4 && (
            <button onClick={() => goStep(state.step + 1)} className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm">
              Next
            </button>
          )}
        </div>
      </div>

      <PaymentPickerModal open={payOpen} amount={rate.price} onClose={() => setPayOpen(false)} onPay={handlePaid} />
    </div>
  );
}

function AdsScreen({ navigate }) {
  const { me, shopsById, products, sponsorships, cancelSponsorCampaign, showToast } = useApp();
  const shop = me?.shopId ? shopsById[me.shopId] : null;
  const shopProducts = useMemo(() => products.filter((p) => p.shopId === shop?.id), [products, shop?.id]);
  const [wizardProductId, setWizardProductId] = useState(null);

  if (!me.isVendor || !me.shopId) {
    return (
      <EmptyState
        icon={Store}
        title="No storefront yet"
        body="Become a vendor first to sponsor a listing."
        action={<button onClick={() => navigate({ screen: "store" })} className="text-sm font-semibold text-emerald-800">Start selling</button>}
      />
    );
  }
  if (!shop) return <LoadingScreen inline />;

  const wizardProduct = wizardProductId ? shopProducts.find((p) => p.id === wizardProductId) : null;
  if (wizardProduct) {
    return (
      <SponsorWizard
        shop={shop}
        product={wizardProduct}
        onClose={() => setWizardProductId(null)}
        onDone={() => setWizardProductId(null)}
      />
    );
  }

  const myCampaigns = sponsorships.filter((c) => c.shopId === shop.id).sort((a, b) => b.createdAt - a.createdAt);
  const activeByProduct = {};
  myCampaigns.forEach((c) => {
    if (sponsorIsLive(c)) activeByProduct[c.productId] = c;
  });

  const handleStop = async (id) => {
    await cancelSponsorCampaign(id);
    showToast("Campaign stopped");
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto p-4">
        <button onClick={() => navigate({ screen: "store" })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
          <ArrowLeft size={15} /> Back to My Store
        </button>
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-lg mb-1" style={displayFont}>
          <Megaphone size={20} /> Sponsored Ads
        </div>
        <p className="text-sm text-stone-500 mb-5">Feature one of your listings in the Sponsored rail at the top of the homepage for a set number of days.</p>

        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Your listings</p>
        <div className="flex flex-col gap-2 mb-6">
          {shopProducts.map((pr) => {
            const live = activeByProduct[pr.id];
            return (
              <div key={pr.id} className="border border-stone-200 rounded-xl p-3 flex items-center gap-3">
                <ProductImage src={pr.image} photoId={pr.photoId} artKey={pr.art} category={pr.category} emoji={pr.emoji} alt="" className="w-11 h-11 shrink-0" rounded="rounded-lg" showCredit={false} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-stone-800 truncate">{pr.name}</p>
                  {live ? (
                    <p className="cs-t11 text-emerald-700 font-semibold flex items-center gap-1"><Megaphone size={11} /> Sponsored — {sponsorCountdown(live.endsAt)}</p>
                  ) : (
                    <p className="cs-t11 text-stone-400">{formatPrice(pr.price, pr.priceUnit)}</p>
                  )}
                </div>
                {live ? (
                  <button onClick={() => handleStop(live.id)} className="cs-t11 font-semibold text-rose-600 shrink-0">Stop</button>
                ) : (
                  <button onClick={() => setWizardProductId(pr.id)} className="cs-t11 font-semibold text-emerald-800 shrink-0 flex items-center gap-1">
                    <Megaphone size={12} /> Sponsor
                  </button>
                )}
              </div>
            );
          })}
          {shopProducts.length === 0 && <p className="text-sm text-stone-400">Add a listing first — then you can sponsor it.</p>}
        </div>

        {myCampaigns.length > 0 && (
          <>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">Campaign history</p>
            <div className="flex flex-col gap-2">
              {myCampaigns.map((c) => {
                const pr = products.find((p) => p.id === c.productId);
                const live = sponsorIsLive(c);
                return (
                  <div key={c.id} className="border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{pr?.name || "Listing removed"}</p>
                      <p className="cs-t11 text-stone-400">{sponsorRate(c.rateId).label} · {formatMoney(c.amount)} · {c.paymentType === "eft" ? "bank" : "card"} •••• {c.cardLast4}</p>
                    </div>
                    <span className={`cs-t10 font-bold px-2 py-0.5 rounded-full shrink-0 ${live ? "bg-emerald-50 text-emerald-700" : c.status === "cancelled" ? "bg-stone-100 text-stone-500" : "bg-stone-100 text-stone-400"}`}>
                      {live ? "Active" : c.status === "cancelled" ? "Stopped" : "Ended"}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Standalone version of the "Places" list that also lives inside the account
// modal's Places tab — promoted to its own route so it's reachable straight
// from the desktop sidebar instead of only through the account menu.
function PlacesScreen({ navigate }) {
  const { me, updateMe, userLoc, setUserLoc, showToast } = useApp();
  if (!me) return null;
  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-lg mx-auto px-4 pt-4">
        <button onClick={() => navigate({ screen: "explore" })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
          <ArrowLeft size={15} /> Back
        </button>
        <h1 className="text-2xl font-bold text-stone-900 mb-1" style={displayFont}>Your Places</h1>
        <p className="text-sm text-stone-500 mb-4">Save the places you shop from — handy if you split time between towns.</p>
        <div className="flex flex-col gap-2 mb-4">
          {(me.savedPlaces || []).map((pl) => (
            <div key={pl.label} className="flex items-center gap-2 border border-stone-200 rounded-xl px-3 py-2.5">
              <MapPin size={14} className="text-emerald-700 shrink-0" />
              <span className="flex-1 text-sm font-medium text-stone-700">{pl.label}</span>
              <button onClick={() => { setUserLoc(pl); showToast(`Now browsing near ${pl.label}`); }} className="text-xs font-semibold text-emerald-800">Use</button>
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
    </div>
  );
}

// The small card every clickable avatar in the app opens — call
// useApp().openProfileCard({ id, name, avatar }) from anywhere. Shows just
// enough to place the person (name, photo, member-since once it loads) with
// a button to their full profile and one to close. Fetches the live
// "users:{id}" record itself so it's never stuck showing a stale avatar
// even when the caller only had an old emoji/name to hand it.
function ProfileCardModal({ target, onClose }) {
  const { me, navigate } = useApp();
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!target?.id) return;
    let cancelled = false;
    setUser(undefined);
    getJSON(`users:${target.id}`, true, null).then((u) => {
      if (!cancelled) setUser(u);
    });
    return () => {
      cancelled = true;
    };
  }, [target?.id]);

  if (!target) return null;
  const shown = user || { id: target.id, name: target.name, avatar: target.avatar, avatarPhotoId: target.avatarPhotoId };
  const isSelf = me?.id === target.id;

  return (
    <div className="fixed inset-0 bg-black/40 cs-z-pop flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cs-modal-anim bg-white rounded-2xl w-full max-w-xs p-5 relative">
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 text-stone-400 hover:text-stone-600">
          <X size={18} />
        </button>
        <div className="flex flex-col items-center text-center pt-1">
          <Avatar emoji={shown.avatar} name={shown.name} size="lg" photoId={shown.avatarPhotoId} />
          <p className="font-bold text-stone-900 mt-2.5" style={displayFont}>{shown.name || "…"}</p>
          {user?.createdAt && (
            <p className="cs-t11 text-stone-400 mt-0.5">
              Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 mt-5">
          <button
            onClick={() => {
              onClose();
              navigate({ screen: "profile", userId: target.id });
            }}
            className="w-full flex items-center justify-center gap-1.5 bg-emerald-800 text-white rounded-xl px-4 py-2.5 font-semibold text-sm"
          >
            <User size={15} /> View profile
          </button>
          {!isSelf && (
            <button
              onClick={() => {
                if (navigate({ screen: "messages", withUserId: target.id, withUserName: shown.name, withUserAvatar: shown.avatar })) onClose();
              }}
              className="w-full flex items-center justify-center gap-1.5 border border-stone-200 rounded-xl px-4 py-2.5 font-semibold text-sm text-stone-700"
            >
              <MessageCircle size={15} /> Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Renders nothing (leaving the gradient behind it showing through) until an
// uploaded background photo is reachable — same fade-in-over-a-default
// pattern used for shop cover photos.
function ProfileBackgroundPhoto({ photoId }) {
  const url = usePhotoUrl(photoId);
  if (!url) return null;
  return <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />;
}

// A lightweight public profile for anyone who isn't you — reached today from
// the small avatar on a favorite notification. Looks up the same public
// "users:{id}" record the app already keeps for messaging and the blocked-
// users list, rather than adding a new data source.
function PublicProfileView({ userId, navigate }) {
  const { me } = useApp();
  const [user, setUser] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let cancelled = false;
    setUser(undefined);
    getJSON(`users:${userId}`, true, null).then((u) => {
      if (!cancelled) setUser(u);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (user === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-md mx-auto px-4 pt-4">
          <button onClick={() => navigate({ screen: "explore" })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
            <ArrowLeft size={15} /> Back
          </button>
          <EmptyState icon={User} title="Profile not found" body="This person's profile isn't available anymore." />
        </div>
      </div>
    );
  }

  const isSelf = me?.id === user.id;

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-md mx-auto px-4 pt-4">
        <button onClick={() => navigate({ screen: "explore" })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-5">
          <ArrowLeft size={15} /> Back
        </button>
        {/* Background photo and avatar are deliberately two separate fields
            (profileBackgroundId vs avatarPhotoId) so a person can set one
            without touching the other. */}
        <div className="relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500">
          <ProfileBackgroundPhoto photoId={user.profileBackgroundId} />
        </div>
        <div className="flex flex-col items-center text-center -mt-10">
          <span className="rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
            <Avatar emoji={user.avatar} name={user.name} size="lg" photoId={user.avatarPhotoId} />
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-3" style={displayFont}>{user.name}</h1>
          {user.createdAt && (
            <p className="cs-t11 text-stone-400 mt-1">
              Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 mt-6">
          {user.isVendor && user.shopId && (
            <button
              onClick={() => navigate({ screen: "shop", shopId: user.shopId })}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-800 text-white rounded-xl px-4 py-2.5 font-semibold text-sm"
            >
              <Store size={15} /> Visit their shop
            </button>
          )}
          {!isSelf && (
            <button
              onClick={() => navigate({ screen: "messages", withUserId: user.id, withUserName: user.name, withUserAvatar: user.avatar })}
              className="w-full flex items-center justify-center gap-1.5 border border-stone-200 rounded-xl px-4 py-2.5 font-semibold text-sm text-stone-700"
            >
              <MessageCircle size={15} /> Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountModal({ open, onClose }) {
  const { me, updateMe, signOut, navigate, showToast, openProfileCard, setExploreView } = useApp();
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState(me?.name || "");
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [storageReport, setStorageReport] = useState(null);
  const [checking, setChecking] = useState(false);

  // The modal stays mounted between opens (only `open` toggles), so without
  // this the tab would silently remember whatever was last clicked. Tapping
  // the profile icon should always land on Profile, every time.
  useEffect(() => {
    if (open) setTab("profile");
  }, [open]);

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
  // "Especially needed on mobile, since it doesn't have the sidebar" — these
  // link tabs mirror the desktop sidebar's nav (Orders/Calendar/Inventory/
  // Sponsored Ads/Map) so every screen the sidebar reaches is also reachable
  // from the account popover on a phone.
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "vendor", label: "My Store", icon: Store, link: true, linkScreen: "store" },
    { id: "subscription", label: "My Plan", icon: Sparkles, link: true, linkScreen: "plans" },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "dashboard", label: "Dashboard", icon: TrendingUp, link: true },
    { id: "favorites", label: "Favorites", icon: Heart, link: true },
    { id: "acct-orders", label: "Orders", icon: ClipboardList, link: true, linkScreen: "orders", linkTab: "orders" },
    { id: "acct-calendar", label: "Calendar", icon: Calendar, link: true, linkScreen: "orders", linkTab: "calendar" },
    { id: "acct-inventory", label: "Inventory", icon: Boxes, link: true, linkScreen: "orders", linkTab: "inventory" },
    { id: "acct-updates", label: "Updates", icon: Rss, link: true, linkScreen: "storeEditor", linkTab: "updates" },
    { id: "acct-ads", label: "Sponsored Ads", icon: Megaphone, link: true, linkScreen: "ads" },
    { id: "acct-map", label: "Map", icon: MapPin, link: true, linkScreen: "explore", isMap: true },
    { id: "payment", label: "Payment", icon: CreditCard },
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

        <div className="grid grid-cols-5 gap-1.5 mb-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (!t.link) {
                  setTab(t.id);
                  return;
                }
                if (t.isMap) setExploreView("map");
                onClose();
                navigate(t.linkTab ? { screen: t.linkScreen || t.id, tab: t.linkTab } : { screen: t.linkScreen || t.id });
              }}
              className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition ${tab === t.id ? "bg-emerald-800 text-white" : "bg-stone-100 text-stone-500"}`}
            >
              <t.icon size={12} /> {t.label}
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

            <p className="text-xs font-bold text-stone-400 uppercase mb-1.5 mt-4">Profile background</p>
            <PhotoPicker
              photoId={me.profileBackgroundId}
              onChange={(id) => updateMe({ profileBackgroundId: id })}
              label="Upload a background photo"
              hint="Shown behind your photo on your public profile — separate from your avatar above"
              aspect={16 / 7}
              size="lg"
            />
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

        {tab === "payment" && <PaymentMethodsManager />}

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
            <p className="text-xs text-stone-400 mb-5">Includes your profile, favorites, saved payment methods, and settings.</p>

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
                  <button onClick={() => openProfileCard({ id: u.id, name: u.name, avatar: u.avatar, avatarPhotoId: u.avatarPhotoId })} aria-label={`View ${u.name}'s profile`}>
                    <Avatar emoji={u.avatar} name={u.name} size="sm" />
                  </button>
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
  const { notifications, markAllRead, unreadCount, removeNotification, clearNotifications, openProfileCard } = useApp();
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
                  {n.type === "favorite" && n.fromUserId && (
                    <button
                      onClick={() =>
                        openProfileCard({ id: n.fromUserId, name: n.fromUserName, avatar: n.fromUserAvatar, avatarPhotoId: n.fromUserAvatarPhotoId })
                      }
                      className="shrink-0 self-center"
                      aria-label={`View ${n.fromUserName || "their"} profile`}
                      title={`View ${n.fromUserName || "their"} profile`}
                    >
                      <Avatar emoji={n.fromUserAvatar} name={n.fromUserName} size="sm" photoId={n.fromUserAvatarPhotoId} />
                    </button>
                  )}
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


const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ============================================================================
   SECTION 24: VENDOR DASHBOARD — Premium analytics terminal
   Every number here is real, drawn from analytics_events (Supabase) and the
   shop/product/review data already in context — nothing simulated. A shop
   that just started will show mostly zeros, honestly, until real activity
   happens.
============================================================================ */
const DASHBOARD_RANGES = [
  { id: "hours", label: "Hours", ms: 24 * 3600000, granularity: "hour" },
  { id: "days", label: "Days", ms: 14 * 86400000, granularity: "day" },
  { id: "weeks", label: "Weeks", ms: 12 * 7 * 86400000, granularity: "week" },
  { id: "months", label: "Months", ms: 365 * 86400000, granularity: "month" },
  { id: "years", label: "Years", ms: 5 * 365 * 86400000, granularity: "year" },
];
// Independent per-panel period presets, Yahoo/Google-Finance style. These
// live under a single chart (via PanelPeriodTabs below) and let that one
// chart jump to a trailing window WITHOUT changing the dashboard's global
// Hours/Days/Weeks/Months/Years selector up top, which still drives every
// other panel. "This range" (the default) just reuses whatever that global
// selector is already showing, so nothing changes unless you tap a button —
// tapping 1M/6M/1Y/All (or picking an exact month from the dropdown next to
// them) overrides just that one chart.
const PANEL_PERIODS = [
  { id: "current", label: "This week" },
  { id: "1m", label: "1M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
];
// Trailing window (not calendar-aligned) for a PANEL_PERIODS preset, or an
// exact calendar month for a "month:YYYY-MM" id from the month dropdown.
// `earliestMs` (typically the shop's createdAt) anchors "All" so it doesn't
// reach back further than the shop has actually existed. Returns null for
// "current" (caller should fall back to the global range).
function panelPeriodWindow(id, nowMs, earliestMs) {
  if (id === "1m") {
    return { sinceMs: nowMs - 30 * 86400000, untilMs: nowMs, granularity: "day" };
  }
  if (id === "6m") {
    return { sinceMs: nowMs - 182 * 86400000, untilMs: nowMs, granularity: "week" };
  }
  if (id === "1y") {
    return { sinceMs: nowMs - 365 * 86400000, untilMs: nowMs, granularity: "month" };
  }
  if (id === "all") {
    const sinceMs = earliestMs || nowMs - 3 * 365 * 86400000;
    const spanDays = (nowMs - sinceMs) / 86400000;
    const granularity = spanDays <= 45 ? "day" : spanDays <= 210 ? "week" : "month";
    return { sinceMs, untilMs: nowMs, granularity };
  }
  if (typeof id === "string" && id.startsWith("month:")) {
    const m = id.match(/^month:(\d{4})-(\d{2})$/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]) - 1;
      return { sinceMs: new Date(year, month, 1).getTime(), untilMs: new Date(year, month + 1, 1).getTime(), granularity: "day" };
    }
  }
  return null;
}
// Newest-first list of { id: "month:YYYY-MM", label: "November 2025" }
// options for a panel's month-picker dropdown, spanning from `sinceMs`
// (typically the shop's createdAt) to the current month. Capped at 60
// months as a sane upper bound for very old shops.
function monthOptionsSince(sinceMs, nowMs) {
  const now = new Date(nowMs);
  const startAnchor = sinceMs ? new Date(sinceMs) : new Date(now.getFullYear() - 2, now.getMonth(), 1);
  const startCursor = new Date(startAnchor.getFullYear(), startAnchor.getMonth(), 1);
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  const opts = [];
  let guard = 0;
  while (cursor >= startCursor && guard < 60) {
    opts.push({
      id: `month:${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleDateString([], { month: "long", year: "numeric" }),
    });
    cursor.setMonth(cursor.getMonth() - 1);
    guard += 1;
  }
  return opts;
}
const DASH_STOPWORDS = new Set(["the", "and", "was", "for", "with", "this", "that", "very", "have", "just", "from", "are", "but", "you", "your", "not", "all", "its", "it's", "they", "them"]);

function dayKey(ts) {
  return Math.floor(ts / 86400000);
}
function bucketLabelFor(ts, granularity) {
  const d = new Date(ts);
  switch (granularity) {
    case "hour":
      return d.toLocaleTimeString([], { hour: "numeric" });
    case "day":
    case "week":
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    case "month":
      return d.toLocaleDateString([], { month: "short", year: "2-digit" });
    default:
      return String(d.getFullYear());
  }
}
// Index-based bucketing (not calendar week-of-year) so it never has to worry
// about year-boundary edge cases — just even slices of the selected range.
// Buckets are anchored to `nowMs` and built BACKWARD, so the newest (last)
// bucket is always one full, uncropped step ending exactly at now — never a
// short trailing sliver. If the range doesn't divide evenly into whole
// steps, the leftover falls on the OLDEST (first) bucket instead, which is
// buried in history nobody's reading a trend off of. Before this, the last
// bucket got whatever days were left over (as little as a few days out of a
// 30-day step), which under-counted real, recent activity and made charts
// look like they nosedived right at "today" when nothing had actually
// dropped — see bucketStartFor below.
function bucketStartFor(i, bucketCount, granularity, sinceMs, nowMs) {
  const stepMs = { hour: 3600000, day: 86400000, week: 7 * 86400000, month: 30 * 86400000, year: 365 * 86400000 }[granularity] || 86400000;
  if (i === 0) return sinceMs; // oldest bucket absorbs any leftover span
  return nowMs - (bucketCount - i) * stepMs;
}
function bucketIndexFor(t, bucketCount, granularity, nowMs) {
  const stepMs = { hour: 3600000, day: 86400000, week: 7 * 86400000, month: 30 * 86400000, year: 365 * 86400000 }[granularity] || 86400000;
  const stepsFromNow = Math.floor((nowMs - t) / stepMs);
  return clamp(bucketCount - 1 - stepsFromNow, 0, bucketCount - 1);
}
function bucketSeries(events, granularity, sinceMs, nowMs) {
  const stepMs = { hour: 3600000, day: 86400000, week: 7 * 86400000, month: 30 * 86400000, year: 365 * 86400000 }[granularity] || 86400000;
  const bucketCount = Math.max(1, Math.ceil((nowMs - sinceMs) / stepMs));
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const at = bucketStartFor(i, bucketCount, granularity, sinceMs, nowMs);
    return { key: i, label: bucketLabelFor(at, granularity), count: 0, at };
  });
  events.forEach((e) => {
    const t = new Date(e.created_at).getTime();
    const idx = bucketIndexFor(t, bucketCount, granularity, nowMs);
    buckets[idx].count += 1;
  });
  return buckets;
}
// Same even-slice bucketing as bucketSeries, but sums a numeric value per
// item (e.g. order revenue) instead of just counting — used for the sales
// chart. getTime/getValue let it work on plain order records, not just
// analytics_events rows.
function bucketValueSeries(items, granularity, sinceMs, nowMs, getTime, getValue) {
  const stepMs = { hour: 3600000, day: 86400000, week: 7 * 86400000, month: 30 * 86400000, year: 365 * 86400000 }[granularity] || 86400000;
  const bucketCount = Math.max(1, Math.ceil((nowMs - sinceMs) / stepMs));
  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const at = bucketStartFor(i, bucketCount, granularity, sinceMs, nowMs);
    return { key: i, label: bucketLabelFor(at, granularity), value: 0, at };
  });
  items.forEach((it) => {
    const t = getTime(it);
    if (t == null) return;
    const idx = bucketIndexFor(t, bucketCount, granularity, nowMs);
    buckets[idx].value += getValue(it) || 0;
  });
  return buckets;
}
// Dollar total for one order — sum of each line item's price × qty.
function orderRevenue(order) {
  return (order?.items || []).reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
}
// A stable per-shopper identity for an order even when the shopper wasn't
// signed in (falls back to the typed customer name) — good enough for
// new-vs-returning and repeat-purchase analytics, not a hard identity system.
function orderCustomerKey(order) {
  if (order?.customerUserId) return order.customerUserId;
  const name = (order?.customerName || "").trim().toLowerCase();
  return name ? `name:${name}` : "unknown";
}
// Tallies a list of analytics_events by entity_id and resolves each id to a
// listing name (or "Removed / other listing" if it no longer matches a
// current product) — the building block for "which listings drove your
// views/favorites/shares" drill-downs.
function groupEventsByEntity(events, shopProducts) {
  const counts = new Map();
  events.forEach((e) => {
    const key = e.entity_id || "unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([id, n]) => {
      const p = shopProducts.find((pp) => pp.id === id);
      return { id, name: p ? p.name : "Removed / other listing", n };
    })
    .sort((a, b) => b.n - a.n)
    .slice(0, 8);
}
async function fetchAnalyticsEvents({ types, shopId, sinceMs, untilMs, limit = 4000 }) {
  try {
    let q = supabase
      .from("analytics_events")
      .select("event_type, entity_id, entity_name, shop_id, actor_id, city, state, meta, created_at")
      .gte("created_at", new Date(sinceMs).toISOString())
      .order("created_at", { ascending: true })
      .limit(limit);
    if (untilMs) q = q.lt("created_at", new Date(untilMs).toISOString());
    if (types?.length) q = q.in("event_type", types);
    if (shopId) q = q.eq("shop_id", shopId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("dashboard fetch failed", e);
    return [];
  }
}

// Small round "i" button used all over the dashboard. Hover shows the bubble
// and it disappears the moment the page scrolls (any scroll container, via a
// capture-phase listener); tapping pins it open until the X is tapped.
function InfoTip({ text, align = "center" }) {
  const [pinned, setPinned] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!hovering) return;
    const onScroll = () => setHovering(false);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [hovering]);

  const visible = pinned || hovering;
  const alignClass = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        onClick={(e) => {
          e.stopPropagation();
          setPinned((v) => !v);
        }}
        aria-label="What is this?"
        className="w-4 h-4 rounded-full bg-stone-200 text-stone-500 text-[9px] font-bold flex items-center justify-center hover:bg-stone-300 hover:text-stone-700 transition"
      >
        i
      </button>
      {visible && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-40 top-6 ${alignClass} w-52 bg-stone-900 text-white text-[11px] leading-snug rounded-lg p-2.5 shadow-xl`}
        >
          {pinned && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPinned(false);
                setHovering(false);
              }}
              aria-label="Close"
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-stone-700 flex items-center justify-center shadow"
            >
              <X size={10} />
            </button>
          )}
          {text}
        </div>
      )}
    </span>
  );
}
// Shared color language for the vendor dashboard — each metric gets a
// consistent tint across its stat card, digest chip, and chart color so the
// whole page reads as one coherent, colorful system instead of a wall of
// identical green cards.
const DASH_TINTS = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "#059669", soft: "bg-emerald-50" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", bar: "#e11d48", soft: "bg-rose-50" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", bar: "#2563eb", soft: "bg-blue-50" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", bar: "#7c3aed", soft: "bg-violet-50" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", bar: "#d97706", soft: "bg-amber-50" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", bar: "#0d9488", soft: "bg-teal-50" },
};
// Multi-stop "traffic map" gradient (cold blue -> green -> yellow -> orange
// -> dark red) for the peak-activity heatmap — classic aggregate-heatmap
// styling (think six-weeks-of-response-time heatmaps), chosen specifically
// because a plain two-color fade (the old pale-amber -> rose version)
// crushes everything that isn't near the single busiest cell into
// indistinguishable pale mush. Feed it a PERCENTILE rank (see
// heatmapInsights below), not a raw value ÷ max, so the full color range
// always gets used regardless of how spiky or flat the distribution is.
const HEAT_STOPS = [
  [37, 99, 235], // blue-600 — coldest, slowest
  [34, 197, 94], // green-500
  [250, 204, 21], // yellow-400
  [249, 115, 22], // orange-500
  [153, 27, 27], // red-800 — dark red, busiest
];
// Compact hour-of-day label for the heatmap's header row ("12a", "3a", "6a"...).
function formatHourShort(h) {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}
function dashHeatColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = HEAT_STOPS.length - 1;
  const pos = clamped * segments;
  const i = Math.min(segments - 1, Math.floor(pos));
  const localT = pos - i;
  const [r1, g1, b1] = HEAT_STOPS[i];
  const [r2, g2, b2] = HEAT_STOPS[i + 1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `rgb(${r},${g},${b})`;
}
// Minimal inline trend sparkline — a handful of numbers rendered as a
// filled area path, no axes/labels. Cheap enough to drop into every stat
// card without the overhead of a full Recharts chart per card.
function Sparkline({ data, color = "#059669", height = 26 }) {
  if (!data || data.length < 2 || data.every((v) => !v)) return null;
  const w = 100;
  const h = height;
  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => [i * stepX, h - ((v - min) / range) * (h - 4) - 2]);
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} preserveAspectRatio="none" className="block mt-1.5">
      <path d={areaPath} fill={color} opacity={0.14} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
function DashStat({ icon: Icon, label, value, sub, delta, info, locked, navigate, tint = "emerald", warn = false, spark, onOpen }) {
  const showWarn = warn && !locked;
  const t = showWarn ? DASH_TINTS.rose : DASH_TINTS[tint] || DASH_TINTS.emerald;
  const clickable = !locked && !!onOpen;
  return (
    <div
      onClick={clickable ? onOpen : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={`bg-white border rounded-xl p-3.5 relative ${showWarn ? "border-rose-200 ring-1 ring-rose-100" : "border-stone-200"} ${
        clickable ? "cursor-pointer hover:border-stone-300 hover:shadow-sm transition" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.bg} ${t.text}`}>
          <Icon size={14} />
        </span>
        <div className="flex items-center gap-1.5">
          {delta != null && !locked && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {Math.abs(delta)}%
            </span>
          )}
          {showWarn && <span className="text-[9px] font-bold uppercase tracking-wide text-rose-600 bg-rose-50 rounded-full px-1.5 py-0.5">Watch</span>}
          {info && <InfoTip text={info} align="right" />}
        </div>
      </div>
      {locked ? (
        <button onClick={() => navigate({ screen: "plans" })} className="block text-left" title="Premium — tap to unlock the exact number">
          <span className="inline-flex items-center gap-1 text-xl font-bold text-stone-900 font-mono tabular-nums select-none" style={{ filter: "blur(4px)" }}>
            {value}
          </span>
          <Lock size={10} className="inline-block ml-1 text-amber-600 align-middle" />
        </button>
      ) : (
        <p className="text-xl font-bold text-stone-900 font-mono tabular-nums">{value}</p>
      )}
      <p className="cs-t11 text-stone-500">{label}</p>
      {sub && <p className="cs-t10 text-stone-400 mt-0.5">{sub}</p>}
      {spark && !locked && <Sparkline data={spark} color={t.bar} />}
      {clickable && <ChevronRight size={12} className="absolute bottom-3.5 right-3.5 text-stone-300" />}
    </div>
  );
}
// A small colorful metric chip for the "This week's digest" panel — shows
// the count plus a week-over-week delta when a prior value is supplied.
function DigestChip({ tint = "emerald", icon: Icon, label, value, prior }) {
  const t = DASH_TINTS[tint] || DASH_TINTS.emerald;
  const delta = prior != null ? (prior ? Math.round(((value - prior) / prior) * 100) : value > 0 ? 100 : null) : null;
  return (
    <div className={`rounded-xl px-3 py-2.5 ${t.soft}`}>
      <div className="flex items-center justify-between mb-1">
        <Icon size={13} className={t.text} />
        {delta != null && (
          <span className={`text-[10px] font-bold ${delta >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
            {delta >= 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-stone-900 font-mono tabular-nums leading-none">{value}</p>
      <p className="cs-t10 text-stone-500 mt-0.5">{label}</p>
    </div>
  );
}
function DashPanel({ title, icon: Icon, right, children, className = "", info }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs font-bold text-stone-400 uppercase flex items-center gap-1.5 shrink-0">
          {Icon && <Icon size={13} />} {title}
          {info && <InfoTip text={info} />}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}
// Small pill-tab row placed under a single chart, letting that one chart
// jump to a specific past calendar month/quarter/year (see PANEL_PERIODS)
// without touching the dashboard's global range selector up top, which
// keeps driving every other panel as before.
function PanelPeriodTabs({ value, onChange, monthOptions }) {
  const isMonthPick = typeof value === "string" && value.startsWith("month:");
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1 pt-1.5 border-t border-stone-100">
      {PANEL_PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
            value === p.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {p.label}
        </button>
      ))}
      {monthOptions && monthOptions.length > 0 && (
        <select
          value={isMonthPick ? value : ""}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className={`text-[11px] font-semibold rounded-full pl-2.5 pr-1.5 py-1 border outline-none cursor-pointer ${
            isMonthPick ? "bg-stone-800 text-white border-stone-800" : "bg-stone-100 text-stone-500 border-transparent"
          }`}
        >
          <option value="" disabled>
            Pick a month…
          </option>
          {monthOptions.map((m) => (
            <option key={m.id} value={m.id} className="text-stone-900">
              {m.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
// Dims and disables an interactive tool (rather than blurring it) so a
// free/basic vendor can see exactly what the tool looks like without being
// able to actually operate it — used for the handful of dashboard widgets
// that are genuinely an action (send a broadcast, set a goal) rather than
// just a number on display.
function ToolLock({ locked, navigate, label = "Premium tool", children }) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <button
          onClick={() => navigate({ screen: "plans" })}
          className="flex items-center gap-1.5 bg-white shadow-lg border border-amber-300 rounded-full pl-2 pr-3.5 py-1.5 hover:shadow-xl transition"
        >
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shrink-0">
            <Crown size={11} />
          </span>
          <span className="text-[11px] font-bold text-stone-900 whitespace-nowrap">{label}</span>
        </button>
      </div>
    </div>
  );
}

// Loads/edits the shop owner's mailing list — anyone who's ever messaged a
// Premium vendor for the first time lands here automatically (see
// ensureConversation), and can be removed by the owner at any time.
function useMailingList(ownerId) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!ownerId) {
      setList([]);
      setLoading(false);
      return;
    }
    const res = await readJSON(`mailingList:${ownerId}`, true, []);
    setList(res.ok && Array.isArray(res.value) ? res.value : []);
    setLoading(false);
  }, [ownerId]);
  useEffect(() => {
    load();
  }, [load]);
  const removeSubscriber = useCallback(
    async (userId) => {
      const next = list.filter((s) => s.userId !== userId);
      setList(next);
      await setJSON(`mailingList:${ownerId}`, next, true);
    },
    [list, ownerId]
  );
  return { list, loading, removeSubscriber, reload: load };
}

// Real in-app broadcast, not outbound SMTP email — deliberately labeled that
// way in the UI rather than implied, since there's no email provider wired
// up yet. Every subscriber gets an actual message + notification, today.
function MassMessageComposer({ me, shop, subscribers, onSent, showToast }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const activeSubs = subscribers.filter((s) => s.subscribed !== false);

  const send = async () => {
    if (!text.trim() || !activeSubs.length) return;
    setSending(true);
    let ok = 0;
    for (const sub of activeSubs) {
      try {
        const delivered = await deliverBroadcastMessage(me, sub.userId, sub.name, sub.avatar, text.trim());
        if (delivered) ok++;
      } catch (e) {
        console.error("broadcast send failed", e);
      }
    }
    setSending(false);
    setText("");
    showToast(`Sent to ${ok} subscriber${ok === 1 ? "" : "s"}`);
    onSent?.();
  };

  return (
    <div>
      <TextField
        value={text}
        onChange={setText}
        multiline
        rows={3}
        placeholder={`What's new at ${shop.name}?`}
        label="Message to send to all"
        className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700 mb-2"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="cs-t11 text-stone-400">{activeSubs.length} subscriber{activeSubs.length === 1 ? "" : "s"} will get this as a message</p>
        <button
          onClick={send}
          disabled={sending || !text.trim() || !activeSubs.length}
          className="bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-40 shrink-0"
        >
          {sending ? "Sending…" : "Send to all"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 24b: ORDERS / INVENTORY / CALENDAR (Premium)
   A dedicated workspace for vendors running a real pickup operation: a
   multi-item order list, a live inventory database that the orders list
   deducts from the moment a pickup is checked off, and a calendar that stays
   in sync with both. Everything here is private business data — customer
   names, stock levels, revenue — so every key below is written to the
   private kv table (shared=false), never shared_kv, same as me:profile.
============================================================================ */

// InventoryItem:  { id, name, category, unit, qty, lowStockThreshold, price, notes,
//                   linkedProductId, createdAt, updatedAt }
// InventoryLog:   { id, itemId, itemName, change, reason: "order"|"manual"|"restock"|"order-reverted", orderId, at }
// Order:          { id, customerName, customerUserId, items: [{ id, inventoryItemId, productId, name, qty, unit, price }],
//                   pickupDate, pickupTime, pickupLocation, notes, completed, completedAt, archived,
//                   calendarEventId, createdAt }
// CalendarEvent:  { id, title, date (yyyy-mm-dd), time, notes, orderId, kind: "order"|"note", createdAt }

function normalizeOrderItems(items) {
  return (items || []).map((li) => ({
    id: li.id || uid("oi"),
    inventoryItemId: li.inventoryItemId || null,
    productId: li.productId || null,
    name: (li.name || "").trim(),
    qty: Number(li.qty) || 0,
    unit: li.unit || "each",
    price: Number(li.price) || 0,
  }));
}

// A compact "$ + steppers" money field: type an exact amount directly, or
// nudge it with the up/down arrows when you just need to round to the
// nearest quarter — the two ways someone actually sets a price.
function PriceInput({ value, onChange, step = 0.25, disabled }) {
  const bump = (delta) => {
    const next = Math.max(0, Math.round((Number(value || 0) + delta) * 100) / 100);
    onChange(String(next));
  };
  return (
    <div className={`flex items-center border border-stone-200 rounded-xl overflow-hidden focus-within:border-emerald-700 ${disabled ? "bg-stone-50 opacity-60" : "bg-white"}`}>
      <span className="pl-2.5 pr-1 text-stone-400 text-sm">$</span>
      <NumberField
        value={value}
        disabled={disabled}
        onChange={onChange}
        className="flex-1 min-w-0 py-2 pr-1 text-sm outline-none bg-transparent"
      />
      {!disabled && (
        <div className="flex flex-col border-l border-stone-200 shrink-0">
          <button type="button" onClick={() => bump(step)} aria-label="Increase price" className="px-1.5 py-0.5 text-stone-400 hover:text-emerald-700 hover:bg-stone-50">
            <ChevronUp size={11} />
          </button>
          <button type="button" onClick={() => bump(-step)} aria-label="Decrease price" className="px-1.5 py-0.5 text-stone-400 hover:text-emerald-700 hover:bg-stone-50 border-t border-stone-200">
            <ChevronDown size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// Same unit vocabulary as the storefront's own product editor (PRICE_UNITS),
// so "lb"/"oz"/"dozen"/"each" mean the same thing everywhere in the app.
function UnitSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border border-stone-200 rounded-xl px-2 py-2.5 text-sm outline-none focus:border-emerald-700 ${disabled ? "bg-stone-50 opacity-60" : "bg-white"}`}
    >
      {PRICE_UNITS.map((u) => (
        <option key={u.id} value={u.id}>{u.label}</option>
      ))}
    </select>
  );
}

function useInventory(shopId, { onStockChange } = {}) {
  const [items, setItems] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  // Mirrors the state above but updates synchronously, so a second mutation
  // fired right after the first (in the same handler, before React has had a
  // chance to re-render) reads what the first one just wrote instead of a
  // stale snapshot from the last render. Without this, e.g. adding an order
  // and then immediately updating it would silently undo the add.
  const itemsRef = useRef([]);
  const logRef = useRef([]);

  const load = useCallback(async () => {
    if (!shopId) {
      itemsRef.current = [];
      logRef.current = [];
      setItems([]);
      setLog([]);
      setLoading(false);
      return;
    }
    const [itemsRes, logRes] = await Promise.all([
      getJSON(`inventory:${shopId}`, false, []),
      getJSON(`inventoryLog:${shopId}`, false, []),
    ]);
    const safeItems = Array.isArray(itemsRes) ? itemsRes : [];
    const safeLog = Array.isArray(logRes) ? logRes : [];
    itemsRef.current = safeItems;
    logRef.current = safeLog;
    setItems(safeItems);
    setLog(safeLog);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const persistItems = useCallback(
    async (next) => {
      itemsRef.current = next;
      setItems(next);
      await setJSON(`inventory:${shopId}`, next, false, { verify: true });
    },
    [shopId]
  );

  const persistLog = useCallback(
    async (next) => {
      logRef.current = next;
      setLog(next);
      await setJSON(`inventoryLog:${shopId}`, next, false);
    },
    [shopId]
  );

  const addItem = useCallback(
    async (draft) => {
      const item = {
        id: uid("inv"),
        name: (draft.name || "").trim(),
        category: draft.category || "Other",
        unit: draft.unit || "each",
        qty: Number(draft.qty) || 0,
        lowStockThreshold: draft.lowStockThreshold === "" || draft.lowStockThreshold == null ? null : Number(draft.lowStockThreshold),
        price: Number(draft.price) || 0,
        notes: draft.notes || "",
        linkedProductId: draft.linkedProductId || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await persistItems([item, ...itemsRef.current]);
      await persistLog([{ id: uid("invlog"), itemId: item.id, itemName: item.name, change: item.qty, reason: "manual", orderId: null, at: Date.now() }, ...logRef.current].slice(0, 500));
      return item;
    },
    [persistItems, persistLog]
  );

  const updateItem = useCallback(
    async (id, patch) => {
      const norm = { ...patch };
      if (norm.qty !== undefined) norm.qty = Number(norm.qty) || 0;
      if (norm.price !== undefined) norm.price = Number(norm.price) || 0;
      if (norm.lowStockThreshold !== undefined) {
        norm.lowStockThreshold = norm.lowStockThreshold === "" || norm.lowStockThreshold == null ? null : Number(norm.lowStockThreshold);
      }
      const prev = itemsRef.current.find((it) => it.id === id);
      const next = itemsRef.current.map((it) => (it.id === id ? { ...it, ...norm, updatedAt: Date.now() } : it));
      await persistItems(next);
      // A vendor typing a new quantity straight into the edit form (rather
      // than using the +/- stepper) is just as much a real stock change —
      // without this, the Sold Out banner / low-stock alerts only ever fired
      // for stepper taps and silently missed every quantity someone typed.
      if (prev && norm.qty !== undefined && norm.qty !== prev.qty) {
        const updated = next.find((it) => it.id === id);
        onStockChange?.(updated, prev.qty, norm.qty);
      }
      return next.find((it) => it.id === id);
    },
    [persistItems, onStockChange]
  );

  const removeItem = useCallback(
    async (id) => {
      await persistItems(itemsRef.current.filter((it) => it.id !== id));
    },
    [persistItems]
  );

  // Every stock change — a manual +/- tap or an order being checked off —
  // funnels through one batched write, so a multi-item order only costs one
  // storage round trip, and the caller (OrdersScreen) gets a callback per
  // item that actually changed so it can flip a linked storefront listing's
  // "Sold Out" banner without this hook needing to know about products.
  const adjustStockBatch = useCallback(
    async (deltas, reason, orderId = null) => {
      const logAdds = [];
      const changed = [];
      const next = itemsRef.current.map((it) => {
        const d = deltas.find((x) => x.id === it.id);
        if (!d) return it;
        const prevQty = it.qty;
        const nextQty = Math.max(0, it.qty + d.delta);
        logAdds.push({ id: uid("invlog"), itemId: it.id, itemName: it.name, change: d.delta, reason, orderId, at: Date.now() });
        changed.push({ item: it, prevQty, nextQty });
        return { ...it, qty: nextQty, updatedAt: Date.now() };
      });
      await persistItems(next);
      await persistLog([...logAdds, ...logRef.current].slice(0, 500));
      changed.forEach(({ item, prevQty, nextQty }) => onStockChange?.(item, prevQty, nextQty));
    },
    [persistItems, persistLog, onStockChange]
  );

  const adjustStock = useCallback(
    (id, delta, reason, orderId = null) => adjustStockBatch([{ id, delta }], reason, orderId),
    [adjustStockBatch]
  );

  return { items, log, loading, addItem, updateItem, removeItem, adjustStock, adjustStockBatch, reload: load };
}

function useOrders(shopId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const ordersRef = useRef([]);

  const load = useCallback(async () => {
    if (!shopId) {
      ordersRef.current = [];
      setOrders([]);
      setLoading(false);
      return;
    }
    const list = await getJSON(`orders:${shopId}`, false, []);
    const safe = Array.isArray(list) ? list : [];
    ordersRef.current = safe;
    setOrders(safe);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next) => {
      ordersRef.current = next;
      setOrders(next);
      await setJSON(`orders:${shopId}`, next, false, { verify: true });
    },
    [shopId]
  );

  const addOrder = useCallback(
    async (draft) => {
      const order = {
        id: uid("ord"),
        customerName: (draft.customerName || "").trim(),
        customerUserId: draft.customerUserId || null,
        items: normalizeOrderItems(draft.items),
        pickupDate: draft.pickupDate || "",
        pickupTime: draft.pickupTime || "",
        pickupLocation: draft.pickupLocation || "",
        notes: draft.notes || "",
        completed: false,
        completedAt: null,
        archived: false,
        calendarEventId: draft.calendarEventId || null,
        createdAt: Date.now(),
      };
      await persist([order, ...ordersRef.current]);
      return order;
    },
    [persist]
  );

  const updateOrder = useCallback(
    async (id, patch) => {
      const norm = { ...patch };
      if (norm.items) norm.items = normalizeOrderItems(norm.items);
      await persist(ordersRef.current.map((o) => (o.id === id ? { ...o, ...norm } : o)));
    },
    [persist]
  );

  const removeOrder = useCallback(
    async (id) => {
      await persist(ordersRef.current.filter((o) => o.id !== id));
    },
    [persist]
  );

  const archiveOrder = useCallback(
    async (id, archived = true) => {
      await persist(ordersRef.current.map((o) => (o.id === id ? { ...o, archived } : o)));
    },
    [persist]
  );

  return { orders, loading, addOrder, updateOrder, removeOrder, archiveOrder, reload: load };
}

function useShopCalendar(shopId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const eventsRef = useRef([]);

  const load = useCallback(async () => {
    if (!shopId) {
      eventsRef.current = [];
      setEvents([]);
      setLoading(false);
      return;
    }
    const list = await getJSON(`calendarEvents:${shopId}`, false, []);
    const safe = Array.isArray(list) ? list : [];
    eventsRef.current = safe;
    setEvents(safe);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (next) => {
      eventsRef.current = next;
      setEvents(next);
      await setJSON(`calendarEvents:${shopId}`, next, false);
    },
    [shopId]
  );

  const addEvent = useCallback(
    async (draft) => {
      const ev = {
        id: uid("cal"),
        title: (draft.title || "").trim(),
        date: draft.date || "",
        time: draft.time || "",
        notes: draft.notes || "",
        orderId: draft.orderId || null,
        kind: draft.kind || "note",
        reminderMinutesBefore: draft.reminderMinutesBefore ?? null,
        reminderAt: draft.reminderAt ?? null,
        createdAt: Date.now(),
      };
      await persist([ev, ...eventsRef.current]);
      return ev;
    },
    [persist]
  );

  const updateEvent = useCallback(
    async (id, patch) => {
      await persist(eventsRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [persist]
  );

  const removeEvent = useCallback(
    async (id) => {
      await persist(eventsRef.current.filter((e) => e.id !== id));
    },
    [persist]
  );

  return { events, loading, addEvent, updateEvent, removeEvent, reload: load };
}

// Aggregates whatever's currently on the (non-archived) orders list into two
// buckets — not-yet-fulfilled and completed — each with a per-product
// quantity total and a revenue total. Archived orders are excluded on
// purpose: archiving is what takes an order off the running list.
function computeOrderTotals(orders) {
  const mk = () => ({ byProduct: {}, revenue: 0, count: 0 });
  const pending = mk();
  const completed = mk();
  for (const o of orders) {
    if (o.archived) continue;
    const bucket = o.completed ? completed : pending;
    bucket.count++;
    for (const li of o.items) {
      bucket.byProduct[li.name] = (bucket.byProduct[li.name] || 0) + Number(li.qty || 0);
      bucket.revenue += Number(li.qty || 0) * Number(li.price || 0);
    }
  }
  return { pending, completed };
}

function orderTotal(order) {
  return order.items.reduce((sum, li) => sum + Number(li.qty || 0) * Number(li.price || 0), 0);
}

// The date an order was actually fulfilled, for sales-reporting purposes:
// its scheduled pickup date/time, since that's when the sale really
// happened from the shop's perspective — not whenever the vendor happened
// to tap the "complete" checkbox in the app, which can lag behind (or get
// batched) days after the fact and would otherwise throw off "sales over
// time." Falls back to completedAt, then createdAt, for orders that never
// had a pickup date set.
function orderFulfillmentTime(order) {
  if (order.pickupDate) {
    const t = new Date(`${order.pickupDate}T${order.pickupTime || "00:00"}:00`).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return order.completedAt || order.createdAt || null;
}

function pickupLabel(order) {
  if (!order.pickupDate) return "No pickup time set";
  const d = new Date(`${order.pickupDate}T00:00:00`);
  const dateLabel = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return order.pickupTime ? `${dateLabel} @ ${order.pickupTime}` : dateLabel;
}

// Shared "how urgent is this" check for anything with a date/time — orders
// (via pickupDate/pickupTime) and calendar events (via date/time) both funnel
// through this. `null` = nothing to flag, "soon" = due within 6 hours,
// "overdue" = the date/time has already passed and it's still open.
function urgencyFor(dateStr, timeStr, done, now = Date.now()) {
  if (done || !dateStr) return null;
  const dt = new Date(`${dateStr}T${timeStr || "09:00"}:00`).getTime();
  if (Number.isNaN(dt)) return null;
  const ms = dt - now;
  if (ms < 0) return "overdue";
  if (ms <= 6 * 3600000) return "soon";
  return null;
}

function orderUrgency(order, now) {
  return urgencyFor(order.pickupDate, order.pickupTime, order.completed || order.archived, now);
}

function shareTextForOrder(order) {
  const lines = [
    `Order for ${order.customerName}`,
    order.pickupDate ? `Pickup: ${pickupLabel(order)}` : null,
    order.pickupLocation ? `Location: ${order.pickupLocation}` : null,
    "",
    ...order.items.map((li) => `${li.qty} ${priceUnitLabel(li.unit)} ${li.name} — ${formatMoney(li.qty * li.price)}`),
    "",
    `Total: ${formatMoney(orderTotal(order))}`,
    order.notes ? `Notes: ${order.notes}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function TotalsPanel({ title, tone, data }) {
  const productNames = Object.keys(data.byProduct);
  return (
    <div className={`rounded-2xl border p-4 ${tone === "pending" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className="font-bold text-stone-800 mb-2">
        {title} <span className="font-normal text-stone-500 cs-t11">({data.count} order{data.count === 1 ? "" : "s"})</span>
      </p>
      {productNames.length === 0 ? (
        <p className="cs-t11 text-stone-400 mb-2">Nothing here yet.</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
          {productNames.map((name) => (
            <span key={name} className="text-sm text-stone-700">
              <span className="font-semibold">{data.byProduct[name]}</span> {name}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm font-bold text-stone-900">{formatMoney(data.revenue)} total</p>
    </div>
  );
}

function OrderCard({ order, readOnly, onToggleComplete, onEdit, onArchive, onDelete, onAddToCalendar, now }) {
  const total = orderTotal(order);
  const urgency = orderUrgency(order, now);
  const urgencyBorder = urgency === "overdue" ? "border-l-4 border-l-red-500" : urgency === "soon" ? "border-l-4 border-l-orange-400" : "";
  return (
    <div className={`rounded-2xl border p-4 ${order.completed ? "border-stone-100 bg-stone-50" : "border-stone-200 bg-white"} ${urgencyBorder}`}>
      <div className="flex items-start gap-3">
        {!readOnly && (
          <button
            onClick={onToggleComplete}
            aria-label={order.completed ? "Mark not complete" : "Mark complete"}
            className={`w-6 h-6 mt-0.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
              order.completed ? "bg-emerald-800 border-emerald-800" : "border-stone-300 hover:border-emerald-600"
            }`}
          >
            {order.completed && <Check size={14} className="text-white" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={`font-semibold ${order.completed ? "text-stone-400 line-through" : "text-stone-800"}`}>{order.customerName}</p>
            <p className="cs-t11 text-stone-400 flex items-center gap-1 shrink-0">
              <Clock size={11} /> {pickupLabel(order)}
            </p>
          </div>
          {urgency && (
            <p className={`cs-t10 font-bold mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${urgency === "overdue" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
              <AlertTriangle size={10} /> {urgency === "overdue" ? "Overdue" : "Due within 6 hours"}
            </p>
          )}
          {order.pickupLocation && (
            <p className="cs-t11 text-stone-500 flex items-center gap-1 mt-0.5">
              <MapPin size={11} /> {order.pickupLocation}
            </p>
          )}
          <div className="mt-2 space-y-0.5">
            {order.items.map((li) => (
              <div key={li.id} className="flex items-center justify-between text-sm text-stone-600 gap-2">
                <span className="min-w-0 truncate">
                  {li.qty} {priceUnitLabel(li.unit)} {li.name} <span className="text-stone-400">× {formatMoney(li.price)}</span>
                </span>
                <span className="font-semibold text-stone-700 shrink-0">{formatMoney(li.qty * li.price)}</span>
              </div>
            ))}
          </div>
          {order.notes && <p className="cs-t11 text-stone-400 mt-1.5 italic">{order.notes}</p>}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-100">
            <p className="text-sm font-bold text-stone-900">{formatMoney(total)}</p>
            <div className="flex items-center gap-1">
              {!readOnly && !order.calendarEventId && (
                <button
                  type="button"
                  onClick={onAddToCalendar}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition"
                >
                  <Calendar size={14} /> Add to Calendar
                </button>
              )}
              {!readOnly && <IconButton icon={Pencil} label="Edit order" size={14} onClick={onEdit} />}
              {!readOnly && order.completed && <IconButton icon={Archive} label="Archive order" size={14} onClick={onArchive} />}
              {readOnly && <IconButton icon={Archive} label="Restore order" size={14} onClick={onArchive} />}
              <IconButton icon={Trash2} label="Delete order" size={14} onClick={onDelete} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ orders, onAddOrder, onEdit, onToggleComplete, onArchive, onDelete, onAddToCalendar, now }) {
  const active = orders.orders.filter((o) => !o.archived);
  const sorted = active
    .slice()
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const ua = orderUrgency(a, now) ? 0 : 1;
      const ub = orderUrgency(b, now) ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return b.createdAt - a.createdAt;
    });
  const totals = computeOrderTotals(orders.orders);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-bold text-lg text-stone-800" style={displayFont}>Orders</p>
        <button onClick={onAddOrder} className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-semibold px-3.5 py-2 rounded-full">
          <Plus size={15} /> New order
        </button>
      </div>
      {sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          body="Add your first pickup order to start tracking it here."
          action={<button onClick={onAddOrder} className="text-sm font-semibold text-emerald-800">Add an order</button>}
        />
      ) : (
        <div className="space-y-3 mb-6">
          {sorted.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              now={now}
              onToggleComplete={() => onToggleComplete(o)}
              onEdit={() => onEdit(o)}
              onArchive={() => onArchive(o.id)}
              onDelete={() => onDelete(o.id)}
              onAddToCalendar={() => onAddToCalendar(o)}
            />
          ))}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <TotalsPanel title="Not yet fulfilled" tone="pending" data={totals.pending} />
        <TotalsPanel title="Completed" tone="completed" data={totals.completed} />
      </div>
    </div>
  );
}

function OrderFormModal({ open, onClose, onSave, inventory, products, initial }) {
  const [customerName, setCustomerName] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerName(initial?.customerName || "");
    setPickupDate(initial?.pickupDate || "");
    setPickupTime(initial?.pickupTime || "");
    setPickupLocation(initial?.pickupLocation || "");
    setNotes(initial?.notes || "");
    setItems(initial?.items?.length ? initial.items.map((li) => ({ ...li })) : []);
  }, [open, initial]);

  // A product only shows up under "From your storefront" if it isn't already
  // tracked as an inventory item — once it's linked, the inventory entry
  // (with real stock behind it) is the one place to pick it from.
  const linkedProductIds = useMemo(() => new Set(inventory.items.map((it) => it.linkedProductId).filter(Boolean)), [inventory.items]);
  const unlinkedProducts = useMemo(() => products.filter((p) => !linkedProductIds.has(p.id)), [products, linkedProductIds]);

  const addLine = () => setItems((prev) => [...prev, { id: uid("oi"), inventoryItemId: "", productId: "", name: "", qty: 1, unit: "each", price: 0 }]);
  const updateLine = (id, patch) => setItems((prev) => prev.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  const removeLine = (id) => setItems((prev) => prev.filter((li) => li.id !== id));

  const handlePick = (lineId, val) => {
    if (!val) {
      updateLine(lineId, { inventoryItemId: "", productId: "" });
      return;
    }
    if (val.startsWith("p:")) {
      const p = products.find((x) => x.id === val.slice(2));
      if (!p) return;
      updateLine(lineId, { inventoryItemId: "", productId: p.id, name: p.name, unit: p.priceUnit || "each", price: p.price });
      return;
    }
    const it = inventory.items.find((x) => x.id === val);
    if (!it) return;
    updateLine(lineId, { inventoryItemId: it.id, productId: "", name: it.name, unit: it.unit, price: it.price });
  };

  const itemsTotal = items.reduce((sum, li) => sum + (Number(li.qty) || 0) * (Number(li.price) || 0), 0);
  const canSave = customerName.trim().length > 0 && items.length > 0 && items.every((li) => (li.name || "").trim() && Number(li.qty) > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({ customerName, pickupDate, pickupTime, pickupLocation, notes, items });
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="order-form-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="order-form-title" className="font-bold text-lg text-stone-800" style={displayFont}>
            {initial ? "Edit order" : "New order"}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <TextField
            label="Customer name"
            value={customerName}
            onChange={setCustomerName}
            placeholder="Who's this for?"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Pickup date</label>
              <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </div>
            <div>
              <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Pickup time</label>
              <input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </div>
          </div>
          <TextField
            label="Pickup location"
            value={pickupLocation}
            onChange={setPickupLocation}
            placeholder="Where will they pick this up?"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="cs-t11 font-semibold text-stone-500">Items</label>
              <button onClick={addLine} className="cs-t11 font-semibold text-emerald-800 flex items-center gap-1">
                <Plus size={12} /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((li) => {
                const src = li.inventoryItemId ? inventory.items.find((it) => it.id === li.inventoryItemId) : null;
                const short = src && Number(li.qty) > src.qty;
                const lineTotal = (Number(li.qty) || 0) * (Number(li.price) || 0);
                const locked = !!li.inventoryItemId; // unit is tied to how the linked inventory item is stocked
                return (
                  <div key={li.id} className="border border-stone-200 rounded-xl p-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value={li.inventoryItemId || (li.productId ? `p:${li.productId}` : "")}
                        onChange={(e) => handlePick(li.id, e.target.value)}
                        className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-emerald-700"
                      >
                        <option value="">Custom item…</option>
                        {inventory.items.length > 0 && (
                          <optgroup label="From your inventory">
                            {inventory.items.map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name} ({it.qty} {priceUnitLabel(it.unit)} in stock)
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {unlinkedProducts.length > 0 && (
                          <optgroup label="From your storefront">
                            {unlinkedProducts.map((p) => (
                              <option key={p.id} value={`p:${p.id}`}>{p.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <button onClick={() => removeLine(li.id)} className="text-stone-400 hover:text-red-600 shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                    {!li.inventoryItemId && !li.productId && (
                      <input
                        value={li.name}
                        onChange={(e) => updateLine(li.id, { name: e.target.value })}
                        placeholder="Item name"
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-emerald-700 mb-2"
                      />
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="cs-t9 text-stone-400">Qty</label>
                        <NumberField
                          value={li.qty}
                          onChange={(v) => updateLine(li.id, { qty: v })}
                          className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-emerald-700"
                        />
                      </div>
                      <div>
                        <label className="cs-t9 text-stone-400">Unit</label>
                        <UnitSelect value={li.unit} onChange={(v) => updateLine(li.id, { unit: v })} disabled={locked} />
                      </div>
                      <div>
                        <label className="cs-t9 text-stone-400">Price ea.</label>
                        <PriceInput value={li.price} onChange={(v) => updateLine(li.id, { price: v })} />
                      </div>
                    </div>
                    <p className="cs-t11 text-stone-500 mt-1.5 text-right">
                      {li.qty || 0} × {formatMoney(Number(li.price) || 0)} = <span className="font-bold text-stone-800">{formatMoney(lineTotal)}</span>
                    </p>
                    {short && <p className="cs-t10 text-amber-700 mt-1">Only {src.qty} {priceUnitLabel(src.unit)} in stock</p>}
                  </div>
                );
              })}
              {items.length === 0 && <p className="cs-t11 text-stone-400">No items yet — add at least one.</p>}
            </div>
          </div>

          <TextField
            label="Notes"
            value={notes}
            onChange={setNotes}
            multiline
            rows={2}
            placeholder="Note"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />

          {items.length > 0 && (
            <div className="flex items-center justify-between px-1 pt-1">
              <p className="font-bold text-stone-800">Order total</p>
              <p className="font-bold text-lg text-stone-900" style={displayFont}>{formatMoney(itemsTotal)}</p>
            </div>
          )}
        </div>
        <button onClick={handleSave} disabled={!canSave || saving} className="w-full mt-4 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-40">
          {saving ? "Saving…" : initial ? "Save changes" : "Add order"}
        </button>
      </div>
    </Modal>
  );
}

function InventoryTab({ shop, patchShop, products, inventory, orders, onAdd, onEdit }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [showLog, setShowLog] = useState(false);
  const trackingOn = shop.inventoryEnabled !== false;
  const autoOOS = !!shop.autoOutOfStock;

  const filtered = inventory.items.filter((it) => {
    if (cat && it.category !== cat) return false;
    if (!q.trim()) return true;
    return it.name.toLowerCase().includes(q.trim().toLowerCase());
  });

  // How much of each inventory item is spoken for by orders that haven't
  // been fulfilled yet — same "not yet fulfilled" bucket as the Orders tab
  // (not completed, not archived), and the same name-match fallback used
  // when an order is actually completed, so a free-typed line item still
  // counts here even if it was never explicitly linked.
  const pendingDemand = useMemo(() => {
    const map = new Map();
    (orders || []).forEach((o) => {
      if (o.completed || o.archived) return;
      (o.items || []).forEach((li) => {
        let invId = li.inventoryItemId;
        if (!invId) {
          const match = inventory.items.find((it) => it.name.trim().toLowerCase() === (li.name || "").trim().toLowerCase());
          invId = match ? match.id : null;
        }
        if (!invId) return;
        map.set(invId, (map.get(invId) || 0) + (Number(li.qty) || 0));
      });
    });
    return map;
  }, [orders, inventory.items]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-lg text-stone-800" style={displayFont}>Inventory</p>
        {trackingOn && (
          <button onClick={onAdd} className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-semibold px-3.5 py-2 rounded-full">
            <Plus size={15} /> Add item
          </button>
        )}
      </div>

      <div className="border border-stone-200 rounded-2xl p-3.5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800">Track inventory</p>
            <p className="cs-t11 text-stone-400">Deduct stock automatically when you check off an order — turn it off if you'd rather not track stock at all.</p>
          </div>
          <ToggleSwitch checked={trackingOn} onChange={(v) => patchShop({ inventoryEnabled: v })} />
        </div>
        {trackingOn && (
          <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-stone-100">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-800">Auto-mark out of stock</p>
              <p className="cs-t11 text-stone-400">Add a "Sold Out" banner to a linked storefront listing the moment its stock hits 0, and remove it when restocked.</p>
            </div>
            <ToggleSwitch checked={autoOOS} onChange={(v) => patchShop({ autoOutOfStock: v })} />
          </div>
        )}
      </div>

      {!trackingOn ? (
        <EmptyState
          icon={Boxes}
          title="Inventory tracking is off"
          body="Turn it back on above to stock items here and have completed orders deduct from them automatically."
        />
      ) : (
        <>
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search inventory…"
              className="w-full border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-700"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto mb-4 pb-1">
            <button onClick={() => setCat("")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${cat === "" ? "bg-emerald-800 text-white border-emerald-800" : "border-stone-200 text-stone-500"}`}>
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${cat === c.id ? "bg-emerald-800 text-white border-emerald-800" : "border-stone-200 text-stone-500"}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No items yet"
              body="Add what you stock — pull it straight from your storefront listings, or enter something custom."
              action={<button onClick={onAdd} className="text-sm font-semibold text-emerald-800">Add an item</button>}
            />
          ) : (
            <div className="space-y-2 mb-6">
              {filtered.map((it) => {
                const catInfo = CATEGORIES.find((c) => c.id === it.category) || CATEGORIES[CATEGORIES.length - 1];
                const outOfStock = it.qty <= 0;
                const low = !outOfStock && it.lowStockThreshold != null && it.qty <= it.lowStockThreshold;
                const demand = pendingDemand.get(it.id) || 0;
                const projected = it.qty - demand;
                const short = demand > 0 && projected < 0;
                return (
                  <div key={it.id} className="flex items-center gap-3 border border-stone-200 rounded-2xl p-3 flex-wrap sm:flex-nowrap">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catInfo.tint }} />
                    <div className="flex-1 min-w-[120px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-stone-800 truncate">{it.name}</p>
                        {outOfStock && (
                          <span className="cs-t9 font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <AlertCircle size={9} /> Out of stock
                          </span>
                        )}
                        {low && (
                          <span className="cs-t9 font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <AlertCircle size={9} /> Low
                          </span>
                        )}
                        {it.linkedProductId && (
                          <span className="cs-t9 font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Store size={9} /> Linked
                          </span>
                        )}
                      </div>
                      <p className="cs-t11 text-stone-400">
                        {formatMoney(it.price)} / {priceUnitLabel(it.unit)} · {catInfo.label}
                      </p>
                      {demand > 0 && (
                        <div
                          className={`flex items-center gap-1.5 mt-1 pl-2 border-l-2 ${short ? "border-red-500" : "border-stone-300"}`}
                          title={`${demand} ${priceUnitLabel(it.unit)} across your not-yet-fulfilled orders`}
                        >
                          {short && <AlertTriangle size={11} className="text-red-600 shrink-0" />}
                          <p className={`cs-t11 font-semibold ${short ? "text-red-600" : "text-stone-500"}`}>
                            {short
                              ? `Short by ${Math.abs(projected)} if open orders (${demand}) are fulfilled`
                              : `${projected} ${priceUnitLabel(it.unit)} left if open orders (${demand}) are fulfilled`}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <IconButton icon={Minus} label="Decrease stock" size={14} onClick={() => inventory.adjustStock(it.id, -1, "manual")} />
                      <span className="w-10 text-center text-sm font-bold text-stone-800">{it.qty}</span>
                      <IconButton icon={Plus} label="Increase stock" size={14} onClick={() => inventory.adjustStock(it.id, 1, "manual")} />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton icon={Pencil} label="Edit item" size={14} onClick={() => onEdit(it)} />
                      <IconButton icon={Trash2} label="Delete item" size={14} onClick={() => inventory.removeItem(it.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => setShowLog((s) => !s)} className="text-sm font-semibold text-stone-500 flex items-center gap-1 mb-2">
            <ChevronRight size={14} className={`transition-transform ${showLog ? "rotate-90" : ""}`} /> Activity log
          </button>
          {showLog && (
            <div className="space-y-1.5">
              {inventory.log.length === 0 && <p className="cs-t11 text-stone-400">No activity yet.</p>}
              {inventory.log.slice(0, 40).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm px-1 gap-2">
                  <span className="text-stone-600 min-w-0 truncate">
                    <span className={`font-semibold ${entry.change < 0 ? "text-red-600" : "text-emerald-700"}`}>{entry.change > 0 ? `+${entry.change}` : entry.change}</span> {entry.itemName}
                    <span className="text-stone-400">
                      {" "}
                      · {entry.reason === "order" ? "order fulfilled" : entry.reason === "order-reverted" ? "order reopened" : entry.reason === "restock" ? "restock" : "manual edit"}
                    </span>
                  </span>
                  <span className="cs-t10 text-stone-400 shrink-0">{new Date(entry.at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InventoryItemModal({ open, onClose, onSave, initial, products }) {
  const [linkedProductId, setLinkedProductId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [unit, setUnit] = useState("each");
  const [qty, setQty] = useState("0");
  const [threshold, setThreshold] = useState("");
  const [price, setPrice] = useState("0");
  const [notes, setNotes] = useState("");
  const [showStock, setShowStock] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const linkedId = initial?.linkedProductId || "";
    setLinkedProductId(linkedId);
    setName(initial?.name || "");
    setCategory(initial?.category || "Other");
    setUnit(initial?.unit || "each");
    setQty(String(initial?.qty ?? 0));
    setThreshold(initial?.lowStockThreshold == null ? "" : String(initial.lowStockThreshold));
    setPrice(String(initial?.price ?? 0));
    setNotes(initial?.notes || "");
    const linkedProduct = linkedId ? products.find((p) => p.id === linkedId) : null;
    setShowStock(!!linkedProduct?.showStock);
  }, [open, initial, products]);

  const pickProduct = (productId) => {
    setLinkedProductId(productId);
    if (!productId) {
      setShowStock(false);
      return;
    }
    const p = products.find((pr) => pr.id === productId);
    if (!p) return;
    setName(p.name);
    setCategory(p.category || "Other");
    setUnit(p.priceUnit || "each");
    setPrice(String(p.price ?? 0));
    setShowStock(!!p.showStock);
  };

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({
      name,
      category,
      unit,
      qty,
      lowStockThreshold: threshold,
      price,
      notes,
      linkedProductId: linkedProductId || null,
      showStock,
      prevLinkedProductId: initial?.linkedProductId || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="inv-item-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="inv-item-title" className="font-bold text-lg text-stone-800" style={displayFont}>
            {initial ? "Edit item" : "Add item"}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Add from your storefront</label>
            <select
              value={linkedProductId}
              onChange={(e) => pickProduct(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
            >
              <option value="">Custom item — I'll fill this in myself</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {linkedProductId && (
              <p className="cs-t10 text-emerald-700 mt-1 flex items-center gap-1"><Store size={10} /> Linked — stock changes here can auto-update that listing's Sold Out banner.</p>
            )}
          </div>
          {linkedProductId && (
            <div className="flex items-center justify-between gap-3 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-stone-700">Show stock count on storefront</p>
                <p className="cs-t10 text-stone-400">Customers see "{qty || 0} {priceUnitLabel(unit)} left in stock" on this listing.</p>
              </div>
              <ToggleSwitch checked={showStock} onChange={setShowStock} />
            </div>
          )}
          <TextField
            label="Item name"
            value={name}
            onChange={setName}
            placeholder="e.g. Yukon Gold Potatoes"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />
          <div>
            <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${category === c.id ? "bg-emerald-800 text-white border-emerald-800" : "border-stone-200 text-stone-500"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Quantity in stock</label>
              <NumberField value={qty} onChange={setQty} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </div>
            <div>
              <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Unit</label>
              <UnitSelect value={unit} onChange={setUnit} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Price per unit</label>
              <PriceInput value={price} onChange={setPrice} />
            </div>
            <div>
              <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Low-stock alert at</label>
              <NumberField value={threshold} onChange={setThreshold} placeholder="Optional" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </div>
          </div>
          <TextField
            label="Notes"
            value={notes}
            onChange={setNotes}
            multiline
            rows={2}
            placeholder="Note"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />
        </div>
        <button onClick={handleSave} disabled={!canSave || saving} className="w-full mt-4 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-40">
          {saving ? "Saving…" : initial ? "Save changes" : "Add item"}
        </button>
      </div>
    </Modal>
  );
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function startOfMonthWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}
function ymd(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ---- Week/day time-grid helpers, added for the Google-style Calendar
// rebuild — month view already had everything it needed above.
function addDaysToDate(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}
function dateToYmd(d) {
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseYmdLocal(str) {
  const [y, m, d] = (str || "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function formatHourLabel(hour) {
  const h = hour % 24;
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}
const CALENDAR_DEFAULT_EVENT_MINUTES = 60;
// Greedy column assignment so same-day overlapping events sit side by side
// instead of stacking on top of each other, the same visual Google's week/day
// grid uses. Not a perfect minimal-column solver, but events per day here are
// few enough that it never needs to be.
function layoutTimedEvents(events) {
  const withTimes = (events || [])
    .map((ev) => {
      const start = timeToMinutes(ev.time);
      return start == null ? null : { ev, start, end: start + CALENDAR_DEFAULT_EVENT_MINUTES };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
  const columnEnds = [];
  const placed = withTimes.map((item) => {
    let col = columnEnds.findIndex((endTime) => endTime <= item.start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(item.end);
    } else {
      columnEnds[col] = item.end;
    }
    return { ...item, col };
  });
  const totalCols = columnEnds.length || 1;
  return placed.map((p) => ({ ...p, totalCols }));
}

// A millisecond timestamp as a "YYYY-MM-DDTHH:mm" string in local time, for
// pre-filling a <input type="datetime-local"> — e.g. a custom reminder time.
function toDatetimeLocalValue(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const REMINDER_OPTIONS = [
  { value: "", label: "No reminder" },
  { value: "0", label: "At the time" },
  { value: "15", label: "15 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

// ---- Calendar export: a real, no-login way to get a pickup onto whatever
// calendar app someone actually uses. There's no live two-way sync here (that
// would need a Google/Outlook OAuth integration this app doesn't have) — just
// a standard .ics file any calendar can import, plus Google's own one-click
// "quick add" link for a single event.
function pad2(n) {
  return String(n).padStart(2, "0");
}
function icsDateTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "09:00").split(":").map(Number);
  return `${y}${pad2(m)}${pad2(d)}T${pad2(hh)}${pad2(mm)}00`;
}
function icsEscape(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function buildIcsForEvents(events, calendarName = "CropSwap Orders") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CropSwap//Orders//EN", `X-WR-CALNAME:${icsEscape(calendarName)}`];
  events
    .filter((ev) => ev.date)
    .forEach((ev) => {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${ev.id}@cropswap`,
        `DTSTAMP:${icsDateTime(ev.date, ev.time)}`,
        `DTSTART:${icsDateTime(ev.date, ev.time)}`,
        `SUMMARY:${icsEscape(ev.title)}`,
        ev.notes ? `DESCRIPTION:${icsEscape(ev.notes)}` : null,
        "END:VEVENT"
      );
    });
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}
function downloadIcs(filename, icsText) {
  const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function googleCalendarUrl(ev) {
  const startDate = new Date(`${ev.date}T${ev.time || "09:00"}:00`);
  const endDate = new Date(startDate.getTime() + 60 * 60000);
  const fmt = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: ev.title, dates: `${fmt(startDate)}/${fmt(endDate)}`, details: ev.notes || "" });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Google's own compact month-picker: no event detail, just a dot under any
// day that has something on it. Steps its own month independently of
// whatever the main view is showing, exactly like Google Calendar's sidebar.
function MiniMonthCalendar({ cursor, onPrevMonth, onNextMonth, selectedDate, onSelectDate, eventsByDate }) {
  const first = startOfMonthWeekday(cursor.year, cursor.month);
  const total = daysInMonth(cursor.year, cursor.month);
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString([], { month: "long", year: "numeric" });
  const todayStr = dateToYmd(new Date());

  return (
    <div className="border border-stone-300 rounded-2xl p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <p className="cs-t11 font-bold text-stone-700">{monthLabel}</p>
        <div className="flex items-center gap-0.5">
          <button onClick={onPrevMonth} aria-label="Previous month" className="w-6 h-6 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500">
            <ChevronLeft size={13} />
          </button>
          <button onClick={onNextMonth} aria-label="Next month" className="w-6 h-6 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center cs-t9 font-bold text-stone-400">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />;
          const dateStr = ymd(cursor.year, cursor.month, day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasEvents = (eventsByDate[dateStr] || []).length > 0;
          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`relative w-6 h-6 mx-auto my-0.5 rounded-full cs-t10 font-semibold flex items-center justify-center transition ${
                isSelected ? "bg-emerald-700 text-white" : isToday ? "text-emerald-700 font-bold" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {day}
              {hasEvents && !isSelected && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-amber-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The hourly grid shared by Week (7 columns) and Day (1 column) views — an
// all-day strip on top for events with no time, then a scrollable 24-hour
// grid below with a live red "now" line, matching Google Calendar's layout.
function TimeGridView({ days, eventsByDate, orders, onOpenEvent, onAddNote, now }) {
  const HOUR_HEIGHT = 48;
  const scrollRef = useRef(null);
  const todayStr = dateToYmd(new Date());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const nowDate = new Date(now || Date.now());
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const nowYmd = dateToYmd(nowDate);

  return (
    <div className="border border-stone-300 rounded-2xl overflow-hidden bg-white">
      <div className="flex border-b border-stone-300">
        <div className="w-12 sm:w-14 shrink-0 border-r border-stone-300" />
        {days.map((d) => {
          const dateStr = dateToYmd(d);
          const isToday = dateStr === todayStr;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div key={dateStr} className={`flex-1 min-w-0 text-center py-2 border-r border-stone-200 last:border-r-0 ${isToday ? "bg-emerald-50" : isWeekend ? "bg-stone-100" : "bg-stone-50"}`}>
              <p className="cs-t9 font-bold text-stone-400 uppercase">{d.toLocaleDateString([], { weekday: "short" })}</p>
              <p className={`text-sm font-bold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? "bg-emerald-700 text-white" : "text-stone-700"}`}>
                {d.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex border-b border-stone-300">
        <div className="w-12 sm:w-14 shrink-0 border-r border-stone-300 flex items-center justify-center cs-t9 text-stone-400">All day</div>
        {days.map((d) => {
          const dateStr = dateToYmd(d);
          const allDayEvents = (eventsByDate[dateStr] || []).filter((ev) => !ev.time);
          return (
            <div key={dateStr} className="flex-1 min-w-0 border-r border-stone-200 last:border-r-0 p-1 flex flex-col gap-1 min-h-[32px]">
              {allDayEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onOpenEvent(ev)}
                  className={`text-left cs-t10 font-semibold truncate px-1.5 py-0.5 rounded ${ev.kind === "order" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex overflow-y-auto" style={{ maxHeight: 560 }}>
        <div className="w-12 sm:w-14 shrink-0 border-r border-stone-300">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
              {h > 0 && <span className="absolute -top-2 right-1 cs-t9 text-stone-400">{formatHourLabel(h)}</span>}
            </div>
          ))}
        </div>
        {days.map((d) => {
          const dateStr = dateToYmd(d);
          const timedEvents = layoutTimedEvents(eventsByDate[dateStr] || []);
          const isToday = dateStr === todayStr;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={dateStr}
              className={`flex-1 min-w-0 border-r border-stone-200 last:border-r-0 relative ${isWeekend ? "bg-stone-50" : ""}`}
              style={{ height: HOUR_HEIGHT * 24 }}
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <button
                  key={h}
                  onClick={() => onAddNote(dateStr, `${pad2(h)}:00`)}
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  className="absolute left-0 right-0 border-t border-stone-200 hover:bg-stone-100/70 transition"
                  aria-label={`Add event at ${formatHourLabel(h)} on ${dateStr}`}
                />
              ))}
              {isToday && dateStr === nowYmd && (
                <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}>
                  <span className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                  <span className="flex-1 h-px bg-red-500" />
                </div>
              )}
              {timedEvents.map(({ ev, start, totalCols, col }) => {
                const linkedOrder = ev.kind === "order" ? orders?.orders.find((o) => o.id === ev.orderId) : null;
                const urgency = urgencyFor(ev.date, ev.time, ev.kind === "order" ? !!linkedOrder?.completed : false, now);
                const widthPct = 100 / totalCols;
                return (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEvent(ev);
                    }}
                    style={{
                      top: (start / 60) * HOUR_HEIGHT + 1,
                      height: (CALENDAR_DEFAULT_EVENT_MINUTES / 60) * HOUR_HEIGHT - 2,
                      left: `${col * widthPct}%`,
                      width: `${widthPct}%`,
                    }}
                    className={`absolute z-[1] text-left rounded-lg px-1.5 py-1 overflow-hidden border-l-4 shadow-sm ${
                      urgency === "overdue"
                        ? "border-l-red-500 bg-red-100 text-red-700"
                        : urgency === "soon"
                        ? "border-l-orange-400 bg-orange-100 text-orange-700"
                        : ev.kind === "order"
                        ? "border-l-emerald-600 bg-emerald-100 text-emerald-800"
                        : "border-l-amber-500 bg-amber-100 text-amber-800"
                    }`}
                  >
                    <p className="cs-t9 font-bold truncate">{ev.time} {ev.title}</p>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CALENDAR_VIEW_MODES = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

function CalendarTab({ calendar, orders, onAddNote, onOpenEvent, onOpenDay, now }) {
  const { showToast } = useApp();
  const today = new Date();
  const [viewMode, setViewMode] = useState("month");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [focusDate, setFocusDate] = useState(dateToYmd(today));
  const [miniCursor, setMiniCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of calendar.events) {
      (map[ev.date] = map[ev.date] || []).push(ev);
    }
    return map;
  }, [calendar.events]);

  const first = startOfMonthWeekday(cursor.year, cursor.month);
  const total = daysInMonth(cursor.year, cursor.month);
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString([], { month: "long", year: "numeric" });
  const todayStr = dateToYmd(today);

  const focusDateObj = parseYmdLocal(focusDate);
  const weekStart = startOfWeek(focusDateObj);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysToDate(weekStart, i)), [weekStart.getTime()]);
  const weekEnd = weekDays[6];
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.toLocaleDateString([], { month: "long" })} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
      : `${weekStart.toLocaleDateString([], { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString([], { month: "short", day: "numeric" })}, ${weekEnd.getFullYear()}`;
  const dayLabel = focusDateObj.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const headerLabel = viewMode === "month" ? monthLabel : viewMode === "week" ? weekLabel : dayLabel;

  const goMonth = (delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const goPrev = () => {
    if (viewMode === "month") goMonth(-1);
    else if (viewMode === "week") setFocusDate((f) => dateToYmd(addDaysToDate(parseYmdLocal(f), -7)));
    else setFocusDate((f) => dateToYmd(addDaysToDate(parseYmdLocal(f), -1)));
  };
  const goNext = () => {
    if (viewMode === "month") goMonth(1);
    else if (viewMode === "week") setFocusDate((f) => dateToYmd(addDaysToDate(parseYmdLocal(f), 7)));
    else setFocusDate((f) => dateToYmd(addDaysToDate(parseYmdLocal(f), 1)));
  };
  const goToday = () => {
    const t = new Date();
    setCursor({ year: t.getFullYear(), month: t.getMonth() });
    setFocusDate(dateToYmd(t));
    setMiniCursor({ year: t.getFullYear(), month: t.getMonth() });
  };

  // Keep the mini calendar's month synced to whichever main view is active,
  // so switching into Week/Day always shows the right month without an extra tap.
  useEffect(() => {
    if (viewMode === "month") setMiniCursor({ year: cursor.year, month: cursor.month });
    else setMiniCursor({ year: focusDateObj.getFullYear(), month: focusDateObj.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, cursor.year, cursor.month, focusDate]);

  const handleMiniSelect = (dateStr) => {
    setFocusDate(dateStr);
    const d = parseYmdLocal(dateStr);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const handleExport = (e) => {
    const val = e.target.value;
    e.target.value = "";
    if (!val) return;
    if (!calendar.events.length) {
      showToast("Nothing on your calendar yet to export.");
      return;
    }
    downloadIcs("cropswap-calendar.ics", buildIcsForEvents(calendar.events));
    showToast(val === "google" ? "Downloaded — open Google Calendar's Settings → Import & export to add it." : "Calendar file downloaded — open it, or import it into your calendar app.");
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
      {/* Sidebar: mini month calendar, create button, and export — Google's left rail */}
      <div className="sm:w-52 shrink-0 flex flex-col gap-3 order-2 sm:order-1">
        <button
          onClick={() => onAddNote(focusDate)}
          className="flex items-center gap-2 justify-center bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-2xl text-sm shadow-sm"
        >
          <Plus size={15} /> Create
        </button>
        <MiniMonthCalendar
          cursor={miniCursor}
          onPrevMonth={() => setMiniCursor((c) => { const d = new Date(c.year, c.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          onNextMonth={() => setMiniCursor((c) => { const d = new Date(c.year, c.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
          selectedDate={viewMode === "month" ? null : focusDate}
          onSelectDate={handleMiniSelect}
          eventsByDate={eventsByDate}
        />
        <div className="border border-stone-300 rounded-2xl p-3 bg-white">
          <label className="cs-t11 font-semibold text-stone-500 mb-1.5 block">Sync to your calendar app</label>
          <select onChange={handleExport} defaultValue="" className="w-full border border-stone-200 rounded-xl px-2 py-2 text-xs outline-none focus:border-emerald-700">
            <option value="">Choose an option…</option>
            <option value="ics">Download .ics (Google, Outlook, Apple)</option>
            <option value="google">Import into Google Calendar</option>
          </select>
        </div>
      </div>

      {/* Main calendar surface */}
      <div className="flex-1 min-w-0 order-1 sm:order-2">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={goToday} className="px-3 py-1.5 rounded-full border border-stone-300 text-xs font-semibold text-stone-600 hover:bg-stone-100">
              Today
            </button>
            <button onClick={goPrev} aria-label="Previous" className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goNext} aria-label="Next" className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500">
              <ChevronRight size={18} />
            </button>
            <p className="font-bold text-stone-800 ml-1" style={displayFont}>{headerLabel}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setViewMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-300 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              {CALENDAR_VIEW_MODES.find((m) => m.id === viewMode)?.label} <ChevronDown size={13} />
            </button>
            {viewMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setViewMenuOpen(false)} />
                <div className="absolute right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg py-1 z-20 min-w-[110px]">
                  {CALENDAR_VIEW_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setViewMode(m.id); setViewMenuOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm font-semibold ${viewMode === m.id ? "text-emerald-800 bg-emerald-50" : "text-stone-600 hover:bg-stone-50"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {viewMode === "month" && (
          <div className="border border-stone-300 rounded-2xl overflow-hidden bg-white">
            <div className="grid grid-cols-7 border-b border-stone-300 bg-stone-100">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center cs-t10 font-bold text-stone-500 py-2">{d}</div>
              ))}
            </div>
            {/* Outlook-style: tapping the day itself (not an event) opens a full
                day agenda; tapping an event chip jumps straight to that event. */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day == null) return <div key={i} className="h-24 bg-stone-50/60 border-r border-b border-stone-200" />;
                const dateStr = ymd(cursor.year, cursor.month, day);
                const evs = eventsByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                const dow = (first + day - 1) % 7;
                const isWeekend = dow === 0 || dow === 6;
                return (
                  <button
                    key={i}
                    onClick={() => onOpenDay(dateStr)}
                    className={`h-24 border-r border-b border-stone-200 p-1 flex flex-col items-start gap-0.5 overflow-hidden text-left transition hover:bg-stone-100 ${
                      isWeekend ? "bg-stone-50/60" : "bg-white"
                    }`}
                  >
                    <span className={`cs-t11 font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-emerald-700 text-white" : "text-stone-600"}`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 w-full">
                      {evs.slice(0, 2).map((ev) => {
                        const linkedOrder = ev.kind === "order" ? orders?.orders.find((o) => o.id === ev.orderId) : null;
                        const urgency = urgencyFor(ev.date, ev.time, ev.kind === "order" ? !!linkedOrder?.completed : false, now);
                        return (
                          <span
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEvent(ev);
                            }}
                            className={`cs-t9 truncate w-full rounded px-1 cursor-pointer border-l-2 ${
                              urgency === "overdue"
                                ? "border-l-red-500 bg-red-100 text-red-700"
                                : urgency === "soon"
                                ? "border-l-orange-400 bg-orange-100 text-orange-700"
                                : `border-l-transparent ${ev.kind === "order" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`
                            }`}
                          >
                            {ev.title}
                          </span>
                        );
                      })}
                      {evs.length > 2 && <span className="cs-t9 text-stone-400">+{evs.length - 2} more</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <TimeGridView days={weekDays} eventsByDate={eventsByDate} orders={orders} onOpenEvent={onOpenEvent} onAddNote={onAddNote} now={now} />
        )}

        {viewMode === "day" && (
          <TimeGridView days={[focusDateObj]} eventsByDate={eventsByDate} orders={orders} onOpenEvent={onOpenEvent} onAddNote={onAddNote} now={now} />
        )}
      </div>
    </div>
  );
}

// The Outlook-style "click a day, see everything in it" card — every event
// on that date with its time, plus edit/delete for your own notes (orders
// route back to the Orders tab to be managed) and a per-event reminder.
function DayViewModal({ open, onClose, date, events, onAddNote, onOpenEvent, onEditNote, onDeleteNote, onSetReminder, onUnlinkOrder }) {
  if (!date) return null;
  const dayEvents = events.slice().sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <Modal open={open} onClose={onClose} labelledBy="day-view-title" size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id="day-view-title" className="font-bold text-xl text-stone-800" style={displayFont}>{dateLabel}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={22} />
          </button>
        </div>
        <button onClick={() => onAddNote(date)} className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 mb-4">
          <Plus size={14} /> Add event to this day
        </button>
        {dayEvents.length === 0 ? (
          <EmptyState icon={Calendar} title="Nothing scheduled" body="This day is wide open." />
        ) : (
          <div className="space-y-2">
            {dayEvents.map((ev) => (
              <div key={ev.id} className="border border-stone-200 rounded-2xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onOpenEvent(ev)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="cs-t11 font-bold text-stone-500 shrink-0">{ev.time || "All day"}</span>
                      <span className={`cs-t9 font-bold px-1.5 py-0.5 rounded-full ${ev.kind === "order" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {ev.kind === "order" ? "Order" : "Note"}
                      </span>
                      {(ev.reminderMinutesBefore != null || ev.reminderAt != null) && <Bell size={11} className="text-stone-400" />}
                    </div>
                    <p className="font-semibold text-stone-800 truncate mt-0.5">{ev.title}</p>
                    {ev.notes && <p className="cs-t11 text-stone-400 truncate">{ev.notes}</p>}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {ev.kind === "note" ? (
                      <>
                        <IconButton icon={Pencil} label="Edit" size={13} onClick={() => onEditNote(ev)} />
                        <IconButton icon={Trash2} label="Delete" size={13} onClick={() => onDeleteNote(ev.id)} />
                      </>
                    ) : (
                      <>
                        <span className="cs-t11 font-semibold text-emerald-800 whitespace-nowrap mr-1">View</span>
                        {onUnlinkOrder && <IconButton icon={X} label="Remove from calendar" size={13} onClick={() => onUnlinkOrder(ev)} />}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100 flex-wrap">
                  <Bell size={12} className="text-stone-400 shrink-0" />
                  <select
                    value={ev.reminderAt != null ? "custom" : ev.reminderMinutesBefore == null ? "" : String(ev.reminderMinutesBefore)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom") {
                        // Default to right now so it's a one-tap adjustment from there.
                        onSetReminder(ev.id, { reminderMinutesBefore: null, reminderAt: Date.now() });
                        return;
                      }
                      onSetReminder(ev.id, { reminderMinutesBefore: val === "" ? null : Number(val), reminderAt: null });
                    }}
                    className="text-xs border border-stone-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-700"
                  >
                    {REMINDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                    <option value="custom">Custom date &amp; time…</option>
                  </select>
                  {ev.reminderAt != null && (
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalValue(ev.reminderAt)}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const ms = new Date(e.target.value).getTime();
                        if (Number.isNaN(ms)) return;
                        onSetReminder(ev.id, { reminderMinutesBefore: null, reminderAt: ms });
                      }}
                      className="text-xs border border-stone-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-700"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// A big, share-ready detail card — deliberately roomier than the app's usual
// small sheets, since the point is to hand someone (or yourself) the whole
// picture of a pickup in one glance: who, what, how much, and any notes.
function EventDetailModal({ open, onClose, event, order, onManageOrder, onEditNote, onDeleteNote, onUnlinkOrder }) {
  if (!event) return null;
  const isOrder = event.kind === "order" && !!order;
  const total = isOrder ? orderTotal(order) : 0;
  const shareSubject = isOrder ? `Order for ${order.customerName}` : event.title;
  const shareText = isOrder
    ? shareTextForOrder(order)
    : [event.title, `${event.date}${event.time ? ` @ ${event.time}` : ""}`, event.notes].filter(Boolean).join("\n");

  const shareEmail = () => window.open(`mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareText)}`, "_blank");
  const shareTextMsg = () => window.open(`sms:?&body=${encodeURIComponent(shareText)}`, "_blank");
  const shareMore = () => shareContent({ title: shareSubject, text: shareText });

  return (
    <Modal open={open} onClose={onClose} labelledBy="event-detail-title" size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id="event-detail-title" className="font-bold text-xl text-stone-800" style={displayFont}>
            {isOrder ? order.customerName : event.title}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={22} />
          </button>
        </div>

        {isOrder ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-stone-600">
              <span className="flex items-center gap-1.5"><Clock size={14} /> {pickupLabel(order)}</span>
              {order.pickupLocation && <span className="flex items-center gap-1.5"><MapPin size={14} /> {order.pickupLocation}</span>}
            </div>
            <div className="border border-stone-200 rounded-2xl divide-y divide-stone-100">
              {order.items.map((li) => (
                <div key={li.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800 truncate">{li.name}</p>
                    <p className="cs-t11 text-stone-400">{li.qty} {priceUnitLabel(li.unit)} × {formatMoney(li.price)}</p>
                  </div>
                  <p className="font-semibold text-stone-800 shrink-0">{formatMoney(li.qty * li.price)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-1">
              <p className="font-bold text-lg text-stone-900" style={displayFont}>Total</p>
              <p className="font-bold text-lg text-stone-900" style={displayFont}>{formatMoney(total)}</p>
            </div>
            {order.notes && (
              <div className="bg-stone-50 rounded-xl p-3">
                <p className="cs-t11 font-bold text-stone-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-stone-600 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${order.completed ? "bg-emerald-600" : "bg-amber-500"}`} />
                <span className="text-sm font-semibold text-stone-600">{order.completed ? "Completed" : "Not yet fulfilled"}</span>
              </div>
              <div className="flex items-center gap-3">
                {onUnlinkOrder && (
                  <button
                    onClick={() => {
                      onUnlinkOrder(event);
                      onClose();
                    }}
                    className="text-sm font-semibold text-stone-500 hover:text-rose-600"
                  >
                    Remove from calendar
                  </button>
                )}
                {onManageOrder && (
                  <button onClick={() => onManageOrder(order)} className="text-sm font-semibold text-emerald-800">
                    Edit this order →
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-600 flex items-center gap-1.5">
              <Clock size={14} /> {event.date}{event.time ? ` @ ${event.time}` : ""}
            </p>
            {event.notes && <p className="text-sm text-stone-600 whitespace-pre-wrap">{event.notes}</p>}
            {(onEditNote || onDeleteNote) && (
              <div className="flex items-center gap-3 pt-1">
                {onEditNote && (
                  <button onClick={() => onEditNote(event)} className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                    <Pencil size={14} /> Edit
                  </button>
                )}
                {onDeleteNote && (
                  <button
                    onClick={() => {
                      onDeleteNote(event.id);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-rose-600"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-stone-100">
          <button onClick={shareEmail} className="flex-1 flex items-center justify-center gap-1.5 border border-stone-200 rounded-xl py-2.5 text-sm font-semibold text-stone-700">
            <Mail size={15} /> Email
          </button>
          <button onClick={shareTextMsg} className="flex-1 flex items-center justify-center gap-1.5 border border-stone-200 rounded-xl py-2.5 text-sm font-semibold text-stone-700">
            <MessageCircle size={15} /> Text
          </button>
          <button onClick={shareMore} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-semibold">
            <Share2 size={15} /> Share
          </button>
        </div>
        {event.date && (
          <div className="flex items-center justify-center gap-4 mt-3">
            <button
              onClick={() => downloadIcs(`${(isOrder ? order.customerName : event.title).replace(/[^a-z0-9]+/gi, "-")}.ics`, buildIcsForEvents([event]))}
              className="cs-t11 font-semibold text-stone-500 hover:text-emerald-700 flex items-center gap-1"
            >
              <Calendar size={12} /> Download .ics
            </button>
            <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className="cs-t11 font-semibold text-stone-500 hover:text-emerald-700 flex items-center gap-1">
              <Calendar size={12} /> Add to Google Calendar
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CalendarNoteModal({ open, onClose, onSave, initialDate, initialTime, initial }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState(""); // "" | "0" | "15" | "60" | "1440" | "custom"
  const [reminderAt, setReminderAt] = useState(""); // datetime-local string, only used when reminder === "custom"
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title || "");
    setDate(initial?.date || initialDate || "");
    setTime(initial?.time || initialTime || "");
    setNotes(initial?.notes || "");
    if (initial?.reminderAt != null) {
      setReminder("custom");
      setReminderAt(toDatetimeLocalValue(initial.reminderAt));
    } else {
      setReminder(initial?.reminderMinutesBefore == null ? "" : String(initial.reminderMinutesBefore));
      setReminderAt("");
    }
  }, [open, initial, initialDate, initialTime]);

  const canSave = title.trim().length > 0 && !!date && (reminder !== "custom" || !!reminderAt);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const reminderPayload =
      reminder === "custom"
        ? { reminderMinutesBefore: null, reminderAt: new Date(reminderAt).getTime() }
        : { reminderMinutesBefore: reminder === "" ? null : Number(reminder), reminderAt: null };
    await onSave({ title, date, time, notes, kind: "note", ...reminderPayload });
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="cal-note-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="cal-note-title" className="font-bold text-lg text-stone-800" style={displayFont}>{initial ? "Edit note" : "Add calendar note"}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="e.g. Restock potatoes"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </div>
            <div>
              <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
            </div>
          </div>
          <div>
            <label className="cs-t11 font-semibold text-stone-500 mb-1 block flex items-center gap-1"><Bell size={11} /> Remind me</label>
            <select
              value={reminder}
              onChange={(e) => {
                const val = e.target.value;
                setReminder(val);
                if (val === "custom" && !reminderAt) setReminderAt(toDatetimeLocalValue(Date.now()));
              }}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
              <option value="custom">Custom date &amp; time…</option>
            </select>
            {reminder === "custom" && (
              <input
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mt-2 outline-none focus:border-emerald-700"
              />
            )}
          </div>
          <TextField
            label="Notes"
            value={notes}
            onChange={setNotes}
            multiline
            rows={2}
            placeholder="Note"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />
        </div>
        <button onClick={handleSave} disabled={!canSave || saving} className="w-full mt-4 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-40">
          {saving ? "Saving…" : initial ? "Save changes" : "Add note"}
        </button>
      </div>
    </Modal>
  );
}

function AddOrderToCalendarModal({ open, onClose, order, onSave }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(order?.pickupDate || "");
    setTime(order?.pickupTime || "");
  }, [open, order]);

  const canSave = !!date;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave({ date, time });
    setSaving(false);
    onClose();
  };

  if (!order) return null;

  return (
    <Modal open={open} onClose={onClose} labelledBy="add-to-cal-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="add-to-cal-title" className="font-bold text-lg text-stone-800" style={displayFont}>Add to calendar</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-stone-500 mb-4">
          Schedule <span className="font-semibold text-stone-700">{order.customerName}</span>'s pickup on your shop calendar.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
          </div>
          <div>
            <label className="cs-t11 font-semibold text-stone-500 mb-1 block">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700" />
          </div>
        </div>
        <button onClick={handleSave} disabled={!canSave || saving} className="w-full mt-4 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">
          <Calendar size={16} /> {saving ? "Adding…" : "Add to calendar"}
        </button>
      </div>
    </Modal>
  );
}

function ArchiveTab({ orders, onRestore, onDelete }) {
  const [q, setQ] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const archived = orders.orders.filter((o) => o.archived);

  const productNames = useMemo(() => {
    const set = new Set();
    archived.forEach((o) => o.items.forEach((li) => set.add(li.name)));
    return Array.from(set).sort();
  }, [archived]);

  const filtered = archived
    .filter((o) => {
      if (productFilter && !o.items.some((li) => li.name === productFilter)) return false;
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return (
        o.customerName.toLowerCase().includes(needle) ||
        (o.pickupLocation || "").toLowerCase().includes(needle) ||
        (o.pickupDate || "").includes(needle) ||
        o.items.some((li) => li.name.toLowerCase().includes(needle))
      );
    })
    .sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));

  return (
    <div>
      <p className="font-bold text-lg text-stone-800 mb-3" style={displayFont}>Archive</p>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, date, or location…"
            className="w-full border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-700"
          />
        </div>
        <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-700">
          <option value="">All products</option>
          {productNames.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Archive} title="No archived orders" body="Completed orders you archive from the Orders tab will show up here, newest first." />
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} readOnly onArchive={() => onRestore(o.id)} onDelete={() => onDelete(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// Remembers which Orders tab was last open across mounts within the same
// browser session — otherwise switching to another screen and back always
// dumped you back on Orders, even if you'd been sitting on Inventory.
let ordersScreenLastTab = "orders";

function OrdersScreen({ navigate, initialTab }) {
  const { me, shopsById, showToast, products, updateShop, updateProduct } = useApp();
  const [tab, setTabState] = useState(initialTab || ordersScreenLastTab);
  const setTab = (t) => {
    ordersScreenLastTab = t;
    setTabState(t);
  };
  // A Sidebar/My-Store link to "Calendar" or "Inventory" passes an explicit
  // tab even when this screen is already mounted (no remount to re-run
  // useState's initializer), so an explicit request still needs to win here.
  useEffect(() => {
    if (initialTab) setTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  const shop = me?.shopId ? shopsById[me.shopId] : null;
  const shopProducts = useMemo(() => products.filter((p) => p.shopId === shop?.id), [products, shop?.id]);

  // When a linked inventory item crosses the zero line, flip (or un-flip) the
  // matching storefront listing's Sold Out banner — but only clear it back
  // automatically if it's still exactly the banner this feature set, so a
  // vendor's own manual banner choice is never silently overwritten.
  const handleStockChange = useCallback(
    (item, prevQty, nextQty) => {
      // Low-stock / out-of-stock alerts apply to every tracked item, linked
      // to a storefront listing or not — a vendor still wants to know their
      // own-only "compost bin liners" item just ran out.
      if (nextQty <= 0 && prevQty > 0) {
        showToast(`Out of stock: ${item.name}`);
      } else if (item.lowStockThreshold != null && nextQty > 0 && nextQty <= item.lowStockThreshold && prevQty > item.lowStockThreshold) {
        showToast(`Low stock: ${item.name} is down to ${nextQty} ${priceUnitLabel(item.unit)}`);
      }
      if (!item.linkedProductId || !shop?.id) return;
      const product = products.find((p) => p.id === item.linkedProductId);
      // "Show stock count" is independent of the sold-out-banner toggle — a
      // vendor might want customers to see "3 left" without the storefront
      // auto-flipping to Sold Out at zero, or vice versa.
      if (product?.showStock) {
        updateProduct(shop.id, item.linkedProductId, { stockQty: nextQty });
      }
      // A listing can opt out of the shop-wide auto-banner behavior (see the
      // "Auto out-of-stock banner" toggle on the listing itself) — that
      // listing's Sold Out banner is then only ever set/cleared by hand.
      if (!shop.autoOutOfStock || product?.autoStockBanner === false) return;
      if (prevQty > 0 && nextQty <= 0) {
        updateProduct(shop.id, item.linkedProductId, { bannerId: "sold_out", status: "sold_out" });
      } else if (prevQty <= 0 && nextQty > 0) {
        if (product?.bannerId === "sold_out") {
          updateProduct(shop.id, item.linkedProductId, { bannerId: null, status: "available" });
        }
      }
    },
    [shop?.autoOutOfStock, shop?.id, products, updateProduct, showToast]
  );

  // Hooks always run, regardless of the gates below — a conditional early
  // return before these would break the rules of hooks the moment a vendor
  // without a shop, or a non-Premium vendor, opens this screen.
  const inventory = useInventory(shop?.id || null, { onStockChange: handleStockChange });
  const orders = useOrders(shop?.id || null);
  const calendar = useShopCalendar(shop?.id || null);

  const [orderModal, setOrderModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [calendarPickModal, setCalendarPickModal] = useState(null); // order currently being scheduled onto the calendar
  const [dayView, setDayView] = useState(null);

  // In-app reminders: while this screen is open, checks every 15 seconds for
  // any calendar event whose reminder window has just been entered, plus
  // orders crossing into "due within 6 hours" or "overdue". This is a real,
  // working alert — but it only fires in this browser tab, not as a phone
  // push notification, since there's no notification backend wired up.
  // `nowTick` re-renders the Orders/Calendar tabs every minute so their
  // orange/red urgency bars stay current without needing a page action.
  const [nowTick, setNowTick] = useState(Date.now());
  const remindedRef = useRef(new Set());
  const orderAlertedRef = useRef(new Set());
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      calendar.events.forEach((ev) => {
        if (remindedRef.current.has(ev.id)) return;
        // A custom reminder fires at the exact date/time picked for it,
        // independent of the event's own date — everything else fires the
        // usual N-minutes-before-the-event way.
        let triggerAt = null;
        if (ev.reminderAt != null) {
          triggerAt = ev.reminderAt;
        } else if (ev.reminderMinutesBefore != null && ev.date) {
          const when = new Date(`${ev.date}T${ev.time || "09:00"}:00`).getTime();
          triggerAt = when - ev.reminderMinutesBefore * 60000;
        }
        if (triggerAt == null) return;
        if (now >= triggerAt && now - triggerAt < 6 * 3600000) {
          remindedRef.current.add(ev.id);
          showToast(`Reminder: ${ev.title}${ev.time ? ` @ ${ev.time}` : ""}`);
        }
      });
      orders.orders.forEach((o) => {
        if (o.completed || o.archived) return;
        const urgency = orderUrgency(o, now);
        if (!urgency) return;
        const key = `${o.id}:${urgency}`;
        if (orderAlertedRef.current.has(key)) return;
        orderAlertedRef.current.add(key);
        showToast(
          urgency === "overdue"
            ? `Overdue: ${o.customerName}'s pickup was ${pickupLabel(o)}`
            : `Due soon: ${o.customerName}'s pickup is ${pickupLabel(o)}`
        );
      });
      setNowTick(now);
    };
    check();
    // Every 15s rather than every 60s so a custom reminder set just seconds
    // into the future — "remind me in 30 seconds" — still fires promptly
    // instead of waiting up to a full minute for the next tick.
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, [calendar.events, orders.orders, showToast]);

  if (!me.isVendor || !me.shopId) {
    return (
      <EmptyState
        icon={Store}
        title="No storefront yet"
        body="Become a vendor first to unlock Orders."
        action={<button onClick={() => navigate({ screen: "store" })} className="text-sm font-semibold text-emerald-800">Start selling</button>}
      />
    );
  }
  if (!shop) return <LoadingScreen inline />;

  const premium = isPremiumPlan(me);
  if (!premium) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center mx-auto mb-5">
          <Crown size={26} />
        </div>
        <p className="font-bold text-xl text-stone-800 mb-2" style={displayFont}>Orders is a Premium tool</p>
        <p className="text-sm text-stone-500 mb-6">
          Track pickup orders, keep a live inventory, and see a calendar of every pickup — all in one place, built for vendors running a real market schedule.
        </p>
        <button onClick={() => navigate({ screen: "plans" })} className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-full">
          Upgrade to Premium
        </button>
      </div>
    );
  }

  const patchShop = (partial) => updateShop(shop.id, partial);

  const linkOrderToCalendar = async (order, draft) => {
    const ev = await calendar.addEvent({
      title: `${draft.customerName} pickup`,
      date: draft.pickupDate,
      time: draft.pickupTime,
      notes: draft.pickupLocation,
      orderId: order.id,
      kind: "order",
    });
    await orders.updateOrder(order.id, { calendarEventId: ev.id });
  };

  const handleCreateOrder = async (draft) => {
    const order = await orders.addOrder(draft);
    if (draft.pickupDate) await linkOrderToCalendar(order, draft);
    showToast("Order added");
  };

  const handleUpdateOrder = async (order, draft) => {
    await orders.updateOrder(order.id, draft);
    if (order.calendarEventId) {
      if (draft.pickupDate) {
        await calendar.updateEvent(order.calendarEventId, {
          title: `${draft.customerName} pickup`,
          date: draft.pickupDate,
          time: draft.pickupTime,
          notes: draft.pickupLocation,
        });
      } else {
        await calendar.removeEvent(order.calendarEventId);
        await orders.updateOrder(order.id, { calendarEventId: null });
      }
    } else if (draft.pickupDate) {
      await linkOrderToCalendar(order, draft);
    }
    showToast("Order updated");
  };

  const handleAddOrderToCalendar = async (order, draft) => {
    const ev = await calendar.addEvent({
      title: `${order.customerName} pickup`,
      date: draft.date,
      time: draft.time,
      notes: order.pickupLocation,
      orderId: order.id,
      kind: "order",
    });
    await orders.updateOrder(order.id, { calendarEventId: ev.id, pickupDate: draft.date, pickupTime: draft.time });
    showToast("Added to calendar");
  };

  const handleToggleComplete = async (order) => {
    const nowCompleting = !order.completed;
    const trackingOn = shop.inventoryEnabled !== false;
    let items = order.items;
    let deltas = [];
    if (trackingOn) {
      if (nowCompleting) {
        // A line item typed as free text (rather than picked from "From your
        // inventory") never got an inventoryItemId at save time. Resolve it
        // by name against the current inventory right when the order is
        // completed, and persist the match back onto the order — that's
        // what makes unchecking later restore the right item instead of
        // silently no-oping.
        items = order.items.map((li) => {
          if (li.inventoryItemId) return li;
          const match = inventory.items.find((it) => it.name.trim().toLowerCase() === (li.name || "").trim().toLowerCase());
          return match ? { ...li, inventoryItemId: match.id } : li;
        });
        deltas = items.filter((li) => li.inventoryItemId).map((li) => ({ id: li.inventoryItemId, delta: -li.qty }));
      } else {
        deltas = order.items.filter((li) => li.inventoryItemId).map((li) => ({ id: li.inventoryItemId, delta: li.qty }));
      }
    }
    if (deltas.length) await inventory.adjustStockBatch(deltas, nowCompleting ? "order" : "order-reverted", order.id);
    await orders.updateOrder(order.id, { items, completed: nowCompleting, completedAt: nowCompleting ? Date.now() : null });
    showToast(nowCompleting ? (trackingOn ? "Order complete — inventory updated" : "Order marked complete") : "Order reopened");
  };

  // The "show stock count" flag lives on the public Product record (not the
  // private inventory item) since customers — who never see inventory —
  // need to read it. Keep it in sync here rather than inside useInventory,
  // which has no idea products exist.
  const handleSaveInventoryItem = async (draft) => {
    const { showStock, prevLinkedProductId, ...itemDraft } = draft;
    const item = itemModal.mode === "edit" ? await inventory.updateItem(itemModal.item.id, itemDraft) : await inventory.addItem(itemDraft);
    if (prevLinkedProductId && prevLinkedProductId !== itemDraft.linkedProductId) {
      await updateProduct(shop.id, prevLinkedProductId, { showStock: false, stockQty: null });
    }
    if (itemDraft.linkedProductId) {
      await updateProduct(shop.id, itemDraft.linkedProductId, {
        showStock: !!showStock,
        stockQty: showStock ? Number(itemDraft.qty) || 0 : null,
      });
    }
    return item;
  };

  const handleArchive = async (id, archived) => {
    await orders.archiveOrder(id, archived);
    showToast(archived ? "Order archived" : "Order restored");
  };

  const handleDeleteOrder = async (id) => {
    const order = orders.orders.find((o) => o.id === id);
    if (order?.calendarEventId) await calendar.removeEvent(order.calendarEventId);
    await orders.removeOrder(id);
    showToast("Order deleted");
  };

  // Removes an order's calendar entry without touching the order itself —
  // the order stays fully intact on the Orders tab, it just stops showing
  // up on the calendar.
  const unlinkOrderEvent = async (ev) => {
    await calendar.removeEvent(ev.id);
    if (ev.orderId) await orders.updateOrder(ev.orderId, { calendarEventId: null });
    showToast("Removed from calendar");
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="sticky top-0 bg-white border-b border-stone-200 z-10 px-4 pt-3">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-lg mb-3" style={displayFont}>
          <ClipboardList size={20} /> Orders
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: "orders", label: "Orders", icon: ClipboardList },
            { id: "calendar", label: "Calendar", icon: Calendar },
            { id: "inventory", label: "Inventory", icon: Boxes },
            { id: "archive", label: "Archive", icon: Archive },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border-b-2 whitespace-nowrap transition ${tab === t.id ? "border-emerald-800 text-emerald-800" : "border-transparent text-stone-400"}`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-3xl mx-auto p-4">
        {tab === "orders" && (
          <OrdersTab
            orders={orders}
            now={nowTick}
            onAddOrder={() => setOrderModal({ mode: "add" })}
            onEdit={(o) => setOrderModal({ mode: "edit", order: o })}
            onToggleComplete={handleToggleComplete}
            onArchive={(id) => handleArchive(id, true)}
            onDelete={handleDeleteOrder}
            onAddToCalendar={(order) => setCalendarPickModal(order)}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab
            calendar={calendar}
            orders={orders}
            now={nowTick}
            onAddNote={(date, time) => setNoteModal({ mode: "add", date, time })}
            onOpenEvent={(ev) => setEventDetail(ev)}
            onOpenDay={(date) => setDayView(date)}
          />
        )}
        {tab === "inventory" && (
          <InventoryTab shop={shop} patchShop={patchShop} products={shopProducts} inventory={inventory} orders={orders.orders} onAdd={() => setItemModal({ mode: "add" })} onEdit={(it) => setItemModal({ mode: "edit", item: it })} />
        )}
        {tab === "archive" && <ArchiveTab orders={orders} onRestore={(id) => handleArchive(id, false)} onDelete={handleDeleteOrder} />}
      </div>

      {orderModal && (
        <OrderFormModal
          open
          onClose={() => setOrderModal(null)}
          inventory={inventory}
          products={shopProducts}
          initial={orderModal.mode === "edit" ? orderModal.order : null}
          onSave={(draft) => (orderModal.mode === "edit" ? handleUpdateOrder(orderModal.order, draft) : handleCreateOrder(draft))}
        />
      )}
      {itemModal && (
        <InventoryItemModal
          open
          onClose={() => setItemModal(null)}
          initial={itemModal.mode === "edit" ? itemModal.item : null}
          products={shopProducts}
          onSave={handleSaveInventoryItem}
        />
      )}
      {noteModal && (
        <CalendarNoteModal
          open
          onClose={() => setNoteModal(null)}
          initialDate={noteModal.mode === "add" ? noteModal.date : null}
          initialTime={noteModal.mode === "add" ? noteModal.time : null}
          initial={noteModal.mode === "edit" ? noteModal.event : null}
          onSave={(draft) => (noteModal.mode === "edit" ? calendar.updateEvent(noteModal.event.id, draft) : calendar.addEvent(draft))}
        />
      )}
      {calendarPickModal && (
        <AddOrderToCalendarModal
          open
          order={calendarPickModal}
          onClose={() => setCalendarPickModal(null)}
          onSave={(draft) => handleAddOrderToCalendar(calendarPickModal, draft)}
        />
      )}
      {eventDetail && (
        <EventDetailModal
          open
          onClose={() => setEventDetail(null)}
          event={eventDetail}
          order={eventDetail.kind === "order" ? orders.orders.find((o) => o.id === eventDetail.orderId) : null}
          onManageOrder={(order) => {
            setEventDetail(null);
            setTab("orders");
            setOrderModal({ mode: "edit", order });
          }}
          onUnlinkOrder={eventDetail.kind === "order" ? unlinkOrderEvent : null}
          onEditNote={
            eventDetail.kind === "note"
              ? (ev) => {
                  setEventDetail(null);
                  setNoteModal({ mode: "edit", event: ev });
                }
              : null
          }
          onDeleteNote={eventDetail.kind === "note" ? (id) => calendar.removeEvent(id) : null}
        />
      )}
      {dayView && (
        <DayViewModal
          open
          onClose={() => setDayView(null)}
          date={dayView}
          events={calendar.events.filter((e) => e.date === dayView)}
          onAddNote={(date) => {
            setDayView(null);
            setNoteModal({ mode: "add", date });
          }}
          onOpenEvent={(ev) => {
            setDayView(null);
            setEventDetail(ev);
          }}
          onEditNote={(ev) => {
            setDayView(null);
            setNoteModal({ mode: "edit", event: ev });
          }}
          onDeleteNote={(id) => calendar.removeEvent(id)}
          onSetReminder={(id, patch) => calendar.updateEvent(id, patch)}
          onUnlinkOrder={unlinkOrderEvent}
        />
      )}
    </div>
  );
}


// Per-metric title/icon/tint used by MetricDetailModal below — kept in one
// map so every KPI/sales card and its drill-down modal agree on the same
// look without repeating the mapping at each call site.
const METRIC_META = {
  views: { title: "Views", icon: Eye, tint: "emerald" },
  favorites: { title: "Favorites", icon: Heart, tint: "rose" },
  messages: { title: "Messages", icon: MessageCircle, tint: "blue" },
  shares: { title: "Shares", icon: Share2, tint: "violet" },
  rating: { title: "Rating & reviews", icon: Star, tint: "amber" },
  repeat: { title: "Repeat visitors", icon: Users, tint: "teal" },
  revenue: { title: "Revenue", icon: DollarSign, tint: "emerald" },
  orders: { title: "Orders", icon: ShoppingBag, tint: "blue" },
  aov: { title: "Average order value", icon: Receipt, tint: "violet" },
  bestseller: { title: "Best sellers", icon: Award, tint: "amber" },
};
// Which analytics_events types feed each metric's own trend chart — lets
// MetricDetailModal fetch a wider (or exact-month) window on demand when its
// own 1M/6M/1Y/All/month-picker controls are used, the same way the panels
// below it already do for Views/Peak activity.
const ANALYTICS_KIND_TYPES = {
  views: ["view_shop", "view_product"],
  favorites: ["favorite"],
  shares: ["share"],
  messages: ["message"],
};
// A bigger trend chart used inside a metric's drill-down modal — same
// bucketed-series shape the panels below already use (bucketSeries gives
// `.count`, bucketValueSeries gives `.value`), just told which key to plot.
function DetailTrendChart({ data, dataKey, color, height = 160, formatY }) {
  if (!data || data.length === 0 || data.every((d) => (d[dataKey] || 0) === 0)) {
    return <p className="text-sm text-stone-400 py-6 text-center">No activity in this range yet.</p>;
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#a8a29e" interval={Math.max(0, Math.floor(data.length / 8))} />
          <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={36} tickFormatter={formatY} />
          <Tooltip formatter={formatY ? (v) => formatY(v) : undefined} />
          <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
// A ranked "listing → count" list, used by the views/favorites/shares
// drill-downs to show exactly which products are driving that metric.
function RankedList({ items, valueSuffix = "", emptyText = "Not enough data yet." }) {
  if (!items || items.length === 0) return <p className="text-sm text-stone-400 py-4 text-center">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.n), 1);
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.id || it.name || i} className="flex items-center gap-2">
          <span className="cs-t11 text-stone-400 w-4 shrink-0">{i + 1}</span>
          <span className="text-sm text-stone-700 flex-1 truncate">{it.name}</span>
          <div className="w-16 h-1.5 rounded-full bg-stone-100 overflow-hidden hidden sm:block shrink-0">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(8, Math.round((it.n / max) * 100))}%` }} />
          </div>
          <span className="text-xs font-mono font-bold text-stone-700 w-10 text-right shrink-0">
            {it.n}
            {valueSuffix}
          </span>
        </div>
      ))}
    </div>
  );
}
// The click-through destination for every clickable card on the dashboard —
// one shared modal, switched by `kind`, fed entirely from data VendorDashboard
// already computed (no extra fetches). This is where "10x deeper" analysis
// actually lives: per-listing breakdowns, rating distribution, order size
// mix, restock alerts, etc. — the same real data, just sliced further.
function MetricDetailModal({ kind, onClose, navigate, data }) {
  const meta = METRIC_META[kind] || METRIC_META.views;
  const Icon = meta.icon;
  const t = DASH_TINTS[meta.tint] || DASH_TINTS.emerald;
  const nowMsLocal = Date.now();

  // Every trend chart in this modal gets the same Yahoo/Google-Finance-style
  // 1M/6M/1Y/All + exact-month controls as the panels on the dashboard
  // itself. "current" reuses whatever series the dashboard already computed
  // for its top range selector (no extra work); anything else computes its
  // own window and — for the analytics-event metrics — fetches it fresh.
  // Revenue/Orders never need a fetch since completedOrders is already
  // loaded all-time, so any window there just re-buckets client-side.
  const isAnalyticsKind = !!ANALYTICS_KIND_TYPES[kind];
  const isChartKind = isAnalyticsKind || kind === "revenue" || kind === "orders";
  const [period, setPeriod] = useState("current");
  const [customEvents, setCustomEvents] = useState(null);
  const win = period !== "current" ? panelPeriodWindow(period, nowMsLocal, data.shop?.createdAt) : null;

  useEffect(() => {
    if (!isAnalyticsKind || !win || !data.shop) return;
    let cancelled = false;
    setCustomEvents(null);
    const req = data.isDemo
      ? Promise.resolve(filterDemoEvents(data.demoEvents || [], ANALYTICS_KIND_TYPES[kind], win.sinceMs, win.untilMs))
      : fetchAnalyticsEvents({ types: ANALYTICS_KIND_TYPES[kind], shopId: data.shop.id, sinceMs: win.sinceMs, untilMs: win.untilMs });
    req.then((ev) => {
      if (!cancelled) setCustomEvents(ev);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, kind]);

  const ordersWindow = win || { sinceMs: data.rangeSinceMs, untilMs: data.rangeUntilMs, granularity: data.rangeGranularity };
  const ordersInWindow = useMemo(() => {
    if (kind !== "revenue" && kind !== "orders") return null;
    return (data.completedOrders || []).filter((o) => {
      const tt = orderFulfillmentTime(o) || 0;
      return tt >= ordersWindow.sinceMs && tt <= ordersWindow.untilMs;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, data.completedOrders, ordersWindow.sinceMs, ordersWindow.untilMs]);

  const chartLoading = !!(win && isAnalyticsKind && customEvents === null);
  let chartSeries = null;
  let rankedItems = null;
  let shopPageViewsDisplay = data.shopPageViews;
  if (kind === "views") {
    chartSeries = win ? (customEvents ? bucketSeries(customEvents.filter((e) => e.event_type === "view_product" || e.event_type === "view_shop"), win.granularity, win.sinceMs, win.untilMs) : []) : data.viewSeries;
    rankedItems = win ? (customEvents ? groupEventsByEntity(customEvents.filter((e) => e.event_type === "view_product"), data.shopProducts || []) : []) : data.viewsByProduct;
    shopPageViewsDisplay = win ? (customEvents ? customEvents.filter((e) => e.event_type === "view_shop").length : "…") : data.shopPageViews;
  } else if (kind === "favorites") {
    chartSeries = win ? (customEvents ? bucketSeries(customEvents, win.granularity, win.sinceMs, win.untilMs) : []) : data.favoriteSeries;
    rankedItems = win ? (customEvents ? groupEventsByEntity(customEvents.filter((e) => e.meta?.kind === "product"), data.shopProducts || []) : []) : data.favoritesByProduct;
  } else if (kind === "shares") {
    chartSeries = win ? (customEvents ? bucketSeries(customEvents, win.granularity, win.sinceMs, win.untilMs) : []) : data.shareSeries;
    rankedItems = win ? (customEvents ? groupEventsByEntity(customEvents.filter((e) => e.meta?.kind === "product"), data.shopProducts || []) : []) : data.sharesByProduct;
  } else if (kind === "messages") {
    chartSeries = win ? (customEvents ? bucketSeries(customEvents, win.granularity, win.sinceMs, win.untilMs) : []) : data.messageSeries;
  } else if (kind === "revenue") {
    chartSeries = win ? bucketValueSeries(ordersInWindow || [], ordersWindow.granularity, ordersWindow.sinceMs, ordersWindow.untilMs, orderFulfillmentTime, orderRevenue) : data.salesSeries;
  } else if (kind === "orders") {
    chartSeries = win ? bucketValueSeries(ordersInWindow || [], ordersWindow.granularity, ordersWindow.sinceMs, ordersWindow.untilMs, orderFulfillmentTime, () => 1) : data.ordersSeries;
  }
  const periodControl = isChartKind ? <PanelPeriodTabs value={period} onChange={setPeriod} monthOptions={data.monthOptions} /> : null;

  return (
    <Modal open onClose={onClose} size="lg" labelledBy="metric-detail-title">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 id="metric-detail-title" className="text-lg font-bold text-stone-900 flex items-center gap-2" style={displayFont}>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.bg} ${t.text}`}>
              <Icon size={16} />
            </span>
            {meta.title}
          </h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 shrink-0">
            <X size={16} />
          </button>
        </div>

        {kind === "views" && (
          <div className="space-y-4">
            {chartLoading ? <p className="text-sm text-stone-400 py-6 text-center">Loading…</p> : <DetailTrendChart data={chartSeries} dataKey="count" color={t.bar} />}
            {periodControl}
            <div className="grid grid-cols-2 gap-3">
              <DigestChip tint="emerald" icon={Eye} label="Storefront page views" value={shopPageViewsDisplay} />
              <DigestChip tint="emerald" icon={Package} label="Listing views" value={(rankedItems || []).reduce((s, p) => s + p.n, 0)} />
            </div>
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Most-viewed listings in this window</p>
              <RankedList items={rankedItems} emptyText="No listing views yet in this window." />
            </div>
          </div>
        )}

        {kind === "favorites" && (
          <div className="space-y-4">
            {chartLoading ? <p className="text-sm text-stone-400 py-6 text-center">Loading…</p> : <DetailTrendChart data={chartSeries} dataKey="count" color={t.bar} />}
            {periodControl}
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Most-favorited listings in this window</p>
              <RankedList items={rankedItems} emptyText="No favorites yet in this window." />
            </div>
          </div>
        )}

        {kind === "shares" && (
          <div className="space-y-4">
            {chartLoading ? <p className="text-sm text-stone-400 py-6 text-center">Loading…</p> : <DetailTrendChart data={chartSeries} dataKey="count" color={t.bar} />}
            {periodControl}
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Most-shared listings in this window</p>
              <RankedList items={rankedItems} emptyText="No shares yet in this window." />
            </div>
          </div>
        )}

        {kind === "messages" && (
          <div className="space-y-4">
            {chartLoading ? <p className="text-sm text-stone-400 py-6 text-center">Loading…</p> : <DetailTrendChart data={chartSeries} dataKey="count" color={t.bar} />}
            {periodControl}
            <div className="grid grid-cols-2 gap-3">
              <DigestChip
                tint="blue"
                icon={Clock}
                label="Avg. response time"
                value={
                  data.respLoading
                    ? "…"
                    : data.avgResponseMin != null
                    ? data.avgResponseMin < 60
                      ? `${data.avgResponseMin}m`
                      : `${(data.avgResponseMin / 60).toFixed(1)}h`
                    : "—"
                }
              />
              <DigestChip tint="emerald" icon={ShoppingBag} label="Messages → orders" value={data.messageToOrderRate != null ? `${data.messageToOrderRate}%` : "—"} />
            </div>
            <p className="cs-t11 text-stone-400">Fast replies build trust — shoppers who message and hear back quickly are far more likely to follow through and place an order.</p>
          </div>
        )}

        {kind === "rating" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              {data.ratingDistribution.map((r) => (
                <div key={r.star} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-600 w-8 shrink-0 flex items-center gap-0.5">
                    {r.star}
                    <Star size={10} className="text-amber-500 fill-amber-500" />
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${data.count ? Math.round((r.n / data.count) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs font-mono text-stone-500 w-6 text-right shrink-0">{r.n}</span>
                </div>
              ))}
            </div>
            {data.platformAvgRating != null && data.count > 0 && (
              <p className="text-sm text-stone-600">
                You: <span className="font-bold text-stone-900">{data.avgRating.toFixed(2)}</span> · Platform avg:{" "}
                <span className="font-bold text-stone-900">{data.platformAvgRating.toFixed(2)}</span>
              </p>
            )}
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Recent reviews</p>
              {data.recentReviews.length === 0 ? (
                <p className="text-sm text-stone-400 py-2">No reviews yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.recentReviews.map((r) => (
                    <div key={r.id} className="border border-stone-100 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-stone-700">{r.authorName || "Shopper"}</span>
                        <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5">
                          {r.rating} <Star size={10} className="fill-amber-500 text-amber-500" />
                        </span>
                      </div>
                      {r.body && <p className="text-xs text-stone-500 line-clamp-2">{r.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {kind === "repeat" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DigestChip tint="teal" icon={Users} label="Unique viewers" value={data.repeatStats.total} />
              <DigestChip tint="teal" icon={Repeat} label="Came back 2+ days" value={data.repeatStats.repeat} />
            </div>
            <p className="text-sm text-stone-600">
              Repeat rate: <span className="font-bold text-stone-900">{data.repeatStats.pct}%</span>
              {data.repeatStats.avgVisitsPerRepeat > 0 && (
                <span className="cs-t11 text-stone-400"> — repeat viewers come back an average of {data.repeatStats.avgVisitsPerRepeat} different days.</span>
              )}
            </p>
            <p className="cs-t11 text-stone-400">Repeat viewers are shoppers most likely to become loyal customers — consider a mailing-list message to say thanks or announce what's new.</p>
          </div>
        )}

        {kind === "revenue" && (
          <div className="space-y-4">
            <DetailTrendChart data={chartSeries} dataKey="value" color={t.bar} formatY={(v) => `$${v}`} />
            {periodControl}
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Revenue by day of week</p>
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <BarChart data={data.revenueByWeekday}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#a8a29e" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={36} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v) => `$${Math.round(v)}`} />
                    <Bar dataKey="revenue" fill={t.bar} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="cs-t10 text-stone-400 mt-1">Same window as the "Sales by day of week" panel on the dashboard.</p>
            </div>
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Order size breakdown, this range</p>
              <div className="space-y-1.5">
                {data.orderSizeDistribution.map((b) => (
                  <div key={b.label} className="flex items-center justify-between text-sm">
                    <span className="text-stone-600">{b.label}</span>
                    <span className="font-mono font-bold text-stone-700">{b.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {kind === "orders" && (
          <div className="space-y-4">
            <DetailTrendChart data={chartSeries} dataKey="value" color={t.bar} />
            {periodControl}
            <p className="text-sm text-stone-600">
              {data.openOrdersCount > 0 ? (
                <>
                  <span className="font-bold text-stone-900">{data.openOrdersCount}</span> order{data.openOrdersCount === 1 ? "" : "s"} still open, awaiting pickup.{" "}
                  <button onClick={() => navigate({ screen: "orders" })} className="font-bold text-emerald-800 underline underline-offset-2">
                    Manage orders →
                  </button>
                </>
              ) : (
                "No open orders right now — everything's been picked up."
              )}
            </p>
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Completed orders in this window</p>
              {(win ? ordersInWindow || [] : data.ordersInRange).length === 0 ? (
                <p className="text-sm text-stone-400 py-2">None yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {[...(win ? ordersInWindow || [] : data.ordersInRange)]
                    .sort((a, b) => (orderFulfillmentTime(b) || 0) - (orderFulfillmentTime(a) || 0))
                    .slice(0, 20)
                    .map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm border-b border-stone-50 py-1">
                        <span className="truncate flex-1 text-stone-700">{o.customerName || "Customer"}</span>
                        <span className="cs-t11 text-stone-400 mx-2 shrink-0">
                          {orderFulfillmentTime(o) ? new Date(orderFulfillmentTime(o)).toLocaleDateString() : "—"}
                        </span>
                        <span className="font-mono font-bold text-stone-700 shrink-0">{formatMoney(orderRevenue(o))}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {kind === "aov" && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Average order value: <span className="font-bold text-stone-900">{formatMoney(data.aov)}</span> across {data.ordersInRange.length} completed order
              {data.ordersInRange.length === 1 ? "" : "s"} this range.
            </p>
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Order size breakdown</p>
              <div className="space-y-1.5">
                {data.orderSizeDistribution.map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-semibold text-stone-700">{b.label}</span>
                      <span className="font-mono text-stone-500">{b.n}</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${data.ordersInRange.length ? Math.round((b.n / data.ordersInRange.length) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="cs-t11 text-stone-400">
              A bigger average order usually comes from bundling well or pointing shoppers toward higher-value listings — worth a look if most orders land in the smallest bucket.
            </p>
          </div>
        )}

        {kind === "bestseller" && (
          <div className="space-y-4">
            {data.bestSellers.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No completed sales in this range yet.</p>
            ) : (
              <div className="space-y-2">
                {data.bestSellers.map((p, i) => (
                  <div key={p.key || p.name + i} className="flex items-center justify-between text-sm border-b border-stone-50 pb-2">
                    <span className="flex items-center gap-2 flex-1 truncate">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${i === 0 ? "bg-amber-500" : "bg-stone-300"}`}>
                        {i + 1}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="cs-t11 font-mono text-stone-600 shrink-0">
                      {p.qty} sold · {formatMoney(p.revenue)} · {data.totalRevenue ? Math.round((p.revenue / data.totalRevenue) * 100) : 0}% of revenue
                    </span>
                  </div>
                ))}
              </div>
            )}
            {data.lowStockAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={13} /> Restock watch
                </p>
                <div className="space-y-1">
                  {data.lowStockAlerts.map((it) => (
                    <p key={it.id} className="text-xs text-amber-900">
                      {it.name}: <span className="font-bold">{it.qty}</span> {it.unit || ""} left (threshold {it.lowStockThreshold})
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Filters a pre-generated demo analytics-events pool down to a type list +
// date window — the demo-mode stand-in for fetchAnalyticsEvents, used by
// every panel/modal below that would otherwise hit the network.
function filterDemoEvents(events, types, sinceMs, untilMs) {
  const until = untilMs || Infinity;
  return events.filter((e) => types.includes(e.event_type) && new Date(e.created_at).getTime() >= sinceMs && new Date(e.created_at).getTime() <= until);
}

// Builds one complete, self-contained example vendor dataset — the exact
// same object shapes real vendor data uses everywhere in VendorDashboard —
// so anyone browsing without a storefront yet sees the *real* Premium
// dashboard experience, fully interactive, with realistic (fake) numbers
// instead of a locked "no storefront" empty state. Pure client-side, no
// network calls; regenerated fresh each time this dashboard mounts.
// Shapes a day's activity level across the demo shop's whole history: a
// gentle rise through the "old" era, then a steep power-curve acceleration
// across the final 5 months so the most recent stretch clearly dwarfs the
// historical baseline (used to drive "Aug 2026 is the best month ever").
function growthMultiplier(daysAgo, spanDays) {
  const monthsAgo = daysAgo / 30;
  if (monthsAgo >= 5) {
    const t = 1 - Math.min(1, Math.max(0, (monthsAgo - 5) / (spanDays / 30 - 5)));
    return 0.3 + 0.35 * t;
  }
  const t = 1 - monthsAgo / 5;
  return 0.65 + 2.85 * Math.pow(Math.max(0, t), 1.7);
}
// Poisson-like day-count generator: random count centered on `lambda` with
// spread proportional to sqrt(lambda) — behaves like Bernoulli trials at low
// rates but keeps scaling cleanly at the higher rates the growth curve above
// produces near "today", where a coin-flip-per-day model would cap out.
function poissonish(lambda) {
  const spread = Math.sqrt(Math.max(lambda, 0.3));
  return Math.max(0, Math.round(lambda + (Math.random() - 0.5) * 2 * spread));
}
// Shopper activity isn't spread evenly across the clock — quiet overnight,
// warming up through the morning, peaking in the early afternoon, cooling
// back off through the evening into the next quiet stretch. Feeds directly
// into the peak-activity heatmap: without this, event timestamps land
// uniformly across all 24 hours and every hour looks about the same.
const HOUR_WEIGHTS = [
  0.1, 0.08, 0.06, 0.05, 0.05, 0.07, 0.12, 0.22, 0.38, 0.58, 0.78, 0.95,
  1.1, 1.2, 1.25, 1.2, 1.1, 0.95, 0.78, 0.58, 0.4, 0.28, 0.18, 0.13,
];
const HOUR_WEIGHT_TOTAL = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
function timeOfDayMs(dayStartMs) {
  let r = Math.random() * HOUR_WEIGHT_TOTAL;
  let h = 0;
  for (; h < 23; h++) {
    if (r < HOUR_WEIGHTS[h]) break;
    r -= HOUR_WEIGHTS[h];
  }
  return dayStartMs + h * 3600000 + Math.random() * 3600000;
}
function buildDemoDashboardData() {
  const DAY = 86400000;
  const now = Date.now();
  const spanDays = 730; // 2 years, so the "All" range has real depth
  const createdAt = now - spanDays * DAY;
  const shop = { id: "demo-preview-shop", name: "Sunny Acres Farm", ownerId: "demo-preview-owner", createdAt };

  const productDefs = [
    { name: "Heirloom Tomatoes", price: 4.5, unit: "lb" },
    { name: "Farm Fresh Eggs", price: 6, unit: "dozen" },
    { name: "Wildflower Honey", price: 9, unit: "jar" },
    { name: "Sweet Corn", price: 5, unit: "dozen" },
    { name: "Strawberry Jam", price: 7, unit: "jar" },
    { name: "Baby Spinach", price: 3.5, unit: "bag" },
  ];
  const products = productDefs.map((p, i) => ({ id: `demo-product-${i}`, shopId: shop.id, name: p.name, price: p.price, unit: p.unit, favoriteCount: 0, shareCount: 0 }));
  const pickProduct = () => products[Math.floor(Math.random() * products.length)];
  const CITIES = [
    ["Asheville", "NC"], ["Portland", "OR"], ["Austin", "TX"], ["Boulder", "CO"],
    ["Burlington", "VT"], ["Ann Arbor", "MI"], ["Santa Fe", "NM"], ["Chapel Hill", "NC"],
  ];
  const pickCity = () => CITIES[Math.floor(Math.random() * CITIES.length)];
  const shoppers = Array.from({ length: 480 }, (_, i) => `demo-shopper-${i}`);
  const pickShopper = () => shoppers[Math.floor(Math.random() * shoppers.length)];
  const repeatCustomers = shoppers.slice(0, 160);

  const events = [];
  const pushEvent = (type, ts, extra = {}) => {
    const [city, state] = pickCity();
    events.push({
      event_type: type,
      entity_id: extra.entity_id || null,
      entity_name: extra.entity_name || null,
      shop_id: shop.id,
      actor_id: extra.actor_id || pickShopper(),
      city,
      state,
      meta: extra.meta || null,
      created_at: new Date(ts).toISOString(),
    });
  };

  const orders = [];
  const usedCustomers = new Set();

  // Base + growth-scaled daily rates for each event type, solved so that
  // (a) lifetime totals land around 3x the flat/linear-growth model this
  // replaced, and (b) the steep last-5-months acceleration in
  // growthMultiplier makes recent activity clearly the strongest the shop
  // has ever seen. Order rate is tuned against an empirical ~$23.7 average
  // order value so lifetime revenue lands on target too.
  const RATES = {
    views: { min: 5.19, scale: 33.21 },
    favorites: { min: 0.076, scale: 0.786 },
    shares: { min: 0.009, scale: 0.206 },
    messages: { min: 0.083, scale: 0.372 },
    orders: { min: 0.359, scale: 1.59 },
  };

  const makeOrder = (dayStart) => {
    const isRepeat = usedCustomers.size > 20 && Math.random() < 0.42;
    const customerId = isRepeat ? repeatCustomers[Math.floor(Math.random() * repeatCustomers.length)] : `demo-customer-${usedCustomers.size}`;
    usedCustomers.add(customerId);
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items = Array.from({ length: itemCount }, () => {
      const p = pickProduct();
      const qty = 1 + Math.floor(Math.random() * 3);
      return { id: uid("oi"), inventoryItemId: null, productId: p.id, name: p.name, qty, unit: p.unit, price: p.price };
    });
    const pickupMs = dayStart + Math.random() * DAY;
    return {
      id: uid("order"),
      customerName: isRepeat ? `Returning shopper ${customerId.slice(-2)}` : `New shopper ${customerId.slice(-2)}`,
      customerUserId: customerId,
      items,
      pickupDate: dateToYmd(new Date(pickupMs)),
      pickupTime: "10:00",
      pickupLocation: "Farmers market booth",
      notes: "",
      completed: true,
      completedAt: pickupMs,
      archived: false,
      calendarEventId: null,
      createdAt: pickupMs - 3600000,
    };
  };

  for (let d = 0; d < spanDays; d++) {
    const dayStart = createdAt + d * DAY;
    const daysAgo = spanDays - 1 - d;
    const m = growthMultiplier(daysAgo, spanDays);
    const dow = new Date(dayStart).getDay();
    const marketDay = dow === 0 || dow === 6 ? 1.6 : 1; // weekend farmers-market bump

    const viewsToday = poissonish((RATES.views.min + RATES.views.scale * m) * marketDay);
    for (let i = 0; i < viewsToday; i++) {
      const t = timeOfDayMs(dayStart);
      if (Math.random() < 0.62) {
        const p = pickProduct();
        pushEvent("view_product", t, { entity_id: p.id, entity_name: p.name });
      } else {
        pushEvent("view_shop", t);
      }
    }
    const favToday = poissonish((RATES.favorites.min + RATES.favorites.scale * m) * marketDay);
    for (let i = 0; i < favToday; i++) {
      const p = pickProduct();
      p.favoriteCount += 1;
      pushEvent("favorite", timeOfDayMs(dayStart), { entity_id: p.id, entity_name: p.name, meta: { kind: "product" } });
    }
    const shareToday = poissonish((RATES.shares.min + RATES.shares.scale * m) * marketDay);
    for (let i = 0; i < shareToday; i++) {
      const p = pickProduct();
      p.shareCount += 1;
      pushEvent("share", timeOfDayMs(dayStart), { entity_id: p.id, entity_name: p.name, meta: { kind: "product" } });
    }
    const msgToday = poissonish((RATES.messages.min + RATES.messages.scale * m) * marketDay);
    for (let i = 0; i < msgToday; i++) pushEvent("message", timeOfDayMs(dayStart));

    const ordersToday = poissonish((RATES.orders.min + RATES.orders.scale * m) * marketDay);
    for (let o = 0; o < ordersToday; o++) orders.push(makeOrder(dayStart));
  }

  const reviewBodies = [
    "Fresh produce every single week, you can really taste the difference.",
    "Friendly and quick pickup, the tomatoes were amazing this year.",
    "Best honey I have found locally, will definitely order again.",
    "Great quality and fair prices, highly recommend this farm.",
    "Eggs are always fresh, the whole family loves them.",
    "Wonderful communication and the produce arrived in perfect condition.",
    "Consistent quality every time, this is our go-to farm stand now.",
    "The strawberry jam is incredible, tastes homemade and fresh.",
    "Corn was sweet and fresh, kids ask for it every week.",
    "Excellent service, fresh ingredients, and a genuinely friendly farm.",
  ];
  const reviewNames = ["Casey R.", "Morgan T.", "Jordan P.", "Alex M.", "Taylor B.", "Riley S.", "Jamie L.", "Drew K.", "Avery N.", "Quinn D.", "Sydney F.", "Reese H."];
  const reviews = Array.from({ length: 74 }, (_, i) => {
    const rating = Math.random() < 0.72 ? 5 : Math.random() < 0.85 ? 4 : 3;
    return {
      id: `demo-review-${i}`,
      authorName: reviewNames[i % reviewNames.length],
      rating,
      body: reviewBodies[i % reviewBodies.length],
      createdAt: createdAt + Math.random() * spanDays * DAY,
      status: "published",
      screenedClear: true,
      helpful: Math.round(Math.random() * 60),
    };
  }).sort((a, b) => a.createdAt - b.createdAt);
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  const inventory = [
    { id: "demo-inv-0", name: "Heirloom Tomatoes", qty: 34, unit: "lb", lowStockThreshold: 10, linkedProductId: products[0].id },
    { id: "demo-inv-1", name: "Farm Fresh Eggs", qty: 18, unit: "dozen", lowStockThreshold: 6, linkedProductId: products[1].id },
    { id: "demo-inv-2", name: "Wildflower Honey", qty: 3, unit: "jar", lowStockThreshold: 5, linkedProductId: products[2].id },
    { id: "demo-inv-3", name: "Sweet Corn", qty: 40, unit: "dozen", lowStockThreshold: 12, linkedProductId: products[3].id },
  ];

  // Spend climbs sharply for the most recent campaigns — the "decided to
  // put real money behind ads these last couple months" story — while the
  // older ones stay modest test-the-waters amounts.
  const campaigns = [
    { id: "demo-camp-0", shopId: shop.id, productId: products[0].id, objective: "reach", rateId: "week", days: 7, amount: 60, tagline: "Peak-season tomatoes", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 3 * DAY, endsAt: now + 4 * DAY, createdAt: now - 3 * DAY },
    { id: "demo-camp-1", shopId: shop.id, productId: products[2].id, objective: "sales", rateId: "week", days: 7, amount: 45, tagline: "Local honey harvest", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 20 * DAY, endsAt: now - 13 * DAY, createdAt: now - 20 * DAY },
    { id: "demo-camp-2", shopId: shop.id, productId: products[3].id, objective: "reach", rateId: "week", days: 7, amount: 35, tagline: "Sweet corn season", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 50 * DAY, endsAt: now - 43 * DAY, createdAt: now - 50 * DAY },
    { id: "demo-camp-3", shopId: shop.id, productId: products[0].id, objective: "sales", rateId: "week", days: 7, amount: 15, tagline: "Tomato relaunch", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 85 * DAY, endsAt: now - 78 * DAY, createdAt: now - 85 * DAY },
    { id: "demo-camp-4", shopId: shop.id, productId: products[4].id, objective: "reach", rateId: "week", days: 7, amount: 15, tagline: "Strawberry jam push", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 125 * DAY, endsAt: now - 118 * DAY, createdAt: now - 125 * DAY },
    { id: "demo-camp-5", shopId: shop.id, productId: products[1].id, objective: "sales", rateId: "week", days: 7, amount: 15, tagline: "Fresh eggs feature", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 195 * DAY, endsAt: now - 188 * DAY, createdAt: now - 195 * DAY },
    { id: "demo-camp-6", shopId: shop.id, productId: products[3].id, objective: "reach", rateId: "week", days: 7, amount: 12, tagline: "Corn comeback", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 330 * DAY, endsAt: now - 323 * DAY, createdAt: now - 330 * DAY },
    { id: "demo-camp-7", shopId: shop.id, productId: products[2].id, objective: "sales", rateId: "week", days: 7, amount: 12, tagline: "Honey harvest replay", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 480 * DAY, endsAt: now - 473 * DAY, createdAt: now - 480 * DAY },
    { id: "demo-camp-8", shopId: shop.id, productId: products[0].id, objective: "reach", rateId: "week", days: 7, amount: 10, tagline: "Season opener", cardLast4: "", paymentType: "card", status: "active", startedAt: now - 630 * DAY, endsAt: now - 623 * DAY, createdAt: now - 630 * DAY },
  ];

  // --- Sponsored-click shape: "rocket up, then drop off immediately" —
  // clicks launch to a peak almost the instant a campaign starts, hold
  // near that peak while it's running, then fall off a cliff right after
  // it ends, settling at a new floor that's HIGHER than before it ran
  // (some of the interest sticks) — never back to zero. Each product's
  // floor only ratchets up across its own campaign history, and — matching
  // "decided to spend a lot more these last couple months" — both the $
  // amount above and a recency multiplier here make the last few campaigns
  // land dramatically bigger peaks than the older ones.
  const productClickFloor = {};
  const campaignsByStart = [...campaigns].sort((a, b) => a.startedAt - b.startedAt);
  campaignsByStart.forEach((c, idx) => {
    const nextSameProduct = campaignsByStart.slice(idx + 1).find((n) => n.productId === c.productId);
    const attributionEnd = Math.min(nextSameProduct ? nextSameProduct.startedAt : now, now);
    const priorFloor = productClickFloor[c.productId] || 0.3;
    const recency = clamp(1 - (now - c.startedAt) / (150 * DAY), 0, 1); // ~0 beyond 150 days ago, 1 right now
    const basePeak = 4 + (c.amount / 15) * 3;
    const peak = basePeak * (1 + recency * 2.5);
    // Launch to peak in a single day — the "rocket" — instead of a
    // multi-day climb, so the spend's effect reads as immediate.
    const rampDays = 1;
    const holdEnd = Math.min(c.endsAt, now);
    // Decay collapses in about 2 days flat, well inside the ~3+ week gap
    // between consecutive campaigns, so clicks visibly crash back down
    // right after the campaign ends and sit flat and low well before the
    // NEXT campaign's spend is what makes them spike again — a cliff, not
    // a fade.
    const decayDays = 2;
    const newFloor = Math.max(priorFloor, peak * 0.08);
    const product = products.find((p) => p.id === c.productId);
    for (let t = c.startedAt; t < attributionEnd; t += DAY) {
      let rate;
      if (t < c.startedAt + rampDays * DAY) {
        rate = priorFloor + (peak - priorFloor) * ((t - c.startedAt) / (rampDays * DAY));
      } else if (t <= holdEnd) {
        rate = peak;
      } else if (t <= holdEnd + decayDays * DAY) {
        rate = newFloor + (peak - newFloor) * Math.exp(-5 * ((t - holdEnd) / (decayDays * DAY)));
      } else {
        rate = newFloor;
      }
      const n = poissonish(rate);
      for (let i = 0; i < n; i++) {
        pushEvent("view_product", timeOfDayMs(t), { entity_id: product.id, entity_name: product.name });
      }
    }
    productClickFloor[c.productId] = newFloor;
  });

  // --- Safety net: guarantee the most recent 30 days reads as the strongest
  // month ever, in every category, rather than trusting the random curve
  // alone — low-volume categories like shares are noisy enough at this
  // scale that pure chance can't be relied on to always land that way. ---
  function windowTotal(list, from, to, getTime) {
    return list.filter((x) => { const t = getTime(x); return t >= from && t < to; }).length;
  }
  function bestPriorMonthTotal(list, getTime) {
    let best = 0;
    for (let start = createdAt; start < now - 30 * DAY; start += 30 * DAY) {
      const total = windowTotal(list, start, start + 30 * DAY, getTime);
      if (total > best) best = total;
    }
    return best;
  }
  const evTime = (e) => new Date(e.created_at).getTime();
  const topUpEvents = (type, isProductScoped) => {
    const list = events.filter((e) => e.event_type === type);
    const finalTotal = windowTotal(list, now - 30 * DAY, now, evTime);
    const priorBest = bestPriorMonthTotal(list, evTime);
    const targetFinal = Math.ceil(priorBest * 1.25) + 3;
    for (let i = finalTotal; i < targetFinal; i++) {
      const p = pickProduct();
      if (type === "favorite") p.favoriteCount += 1;
      if (type === "share") p.shareCount += 1;
      const extra = isProductScoped ? { entity_id: p.id, entity_name: p.name, meta: type === "favorite" || type === "share" ? { kind: "product" } : undefined } : {};
      pushEvent(type, timeOfDayMs(now - Math.floor(Math.random() * 9) * DAY - DAY), extra);
    }
  };
  topUpEvents("view_shop", false);
  topUpEvents("view_product", true);
  topUpEvents("favorite", true);
  topUpEvents("share", true);
  topUpEvents("message", false);

  const finalOrdersTotal = windowTotal(orders, now - 30 * DAY, now, (o) => o.completedAt);
  const priorBestOrders = bestPriorMonthTotal(orders, (o) => o.completedAt);
  const targetFinalOrders = Math.ceil(priorBestOrders * 1.25) + 2;
  for (let i = finalOrdersTotal; i < targetFinalOrders; i++) {
    orders.push(makeOrder(now - Math.random() * 9 * DAY));
  }

  return { shop, products, events, orders, reviews, avgRating, inventory, campaigns };
}
function VendorDashboard({ navigate }) {
  const { me, shopsById, shops, products, conversations, showToast, sponsorships } = useApp();
  const realShop = me?.shopId ? shopsById[me.shopId] : null;
  // Anyone browsing without a real storefront yet sees a fully-populated
  // example dashboard instead of a locked empty state — see
  // buildDemoDashboardData above. Built once per mount (it uses Math.random,
  // so recomputing it on every render would make every chart/card jitter).
  const isDemo = !realShop;
  const demo = useMemo(() => (isDemo ? buildDemoDashboardData() : null), [isDemo]);
  const shop = realShop || demo?.shop;
  const { reviews: shopReviewsReal, avgRating: avgRatingReal, count: countReal } = useReviews("shop", realShop?.id || "none");
  const shopReviews = isDemo ? demo.reviews : shopReviewsReal;
  const avgRating = isDemo ? demo.avgRating : avgRatingReal;
  const count = isDemo ? demo.reviews.length : countReal;
  const premium = isPremiumPlan(me);
  const mailing = useMailingList(realShop?.ownerId || null);
  const shopOrdersReal = useOrders(realShop?.id || null);
  const shopOrders = isDemo ? { ...shopOrdersReal, orders: demo.orders } : shopOrdersReal;
  const inventoryReal = useInventory(realShop?.id || null);
  const inventory = isDemo ? { ...inventoryReal, items: demo.inventory } : inventoryReal;

  // Which KPI/sales card's drill-down modal is currently open, if any — see
  // MetricDetailModal above. Every card on this dashboard is clickable now;
  // this is the single piece of state that drives all of them.
  const [detailKind, setDetailKind] = useState(null);

  // A vendor-set monthly revenue goal, persisted per-shop in the private kv
  // table (same pattern as inventory) — purely local to this dashboard,
  // nothing else in the app reads or writes it.
  const [monthlyGoal, setMonthlyGoal] = useState(null);
  const [goalDraft, setGoalDraft] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);

  const [rangeId, setRangeId] = useState("days");
  const range = DASHBOARD_RANGES.find((r) => r.id === rangeId) || DASHBOARD_RANGES[1];
  const [lookupTerm, setLookupTerm] = useState("");

  const [rangeEvents, setRangeEvents] = useState({ shop: [], signups: [], searches: [] });
  const [digestEvents, setDigestEvents] = useState([]);
  const [respLoading, setRespLoading] = useState(true);
  const [avgResponseMin, setAvgResponseMin] = useState(null);

  // Per-panel period tabs (Peak activity, Views over time, Sales over time) —
  // independent of the global range selector above. "current" reuses data
  // already fetched for the global range; any other id fetches its own
  // bounded window on demand (sales doesn't need a fetch — orders are
  // already loaded all-time via useOrders).
  const [heatmapPeriod, setHeatmapPeriod] = useState("current");
  const [heatmapCustomEvents, setHeatmapCustomEvents] = useState([]);
  const [viewsPeriod, setViewsPeriod] = useState("current");
  const [viewsCustomEvents, setViewsCustomEvents] = useState([]);
  const [favoritesPeriod, setFavoritesPeriod] = useState("current");
  const [favoritesCustomEvents, setFavoritesCustomEvents] = useState([]);
  const [salesPeriod, setSalesPeriod] = useState("current");
  const [weekdayPeriod, setWeekdayPeriod] = useState("current");
  // Granularity toggle + fetched click events for the "Sponsored ads:
  // clicks & spend" panel — see the sponsoredClicks memos below.
  const [adPeriod, setAdPeriod] = useState("current");
  const [sponsoredClickEvents, setSponsoredClickEvents] = useState([]);

  const nowMs = Date.now();
  const sinceMs = nowMs - range.ms;
  // Shared month-picker options for every chart's period control below —
  // spans from this shop's first day to the current month.
  const monthOptions = monthOptionsSince(shop?.createdAt, nowMs);

  useEffect(() => {
    if (!shop) return;
    let cancelled = false;
    Promise.all([
      isDemo
        ? Promise.resolve(filterDemoEvents(demo.events, ["view_shop", "view_product", "favorite", "share", "message"], sinceMs, nowMs))
        : fetchAnalyticsEvents({ types: ["view_shop", "view_product", "favorite", "share", "message"], shopId: shop.id, sinceMs }),
      fetchAnalyticsEvents({ types: ["signup"], sinceMs }),
      fetchAnalyticsEvents({ types: ["search"], sinceMs }),
    ]).then(([shopEv, su, sr]) => {
      if (!cancelled) setRangeEvents({ shop: shopEv, signups: su, searches: sr });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, rangeId, isDemo]);

  // A fixed trailing-35-day window, independent of the range selector above,
  // so the weekly digest always has the prior-week data it needs.
  useEffect(() => {
    if (!shop) return;
    let cancelled = false;
    const req35 = isDemo
      ? Promise.resolve(filterDemoEvents(demo.events, ["view_shop", "view_product", "favorite", "share", "message"], nowMs - 35 * 86400000, nowMs))
      : fetchAnalyticsEvents({ types: ["view_shop", "view_product", "favorite", "share", "message"], shopId: shop.id, sinceMs: nowMs - 35 * 86400000 });
    req35.then((ev) => {
      if (!cancelled) setDigestEvents(ev);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, isDemo]);

  // Fetches the heatmap's own view events whenever its period tab is set to
  // something other than "current" — the globally-fetched rangeEvents above
  // only cover the top range selector's window, so a "Last month" tap here
  // needs its own request.
  useEffect(() => {
    if (!shop || heatmapPeriod === "current") return;
    const win = panelPeriodWindow(heatmapPeriod, nowMs, shop?.createdAt);
    if (!win) return;
    let cancelled = false;
    const reqHeat = isDemo
      ? Promise.resolve(filterDemoEvents(demo.events, ["view_shop", "view_product"], win.sinceMs, win.untilMs))
      : fetchAnalyticsEvents({ types: ["view_shop", "view_product"], shopId: shop.id, sinceMs: win.sinceMs, untilMs: win.untilMs });
    reqHeat.then((ev) => {
      if (!cancelled) setHeatmapCustomEvents(ev);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, heatmapPeriod, isDemo]);

  // Same idea for the "Views over time" chart's own period tab.
  useEffect(() => {
    if (!shop || viewsPeriod === "current") return;
    const win = panelPeriodWindow(viewsPeriod, nowMs, shop?.createdAt);
    if (!win) return;
    let cancelled = false;
    const reqViews = isDemo
      ? Promise.resolve(filterDemoEvents(demo.events, ["view_shop", "view_product"], win.sinceMs, win.untilMs))
      : fetchAnalyticsEvents({ types: ["view_shop", "view_product"], shopId: shop.id, sinceMs: win.sinceMs, untilMs: win.untilMs });
    reqViews.then((ev) => {
      if (!cancelled) setViewsCustomEvents(ev);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, viewsPeriod, isDemo]);

  // Same idea again for the "Favorites over time" chart's own period tab.
  useEffect(() => {
    if (!shop || favoritesPeriod === "current") return;
    const win = panelPeriodWindow(favoritesPeriod, nowMs, shop?.createdAt);
    if (!win) return;
    let cancelled = false;
    const reqFav = isDemo
      ? Promise.resolve(filterDemoEvents(demo.events, ["favorite"], win.sinceMs, win.untilMs))
      : fetchAnalyticsEvents({ types: ["favorite"], shopId: shop.id, sinceMs: win.sinceMs, untilMs: win.untilMs });
    reqFav.then((ev) => {
      if (!cancelled) setFavoritesCustomEvents(ev);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, favoritesPeriod, isDemo]);

  // Real average first-response time, from the vendor's own most recent
  // conversation threads (bounded to 10 so this stays cheap).
  useEffect(() => {
    if (isDemo) {
      setAvgResponseMin(14);
      setRespLoading(false);
      return;
    }
    if (!shop || !me) {
      setRespLoading(false);
      return;
    }
    let cancelled = false;
    setRespLoading(true);
    (async () => {
      const recent = (conversations || []).slice(0, 10);
      const gaps = [];
      for (const c of recent) {
        const res = await readJSON(`messages:${c.id}`, true, []);
        const list = res.ok && Array.isArray(res.value) ? res.value : [];
        const firstIn = list.find((m) => m.senderId !== me.id);
        if (!firstIn) continue;
        const firstOut = list.find((m) => m.senderId === me.id && m.createdAt >= firstIn.createdAt);
        if (firstOut) gaps.push((firstOut.createdAt - firstIn.createdAt) / 60000);
      }
      if (!cancelled) {
        setAvgResponseMin(gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null);
        setRespLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, conversations?.length, isDemo]);

  useEffect(() => {
    if (!shop) return;
    if (isDemo) {
      setMonthlyGoal(6000);
      setGoalDraft("6000");
      return;
    }
    let cancelled = false;
    getJSON(`shopGoal:${shop.id}`, false, {}).then((g) => {
      if (cancelled) return;
      setMonthlyGoal(g?.monthlyGoal ?? null);
      setGoalDraft(g?.monthlyGoal ? String(g.monthlyGoal) : "");
    });
    return () => {
      cancelled = true;
    };
  }, [shop?.id, isDemo]);

  const saveGoal = async () => {
    const val = Number(goalDraft);
    if (!val || val <= 0) {
      showToast?.("Enter a goal greater than $0");
      return;
    }
    if (isDemo) {
      setMonthlyGoal(val);
      setEditingGoal(false);
      showToast?.("Preview goal updated — start selling to set a real one");
      return;
    }
    await setJSON(`shopGoal:${shop.id}`, { monthlyGoal: val }, false, { verify: true });
    setMonthlyGoal(val);
    setEditingGoal(false);
    showToast?.("Monthly goal saved");
  };

  const shopProducts = useMemo(() => (isDemo ? demo.products : shop ? products.filter((p) => p.shopId === shop.id) : []), [products, shop, isDemo, demo]);

  const viewEvents = useMemo(() => rangeEvents.shop.filter((e) => e.event_type === "view_shop" || e.event_type === "view_product"), [rangeEvents]);
  const favoriteEvents = useMemo(() => rangeEvents.shop.filter((e) => e.event_type === "favorite"), [rangeEvents]);
  const shareEvents = useMemo(() => rangeEvents.shop.filter((e) => e.event_type === "share"), [rangeEvents]);
  const messageEvents = useMemo(() => rangeEvents.shop.filter((e) => e.event_type === "message"), [rangeEvents]);

  const midpoint = sinceMs + range.ms / 2;
  const pctChange = (events) => {
    const first = events.filter((e) => new Date(e.created_at).getTime() < midpoint).length;
    const second = events.length - first;
    if (!first) return second > 0 ? 100 : null;
    return Math.round(((second - first) / first) * 100);
  };
  const viewsDelta = pctChange(viewEvents);
  const favoritesDelta = pctChange(favoriteEvents);
  const messagesDelta = pctChange(messageEvents);

  const viewSeries = useMemo(() => bucketSeries(viewEvents, range.granularity, sinceMs, nowMs), [viewEvents, range, sinceMs, nowMs]);
  const favoriteSeries = useMemo(() => bucketSeries(favoriteEvents, range.granularity, sinceMs, nowMs), [favoriteEvents, range, sinceMs, nowMs]);
  // "Views over time" chart's own series — either the global-range one above
  // ("current") or one bucketed over its own fetched period window.
  const viewsSeries2 = useMemo(() => {
    if (viewsPeriod === "current") return viewSeries;
    const win = panelPeriodWindow(viewsPeriod, nowMs, shop?.createdAt);
    if (!win) return viewSeries;
    return bucketSeries(viewsCustomEvents, win.granularity, win.sinceMs, win.untilMs);
  }, [viewsPeriod, viewSeries, viewsCustomEvents, nowMs]);
  // Same idea for "Favorites over time".
  const favoriteSeries2 = useMemo(() => {
    if (favoritesPeriod === "current") return favoriteSeries;
    const win = panelPeriodWindow(favoritesPeriod, nowMs, shop?.createdAt);
    if (!win) return favoriteSeries;
    return bucketSeries(favoritesCustomEvents, win.granularity, win.sinceMs, win.untilMs);
  }, [favoritesPeriod, favoriteSeries, favoritesCustomEvents, nowMs]);

  const trendingSearches = useMemo(() => {
    const counts = new Map();
    rangeEvents.searches.forEach((e) => {
      if (!e.entity_id) return;
      counts.set(e.entity_id, (counts.get(e.entity_id) || 0) + 1);
    });
    return [...counts.entries()].map(([term, n]) => ({ term, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  }, [rangeEvents.searches]);

  const lookupCount = useMemo(() => {
    const term = lookupTerm.trim().toLowerCase();
    if (!term) return null;
    return rangeEvents.searches.filter((e) => e.entity_id === term).length;
  }, [lookupTerm, rangeEvents.searches]);

  const usersByState = useMemo(() => {
    const counts = new Map();
    rangeEvents.signups.forEach((e) => {
      const s = e.state || "Unknown";
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return [...counts.entries()].map(([state, n]) => ({ state, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  }, [rangeEvents.signups]);

  const newShopsByState = useMemo(() => {
    const counts = new Map();
    (shops || []).forEach((s) => {
      if ((s.createdAt || 0) >= sinceMs) counts.set(s.state || "Unknown", (counts.get(s.state || "Unknown") || 0) + 1);
    });
    return [...counts.entries()].map(([state, n]) => ({ state, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  }, [shops, sinceMs]);

  const funnel = useMemo(() => {
    const v = viewEvents.length;
    const f = favoriteEvents.length;
    const m = messageEvents.length;
    return [
      { label: "Views", value: v, pct: 100 },
      { label: "Favorites", value: f, pct: v ? Math.round((f / v) * 100) : 0 },
      { label: "Messages", value: m, pct: v ? Math.round((m / v) * 100) : 0 },
    ];
  }, [viewEvents, favoriteEvents, messageEvents]);

  const repeatStats = useMemo(() => {
    const byActor = new Map();
    viewEvents.forEach((e) => {
      if (!e.actor_id) return;
      if (!byActor.has(e.actor_id)) byActor.set(e.actor_id, new Set());
      byActor.get(e.actor_id).add(dayKey(new Date(e.created_at).getTime()));
    });
    const total = byActor.size;
    const repeatDaySets = [...byActor.values()].filter((days) => days.size > 1);
    const repeat = repeatDaySets.length;
    const avgVisitsPerRepeat = repeat ? Math.round((repeatDaySets.reduce((sum, days) => sum + days.size, 0) / repeat) * 10) / 10 : 0;
    return { total, repeat, pct: total ? Math.round((repeat / total) * 100) : 0, avgVisitsPerRepeat };
  }, [viewEvents]);

  // Product-level attribution for views/favorites/shares — the same
  // analytics_events rows already fetched above, just grouped by entity_id
  // instead of only counted, so a click on any of these three KPI cards can
  // show exactly which listings are driving the number.
  const productViewEvents = useMemo(() => viewEvents.filter((e) => e.event_type === "view_product"), [viewEvents]);
  const shopPageViews = useMemo(() => viewEvents.filter((e) => e.event_type === "view_shop").length, [viewEvents]);
  const viewsByProduct = useMemo(() => groupEventsByEntity(productViewEvents, shopProducts), [productViewEvents, shopProducts]);
  const favoritesByProduct = useMemo(
    () => groupEventsByEntity(favoriteEvents.filter((e) => e.meta?.kind === "product"), shopProducts),
    [favoriteEvents, shopProducts]
  );
  const sharesByProduct = useMemo(
    () => groupEventsByEntity(shareEvents.filter((e) => e.meta?.kind === "product"), shopProducts),
    [shareEvents, shopProducts]
  );
  const messageSeries = useMemo(() => bucketSeries(messageEvents, range.granularity, sinceMs, nowMs), [messageEvents, range, sinceMs, nowMs]);
  const shareSeries = useMemo(() => bucketSeries(shareEvents, range.granularity, sinceMs, nowMs), [shareEvents, range, sinceMs, nowMs]);

  // Peak-activity heatmap's own source events — either the global-range view
  // events above ("current") or its own fetched period window.
  const heatmapEventsSource = heatmapPeriod === "current" ? viewEvents : heatmapCustomEvents;
  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    heatmapEventsSource.forEach((e) => {
      const d = new Date(e.created_at);
      grid[d.getDay()][d.getHours()] += 1;
    });
    return grid;
  }, [heatmapEventsSource]);
  // Turns the raw 7x24 grid into the actual story: a percentile rank per
  // cell — computed among the NONZERO cells only, so a true dead hour still
  // reads as flat gray while every cell that saw any activity gets spread
  // across the full cold-to-hot color range, however lopsided the week
  // actually is — plus the single busiest/quietest hours in plain language
  // and a headline stat, so this panel answers "why does this matter" and
  // "what do I do about it" instead of just showing a colored grid.
  const heatmapInsights = useMemo(() => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const formatHour = (h) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);
    const cells = [];
    heatmap.forEach((row, d) => row.forEach((v, h) => cells.push({ d, h, v })));
    const total = cells.reduce((s, c) => s + c.v, 0);
    const mean = total / cells.length;
    const nonZero = cells.filter((c) => c.v > 0).sort((a, b) => a.v - b.v);
    const rankOf = new Map();
    nonZero.forEach((c, i) => rankOf.set(`${c.d}-${c.h}`, nonZero.length > 1 ? i / (nonZero.length - 1) : 1));
    const percentile = (d, h) => rankOf.get(`${d}-${h}`) ?? 0;
    const peak = nonZero.length ? nonZero[nonZero.length - 1] : null;
    const eveningTotal = cells.filter((c) => c.h >= 17 && c.h <= 21).reduce((s, c) => s + c.v, 0);
    const eveningShare = total > 0 ? Math.round((eveningTotal / total) * 100) : 0;
    return {
      percentile,
      peakCell: peak,
      peakLabel: peak ? `${dayNames[peak.d]} ${formatHour(peak.h)}` : null,
      peakMultiple: peak && mean > 0 ? peak.v / mean : null,
      eveningShare,
    };
  }, [heatmap]);

  const platformAvgRating = useMemo(() => {
    const rated = (shops || []).filter((s) => s.id !== shop?.id && s.reviewCount > 0);
    if (!rated.length) return null;
    return rated.reduce((sum, s) => sum + s.avgRating, 0) / rated.length;
  }, [shops, shop]);

  const leaderboard = useMemo(() => {
    const scored = shopProducts.map((p) => ({ ...p, score: (p.favoriteCount || 0) * 2 + (p.shareCount || 0) }));
    const sorted = [...scored].sort((a, b) => b.score - a.score);
    return { top: sorted.slice(0, 5), bottom: sorted.slice(-5).reverse() };
  }, [shopProducts]);

  const publishedReviews = useMemo(() => shopReviews.filter((r) => r.status === "published"), [shopReviews]);
  const ratingDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 -> 1 star ... index 4 -> 5 star
    publishedReviews.forEach((r) => {
      const i = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
      counts[i] += 1;
    });
    return [5, 4, 3, 2, 1].map((star) => ({ star, n: counts[star - 1] }));
  }, [publishedReviews]);
  const recentReviews = useMemo(() => [...publishedReviews].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5), [publishedReviews]);
  const sentimentSeries = useMemo(() => {
    const sorted = [...publishedReviews].sort((a, b) => a.createdAt - b.createdAt);
    let runningSum = 0;
    return sorted.map((r, i) => {
      runningSum += r.rating;
      return { key: r.id, label: new Date(r.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }), rolling: +(runningSum / (i + 1)).toFixed(2) };
    });
  }, [publishedReviews]);
  const reviewWordCloud = useMemo(() => {
    const counts = new Map();
    publishedReviews.forEach((r) => {
      (r.body || "").toLowerCase().match(/[a-z']+/g)?.forEach((w) => {
        if (w.length < 4 || DASH_STOPWORDS.has(w)) return;
        counts.set(w, (counts.get(w) || 0) + 1);
      });
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [publishedReviews]);

  const topCities = useMemo(() => {
    const counts = new Map();
    [...viewEvents, ...favoriteEvents].forEach((e) => {
      if (!e.city) return;
      const key = e.state ? `${e.city}, ${e.state}` : e.city;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].map(([place, n]) => ({ place, n })).sort((a, b) => b.n - a.n).slice(0, 8);
  }, [viewEvents, favoriteEvents]);

  // A data-rich weekly digest: this-week vs. last-week for views, favorites
  // and messages; new reviews; the top trending searches; and whichever
  // metric moved the most week-over-week, so a vendor gets a real "here's
  // what changed" story instead of a flat list of numbers.
  const digest = useMemo(() => {
    const weekAgo = nowMs - 7 * 86400000;
    const twoWeeksAgo = nowMs - 14 * 86400000;
    const countType = (list, type) => list.filter((e) => e.event_type === type).length;
    const thisWeek = digestEvents.filter((e) => new Date(e.created_at).getTime() >= weekAgo);
    const lastWeek = digestEvents.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t >= twoWeeksAgo && t < weekAgo;
    });
    const views = countType(thisWeek, "view_shop") + countType(thisWeek, "view_product");
    const viewsPrior = countType(lastWeek, "view_shop") + countType(lastWeek, "view_product");
    const favorites = countType(thisWeek, "favorite");
    const favoritesPrior = countType(lastWeek, "favorite");
    const messages = countType(thisWeek, "message");
    const messagesPrior = countType(lastWeek, "message");
    const pctMove = (now, prior) => (prior ? Math.round(((now - prior) / prior) * 100) : now > 0 ? 100 : 0);
    const movers = [
      { key: "views", label: "views", now: views, prior: viewsPrior, pct: pctMove(views, viewsPrior) },
      { key: "favorites", label: "favorites", now: favorites, prior: favoritesPrior, pct: pctMove(favorites, favoritesPrior) },
      { key: "messages", label: "messages", now: messages, prior: messagesPrior, pct: pctMove(messages, messagesPrior) },
    ];
    const biggestMover = movers.filter((m) => m.now > 0 || m.prior > 0).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0] || null;
    return {
      views,
      viewsPrior,
      favorites,
      favoritesPrior,
      messages,
      messagesPrior,
      reviews: publishedReviews.filter((r) => r.createdAt >= weekAgo).length,
      topSearches: trendingSearches.slice(0, 3),
      biggestMover,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digestEvents, publishedReviews, trendingSearches]);

  /* -------------------------------------------------------------------
     SALES, CUSTOMERS & SPONSORED-ADS ANALYTICS
     Built from the shop's own real order history (all-time, loaded once
     via useOrders) and its real sponsorship campaigns — nothing simulated
     here either. "Sales" = completed orders only, timed off their pickup
     date/time (orderFulfillmentTime — falling back to completedAt, then
     createdAt, for orders that never had a pickup date set), so revenue
     lands on the date it was actually fulfilled rather than whenever the
     vendor happened to tap the complete checkbox. New-vs-returning and
     CAC/LTV are computed from
     every completed order ever placed with this shop, not just the ones
     inside the selected range, so a customer's very first purchase is
     correctly recognized as "new" even if it happened outside the window.
  ------------------------------------------------------------------- */
  const allOrders = shopOrders.orders || [];
  const completedOrders = useMemo(() => allOrders.filter((o) => o.completed), [allOrders]);
  const ordersInRange = useMemo(
    () => completedOrders.filter((o) => {
      const t = orderFulfillmentTime(o) || 0;
      return t >= sinceMs && t <= nowMs;
    }),
    [completedOrders, sinceMs, nowMs]
  );

  const totalRevenue = useMemo(() => ordersInRange.reduce((sum, o) => sum + orderRevenue(o), 0), [ordersInRange]);
  const orderCountInRange = ordersInRange.length;
  const aov = orderCountInRange ? totalRevenue / orderCountInRange : 0;

  const revenueDelta = useMemo(() => {
    const mid = sinceMs + range.ms / 2;
    let firstSum = 0;
    let secondSum = 0;
    ordersInRange.forEach((o) => {
      const t = orderFulfillmentTime(o) || 0;
      if (t < mid) firstSum += orderRevenue(o);
      else secondSum += orderRevenue(o);
    });
    if (!firstSum) return secondSum > 0 ? 100 : null;
    return Math.round(((secondSum - firstSum) / firstSum) * 100);
  }, [ordersInRange, sinceMs, range.ms]);

  const salesSeries = useMemo(
    () => bucketValueSeries(ordersInRange, range.granularity, sinceMs, nowMs, orderFulfillmentTime, orderRevenue),
    [ordersInRange, range, sinceMs, nowMs]
  );
  // "Sales over time" chart's own series — either the global-range one above
  // ("current") or bucketed straight from all-time completedOrders over its
  // own calendar window (no fetch needed, orders are already loaded all-time).
  const salesSeries2 = useMemo(() => {
    if (salesPeriod === "current") return salesSeries;
    const win = panelPeriodWindow(salesPeriod, nowMs, shop?.createdAt);
    if (!win) return salesSeries;
    const inWindow = completedOrders.filter((o) => {
      const t = orderFulfillmentTime(o) || 0;
      return t >= win.sinceMs && t < win.untilMs;
    });
    return bucketValueSeries(inWindow, win.granularity, win.sinceMs, win.untilMs, orderFulfillmentTime, orderRevenue);
  }, [salesPeriod, salesSeries, completedOrders, nowMs]);

  const bestSellers = useMemo(() => {
    const counts = new Map();
    ordersInRange.forEach((o) => {
      (o.items || []).forEach((it) => {
        const key = it.productId || it.inventoryItemId || it.name;
        if (!key) return;
        const prev = counts.get(key) || { key, name: it.name || "Item", qty: 0, revenue: 0 };
        prev.qty += Number(it.qty) || 0;
        prev.revenue += (Number(it.price) || 0) * (Number(it.qty) || 0);
        counts.set(key, prev);
      });
    });
    return [...counts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [ordersInRange]);

  // How completed orders in this range break down by size — used by the
  // Revenue and Average order value drill-downs to show the mix behind the
  // headline number, not just the average itself.
  const orderSizeDistribution = useMemo(() => {
    const bins = [
      { label: "Under $10", min: 0, max: 10, n: 0 },
      { label: "$10–25", min: 10, max: 25, n: 0 },
      { label: "$25–50", min: 25, max: 50, n: 0 },
      { label: "$50+", min: 50, max: Infinity, n: 0 },
    ];
    ordersInRange.forEach((o) => {
      const rev = orderRevenue(o);
      const bin = bins.find((b) => rev >= b.min && rev < b.max) || bins[bins.length - 1];
      bin.n += 1;
    });
    return bins;
  }, [ordersInRange]);

  // Revenue by weekday over a fixed trailing 90 days — independent of the
  // range selector up top, so there's always enough signal to spot a real
  // best market day rather than one thin week's noise.
  // "current" reuses the dashboard's global date range (same convention as
  // every other panel's period control); the panel's own 1M/6M/1Y/All/
  // month-picker controls (weekdayPeriod) can widen or narrow that window —
  // no fetch needed since orders are already loaded all-time.
  const revenueByWeekday = useMemo(() => {
    const win = weekdayPeriod === "current" ? { sinceMs, untilMs: nowMs } : panelPeriodWindow(weekdayPeriod, nowMs, shop?.createdAt) || { sinceMs, untilMs: nowMs };
    const buckets = Array.from({ length: 7 }, (_, d) => ({ day: d, label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d], revenue: 0, orders: 0 }));
    completedOrders.forEach((o) => {
      const t = orderFulfillmentTime(o) || 0;
      if (t < win.sinceMs || t > win.untilMs) return;
      const d = new Date(t).getDay();
      buckets[d].revenue += orderRevenue(o);
      buckets[d].orders += 1;
    });
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedOrders, weekdayPeriod, nowMs, sinceMs]);
  const bestWeekday = useMemo(() => {
    const withSales = revenueByWeekday.filter((d) => d.revenue > 0);
    if (!withSales.length) return null;
    return withSales.reduce((best, d) => (d.revenue > best.revenue ? d : best), withSales[0]);
  }, [revenueByWeekday]);

  const ordersSeries = useMemo(
    () => bucketValueSeries(ordersInRange, range.granularity, sinceMs, nowMs, orderFulfillmentTime, () => 1),
    [ordersInRange, range, sinceMs, nowMs]
  );
  const openOrdersCount = useMemo(() => allOrders.filter((o) => !o.completed && !o.archived).length, [allOrders]);
  const messageToOrderRate = messageEvents.length ? Math.round((orderCountInRange / messageEvents.length) * 100) : null;

  // Cross-references the shop's tracked Inventory items with its best
  // sellers — a running-low alert only really matters when it's about to
  // affect a listing that's actually selling.
  const lowStockAlerts = useMemo(
    () => (inventory.items || []).filter((it) => it.lowStockThreshold != null && it.qty <= it.lowStockThreshold).sort((a, b) => a.qty - b.qty).slice(0, 5),
    [inventory.items]
  );
  const bestSellerLowStockNote = useMemo(() => {
    const top = bestSellers[0];
    if (!top) return null;
    const match = (inventory.items || []).find((it) => it.linkedProductId === top.key || it.id === top.key);
    if (match && match.lowStockThreshold != null && match.qty <= match.lowStockThreshold) {
      return `${match.qty} ${match.unit || "unit"}${match.qty === 1 ? "" : "s"} left`;
    }
    return null;
  }, [bestSellers, inventory.items]);

  // This calendar month's revenue + a simple linear pace projection for the
  // "Revenue goal & pace" panel — average $/day so far this month × days in
  // the month. Not a forecast model, just an honest "at this rate" estimate.
  const nowDate = new Date(nowMs);
  const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
  const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
  const daysElapsed = nowDate.getDate();
  const thisMonthRevenue = useMemo(() => {
    return completedOrders.reduce((sum, o) => {
      const t = orderFulfillmentTime(o) || 0;
      return t >= monthStart ? sum + orderRevenue(o) : sum;
    }, 0);
  }, [completedOrders, monthStart]);
  const projectedMonthRevenue = daysElapsed > 0 ? (thisMonthRevenue / daysElapsed) * daysInMonth : 0;
  const goalPct = monthlyGoal ? Math.min(100, Math.round((thisMonthRevenue / monthlyGoal) * 100)) : 0;

  // Every unique customer's very first-ever completed order, all-time —
  // the anchor for deciding "new" vs "returning" inside any range.
  const customerFirstPurchase = useMemo(() => {
    const sorted = [...completedOrders].sort((a, b) => (a.completedAt || a.createdAt || 0) - (b.completedAt || b.createdAt || 0));
    const map = new Map();
    sorted.forEach((o) => {
      const key = orderCustomerKey(o);
      if (!map.has(key)) map.set(key, o.completedAt || o.createdAt || 0);
    });
    return map;
  }, [completedOrders]);

  const customerBreakdown = useMemo(() => {
    const seen = new Set();
    let newCount = 0;
    let returningCount = 0;
    ordersInRange.forEach((o) => {
      const key = orderCustomerKey(o);
      if (seen.has(key)) return;
      seen.add(key);
      const firstEver = customerFirstPurchase.get(key);
      if (firstEver != null && firstEver >= sinceMs) newCount += 1;
      else returningCount += 1;
    });
    return { newCount, returningCount, total: newCount + returningCount };
  }, [ordersInRange, customerFirstPurchase, sinceMs]);

  // All-time repeat-purchase rate — the share of every customer who has
  // ever bought from this shop who came back and bought a second time.
  const repeatStats2 = useMemo(() => {
    const byCustomer = new Map();
    completedOrders.forEach((o) => {
      const key = orderCustomerKey(o);
      byCustomer.set(key, (byCustomer.get(key) || 0) + 1);
    });
    const total = byCustomer.size;
    const repeat = [...byCustomer.values()].filter((n) => n > 1).length;
    return { total, repeat, pct: total ? Math.round((repeat / total) * 100) : 0 };
  }, [completedOrders]);

  // Average all-time revenue per unique customer — a simple, honest LTV
  // proxy (not a cohort-decayed model, just total spend ÷ headcount).
  const avgCustomerLTV = useMemo(() => {
    const byCustomer = new Map();
    completedOrders.forEach((o) => {
      const key = orderCustomerKey(o);
      byCustomer.set(key, (byCustomer.get(key) || 0) + orderRevenue(o));
    });
    const total = byCustomer.size;
    if (!total) return 0;
    return [...byCustomer.values()].reduce((a, b) => a + b, 0) / total;
  }, [completedOrders]);

  const myCampaigns = useMemo(() => (isDemo ? demo.campaigns : (sponsorships || []).filter((c) => c.shopId === shop?.id)), [sponsorships, shop, isDemo, demo]);
  const adSpendAllTime = useMemo(() => myCampaigns.reduce((sum, c) => sum + (Number(c.amount) || 0), 0), [myCampaigns]);
  const activeCampaignsNow = useMemo(() => myCampaigns.filter((c) => sponsorIsLive(c, nowMs)), [myCampaigns, nowMs]);
  const earliestCampaignStart = useMemo(
    () => (myCampaigns.length ? Math.min(...myCampaigns.map((c) => c.startedAt || c.createdAt || nowMs)) : null),
    [myCampaigns, nowMs]
  );

  // Fetches this shop's own product-view events since its earliest campaign
  // started — the raw material for "clicks while sponsored" below. Not real
  // ad-pixel tracking (CropSwap doesn't have per-click attribution yet — see
  // the honest caveat on the panel itself), just this shop's own listing
  // views, later narrowed down to the exact windows each product was
  // actually being sponsored.
  useEffect(() => {
    if (!shop || earliestCampaignStart == null) {
      setSponsoredClickEvents([]);
      return;
    }
    let cancelled = false;
    const req = isDemo
      ? Promise.resolve(filterDemoEvents(demo.events, ["view_product"], earliestCampaignStart, nowMs))
      : fetchAnalyticsEvents({ types: ["view_product"], shopId: shop.id, sinceMs: earliestCampaignStart });
    req.then((ev) => {
      if (!cancelled) setSponsoredClickEvents(ev);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, earliestCampaignStart, isDemo]);

  // Each campaign's attribution window: from when it started until the
  // NEXT campaign for that same listing begins (or now, if there isn't
  // one yet) — not just its own run dates. A campaign's lift doesn't
  // vanish the instant it ends; some of that interest sticks around, so
  // clicks in the lingering weeks after a campaign still count toward it,
  // right up until that listing gets sponsored again.
  const sponsoredWindows = useMemo(() => {
    const byStart = [...myCampaigns].sort((a, b) => (a.startedAt || a.createdAt || 0) - (b.startedAt || b.createdAt || 0));
    return byStart.map((c, idx) => {
      const start = c.startedAt || c.createdAt || 0;
      const nextSameProduct = byStart.slice(idx + 1).find((n) => n.productId === c.productId);
      const to = Math.min(nextSameProduct ? nextSameProduct.startedAt || nextSameProduct.createdAt || nowMs : nowMs, nowMs);
      return { productId: c.productId, from: start, to };
    });
  }, [myCampaigns, nowMs]);
  const sponsoredClicks = useMemo(() => {
    if (!sponsoredWindows.length) return [];
    return sponsoredClickEvents.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return sponsoredWindows.some((w) => e.entity_id === w.productId && t >= w.from && t <= w.to);
    });
  }, [sponsoredClickEvents, sponsoredWindows]);
  // Same This week/1M/6M/1Y/All (+ pick-a-month) window control as every
  // other chart on this dashboard, instead of a one-off Daily/Weekly/
  // Monthly/Yearly toggle. "current" spans this shop's whole sponsored
  // history (from its earliest campaign to now) at an auto-picked
  // granularity; every other tab reuses the shared panelPeriodWindow logic.
  // Both click events and the campaign list are already fully loaded
  // up-front (not range-scoped like the other panels' data), so no extra
  // fetch is needed when the tab changes — just a different slice of what's
  // already in memory.
  const adWindow = useMemo(() => {
    if (earliestCampaignStart == null) return null;
    if (adPeriod === "current") {
      const spanDays = (nowMs - earliestCampaignStart) / 86400000;
      const granularity = spanDays <= 45 ? "day" : spanDays <= 210 ? "week" : "month";
      return { sinceMs: earliestCampaignStart, untilMs: nowMs, granularity };
    }
    return panelPeriodWindow(adPeriod, nowMs, earliestCampaignStart);
  }, [adPeriod, earliestCampaignStart, nowMs]);
  const sponsoredClicksSeries = useMemo(() => {
    if (!adWindow) return [];
    const inWindow = sponsoredClicks.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t >= adWindow.sinceMs && t <= adWindow.untilMs;
    });
    return bucketSeries(inWindow, adWindow.granularity, adWindow.sinceMs, adWindow.untilMs);
  }, [sponsoredClicks, adWindow]);
  // Each campaign's full cost, bucketed on the day it started — a lump sum
  // rather than spread across its run, matching how it's actually charged.
  const sponsoredSpendSeries = useMemo(() => {
    if (!adWindow) return [];
    const inWindow = myCampaigns.filter((c) => {
      const t = c.startedAt || c.createdAt || 0;
      return t >= adWindow.sinceMs && t <= adWindow.untilMs;
    });
    return bucketValueSeries(inWindow, adWindow.granularity, adWindow.sinceMs, adWindow.untilMs, (c) => c.startedAt || c.createdAt || 0, (c) => Number(c.amount) || 0);
  }, [myCampaigns, adWindow]);
  // Clicks and spend are bucketed against the exact same granularity/window,
  // so they always come out as same-length, same-label arrays — safe to zip
  // together index-by-index into one combined series for a single chart.
  const sponsoredComboSeries = useMemo(
    () => sponsoredClicksSeries.map((b, i) => ({ label: b.label, clicks: b.count, spend: sponsoredSpendSeries[i]?.value || 0 })),
    [sponsoredClicksSeries, sponsoredSpendSeries]
  );

  if (!shop) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No storefront yet"
        body="Your dashboard lights up once you have a storefront."
        action={<button onClick={() => navigate({ screen: "store" })} className="text-sm font-semibold text-emerald-800">Start selling</button>}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 pt-4">
        {isDemo && (
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Crown size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-900">This is a sample dashboard</p>
                <p className="text-xs text-amber-800 truncate">Start selling and go Premium to unlock this for your own shop.</p>
              </div>
            </div>
            <button onClick={() => navigate({ screen: "store" })} className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-full shrink-0 whitespace-nowrap transition">
              Start selling
            </button>
          </div>
        )}
        <button onClick={() => navigate(isDemo ? { screen: "store" } : { screen: "shop", shopId: shop.id })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
          <ArrowLeft size={15} /> {isDemo ? "Back" : "Back to storefront"}
        </button>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 py-5 mb-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -right-16 bottom-0 w-28 h-28 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-white" style={displayFont}>{shop.name} dashboard</h1>
              <p className="text-emerald-50/90 text-sm mt-0.5">
                {shopProducts.length} active listing{shopProducts.length === 1 ? "" : "s"} · {isDemo ? "example dashboard — see what Premium unlocks" : "real activity, not simulated"}
              </p>
            </div>
            {premium ? (
              <CrownPill size="md" />
            ) : isDemo ? (
              <button onClick={() => navigate({ screen: "store" })} className="text-xs font-bold text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 shrink-0 transition">
                <Sparkles size={13} /> Sample data
              </button>
            ) : (
              <button onClick={() => navigate({ screen: "plans" })} className="text-xs font-bold text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 shrink-0 transition">
                <Crown size={13} /> Preview only
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex gap-1 bg-stone-100 rounded-full p-1">
            {DASHBOARD_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRangeId(r.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${rangeId === r.id ? "bg-white shadow text-stone-900" : "text-stone-500"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 border border-stone-200 rounded-full px-3 py-1.5 bg-white">
            <Search size={13} className="text-stone-400" />
            <input
              value={lookupTerm}
              onChange={(e) => setLookupTerm(e.target.value)}
              placeholder="Look up a search term…"
              className="text-xs outline-none w-40"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {lookupTerm.trim() && (
            <span className="text-xs font-semibold text-stone-600">"{lookupTerm.trim()}" searched {lookupCount ?? 0}× in this range</span>
          )}
        </div>

        {!premium && !isDemo && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
            <Crown size={14} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-900">
              You're seeing a preview — a couple of numbers below are blurred and the mass-message tool is locked.{" "}
              <button onClick={() => navigate({ screen: "plans" })} className="font-bold underline underline-offset-2">Go Premium</button> to unlock everything.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <DashStat
            icon={Eye}
            tint="emerald"
            label="Views"
            value={viewEvents.length.toLocaleString()}
            delta={viewsDelta}
            warn={premium && viewsDelta != null && viewsDelta <= -20}
            locked={!premium && !isDemo}
            navigate={navigate}
            spark={viewSeries.map((b) => b.count)}
            onOpen={() => setDetailKind("views")}
            info="How many times shoppers opened your storefront or one of your listings in the selected date range. Tap for a breakdown by listing."
          />
          <DashStat
            icon={Heart}
            tint="rose"
            label="New favorites"
            value={favoriteEvents.length}
            delta={favoritesDelta}
            spark={favoriteSeries.map((b) => b.count)}
            onOpen={() => setDetailKind("favorites")}
            info="Shoppers who tapped the heart on your shop or a listing — a strong signal they want to come back. Tap for a breakdown by listing."
          />
          <DashStat
            icon={MessageCircle}
            tint="blue"
            label="Messages"
            value={messageEvents.length}
            delta={messagesDelta}
            warn={premium && messagesDelta != null && messagesDelta <= -20}
            locked={!premium && !isDemo}
            navigate={navigate}
            spark={messageSeries.map((b) => b.count)}
            onOpen={() => setDetailKind("messages")}
            info="New conversations shoppers started with you in this range — usually your best sign of real buying intent. Tap for response-time and conversion detail."
          />
          <DashStat
            icon={Share2}
            tint="violet"
            label="Shares"
            value={shareEvents.length}
            delta={pctChange(shareEvents)}
            spark={shareSeries.map((b) => b.count)}
            onOpen={() => setDetailKind("shares")}
            info="Times someone used the share button on your shop or listings — a rough read on word-of-mouth reach. Tap for a breakdown by listing."
          />
          <DashStat
            icon={Star}
            tint="amber"
            warn={count > 0 && platformAvgRating != null && avgRating < platformAvgRating}
            label="Avg rating"
            value={count > 0 ? avgRating.toFixed(1) : "—"}
            sub={`${count} review${count === 1 ? "" : "s"}`}
            spark={sentimentSeries.length >= 2 ? sentimentSeries.slice(-12).map((s) => s.rolling) : null}
            onOpen={() => setDetailKind("rating")}
            info="Your average star rating across every published review, all-time (not limited to the date range above). Tap for the star breakdown and recent reviews."
          />
          <DashStat
            icon={Users}
            tint="teal"
            label="Repeat visitors"
            value={`${repeatStats.pct}%`}
            sub={`${repeatStats.repeat} of ${repeatStats.total} viewers`}
            onOpen={() => setDetailKind("repeat")}
            info="The share of your viewers this range who came back and viewed you again on a different day — a loyalty signal. Tap for more detail."
          />
        </div>

        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><DollarSign size={13} /> Sales</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <DashStat
            icon={DollarSign}
            tint="emerald"
            label="Revenue"
            value={formatMoney(totalRevenue)}
            delta={revenueDelta}
            spark={salesSeries.map((b) => b.value)}
            onOpen={() => setDetailKind("revenue")}
            info="Total from completed orders in this date range, based on each order's line-item prices and quantities. Tap for revenue by day of week and order-size mix."
          />
          <DashStat
            icon={ShoppingBag}
            tint="blue"
            label="Orders"
            value={orderCountInRange.toLocaleString()}
            spark={ordersSeries.map((b) => b.value)}
            onOpen={() => setDetailKind("orders")}
            info="Completed orders in this date range. Orders still open or awaiting pickup aren't counted until they're marked done. Tap to see the order list."
          />
          <DashStat
            icon={Receipt}
            tint="violet"
            label="Avg order value"
            value={formatMoney(aov)}
            onOpen={() => setDetailKind("aov")}
            info="Revenue ÷ orders in this range — how much a typical completed order is worth. Tap for the order-size breakdown."
          />
          <DashStat
            icon={Award}
            tint="amber"
            label="Best seller"
            value={bestSellers[0] ? bestSellers[0].name : "—"}
            sub={bestSellers[0] ? `${bestSellers[0].qty} sold · ${formatMoney(bestSellers[0].revenue)}` : "No sales yet"}
            onOpen={() => setDetailKind("bestseller")}
            info="Your top-selling item by quantity sold, in this date range. Tap for your full top-5 and a restock check."
          />
        </div>

        <DashPanel
          title="Revenue goal & pace"
          icon={Target}
          className="mb-4"
          info="Set a monthly revenue goal and track your pace toward it — projected using your average revenue per day so far this month."
          right={
            monthlyGoal != null && !editingGoal ? (
              <button
                onClick={() => {
                  setGoalDraft(String(monthlyGoal));
                  setEditingGoal(true);
                }}
                className="text-xs font-bold text-emerald-800 shrink-0"
              >
                Edit goal
              </button>
            ) : null
          }
        >
          {editingGoal || monthlyGoal == null ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-white flex-1 max-w-[160px]">
                <span className="pl-2.5 pr-1 text-stone-400 text-sm">$</span>
                <NumberField
                  allowDecimal={false}
                  value={goalDraft}
                  onChange={setGoalDraft}
                  placeholder="1000"
                  className="flex-1 min-w-0 py-2 pr-2 text-sm outline-none"
                />
              </div>
              <button onClick={saveGoal} className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-full px-3.5 py-2">
                Save goal
              </button>
              {monthlyGoal != null && (
                <button onClick={() => setEditingGoal(false)} className="text-xs font-semibold text-stone-400">
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between mb-1.5">
                <p className="text-sm text-stone-600">
                  <span className="font-bold text-stone-900 font-mono">{formatMoney(thisMonthRevenue)}</span> of {formatMoney(monthlyGoal)} goal this month
                </p>
                <span className="text-xs font-bold text-stone-500">{goalPct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden mb-2.5">
                <div className="h-full rounded-full bg-emerald-600" style={{ width: `${goalPct}%` }} />
              </div>
              <p className="cs-t11 text-stone-400">
                On pace for about <span className="font-bold text-stone-600">{formatMoney(projectedMonthRevenue)}</span> by month end —{" "}
                {projectedMonthRevenue >= monthlyGoal ? "ahead of goal" : "below goal at the current pace"}.
              </p>
            </>
          )}
        </DashPanel>

        <DashPanel title="Sales over time" icon={TrendingUp} className="mb-4" info="Revenue from completed orders, plotted by pickup (fulfillment) date. Use the tabs below to jump to a specific past month/quarter/year instead of the date range up top.">
          {salesSeries2.every((b) => b.value === 0) ? (
            <p className="text-sm text-stone-400 py-6 text-center">No completed sales in this {salesPeriod === "current" ? "range" : "period"} yet.</p>
          ) : (
            <div style={{ width: "100%", height: 190 }}>
              <ResponsiveContainer>
                <BarChart data={salesSeries2}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#a8a29e" interval={Math.max(0, Math.floor(salesSeries2.length / 8))} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={40} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Bar dataKey="value" fill="#059669" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <PanelPeriodTabs value={salesPeriod} onChange={setSalesPeriod} monthOptions={monthOptions} />
        </DashPanel>

        <DashPanel
          title="Sales by day of week"
          icon={Calendar}
          className="mb-4"
          info="Revenue by day of the week for completed orders. Use the buttons below (or pick an exact month) to widen or narrow the window and spot your best (and worst) market days."
        >
          {revenueByWeekday.every((d) => d.revenue === 0) ? (
            <p className="text-sm text-stone-400 py-6 text-center">No completed sales in this window yet.</p>
          ) : (
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <BarChart data={revenueByWeekday}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#a8a29e" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={40} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Bar dataKey="revenue" fill={DASH_TINTS.emerald.bar} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <PanelPeriodTabs value={weekdayPeriod} onChange={setWeekdayPeriod} monthOptions={monthOptions} />
          {bestWeekday && (
            <p className="cs-t11 text-stone-400 mt-2">
              Best day: <span className="font-semibold text-stone-600">{bestWeekday.label}</span> ({formatMoney(bestWeekday.revenue)} in this window).
            </p>
          )}
        </DashPanel>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <DashPanel title="Best sellers" icon={Award} info="Your top 5 items by units sold in this date range, with the revenue each one brought in.">
            {bestSellerLowStockNote && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2.5">
                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                <p className="text-[11px] font-semibold text-amber-800">Your best seller is running low — {bestSellerLowStockNote}.</p>
              </div>
            )}
            {bestSellers.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No completed sales in this range yet.</p>
            ) : (
              <div className="space-y-1.5">
                {bestSellers.map((p, i) => (
                  <div key={p.name + i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 flex-1 truncate">
                      <span className="cs-t11 text-stone-400 w-4">{i + 1}</span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="cs-t11 font-mono text-stone-600 shrink-0">{p.qty} sold · {formatMoney(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </DashPanel>

          <DashPanel title="New vs. returning customers" icon={UserCheck} info="A customer counts as 'new' the first time their very first-ever completed order with you falls inside this date range — otherwise they're 'returning'. Based on every completed order ever, not just this range.">
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <DigestChip tint="blue" icon={UserPlus} label="New customers" value={customerBreakdown.newCount} />
              <DigestChip tint="teal" icon={Repeat} label="Returning" value={customerBreakdown.returningCount} />
            </div>
            {customerBreakdown.total > 0 && (
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden flex mb-3">
                <div className="h-full bg-blue-500" style={{ width: `${Math.round((customerBreakdown.newCount / customerBreakdown.total) * 100)}%` }} />
                <div className="h-full bg-teal-500" style={{ width: `${Math.round((customerBreakdown.returningCount / customerBreakdown.total) * 100)}%` }} />
              </div>
            )}
            <p className="text-sm text-stone-600">
              All-time repeat-purchase rate: <span className="font-bold text-stone-900">{repeatStats2.pct}%</span>
              <span className="cs-t11 text-stone-400"> ({repeatStats2.repeat} of {repeatStats2.total} customers have bought more than once)</span>
            </p>
            <p className="text-sm text-stone-600 mt-1">
              Avg. lifetime value per customer: <span className="font-bold text-stone-900">{formatMoney(avgCustomerLTV)}</span>
            </p>
          </DashPanel>
        </div>

        {lowStockAlerts.length > 0 && (
          <DashPanel
            title="Restock watch"
            icon={AlertTriangle}
            className="mb-4"
            info="Inventory items at or below the low-stock threshold you set for them — a quick list of what needs restocking soonest."
          >
            <div className="space-y-1.5">
              {lowStockAlerts.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{it.name}</span>
                  <span className="cs-t11 font-mono text-amber-700 shrink-0">
                    {it.qty} {it.unit || ""} left · threshold {it.lowStockThreshold}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate(isDemo ? { screen: "store" } : { screen: "orders", tab: "inventory" })} className="text-xs font-bold text-emerald-800 mt-2.5">
              Manage inventory →
            </button>
          </DashPanel>
        )}

        <DashPanel
          title="Sponsored ads: clicks & spend"
          icon={Megaphone}
          className="mb-4"
          info="Clicks are this shop's own listing views credited to a campaign — from when it started through the weeks right after it ended, since interest doesn't vanish the moment a campaign stops, up until that same listing is sponsored again. Not real ad-pixel attribution (CropSwap doesn't yet track ad clicks separately from organic ones), so treat this as a directional read on engagement, not a precise per-click number. Spend is charged in full on the day each campaign started."
          right={
            <button onClick={() => navigate(isDemo ? { screen: "store" } : { screen: "ads" })} className="text-xs font-bold text-emerald-800 shrink-0">
              Manage ads →
            </button>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <DigestChip tint="violet" icon={Megaphone} label="Active campaigns" value={activeCampaignsNow.length} />
            <DigestChip tint="teal" icon={Archive} label="Lifetime campaigns" value={myCampaigns.length} />
            <DigestChip tint="blue" icon={Target} label="Total clicks" value={sponsoredClicks.length} />
            <DigestChip tint="amber" icon={DollarSign} label="Total ad spend" value={formatMoney(adSpendAllTime)} />
          </div>
          {myCampaigns.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">No sponsored campaigns yet — sponsor a listing to see clicks and spend here.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-1">
                <span className="flex items-center gap-1 cs-t10 text-stone-400"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: DASH_TINTS.blue.bar }} /> Clicks</span>
                <span className="flex items-center gap-1 cs-t10 text-stone-400"><span className="w-2 h-2 rounded-full inline-block" style={{ background: DASH_TINTS.amber.bar }} /> Spend</span>
              </div>
              {sponsoredComboSeries.every((b) => b.clicks === 0 && b.spend === 0) ? (
                <p className="text-sm text-stone-400 py-4 text-center">No listing views recorded during a sponsored window yet.</p>
              ) : (
                <div style={{ width: "100%", height: 190 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={sponsoredComboSeries}>
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#a8a29e" interval={Math.max(0, Math.floor(sponsoredComboSeries.length / 8))} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#a8a29e" width={30} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#a8a29e" width={40} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v, name) => (name === "Spend" ? formatMoney(v) : v)} />
                      <Bar yAxisId="left" dataKey="clicks" name="Clicks" fill={DASH_TINTS.blue.bar} radius={[3, 3, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="spend" name="Spend" stroke={DASH_TINTS.amber.bar} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              <PanelPeriodTabs value={adPeriod} onChange={setAdPeriod} monthOptions={monthOptions} />
            </>
          )}
        </DashPanel>

        <DashPanel title="This week's digest" icon={Calendar} className="mb-4" info="A data-rich recap of the last 7 days vs. the 7 days before — views, favorites, messages, reviews, whichever metric moved the most, and the top search terms shoppers are typing right now.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <DigestChip tint="emerald" icon={Eye} label="Views" value={digest.views} prior={digest.viewsPrior} />
            <DigestChip tint="rose" icon={Heart} label="Favorites" value={digest.favorites} prior={digest.favoritesPrior} />
            <DigestChip tint="blue" icon={MessageCircle} label="Messages" value={digest.messages} prior={digest.messagesPrior} />
            <DigestChip tint="amber" icon={Star} label="New reviews" value={digest.reviews} />
          </div>

          {digest.biggestMover && digest.biggestMover.pct !== 0 && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 ${digest.biggestMover.pct > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
              {digest.biggestMover.pct > 0 ? <TrendingUp size={15} className="text-emerald-700 shrink-0" /> : <TrendingDown size={15} className="text-rose-600 shrink-0" />}
              <p className={`text-xs font-semibold ${digest.biggestMover.pct > 0 ? "text-emerald-800" : "text-rose-800"}`}>
                Biggest mover: {digest.biggestMover.label} {digest.biggestMover.pct > 0 ? "up" : "down"} {Math.abs(digest.biggestMover.pct)}% vs. last week ({digest.biggestMover.prior} → {digest.biggestMover.now})
              </p>
            </div>
          )}

          {digest.topSearches.length > 0 && (
            <div>
              <p className="cs-t11 text-stone-400 mb-1.5">Trending searches this week</p>
              <div className="space-y-1.5">
                {digest.topSearches.map((t, i) => (
                  <div key={t.term} className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${i === 0 ? "bg-violet-600" : i === 1 ? "bg-violet-400" : "bg-violet-300"}`}>
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold text-stone-700 flex-1 truncate">{t.term}</span>
                    <div className="w-24 h-1.5 rounded-full bg-stone-100 overflow-hidden hidden sm:block">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.max(8, Math.round((t.n / digest.topSearches[0].n) * 100))}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-violet-700 w-4 text-right">{t.n}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DashPanel>

        <DashPanel title="Views over time" icon={TrendingUp} className="mb-4" info="Every view of your storefront or a listing, plotted across the date range you picked above. Look for spikes after you post something new. Use the tabs below to jump to a specific past month/quarter/year instead.">
          <div style={{ width: "100%", height: 190 }}>
            <ResponsiveContainer>
              <AreaChart data={viewsSeries2}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#a8a29e" interval={Math.max(0, Math.floor(viewsSeries2.length / 8))} />
                <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={32} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#065f46" fill="#a7f3d0" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <PanelPeriodTabs value={viewsPeriod} onChange={setViewsPeriod} monthOptions={monthOptions} />
        </DashPanel>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <DashPanel title="Keyword search intelligence" icon={Search} info="The top search terms shoppers are typing platform-wide right now — use it to see what's in demand and name your listings to match.">
            <p className="cs-t11 text-stone-500 mb-2">Platform-wide, this range</p>
            {trendingSearches.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No searches logged yet in this range.</p>
            ) : (
              <div className="space-y-1.5">
                {trendingSearches.map((t, i) => (
                  <div key={t.term} className="flex items-center gap-2">
                    <span className="cs-t11 text-stone-400 w-4">{i + 1}</span>
                    <span className="text-sm font-semibold text-stone-800 flex-1 truncate">{t.term}</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">{t.n}</span>
                  </div>
                ))}
              </div>
            )}
          </DashPanel>

          <DashPanel title="Favorites over time" icon={Heart} info="How your favorite count has moved, plus which of your listings are pulling in the most hearts and shares right now. Use the buttons below (or pick an exact month) to change the window.">
            <div style={{ width: "100%", height: 150 }}>
              <ResponsiveContainer>
                <LineChart data={favoriteSeries2}>
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#a8a29e" interval={Math.max(0, Math.floor(favoriteSeries2.length / 6))} />
                  <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={28} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke={DASH_TINTS.rose.bar} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <PanelPeriodTabs value={favoritesPeriod} onChange={setFavoritesPeriod} monthOptions={monthOptions} />
            <p className="cs-t11 text-stone-400 mt-2">Top listings: {leaderboard.top.slice(0, 3).map((p) => p.name).join(", ") || "—"}</p>
          </DashPanel>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <DashPanel title="New users by state" icon={UserPlus} info="Where brand-new CropSwap shoppers signed up from during this range — a sense of where the platform is growing.">
            {usersByState.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No signups in this range.</p>
            ) : (
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={usersByState.map((x) => ({ name: x.state, n: x.n }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#a8a29e" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={28} />
                    <Tooltip />
                    <Bar dataKey="n" fill="#0d9488" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </DashPanel>
          <DashPanel title="New storefronts by state" icon={Store} info="Where other vendors are opening new storefronts — handy for spotting which states are becoming more competitive.">
            {newShopsByState.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No new storefronts in this range.</p>
            ) : (
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={newShopsByState.map((x) => ({ name: x.state, n: x.n }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#a8a29e" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" width={28} />
                    <Tooltip />
                    <Bar dataKey="n" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </DashPanel>
        </div>

        <DashPanel title="Conversion funnel" icon={Target} className="mb-4" info="How viewers move down the funnel from viewing, to favoriting, to messaging you — each bar shows what percent of viewers made it that far.">
          <div className="space-y-2">
            {funnel.map((f, i) => {
              const barColor = [DASH_TINTS.emerald.bar, DASH_TINTS.rose.bar, DASH_TINTS.blue.bar][i] || DASH_TINTS.emerald.bar;
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-semibold text-stone-700">{f.label}</span>
                    <span className="font-mono text-stone-500">{f.value} · {f.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${f.pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </DashPanel>

        <DashPanel title="Peak activity — day × hour" icon={Clock} className="mb-4" info="A live traffic map of exactly when shoppers show up, broken out by day of week and hour of day — cool blue is quiet, hot red is your busiest windows. Use it to time new listings and replies for when people are actually looking. Use the tabs below to jump to a specific past month/quarter/year instead.">
          {heatmapInsights.peakLabel ? (
            <div className="flex items-start gap-2.5 bg-gradient-to-r from-orange-50 to-red-100 border border-red-200 rounded-xl px-3.5 py-3 mb-4">
              <Zap size={16} className="text-red-800 shrink-0 mt-0.5" />
              <p className="text-sm text-stone-700 leading-snug">
                <span className="font-bold text-stone-900">{heatmapInsights.peakLabel}</span> is your single busiest hour
                {heatmapInsights.peakMultiple ? (
                  <>
                    {" "}— <span className="font-bold text-red-800">{heatmapInsights.peakMultiple.toFixed(1)}x</span> a typical hour
                  </>
                ) : null}
                {heatmapInsights.eveningShare >= 30 ? (
                  <>
                    . Evenings (5–9pm) alone bring in <span className="font-bold text-stone-900">{heatmapInsights.eveningShare}%</span> of all views in this range
                  </>
                ) : null}
                . <span className="font-semibold">New listings and replies land hardest right before that window</span> — post and reply then, not into the quiet hours.
              </p>
            </div>
          ) : (
            <p className="text-sm text-stone-400 py-4 text-center">Not enough activity yet to spot a pattern — check back after a few visits.</p>
          )}

          <div className="overflow-x-auto pb-1">
            <div className="inline-grid gap-[3px] items-center" style={{ gridTemplateColumns: "30px repeat(24, 20px)" }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={`hh-${h}`} className="text-center text-stone-400 leading-none" style={{ fontSize: 8 }}>
                  {h % 3 === 0 ? formatHourShort(h) : ""}
                </div>
              ))}
              {heatmap.map((row, d) => (
                <React.Fragment key={d}>
                  <div className="text-right pr-1.5 text-stone-500 font-semibold leading-none" style={{ fontSize: 10 }}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]}
                  </div>
                  {row.map((v, h) => {
                    const isPeak = heatmapInsights.peakCell && heatmapInsights.peakCell.d === d && heatmapInsights.peakCell.h === h;
                    return (
                      <div
                        key={`${d}-${h}`}
                        title={`${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]} ${h}:00 — ${v}`}
                        className={`rounded-[4px] ${isPeak ? "cs-heat-peak ring-2 ring-red-800" : ""}`}
                        style={{ width: 20, height: 20, backgroundColor: v === 0 ? "#f0efec" : dashHeatColor(heatmapInsights.percentile(d, h)) }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="cs-t10 text-stone-400 font-semibold">Quiet</span>
            <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${HEAT_STOPS.map((c) => `rgb(${c.join(",")})`).join(", ")})` }} />
            <span className="cs-t10 text-stone-400 font-semibold">Peak</span>
          </div>

          <PanelPeriodTabs value={heatmapPeriod} onChange={setHeatmapPeriod} monthOptions={monthOptions} />
        </DashPanel>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <DashPanel title="Category benchmarking" icon={Award} info="How your average rating and response time stack up against the platform average from other shops — a quick gut check on where you stand.">
            <p className="text-sm text-stone-600 mb-1">Your avg rating: <span className="font-bold text-stone-900">{count > 0 ? avgRating.toFixed(2) : "—"}</span></p>
            <p className="text-sm text-stone-600 mb-1">Platform avg: <span className="font-bold text-stone-900">{platformAvgRating != null ? platformAvgRating.toFixed(2) : "—"}</span></p>
            {platformAvgRating != null && count > 0 && (
              <p className={`text-xs font-semibold ${avgRating >= platformAvgRating ? "text-emerald-700" : "text-rose-600"}`}>
                {avgRating >= platformAvgRating ? "Above" : "Below"} the platform average
              </p>
            )}
            <p className="text-sm text-stone-600 mt-2">
              Response time:{" "}
              <span className="font-bold text-stone-900">
                {respLoading ? "…" : avgResponseMin != null ? (avgResponseMin < 60 ? `${avgResponseMin}m` : `${(avgResponseMin / 60).toFixed(1)}h`) : "No data yet"}
              </span>
            </p>
          </DashPanel>
          <DashPanel title="Listing leaderboard" icon={Zap} info="Your own listings, ranked by a score of favorites and shares — the top 5 here are your best performers to feature or restock.">
            <p className="cs-t11 text-stone-400 mb-1">Top performers</p>
            {leaderboard.top.length === 0 ? (
              <p className="text-sm text-stone-400 py-2">No listings yet.</p>
            ) : (
              leaderboard.top.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-0.5">
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="cs-t11 font-mono text-emerald-700">♥{p.favoriteCount || 0} · ↗{p.shareCount || 0}</span>
                </div>
              ))
            )}
          </DashPanel>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <DashPanel title="Review sentiment trend" icon={Star} info="Your running average star rating over time, plus the words that show up most often in reviews shoppers have left you.">
            {sentimentSeries.length < 2 ? (
              <p className="text-sm text-stone-400 py-4 text-center">Need a couple more reviews for a trend line.</p>
            ) : (
              <div style={{ width: "100%", height: 130 }}>
                <ResponsiveContainer>
                  <LineChart data={sentimentSeries}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#a8a29e" />
                    <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} stroke="#a8a29e" width={24} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rolling" stroke="#b45309" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {reviewWordCloud.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {reviewWordCloud.map(([w, n]) => (
                  <span key={w} className="text-[11px] font-semibold bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">
                    {w} · {n}
                  </span>
                ))}
              </div>
            )}
          </DashPanel>
          <DashPanel title="Where your engagement comes from" icon={MapPin} info="The cities generating the most views and favorites for you this range — useful for knowing where your customer base is actually coming from.">
            {topCities.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">Not enough location data yet.</p>
            ) : (
              topCities.map((c) => (
                <div key={c.place} className="flex items-center justify-between text-sm py-0.5">
                  <span className="truncate flex-1">{c.place}</span>
                  <span className="cs-t11 font-mono text-stone-500">{c.n}</span>
                </div>
              ))
            )}
          </DashPanel>
        </div>

        <DashPanel title="Mailing list & mass messages" icon={Megaphone} className="mb-4" info="Everyone who has ever messaged you first joins your mailing list automatically. Send them all one message at once — delivered as an in-app message + notification.">
          <p className="cs-t11 text-stone-400 mb-3">
            {isDemo ? 128 : mailing.list.length} subscriber{(isDemo ? 128 : mailing.list.length) === 1 ? "" : "s"} — anyone who messages you gets added automatically. Messages sent to all deliver as an in-app message + notification, not an outside email.
          </p>
          <ToolLock locked={!premium} navigate={navigate} label="Premium — send mass messages">
            <MassMessageComposer me={me} shop={shop} subscribers={mailing.list} onSent={mailing.reload} showToast={showToast} />
            {mailing.list.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-100 space-y-1 max-h-40 overflow-y-auto">
                {mailing.list.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span>{s.avatar}</span> {s.name}
                    </span>
                    <button onClick={() => mailing.removeSubscriber(s.userId)} className="text-stone-300 hover:text-rose-600 text-xs">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ToolLock>
        </DashPanel>
      </div>

      {detailKind && (
        <MetricDetailModal
          kind={detailKind}
          onClose={() => setDetailKind(null)}
          navigate={navigate}
          data={{
            shop,
            isDemo,
            demoEvents: isDemo ? demo.events : null,
            shopProducts,
            completedOrders,
            rangeSinceMs: sinceMs,
            rangeUntilMs: nowMs,
            rangeGranularity: range.granularity,
            monthOptions,
            viewSeries,
            favoriteSeries,
            messageSeries,
            shareSeries,
            ordersSeries,
            salesSeries,
            shopPageViews,
            viewsByProduct,
            favoritesByProduct,
            sharesByProduct,
            avgResponseMin,
            respLoading,
            messageToOrderRate,
            avgRating,
            count,
            ratingDistribution,
            recentReviews,
            platformAvgRating,
            repeatStats,
            totalRevenue,
            revenueByWeekday,
            orderSizeDistribution,
            ordersInRange,
            openOrdersCount,
            aov,
            bestSellers,
            lowStockAlerts,
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 25: STORE SCREEN (own shop or become-a-vendor prompt)
============================================================================ */
function StoreScreen({ navigate }) {
  const { me, shops, shopsById, createShopForUser, updateMe, purchasePlan, showToast } = useApp();
  const [shopName, setShopName] = useState("");
  const homeLoc = splitCityState(me?.homeLocation?.label);
  const [shopCity, setShopCity] = useState(homeLoc.city || "");
  const [shopState, setShopState] = useState((homeLoc.state || "").toUpperCase().slice(0, 2));
  const [shopCountry, setShopCountry] = useState("US");
  const [creating, setCreating] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const shop = me.isVendor && me.shopId ? shopsById[me.shopId] : null;

  // One storefront per account, enforced here too — not just at signup.
  // The old multi-shop drift (see removeShop's comment) happened when
  // me.shopId went stale/null while a shop this account actually owns was
  // still sitting in the market. Catch that here and relink instead of
  // ever showing the "create a storefront" form to an account that
  // already has one — that form is the only place a second shop could
  // get spun up, so closing it off here is what makes "one shop per
  // account" hold going forward.
  const existingOwnedShop = !shop ? shops.find((s) => s.ownerId === me.id) : null;
  useEffect(() => {
    if (existingOwnedShop && me.shopId !== existingOwnedShop.id) {
      updateMe({ isVendor: true, shopId: existingOwnedShop.id });
    }
  }, [existingOwnedShop, me.shopId, updateMe]);
  if (existingOwnedShop) {
    return <LoadingScreen />;
  }

  if (shop && shop.billingStatus === "inactive") {
    const daysLeft = Math.max(0, Math.ceil(ABANDON_DAYS - daysBetween(shop.inactiveSince || Date.now(), Date.now())));
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">🌙</div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2" style={displayFont}>{shop.name} is inactive</h2>
          <p className="text-stone-500 mb-1">Your plan lapsed, so this storefront is hidden from other shoppers.</p>
          <p className="text-stone-500 mb-5">It's kept for {daysLeft} more day{daysLeft === 1 ? "" : "s"} before it's removed for good — re-up any time before then to bring it back online.</p>
          <button
            onClick={async () => {
              setReactivating(true);
              await purchasePlan("basic", "monthly");
              setReactivating(false);
              showToast("Storefront reactivated");
              navigate({ screen: "shop", shopId: shop.id });
            }}
            disabled={reactivating}
            className="w-full bg-emerald-800 text-white font-semibold py-3 rounded-xl disabled:opacity-40 mb-2"
          >
            {reactivating ? "Reactivating…" : "Reactivate with Basic (test mode)"}
          </button>
          <button onClick={() => navigate({ screen: "plans" })} className="text-xs font-semibold text-stone-500">See all plans</button>
        </div>
      </div>
    );
  }

  if (shop) {
    return <ShopProfileView shopId={me.shopId} navigate={navigate} />;
  }

  if (!isBasicPlus(me)) {
    const sampleProducts = [
      { name: "Heirloom Tomatoes", emoji: "🍅", price: "$4.50/lb" },
      { name: "Farm Fresh Eggs", emoji: "🥚", price: "$6.00/doz" },
      { name: "Raw Honey", emoji: "🍯", price: "$9.00/pint" },
      { name: "Sweet Corn", emoji: "🌽", price: "$5.00/bushel" },
    ];
    return (
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto p-4">
          <button onClick={() => navigate({ screen: "explore" })} className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 mb-4">
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="text-2xl font-bold text-stone-900 mb-1" style={displayFont}>My Store</h1>
          <p className="text-stone-500 text-sm mb-4">A preview of what your storefront could look like — upgrade any time to make it real.</p>

          <div className="relative h-32 rounded-t-2xl overflow-hidden bg-gradient-to-br from-emerald-700 to-teal-600 flex items-center justify-center">
            <p className="text-white font-bold text-xl" style={displayFont}>Example Farm Stand</p>
          </div>
          <div className="border border-t-0 border-stone-200 rounded-b-2xl px-5 pt-4 pb-5 mb-2">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="w-10 h-10 -mt-9 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-lg shrink-0">🧺</span>
              <span className="cs-t11 font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Actively selling</span>
            </div>
            <p className="text-stone-500 font-medium text-sm">@yourfarmname · Your Town, {stateInfo((homeLoc.state || "").toUpperCase().slice(0, 2))?.name || "Your State"}</p>

            <ToolLock locked navigate={navigate} label="Upgrade to build your own storefront">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                {sampleProducts.map((p) => (
                  <div key={p.name} className="border border-stone-200 rounded-xl p-2.5 text-center">
                    <div className="text-2xl mb-1">{p.emoji}</div>
                    <p className="text-xs font-semibold text-stone-800 leading-tight">{p.name}</p>
                    <p className="cs-t10 text-emerald-700 font-bold mt-0.5">{p.price}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-4">
                {["Products", "Updates", "Tools", "Contact"].map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-stone-200 text-stone-500">{t}</span>
                ))}
              </div>
            </ToolLock>
          </div>

          <LockedFeatureButton
            label="Create your own storefront"
            sub={`Upgrade to Basic (${formatMoney(PLAN_CATALOG.basic.monthly)}/mo) or Premium to start selling`}
            navigate={navigate}
            icon={Store}
            className="mt-3"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="text-5xl mb-4">🧺</div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2" style={displayFont}>Start selling on CropSwap</h2>
        <p className="text-stone-500 mb-5">Set up your storefront in seconds — customize everything after.</p>
        <TextField
          value={shopName}
          onChange={setShopName}
          label="Farm or shop name"
          placeholder="Your farm or shop name"
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-emerald-700 text-left"
        />
        <TextField
          value={shopCity}
          onChange={setShopCity}
          label="Town or city"
          placeholder="Town or city"
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm mb-2 outline-none focus:border-emerald-700 text-left"
        />
        <div className="flex gap-2 mb-1">
          <div className="flex-1">
            {shopCountry === "US" ? (
              <select
                value={shopState}
                onChange={(e) => setShopState(e.target.value)}
                aria-label="State"
                className="w-full h-full border border-stone-200 rounded-xl px-2 py-3 text-sm bg-white text-left"
              >
                <option value="">State…</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.code}</option>
                ))}
              </select>
            ) : (
              <TextField
                value={shopState}
                onChange={setShopState}
                label="State / province"
                placeholder="State / province"
                className="w-full border border-stone-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-emerald-700 text-left"
              />
            )}
          </div>
          <div className="flex-1">
            <select
              value={shopCountry}
              onChange={(e) => {
                // Reset the state field on a country change — a US state
                // code and a typed province name aren't interchangeable, so
                // carrying one over into the other just leaves stale text.
                setShopCountry(e.target.value);
                setShopState("");
              }}
              aria-label="Country"
              className="w-full h-full border border-stone-200 rounded-xl px-2 py-3 text-sm bg-white text-left"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="cs-t11 text-stone-400 mb-3 text-left">So shoppers looking near you can actually find you on the map.</p>
        <button
          onClick={async () => {
            setCreating(true);
            // Geocode the actual town/city typed in so the map pin lands
            // exactly there, rather than wherever the app's default/browsing
            // location happens to be (that's a shopper convenience setting,
            // not this shop's real location, and trusting it was placing
            // shops in the wrong spot — including the wrong country).
            // Falls back to an approximate state/country center only if the
            // lookup can't find a match (see createShopForUser).
            const geo = await geocodeLocation({ city: shopCity.trim(), state: shopState.trim(), country: shopCountry });
            const newShop = await createShopForUser(me, shopName.trim(), {
              city: shopCity.trim(),
              state: shopState.trim(),
              country: shopCountry,
              ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
            });
            await updateMe({ isVendor: true, shopId: newShop.id });
            setCreating(false);
            if (!geo) {
              showToast?.("Couldn't pinpoint that exact city — using an approximate map pin for now. You can fine-tune it later from your storefront editor.");
            }
            navigate({ screen: "storeEditor" });
          }}
          disabled={creating || !shopName.trim() || !shopState.trim()}
          className="w-full bg-emerald-800 text-white font-semibold py-3 rounded-xl disabled:opacity-40"
        >
          {creating ? "Setting up…" : "Create my storefront"}
        </button>
        {!shopState.trim() && (
          <p className="cs-t11 text-stone-400 text-center mt-2">
            {shopCountry === "US" ? "Pick a state to continue." : "Enter your state or province to continue."}
          </p>
        )}
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

// Shown right after signing in when this account owns more than one
// storefront — a leftover from running "Start Selling" more than once
// without ever having a way to remove the old shop. Lets someone pick which
// one they mean to use, or delete any they don't need, before the rest of
// the app decides which shop is "theirs" via me.shopId.
function ChooseShopGate({ shops, activeShopId, onPick, onDelete, onSkip }) {
  const [busyId, setBusyId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const handlePick = async (id) => {
    setBusyId(id);
    await onPick(id);
    setBusyId(null);
  };
  const handleDelete = async (id) => {
    setBusyId(id);
    await onDelete(id);
    setBusyId(null);
    setConfirmingId(null);
  };

  return (
    <div className="h-screen w-full flex items-start justify-center bg-stone-50 p-6 pt-10 overflow-y-auto" style={{ height: "100dvh" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-2xl mb-1 justify-center" style={displayFont}>
          <Sparkles size={24} /> CropSwap
        </div>
        <h1 className="text-center text-lg font-bold text-stone-900 mt-4 mb-1" style={displayFont}>Choose your shop</h1>
        <p className="text-center text-stone-500 mb-6 text-sm">
          This account owns more than one storefront. Pick the one you want to use, or delete any you don't need anymore.
        </p>

        <div className="flex flex-col gap-2.5 mb-4">
          {shops.map((shop) => (
            <div key={shop.id} className="bg-white border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center text-lg shrink-0">{shop.emoji || "🧺"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900 truncate">{shop.name}</p>
                  <p className="cs-t11 text-stone-400 truncate">@{shop.handle} · {shop.city}, {shop.state}</p>
                </div>
                {shop.id === activeShopId && (
                  <span className="cs-t10 font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">Current</span>
                )}
              </div>
              {confirmingId === shop.id ? (
                <div className="flex items-center gap-2 bg-rose-50 rounded-xl p-2.5">
                  <span className="text-xs text-rose-700 flex-1">Delete "{shop.name}" and all its listings? This can't be undone.</span>
                  <button onClick={() => setConfirmingId(null)} className="text-xs font-semibold text-stone-500 shrink-0">Cancel</button>
                  <button onClick={() => handleDelete(shop.id)} disabled={busyId === shop.id} className="text-xs font-semibold text-rose-700 shrink-0">
                    {busyId === shop.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePick(shop.id)}
                    disabled={busyId === shop.id}
                    className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-xl disabled:opacity-40 transition"
                  >
                    {busyId === shop.id ? "Switching…" : "Use this shop"}
                  </button>
                  <button
                    onClick={() => setConfirmingId(shop.id)}
                    className="px-3 py-2 rounded-xl border border-stone-200 text-stone-400 hover:text-rose-600 hover:border-rose-200 transition"
                    aria-label={`Delete ${shop.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={onSkip} className="text-xs font-semibold text-stone-400 hover:text-stone-600 block mx-auto">
          Skip for now
        </button>
      </div>
    </div>
  );
}

function Onboarding({ onCreate, reason, onCancel }) {
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [codeStage, setCodeStage] = useState(false);
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const nameValid = fullName.trim().length >= 2;
  const zipValid = isValidZip(zipcode);
  const phoneValid = digitsOnly(phone).length === 10;
  const formReady = nameValid && zipValid && phoneValid && phoneVerified;

  const handlePhoneChange = (v) => {
    setPhone(v);
    setPhoneVerified(false);
    setCodeStage(false);
    setCode("");
  };

  const sendCode = () => {
    if (!phoneValid) return;
    setCodeStage(true);
  };

  const verifyCode = () => {
    if (!/^\d{6}$/.test(code.trim())) return;
    setCodeBusy(true);
    setTimeout(() => {
      setPhoneVerified(true);
      setCodeStage(false);
      setCodeBusy(false);
    }, 350);
  };

  return (
    <div className="h-screen w-full flex items-start justify-center bg-stone-50 p-6 pt-8 overflow-y-auto" style={{ ...bodyFont, height: "100dvh" }}>
      <link rel="stylesheet" href={FONT_LINK_HREF} />
      <GlobalStyles />
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-2xl mb-1 justify-center" style={displayFont}>
          <Sparkles size={24} /> CropSwap
        </div>
        {reason ? (
          <p className="text-center text-stone-500 mb-4 text-sm">One more step to {reason}.</p>
        ) : (
          <p className="text-center text-stone-500 mb-4 text-sm">A hyper-local, nationwide hub connecting growers and buyers.</p>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs font-semibold text-stone-400 hover:text-stone-600 mb-3 block mx-auto">
            Not now — keep browsing
          </button>
        )}
        <div className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Display name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should we call you?"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
          />

          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Full legal name</p>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-emerald-700"
          />

          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Zip code</p>
          <input
            value={zipcode}
            onChange={(e) => setZipcode(e.target.value)}
            placeholder="83854"
            inputMode="numeric"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm mb-1 outline-none focus:border-emerald-700"
          />
          {zipcode && !zipValid && <p className="cs-t11 text-rose-600 mb-3">Enter a valid 5-digit zip code</p>}
          {(!zipcode || zipValid) && <div className="mb-3" />}

          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Phone number</p>
          <div className="flex gap-2 mb-1.5">
            <input
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(208) 555-0100"
              inputMode="tel"
              className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700"
            />
            {!phoneVerified && (
              <button
                type="button"
                onClick={sendCode}
                disabled={!phoneValid}
                className="shrink-0 px-3.5 rounded-xl text-xs font-semibold border border-stone-200 text-stone-700 disabled:opacity-40 hover:bg-stone-50"
              >
                {codeStage ? "Resend" : "Send code"}
              </button>
            )}
          </div>

          {phoneVerified ? (
            <p className="cs-t11 text-emerald-700 font-semibold flex items-center gap-1 mb-4">
              <BadgeCheck size={13} /> Phone verified (test mode)
            </p>
          ) : codeStage ? (
            <div className="mb-4 bg-stone-50 rounded-xl p-3 border border-stone-200">
              <p className="cs-t11 text-stone-500 mb-2">TEST MODE — no text was actually sent. Enter any 6 digits.</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm tracking-widest outline-none focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={codeBusy || code.length !== 6}
                  className="shrink-0 px-3.5 rounded-lg text-xs font-semibold bg-emerald-800 text-white disabled:opacity-40"
                >
                  {codeBusy ? "Checking…" : "Verify"}
                </button>
              </div>
            </div>
          ) : (
            <p className="cs-t11 text-stone-400 mb-4">We'll text a code to confirm this number.</p>
          )}

          <button
            onClick={async () => {
              setBusy(true);
              await onCreate({ name: name.trim() || "Guest", avatar: "", fullName: fullName.trim(), zipcode: zipcode.trim(), phone: digitsOnly(phone) });
              setBusy(false);
            }}
            disabled={busy || !formReady}
            className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition"
          >
            {busy ? "Setting up…" : "Create free account"}
          </button>
        </div>
        <p className="text-center cs-t11 text-stone-400 mt-4">Your display name and avatar are what other growers and buyers see. Everything else stays private — you can change any of it later in your account.</p>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 26b: GUEST BROWSING — anyone can look around without an account;
   only these screens (and the write actions gated inline elsewhere) require
   one. Centralizing the list here means the sidebar, bottom nav, and every
   "go to X" button all get the same gate for free just by calling navigate().
============================================================================ */
// "dashboard" is deliberately NOT gated — anyone browsing, signed in or not,
// can open it and see the full sample/demo dashboard (see VendorDashboard's
// isDemo branch) as a Premium selling point. Gating it here would bounce
// guests straight to a signup card instead of ever showing them that page.
const AUTH_REQUIRED_SCREENS = new Set(["favorites", "messages", "store", "storeEditor", "places", "checkout", "orders", "ads"]);
const AUTH_REASON_BY_SCREEN = {
  favorites: "see your favorites",
  messages: "send and receive messages",
  store: "start selling on CropSwap",
  storeEditor: "edit your storefront",
  places: "save your places",
  checkout: "subscribe to a plan",
  orders: "manage your orders",
  ads: "sponsor a listing",
};

// A small card next to whatever the guest just tapped — "Create a free
// account to favorite this item," etc. — rather than yanking them straight
// into the full sign-up screen. Only its own "Sign up free" button hands off
// to that full flow; anything else (the X, or tapping outside) just closes
// the card and leaves them right where they were, still browsing.
const AUTH_PROMPT_W = 272;
function AuthPromptPopover({ prompt, onSignUp, onLogIn, onDismiss }) {
  const { viewportHeight } = useApp();
  const [style, setStyle] = useState(null);

  useEffect(() => {
    const vh = viewportHeight || window.innerHeight;
    const vw = window.innerWidth;
    const cardH = 148 + (onLogIn ? 70 : 0); // rough estimate — icon + title + line + button(s)
    const anchor = prompt?.anchor;
    let left, top;
    if (anchor) {
      left = Math.min(Math.max(anchor.x - AUTH_PROMPT_W / 2, 12), vw - AUTH_PROMPT_W - 12);
      if (anchor.y + 18 + cardH > vh) {
        top = Math.max(anchor.y - cardH - 18, 12);
      } else {
        top = Math.min(anchor.y + 18, vh - cardH - 12);
      }
    } else {
      left = Math.max(12, vw / 2 - AUTH_PROMPT_W / 2);
      top = Math.max(12, vh - cardH - 96);
    }
    setStyle({ left, top, width: AUTH_PROMPT_W });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  if (!prompt || !style) return null;
  return (
    <div className="fixed inset-0 cs-z-authprompt" onMouseDown={(e) => e.target === e.currentTarget && onDismiss()}>
      <div className="absolute bg-white border border-stone-200 rounded-2xl shadow-xl p-4 cs-fade-anim" style={style}>
        <button onClick={onDismiss} className="absolute top-2.5 right-2.5 text-stone-300 hover:text-stone-500" aria-label="Dismiss">
          <X size={14} />
        </button>
        <div className="flex items-center gap-2 mb-1 pr-4">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-800 shrink-0">
            <SproutMark size={14} />
          </span>
          <p className="text-sm font-bold text-stone-900 leading-tight" style={displayFont}>Create a free account</p>
        </div>
        <p className="text-xs text-stone-500 mb-3">to {prompt.reason}.</p>
        <button onClick={onSignUp} className="w-full bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-xl transition">
          Sign up free
        </button>
        {onLogIn && (
          <>
            <p className="text-center text-xs font-medium text-stone-500 mt-3 mb-1.5">Already have an account?</p>
            <button onClick={onLogIn} className="w-full border-2 border-emerald-800 text-emerald-800 hover:bg-emerald-50 text-sm font-semibold py-2 rounded-xl transition">
              Log in
            </button>
          </>
        )}
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

  // If this account's shop was removed by the ABANDON_DAYS sweep (see
  // useMarketData.loadAll) while they were signed out, their own private
  // profile still points at it until they're back — only their own session
  // can write to it, so this is where that gets corrected.
  useEffect(() => {
    if (!me?.shopId || market.loading) return;
    if (!market.shopsById[me.shopId]) {
      updateMe({ isVendor: false, shopId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.shopId, market.loading, market.shopsById]);

  const fav = useFavorites(me);
  const notif = useNotifications(me);
  const convo = useConversations(me);
  const helpful = useHelpfulMarks(me);
  const mineReviews = useMyReviews(me);
  const restock = useRestockWatch(me);
  const sponsor = useSponsorships();
  const photos = usePhotoLibrary();

  const viewportHeight = useViewportHeight();
  // Only touch devices need the shell pinned to a JS-measured pixel height —
  // that's purely to dodge the on-screen keyboard (see SECTION 6b). On
  // desktop it actively hurt: window.visualViewport's resize event doesn't
  // reliably fire for every way a browser can zoom (ctrl+scroll, ctrl +/-,
  // trackpad pinch all behave differently across browsers), so the shell's
  // pinned pixel height could go stale after a zoom change while the real
  // viewport kept moving — the gap between the two showed up as a growing
  // blank strip at the bottom of the page, worst on the Storefront editor's
  // tall scrolling content. Desktop now always uses plain CSS 100dvh, which
  // tracks zoom natively with no JS in the loop to go stale.
  const isTouch = useIsTouchDevice();
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
  // Every avatar in the app that represents someone else opens this same
  // small card — pass just {id, name, avatar} and it looks the rest up.
  const [profileCardTarget, setProfileCardTarget] = useState(null);
  const openProfileCard = useCallback((target) => setProfileCardTarget(target), []);
  const [openProductId, setOpenProductId] = useState(null);
  // When a product is opened via its star rating (rather than the card
  // itself), the detail modal auto-scrolls straight to the review list.
  const [openProductFocusReviews, setOpenProductFocusReviews] = useState(false);
  const [toast, setToast] = useState("");
  // Anyone can browse without an account. The moment a guest tries to do
  // something that needs one — favorite, review, message, open a
  // sign-in-only screen — this is set, which drops them into the sign-up
  // flow instead of the screen/action they reached for. It carries the
  // route they were headed to (if any) so a successful sign-up can resume
  // there rather than dumping them back on Explore.
  const [authFlow, setAuthFlow] = useState(null);
  // The small "create a free account to X" card that pops up right next to
  // whatever the guest tapped — set by requireAuth below. It only hands off
  // to the full authFlow screen once its own "Sign up free" button is
  // pressed; dismissing it (X, or tapping outside) just leaves them browsing.
  const [authPrompt, setAuthPrompt] = useState(null);
  // A signed-in account can end up owning more than one shop (e.g. running
  // "Start Selling" again without ever deleting the old one) — set true once
  // they've picked a shop or skipped the picker, so it appears right after
  // signing in but doesn't nag on every subsequent navigation this session.
  const [shopGateResolved, setShopGateResolved] = useState(false);
  // Captured on every click, in the capture phase (so it's already current
  // by the time React's own onClick handlers — and therefore requireAuth —
  // run), purely so the popover above can anchor itself next to whatever was
  // actually clicked without threading a ref through every gated button.
  const lastClickRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      lastClickRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, []);
  const requireAuth = useCallback(
    (reason, pendingRoute) => {
      if (me) return true;
      setAuthPrompt({ reason, pendingRoute: pendingRoute || null, anchor: lastClickRef.current });
      return false;
    },
    [me]
  );

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

  // Returns whether it actually navigated (false means a guest just got the
  // sign-up popover instead) so callers that close their own modal/card
  // first — "Message" buttons on a quick-view card, say — can hold off on
  // that close until it's clear the trip is really happening. Otherwise the
  // card would vanish out from under the popover the instant it's tapped.
  const navigate = useCallback(
    (r) => {
      if (AUTH_REQUIRED_SCREENS.has(r.screen) && !me) {
        requireAuth(AUTH_REASON_BY_SCREEN[r.screen] || "continue", r);
        return false;
      }
      setRoute(r);
      return true;
    },
    [me, requireAuth]
  );
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  // Completed-search analytics: logs once per distinct term, never on a
  // mid-keystroke pause. logSearchTerm is called two ways — immediately when
  // the user submits (button or Enter), and as a fallback after 900ms of
  // typing inactivity for people who never explicitly submit. Either path
  // dedupes against the last logged term so the same search never logs twice.
  const lastLoggedSearchRef = useRef("");
  const logSearchTerm = useCallback((raw) => {
    const term = (raw || "").trim().toLowerCase();
    if (term.length < 2 || term === lastLoggedSearchRef.current) return;
    lastLoggedSearchRef.current = term;
    logAnalyticsEvent("search", { entityId: term });
  }, []);
  useEffect(() => {
    const t = setTimeout(() => logSearchTerm(globalSearch), 900);
    return () => clearTimeout(t);
  }, [globalSearch, logSearchTerm]);

  const [showSearchBurst, setShowSearchBurst] = useState(false);
  const submitSearch = useCallback(
    (term) => {
      logSearchTerm(term);
      navigate({ screen: "explore" });
      setShowSearchBurst(true);
    },
    [logSearchTerm, navigate]
  );

  // Favoriting has three effects: record the favorite, persist the new public
  // count through the market layer (so it re-renders), and tell the shop owner.
  const toggleFavorite = useCallback(
    async (type, entity) => {
      if (!requireAuth(type === "shop" ? "favorite this shop" : "favorite this item")) return;
      const result = await fav.toggle(type, entity);
      if (!result) return;
      const { added, newCount } = result;
      if (type === "shop") {
        market.updateShop(entity.id, { favoriteCount: newCount });
        if (added && entity.ownerId && entity.ownerId !== me.id) {
          notifyShopOwner(entity, "favorite", `${me.name} favorited your shop`, entity.name, undefined, me);
          logAnalyticsEvent("favorite", { entityId: entity.id, entityName: entity.name, shopId: entity.id, meta: { kind: "shop" } });
        }
      } else {
        market.updateProduct(entity.shopId, entity.id, { favoriteCount: newCount });
        const shop = market.shopsById[entity.shopId];
        if (added && shop?.ownerId && shop.ownerId !== me.id) {
          notifyShopOwner(
            shop,
            "favorite",
            `${me.name} favorited ${entity.name}`,
            entity.name,
            { screen: "product", productId: entity.id },
            me
          );
          logAnalyticsEvent("favorite", { entityId: entity.id, entityName: entity.name, shopId: entity.shopId, meta: { kind: "product" } });
        }
      }
    },
    [me, fav, market, requireAuth]
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
        logAnalyticsEvent("share", { entityId: entity.id, entityName: entity.name, shopId: entity.id, meta: { kind: "shop" } });
      } else {
        market.updateProduct(entity.shopId, entity.id, { shareCount: nextCount });
        logAnalyticsEvent("share", { entityId: entity.id, entityName: entity.name, shopId: entity.shopId, meta: { kind: "product" } });
      }
    },
    [market]
  );

  const productsById = useMemo(() => Object.fromEntries(market.products.map((p) => [p.id, p])), [market.products]);

  // No real payment processor yet — "purchasing" a plan is an explicit,
  // clearly-labeled test-mode action (see CheckoutScreen) that just sets the
  // tier + billing period on the profile, and reactivates a lapsed storefront
  // if the vendor is re-upping before the abandonment window (ABANDON_DAYS) closes.
  const purchasePlan = useCallback(
    async (tier, billing, billingDetails) => {
      if (!me) return;
      const now = Date.now();
      const periodEnd = addDays(now, billing === "annual" ? 365 : 30);
      const patch = { plan: { tier, billing, status: "active", startedAt: now, periodEnd, cancelledAt: null, refundPct: null } };
      // billingProfile persists across plan changes/cancellations — it's
      // identity info tied to the account, not to any one subscription term,
      // so it's kept separate from `plan` and only overwritten when someone
      // actually resubmits the checkout form (never cleared on cancel).
      if (billingDetails) {
        patch.billingProfile = { ...(me.billingProfile || {}), ...billingDetails, updatedAt: now };
      }
      await updateMe(patch);
      if (me.shopId) {
        const shop = market.shopsById[me.shopId];
        if (shop?.billingStatus === "inactive") {
          await market.updateShop(me.shopId, { billingStatus: "active", inactiveSince: null });
        }
      }
    },
    [me, updateMe, market]
  );

  // Cancelling locks Premium/Basic features immediately (tier reverts to
  // free right away, not at period end) and computes the test-mode refund:
  // 50% inside the first REFUND_WINDOW_DAYS of the current paid term, none
  // after. Any storefront goes inactive rather than being deleted outright.
  const cancelPlan = useCallback(async () => {
    if (!me || !me.plan?.startedAt) return { refundPct: 0 };
    const now = Date.now();
    const daysIn = daysBetween(me.plan.startedAt, now);
    const refundPct = daysIn <= REFUND_WINDOW_DAYS ? 50 : 0;
    await updateMe({ plan: { tier: "free", billing: null, status: "cancelled", startedAt: null, periodEnd: null, cancelledAt: now, refundPct } });
    if (me.shopId) {
      const shop = market.shopsById[me.shopId];
      if (shop?.billingStatus !== "inactive") {
        await market.updateShop(me.shopId, { billingStatus: "inactive", inactiveSince: now });
      }
    }
    return { refundPct };
  }, [me, updateMe, market]);

  // Thin auth-gated wrappers around the hooks' own toggles — the hooks
  // themselves stay reusable/null-safe on their own, but the *prompt* (as
  // opposed to a silent no-op) only makes sense with requireAuth in scope,
  // which lives here at the RootShell level.
  const toggleRestockWatch = useCallback(
    (productId) => (requireAuth("get a restock alert for this item") ? restock.toggleRestockWatch(productId) : null),
    [restock, requireAuth]
  );
  const toggleHelpfulMark = useCallback(
    (key) => (requireAuth("mark this review as helpful") ? helpful.toggleHelpfulMark(key) : null),
    [helpful, requireAuth]
  );

  const ctxValue = {
    me,
    requireAuth,
    updateMe,
    signOut,
    shops: market.shops,
    products: market.products,
    shopsById: market.shopsById,
    updateShop: market.updateShop,
    updateProduct: market.updateProduct,
    addProduct: market.addProduct,
    removeProduct: market.removeProduct,
    removeShop: market.removeShop,
    createShopForUser: market.createShopForUser,
    photoUrls: photos.photoUrls,
    loadPhoto: photos.loadPhoto,
    putPhoto: photos.putPhoto,
    restockWatches: restock.restockWatches,
    toggleRestockWatch,
    myReviews: mineReviews.myReviews,
    addMyReview: mineReviews.addMyReview,
    patchMyReview: mineReviews.patchMyReview,
    dropMyReview: mineReviews.dropMyReview,
    helpfulMarks: helpful.helpfulMarks,
    toggleHelpfulMark,
    favProducts: fav.favProducts,
    favShops: fav.favShops,
    toggleFavorite,
    incrementShare,
    purchasePlan,
    cancelPlan,
    sponsorships: sponsor.list,
    sponsorshipsLoading: sponsor.loading,
    createSponsorCampaign: sponsor.createCampaign,
    cancelSponsorCampaign: sponsor.cancelCampaign,
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
    openProfileCard,
    openProduct: (id) => {
      setOpenProductFocusReviews(false);
      setOpenProductId(id);
    },
    // Opens the same product detail modal, but scrolled straight to its
    // reviews — used by the clickable star rating on product cards.
    openProductReviews: (id) => {
      setOpenProductFocusReviews(true);
      setOpenProductId(id);
    },
    showToast,
    conversations: convo.conversations,
    ensureConversation: convo.ensureConversation,
    messageLabels: convo.labels,
    createMessageLabel: convo.createLabel,
    renameMessageLabel: convo.renameLabel,
    deleteMessageLabel: convo.deleteLabel,
    toggleConversationLabel: convo.toggleLabel,
    addLabelToConversations: convo.addLabelToConversations,
    toggleConversationStar: convo.toggleStar,
    toggleConversationImportant: convo.toggleImportant,
    trashConversations: convo.trashConversations,
    trashAllConversations: convo.trashAllConversations,
    restoreConversations: convo.restoreConversations,
    markConversationsSpam: convo.markAsSpam,
    markConversationsNotSpam: convo.markNotSpam,
    permanentlyDeleteConversations: convo.permanentlyDeleteConversations,
    emptyMessageTrash: convo.emptyTrash,
    setConversationDraft: convo.setDraft,
    scheduledMessages: convo.scheduled,
    scheduleMessage: convo.scheduleMessage,
    cancelScheduledMessage: convo.cancelScheduledMessage,
  };

  if (meLoading) return <LoadingScreen />;
  if (market.loading) return <LoadingScreen />;

  // An account can end up owning more than one shop — see removeShop's
  // comment for how. Give them the picker right after signing in, once per
  // session, rather than silently deciding for them via me.shopId.
  const myShops = me ? market.shops.filter((s) => s.ownerId === me.id) : [];
  if (me && myShops.length > 1 && !shopGateResolved) {
    return (
      <ChooseShopGate
        shops={myShops}
        activeShopId={me.shopId}
        onPick={async (shopId) => {
          await updateMe({ isVendor: true, shopId });
          setShopGateResolved(true);
        }}
        onDelete={async (shopId) => {
          await market.removeShop(shopId);
          if (me.shopId === shopId) {
            const remaining = myShops.filter((s) => s.id !== shopId);
            await updateMe(remaining.length === 1 ? { isVendor: true, shopId: remaining[0].id } : { isVendor: false, shopId: null });
          }
        }}
        onSkip={() => setShopGateResolved(true)}
      />
    );
  }

  // Guests fall straight through to the normal shell below and browse freely.
  // The sign-up flow only takes over the screen once something has actually
  // asked for it (see requireAuth / navigate above) — never up front.
  if (authFlow && !me) {
    if (!hasSession) {
      return <AuthGate reason={authFlow.reason} onCancel={() => setAuthFlow(null)} initialMode={authFlow.mode || "signin"} />;
    }
    return (
      <Onboarding
        reason={authFlow.reason}
        onCreate={async (d) => {
          const profile = await createProfile({ name: d.name, avatar: d.avatar, homeLocation: userLoc });
          await updateMe({
            billingProfile: {
              fullName: d.fullName,
              zipcode: d.zipcode,
              phone: d.phone,
              phoneVerified: true,
              email: profile.email || null,
              updatedAt: Date.now(),
            },
          });
          const pending = authFlow?.pendingRoute;
          setAuthFlow(null);
          // setRoute, not navigate — navigate would re-run the auth check
          // against this render's still-stale `me` closure and bounce right
          // back into requireAuth. We already know the account exists now.
          if (pending) setRoute(pending);
        }}
        onCancel={() => setAuthFlow(null)}
      />
    );
  }

  return (
    <AppContext.Provider value={ctxValue}>
      <link rel="stylesheet" href={FONT_LINK_HREF} />
      <GlobalStyles />
      <div className={`h-screen w-full flex flex-col overflow-hidden ${TOKENS.bg} ${TOKENS.ink}`} style={{ ...bodyFont, height: isTouch && viewportHeight ? `${viewportHeight}px` : "100dvh" }}>
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
          onOpenNotifs={() => (requireAuth("view notifications") ? setNotifOpen(true) : null)}
          onOpenAccount={() => (requireAuth("view your account") ? setAccountOpen(true) : null)}
          onOpenFavorites={() => navigate({ screen: "favorites" })}
          onSubmitSearch={submitSearch}
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
            {route.screen === "storeEditor" && <StorefrontEditor navigate={navigate} initialTab={route.tab} />}
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
            {route.screen === "orders" && <OrdersScreen navigate={navigate} initialTab={route.tab} />}
            {route.screen === "ads" && <AdsScreen navigate={navigate} />}
            {route.screen === "plans" && <PlansScreen navigate={navigate} />}
            {route.screen === "checkout" && <CheckoutScreen navigate={navigate} tier={route.tier} billing={route.billing} />}
            {route.screen === "places" && <PlacesScreen navigate={navigate} />}
            {route.screen === "profile" && <PublicProfileView userId={route.userId} navigate={navigate} />}
          </main>
        </div>
        <BottomNav route={route} navigate={navigate} />
      </div>

      <ProductDetailModal
        product={productsById[openProductId]}
        open={!!openProductId}
        focusReviews={openProductFocusReviews}
        onClose={() => {
          setOpenProductId(null);
          setOpenProductFocusReviews(false);
        }}
        navigate={navigate}
      />
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
      <ProfileCardModal target={profileCardTarget} onClose={() => setProfileCardTarget(null)} />

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg cs-z-sheet cs-toast-anim">
          {toast}
        </div>
      )}

      {showSearchBurst && <SearchSproutBurst onDone={() => setShowSearchBurst(false)} />}

      {authPrompt && (
        <AuthPromptPopover
          prompt={authPrompt}
          onDismiss={() => setAuthPrompt(null)}
          onSignUp={() => {
            setAuthFlow({ reason: authPrompt.reason, pendingRoute: authPrompt.pendingRoute, mode: "signup" });
            setAuthPrompt(null);
          }}
          onLogIn={() => {
            setAuthFlow({ reason: authPrompt.reason, pendingRoute: authPrompt.pendingRoute, mode: "signin" });
            setAuthPrompt(null);
          }}
        />
      )}
    </AppContext.Provider>
  );
}

export default function CropSwapApp() {
  return <RootShell />;
}
