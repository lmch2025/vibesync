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
import { useI18n } from "@/lib/vibe/i18n";

// Les titres/corps sont des clés i18n (résolues au rendu via t()).
const FEATURES = [
  {
    icon: Video,
    title: "landing.features.f1.title",
    body: "landing.features.f1.body",
    accent: "from-vibe-purple to-vibe-pink",
  },
  {
    icon: Waves,
    title: "landing.features.f2.title",
    body: "landing.features.f2.body",
    accent: "from-vibe-pink to-vibe-orange",
  },
  {
    icon: Mic,
    title: "landing.features.f3.title",
    body: "landing.features.f3.body",
    accent: "from-vibe-orange to-vibe-purple",
  },
  {
    icon: ShieldCheck,
    title: "landing.features.f4.title",
    body: "landing.features.f4.body",
    accent: "from-vibe-purple to-vibe-pink",
  },
  {
    icon: Eye,
    title: "landing.features.f5.title",
    body: "landing.features.f5.body",
    accent: "from-vibe-pink to-vibe-orange",
  },
  {
    icon: Gift,
    title: "landing.features.f6.title",
    body: "landing.features.f6.body",
    accent: "from-vibe-orange to-vibe-purple",
  },
];

export function Features() {
  const { t } = useI18n();
  return (
    <section id="fonctionnalites" className="relative py-16 sm:py-24 scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow={t("landing.features.eyebrow")}
            title={<>{t("landing.features.titleA")} <span className="vibe-text-gradient">{t("landing.features.titleB")}</span></>}
            subtitle={t("landing.features.subtitle")}
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
                <h3 className="font-display text-lg font-bold mb-1.5">{t(f.title)}</h3>
                <p className="text-sm text-muted-foreground text-pretty">{t(f.body)}</p>
                <span className="absolute right-5 top-5 h-1.5 w-1.5 rounded-full bg-vibe-orange opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
