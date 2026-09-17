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
//   - sfx                 — WebAudio UI sound engine (no audio files needed)
//   - useSfxEnabled       — React hook syncing the sfx toggle for settings UI
//   - celebrate()         — one-liner combo: confetti + haptic + sound
//   - EmojiBurst          — emoji particle burst (like buttons, reactions)
//   - TypingDots          — 3-dot typing indicator
//   - useShake            — error shake via animation controls
//   - tabFade             — light variants for tab-content transitions
//   - Pressable           — motion.button with standard press feedback
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls, type Variants } from "framer-motion";
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

// ---------------------------------------------------------------------------
// UI sound engine (sfx) — tiny WebAudio synth, zero audio files.
// ---------------------------------------------------------------------------

export type SfxName =
  | "pop" // nav taps, small selections
  | "send" // message sent
  | "match" // it's a match!
  | "coin" // gems purchased / streak claimed
  | "open" // gift unwrapping suspense
  | "success" // action succeeded / withdraw confirmed
  | "error" // something went wrong
  | "chime"; // welcome / celebration

type Tone = {
  freq: number;
  to?: number; // optional end frequency (sweep)
  dur: number; // seconds
  type: OscillatorType;
  gain?: number; // relative to master
  delay?: number; // seconds from now
};

const SFX_PRESETS: Record<SfxName, Tone[]> = {
  pop: [{ freq: 520, to: 800, dur: 0.08, type: "sine", gain: 0.7 }],
  send: [
    { freq: 440, to: 880, dur: 0.11, type: "sine", gain: 0.8 },
    { freq: 880, dur: 0.05, type: "sine", gain: 0.35, delay: 0.1 },
  ],
  match: [
    { freq: 659.25, dur: 0.12, type: "triangle", gain: 0.8 },
    { freq: 880, dur: 0.22, type: "triangle", gain: 0.9, delay: 0.12 },
  ],
  coin: [
    { freq: 987.77, dur: 0.09, type: "square", gain: 0.35 },
    { freq: 1318.51, dur: 0.16, type: "square", gain: 0.4, delay: 0.09 },
  ],
  open: [{ freq: 600, to: 300, dur: 0.25, type: "triangle", gain: 0.7 }],
  success: [
    { freq: 523.25, dur: 0.09, type: "triangle", gain: 0.7 },
    { freq: 659.25, dur: 0.09, type: "triangle", gain: 0.75, delay: 0.09 },
    { freq: 783.99, dur: 0.18, type: "triangle", gain: 0.85, delay: 0.18 },
  ],
  error: [{ freq: 160, dur: 0.18, type: "sawtooth", gain: 0.3 }],
  chime: [
    { freq: 880, dur: 0.3, type: "sine", gain: 0.6 },
    { freq: 1174.66, dur: 0.4, type: "sine", gain: 0.45, delay: 0.05 },
  ],
};

const SFX_STORAGE_KEY = "vivilov:sfx";
const SFX_TOGGLE_EVENT = "vivilov:sfx-toggle";

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  // `AudioContext` is a global constructor (not a Window property) — guard
  // with typeof for engines that lack it, then fall back to the webkit alias.
  const Ctor: AudioContextCtor | undefined =
    typeof AudioContext !== "undefined" ? AudioContext : w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    const ctx = new Ctor();
    // Chrome requires a user gesture — resume lazily; play() is always
    // called from inside event handlers so this succeeds.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function playTones(ctx: AudioContext, tones: Tone[], master: number) {
  const now = ctx.currentTime;
  for (const t of tones) {
    const start = now + (t.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), start + t.dur);
    }
    const peak = Math.max(0.001, master * (t.gain ?? 1));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.05);
  }
}

/// Subtle, elegant UI sounds synthesized with WebAudio. No files, no network.
/// Enabled state persists in localStorage; all calls are safe no-ops on SSR
/// or when disabled.
export const sfx = {
  isEnabled(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SFX_STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  },
  setEnabled(on: boolean) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SFX_STORAGE_KEY, on ? "1" : "0");
    } catch {
      /* private mode — ignore */
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SFX_TOGGLE_EVENT, { detail: on }));
    }
    if (on) sfx.play("pop");
  },
  play(name: SfxName) {
    if (typeof window === "undefined") return;
    if (!sfx.isEnabled()) return;
    try {
      if (!sfx._ctx) sfx._ctx = getAudioContext();
      const ctx = sfx._ctx;
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      playTones(ctx, SFX_PRESETS[name], 0.09);
    } catch {
      // Autoplay policy or missing WebAudio — silent fallback.
    }
  },
  _ctx: null as AudioContext | null,
};

/// React hook exposing the sfx toggle for settings UI. Stays in sync across
/// components via a custom event.
export function useSfxEnabled(): [boolean, (on: boolean) => void] {
  const [enabled, setEnabledState] = useState(true);
  useEffect(() => {
    setEnabledState(sfx.isEnabled());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setEnabledState(detail ?? sfx.isEnabled());
    };
    window.addEventListener(SFX_TOGGLE_EVENT, onChange);
    return () => window.removeEventListener(SFX_TOGGLE_EVENT, onChange);
  }, []);
  const toggle = useCallback((on: boolean) => sfx.setEnabled(on), []);
  return [enabled, toggle];
}

