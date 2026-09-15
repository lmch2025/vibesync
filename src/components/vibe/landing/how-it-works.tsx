"use client";
import { motion } from "framer-motion";
import { Gift, Heart, Video } from "lucide-react";
import { Reveal, SectionHeading, staggerChild, staggerParent } from "./primitives";

const STEPS = [
  {
    n: 1,
    icon: Video,
    title: "Enregistre ta vidéo 15s",
    body: "Présente-toi en mouvement, sans filtre ni photo retouchée. Une vidéo brute = zéro catfish.",
    accent: "from-vibe-purple to-vibe-pink",
  },
  {
    n: 2,
    icon: Heart,
    title: "Swipe, match, vibe check",
    body: "Like les profils qui te font vibrer. Réponds au Vibe Check : si vous choisissez pareil, le match s'ouvre.",
    accent: "from-vibe-pink to-vibe-orange",
  },
  {
    n: 3,
    icon: Gift,
    title: "Offre des cadeaux, gagne des €",
    body: "Envoie des cadeaux virtuels payés en Vibes. Reçois-en ? Ils se convertissent en € retirable via Stripe.",
    accent: "from-vibe-orange to-vibe-purple",
  },
];

export function HowItWorks() {
  return (
    <section id="concept" className="relative py-16 sm:py-24 scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Comment ça marche"
            title={<>3 vibrations pour passer du swipe au <span className="vibe-text-gradient">match réel</span></>}
            subtitle="Vivilov remplace le profil figé par une vidéo vivante. Trois étapes, c'est tout."
          />
        </Reveal>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 grid md:grid-cols-3 gap-5 sm:gap-6"
        >
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.n} variants={staggerChild}>
                <div className="group relative h-full rounded-3xl p-[1.5px] transition-all hover:scale-[1.015]">
                  {/* gradient ring on hover */}
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${s.accent} opacity-0 group-hover:opacity-100 transition-opacity blur-[2px]`} />
                  <div className="relative h-full rounded-3xl bg-card ring-1 ring-border/60 p-6 sm:p-7 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${s.accent} text-white shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-display text-5xl font-black text-muted-foreground/15">0{s.n}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold">{s.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{s.body}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
