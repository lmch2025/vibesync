"use client";
// CountdownRing — SVG circular progress ring that visualizes the
// remaining time of an active buff (boost, spotlight, ghost mode…).
//
// Each buff type has its own gradient (8 presets matching the brand):
//   boost       → orange
//   spotlight   → fuchsia
//   ghostMode   → purple
//   passport    → sky
//   timeFreeze  → ice blue
//   dailyDouble → brand (purple→pink→orange)
//   crushAlert  → rose
//   goldenHeart → gold
//
// When remaining time < 60s (urgent), the ring switches to a red
// gradient + pulse animation so the user knows the buff is about to
// expire.
//
// The ring is pure SVG + Framer Motion — no canvas, no images.
// `progress` (0..1) drives the dashoffset; the displayed time string
// is formatted as M:SS or H:MM:SS depending on remaining duration.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { BuffType } from "@/lib/vibe/use-active-buffs";

type GradientPreset = {
  id: string;
  from: string;
  via?: string;
  to: string;
};

const GRADIENTS: Record<BuffType, GradientPreset> = {
  boost: {
    id: "grad-boost",
    from: "oklch(0.72 0.19 55)",
    to: "oklch(0.55 0.21 35)",
  },
  spotlight: {
    id: "grad-spotlight",
    from: "oklch(0.65 0.24 350)",
    to: "oklch(0.62 0.25 320)",
  },
  ghostMode: {
    id: "grad-ghost",
    from: "oklch(0.55 0.24 295)",
    to: "oklch(0.62 0.2 295)",
  },
  passport: {
    id: "grad-passport",
    from: "oklch(0.7 0.15 230)",
    to: "oklch(0.62 0.18 220)",
  },
  timeFreeze: {
    id: "grad-timefreeze",
    from: "oklch(0.78 0.12 210)",
    to: "oklch(0.7 0.15 230)",
  },
  dailyDouble: {
    id: "grad-dailydouble",
    from: "oklch(0.55 0.24 295)",
    via: "oklch(0.65 0.24 350)",
    to: "oklch(0.72 0.19 55)",
  },
  crushAlert: {
    id: "grad-crush",
    from: "oklch(0.65 0.25 15)",
    to: "oklch(0.62 0.24 350)",
  },
  goldenHeart: {
    id: "grad-golden",
    from: "oklch(0.82 0.16 85)",
    to: "oklch(0.74 0.18 65)",
  },
};

const URGENT_GRADIENT: GradientPreset = {
  id: "grad-urgent",
  from: "oklch(0.65 0.25 25)",
  to: "oklch(0.58 0.24 15)",
};

export function CountdownRing({
  type,
  remainingMs,
  totalMs,
  progress,
  size = 64,
  strokeWidth = 5,
  showTime = true,
  tone = "auto",
}: {
  type: BuffType;
  remainingMs: number;
  totalMs: number;
  progress: number; // 0..1 (fraction elapsed)
  size?: number;
  strokeWidth?: number;
  showTime?: boolean;
  /// "auto" = couleur de texte du thème (cartes normales) ;
  /// "media" = blanc constant (posé sur fond sombre immersif, p.ex.
  /// ActionSuccessModal — sinon l'encre du thème clair y serait illisible).
  tone?: "auto" | "media";
}) {
  // Live countdown — recompute remaining every second so the time
  // label ticks down even between API polls.
  const [liveRemaining, setLiveRemaining] = useState(remainingMs);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveRemaining(remainingMs);
    const startTs = Date.now();
    const startRemaining = remainingMs;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTs;
      const next = Math.max(0, startRemaining - elapsed);
      setLiveRemaining(next);
      if (next <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
    // Re-init when the parent passes a new remainingMs (e.g. after a poll).
  }, [remainingMs]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Progress is fraction ELAPSED → ring shrinks as time runs out.
  const dashOffset = circumference * Math.max(0, Math.min(1, progress));

  const isUrgent = liveRemaining < 60_000; // < 60s
  const gradient = isUrgent ? URGENT_GRADIENT : GRADIENTS[type];

  return (
    <div
      className={`relative ${isUrgent ? "animate-pulse" : ""}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <defs>
          <linearGradient
            id={gradient.id}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={gradient.from} />
            {gradient.via && (
              <stop offset="50%" stopColor={gradient.via} />
            )}
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>
        </defs>
        {/* Track — couleur de séparateur du thème : visible en clair
            comme en sombre (un blanc fixe serait invisible en clair).
            En mode « media » (fond sombre immersif), piste blanche fixe. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={tone === "media" ? "stroke-white/10" : "stroke-(--v-divider)"}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradient.id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          // initial={false} : pas d'animation « undefined → valeur » au
          // montage (warning framer-motion) — l'anneau démarre directement
          // à la position cible, puis s'anime à chaque poll.
          initial={false}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 4px ${gradient.from} / 0.5)`,
          }}
        />
      </svg>
      {showTime && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-display font-bold tabular-nums leading-none ${
              tone === "media" ? "v-fg-media" : "v-fg"
            }`}
            style={{ fontSize: Math.max(8, size / 6) }}
          >
            {formatDuration(liveRemaining)}
          </span>
        </div>
      )}
    </div>
  );
}

/// Format ms as M:SS or H:MM:SS.
function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
