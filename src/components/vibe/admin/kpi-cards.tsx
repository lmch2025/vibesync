"use client";

import { motion } from "framer-motion";
import { Users, Activity, Heart, Euro, Gift, Percent, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useCurrency } from "@/lib/vibe/use-currency";
import { GemIcon } from "@/components/vibe/gem-badge";
import { AnimatedNumber } from "@/components/vibe/app/interactive-animations";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AdminKpis } from "./types";

type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  sub?: string;
  delta?: number; // percentage, can be negative
  icon: React.ReactNode;
  accent: "purple" | "pink" | "orange";
  delay?: number;
  loading?: boolean;
};

const ACCENT_BAR: Record<"purple" | "pink" | "orange", string> = {
  purple: "from-[oklch(0.55_0.24_295)] to-[oklch(0.62_0.2_295)]",
  pink: "from-[oklch(0.65_0.24_350)] to-[oklch(0.7_0.2_350)]",
  orange: "from-[oklch(0.72_0.19_55)] to-[oklch(0.8_0.16_55)]",
};

const ACCENT_ICON: Record<"purple" | "pink" | "orange", string> = {
  purple: "bg-primary/10 text-primary",
  pink: "bg-[oklch(0.65_0.24_350/0.12)] text-[oklch(0.55_0.24_350)]",
  orange: "bg-accent/15 text-accent",
};

function KpiCard({ label, value, sub, delta, icon, accent, delay = 0, loading }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      // Per-value transition: the stagger `delay` must only slow the entrance
      // opacity fade — hover lifts stay snappy (no delay, short duration).
      transition={{
        duration: 0.35,
        delay,
        y: { duration: 0.22, ease: "easeOut" },
      }}
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      <div className={cn("h-1 w-full bg-gradient-to-r", ACCENT_BAR[accent])} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <span className={cn("grid place-items-center h-8 w-8 rounded-lg", ACCENT_ICON[accent])}>
            {icon}
          </span>
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-24" />
        ) : (
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
              {value}
            </span>
            {typeof delta === "number" && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-1.5 py-0.5",
                  delta >= 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {delta >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </div>
        )}
        {sub && !loading && (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        )}
      </div>
    </motion.div>
  );
}

export function KpiCards({ kpis, loading }: { kpis: AdminKpis | null; loading: boolean }) {
  const { moneyCents, percent } = useCurrency();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      <KpiCard
        label="Utilisateurs"
        value={
          kpis ? (
            <AnimatedNumber
              value={kpis.users}
              duration={1100}
              format={(n) => Math.round(n).toLocaleString("fr-FR")}
            />
          ) : (
            "—"
          )
        }
        sub={`${kpis ? kpis.profiles.toLocaleString("fr-FR") : "—"} profils`}
        delta={4.2}
        accent="purple"
        icon={<Users className="h-4 w-4" />}
        delay={0}
        loading={loading}
      />
      <KpiCard
        label="DAU"
        value={
          kpis ? (
            <AnimatedNumber
              value={kpis.dau}
              duration={1100}
              format={(n) => Math.round(n).toLocaleString("fr-FR")}
            />
          ) : (
            "—"
          )
        }
        sub="Aujourd'hui"
        delta={2.8}
        accent="pink"
        icon={<Activity className="h-4 w-4" />}
        delay={0.05}
        loading={loading}
      />
      <KpiCard
        label="Matchs"
        value={
          kpis ? (
            <AnimatedNumber
              value={kpis.matches}
              duration={1100}
              format={(n) => Math.round(n).toLocaleString("fr-FR")}
            />
          ) : (
            "—"
          )
        }
        sub={`${kpis ? kpis.messages.toLocaleString("fr-FR") : "—"} messages`}
        delta={5.1}
        accent="orange"
        icon={<Heart className="h-4 w-4" />}
        delay={0.1}
        loading={loading}
      />
      <KpiCard
        label="Revenu"
        value={
          kpis ? (
            <AnimatedNumber
              value={kpis.revenueEurCents}
              duration={1100}
              format={(n) => moneyCents(Math.round(n))}
            />
          ) : (
            "—"
          )
        }
        sub={`${kpis ? kpis.payingUsers.toLocaleString("fr-FR") : "—"} payants`}
        delta={9.4}
        accent="purple"
        icon={<Euro className="h-4 w-4" />}
        delay={0.15}
        loading={loading}
      />
      <KpiCard
        label="Cadeaux"
        value={
          kpis ? (
            <AnimatedNumber
              value={kpis.gifts}
              duration={1100}
              format={(n) => Math.round(n).toLocaleString("fr-FR")}
            />
          ) : (
            "—"
          )
        }
        sub="Envoyés (total)"
        delta={6.7}
        accent="orange"
        icon={<Gift className="h-4 w-4" />}
        delay={0.2}
        loading={loading}
      />
      <KpiCard
        label="Conversion"
        value={
          kpis ? (
            <AnimatedNumber
              value={kpis.conversionRate}
              duration={1100}
              format={(n) => percent(n)}
            />
          ) : (
            "—"
          )
        }
        sub="Utilisateurs payants"
        delta={-0.6}
        accent="pink"
        icon={<Percent className="h-4 w-4" />}
        delay={0.25}
        loading={loading}
      />
    </div>
  );
}

export function CommissionCard({
  cents,
  loading,
}: {
  cents: number;
  loading: boolean;
}) {
  const { moneyCents } = useCurrency();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: 0.3,
        y: { duration: 0.22, ease: "easeOut" },
      }}
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl vibe-gradient p-5 text-white shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -right-2 bottom-2 text-6xl opacity-20">
        <BarChart3 className="h-16 w-16" />
      </div>
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-white/80">
          Commission plateforme
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-9 w-32 bg-white/20" />
        ) : (
          <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums">
            <AnimatedNumber
              value={cents}
              duration={1100}
              format={(n) => moneyCents(Math.round(n))}
            />
          </p>
        )}
        <p className="mt-2 text-xs text-white/80">
          30% de commission sur les cadeaux · <GemIcon className="inline h-3 w-3 -translate-y-0.5" /> économie Vibes
        </p>
      </div>
    </motion.div>
  );
}
