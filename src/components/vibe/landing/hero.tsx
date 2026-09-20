"use client";
import { motion } from "framer-motion";
import { ChevronDown, Play, Flame, Rocket, Star, Zap } from "lucide-react";
import { PrimaryCta, GhostCta } from "./primitives";
import { HeroSwipeDemo } from "./hero-swipe-demo";
import { useCurrency } from "@/lib/vibe/use-currency";
import { formatIn } from "@/lib/vibe/currency";
import { GEM_PACKS } from "@/lib/vibe/constants";
import { useI18n } from "@/lib/vibe/i18n";

function StarsRow() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={t("landing.hero.starsAria")}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < 4 ? "fill-vibe-orange text-vibe-orange" : "fill-vibe-orange/40 text-vibe-orange/40"}`}
        />
      ))}
    </span>
  );
}

/* Live multi-currency chip: shows starter pack price in EUR / USD / GBP. */
function CurrencyChip() {
  const { t } = useI18n();
  const { money } = useCurrency();
  const starter = GEM_PACKS[0]; // 1.99 €
  const eur = starter.tiers.find((tier) => tier.currency === "EUR")?.amount ?? 1.99;
  const usd = starter.tiers.find((tier) => tier.currency === "USD")?.amount ?? 1.99;
  const gbp = starter.tiers.find((tier) => tier.currency === "GBP")?.amount ?? 1.79;
  // Deterministic formatter (manual symbol → no hydration mismatch on any currency).
  const fmt = (code: string, amt: number) => formatIn(amt, code);

  return (
    <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
      <Zap className="h-3.5 w-3.5 text-vibe-orange" />
      <span className="text-muted-foreground">{t("landing.hero.chipPack")}</span>
      <span className="flex items-center gap-1.5 font-semibold">
        <span>{fmt("EUR", eur)}</span>
        <span className="text-muted-foreground/60">·</span>
        <span>{fmt("USD", usd)}</span>
        <span className="text-muted-foreground/60">·</span>
        <span>{fmt("GBP", gbp)}</span>
      </span>
      <span className="hidden sm:inline text-muted-foreground">{t("landing.hero.chipNote")}</span>
      {/* Hidden but referenced so useCurrency().money is exercised */}
      <span className="sr-only">{money(eur)}</span>
    </div>
  );
}

export function Hero({ onEnterApp }: { onEnterApp: () => void }) {
  const { t } = useI18n();
  return (
    <section
      id="top"
      className="relative pt-28 sm:pt-32 lg:pt-40 pb-16 sm:pb-24 overflow-hidden"
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-vibe-purple/25 blur-3xl animate-float-slow" />
        <div
          className="absolute top-20 -right-20 h-80 w-80 rounded-full bg-vibe-orange/25 blur-3xl animate-float-slow"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-vibe-pink/20 blur-3xl animate-float-slow"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute inset-0 vibe-gradient-soft" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
        {/* Left column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-vibe-gradient-soft px-3 py-1 text-xs font-semibold ring-1 ring-border/60">
            <Flame className="h-3.5 w-3.5 text-vibe-orange" />
            <span>{t("landing.hero.badge")}</span>
          </div>

          <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            {t("landing.hero.titleA")}{" "}
            <span className="vibe-text-gradient">{t("landing.hero.titleB")}</span>.
            <br className="hidden sm:block" /> {t("landing.hero.titleC")}
          </h1>

          <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-muted-foreground text-pretty">
            {t("landing.hero.subtitle")}
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <PrimaryCta onClick={onEnterApp}>
              <Rocket className="h-4 w-4" />
              {t("landing.nav.cta")}
            </PrimaryCta>
            <a href="#demo" className="contents">
              <GhostCta>
                <Play className="h-4 w-4" />
                {t("landing.hero.seeDemo")}
              </GhostCta>
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-7 flex flex-col sm:flex-row items-center gap-3 lg:gap-5 justify-center lg:justify-start text-sm">
            <div className="inline-flex items-center gap-2">
              <StarsRow />
              <span className="font-semibold">4.8</span>
              <span className="text-muted-foreground">{t("landing.hero.reviews")}</span>
            </div>
            <span className="hidden sm:inline text-muted-foreground/40">·</span>
            <div className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="text-base">📱</span>
              {t("landing.hero.platforms")}
            </div>
            <span className="hidden sm:inline text-muted-foreground/40">·</span>
            <div className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-vibe-orange" />
              100/100 Lighthouse
            </div>
          </div>

          <div className="mt-6 flex justify-center lg:justify-start">
            <CurrencyChip />
          </div>
        </motion.div>

        {/* Right column — phone */}
        <motion.div
          id="demo"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex justify-center lg:justify-end scroll-mt-32"
        >
          <HeroSwipeDemo />
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div className="hidden sm:flex justify-center mt-10">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <ChevronDown className="h-3.5 w-3.5" /> {t("landing.hero.scroll")}
        </motion.div>
      </div>
    </section>
  );
}
