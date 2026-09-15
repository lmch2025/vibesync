"use client";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Flame } from "lucide-react";
import { PrimaryCta, GhostCta, Reveal } from "./primitives";

export function FinalCta({ onEnterApp, onEnterAdmin }: { onEnterApp: () => void; onEnterAdmin: () => void }) {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] vibe-gradient p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl">
            {/* Decorative orbs */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-white/20 blur-3xl animate-float-slow" />
              <div
                className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-float-slow"
                style={{ animationDelay: "1.5s" }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold ring-1 ring-white/30">
                <Flame className="h-3.5 w-3.5" />
                Prêt·e à vibrer ?
              </div>

              <h2 className="mt-5 font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-balance">
                Prêt·e à vibrer sur la bonne fréquence ?
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-white/90 text-pretty">
                Rejoins 12 840 membres qui ont troqué les photos figées pour des vidéos vivantes.
                Sans abonnement, sans catfish, sans mauvaise surprise.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <PrimaryCta
                  onClick={onEnterApp}
                  className="bg-white !text-vibe-purple shadow-2xl"
                >
                  Rejoins l'expérience
                  <ArrowRight className="h-4 w-4" />
                </PrimaryCta>
                <GhostCta tone="dark" onClick={onEnterAdmin}>
                  <ShieldCheck className="h-4 w-4" />
                  Voir l'espace admin
                </GhostCta>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="mt-5 text-xs text-white/70"
              >
                Inscription gratuite · 25 Vibes offertes · Sans engagement
              </motion.p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
