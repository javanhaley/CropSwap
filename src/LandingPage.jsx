import React from "react";
import {
  Search,
  MessageCircle,
  Store,
  Users,
  Sparkles,
  ArrowRight,
  Leaf,
  Egg,
  Flower2,
  TreeDeciduous,
  ClipboardList,
  ShoppingBasket,
  Handshake,
  Heart,
  Sprout,
} from "lucide-react";

const displayFont = { fontFamily: "'Fraunces', serif" };
const bodyFont = { fontFamily: "'Inter', sans-serif" };

// What a shopper finds on CropSwap — the "What Will You Find?" chip list.
const FIND_TAGS = [
  "Backyard gardens",
  "Family farms",
  "Garden surplus",
  "Eggs & farm goods",
  "Flowers & plants",
  "Orchards & fruit growers",
  "Farmstands",
  "Small-scale growers",
  "Seasonal harvests",
  "Local producers",
];

const SHOPPER_FEATURES = [
  { icon: Search, title: "Discover what's nearby", body: "Search by what you're looking for and find growers in your local area." },
  { icon: Handshake, title: "Shop local, directly", body: "No middlemen. No complicated checkout. Connect directly with the person who grows it." },
  { icon: Users, title: "Know your grower", body: "See who is growing your food and learn more about their garden, farm, or farmstand." },
  { icon: Sparkles, title: "Find something new", body: "Discover growers and local food sources you may never have known existed." },
];

const GROWER_FEATURES = [
  { icon: ShoppingBasket, title: "Showcase your harvest", body: "Post what you're growing and let local shoppers see what's available." },
  { icon: Store, title: "Build your storefront", body: "Create a simple home for your garden, farm, or farmstand." },
  { icon: Leaf, title: "Turn surplus into opportunity", body: "Have more tomatoes than you need? A bumper crop of peppers? Extra eggs? Let your neighbors know." },
  { icon: MessageCircle, title: "Talk directly to customers", body: "Use CropSwap's built-in messaging to answer questions, arrange pickup, and build relationships with local customers." },
  { icon: Heart, title: "Build your local following", body: "Become the grower people in your community know to check when they're looking for fresh, local food." },
];

const STEPS = [
  { icon: Sprout, label: "GROW", body: "Gardens, farms, orchards, chickens, greenhouses, and more." },
  { icon: ClipboardList, label: "LIST", body: "Show your community what you're growing and what's available." },
  { icon: Search, label: "DISCOVER", body: "Shoppers search CropSwap to find local growers." },
  { icon: MessageCircle, label: "CONNECT", body: "Message each other and make arrangements directly." },
];

function SectionEyebrow({ children }) {
  return <p className="text-xs font-bold tracking-wide uppercase text-brand-swap mb-2">{children}</p>;
}

function PrimaryButton({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 bg-brand-swap hover:brightness-110 text-white font-bold px-6 py-3.5 rounded-full shadow-sm transition ${className}`}
    >
      {children}
      <ArrowRight size={17} />
    </button>
  );
}

function SecondaryButton({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-brand-swap font-bold px-6 py-3.5 rounded-full border-2 border-brand-swap transition ${className}`}
    >
      {children}
    </button>
  );
}

