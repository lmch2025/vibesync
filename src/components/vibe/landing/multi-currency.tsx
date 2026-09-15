"use client";
import { motion } from "framer-motion";
import { Globe, RefreshCw, Wallet } from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { Reveal, SectionHeading } from "./primitives";
import { useCurrency } from "@/lib/vibe/use-currency";
import { formatMoney } from "@/lib/vibe/currency";
import { GIFTS } from "@/lib/vibe/constants";

const DEMO_CODES = ["EUR", "USD", "XAF"];

const FLAGS: Record<string, { flag: string; label: string }> = {
  EUR: { flag: "🇪🇺", label: "Euro" },
  USD: { flag: "🇺🇸", label: "Dollar US" },
  XAF: { flag: "🇨🇲", label: "Franc CFA" },
};

export function MultiCurrency() {
  const { moneyCents, currency, flag, symbol } = useCurrency();
  // GIFTS[5] = Dîner Romantique, 0.75€ → 75 cents
  const gift = GIFTS[5];
  const giftValue = moneyCents(gift.eurValueCents);

  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-vibe-orange/15 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-vibe-purple/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Multi-devises"
            title={<>Paiement dans ta devise, <span className="vibe-text-gradient">partout</span></>}
            subtitle="Détection automatique du pays via l'en-tête x-vercel-ip-country, prix fixes par région pour les Vibes, conversion temps réel pour les cadeaux et le wallet."
          />
        </Reveal>

        <div className="mt-12 grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left — explanation */}
          <Reveal>
            <div className="space-y-5">
              <div className="rounded-3xl glass ring-1 ring-border/60 p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl vibe-gradient text-white shrink-0">
                    <Globe className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-lg">Détection silencieuse de ton pays</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      On lit l'en-tête HTTP <code className="rounded bg-muted px-1.5 py-0.5 text-xs">x-vercel-ip-country</code> dès
                      ta première visite pour afficher les prix dans ta devise locale — EUR, USD, GBP, CAD, XAF ou JPY.
                      Aucun réglage à faire, c&apos;est automatique.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl glass ring-1 ring-border/60 p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-vibe-pink to-vibe-purple text-white shrink-0">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-lg">Prix fixes par région</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Style App Store : 1,99 € en zone euro, $1.99 aux US, £1.79 au UK, 1 300 FCFA en Afrique centrale,
                      250 ¥ au Japon. Aucune mauvaise surprise de change.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl glass ring-1 ring-border/60 p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-vibe-orange to-vibe-pink text-white shrink-0">
                    <RefreshCw className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-lg">Conversion dynamique des cadeaux</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      La valeur € d&apos;un cadeau reçu est convertie au taux du jour dans TA devise pour l&apos;affichage,
                      puis crédité en € sur ton wallet Stripe Connect.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right — showcase (detected currency + comparison) */}
          <Reveal delay={0.1}>
            <div className="rounded-3xl bg-card ring-1 ring-border/60 shadow-xl p-6 sm:p-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-vibe-gradient-soft px-3 py-1 text-xs font-semibold ring-1 ring-border/60">
                  <GemIcon className="h-3.5 w-3.5" /> Devise détectée
                </div>
                <h3 className="mt-3 font-display text-2xl font-bold">
                  {flag} {currency} {symbol}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cadeau exemple : <span className="font-semibold">{gift.emoji} {gift.name}</span>
                </p>
              </div>

              {/* Detected-currency value */}
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-vibe-purple/10 via-vibe-pink/5 to-vibe-orange/10 p-6 text-center ring-1 ring-border/60">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Valeur affichée ({currency})</div>
                <motion.div
                  key={giftValue}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mt-1 font-display text-4xl sm:text-5xl font-black vibe-text-gradient"
                >
                  {giftValue}
                </motion.div>
                <div className="mt-2 text-xs text-muted-foreground">
                  ≈ 0,75 € · crédité en € sur le wallet Stripe
                </div>
              </div>

              {/* Static comparison across currencies */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {DEMO_CODES.map((code) => {
                  const fmt = formatMoney(0.75, code);
                  const cfg = FLAGS[code];
                  return (
                    <div key={code} className="rounded-xl bg-muted/50 p-2.5">
                      <div className="text-base">{cfg.flag}</div>
                      <div className="text-xs font-semibold tabular-nums">{fmt}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
