"use client";
// InsufficientVibesModal — when a user tries a premium action without enough
// Vibes, this elegant modal recommends the SMALLEST pack that covers the need
// (with a clear price in the active currency) + a CTA to view all packs.
// Ultra-intuitive for a non-digital audience: one big "Acheter" button.
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, ThumbsUp, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GemIcon } from "@/components/vibe/gem-badge";
import { useCurrency } from "@/lib/vibe/use-currency";
import { GEM_PACKS } from "@/lib/vibe/constants";

export function InsufficientVibesModal({
  open,
  onOpenChange,
  needed,
  have,
  actionLabel,
  onBuyPack,
  onViewAllPacks,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  needed: number;
  have: number;
  actionLabel: string;
  onBuyPack: (packId: string) => void;
  onViewAllPacks: () => void;
}) {
  const { currency, formatIn } = useCurrency();
  const missing = Math.max(0, needed - have);

  // Recommend the smallest pack that covers the needed Vibes.
  const recommended = useMemo(() => {
    const candidates = GEM_PACKS.filter((p) => p.gems + p.bonus >= needed);
    return (candidates[0] ?? GEM_PACKS[0]);
  }, [needed]);

  const tier = recommended.tiers.find((t) => t.currency === currency) ?? recommended.tiers[0];
  const totalVibes = recommended.gems + recommended.bonus;
  const leftover = totalVibes - needed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 gap-0 overflow-hidden rounded-3xl v-divider v-bg-app! v-fg [&_[data-slot=dialog-close]]:text-white">
        {/* Header */}
        <div className="relative vibe-gradient px-6 pt-6 pb-7 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid place-items-center h-12 w-12 rounded-2xl bg-white/20 backdrop-blur shrink-0">
              <Zap className="h-6 w-6 text-white" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl font-bold text-white">
                Plus assez de Vibes
              </DialogTitle>
              <DialogDescription className="text-white/80 text-sm mt-0.5">
                Pour : {actionLabel}
              </DialogDescription>
            </div>
          </div>
          {/* Vibes deficit */}
          <div className="relative mt-4 flex items-center gap-2 text-white">
            <GemIcon className="h-5 w-5" />
            <span className="text-sm">
              Il te manque <span className="font-bold text-lg tabular-nums">{missing}</span> Vibes
            </span>
            <span className="text-white/60 text-xs ml-auto tabular-nums">
              Solde actuel : {have}
            </span>
          </div>
        </div>

        {/* Recommended pack */}
        <div className="v-bg-app px-5 py-5">
          <p className="text-xs font-semibold v-fg-muted uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5 text-vibe-orange" /> Pack recommandé
          </p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl ring-1 ring-vibe-purple/30 bg-vibe-gradient-soft p-4"
          >
            {recommended.popular && (
              <span className="absolute -top-2 left-3 text-[10px] font-bold rounded-full bg-accent text-black px-2 py-0.5">
                POPULAIRE
              </span>
            )}
            {recommended.bestValue && (
              <span className="absolute -top-2 left-3 text-[10px] font-bold rounded-full bg-fuchsia-400 text-black px-2 py-0.5">
                MEILLEURE VALEUR
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-12 w-12 rounded-xl v-surface-2 shrink-0">
                <GemIcon className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-black tabular-nums">{recommended.gems}</span>
                  <span className="text-xs v-fg-muted">Vibes</span>
                  {recommended.bonus > 0 && (
                    <span className="text-[11px] bg-emerald-400/20 text-emerald-600 dark:text-emerald-300 rounded-full px-1.5 py-0.5">
                      +{recommended.bonus} bonus
                    </span>
                  )}
                </div>
                {leftover > 0 && (
                  <p className="text-[11px] v-fg-muted mt-0.5">
                    Après cet achat, il te restera {leftover} Vibes pour la suite.
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-xl font-bold vibe-text-gradient">
                  {formatIn(tier.amount, tier.currency)}
                </div>
                <div className="text-[10px] v-fg-muted">{tier.currency}</div>
              </div>
            </div>
          </motion.div>

          {/* Buy button — the primary action, big and obvious */}
          <motion.button
            onClick={() => {
              onBuyPack(recommended.id);
              onOpenChange(false);
            }}
            whileTap={{ scale: 0.97 }}
            className="mt-4 w-full h-13 py-3.5 rounded-2xl vibe-gradient text-white font-display font-bold text-base vibe-glow flex items-center justify-center gap-2"
          >
            <Check className="h-5 w-5" />
            Acheter {totalVibes} Vibes — {formatIn(tier.amount, tier.currency)}
          </motion.button>

          {/* Secondary CTA — view all packs */}
          <button
            onClick={() => {
              onViewAllPacks();
              onOpenChange(false);
            }}
            className="mt-2.5 w-full h-11 rounded-2xl bg-transparent ring-1 ring-(--v-divider) v-fg-muted font-medium text-sm flex items-center justify-center gap-1.5 hover:v-surface-2 transition"
          >
            Voir tous les packs <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-[11px] v-fg-muted text-center mt-3 leading-relaxed">
            Pas d&apos;abonnement. Tes Vibes ne expirent jamais. 💎
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
