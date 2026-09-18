"use client";
// SmartNudgeBanner — an elegant, floating contextual recommendation for a
// premium action. Shown at circumstantial moments (a pass on a compatible
// profile, an empty conversation, a locked anti-spam chat, a claimable
// streak…), it carries ONE clear message + ONE CTA, then dismisses itself.
//
// Design: pill with a per-tone gradient edge, ambient glow, spring entrance,
// auto-dismiss after 9 s (progress hairline), close ✕, tap CTA → callback.
// The parent decides placement (above the swipe action bar / chat composer).
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { haptic } from "./interactive-animations";
import { nudgeOnce } from "@/lib/vibe/nudges";

export type SmartNudge = {
  id: string;
  emoji: string;
  /// The circumstantial, textual incentive — short, warm, specific.
  text: string;
  /// CTA label (e.g. "Annuler (2 💎)", "Découvrir").
  ctaLabel: string;
  onCta: () => void;
  /// Visual tone: "vibe" (purple/coral default), "gold", "cool".
  tone?: "vibe" | "gold" | "cool";
};

const TONES: Record<NonNullable<SmartNudge["tone"]>, { edge: string; glow: string; cta: string }> = {
  vibe: {
    edge: "linear-gradient(90deg, oklch(0.62 0.22 295), oklch(0.7 0.2 25))",
    glow: "oklch(0.62 0.22 295 / 0.14)",
    cta: "vibe-gradient text-white",
  },
  gold: {
    edge: "linear-gradient(90deg, oklch(0.8 0.16 85), oklch(0.72 0.17 55))",
    glow: "oklch(0.8 0.16 85 / 0.16)",
    cta: "bg-gradient-to-r from-amber-400 to-orange-400 text-zinc-900",
  },
  cool: {
    edge: "linear-gradient(90deg, oklch(0.72 0.13 230), oklch(0.78 0.12 200))",
    glow: "oklch(0.72 0.13 230 / 0.14)",
    cta: "bg-gradient-to-r from-sky-500 to-cyan-400 text-white",
  },
};

const AUTO_DISMISS_MS = 9000;

export function SmartNudgeBanner({
  nudge,
  onDismiss,
}: {
  nudge: SmartNudge | null;
  onDismiss: () => void;
}) {
  // Auto-dismiss timer — resets whenever a NEW nudge arrives.
  useEffect(() => {
    if (!nudge) return;
    const t = setTimeout(() => onDismiss(), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [nudge, onDismiss]);

  return (
    <AnimatePresence>
      {nudge && (
        <motion.div
          key={nudge.id}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          role="status"
          aria-live="polite"
          className="relative w-full rounded-2xl v-surface-solid v-fg ring-1 ring-(--v-divider) overflow-hidden shadow-lg"
        >
          {/* Gradient edge + ambient glow — the nudge's signature */}
          <span
            aria-hidden
            className="absolute left-0 inset-y-0 w-[3px]"
            style={{ background: TONES[nudge.tone ?? "vibe"].edge }}
          />
          <span
            aria-hidden
            className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl pointer-events-none"
            style={{ background: TONES[nudge.tone ?? "vibe"].glow }}
          />

          <div className="relative flex items-center gap-2.5 pl-4 pr-2 py-2.5">
            <span className="text-xl shrink-0" aria-hidden>
              {nudge.emoji}
            </span>
            <p className="flex-1 min-w-0 text-[11.5px] leading-snug font-medium">
              {nudge.text}
            </p>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                haptic(10);
                nudge.onCta();
                onDismiss();
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${TONES[nudge.tone ?? "vibe"].cta}`}
            >
              {nudge.ctaLabel}
            </motion.button>
            <button
              onClick={onDismiss}
              aria-label="Masquer la suggestion"
              className="shrink-0 h-6 w-6 grid place-items-center rounded-full v-fg-faint hover:v-fg transition"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Auto-dismiss hairline */}
          <motion.span
            aria-hidden
            className="absolute bottom-0 left-0 h-[2px]"
            style={{ background: TONES[nudge.tone ?? "vibe"].edge }}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/// Small helper hook for the classic "one nudge at a time" pattern.
/// `offer` respects the nudge's cooldown automatically — call sites just
/// describe the circumstantial message.
export function useNudgeSlot() {
  const [nudge, setNudge] = useState<SmartNudge | null>(null);
  return {
    nudge,
    dismiss: () => setNudge(null),
    /// Show a nudge if its cooldown allows it (marks shown atomically).
    /// Returns true when the nudge was displayed.
    offer: (n: SmartNudge, scope: "session" | "day" = "session"): boolean => {
      if (!nudgeOnce(`nudge:${n.id}`, scope)) return false;
      setNudge((current) => current ?? n);
      return true;
    },
  };
}
