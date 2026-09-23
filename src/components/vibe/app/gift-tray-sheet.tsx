"use client";
// GiftTraySheet — extracted from swipe-screen.tsx (Task 5-b) so the Likes
// viewer can reuse the exact same elegant gift tray. Zero visual change:
// same layout, classes, i18n keys and behavior as the original internal
// component. The `target` prop is now a minimal STRUCTURAL type — any
// profile-like object with { id, displayName, city, posterUrl? } works
// (the swipe-screen Profile type satisfies it, and so does a LikesViewer
// liker).
//
// S'ouvre depuis le bouton 🎁 de la barre d'actions du Découvrir tab (ou
// depuis la vue détaillée d'un liker du LikesViewer). Permet d'offrir un
// cadeau DIRECTEMENT au profil ciblé — sans attendre un match. Le
// destinataire reçoit une notification et touche 70% de la valeur du
// cadeau. Un cadeau insuffisamment couvert par le solde redirige vers la
// page d'achat de Vibes (l'envoi reprend après achat) — la logique de
// déduction vit dans le `onSend` fourni par le parent (sendDeckGift).
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { GIFTS } from "@/lib/vibe/constants";
import { useCurrency } from "@/lib/vibe/use-currency";
import { useI18n } from "@/lib/vibe/i18n";

/// Cible structurelle minimale — le parent fournit le profil à qui offrir
/// (carte du deck, liker du LikesViewer…). `posterUrl` est accepté mais
/// volontairement inutilisé ici : le tray n'affiche que nom + ville.
export type GiftTrayTarget = {
  id: string;
  displayName: string;
  city: string;
  posterUrl?: string | null;
};

export function GiftTraySheet({
  open,
  onOpenChange,
  target,
  note,
  onNoteChange,
  onSend,
  gems,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: GiftTrayTarget | null;
  note: string;
  onNoteChange: (n: string) => void;
  onSend: (giftKey: string) => void;
  gems: number;
}) {
  const { t } = useI18n();
  const { moneyCents } = useCurrency();

  return (
    <AnimatePresence>
      {open && target && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-label={t("swipe.giftTray.aria", { name: target.displayName })}
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl v-surface-solid v-fg ring-1 ring-(--v-divider) max-h-[78vh] overflow-y-auto no-scrollbar"
          >
            {/* Gradient header — receiver identity + balance */}
            <div className="relative vibe-gradient px-4 pt-4 pb-5 overflow-hidden rounded-t-3xl">
              <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid place-items-center h-11 w-11 rounded-2xl bg-white/20 backdrop-blur shrink-0 text-2xl">
                  🎁
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-lg text-white leading-tight">
                    {t("swipe.giftTray.title")}
                  </h3>
                  <p className="text-[11px] text-white/80 truncate">
                    {t("swipe.giftTray.to")} <span className="font-semibold text-white">{target.displayName}</span>
                    {" · "}
                    {target.city}
                  </p>
                </div>
                <motion.button
                  onClick={() => onOpenChange(false)}
                  whileTap={{ scale: 0.88 }}
                  aria-label={t("swipe.giftTray.closeAria")}
                  className="h-8 w-8 grid place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 transition shrink-0"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
              <p className="relative text-[10px] text-white/75 mt-2 leading-relaxed">
                {t("swipe.giftTray.notice")}
              </p>
              <div className="relative mt-3 flex items-center gap-1.5 rounded-full bg-white/15 ring-1 ring-white/25 px-3 py-1.5 w-fit">
                <GemIcon className="h-3.5 w-3.5 text-white" />
                <span className="text-xs font-bold tabular-nums text-white">{gems}</span>
                <span className="text-[10px] text-white/75">Vibes</span>
              </div>
            </div>

            {/* Body — note + gift grid */}
            <div className="p-4 pb-6">
              <input
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                maxLength={200}
                placeholder={t("swipe.giftTray.notePlaceholder")}
                className="w-full h-10 rounded-xl v-surface-1 ring-1 ring-(--v-divider) px-3 text-sm placeholder:v-fg-muted outline-none focus:ring-vibe-purple/50 mb-3"
              />
              <div className="grid grid-cols-4 gap-2">
                {GIFTS.map((g) => {
                  const affordable = gems >= g.gemCost;
                  return (
                    <motion.button
                      key={g.key}
                      onClick={() => onSend(g.key)}
                      whileTap={{ scale: 0.93 }}
                      aria-label={t("swipe.giftTray.giftAria", { name: g.name, cost: g.gemCost })}
                      className={`relative flex flex-col items-center gap-1 rounded-2xl v-surface-1 ring-1 ring-(--v-divider) p-2.5 hover:v-surface-2 hover:ring-vibe-purple/40 transition text-center ${
                        affordable ? "" : "opacity-55"
                      }`}
                    >
                      {g.popular && (
                        <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-accent text-black font-bold rounded-full px-1 py-0.5">
                          HOT
                        </span>
                      )}
                      <span className="text-[26px] leading-none mt-0.5">{g.emoji}</span>
                      <span className="text-[10px] font-semibold leading-tight v-fg line-clamp-2 min-h-[2.2em] flex items-center">
                        {g.name}
                      </span>
                      <span className="text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-300 flex items-center gap-0.5">
                        <GemIcon className="h-2.5 w-2.5" /> {g.gemCost}
                      </span>
                      <span className="text-[8px] text-emerald-600 dark:text-emerald-300/80">
                        {t("swipe.giftTray.shareValue", { value: moneyCents(g.eurValueCents * 0.7) })}
                      </span>
                      {!affordable && (
                        <span className="text-[8px] v-fg-muted">{t("swipe.giftTray.rechargeNeeded")}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[10px] v-fg-muted text-center mt-3 leading-relaxed">
                {t("swipe.giftTray.footnote")}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
