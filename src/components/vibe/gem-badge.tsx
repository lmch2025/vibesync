"use client";
import { cn } from "@/lib/utils";

export function GemIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("inline-block", className)} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="vibe-gem-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="55%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <path
        d="M6 3h12l4 6-10 12L2 9l4-6Z"
        fill="url(#vibe-gem-grad)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path d="M2 9h20M9 3 6 9l6 12M15 3l3 6-6 12" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
}

export function GemBadge({
  gems,
  className,
  onClick,
}: {
  gems: number;
  className?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-(--v-surface-2) backdrop-blur-md px-2.5 py-1 text-sm font-semibold v-fg ring-1 ring-(--v-divider)",
        onClick && "transition hover:bg-(--v-surface-3) active:scale-95 cursor-pointer",
        className
      )}
    >
      <GemIcon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{new Intl.NumberFormat("fr-FR").format(gems)}</span>
      <span className="text-xs font-medium ml-0.5">Vibes</span>
      {onClick && <span className="v-fg-muted text-xs ml-0.5">+</span>}
    </Comp>
  );
}
