"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  type TooltipProps,
} from "recharts";
import { useCurrency } from "@/lib/vibe/use-currency";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminStats } from "./types";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const RETENTION_LABELS = ["J0", "J+1", "J+2", "J+3", "J+4", "J+5", "J+6"];

function GlassTooltip({ active, payload, label, valueSuffix }: TooltipProps<number, string> & { valueSuffix?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl glass-dark px-3 py-2 text-xs shadow-xl ring-1 ring-white/10">
      <p className="font-semibold text-white/90 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-white">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-white/70">{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">
            {typeof p.value === "number" ? p.value.toLocaleString("fr-FR") : p.value}
            {valueSuffix ? ` ${valueSuffix}` : ""}
          </span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ series, loading }: { series: number[]; loading: boolean }) {
  const { moneyCents } = useCurrency();
  const data = useMemo(
    () =>
      series.map((cents, i) => ({
        day: DAYS[i] ?? `J${i}`,
        revenue: cents / 100,
        label: moneyCents(cents),
      })),
    [series, moneyCents]
  );

  return (
    <Card className="rounded-2xl ring-1 ring-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Revenu Vibes (7j)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="bar-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.55 0.24 295)" />
                  <stop offset="100%" stopColor="oklch(0.62 0.2 295 / 0.55)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.02 295)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.02 295)" }}
                tickFormatter={(v) => `${v.toFixed(0)} €`}
              />
              <Tooltip
                cursor={{ fill: "oklch(0.55 0.24 295 / 0.06)" }}
                content={<GlassTooltip valueSuffix="€" />}
              />
              <Bar dataKey="revenue" name="Revenu" fill="url(#bar-revenue)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function RetentionChart({ series, loading }: { series: number[]; loading: boolean }) {
  const data = useMemo(
    () => series.map((v, i) => ({ day: RETENTION_LABELS[i] ?? `J+${i}`, retention: v })),
    [series]
  );

  return (
    <Card className="rounded-2xl ring-1 ring-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Rétention J+1..J+7</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="area-retention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.24 350 / 0.45)" />
                  <stop offset="100%" stopColor="oklch(0.65 0.24 350 / 0.02)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.02 295)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.02 295)" }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                cursor={{ stroke: "oklch(0.65 0.24 350 / 0.4)", strokeWidth: 1 }}
                content={<GlassTooltip valueSuffix="%" />}
              />
              <Area
                type="monotone"
                dataKey="retention"
                name="Rétention"
                stroke="oklch(0.65 0.24 350)"
                strokeWidth={2.5}
                fill="url(#area-retention)"
                dot={{ r: 3, fill: "oklch(0.65 0.24 350)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function GiftsChart({ series, loading }: { series: number[]; loading: boolean }) {
  const data = useMemo(
    () => series.map((v, i) => ({ day: DAYS[i] ?? `J${i}`, gifts: v })),
    [series]
  );

  return (
    <Card className="rounded-2xl ring-1 ring-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Cadeaux envoyés (7j)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.02 295)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.02 295)" }}
              />
              <Tooltip
                cursor={{ stroke: "oklch(0.72 0.19 55 / 0.4)", strokeWidth: 1 }}
                content={<GlassTooltip />}
              />
              <Line
                type="monotone"
                dataKey="gifts"
                name="Cadeaux"
                stroke="oklch(0.72 0.19 55)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "oklch(0.72 0.19 55)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function CombinedChart({
  revenue,
  gifts,
  loading,
}: {
  revenue: number[];
  gifts: number[];
  loading: boolean;
}) {
  const data = useMemo(
    () =>
      revenue.map((cents, i) => ({
        day: DAYS[i] ?? `J${i}`,
        revenue: cents / 100,
        gifts: gifts[i] ?? 0,
      })),
    [revenue, gifts]
  );

  return (
    <Card className="rounded-2xl ring-1 ring-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Revenu vs Cadeaux (7j)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.02 295)" }}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.55 0.24 295)" }}
                tickFormatter={(v) => `${v.toFixed(0)}€`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.72 0.19 55)" }}
              />
              <Tooltip content={<GlassTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenu (€)"
                stroke="oklch(0.55 0.24 295)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "oklch(0.55 0.24 295)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="gifts"
                name="Cadeaux"
                stroke="oklch(0.72 0.19 55)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "oklch(0.72 0.19 55)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
