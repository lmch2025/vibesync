"use client";
// UploadProgressRing — circular progress indicator for file uploads.
// SVG ring with the brand gradient (purple → pink → orange), a big
// percentage counter in the center, and a Framer Motion animation on
// the progress arc. Used in the profile video upload flow.
import { motion } from "framer-motion";

export function UploadProgressRing({
  percent,
  size = 56,
  strokeWidth = 5,
  label,
}: {
  percent: number; // 0..100
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <defs>
          <linearGradient id="upload-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.55 0.24 295)" />
            <stop offset="50%" stopColor="oklch(0.65 0.24 350)" />
            <stop offset="100%" stopColor="oklch(0.72 0.19 55)" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#upload-ring-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            filter: "drop-shadow(0 0 4px oklch(0.65 0.24 350 / 0.5))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display font-black vibe-text-gradient tabular-nums leading-none"
          style={{ fontSize: Math.max(10, size / 4) }}
        >
          {label ?? `${Math.round(clamped)}%`}
        </span>
      </div>
    </div>
  );
}
