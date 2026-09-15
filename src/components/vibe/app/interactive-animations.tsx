"use client";
// interactive-animations — reusable animation presets, motion variants,
// and tiny components used across the Vivilov app demo. Centralizing
// them here keeps timing/physics consistent everywhere.
//
// Exports:
//   - pageTransition     — Variants for full-screen page transitions
//   - cardEntrance       — Variants for cards entering the viewport
//   - buttonPress        — whileTap / whileHover for buttons
//   - PulseGlow          — animated glowing wrapper (e.g. for CTAs)
//   - Shimmer            — animated shimmer overlay (loading placeholder)
//   - Floating           — gentle float loop wrapper
//   - SuccessBounce      — spring bounce for success checkmarks
//   - TabIndicator       — Framer `layoutId` pill indicator
//   - AnimatedNumber     — count-up number animation
//   - haptic()           — fire a haptic vibration (mobile only)
//   - ConfettiBurst      — colorful confetti explosion
//   - toastSlideIn       — Variants for toast slide-in from bottom
import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import confetti from "canvas-confetti";

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: "blur(8px)",
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.04 * i,
      type: "spring",
      stiffness: 280,
      damping: 26,
    },
  }),
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.2 },
  },
};

export const buttonPress = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.02 },
  transition: { type: "spring", stiffness: 400, damping: 22 },
} as const;

export const toastSlideIn: Variants = {
  initial: { opacity: 0, y: 60, scale: 0.9 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
  exit: {
    opacity: 0,
    y: 60,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// ---------------------------------------------------------------------------
// Wrapper components
// ---------------------------------------------------------------------------

/// Animated glowing wrapper. Useful around CTA buttons to draw the eye.
export function PulseGlow({
  children,
  className = "",
  color = "oklch(0.55 0.24 295 / 0.55)",
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 0px ${color}`,
          `0 0 28px ${color}`,
          `0 0 0px ${color}`,
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/// Shimmer overlay — used as a loading placeholder. Place inside a
/// `relative overflow-hidden` parent. The shimmer sweeps left-to-right.
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent ${className}`}
      style={{
        animation: "shimmer 1.6s infinite",
      }}
    />
  );
}

/// Floating wrapper — gentle Y-axis float loop.
export function Floating({
  children,
  className = "",
  amplitude = 8,
  duration = 4,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{ y: [0, -amplitude, 0] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/// Success bounce — spring-in checkmark / emoji.
export function SuccessBounce({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -25 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        delay,
        type: "spring",
        stiffness: 220,
        damping: 12,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/// Tab indicator — animated pill that slides between tabs via `layoutId`.
/// Render one per tab group with the same `id`; inactive tabs render nothing.
export function TabIndicator({
  id = "tab-indicator",
  className = "",
}: {
  id?: string;
  className?: string;
}) {
  return (
    <motion.span
      layoutId={id}
      className={`absolute inset-0 -z-10 vibe-gradient rounded-xl ${className}`}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    />
  );
}

/// AnimatedNumber — counts up from 0 to `value` over `duration` ms.
/// Renders a tabular-nums span so the digits don't wiggle.
export function AnimatedNumber({
  value,
  duration = 900,
  className = "",
  format = (n) => Math.round(n).toString(),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    const to = value;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className}`}>{format(display)}</span>
  );
}


/// Confetti burst — spectacular, realistic, multi-layered explosion.
export function ConfettiBurst({
  count = 200,
  colors = ["#a855f7", "#ec4899", "#fb923c", "#facc15", "#22c55e", "#06b6d4"],
  duration = 3,
}: {
  count?: number;
  colors?: string[];
  duration?: number;
}) {
  useEffect(() => {
    // Fire a spectacular burst
    const end = Date.now() + duration * 1000;

    // Use "realistic look" technique from canvas-confetti
    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        origin: { y: 0.6 },
        zIndex: 10000,
        colors: colors,
        particleCount: Math.floor(count * particleRatio),
        ...opts,
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    // Continuous small bursts for the duration
    (function frame() {
      if (Date.now() > end) return;
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
        zIndex: 10000,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
        zIndex: 10000,
      });
      requestAnimationFrame(frame);
    }());
  }, [count, colors, duration]);

  return null;
}

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

/// Fire a haptic vibration (mobile only). Pattern is a number of ms
/// or an array of ms (vibrate/pause). No-op on desktop browsers.
/// Safe to call unconditionally — the function guards `navigator.vibrate`.
export function haptic(pattern: number | number[] = 10): void {
  if (typeof window === "undefined") return;
  if (typeof navigator === "undefined") return;
  const v = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
  if (typeof v !== "function") return;
  try {
    v(pattern);
  } catch {
    // Safari throws on some configurations — ignore.
  }
}
