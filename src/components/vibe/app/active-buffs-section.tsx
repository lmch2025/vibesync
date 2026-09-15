"use client";
// ActiveBuffsSection — shows all currently-active premium action buffs
// as a grid of cards. Each card has a CountdownRing, the buff emoji +
// label, and the time remaining.
//
// Fetches from `/api/vibe/active-buffs` via the `useActiveBuffs` hook
// (15s poll + instant refresh on `vivilov:buff-activated`).
//
// Layout: 2-column grid. Empty state shows a friendly CTA ("Aucun buff
// actif — active un Boost pour être en haut de la file !").
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useActiveBuffs, type ActiveBuff } from "@/lib/vibe/use-active-buffs";
import { CountdownRing } from "./countdown-ring";

export function ActiveBuffsSection() {
  const { buffs, loading } = useActiveBuffs();

  if (loading && buffs.length === 0) {
    return (
      <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Rocket className="h-4 w-4 text-accent" />
          <h3 className="font-display font-bold text-sm">Buffs actifs</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (buffs.length === 0) {
    return (
      <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-5 text-center">
        <div className="text-3xl mb-2">✨</div>
        <p className="font-display font-bold text-sm">Aucun buff actif</p>
        <p className="text-[11px] text-white/50 mt-1">
          Active un <span className="text-accent">Boost</span> pour être en
          haut de la file !
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Rocket className="h-4 w-4 text-accent" />
          <h3 className="font-display font-bold text-sm">Buffs actifs</h3>
        </div>
        <span className="text-[10px] text-white/40">
          {buffs.length} actif{buffs.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {buffs.map((buff, i) => (
          <BuffCard key={buff.type + i} buff={buff} index={i} />
        ))}
      </div>
    </div>
  );
}

function BuffCard({ buff, index }: { buff: ActiveBuff; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06 * index, type: "spring", stiffness: 280, damping: 26 }}
      className="relative rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] ring-1 ring-white/10 p-3 flex flex-col items-center gap-2 overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-6 -right-6 h-16 w-16 rounded-full blur-2xl pointer-events-none opacity-50"
        style={{ backgroundColor: ambientColor(buff.type) }}
      />
      <div className="relative flex items-center gap-2 w-full">
        <CountdownRing
          type={buff.type}
          remainingMs={buff.remainingMs}
          totalMs={buff.totalMs}
          progress={buff.progress}
          size={48}
          strokeWidth={4}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-base leading-none">{buff.emoji}</span>
            <p className="font-display font-bold text-xs truncate">
              {buff.label}
            </p>
          </div>
          <p className="text-[9px] text-white/50 leading-tight mt-0.5 line-clamp-2">
            {buff.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/// Ambient glow color per buff type (matches CountdownRing gradients).
function ambientColor(type: ActiveBuff["type"]): string {
  const map: Record<ActiveBuff["type"], string> = {
    boost: "oklch(0.72 0.19 55)",
    spotlight: "oklch(0.65 0.24 350)",
    ghostMode: "oklch(0.55 0.24 295)",
    passport: "oklch(0.7 0.15 230)",
    timeFreeze: "oklch(0.78 0.12 210)",
    dailyDouble: "oklch(0.65 0.24 350)",
    crushAlert: "oklch(0.65 0.25 15)",
    goldenHeart: "oklch(0.82 0.16 85)",
  };
  return map[type] ?? "oklch(0.55 0.24 295)";
}