// The marketing homepage shown to a first-time guest at cropswapmarket.com,
// before they've ever browsed the real app — see the `showLanding` gate in
// RootShell. `onExplore` drops them into the normal Explore grid; `onSell`
// starts sign-up headed for the Start Selling flow; `onSignIn` is the small
// "Sign in" escape hatch for a returning grower who landed here anyway (a
// cleared browser, a fresh device, etc).
export default function LandingPage({ onExplore, onSell, onSignIn }) {
  return (
    <div className="h-screen w-full overflow-y-auto bg-white text-stone-800" style={{ ...bodyFont, height: "100dvh" }}>
      {/* Top bar */}
      <header className="max-w-6xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
        <img src="/branding/cropswap-wordmark-transparent.png" alt="CropSwap" className="h-8 sm:h-9 w-auto" />
        <div className="flex items-center gap-4 sm:gap-5">
          <button onClick={onSignIn} className="text-sm font-semibold text-stone-600 hover:text-brand-swap transition">
            Sign in
          </button>
          <button
            onClick={onSell}
            className="hidden sm:inline-flex text-sm font-bold text-white bg-brand-swap hover:brightness-110 px-4 py-2 rounded-full transition"
          >
            Start selling
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 pt-8 sm:pt-14 pb-16 sm:pb-20 text-center">
        <span className="inline-flex items-center gap-1.5 bg-brand-crop/15 text-brand-swap text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full mb-6">
          <Leaf size={13} /> Local growers, right in your neighborhood
        </span>
        <h1 className="text-4xl sm:text-6xl font-bold text-stone-900 leading-[1.08] mb-5" style={displayFont}>
          What&rsquo;s Growing Near You?
        </h1>
        <p className="text-lg sm:text-xl text-brand-swap font-semibold mb-4">Discover fresh food from the people who grow it.</p>
        <p className="text-stone-600 max-w-2xl mx-auto mb-3 leading-relaxed">
          CropSwap connects backyard gardeners, family farmers, farmstand owners, and local growers with the people who want to buy what
          they grow.
        </p>
        <p className="text-stone-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          See what&rsquo;s available nearby. Discover local growers. Message them directly. Find your next favorite farmstand, garden, or
          family farm.
          <br className="hidden sm:block" /> Local food starts with knowing who grows it.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <PrimaryButton onClick={onExplore}>Explore What&rsquo;s Growing</PrimaryButton>
          <SecondaryButton onClick={onSell}>Showcase Your Garden or Farm</SecondaryButton>
        </div>
      </section>

      {/* Your Community Has More Growing Than You Think */}
      <section className="bg-stone-50 border-y border-stone-100 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-6" style={displayFont}>
            Your Community Has More Growing Than You Think.
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left mb-8">
            {[
              "A backyard garden overflowing with tomatoes.",
              "A family farm with extra eggs.",
              "A farmstand with today's harvest.",
              "A gardener with more zucchini than they know what to do with.",
              "A small grower trying to build a local customer base.",
            ].map((line) => (
              <p key={line} className="flex items-start gap-2 text-stone-600 text-sm sm:text-base">
                <Leaf size={16} className="text-brand-crop shrink-0 mt-1" />
                {line}
              </p>
            ))}
          </div>
          <p className="text-stone-700 font-semibold max-w-xl mx-auto">
            CropSwap brings them all together in one place. Instead of wondering &ldquo;Who grows this near me?&rdquo;, shoppers can
            search, discover, and connect with local growers.
          </p>
        </div>
      </section>

      {/* For Shoppers */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="max-w-2xl mb-10">
          <SectionEyebrow>For Shoppers</SectionEyebrow>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3" style={displayFont}>
            Find food grown around the corner.
          </h2>
          <p className="text-stone-600 leading-relaxed">
            Search CropSwap to discover gardeners, farmers, farmstands, and local growers in your community. Find out what&rsquo;s
            growing. See what&rsquo;s available. Explore local storefronts. Then message the grower directly.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 mb-10">
          {SHOPPER_FEATURES.map((f) => (
            <div key={f.title} className="bg-white border border-stone-200 rounded-2xl p-5">
              <span className="w-10 h-10 rounded-xl bg-brand-crop/15 text-brand-swap flex items-center justify-center mb-3">
                <f.icon size={19} />
              </span>
              <p className="font-bold text-stone-900 mb-1">{f.title}</p>
              <p className="text-sm text-stone-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-stone-700 font-semibold mb-5">Stop searching grocery store shelves. Start searching your neighborhood.</p>
          <PrimaryButton onClick={onExplore}>Find Local Growers</PrimaryButton>
        </div>
      </section>

      {/* For Growers */}
      <section className="bg-brand-swap text-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold tracking-wide uppercase text-brand-crop mb-2">For Growers</p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={displayFont}>
              You grow it. CropSwap helps people find it.
            </h2>
            <p className="text-emerald-100 leading-relaxed">
              You don&rsquo;t need a giant farm, a storefront, or a complicated website. If you grow something people want, you belong on
              CropSwap. Create your own storefront and show your community what you&rsquo;re growing.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {GROWER_FEATURES.map((f) => (
              <div key={f.title} className="bg-white/10 border border-white/15 rounded-2xl p-5">
                <span className="w-10 h-10 rounded-xl bg-brand-crop text-brand-swap flex items-center justify-center mb-3">
                  <f.icon size={19} />
                </span>
                <p className="font-bold mb-1">{f.title}</p>
                <p className="text-sm text-emerald-100/90 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="font-semibold mb-5 text-emerald-50">You don&rsquo;t need thousands of customers. You need the right ones nearby.</p>
            <button
              onClick={onSell}
              className="inline-flex items-center justify-center gap-2 bg-brand-crop hover:brightness-105 text-brand-swap font-bold px-6 py-3.5 rounded-full shadow-sm transition"
            >
              Create Your Free Storefront <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* Not Another Online Store */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
        <SectionEyebrow>Not Another Online Store</SectionEyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-5" style={displayFont}>
          CropSwap is where local growers get discovered.
        </h2>
        <p className="text-stone-600 leading-relaxed mb-3">
          CropSwap isn&rsquo;t trying to replace your farmstand. It isn&rsquo;t trying to become another giant marketplace. And we
          don&rsquo;t process transactions on the site.
        </p>
        <p className="text-stone-600 leading-relaxed mb-3">Instead, CropSwap gives growers something they often don&rsquo;t have: a place to be found.</p>
        <p className="text-stone-700 font-semibold leading-relaxed mb-3">
          Think of it as a search engine for local food and a digital storefront for the people growing it.
        </p>
        <p className="text-stone-600 leading-relaxed">
          Shoppers discover what&rsquo;s available. Growers showcase what they&rsquo;re growing. And when there&rsquo;s a match, they
          connect directly.
        </p>
      </section>

      {/* A Better Way to Buy Local — Grow/List/Discover/Connect */}
      <section className="bg-stone-50 border-y border-stone-100 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <SectionEyebrow>A Better Way to Buy Local</SectionEyebrow>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3" style={displayFont}>
              From your backyard to your neighborhood.
            </h2>
            <p className="text-stone-600 leading-relaxed">
              The best local food doesn&rsquo;t always come with a website, a marketing team, or a fancy storefront. Sometimes it&rsquo;s
              growing three streets away. Sometimes it&rsquo;s at a tiny family farm you&rsquo;ve driven past for years. Sometimes your
              neighbor has 40 pounds of tomatoes they need to find a home for. CropSwap makes those connections easier.
            </p>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.label} className="bg-white border border-stone-200 rounded-2xl p-5 text-center relative">
                <span className="w-11 h-11 mx-auto rounded-full bg-brand-crop/15 text-brand-swap flex items-center justify-center mb-3">
                  <s.icon size={20} />
                </span>
                <p className="text-xs font-extrabold tracking-widest text-brand-swap mb-1.5">{s.label}</p>
                <p className="text-sm text-stone-500 leading-relaxed">{s.body}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight size={16} className="hidden sm:block absolute top-1/2 -right-3.5 -translate-y-1/2 text-stone-300" />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-stone-700 font-semibold mt-8">Simple. Local. Human.</p>
        </div>
      </section>

      {/* Your Local Harvest Has a Story */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4" style={displayFont}>
          Your Local Harvest Has a Story.
        </h2>
        <p className="text-stone-600 leading-relaxed mb-3">
          Behind every tomato, egg, bunch of flowers, or basket of peaches is someone who grew it. CropSwap helps put a face to local
          food.
        </p>
        <p className="text-stone-700 font-semibold mb-5">Meet the people behind your harvest.</p>
        <div className="grid sm:grid-cols-3 gap-4 text-left mb-2">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-2.5">
            <Flower2 size={18} className="text-brand-crop shrink-0 mt-0.5" />
            <p className="text-sm text-stone-600">Discover the backyard gardener who grows incredible heirloom tomatoes.</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-2.5">
            <Egg size={18} className="text-brand-crop shrink-0 mt-0.5" />
            <p className="text-sm text-stone-600">Find the family farm raising eggs down the road.</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-start gap-2.5">
            <TreeDeciduous size={18} className="text-brand-crop shrink-0 mt-0.5" />
            <p className="text-sm text-stone-600">Follow the farmstand with the best peaches in town.</p>
          </div>
        </div>
        <p className="text-stone-600 mt-5">Support the people who are growing something in your community.</p>
      </section>

      {/* What Will You Find? */}
      <section className="bg-stone-50 border-y border-stone-100 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-6" style={displayFont}>
            What Will You Find?
          </h2>
          <div className="flex flex-wrap justify-center gap-2.5 mb-6">
            {FIND_TAGS.map((tag) => (
              <span key={tag} className="bg-white border border-stone-200 text-stone-700 text-sm font-semibold px-4 py-2 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-stone-700 font-semibold">If it&rsquo;s grown locally, it belongs on CropSwap.</p>
        </div>
      </section>

      {/* Built for Local Connections */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center">
        <SectionEyebrow>Built for Local Connections</SectionEyebrow>
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4" style={displayFont}>
          No complicated checkout. No corporate middleman.
        </h2>
        <p className="text-stone-600 leading-relaxed mb-5">
          CropSwap keeps things simple. We help people find each other. You decide what you&rsquo;re offering. You decide who you sell
          to. You decide how pickup, payment, and everything else works. CropSwap provides the discovery, storefront, and messaging
          tools that make the connection possible.
        </p>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-swap text-white py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={displayFont}>
            Your Garden Could Be Someone&rsquo;s Grocery Store.
          </h2>
          <p className="text-emerald-100 leading-relaxed mb-8 max-w-xl mx-auto">
            You don&rsquo;t need acres of land to grow something valuable. You just need something growing. CropSwap gives your harvest
            a place to be discovered. Ready to show your community what you&rsquo;re growing?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onSell}
              className="inline-flex items-center justify-center gap-2 bg-brand-crop hover:brightness-105 text-brand-swap font-bold px-6 py-3.5 rounded-full shadow-sm transition"
            >
              Create Your Storefront <ArrowRight size={17} />
            </button>
            <button
              onClick={onExplore}
              className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/10 text-white font-bold px-6 py-3.5 rounded-full border-2 border-white/40 transition"
            >
              Explore CropSwap
            </button>
          </div>
          <p className="text-emerald-100/80 text-sm mt-4">Looking for something fresh and local? Explore CropSwap.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-5 sm:px-8 py-10 text-center">
        <img src="/branding/cropswap-wordmark-transparent.png" alt="CropSwap" className="h-7 w-auto mx-auto mb-3" />
        <p className="text-stone-500 text-sm mb-1">Grow local. Find local. Swap local.</p>
        <p className="text-stone-400 text-xs mb-4">The place to discover what&rsquo;s growing in your community.</p>
        <p className="text-stone-400 text-xs">For gardeners. For farmers. For farmstands. For families. For neighbors.</p>
        <button onClick={onExplore} className="mt-5 text-sm font-bold text-brand-swap underline underline-offset-2">
          See what&rsquo;s growing nearby
        </button>
      </footer>
    </div>
  );
}
