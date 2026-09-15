"use client";
// PremiumActionsSheet — elegant bottom sheet showing all premium actions.
// Appears when the user taps a "✨ Premium" button or when contextually relevant.
// Each action has: emoji, label, description, cost, and triggers the real effect.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X, Zap } from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { PREMIUM_ACTIONS, type PremiumAction } from "@/lib/vibe/constants";
import { useVibe } from "@/lib/vibe/store";
import { toast } from "sonner";

type ActiveEffect = {
  action: PremiumAction;
  result: any;
} | null;

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
    requireVibes(action.cost, `${action.emoji} ${action.label} (${action.cost} Vibes)`, async () => {
      try {
        const res = await fetch("/api/vibe/gems/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: action.key }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        // Show the effect modal.
        setActiveEffect({ action, result: data });
        if (data.message) toast.success(data.message);
        onOpenChange(false);
      } catch (e: any) {
        toast.error(e.message || "Erreur");
      } finally {
        setBusy(null);
      }
    });
    setBusy(null);
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
                <button onClick={() => onOpenChange(false)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
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

      {/* Effect modal — shows the result of a premium action */}
      <EffectModal effect={activeEffect} onClose={() => setActiveEffect(null)} />
    </>
  );
}

/// Effect modal — shows a beautiful animation + result for the executed action.
function EffectModal({ effect, onClose }: { effect: ActiveEffect; onClose: () => void }) {
  const { action, result } = effect ?? {};
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (effect) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
      // Auto-close after 5s for non-interactive results.
      if (!result?.peek && !result?.online && !result?.likers && !result?.report) {
        const t = setTimeout(() => { setShow(false); setTimeout(onClose, 300); }, 3500);
        return () => clearTimeout(t);
      }
    }
  }, [effect]);

  if (!action || !result) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center px-4"
          onClick={() => { setShow(false); setTimeout(onClose, 300); }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm rounded-3xl bg-zinc-900 ring-1 ring-white/10 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Big emoji burst */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="text-6xl text-center mb-3"
            >
              {action.emoji}
            </motion.div>

            <h3 className="font-display text-xl font-bold text-center text-white mb-1">{action.label}</h3>
            <p className="text-sm text-white/60 text-center mb-4">{action.description}</p>

            {/* Action-specific result content */}
            <div className="space-y-2 mb-4">
              {result.message && (
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white/80 text-center">
                  {result.message}
                </div>
              )}

              {result.peek && result.peek.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Aperçu des 3 prochains</p>
                  {result.peek.map((p: any) => (
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
                  {result.online.map((p: any) => (
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
                  {result.likers.map((l: any) => (
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

            <button
              onClick={() => { setShow(false); setTimeout(onClose, 300); }}
              className="w-full h-11 rounded-2xl vibe-gradient text-white font-bold text-sm active:scale-95 transition"
            >
              Continuer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
