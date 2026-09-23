"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ShieldAlert, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { Sidebar, ADMIN_NAV } from "./sidebar";
import { KpiCards, CommissionCard } from "./kpi-cards";
import { RevenueChart, RetentionChart, GiftsChart } from "./charts";
import { UsersTable } from "./users-table";
import { ModerationQueue } from "./moderation-queue";
import { GiftCatalog } from "./gift-catalog";
import { Analytics } from "./analytics";
import { Settings } from "./settings";
import type { AdminSectionId, AdminStats } from "./types";

const SECTION_TITLES: Record<AdminSectionId, { title: string; subtitle: string }> = {
  overview: {
    title: "Vue d'ensemble",
    subtitle: "Pilotage temps réel de l'économie Tiluu",
  },
  users: {
    title: "Utilisateurs",
    subtitle: "Recherche et modération des comptes",
  },
  moderation: {
    title: "Modération Vidéo",
    subtitle: "File de signalements IA & utilisateurs",
  },
  gifts: {
    title: "Cadeaux",
    subtitle: "Catalogue des cadeaux virtuels et tarification",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Acquisition, conversion et grilles tarifaires multi-devises",
  },
  settings: {
    title: "Paramètres",
    subtitle: "Configuration de la plateforme",
  },
};

function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch("/api/vibe/admin/stats", { signal: controller.signal })
      .then(async (r) => {
        if (r.status === 403) throw new Error("Accès refusé, connectez-vous en admin");
        if (!r.ok) throw new Error("Erreur lors du chargement des statistiques");
        return r.json() as Promise<AdminStats>;
      })
      .then((d) => {
        if (!alive) return;
        setStats(d);
      })
      .catch((e: Error) => {
        if (!alive || e.name === "AbortError") return;
        setError(e.message);
        toast.error(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  return { stats, loading, error };
}

function SectionWrapper({ id, children }: { id: AdminSectionId; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.section>
    </AnimatePresence>
  );
}

export default function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [section, setSection] = useState<AdminSectionId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [year, setYear] = useState(2025);
  const { stats, loading, error } = useAdminStats();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setYear(new Date().getFullYear());
  }, []);

  const meta = SECTION_TITLES[section];

  const changeSection = (id: AdminSectionId) => {
    setSection(id);
    setMobileNavOpen(false);
  };

  const onGlobalSearchChange = (v: string) => {
    setGlobalSearch(v);
    if (v && section !== "users") setSection("users");
  };

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <div className="min-h-screen bg-muted/30 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-72 shrink-0 border-r border-border bg-sidebar/50 backdrop-blur-sm">
          <div className="sticky top-0 h-screen w-full">
            <Sidebar active={section} onChange={changeSection} onExit={onExit} />
          </div>
        </aside>

        {/* Mobile sidebar content (portal) */}
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation admin</SheetTitle>
          <Sidebar active={section} onChange={changeSection} onExit={onExit} />
        </SheetContent>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
            <SheetTrigger asChild>
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                className={cn(
                  buttonVariants({
                    variant: "ghost",
                    size: "icon",
                    className: "lg:hidden rounded-lg",
                  })
                )}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu</span>
              </motion.button>
            </SheetTrigger>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight truncate">
                  {meta.title}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
                  <ShieldAlert className="h-3 w-3" /> Admin
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {meta.subtitle}
              </p>
            </div>

            {/* Global search — drives the users section */}
            <div className="hidden md:block relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur…"
                value={globalSearch}
                onChange={(e) => onGlobalSearchChange(e.target.value)}
                className="pl-9 rounded-xl h-9"
              />
            </div>

            <div className="flex items-center gap-2 rounded-full bg-card ring-1 ring-border pl-1 pr-3 py-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-bold">
                  VS
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-semibold">Admin VS</p>
                <p className="text-[10px] text-muted-foreground">Super-admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          {error && section === "overview" && (
            <div className="mb-5 rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm ring-1 ring-destructive/20 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && section === "overview" && (
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Chargement des statistiques…</span>
            </div>
          )}

          <SectionWrapper id={section}>
            {section === "overview" && (
              <div className="space-y-5">
                <KpiCards kpis={stats?.kpis ?? null} loading={loading} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <RevenueChart
                    series={stats?.series.revenue ?? []}
                    loading={loading}
                  />
                  <RetentionChart
                    series={stats?.series.retention ?? []}
                    loading={loading}
                  />
                  <GiftsChart
                    series={stats?.series.gifts ?? []}
                    loading={loading}
                  />
                </div>

                <CommissionCard
                  cents={stats?.kpis.platformCommissionCents ?? 0}
                  loading={loading}
                />
              </div>
            )}

            {section === "users" && (
              <UsersTable
                externalQ={globalSearch}
                onExternalQChange={onGlobalSearchChange}
              />
            )}

            {section === "moderation" && <ModerationQueue />}

            {section === "gifts" && <GiftCatalog />}

            {section === "analytics" && (
              <Analytics
                kpis={stats?.kpis ?? null}
                series={
                  stats?.series ?? { retention: [], revenue: [], gifts: [] }
                }
                loading={loading}
              />
            )}

            {section === "settings" && <Settings />}
          </SectionWrapper>
        </main>

        {/* Quick stats footer */}
        <footer className="border-t border-border bg-background/60 px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Système opérationnel
            </span>
            <Separator />
            <span>
              {ADMIN_NAV.length} modules · Tiluu Console
            </span>
            <Separator />
            <span className="ml-auto">
              © {year} Tiluu — Démo admin
            </span>
          </div>
        </footer>
      </div>
      </div>
    </Sheet>
  );
}

function Separator() {
  return <span className="hidden sm:inline text-border">·</span>;
}
