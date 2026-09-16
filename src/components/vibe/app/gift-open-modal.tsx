"use client";
// GiftOpenModal — spectacular gift-reveal experience.
// Uses a custom fixed overlay (not Radix Dialog) to avoid focus/pointer issues
// during the unwrap animation phase.
// Phase 1: wrapped gift with suspense (shimmering, "Tape pour ouvrir")
// Phase 2: unwrap animation (lid flies off, confetti bursts, gift scales in)
// Phase 3: revealed gift with value + fromName + note + social share CTA
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Share2, X } from "lucide-react";
import { useCurrency } from "@/lib/vibe/use-currency";
import SocialShare from "./social-share";
import { ConfettiBurst, haptic, sfx } from "./interactive-animations";

type Phase = "wrapped" | "unwrapping" | "revealed";

export function GiftOpenModal({
  open,
  onOpenChange,
  gift,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  gift: {
    id: string;
    giftEmoji: string;
    giftName: string;
    gemCost: number;
    eurValueCents: number;
    messageText: string | null;
    fromName: string;
    opened: boolean;
  } | null;
}) {
  const { moneyCents } = useCurrency();
  const [phase, setPhase] = useState<Phase>("wrapped");
  const [shareOpen, setShareOpen] = useState(false);
  const [canClose, setCanClose] = useState(true);
  // Synchronous flag (ref) to prevent closing during unwrapping — state is
  // async and can be stale in the handleClose closure. Ref is only read in
  // the event handler (not during render).
  const canCloseRef = useRef(true);

  // Reset phase when modal opens.
  useEffect(() => {
    if (open && gift) {
      setPhase(gift.opened ? "revealed" : "wrapped");
      setShareOpen(false);
      setCanClose(true);
      canCloseRef.current = true;
    }
  }, [open, gift]);

  // Lock body scroll when modal is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  function handleOpen() {
    canCloseRef.current = false;
    setCanClose(false);
    setPhase("unwrapping");
    // Suspense cue at the trigger, success chime at the reveal.
    sfx.play("open");
    haptic(20);
    if (gift && !gift.opened) {
      fetch(`/api/vibe/gifts/${gift.id}/open`, { method: "POST" }).catch(() => {});
    }
    window.setTimeout(() => {
      setPhase("revealed");
      setCanClose(true);
      canCloseRef.current = true;
      sfx.play("success");
    }, 1800);
  }

  function handleClose() {
    // Read the ref (synchronous) — state may be stale.
    if (!canCloseRef.current) return;
    onOpenChange(false);
  }

  if (!gift) return null;
  const receiverShare = Math.round(gift.eurValueCents * 0.7);
  const valueLabel = moneyCents(receiverShare);

  return (
    <>
      <AnimatePresence>
        {open && !shareOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] grid place-items-center"
          >
            {/* Backdrop — no click-to-close (prevents accidental close during
                phase transitions). User closes via X button or "Plus tard". */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal card — stopPropagation prevents backdrop close on internal clicks */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative max-w-[380px] w-[90%] rounded-3xl overflow-hidden bg-[#0a0612] ring-1 ring-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button (only when not unwrapping) */}
              {phase !== "unwrapping" && (
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 z-50 h-9 w-9 grid place-items-center rounded-full v-surface-2 backdrop-blur text-white hover:v-surface-3 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <div className="relative min-h-[440px] flex flex-col items-center justify-center overflow-hidden">
                {/* Ambient gradient bg */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/4 h-48 w-48 rounded-full bg-vibe-purple/30 blur-3xl" />
                  <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-vibe-pink/25 blur-3xl" />
                </div>

                {/* PHASE 1 — WRAPPED (suspense) */}
                {phase === "wrapped" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 flex flex-col items-center text-center px-6"
                  >
                    <p className="text-sm text-white/70 mb-1">{gift.fromName} t&apos;a envoyé</p>
                    <p className="font-display text-lg font-bold text-white mb-6">un cadeau surprise 🎁</p>

                    <motion.button
                      onClick={() => handleOpen()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.96, rotate: -2 }}
                      className="relative grid place-items-center h-40 w-40 rounded-3xl vibe-gradient vibe-glow overflow-hidden cursor-pointer"
                    >
                      <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-6 bg-white/30" />
                      <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-white/30" />
                      <motion.div
                        animate={{ rotate: [0, 8, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="relative"
                      >
                        <Gift className="h-16 w-16 text-white drop-shadow-lg" />
                      </motion.div>
                    </motion.button>

                    <motion.p
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="mt-6 text-white font-display font-bold text-base"
                    >
                      👆 Tape pour ouvrir
                    </motion.p>
                    <p className="text-[11px] text-white/70 mt-1">Le suspense fait son effet…</p>
                  </motion.div>
                )}

                {/* PHASE 2 — UNWRAPPING (spectacular) */}
                {phase === "unwrapping" && (
                  <div className="relative z-10 grid place-items-center min-h-[300px]">
                    <ConfettiBurst />
                    <motion.div
                      initial={{ y: 0, opacity: 1, rotate: 0 }}
                      animate={{ y: -160, opacity: 0, rotate: -35 }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute"
                    >
                      <div className="h-10 w-32 rounded-t-xl vibe-gradient shadow-lg" />
                    </motion.div>
                    <motion.div
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="h-24 w-32 rounded-b-xl vibe-gradient"
                    />
                    <motion.div
                      initial={{ scale: 0, rotate: -180, opacity: 0 }}
                      animate={{ scale: 1.2, rotate: 0, opacity: 1 }}
                      transition={{ duration: 0.8, delay: 0.6, type: "spring", stiffness: 200 }}
                      className="absolute"
                    >
                      <span className="text-[7rem] drop-shadow-2xl">{gift.giftEmoji}</span>
                    </motion.div>
                    {[...Array(8)].map((_, i) => (
                      <motion.span
                        key={i}
                        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                        animate={{
                          scale: [0, 1, 0],
                          x: Math.cos((i / 8) * Math.PI * 2) * 120,
                          y: Math.sin((i / 8) * Math.PI * 2) * 120,
                          opacity: [1, 1, 0],
                        }}
                        transition={{ duration: 1.2, delay: 0.6 }}
                        className="absolute text-2xl"
                      >
                        ✨
                      </motion.span>
                    ))}
                  </div>
                )}

                {/* PHASE 3 — REVEALED */}
                {phase === "revealed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 flex flex-col items-center text-center px-6 py-8 w-full"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 12 }}
                      className="text-7xl mb-3"
                    >
                      {gift.giftEmoji}
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="font-display text-2xl font-black text-white"
                    >
                      {gift.giftName}
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      className="text-sm text-white/70 mt-1"
                    >
                      de la part de <span className="font-semibold text-white">{gift.fromName}</span>
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35, type: "spring" }}
                      className="mt-4 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/30 px-5 py-3"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">Crédité sur ton portefeuille</p>
                      <p className="font-display text-2xl font-black text-emerald-300">{valueLabel}</p>
                    </motion.div>

                    {gift.messageText && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.45 }}
                        className="mt-4 rounded-2xl v-surface-1 ring-1 ring-white/10 px-4 py-3 w-full"
                      >
                        <p className="text-[11px] text-white/70 mb-1">Message de {gift.fromName} :</p>
                        <p className="text-sm text-white/90 italic">&ldquo;{gift.messageText}&rdquo;</p>
                      </motion.div>
                    )}

                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 }}
                      onClick={() => setShareOpen(true)}
                      className="mt-5 w-full h-12 rounded-2xl vibe-gradient text-white font-display font-bold vibe-glow flex items-center justify-center gap-2 active:scale-95 transition"
                    >
                      <Share2 className="h-5 w-5" />
                      Partager ma joie
                    </motion.button>
                    <button
                      onClick={handleClose}
                      className="mt-2 text-sm text-white/70 hover:text-white/80 transition"
                    >
                      Plus tard
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SocialShare
        open={shareOpen}
        onOpenChange={(o) => {
          setShareOpen(o);
          if (!o) onOpenChange(false);
        }}
        giftEmoji={gift.giftEmoji}
        giftName={gift.giftName}
        fromName={gift.fromName}
        valueLabel={valueLabel}
      />
    </>
  );
}

