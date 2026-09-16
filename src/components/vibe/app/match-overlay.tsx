"use client";
// "It's a match!" full-screen celebration overlay with animated rings + confetti.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { ConfettiBurst } from "./interactive-animations";

type MatchData = {
  id: string;
  withProfile: { id: string; displayName: string; posterUrl: string; city: string };
};

// Module-level cache for the admin-configured anti-spam limit — fetched once
// from the public settings endpoint, shared across every overlay instance.
let cachedMsgLimit: number | null = null;

export function MatchOverlay({
  match,
  onClose,
  onMessage,
  myPoster,
}: {
  match: MatchData | null;
  onClose: () => void;
  onMessage: (target: { id: string, name: string, poster: string | null }) => void;
  myPoster?: string;
}) {
  // The REAL limit configured in the admin panel (fallback 3 = product default).
  const [msgLimit, setMsgLimit] = useState<number>(cachedMsgLimit ?? 3);

  useEffect(() => {
    if (cachedMsgLimit !== null) return;
    let alive = true;
    fetch("/api/vibe/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const v = Number(data?.maxMessagesBeforeReply);
        if (alive && Number.isFinite(v) && v > 0) {
          cachedMsgLimit = v;
          setMsgLimit(v);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <AnimatePresence>
      {match && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 grid place-items-center overflow-hidden"
        >
          <div className="absolute inset-0 vibe-gradient opacity-95" />
          {/* floating hearts */}
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-white/70 text-lg"
              initial={{ y: "110%", x: `${10 + (i * 7) % 80}%`, opacity: 0, rotate: 0 }}
              animate={{ y: "-20%", opacity: [0, 1, 0], rotate: (i % 2 ? 1 : -1) * 60 }}
              transition={{ duration: 3 + (i % 4), delay: i * 0.25, repeat: Infinity, repeatDelay: 1 }}
            >
              {["❤️", "💖", "💜", "✨", "🔥"][i % 5]}
            </motion.span>
          ))}
          <ConfettiBurst />

          <button onClick={onClose} className="absolute top-10 right-5 z-10 h-9 w-9 grid place-items-center rounded-full v-surface-3 backdrop-blur text-white">
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 text-center px-6">
            <motion.h2
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="font-display text-5xl font-black text-white drop-shadow-lg mb-1"
            >
              C&apos;est un match !
            </motion.h2>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/80 mb-8"
            >
              Vous vous êtes swipés mutuellement. 🎉
            </motion.p>

            <div className="relative flex items-center justify-center gap-4 mb-8">
              {/* pulse rings */}
              <span className="absolute h-32 w-32 rounded-full bg-white/30 animate-pulse-ring" />
              <span className="absolute h-32 w-32 rounded-full v-surface-3 animate-pulse-ring" style={{ animationDelay: "0.6s" }} />
              {myPoster && (
                <motion.div
                  initial={{ x: -60, rotate: -12, opacity: 0 }}
                  animate={{ x: 0, rotate: -8, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                  className="relative h-36 w-28 rounded-2xl overflow-hidden ring-4 ring-white shadow-2xl"
                >
                  <img src={myPoster} alt="Toi" className="absolute inset-0 w-full h-full object-cover" />
                </motion.div>
              )}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 10, delay: 0.3 }}
                className="text-4xl"
              >
                💞
              </motion.div>
              <motion.div
                initial={{ x: 60, rotate: 12, opacity: 0 }}
                animate={{ x: 0, rotate: 8, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="relative h-36 w-28 rounded-2xl overflow-hidden ring-4 ring-white shadow-2xl"
              >
                <img src={match.withProfile.posterUrl || "/profiles/lea.png"} alt={match.withProfile.displayName} className="absolute inset-0 w-full h-full object-cover" />
              </motion.div>
            </div>

            <p className="text-white font-display text-lg mb-6">
              Toi &amp; {match.withProfile.displayName}
            </p>

            <div className="flex flex-col gap-2.5 max-w-[220px] mx-auto">
              <button
                onClick={() => onMessage({ id: match.id, name: match.withProfile.displayName, poster: match.withProfile.posterUrl })}
                className="h-12 rounded-2xl bg-white text-primary font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
              >
                <MessageCircle className="h-5 w-5" /> Envoyer un message
              </button>
              <button
                onClick={onClose}
                className="h-11 rounded-2xl v-surface-3 backdrop-blur text-white font-semibold active:scale-95 transition"
              >
                Continuer à swiper
              </button>
            </div>
            <p className="text-white/70 text-[10px] mt-5">
              ⚠️ Anti-spam : tu peux envoyer {msgLimit} message{msgLimit > 1 ? "s" : ""} max tant que {match.withProfile.displayName} ne répond pas.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
