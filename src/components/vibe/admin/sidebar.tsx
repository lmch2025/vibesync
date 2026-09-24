"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Gift,
  CreditCard,
  BarChart3,
  Settings,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { cn } from "@/lib/utils";
import type { AdminSectionId } from "./types";

type NavItem = {
  id: AdminSectionId;
  label: string;
  icon: LucideIcon;
};

const NAV: NavItem[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "moderation", label: "Modération", icon: ShieldCheck },
  { id: "gifts", label: "Cadeaux", icon: Gift },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Paramètres", icon: Settings },
];

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      data-active={active}
      className={cn(
        "group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="admin-nav-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full vibe-gradient"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export function Sidebar({
  active,
  onChange,
  onExit,
}: {
  active: AdminSectionId;
  onChange: (id: AdminSectionId) => void;
  onExit: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="px-2 py-3">
        <VibeLogo />
      </div>
      <div className="px-3 pb-2">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          Console Admin
        </p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => onChange(item.id)}
          />
        ))}
      </nav>
      <div className="mt-auto pt-4">
        <div className="rounded-xl bg-muted/60 p-3 ring-1 ring-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tiluu v1.0 — Console de modération et pilotage de l'économie Vibes.
          </p>
        </div>
        <button
          onClick={onExit}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour au site</span>
        </button>
      </div>
    </div>
  );
}

export { NAV as ADMIN_NAV };
