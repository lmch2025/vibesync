"use client";
// ActionSuccessModal — spectacular confirmation modal shown after a
// premium action executes successfully.
//
// Features:
//   - 16-particle confetti burst (radial, brand colors)
//   - Emoji spring bounce (the action's emoji pops in with a spring)
//   - "Action activée !" badge with vibe-gradient
//   - For buff actions (boost, spotlight, ghostMode, passport,
//     timeFreeze, crushAlert, goldenHeart): a CountdownRing preview
//     so the user sees the buff's duration ticking down
//   - Auto-dismiss after 4s for non-buff actions (icebreaker, seeLikes,
//     etc.); buff actions stay open until the user taps "Continuer"
//   - Dispatches `vivilov:buff-activated` custom event so the
//     ActiveBuffsSection refreshes instantly
//
// Controlled component: parent owns `open` state.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/vibe/i18n";
import { CountdownRing } from "./countdown-ring";
import { ConfettiBurst, haptic } from "./interactive-animations";
import type { BuffType } from "@/lib/vibe/use-active-buffs";

const BUFF_ACTIVATED_EVENT = "vivilov:buff-activated";

const BUFF_TYPES: BuffType[] = [
  "boost",
  "spotlight",
  "ghostMode",
  "passport",
  "timeFreeze",
  "crushAlert",
  "goldenHeart",
];

const BUFF_DURATIONS_MS: Record<BuffType, number> = {
  boost: 30 * 60 * 1000,
  spotlight: 60 * 60 * 1000,
  ghostMode: 60 * 60 * 1000,
  passport: 24 * 60 * 60 * 1000,
  timeFreeze: 15 * 60 * 1000,
  dailyDouble: 24 * 60 * 60 * 1000,
  crushAlert: 60 * 60 * 1000,
  goldenHeart: 60 * 60 * 1000,
};

// Métadonnées d'affichage des buffs — labelKey : clé i18n traduite au rendu.
const BUFF_META: Partial<Record<BuffType, { emoji: string; labelKey: string }>> = {
  boost: { emoji: "🚀", labelKey: "wallet.action.buff.boost" },
  spotlight: { emoji: "🔦", labelKey: "wallet.action.buff.spotlight" },
  ghostMode: { emoji: "👻", labelKey: "wallet.action.buff.ghostMode" },
  passport: { emoji: "✈️", labelKey: "wallet.action.buff.passport" },
  timeFreeze: { emoji: "❄️", labelKey: "wallet.action.buff.timeFreeze" },
  crushAlert: { emoji: "💘", labelKey: "wallet.action.buff.crushAlert" },
  goldenHeart: { emoji: "💛", labelKey: "wallet.action.buff.goldenHeart" },
};

export function ActionSuccessModal({
  open,
  onOpenChange,
  emoji,
  title,
  message,
  buffType,
  result,
  tip,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  emoji: string;
  title: string;
  message?: string;
  /// If provided, shows a CountdownRing preview + keeps modal open
  /// until the user dismisses it.
  buffType?: BuffType;
  /// Extra result content (free-form, e.g. icebreaker text, score, peek list).
  result?: React.ReactNode;
  /// Optional subtle cross-sell line (« 💡 Astuce ») — a complementary
  /// premium action suggested at the moment of highest delight. One muted
  /// line only, never a button: the sheet stays one tap away.
  tip?: string;
}) {
  const { t } = useI18n();
  const isBuff = !!buffType && BUFF_TYPES.includes(buffType);

  useEffect(() => {
    if (!open) return;

    // Haptic feedback when modal opens.
    haptic(isBuff ? [10, 30, 10] : 15);

    // Dispatch buff-activated event so ActiveBuffsSection refreshes.
    if (isBuff && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(BUFF_ACTIVATED_EVENT));
    }

    // Auto-dismiss after 4s for non-buff actions.
    if (!isBuff) {
      const t = setTimeout(() => onOpenChange(false), 4000);
      return () => clearTimeout(t);
    }
  }, [open, isBuff, onOpenChange]);

  const totalMs = buffType ? BUFF_DURATIONS_MS[buffType] : 0;
  const buffMeta = buffType ? BUFF_META[buffType] : undefined;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center px-4"
          onClick={() => onOpenChange(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm rounded-3xl bg-[#0a0612] immersive ring-1 ring-white/10 p-6 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 z-30 h-9 w-9 grid place-items-center rounded-full v-surface-2 backdrop-blur text-white hover:v-surface-3 transition"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Ambient gradient orbs */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 h-32 w-32 rounded-full bg-vibe-purple/25 blur-3xl" />
              <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-vibe-pink/20 blur-3xl" />
            </div>

            {/* Confetti burst */}
            <ConfettiBurst count={250} duration={3} />

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* "Action activée !" badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 280 }}
                className="inline-flex items-center gap-1.5 rounded-full vibe-gradient px-3 py-1 text-[10px] font-bold text-white mb-4"
              >
                ✨ {t("wallet.action.badge")}
              </motion.div>

              {/* Emoji spring bounce */}
              <motion.div
                initial={{ scale: 0, rotate: -30, y: 30 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 220,
                  damping: 12,
                }}
                className="text-6xl mb-3 drop-shadow-2xl"
              >
                {emoji}
              </motion.div>

              {/* Title */}
              <h3 className="font-display text-xl font-bold text-white mb-1">
                {title}
              </h3>
              {message && (
                <p className="text-sm text-white/70 mb-4">{message}</p>
              )}

              {/* Buff countdown preview */}
              {isBuff && buffType && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35, type: "spring" }}
                  className="my-3 flex flex-col items-center gap-2 rounded-2xl v-surface-1 ring-1 ring-white/10 px-5 py-4"
                >
                  <CountdownRing
                    type={buffType}
                    remainingMs={totalMs}
                    totalMs={totalMs}
                    progress={0}
                    size={72}
                    strokeWidth={6}
                    tone="media"
                  />
                  <p className="text-[11px] text-white/70 -mt-1">
                    {buffMeta?.emoji} {buffMeta ? t(buffMeta.labelKey) : ""} {t("wallet.action.active")}{" "}
                    <span className="text-white font-semibold">
                      {formatShort(totalMs, t)}
                    </span>
                  </p>
                </motion.div>
              )}

              {/* Extra result content (icebreaker text, score, etc.) */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-2 w-full text-sm"
                >
                  {result}
                </motion.div>
              )}

              {/* Subtle combo tip — one muted line, never pushy */}
              {tip && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-3 max-w-[300px] text-[11px] leading-relaxed text-white/55"
                >
                  {tip}
                </motion.p>
              )}

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => onOpenChange(false)}
                className="mt-5 w-full h-11 rounded-2xl vibe-gradient text-white font-display font-bold text-sm active:scale-95 transition vibe-glow"
              >
                {t("common.continue")}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/// Format ms as a short human-readable duration ("30 min", "1 h", "24 h").
function formatShort(
  ms: number,
  t: (key: string) => string,
): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} ${t("wallet.action.dayShort")}`;
}
