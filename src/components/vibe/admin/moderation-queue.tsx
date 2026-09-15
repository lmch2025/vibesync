"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Bot, User, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SuccessBounce } from "@/components/vibe/app/interactive-animations";
import { cn } from "@/lib/utils";
import type { AdminReport } from "./types";

function timeAgo(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - d);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "à l'instant";
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const days = Math.floor(h / 24);
    return `il y a ${days} j`;
  } catch {
    return iso;
  }
}

// Try to extract "IA: 87%" style score from reason
function extractAiScore(reason: string): string | null {
  const m = reason.match(/(\d{1,3})\s*%/);
  return m ? m[1] : null;
}

function SourceBadge({ source }: { source: "ai" | "user" }) {
  if (source === "ai") {
    return (
      <Badge className="bg-primary/15 text-primary border-transparent gap-1">
        <Bot className="h-3 w-3" /> IA
      </Badge>
    );
  }
  return (
    <Badge className="bg-accent/15 text-accent border-transparent gap-1">
      <User className="h-3 w-3" /> Utilisateur
    </Badge>
  );
}

function ReportCard({
  report,
  onAction,
  busy,
}: {
  report: AdminReport;
  onAction: (id: string, action: "approve" | "remove") => void;
  busy: boolean;
}) {
  const score = extractAiScore(report.reason);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        x: 40,
        scale: 0.95,
        transition: { duration: 0.22, ease: "easeOut" },
      }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-sm flex flex-col sm:flex-row"
    >
      {/* Poster */}
      <div className="relative w-full sm:w-[120px] aspect-[3/4] sm:aspect-auto shrink-0 bg-muted">
        <Image
          src={report.profile.posterUrl || "/profiles/lea.png"}
          alt={report.profile.displayName}
          fill
          sizes="120px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        {/* AI score overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {score && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/20">
              <Bot className="h-3 w-3" /> IA {score}%
            </span>
          )}
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white text-sm font-semibold drop-shadow leading-tight truncate">
            {report.profile.displayName}
          </p>
          <p className="text-white/80 text-[11px]">
            {report.profile.age} ans · {report.profile.city}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={report.source} />
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {timeAgo(report.createdAt)}
          </span>
          {report.status !== "pending" && (
            <Badge variant="outline" className="ml-auto text-xs">
              {report.status === "approved" ? "Approuvé" : "Supprimé"}
            </Badge>
          )}
        </div>

        <div className="rounded-lg bg-muted/60 ring-1 ring-border px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            Motif du signalement
          </p>
          <p className="text-sm mt-0.5">{report.reason}</p>
        </div>

        {report.profile.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            « {report.profile.bio} »
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <motion.button
            type="button"
            onClick={() => onAction(report.id, "approve")}
            disabled={busy}
            whileTap={busy ? undefined : { scale: 0.95 }}
            className={cn(
              buttonVariants({
                variant: "default",
                size: "sm",
                className:
                  "bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1.5",
              })
            )}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approuver
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onAction(report.id, "remove")}
            disabled={busy}
            whileTap={busy ? undefined : { scale: 0.95 }}
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "sm",
                className:
                  "text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg gap-1.5",
              })
            )}
          >
            <X className="h-3.5 w-3.5" />
            Supprimer
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export function ModerationQueue() {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/vibe/admin/reports")
      .then(async (r) => {
        if (r.status === 403) throw new Error("Accès refusé, connectez-vous en admin");
        if (!r.ok) throw new Error("Erreur lors du chargement de la file");
        return r.json() as Promise<{ reports: AdminReport[] }>;
      })
      .then((d) => setReports(d.reports))
      .catch((e: Error) => {
        setError(e.message);
        setReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onAction = async (id: string, action: "approve" | "remove") => {
    setBusyId(id);
    // Optimistic: remove from list immediately
    setReports((curr) => (curr ? curr.filter((r) => r.id !== id) : curr));
    try {
      const r = await fetch(`/api/vibe/admin/reports/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (r.status === 403) {
        toast.error("Accès refusé");
        // reload to restore
        load();
        return;
      }
      if (!r.ok) throw new Error();
      toast.success(
        action === "approve"
          ? "Vidéo approuvée — profil conservé"
          : "Vidéo supprimée — profil rejeté"
      );
    } catch {
      toast.error("Échec de l'action, réessaye");
      // Restore by reloading
      load();
    } finally {
      setBusyId(null);
    }
  };

  const pending = reports?.filter((r) => r.status === "pending") ?? [];
  const count = pending.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">File de modération vidéo</span>
          <Badge className="bg-primary/10 text-primary border-transparent">
            {loading ? "…" : count} en attente
          </Badge>
        </div>
        <motion.button
          type="button"
          onClick={load}
          disabled={loading}
          whileTap={loading ? undefined : { scale: 0.95 }}
          className={cn(buttonVariants({ variant: "outline", size: "sm", className: "rounded-lg" }))}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Rafraîchir
        </motion.button>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm ring-1 ring-destructive/20">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-2xl bg-card ring-1 ring-border p-3"
            >
              <Skeleton className="h-32 w-24 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && count === 0 && !error && (
        <div className="rounded-2xl bg-card ring-1 ring-border p-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 grid place-items-center mb-3">
            <SuccessBounce>
              <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </SuccessBounce>
          </div>
          <p className="font-display text-lg font-semibold">File vide — aucune vidéo signalée 🎉</p>
          <p className="text-sm text-muted-foreground mt-1">
            La communauté est sage. Nouveaux signalements apparaîtront ici en temps réel.
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {!loading && count > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[640px] overflow-y-auto scrollbar-vibe pr-1">
            {pending.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                onAction={onAction}
                busy={busyId === r.id}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
