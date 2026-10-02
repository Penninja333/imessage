import { useState, useEffect } from "react";

const APP_URL = "https://imessage-fwxv.onrender.com/";

const FEATURES = [
  {
    icon: "💬",
    title: "Real-time messaging",
    desc: "Socket.io-powered delivery. Messages arrive instantly — no refresh, no polling.",
  },
  {
    icon: "🎨",
    title: "11 accent themes",
    desc: "From Sky to Spotify to Netflix. Pick your vibe and it syncs across devices.",
  },
  {
    icon: "🖼️",
    title: "Media sharing",
    desc: "Send photos and videos with automatic optimization via ImageKit.",
  },
  {
    icon: "🌙",
    title: "Light & dark mode",
    desc: "System-aware theming that respects your OS preference or your explicit choice.",
  },
  {
    icon: "🟢",
    title: "Online presence",
    desc: "See who's online at a glance with real-time presence tracking.",
  },
  {
    icon: "🔔",
    title: "Push notifications",
    desc: "Never miss a message. FCM + APNs keep you in the loop on mobile.",
  },
];

const THEMES = [
  { name: "Default", accent: "oklch(0.6204 0.195 253.83)" },
  { name: "Sky", accent: "oklch(0.58 0.16 230)" },
  { name: "Lavender", accent: "oklch(0.58 0.18 285)" },
  { name: "Mint", accent: "oklch(0.58 0.16 160)" },
  { name: "Netflix", accent: "oklch(0.52 0.22 25)" },
  { name: "Spotify", accent: "oklch(0.58 0.2 145)" },
  { name: "Discord", accent: "oklch(0.52 0.18 275)" },
  { name: "Airbnb", accent: "oklch(0.58 0.2 18)" },
  { name: "Coinbase", accent: "oklch(0.5 0.2 265)" },
  { name: "Uber", accent: "oklch(0.28 0.02 265)" },
  { name: "Rabbit", accent: "oklch(0.72 0.16 65)" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 md:h-16">
        <a href="#" className="flex items-center gap-2.5">
          <span className="text-xl font-bold tracking-tight text-foreground">iMessage</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <a href="#features" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Features</a>
          <a href="#themes" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Themes</a>
          <a href="#download" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Download</a>
          <a
            href={APP_URL}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105 active:scale-95"
          >
            Open app
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-24 pb-16 sm:px-6 sm:pt-32 md:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-3xl text-center" style={{ animation: "fade-up 0.6s ease-out" }}>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Real-time · Cross-platform · Open source
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Chat that feels like it should.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          A real-time messaging platform with themes, media sharing, online presence, and push
          notifications. Built with React, Socket.io, and Clerk auth.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={APP_URL}
            className="w-full rounded-2xl bg-accent px-6 py-3.5 text-center text-base font-semibold text-accent-foreground shadow-lg shadow-accent/30 transition-transform hover:scale-105 active:scale-95 sm:w-auto"
          >
            Open iMessage →
          </a>
          <a
            href="#features"
            className="w-full rounded-2xl border border-border bg-background px-6 py-3.5 text-center text-base font-semibold text-foreground transition-colors hover:bg-muted/50 sm:w-auto"
          >
            See features
          </a>
        </div>
      </div>
      <div className="mx-auto mt-14 max-w-4xl">
        <div
          className="relative rounded-2xl border border-border bg-muted/30 p-2 shadow-2xl shadow-black/10"
          style={{ animation: "float 5s ease-in-out infinite" }}
        >
          <div className="flex gap-1.5 px-2 py-1.5">
            <div className="size-3 rounded-full bg-danger" />
            <div className="size-3 rounded-full bg-warning" />
            <div className="size-3 rounded-full bg-success" />
          </div>
          <div className="rounded-xl bg-background p-3 sm:p-5">
            <div className="flex gap-3">
              <div className="flex w-28 shrink-0 flex-col gap-2 sm:w-40">
                <div className="flex items-center gap-2 rounded-lg bg-accent/10 p-2">
                  <div className="size-7 rounded-full bg-accent" />
                  <div className="h-2 flex-1 rounded bg-accent/30" />
                </div>
                <div className="flex items-center gap-2 rounded-lg p-2">
                  <div className="size-7 rounded-full bg-muted" />
                  <div className="h-2 flex-1 rounded bg-muted" />
                </div>
                <div className="flex items-center gap-2 rounded-lg p-2">
                  <div className="size-7 rounded-full bg-muted" />
                  <div className="h-2 flex-1 rounded bg-muted" />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 rounded-lg bg-muted/20 p-3">
                <div className="self-end rounded-2xl bg-accent px-3 py-2">
                  <div className="h-2 w-20 rounded bg-accent-foreground/60" />
                </div>
                <div className="self-start rounded-2xl bg-background px-3 py-2 shadow-sm">
                  <div className="h-2 w-24 rounded bg-muted-foreground/40" />
                </div>
                <div className="self-start rounded-2xl bg-background px-3 py-2 shadow-sm">
                  <div className="h-2 w-16 rounded bg-muted-foreground/40" />
                </div>
                <div className="self-end rounded-2xl bg-accent px-3 py-2">
                  <div className="h-2 w-14 rounded bg-accent-foreground/60" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to chat
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Built with production-grade tooling — not a toy.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-background p-6 transition-colors hover:border-accent/40"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-1.5 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThemeShowcase() {
  const [active, setActive] = useState(0);
  return (
    <section id="themes" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          11 themes. Your vibe.
        </h2>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Switch accents instantly. Your choice syncs across web and mobile.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-2.5 sm:gap-3">
          {THEMES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setActive(i)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                active === i ? "border-accent scale-105 shadow-lg" : "border-border hover:border-muted"
              }`}
            >
              <div
                className="size-10 rounded-full sm:size-12"
                style={{ backgroundColor: t.accent }}
              />
              <span className="text-xs font-medium text-muted-foreground">{t.name}</span>
            </button>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-sm">
          <div
            className="rounded-2xl p-8 text-center shadow-xl transition-colors"
            style={{ backgroundColor: THEMES[active].accent, color: "white" }}
          >
            <p className="text-lg font-semibold">{THEMES[active].name} theme</p>
            <p className="mt-1 text-sm opacity-80">This is what your accent looks like in chat.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Download() {
  return (
    <section id="download" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Get started
        </h2>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          The web app is live now. Mobile apps for iOS and Android are coming soon.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={APP_URL}
            className="w-full rounded-2xl bg-accent px-6 py-4 text-center font-semibold text-accent-foreground shadow-lg shadow-accent/30 transition-transform hover:scale-105 active:scale-95 sm:w-auto"
          >
            🌐 Open web app
          </a>
          <div className="w-full rounded-2xl border border-border bg-background px-6 py-4 text-center font-semibold text-muted-foreground sm:w-auto">
            📱 iOS — coming soon
          </div>
          <div className="w-full rounded-2xl border border-border bg-background px-6 py-4 text-center font-semibold text-muted-foreground sm:w-auto">
            🤖 Android — coming soon
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">iMessage</span>
          <span className="text-sm text-muted-foreground">© 2026</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href={APP_URL} className="hover:text-foreground">Open app</a>
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#themes" className="hover:text-foreground">Themes</a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <Nav />
      <Hero />
      <Features />
      <ThemeShowcase />
      <Download />
      <Footer />
    </div>
  );
}
