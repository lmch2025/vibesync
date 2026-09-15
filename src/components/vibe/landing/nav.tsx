"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShieldCheck, Rocket, X } from "lucide-react";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#concept", label: "Concept" },
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

export function Nav({ onEnterApp, onEnterAdmin }: { onEnterApp: () => void; onEnterAdmin: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled ? "py-2" : "py-3 sm:py-4"
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-7xl px-3 sm:px-6 flex items-center justify-between gap-3 rounded-2xl transition-all duration-300",
          scrolled
            ? "glass shadow-lg ring-1 ring-border/60 py-2"
            : "bg-transparent py-1.5"
        )}
      >
        <a href="#top" className="shrink-0 pl-1">
          <VibeLogo />
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors rounded-full hover:bg-vibe-gradient-soft"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onEnterAdmin}
            className="hidden lg:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-border bg-card/60 hover:bg-accent/10 transition"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-vibe-purple" />
            Espace Admin
          </button>
          <motion.button
            onClick={onEnterApp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full vibe-gradient vibe-glow px-4 py-2 text-sm font-semibold text-white"
          >
            <Rocket className="h-3.5 w-3.5" />
            Rejoins l'expérience
          </motion.button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden grid place-items-center h-9 w-9 rounded-full ring-1 ring-border bg-card/60"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="absolute top-0 right-0 h-full w-[82%] max-w-sm bg-background shadow-2xl p-5 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <VibeLogo />
                <button
                  className="grid place-items-center h-9 w-9 rounded-full ring-1 ring-border"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fermer le menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {LINKS.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-3 text-base font-medium text-foreground/80 hover:text-foreground rounded-xl hover:bg-vibe-gradient-soft transition"
                  >
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onEnterAdmin();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold ring-1 ring-border bg-card/60"
                >
                  <ShieldCheck className="h-4 w-4 text-vibe-purple" />
                  Espace Admin
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onEnterApp();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full vibe-gradient vibe-glow px-4 py-3 text-sm font-semibold text-white"
                >
                  <Rocket className="h-4 w-4" />
                  Rejoins l'expérience
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
