"use client";
// PremiumActionsSheet — elegant bottom sheet showing all premium actions.
// Appears when the user taps a "✨ Premium" button or when contextually relevant.
// Each action has: emoji, label, description, cost, and triggers the real effect.
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X, Zap } from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { PREMIUM_ACTIONS, type PremiumAction } from "@/lib/vibe/constants";
import { useVibe } from "@/lib/vibe/store";
import { toast } from "sonner";
import { ActionSuccessModal } from "./action-success-modal";
import { celebrate } from "./interactive-animations";
import type { BuffType } from "@/lib/vibe/use-active-buffs";

/// Result payload returned by POST /api/vibe/gems/spend — the shape varies
/// per action (peek list, online list, likers, compatibility score, mood…).
type ActionResult = {
  message?: string;
  gems?: number;
  freeGems?: number;
  peek?: { id: string; displayName: string; age: number; city: string }[];
  online?: { id: string; displayName: string; age: number; city: string; distanceKm: number; lastActive: string }[];
  likers?: { id: string; displayName: string; age: number; city: string; direction: string }[];
  score?: number;
  report?: { vibe: string; ageGap: string; location: string; recommendation: string };
  mood?: string;
  undoneCount?: number;
  active?: boolean;
  expiresAt?: string;
  icebreaker?: string;
  error?: string;
};

type ActiveEffect = {
  action: PremiumAction;
  result: ActionResult;
} | null;

/// Premium actions that grant a timed buff — mapped onto the shared BuffType
/// union so ActionSuccessModal shows its countdown ring preview.
const BUFF_ACTION_KEYS: Partial<Record<PremiumAction["key"], BuffType>> = {
  boost: "boost",
  spotlight: "spotlight",
  ghostMode: "ghostMode",
  passport: "passport",
  timeFreeze: "timeFreeze",
  crushAlert: "crushAlert",
  goldenHeart: "goldenHeart",
};

