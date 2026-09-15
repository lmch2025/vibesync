"use client";
import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Realistic phone mockup with a 9:16 screen. Used in the landing hero and
// as the frame for the interactive app demo.
export const PhoneFrame = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { glow?: boolean }>(
  ({ className, children, glow = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative mx-auto",
          "w-[280px] h-[580px] sm:w-[320px] sm:h-[660px]",
          "rounded-[2.6rem] p-[10px]",
          "bg-gradient-to-b from-zinc-800 via-zinc-900 to-black",
          "shadow-[0_2px_4px_rgba(0,0,0,0.3)_inset,0_30px_60px_-20px_rgba(0,0,0,0.7)]",
          "ring-1 ring-white/10",
          glow && "vibe-glow",
          className
        )}
        {...props}
      >
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-28 h-12 w-[3px] rounded-l bg-zinc-700" />
        <span className="absolute -left-[3px] top-44 h-16 w-[3px] rounded-l bg-zinc-700" />
        <span className="absolute -right-[3px] top-40 h-20 w-[3px] rounded-r bg-zinc-700" />
        {/* Screen */}
        <div className="relative h-full w-full rounded-[2.1rem] overflow-hidden bg-black">
          {/* Dynamic island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 h-6 w-24 rounded-full bg-black ring-1 ring-zinc-800 flex items-center justify-end pr-2">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
          </div>
          {children}
        </div>
      </div>
    );
  }
);
PhoneFrame.displayName = "PhoneFrame";

export function PhoneStatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "absolute top-0 inset-x-0 z-20 h-9 flex items-center justify-between px-6 pt-1.5 text-[11px] font-semibold",
        dark ? "text-black" : "text-white"
      )}
    >
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 16 12" className="h-2.5 w-4 fill-current"><path d="M0 9h2v3H0zM4 6h2v6H4zM8 3h2v9H8zM12 0h2v12h-2z"/></svg>
        <svg viewBox="0 0 16 12" className="h-2.5 w-4 fill-current"><path d="M8 2.5c2 0 3.9.8 5.3 2.1l1.1-1.2C12.7 1.7 10.4.8 8 .8S3.3 1.7 1.6 3.4l1.1 1.2C4.1 3.3 6 2.5 8 2.5Zm0 3c1.1 0 2.1.4 2.8 1.2l1.1-1.2C10.8 4.5 9.5 4 8 4s-2.8.5-3.9 1.5l1.1 1.2C6 5.9 7 5.5 8 5.5Zm0 3c.4 0 .8.2 1.1.5l1.1-1.2C9.5 7.3 8.8 7 8 7s-1.5.3-2.2.8l1.1 1.2c.3-.3.7-.5 1.1-.5Z"/></svg>
        <span className="ml-0.5 inline-flex items-center">
          <span className="block h-2.5 w-5 rounded-[3px] ring-1 ring-current/60 relative">
            <span className="absolute inset-0.5 rounded-[1px] bg-current" />
          </span>
          <span className="block h-1.5 w-0.5 ml-px rounded-r bg-current/70" />
        </span>
      </span>
    </div>
  );
}
