"use client";
import { motion } from "framer-motion";
import { Gift, Heart, Video } from "lucide-react";
import { Reveal, SectionHeading, staggerChild, staggerParent } from "./primitives";
import { useI18n } from "@/lib/vibe/i18n";

// Les titres/corps sont des clés i18n (résolues au rendu via t()).
const STEPS = [
  {
    n: 1,
    icon: Video,
    title: "landing.how.s1.title",
    body: "landing.how.s1.body",
    accent: "from-vibe-purple to-vibe-pink",
  },
  {
    n: 2,
    icon: Heart,
    title: "landing.how.s2.title",
    body: "landing.how.s2.body",
    accent: "from-vibe-pink to-vibe-orange",
  },
  {
    n: 3,
    icon: Gift,
    title: "landing.how.s3.title",
    body: "landing.how.s3.body",
    accent: "from-vibe-orange to-vibe-purple",
  },
];

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section id="concept" className="relative py-16 sm:py-24 scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow={t("landing.how.eyebrow")}
            title={<>{t("landing.how.titleA")} <span className="vibe-text-gradient">{t("landing.how.titleB")}</span></>}
            subtitle={t("landing.how.subtitle")}
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
                    <h3 className="font-display text-xl font-bold">{t(s.title)}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{t(s.body)}</p>
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
