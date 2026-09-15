"use client";

import { motion } from "framer-motion";
import { Heart, Percent, Euro, Activity } from "lucide-react";
import { useCurrency } from "@/lib/vibe/use-currency";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CURRENCIES, GEM_PACKS, type GemPack } from "@/lib/vibe/constants";
import { formatIn } from "@/lib/vibe/currency";
import { cn } from "@/lib/utils";
import { CombinedChart } from "./charts";
import type { AdminKpis } from "./types";

function fmtTier(amount: number, currencyCode: string): string {
  return formatIn(amount, currencyCode);
}

function MiniKpi({
  label,
  value,
  sub,
  icon,
  accent,
  loading,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: "purple" | "pink" | "orange";
  loading?: boolean;
  delay?: number;
}) {
  const accents = {
    purple: "bg-primary/10 text-primary",
    pink: "bg-[oklch(0.65_0.24_350/0.12)] text-[oklch(0.55_0.24_350)]",
    orange: "bg-accent/15 text-accent",
  } as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl bg-card ring-1 ring-border shadow-sm p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </span>
        <span className={cn("grid place-items-center h-7 w-7 rounded-lg", accents[accent])}>
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      )}
      {sub && !loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export function Analytics({
  kpis,
  series,
  loading,
}: {
  kpis: AdminKpis | null;
  series: { retention: number[]; revenue: number[]; gifts: number[] };
  loading: boolean;
}) {
  const { moneyCents, percent, currency: activeCurrency } = useCurrency();

  const arpu = kpis && kpis.users > 0 ? kpis.revenueEurCents / kpis.users : 0;
  const retentionJ1 = series.retention[1] ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MiniKpi
          label="Taux de match"
          value={kpis ? percent(kpis.matchRate) : "—"}
          sub="Matchs / Likes"
          accent="purple"
          icon={<Heart className="h-4 w-4" />}
          loading={loading}
          delay={0}
        />
        <MiniKpi
          label="Conversion payante"
          value={kpis ? percent(kpis.conversionRate) : "—"}
          sub={`${kpis?.payingUsers ?? 0} payants`}
          accent="pink"
          icon={<Percent className="h-4 w-4" />}
          loading={loading}
          delay={0.05}
        />
        <MiniKpi
          label="ARPU"
          value={kpis ? moneyCents(Math.round(arpu)) : "—"}
          sub="Revenu / utilisateur"
          accent="orange"
          icon={<Euro className="h-4 w-4" />}
          loading={loading}
          delay={0.1}
        />
        <MiniKpi
          label="Rétention J+1"
          value={`${retentionJ1.toFixed(0)}%`}
          sub="Utilisateurs actifs à J+1"
          accent="purple"
          icon={<Activity className="h-4 w-4" />}
          loading={loading}
          delay={0.15}
        />
      </div>

      <CombinedChart revenue={series.revenue} gifts={series.gifts} loading={loading} />

      <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-wrap items-center gap-2 border-b border-border">
          <h3 className="font-display font-semibold text-sm sm:text-base">
            Grilles tarifaires — Packs de Vibes
          </h3>
          <Badge variant="outline" className="text-xs">
            6 devises · prix fixes régionaux
          </Badge>
          <p className="ml-auto text-xs text-muted-foreground">
            La devise active ({activeCurrency}) est surlignée.
          </p>
        </div>
        <div className="overflow-x-auto scrollbar-vibe">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Pack</TableHead>
                <TableHead className="text-right">Vibes</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                {Object.values(CURRENCIES).map((c) => (
                  <TableHead key={c.code} className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <span>{c.flag}</span>
                      <span className="text-[11px] text-muted-foreground">{c.code}</span>
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {GEM_PACKS.map((p: GemPack) => {
                const tiersByCur: Record<string, number> = {};
                p.tiers.forEach((t) => (tiersByCur[t.currency] = t.amount));
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            p.accent === "purple" && "bg-primary",
                            p.accent === "orange" && "bg-accent",
                            p.accent === "pink" && "bg-[oklch(0.65_0.24_350)]"
                          )}
                        />
                        <span className="font-medium text-sm capitalize">{p.id}</span>
                        {p.popular && (
                          <Badge className="bg-accent/15 text-accent border-transparent text-[10px]">
                            Populaire
                          </Badge>
                        )}
                        {p.bestValue && (
                          <Badge className="bg-primary/10 text-primary border-transparent text-[10px]">
                            Meilleur tarif
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {p.gems.toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {p.bonus > 0 ? `+${p.bonus}` : "—"}
                    </TableCell>
                    {Object.values(CURRENCIES).map((c) => {
                      const active = activeCurrency === c.code;
                      return (
                        <TableCell
                          key={c.code}
                          className={cn(
                            "text-right tabular-nums",
                            active && "bg-primary/5 font-semibold text-primary"
                          )}
                        >
                          {fmtTier(tiersByCur[c.code] ?? 0, c.code)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
