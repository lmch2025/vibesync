"use client";
import { motion } from "framer-motion";
import {
  Eye,
  Gift,
  Mic,
  ShieldCheck,
  Waves,
  Video,
} from "lucide-react";
import { Reveal, SectionHeading, staggerChild, staggerParent } from "./primitives";

const FEATURES = [
  {
    icon: Video,
    title: "Vidéo 15s authentique",
    body: "Une vidéo mouvante plutôt que 6 photos figées. Fini le catfish et les fausses identités.",
    accent: "from-vibe-purple to-vibe-pink",
  },
  {
    icon: Waves,
    title: "Vibe Check",
    body: "Mini-jeu de compatibilité avant le match. Vous voyez la réponse de l'autre seulement si vous répondez pareil.",
    accent: "from-vibe-pink to-vibe-orange",
  },
  {
    icon: Mic,
    title: "Audio Dating / Blind Swipe",
    body: "Mode voix + flou artistique pour découvrir la personnalité avant le visage. Le slow dating version sonore.",
    accent: "from-vibe-orange to-vibe-purple",
  },
  {
    icon: ShieldCheck,
    title: "IA de modération",
    body: "Rejet automatique des contenus inappropriés (nudité, mineurs,deepfakes). La sécurité avant tout.",
    accent: "from-vibe-purple to-vibe-pink",
  },
  {
    icon: Eye,
    title: "Messagerie anti-spam",
    body: "Tu peux ouvrir la conversation, mais pour la poursuivre il faut un match réel. Débloque avec quelques Vibes.",
    accent: "from-vibe-pink to-vibe-orange",
  },
  {
    icon: Gift,
    title: "Cadeaux virtuels monétisables",
    body: "Offre une Rose, un Dîner Romantique ou un Weekend. Chaque cadeau reçu = valeur en € dans ton wallet.",
    accent: "from-vibe-orange to-vibe-purple",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="relative py-16 sm:py-24 scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Pourquoi Vivilov"
            title={<>Le dating repensé pour la <span className="vibe-text-gradient">vraie vie</span></>}
            subtitle="Six briques qui cassent le modèle de l'abonnement et réinventent la rencontre en ligne."
          />
        </Reveal>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={staggerChild}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative rounded-3xl glass ring-1 ring-border/60 p-6 hover:ring-vibe-purple/40 transition-shadow hover:shadow-xl"
              >
                <div className={`inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.accent} text-white shadow-lg mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground text-pretty">{f.body}</p>
                <span className="absolute right-5 top-5 h-1.5 w-1.5 rounded-full bg-vibe-orange opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