export function PremiumActionsSheet({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category?: "swipe" | "profile" | "social" | "meta" | "all";
}) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const requireVibes = useVibe((s) => s.requireVibes);
  const [activeEffect, setActiveEffect] = useState<ActiveEffect>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Stable closer — keeps ActionSuccessModal's auto-dismiss timer untouched
  // across parent re-renders.
  const closeSuccess = useCallback(() => setActiveEffect(null), []);

  const actions = category
    ? category === "all"
      ? PREMIUM_ACTIONS
      : PREMIUM_ACTIONS.filter((a) => a.category === category)
    : PREMIUM_ACTIONS;

  const grouped = {
    swipe: actions.filter((a) => a.category === "swipe"),
    social: actions.filter((a) => a.category === "social"),
    profile: actions.filter((a) => a.category === "profile"),
    meta: actions.filter((a) => a.category === "meta"),
  };

  async function execute(action: PremiumAction) {
    setBusy(action.key);
    // requireVibes invokes `proceed` synchronously when the balance is enough,
    // and opens the insufficient-gems modal otherwise. Track which one happened
    // so busy is released by the async flow's `finally` (the spinner now really
    // shows) — or immediately when the action never started.
    let started = false;
    requireVibes(action.cost, `${action.emoji} ${action.label} (${action.cost} Vibes)`, async () => {
      started = true;
      // Light launch feedback — the real celebration lives in ActionSuccessModal.
      celebrate({ sound: "pop", confettiCount: 0, hapticPattern: 10 });
      try {
        const res = await fetch("/api/vibe/gems/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: action.key }),
        });
        const data: ActionResult = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        if (data.message) toast.success(data.message);
        // Celebrate through the shared success modal (emoji, label, buff countdown).
        setActiveEffect({ action, result: data });
        onOpenChange(false);
      } catch (e: any) {
        toast.error(e.message || "Erreur");
      } finally {
        setBusy(null);
      }
    });
    if (!started) setBusy(null);
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl bg-zinc-900 ring-1 ring-white/10 p-4 pb-6 max-h-[70vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-lg flex items-center gap-1.5">
                  <Crown className="h-5 w-5 text-accent" /> Actions Premium
                </h3>
                <motion.button onClick={() => onOpenChange(false)} whileTap={{ scale: 0.88 }} className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10">
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              <div className="flex items-center gap-1.5 mb-4 rounded-full bg-white/5 ring-1 ring-white/10 px-3 py-1.5">
                <GemIcon className="h-4 w-4" />
                <span className="text-sm font-bold tabular-nums">{me?.gems ?? 0}</span>
                <span className="text-xs text-white/40">Vibes</span>
              </div>

              {Object.entries(grouped).map(([cat, items]) => items.length > 0 && (
                <div key={cat} className="mb-4">
                  <p className="text-[10px] uppercase tracking-wide text-white/30 font-semibold mb-2">
                    {cat === "swipe" ? "🎯 Swipe" : cat === "social" ? "💬 Social" : cat === "profile" ? "👤 Profil" : "⚙️ Méta"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((action) => (
                      <motion.button
                        key={action.key}
                        onClick={() => execute(action)}
                        disabled={busy === action.key}
                        whileTap={{ scale: 0.95 }}
                        className="relative flex flex-col items-start gap-1 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 hover:bg-white/10 transition disabled:opacity-50 text-left"
                      >
                        <span className="text-2xl">{action.emoji}</span>
                        <span className="text-xs font-bold leading-tight">{action.label}</span>
                        <span className="text-[10px] text-white/50 leading-tight">{action.description}</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-fuchsia-300 font-semibold mt-1">
                          <GemIcon className="h-2.5 w-2.5" /> {action.cost}
                        </span>
                        {busy === action.key && (
                          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/50">
                            <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-vibe-purple animate-spin" />
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success modal — celebrates the executed action (emoji, label,
          buff countdown ring) and carries the action-specific result. */}
      <ActionSuccessModal
        open={activeEffect !== null}
        onOpenChange={closeSuccess}
        emoji={activeEffect?.action.emoji ?? "✨"}
        title={activeEffect?.action.label ?? ""}
        message={activeEffect?.action.description}
        buffType={activeEffect ? BUFF_ACTION_KEYS[activeEffect.action.key] : undefined}
        result={activeEffect ? <EffectResult result={activeEffect.result} /> : undefined}
      />
    </>
  );
}

/// EffectResult — rich, action-specific result content rendered inside
/// ActionSuccessModal's `result` slot (peek lists, online list, likers,
/// compatibility score, mood, rewind count, icebreaker…). Same content the
/// old in-house effect modal used to display.
function EffectResult({ result }: { result: ActionResult }) {
  return (
    <div className="space-y-2">
      {result.message && (
        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white/80 text-center">
          {result.message}
        </div>
      )}

      {result.peek && result.peek.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Aperçu des 3 prochains</p>
          {result.peek.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <span className="text-lg">👤</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.displayName}, {p.age}</p>
                <p className="text-[10px] text-white/40">{p.city}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.online && result.online.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold">📍 En ligne maintenant</p>
          {result.online.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <span className="relative">
                <span className="text-lg">👤</span>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-zinc-900" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.displayName}, {p.age}</p>
                <p className="text-[10px] text-white/40">{p.city} · {p.distanceKm}km · {p.lastActive}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.likers && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-amber-300 font-semibold">👁️ Ils t'ont liké</p>
          {result.likers.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <span className="text-lg">{l.direction === "superlike" ? "⭐" : "❤️"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{l.displayName}, {l.age}</p>
                <p className="text-[10px] text-white/40">{l.city}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.score !== undefined && (
        <div className="space-y-2">
          <div className="rounded-xl bg-gradient-to-br from-vibe-purple/20 to-vibe-pink/20 ring-1 ring-white/10 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-white/40">Score de compatibilité</p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="font-display text-4xl font-black vibe-text-gradient"
            >
              {result.score}%
            </motion.p>
          </div>
          {result.report && (
            <div className="space-y-1 text-[11px] text-white/60">
              <p>🎯 {result.report.vibe}</p>
              <p>🎂 {result.report.ageGap}</p>
              <p>📍 {result.report.location}</p>
              <p className="font-medium text-white/80 mt-1">{result.report.recommendation}</p>
            </div>
          )}
        </div>
      )}

      {result.mood && (
        <div className="rounded-xl bg-gradient-to-br from-vibe-purple/20 to-vibe-pink/20 ring-1 ring-white/10 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Humeur actuelle</p>
          <p className="font-display text-2xl font-bold">{result.mood}</p>
        </div>
      )}

      {result.undoneCount !== undefined && (
        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white/80 text-center">
          ↩️ {result.undoneCount} swipe{result.undoneCount > 1 ? "s" : ""} annulé{result.undoneCount > 1 ? "s" : ""} — le{result.undoneCount > 1 ? "s" : ""} profil{result.undoneCount > 1 ? "s" : ""} revient{result.undoneCount > 1 ? "ent" : ""} dans ton deck !
        </div>
      )}

      {result.active && !result.message && (
        <div className="rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/30 px-3 py-2 text-sm text-emerald-300 text-center">
          ✅ Action activée avec succès !
        </div>
      )}

      {result.expiresAt && (
        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white/80 text-center">
          🚀 Boost actif pendant 30 minutes — tu es en haut de la file !
        </div>
      )}

      {result.icebreaker && (
        <div className="rounded-xl bg-vibe-gradient-soft ring-1 ring-white/10 px-3 py-3 text-sm text-white/90 italic text-center">
          &ldquo;{result.icebreaker}&rdquo;
        </div>
      )}
    </div>
  );
}
