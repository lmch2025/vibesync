"use client";
// CompletionRing — animated circular diagram showing profile completion
// percentage. SVG ring with the brand gradient (purple→pink→orange),
// a count-up animation on the percentage number, and a grid of task
// chips below (✅ for done, ⚪ for pending).
//
// Fetches from `/api/vibe/completion-rate`. Shows a skeleton ring
// while loading. Empty-state is rare (account_created is always done)
// but handled gracefully.
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useVibe } from "@/lib/vibe/store";
import { AnimatedNumber, ConfettiBurst } from "./interactive-animations";
import type { CompletionTask } from "@/app/api/vibe/completion-rate/route";

type CompletionData = {
  percentage: number;
  completedCount: number;
  totalCount: number;
  tasks: CompletionTask[];
};

export function CompletionRing({ onTaskClick }: { onTaskClick?: (key: string) => void }) {
  const me = useVibe((s) => s.me);
  
  const profile = me?.profile;
  const tasks = [
    { key: "account_created", label: "Compte créé", emoji: "✅", done: true },
    { key: "profile_created", label: "Profil créé", emoji: "👤", done: !!profile },
    { key: "video_uploaded", label: "Vidéo 15s", emoji: "🎬", done: !!profile?.videoUrl && profile.videoUrl.length > 0 },
    { key: "poster_uploaded", label: "Vignette", emoji: "🖼️", done: !!profile?.posterUrl && profile.posterUrl.length > 0 },
    { key: "bio_filled", label: "Bio", emoji: "📝", done: !!profile?.bio && profile.bio.trim().length >= 10 },
    { key: "city_set", label: "Ville", emoji: "📍", done: !!profile?.city && profile.city.trim().length > 0 },
    { key: "age_set", label: "Âge", emoji: "🎂", done: !!profile?.age && profile.age > 0 },
    { key: "gender_set", label: "Sexe", emoji: "⚧", done: !!profile?.gender },
    { key: "looking_for_set", label: "Tu cherches", emoji: "💘", done: !!profile?.lookingFor },
    { key: "vibe_answered", label: "Vibe Check", emoji: "🎯", done: !!profile?.vibeAnswer },
    { key: "verified", label: "Compte vérifié", emoji: "✔️", done: !!me?.verified },
    { key: "streak_started", label: "Série lancée", emoji: "🔥", done: (me as any)?.streak >= 1 },
  ];
  
  const totalCount = 12;
  const completedCount = tasks.filter(t => t.done).length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const loading = !me;

  const size = 132;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentage / 100);

  const [showConfetti, setShowConfetti] = useState(false);
  const prevPercentage = useRef(percentage);

  useEffect(() => {
    if (percentage === 100 && prevPercentage.current < 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
    prevPercentage.current = percentage;
  }, [percentage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-5 overflow-hidden"
    >
      {/* Confetti Explosion (Triggered on 100%) */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 z-[120] pointer-events-none grid place-items-center">
            <ConfettiBurst count={300} duration={3} />
            <motion.div 
              initial={{ scale: 0, opacity: 0, rotate: -15 }} 
              animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0], rotate: [ -15, 10, 0 ] }} 
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 2.5, type: "tween", ease: "easeOut" }}
              className="text-7xl absolute"
            >
              🎉
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ambient gradient orbs */}
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-vibe-purple/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-vibe-orange/15 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center gap-4">
        <h3 className="font-display font-bold text-sm text-white/80 self-start flex items-center gap-1.5">
          <span className="text-base">🎯</span> Complétion du profil
        </h3>

        {/* Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          {loading ? (
            <div
              className="rounded-full bg-white/5 animate-pulse"
              style={{ width: size, height: size }}
            />
          ) : (
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="-rotate-90"
            >
              <defs>
                <linearGradient
                  id="completion-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="oklch(0.55 0.24 295)" />
                  <stop offset="50%" stopColor="oklch(0.65 0.24 350)" />
                  <stop offset="100%" stopColor="oklch(0.72 0.19 55)" />
                </linearGradient>
              </defs>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={strokeWidth}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="url(#completion-grad)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  filter:
                    "drop-shadow(0 0 6px oklch(0.65 0.24 350 / 0.5))",
                }}
              />
            </svg>
          )}
          {!loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatedNumber
                value={percentage}
                className="font-display text-3xl font-black vibe-text-gradient"
                format={(n) => `${Math.round(n)}%`}
              />
                <span className="text-[10px] text-white/40 mt-0.5">
                  {completedCount}/{totalCount}
                </span>
              </div>
            )}
          </div>
  
          {/* Task chips */}
          {!loading && (
            <div className="grid grid-cols-4 gap-1.5 w-full">
              {tasks.map((t, i) => (
              <motion.div
                key={t.key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.04 * i }}
                onClick={() => !t.done && onTaskClick && onTaskClick(t.key)}
                className={`flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-center transition ${
                  t.done
                    ? "bg-emerald-500/10 ring-1 ring-emerald-400/20 cursor-default"
                    : `bg-white/5 ring-1 ring-white/10 ${onTaskClick ? "cursor-pointer hover:bg-white/10 hover:ring-white/20 active:scale-95" : ""}`
                }`}
                title={t.label}
              >
                <span className="text-sm leading-none">
                  {t.done ? (
                    <span className="grid place-items-center h-4 w-4 rounded-full bg-emerald-500 text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <span>{t.emoji}</span>
                  )}
                </span>
                <span
                  className={`text-[8px] leading-tight ${
                    t.done ? "text-emerald-300/80" : "text-white/40"
                  }`}
                >
                  {t.label}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && percentage < 100 && (
          <p className="text-[11px] text-white/50 text-center">
            {percentage >= 80
              ? "Presque parfait ! 🎉"
              : percentage >= 50
                ? "Belle avancée — continue !"
                : "Complète ton profil pour plus de matchs."}
            </p>
          )}
          {!loading && percentage === 100 && (
            <p className="text-[11px] text-emerald-300 text-center font-semibold">
              Profil complet ! Tu rayonnes ✨
            </p>
          )}
        </div>
      </motion.div>
  );
}
