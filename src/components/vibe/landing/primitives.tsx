"use client";
import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Eyebrow label with gradient dot. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-vibe-gradient-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground/80 ring-1 ring-border/60",
        className
      )}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full vibe-gradient" />
        <span className="absolute inset-0 rounded-full vibe-gradient animate-pulse-ring" />
      </span>
      {children}
    </span>
  );
}

/* Section heading with font-display + optional eyebrow + sub. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "max-w-2xl text-base sm:text-lg text-muted-foreground text-pretty",
            align === "center" ? "mx-auto" : ""
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* Wrap children in a scroll-triggered fade-up. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Stagger container — children must be motion with variants for stagger. */
export const staggerParent: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* Primary CTA button — vibe-gradient with glow. */
export function PrimaryCta({
  children,
  onClick,
  className,
  type,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      type={type ?? "button"}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full vibe-gradient vibe-glow px-6 py-3 text-sm font-semibold text-white shadow-lg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

/* Ghost button — transparent with ring. */
export function GhostCta({
  children,
  onClick,
  className,
  tone = "light",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold ring-1 transition-colors backdrop-blur-sm",
        tone === "light"
          ? "bg-white/60 text-foreground ring-border hover:bg-white/80"
          : "bg-white/10 text-white ring-white/30 hover:bg-white/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
