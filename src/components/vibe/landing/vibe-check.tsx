"use client";
import { motion } from "framer-motion";
import { BadgeCheck, Waves } from "lucide-react";
import { Reveal, SectionHeading } from "./primitives";

const QUESTION = "Plage ou Montagne ?";
const OPTIONS = [
  { key: "plage", label: "Plage", emoji: "🏖️" },
  { key: "montagne", label: "Montagne", emoji: "⛰️" },
];
const MATCH_KEY = "plage";

export function VibeCheckShowcase() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 h-72 w-72 rounded-full bg-vibe-pink/15 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-vibe-purple/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left — mock profile card */}
          <Reveal className="order-2 lg:order-1">
            <div className="relative mx-auto max-w-sm">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-border/60 shadow-2xl bg-gradient-to-br from-vibe-purple-soft via-vibe-pink to-vibe-orange">
                {/* abstract profile silhouette */}
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center text-white">
                    <div className="mx-auto h-24 w-24 rounded-full bg-white/20 backdrop-blur grid place-items-center text-5xl">
                      ✨
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1.5 font-display font-bold text-xl">
                      Aria, 23 <BadgeCheck className="h-4 w-4" />
                    </div>
                    <div className="text-white/80 text-sm">Bordeaux · 2 km</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/10" />

                {/* Vibe Check overlay */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="absolute bottom-3 inset-x-3 glass-dark rounded-2xl p-4"
                >
                  <div className="flex items-center gap-1.5 text-white text-xs font-semibold mb-2">
                    <Waves className="h-3.5 w-3.5 text-vibe-orange" />
                    Vibe Check
                  </div>
                  <p className="text-white font-display font-bold text-lg text-center mb-3">{QUESTION}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {OPTIONS.map((o) => {
                      const isMatch = o.key === MATCH_KEY;
                      return (
                        <motion.div
                          key={o.key}
                          animate={isMatch ? { scale: [1, 1.04, 1] } : {}}
                          transition={isMatch ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : {}}
                          className={`relative rounded-xl px-3 py-3 text-center font-bold ${
                            isMatch ? "text-white" : "text-white/80 bg-white/10"
                          }`}
                          style={isMatch ? { backgroundImage: "linear-gradient(135deg, var(--vibe-purple), var(--vibe-pink))" } : undefined}
                        >
                          <span className="mr-1">{o.emoji}</span>
                          {o.label}
                          {isMatch && (
                            <span className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-vibe-orange text-[10px] font-black text-white ring-2 ring-white">
                              ✓
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </div>
          </Reveal>

          {/* Right — copy */}
          <Reveal className="order-1 lg:order-2">
            <SectionHeading
              align="left"
              eyebrow="Vibe Check"
              title={<>Le match qui <span className="vibe-text-gradient">communique vraiment</span></>}
              subtitle="Avant d'ouvrir une conversation, vous répondez tous les deux à une question légère. La réponse de l'autre ne s'affiche que si elle correspond à la tienne. 87 % des matchs viennent d'ici."
            />
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Pas de mauvaises surprises : tu sais déjà si vous partagez une vibe.",
                "Aucune réponse forcée : tu peux skipper la question si elle ne te parle pas.",
                "Plus de 50 questions rotatives pour garder la fraîcheur.",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 grid h-5 w-5 place-items-center rounded-full vibe-gradient text-white text-[10px] font-bold shrink-0">
                    ✓
                  </span>
                  <span className="text-foreground/80">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