// ---------------------------------------------------------------------------
// Combined celebration helper
// ---------------------------------------------------------------------------

/// One-liner for the juicy moments: a light confetti burst, a haptic pulse
/// and a matching sound. Destructure options to fit the moment's intensity.
export function celebrate({
  sound = "success",
  hapticPattern = [10, 30, 10],
  confettiCount = 90,
  colors = ["#a855f7", "#ec4899", "fb923c", "facc15", "#22c55e"],
}: {
  sound?: SfxName | null;
  hapticPattern?: number | number[] | null;
  confettiCount?: number;
  colors?: string[];
} = {}) {
  if (sound) sfx.play(sound);
  if (hapticPattern !== null) haptic(hapticPattern ?? 10);
  if (confettiCount > 0) {
    confetti({
      particleCount: confettiCount,
      spread: 70,
      origin: { y: 0.6 },
      colors,
      zIndex: 10000,
      scalar: 0.9,
      disableForReducedMotion: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Emoji particle burst
// ---------------------------------------------------------------------------

/// EmojiBurst — a swarm of emoji particles that explodes from the center of
/// its parent (place inside a `relative` container). Re-fires whenever
/// `trigger` changes to a new non-zero value. Auto-cleans after ~1s.
export function EmojiBurst({
  trigger,
  emojis = ["❤️"],
  count = 9,
  className = "",
}: {
  trigger: number;
  emojis?: string[];
  count?: number;
  className?: string;
}) {
  const [alive, setAlive] = useState(false);
  useEffect(() => {
    if (trigger <= 0) return;
    setAlive(true);
    const t = setTimeout(() => setAlive(false), 1000);
    return () => clearTimeout(t);
  }, [trigger]);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        emoji: emojis[i % emojis.length],
        angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.9,
        distance: 52 + Math.random() * 46,
        rotate: (Math.random() - 0.5) * 140,
        scale: 0.8 + Math.random() * 0.7,
        delay: Math.random() * 0.06,
      })),
    [trigger, emojis, count],
  );

  if (!alive) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 grid place-items-center overflow-visible ${className}`} aria-hidden>
      {particles.map((p, i) => {
        const dx = Math.cos(p.angle) * p.distance;
        const dy = Math.sin(p.angle) * p.distance - 26;
        return (
          <motion.span
            key={`${trigger}-${i}`}
            initial={{ opacity: 0, x: 0, y: 6, scale: 0.3 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: dx,
              y: [6, dy * 0.6, dy, dy - 18],
              scale: [0.3, p.scale, p.scale, p.scale * 0.6],
              rotate: p.rotate,
            }}
            transition={{ duration: 0.85, delay: p.delay, ease: "easeOut" }}
            className="absolute text-lg select-none"
          >
            {p.emoji}
          </motion.span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

/// TypingDots — the classic 3-dot "typing…" indicator. Optionally shows a
/// label. Drops into chat headers or message lists.
export function TypingDots({
  label,
  dotClassName = "bg-(--v-fg-muted)",
  className = "",
}: {
  label?: string;
  dotClassName?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="status"
      aria-label={label ?? "En train d'écrire"}
    >
      {label && <span className="text-[11px] opacity-70">{label}</span>}
      <span className="inline-flex items-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={`inline-block h-1.5 w-1.5 rounded-full ${dotClassName}`}
            animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Error shake
// ---------------------------------------------------------------------------

/// useShake — returns framer-motion `controls` plus a `trigger()` callback.
/// Spread `animate={controls}` on a motion element and call `trigger()` when
/// an action fails to give an elegant horizontal shake.
export function useShake() {
  const controls = useAnimationControls();
  const trigger = useCallback(() => {
    void controls.start({
      x: [0, -10, 10, -8, 8, -5, 5, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  }, [controls]);
  return { controls, trigger };
}

// ---------------------------------------------------------------------------
// Tab-content transition (light)
// ---------------------------------------------------------------------------

/// Light variants for animating tab/screen content that stays mounted
/// (hidden/block strategy). Use on a keyed motion.div placed above the
/// persistent content — cheap enough to run on every tab switch.
export const tabFade: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.995 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

// ---------------------------------------------------------------------------
// Pressable — universal tactile button
// ---------------------------------------------------------------------------

/// Pressable — a motion.button with the app-wide press feedback (scale down
/// on tap, subtle grow on hover). Accepts all standard button props. Use it
/// everywhere a plain `<button>` would feel dead.
/// Note: framer-motion re-types a handful of DOM handler props (`onDrag`,
/// `onAnimationStart`, touch handlers…) with incompatible signatures — they
/// are omitted here so the rest can be spread safely onto motion.button.
export function Pressable({
  children,
  className = "",
  onClick,
  disabled,
  ...rest
}: Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDrop"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onTouchStart"
  | "onTouchEnd"
  | "onTouchMove"
> & { children: React.ReactNode }) {
  return (
    <motion.button
      {...rest}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
