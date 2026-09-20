"use client";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, SectionHeading } from "./primitives";
import { useI18n } from "@/lib/vibe/i18n";

// q/a = clés i18n (résolues au rendu via t()).
const FAQS = [
  {
    q: "landing.faq.q1",
    a: "landing.faq.a1",
  },
  {
    q: "landing.faq.q2",
    a: "landing.faq.a2",
  },
  {
    q: "landing.faq.q3",
    a: "landing.faq.a3",
  },
  {
    q: "landing.faq.q4",
    a: "landing.faq.a4",
  },
  {
    q: "landing.faq.q5",
    a: "landing.faq.a5",
  },
  {
    q: "landing.faq.q6",
    a: "landing.faq.a6",
  },
];

export function Faq() {
  const { t } = useI18n();
  return (
    <section id="faq" className="relative py-16 sm:py-24 scroll-mt-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title={<>{t("landing.faq.titleA")} <span className="vibe-text-gradient">{t("landing.faq.titleB")}</span></>}
            subtitle={t("landing.faq.subtitle")}
          />
        </Reveal>

        <Reveal delay={0.1}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-10 rounded-3xl glass ring-1 ring-border/60 p-2 sm:p-3"
          >
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-2xl px-3 sm:px-5 data-[state=open]:bg-vibe-gradient-soft transition-colors"
                >
                  <AccordionTrigger className="font-display text-base sm:text-lg font-bold text-left hover:no-underline">
                    {t(f.q)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm sm:text-base text-muted-foreground text-pretty leading-relaxed pb-5">
                    {t(f.a)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
