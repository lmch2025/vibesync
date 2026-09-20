"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/vibe/i18n";

type Stat = { value: number; suffix?: string; prefix?: string; label: string; format?: "int" | "dec" };

// label = clé i18n (résolue au rendu via t()).
const STATS: Stat[] = [
  { value: 12840, label: "landing.stats.activeUsers", format: "int" },
  { value: 2.3, suffix: "M", label: "landing.stats.swipes", format: "dec" },
  { value: 87, suffix: "%", label: "landing.stats.matchRate" },
  { value: 0, prefix: "0€", label: "landing.stats.zero" },
];

function useCountUp(target: number, run: boolean, duration = 1200, format?: "int" | "dec") {
  const { lang } = useI18n();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  if (format === "dec") return val.toFixed(1);
  // Séparateur de milliers selon la langue active (12 840 fr / 12,840 en).
  return Math.round(val).toLocaleString(lang === "en" ? "en-US" : "fr-FR");
}

function StatCell({ stat, run, index }: { stat: Stat; run: boolean; index: number }) {
  const { t } = useI18n();
  const numeric = useCountUp(stat.value, run, 1200, stat.format);
  const isZero = stat.value === 0;
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center px-4 py-6 lg:py-8",
        "border-r last:border-r-0 border-border/60",
        index < 2 && "sm:border-r",
        index === 1 && "sm:border-r-0 lg:border-r"
      )}
    >
      <div className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
        <span className="vibe-text-gradient">
          {stat.prefix}
          {!isZero && numeric}
          {stat.suffix}
        </span>
      </div>
      <div className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-[10rem]">{t(stat.label)}</div>
    </div>
  );
}

export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section className="relative py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          ref={ref}
          className="glass rounded-3xl ring-1 ring-border/60 shadow-lg grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:grid-cols-2 lg:divide-x divide-border/60 overflow-hidden"
        >
          {STATS.map((s, i) => (
            <StatCell key={i} stat={s} run={inView} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
