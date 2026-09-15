"use client";
import { motion } from "framer-motion";
import { Check, Gem, Tag } from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { Reveal, SectionHeading, staggerChild, staggerParent, PrimaryCta } from "./primitives";
import { useCurrency } from "@/lib/vibe/use-currency";
import { formatInt } from "@/lib/vibe/currency";
import { GEM_PACKS, GEM_ACTIONS, WITHDRAWAL_THRESHOLD_EUR } from "@/lib/vibe/constants";
import { cn } from "@/lib/utils";

const RIBBON: Record<string, string> = {
  popular: "POPULAIRE",
  bestValue: "MEILLEURE VALEUR",
};

const ACCENT_RING: Record<string, string> = {
  purple: "from-vibe-purple to-vibe-pink",
  orange: "from-vibe-orange to-vibe-pink",
  pink: "from-vibe-pink to-vibe-purple",
};

function PackCard({ pack, onBuy }: { pack: (typeof GEM_PACKS)[number]; onBuy: () => void }) {
  const { currency, formatIn } = useCurrency();
  const tier = pack.tiers.find((t) => t.currency === currency) ?? pack.tiers[0];
  const ribbon = pack.popular ? "popular" : pack.bestValue ? "bestValue" : null;

  return (
    <motion.div variants={staggerChild} className="relative h-full">
      <div
        className={cn(
          "relative h-full rounded-3xl p-[1.5px] transition-all",
          ribbon ? "bg-gradient-to-br " + ACCENT_RING[pack.accent] : "bg-border/60"
        )}
      >
        <div className="relative h-full rounded-3xl bg-card flex flex-col p-6 sm:p-7">
          {ribbon && (
            <span
              className={cn(
                "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black tracking-wider text-white shadow-lg bg-gradient-to-r",
                ACCENT_RING[pack.accent]
              )}
            >
              {RIBBON[ribbon]}
            </span>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Tag className="h-3.5 w-3.5 text-vibe-orange" />
            Pack {pack.id}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className={cn("grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", ACCENT_RING[pack.accent])}>
              <Gem className="h-7 w-7" />
            </span>
            <div>
              <div className="font-display text-3xl font-black flex items-center gap-1.5">
                <GemIcon className="h-6 w-6" />
                {formatInt(pack.gems)}
              </div>
              {pack.bonus > 0 && (
                <div className="text-xs font-semibold text-vibe-orange">
                  + {formatInt(pack.bonus)} Vibes bonus
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold vibe-text-gradient">{formatIn(tier.amount, tier.currency)}</span>
            <span className="text-xs text-muted-foreground">prix fixe {tier.currency}</span>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-muted-foreground flex-1">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-vibe-purple" /> Sans abonnement
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-vibe-purple" /> Valable à vie
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-vibe-purple" /> Paiement dans ta devise
            </li>
          </ul>

          <PrimaryCta onClick={onBuy} className="w-full mt-6">
            Acheter
          </PrimaryCta>
        </div>
      </div>
    </motion.div>
  );
}

const ACTIONS_FULL: { label: string; cost: number }[] = [
  { label: "Super-Like", cost: GEM_ACTIONS.superlike },
  { label: "Boost de profil (30 min)", cost: GEM_ACTIONS.boost },
  { label: "Cadeaux virtuels", cost: 10 },
  { label: "Voir les likes reçus", cost: GEM_ACTIONS.seeLikes },
  { label: "Rewind", cost: GEM_ACTIONS.rewind },
  { label: "Passport (changer de ville)", cost: GEM_ACTIONS.passport },
  { label: "Icebreaker IA", cost: GEM_ACTIONS.icebreaker },
  { label: "Boost de message", cost: GEM_ACTIONS.messageBoost },
];

export function Pricing({ onEnterApp }: { onEnterApp: () => void }) {
  const { money } = useCurrency();
  return (
    <section id="tarifs" className="relative py-16 sm:py-24 scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Tarifs"
            title={<>Zéro abonnement. <span className="vibe-text-gradient">Juste des Vibes.</span></>}
            subtitle="Tu ne paies que si tu veux accélérer — sinon, swip' and vibe gratuitement. Les Vibes ne sont jamais perdues : elles dorment dans ton wallet."
          />
        </Reveal>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 grid md:grid-cols-3 gap-5 sm:gap-6 items-stretch"
        >
          {GEM_PACKS.map((p) => (
            <PackCard key={p.id} pack={p} onBuy={onEnterApp} />
          ))}
        </motion.div>

        {/* Actions table */}
        <Reveal delay={0.1}>
          <div className="mt-10 rounded-3xl glass ring-1 ring-border/60 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">À quoi servent les Vibes ?</h3>
                <p className="text-sm text-muted-foreground">8 actions, prix transparent. Aucune surprise.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-vibe-gradient-soft px-3 py-1 text-xs font-semibold ring-1 ring-border/60">
                <GemIcon className="h-3.5 w-3.5" /> Sans abonnement
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
              {ACTIONS_FULL.map((a) => (
                <div key={a.label} className="flex items-center justify-between gap-2 px-5 py-4">
                  <span className="text-sm text-foreground/80">{a.label}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums">
                    <GemIcon className="h-3.5 w-3.5" />
                    {a.cost}
                    {a.label === "Cadeaux virtuels" && <span className="text-muted-foreground text-xs">– 500</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Withdrawal note */}
        <Reveal delay={0.15}>
          <p className="mt-5 text-center text-sm text-muted-foreground text-pretty max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <GemIcon className="h-3.5 w-3.5" />
              1 cadeau reçu
            </span>{" "}
            = valeur en € affichée dans TA devise, retirable via{" "}
            <span className="font-semibold text-foreground">Stripe Connect</span> dès{" "}
            <span className="font-semibold vibe-text-gradient">{money(WITHDRAWAL_THRESHOLD_EUR)}</span>.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
