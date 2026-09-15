"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Heart, Waves, Rocket, X } from "lucide-react";
import { PhoneFrame, PhoneStatusBar } from "@/components/vibe/phone-frame";
import { GemIcon } from "@/components/vibe/gem-badge";

type Profile = {
  name: string;
  age: number;
  city: string;
  poster: string;
  vibe: string;
  myAnswer: string; // which chip will be highlighted as "their match"
};

const PROFILES: Profile[] = [
  { name: "Léa", age: 24, city: "Paris", poster: "/profiles/lea.png", vibe: "Plage ou Montagne ?", myAnswer: "plage" },
  { name: "Marco", age: 27, city: "Lyon", poster: "/profiles/marco.png", vibe: "Chien ou Chat ?", myAnswer: "chien" },
  { name: "Sofia", age: 25, city: "Marseille", poster: "/profiles/sofia.png", vibe: "Aventure ou Confort ?", myAnswer: "aventure" },
  { name: "Yann", age: 28, city: "Nantes", poster: "/profiles/yann.png", vibe: "Café ou Thé ?", myAnswer: "cafe" },
  { name: "Aria", age: 23, city: "Bordeaux", poster: "/profiles/aria.png", vibe: "Ville ou Nature ?", myAnswer: "nature" },
  { name: "Tom", age: 26, city: "Lille", poster: "/profiles/tom.png", vibe: "Plage ou Montagne ?", myAnswer: "montagne" },
];

function parseVibe(v: string) {
  const [a, b] = v.split(" ou ").map((s) => s.replace(" ?", "").trim());
  return { a, b };
}

/**
 * Auto-playing hero phone demo. Cycles through 6 seeded profile posters,
 * with a swipe-right exit animation, Ken Burns zoom, glass profile info,
 * Vibe Check overlay, and LIKE / NOPE stamps.
 */
export function HeroSwipeDemo() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % PROFILES.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 4200);
    return () => clearTimeout(t);
  }, []);

  const profile = PROFILES[index];
  const { a, b } = parseVibe(profile.vibe);

  return (
    <PhoneFrame className="relative z-10">
      <PhoneStatusBar />

      {/* Decorative gradient orbs floating behind phone */}
      <span className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-vibe-purple/30 blur-3xl animate-float-slow" />
      <span className="pointer-events-none absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-vibe-orange/30 blur-3xl animate-float-slow" style={{ animationDelay: "1.5s" }} />

      {/* Swipeable card stack */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60, rotate: direction * 4, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * 240, rotate: direction * 18, scale: 0.9, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={profile.poster}
              alt={`${profile.name}, ${profile.age} ans, ${profile.city}`}
              fill
              sizes="320px"
              priority
              className="object-cover animate-ken-burns"
            />
            {/* darken bottom for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/30" />

            {/* Top corner — Vibe Check pill */}
            <div className="absolute top-12 left-3 right-3 z-10 flex justify-center">
              <div className="glass-dark rounded-full px-3 py-1.5 flex items-center gap-1.5 text-white text-xs font-semibold">
                <Waves className="h-3.5 w-3.5 text-vibe-orange" />
                Vibe Check
              </div>
            </div>

            {/* Vibe Check overlay — question + 2 chips */}
            <div className="absolute top-20 left-3 right-3 z-10">
              <div className="glass-dark rounded-2xl p-3">
                <p className="text-center text-white text-xs font-medium mb-2">{profile.vibe}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[a, b].map((opt, i) => {
                    const isMatch = (i === 0 && profile.myAnswer === a.toLowerCase()) || (i === 1 && profile.myAnswer === b.toLowerCase());
                    return (
                      <div
                        key={opt}
                        className={`relative rounded-xl px-2 py-1.5 text-center text-xs font-bold transition-all ${
                          isMatch ? "text-white" : "text-white/80 bg-white/10"
                        }`}
                        style={isMatch ? { backgroundImage: "linear-gradient(135deg, var(--vibe-purple), var(--vibe-pink))" } : undefined}
                      >
                        {opt}
                        {isMatch && (
                          <motion.span
                            className="absolute inset-0 rounded-xl ring-2 ring-white/70"
                            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.04, 1] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Profile info overlay (glassy) */}
            <div className="absolute bottom-0 inset-x-0 z-10 p-3 pb-5">
              <div className="glass-dark rounded-2xl p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-display font-bold text-lg leading-tight">{profile.name},</span>
                    <span className="text-white/90 font-semibold text-lg leading-tight">{profile.age}</span>
                    <BadgeCheck className="h-4 w-4 text-vibe-orange shrink-0" />
                  </div>
                  <div className="text-white/80 text-xs">{profile.city} · 2 km</div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white">
                  <GemIcon className="h-3 w-3" /> 150
                </div>
              </div>
            </div>

            {/* LIKE / NOPE stamps */}
            <motion.div
              initial={{ opacity: 0, rotate: -18, scale: 0.7 }}
              animate={{ opacity: 0.95, rotate: -12, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="absolute top-1/3 left-4 z-20 rounded-2xl border-4 border-emerald-400 text-emerald-400 px-3 py-1 text-2xl font-display font-black tracking-wider bg-black/20"
            >
              LIKE
            </motion.div>
            <motion.div
              initial={{ opacity: 0, rotate: 18, scale: 0.7 }}
              animate={{ opacity: 0, rotate: 18, scale: 0.7 }}
              className="absolute top-1/3 right-4 z-20 rounded-2xl border-4 border-rose-500 text-rose-500 px-3 py-1 text-2xl font-display font-black tracking-wider"
            >
              NOPE
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Action buttons row */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <button
            aria-label="Passer"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur ring-1 ring-white/30 text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            aria-label="Super-like"
            className="grid h-11 w-11 place-items-center rounded-full vibe-gradient vibe-glow text-white shadow-lg"
          >
            <Heart className="h-5 w-5" />
          </button>
          <button
            aria-label="Boost"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur ring-1 ring-white/30 text-white"
          >
            <Rocket className="h-4 w-4 text-vibe-orange" />
          </button>
        </div>

        {/* Hand-swipe hint (first load only) */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1, x: [0, 60, 0] }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 1.4, repeat: 2, ease: "easeInOut" }}
              className="absolute top-1/2 right-6 z-30 pointer-events-none"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">👆</span>
                <span className="glass-dark rounded-full px-2 py-0.5 text-[10px] font-semibold text-white">swipe</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PhoneFrame>
  );
}
