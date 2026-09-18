"use client";
// CenterFeedback — le retour d'action moderne de l'app. Les issues positives
// (cadeau envoyé, Rewind, achat de Vibes, Passport, boost…) se célèbrent AU
// CENTRE de l'écran avec une carte glass minimale et élégante — jamais dans
// le header comme un toast classique qui obstrue les éléments de navigation.
// Auto-dismiss, pointer-events-none, aucune interaction bloquée.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type CenterFeedbackInput = {
  emoji: string;
  title: string;
  sub?: string;
  /** ms avant disparition (défaut 2200, ou 3200 quand un sous-titre est présent) */
  duration?: number;
};

const EVENT = "vivilov:center-feedback";

/**
 * Déclenche un retour centré élégant depuis n'importe quel écran de l'app.
 * Exemple : `vibeToast({ emoji: "🌹", title: "Rose pour Aria", sub: "Notification envoyée" })`
 */
export function vibeToast(input: CenterFeedbackInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: input }));
}

type Item = CenterFeedbackInput & { id: number };

let seq = 0;

/**
 * Couche de rendu — à monter UNE fois dans le shell de l'app (colonne mobile).
 * Un seul retour à la fois : un nouvel événement remplace le précédent.
 */
export function CenterFeedbackLayer() {
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const onFeedback = (e: Event) => {
      const detail = (e as CustomEvent<CenterFeedbackInput>).detail;
      if (!detail?.title) return;
      setItem({ ...detail, id: ++seq });
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(
        () => setItem(null),
        detail.duration ?? (detail.sub ? 3200 : 2200),
      );
    };
    window.addEventListener(EVENT, onFeedback as EventListener);
    return () => {
      window.removeEventListener(EVENT, onFeedback as EventListener);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-[70] grid place-items-center px-6" aria-live="polite">
      <AnimatePresence>
        {item && (
          <motion.div
            key={item.id}
            role="status"
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="flex flex-col items-center gap-1.5 rounded-3xl bg-black/75 backdrop-blur-xl ring-1 ring-white/15 px-8 py-5 shadow-2xl max-w-full"
          >
            <motion.span
              initial={{ scale: 0.4, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 13, delay: 0.04 }}
              className="text-4xl leading-none drop-shadow-lg"
            >
              {item.emoji}
            </motion.span>
            <p className="text-[15px] font-semibold text-white text-center leading-snug">{item.title}</p>
            {item.sub && (
              <p className="text-xs text-white/65 text-center leading-snug">{item.sub}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
