"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useCurrency } from "@/lib/vibe/use-currency";
import { cn } from "@/lib/utils";

export function CurrencySwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { currency, setCurrency, list, flag, symbol } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full ring-1 ring-border bg-card/70 backdrop-blur px-3 py-1.5 text-sm font-medium hover:bg-accent/10 transition",
          compact && "px-2 py-1"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{flag}</span>
        <span className="tabular-nums">{currency}</span>
        <span className="text-muted-foreground">{symbol}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 max-h-72 overflow-y-auto scrollbar-vibe rounded-2xl bg-popover/95 backdrop-blur-xl ring-1 ring-border shadow-xl p-1.5 z-50"
            role="listbox"
          >
            {list.map((c) => (
              <li key={c.code}>
                <button
                  onClick={() => {
                    setCurrency(c.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm hover:bg-accent/15 transition text-left",
                    c.code === currency && "bg-accent/10"
                  )}
                  role="option"
                  aria-selected={c.code === currency}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span className="flex-1">
                    <span className="block font-medium">{c.code} <span className="text-muted-foreground">{c.symbol}</span></span>
                    <span className="block text-xs text-muted-foreground">{c.name}</span>
                  </span>
                  {c.code === currency && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
