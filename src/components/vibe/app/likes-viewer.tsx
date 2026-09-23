"use client";
// LikesViewer — élégante vue plein écran « Ils t'ont liké » (Task 5-b).
//
// Remplace l'ancien modal de succès auto-fermé (4 s) du paiement seeLikes :
// payer ouvre une FENÊTRE D'ACCÈS PERSISTANTE (User.seeLikesUntil, durée
// admin seeLikesWindowMin, défaut 5 min) pendant laquelle :
//   • un BOUTON DISCRET ❤️ mm:ss (LikesAccessButton) reste visible dans le
//     cluster haut-droit de l'app — rendu null hors fenêtre = zéro clutter ;
//   • ce viewer se rouvre instantanément (fetch /api/vibe/me/likes) via
//     l'événement `tiluu:open-likes` ;
//   • le paiement (premium-actions-sheet) injecte directement les likers
//     riches via `tiluu:seeLikes-granted` (aucun fetch, aucune latence).
//
// Interactions dans les limites de la plateforme : like/super-like en
// retour = MATCH INSTANTÉ (le liker nous a déjà liké·e) → fermeture du
// viewer PUIS célébration MatchOverlay (z-50 au niveau app) ; pass = retrait
// local de la carte (animation layout) ; cadeau → conversation privée
// (GiftTraySheet extrait, chip Matché ✓ + bouton chat) ; chat direct si
// matchId. Rafraîchissement silencieux après chaque interaction réussie.
//
// Structure : overlay absolute inset-0 z-[60] DANS la colonne app (jamais
// fixed — la colonne mobile reste la limite visuelle), backdrop flouté +
// conteneur qui monte du bas (spring douce, comme le sheet premium).
// Escape ferme (les overlays internes — modal détail — gèrent le leur).
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Heart, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { ProfileDetailModal } from "./profile-detail-modal";
import { GiftTraySheet } from "./gift-tray-sheet";
import { sfx, haptic, celebrate } from "./interactive-animations";
import { vibeToast } from "./center-feedback";
import { useVibe } from "@/lib/vibe/store";
import { useI18n } from "@/lib/vibe/i18n";
import { GEM_ACTIONS, GIFTS } from "@/lib/vibe/constants";

/// Contrat gelé avec l'API (lib/vibe/likes.ts côté serveur — GET
/// /api/vibe/me/likes ET POST gems/spend seeLikes renvoient EXACTEMENT cette
/// forme). `id` = id de PROFIL du liker (poignée des API swipe/cadeau).
export type RichLiker = {
  id: string;
  displayName: string;
  age: number;
  city: string;
  bio: string;
  posterUrl: string;
  videoUrl: string;
  videoDuration: number;
  gender: string;
  vibeQuestion: string;
  vibeAnswer: string;
  verified: boolean;
  direction: "like" | "superlike";
  likedAt: string;
  myDirection: "like" | "superlike" | "pass" | null;
  matched: boolean;
  matchId: string | null;
  videos: { url: string; poster: string }[];
  photos: string[];
  lookingFor: string;
  relationshipType: string;
  distanceKm: number | null;
};

/// Réponse de GET /api/vibe/me/likes (et du payload granted du paiement).
type LikesPayload = {
  until: string | null;
  likers: RichLiker[];
  hiddenByGhost: number;
};

/// Détail de l'événement `tiluu:seeLikes-granted` (paiement seeLikes).
type GrantedDetail = { until?: string; likers?: RichLiker[]; hiddenByGhost?: number };

type MatchPayload = {
  id: string;
  withProfile: { id: string; displayName: string; posterUrl: string; city: string };
};

type SwipeResponse = {
  error?: string;
  locked?: boolean;
  gems?: number;
  freeGems?: number;
  match?: MatchPayload | null;
};

type GiftSendResponse = {
  error?: string;
  gems?: number;
  freeGems?: number;
  targetName?: string;
  matchId?: string;
  needPurchased?: boolean;
  needVibes?: boolean;
  purchasedGems?: number;
};

/// mm:ss tabular (fenêtre ≤ 60 min côté admin — le format tient toujours).
function formatMmSs(remainingMs: number): string {
  const clamped = Math.max(0, remainingMs);
  const mm = Math.floor(clamped / 60000);
  const ss = Math.floor((clamped % 60000) / 1000);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LikesAccessButton — pilule discrète ❤️ + compte à rebours en direct.
// Rendu null hors fenêtre d'accès (aucun encombrement d'interface).
// ─────────────────────────────────────────────────────────────────────────────
export function LikesAccessButton() {
  const me = useVibe((s) => s.me);
  const { t } = useI18n();
  const until = me?.seeLikesUntil ?? null;
  const [now, setNow] = useState(() => Date.now());

  // Tick 1 s uniquement pendant une fenêtre active — nettoyé au démontage
  // (et quand `until` change : prolongation → reset propre du compte à rebours).
  useEffect(() => {
    if (!until) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [until]);

  const end = until ? new Date(until).getTime() : 0;
  const remaining = end - now;
  // Pas de fenêtre (ou horodatage invalide/périmé) → RIEN (zéro clutter).
  if (!me || !until || !Number.isFinite(end) || remaining <= 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        sfx.play("pop");
        haptic(8);
        window.dispatchEvent(new Event("tiluu:open-likes"));
      }}
      aria-label={t("likes.discreetAria")}
      className="inline-flex items-center gap-1 rounded-full vibe-gradient-soft ring-1 ring-accent/30 px-2.5 py-1 text-[10px] font-bold text-vibe-purple dark:text-vibe-pink hover:ring-accent/60 transition"
    >
      <Heart className="h-3 w-3 text-rose-500 dark:text-rose-300" fill="currentColor" aria-hidden />
      <span className="tabular-nums">{formatMmSs(remaining)}</span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LikesViewer — overlay plein écran, état d'ouverture autonome (événements).
// ─────────────────────────────────────────────────────────────────────────────
export function LikesViewer({
  onMatch,
  onOpenChat,
  onExtend,
}: {
  /// Match instantané (like/super-like en retour) — le viewer se ferme AVANT
  /// pour laisser la célébration MatchOverlay (z-50, niveau app) visible.
  onMatch: (m: MatchPayload) => void;
  /// Ouvre la conversation privée (chip Matché ✓ → bouton chat).
  onOpenChat: (target: { id: string; name: string; poster: string | null }) => void;
  /// Accès expiré → CTA « Prolonger » (rouvre le sheet premium).
  onExtend: () => void;
}) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const requireVibes = useVibe((s) => s.requireVibes);
  const { t, apiErr } = useI18n();

  // ── Données (conservées entre deux ouvertures — ré-ouverture instantanée)
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState<string | null>(null);
  const [likers, setLikers] = useState<RichLiker[]>([]);
  const [hiddenByGhost, setHiddenByGhost] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ── Overlays internes (modal détail + tray cadeau, rendus DANS le viewer)
  const [detailLiker, setDetailLiker] = useState<RichLiker | null>(null);
  const [giftTarget, setGiftTarget] = useState<RichLiker | null>(null);
  const [giftNote, setGiftNote] = useState("");
  // ── Tick 1 s pendant l'ouverture (compte à rebours + barre de progression)
  const [now, setNow] = useState(() => Date.now());

  const endMs = until ? new Date(until).getTime() : 0;
  const remainingMs = endMs - now;
  const expired = !until || remainingMs <= 0;
  const progressPct =
    totalMs > 0 ? Math.max(0, Math.min(100, (Math.max(0, remainingMs) / totalMs) * 100)) : 0;

  /// Total de référence pour la barre de progression : relevé à chaque
  /// révélation, en garde le max (une prolongation repart d'une base saine).
  const trackTotal = useCallback((untilIso: string) => {
    const ms = new Date(untilIso).getTime() - Date.now();
    if (Number.isFinite(ms)) setTotalMs((tot) => Math.max(tot, ms));
  }, []);

  /// Fetch de la fenêtre d'accès. `silent` : post-interaction — pas de
  /// squelette ni d'erreur affichée (la liste locale reste utilisable).
  const fetchLikes = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch("/api/vibe/me/likes");
        const data = (await res.json().catch(() => null)) as LikesPayload | null;
        if (!res.ok || !data) throw new Error((data as { error?: string } | null)?.error ?? "");
        setLikers(Array.isArray(data.likers) ? data.likers : []);
        setHiddenByGhost(Number(data.hiddenByGhost) || 0);
        if (data.until) {
          setUntil(data.until);
          trackTotal(data.until);
        } else if (!silent) {
          // Fenêtre absente à l'ouverture (course : expirée entre le tap sur
          // la pilule et le fetch) → état « accès expiré » honnête, pas une
          // liste vide trompeuse. En silencieux on GARDE le until local —
          // le compte à rebours décide de l'expiration naturellement.
          setUntil(null);
        }
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : "");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [trackTotal],
  );

  /// Fermeture (backdrop / ✕ / Escape) — les DONNÉES restent en state pour
  /// une ré-ouverture instantanée ; seuls les overlays internes se replient.
  const close = useCallback(() => {
    sfx.play("pop");
    setOpen(false);
    setDetailLiker(null);
    setGiftTarget(null);
    setGiftNote("");
  }, []);

  /// Fermeture programmatique (match / chat / prolongation / redirection
  /// Boutique) — pas de son, le flux suivant apporte son propre feedback.
  const closeSilent = useCallback(() => {
    setOpen(false);
    setDetailLiker(null);
    setGiftTarget(null);
    setGiftNote("");
  }, []);

  // ── Événements globaux ──────────────────────────────────────────────────
  useEffect(() => {
    // Pilule ❤️ → ouverture + fetch frais.
    const onOpenLikes = () => {
      setOpen(true);
      setDetailLiker(null);
      setGiftTarget(null);
      setGiftNote("");
      setNow(Date.now());
      void fetchLikes();
    };
    // Paiement seeLikes réussi → injection directe du payload riche (aucun
    // fetch, ouverture instantanée : le viewer EST la célébration).
    const onGranted = (e: Event) => {
      const d = (e as CustomEvent<GrantedDetail>).detail ?? {};
      setOpen(true);
      setLoading(false);
      setError(null);
      setNow(Date.now());
      setDetailLiker(null);
      setGiftTarget(null);
      setGiftNote("");
      setLikers(Array.isArray(d.likers) ? d.likers : []);
      setHiddenByGhost(Number(d.hiddenByGhost) || 0);
      if (d.until) {
        setUntil(d.until);
        trackTotal(d.until);
      }
    };
    // Redirection Boutique déclenchée DEPUIS le viewer (gate super-like,
    // 402 cadeau) → replier l'overlay z-[60] pour laisser la Boutique
    // visible. Les likers restent en state ; l'action en attente reprend
    // après l'achat (pendingProceed du store) et se confirme en vibeToast.
    const onGoBuy = () => closeSilent();
    window.addEventListener("tiluu:open-likes", onOpenLikes);
    window.addEventListener("tiluu:seeLikes-granted", onGranted);
    window.addEventListener("tiluu:go-buy-vibes", onGoBuy);
    return () => {
      window.removeEventListener("tiluu:open-likes", onOpenLikes);
      window.removeEventListener("tiluu:seeLikes-granted", onGranted);
      window.removeEventListener("tiluu:go-buy-vibes", onGoBuy);
    };
  }, [fetchLikes, trackTotal, closeSilent]);

  // Tick 1 s pendant l'ouverture.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  // Escape → ferme le viewer — SAUF si un overlay interne est ouvert (le
  // modal détail gére son propre Escape ; on ne ferme pas les deux d'un coup).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailLiker || giftTarget) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, detailLiker, giftTarget, close]);

  // ── Interactions ────────────────────────────────────────────────────────

  /// Like / super-like / pass en retour sur un liker. Le liker nous a déjà
  /// liké·e → like/super-like = match INSTANTÉ (match toujours non-null au
  /// sens du contrat). Le super-like coûte 5 💎 (gate requireVibes, le
  /// serveur déduit).
  const swipeLiker = (liker: RichLiker, dir: "pass" | "like" | "superlike") => {
    const doSwipe = async () => {
      try {
        const res = await fetch("/api/vibe/swipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: liker.id, direction: dir }),
        });
        const data = (await res.json().catch(() => ({}))) as SwipeResponse;
        if (!res.ok) {
          // 409 « Déjà swipé » → simple info (le serveur refuse le doublon).
          if (res.status === 409) toast.info(apiErr(data.error) || t("likes.passed"));
          else toast.error(apiErr(data.error) || t("profile.error.generic"));
          return;
        }
        if (data.gems !== undefined) patchMe({ gems: data.gems, freeGems: data.freeGems });
        if (dir === "pass") {
          // Retrait local + animation layout — PAS de refetch : le serveur
          // liste encore le liker (myDirection "pass") et le ressusciterait.
          setLikers((ls) => ls.filter((l) => l.id !== liker.id));
          toast.info(t("likes.passed"), { description: liker.displayName, duration: 2000 });
          return;
        }
        if (data.match) {
          // Fermer TOUT le viewer d'abord (z-[60] couvrirait le MatchOverlay
          // z-50 du niveau app), PUIS célébrer.
          closeSilent();
          onMatch(data.match);
          return;
        }
        // Cas limite (match null — le liker nous a pourtant liké·e) : carte
        // mise à jour localement, puis resynchronisation silencieuse.
        setLikers((ls) => ls.map((l) => (l.id === liker.id ? { ...l, myDirection: dir } : l)));
        void fetchLikes(true);
      } catch {
        toast.error(t("profile.error.generic"));
      }
    };
    if (dir === "superlike") {
      requireVibes(GEM_ACTIONS.superlike, t("swipe.cost.superlike"), doSwipe);
    } else {
      void doSwipe();
    }
  };

  /// Offrir un cadeau à un liker — adaptation de sendDeckGift (swipe-screen) :
  /// le serveur ouvre (ou réutilise) une conversation privée, le cadeau y
  /// atterrit en première bulle, le destinataire est notifié + crédité de sa
  /// part. Les cadeaux exigent des Vibes ACHETÉES — un 402 redirige vers la
  /// Boutique et l'envoi reprend automatiquement après l'achat.
  const sendGift = (giftKey: string) => {
    const target = giftTarget;
    const gift = GIFTS.find((g) => g.key === giftKey);
    if (!target || !gift) return;
    const note = giftNote.trim();
    requireVibes(gift.gemCost, `${gift.emoji} ${gift.name} (${gift.gemCost} Vibes)`, async () => {
      try {
        const res = await fetch("/api/vibe/gifts/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: target.id, giftKey, messageText: note || undefined }),
        });
        const data = (await res.json().catch(() => ({}))) as GiftSendResponse;
        if (!res.ok) {
          // Cadeau non couvert par des Vibes achetées → page d'achat ; l'envoi
          // reprend après un achat réussi (pending proceed).
          if (res.status === 402 && (data.needPurchased || data.needVibes)) {
            sfx.play("error");
            useVibe.getState().redirectForVibes(
              gift.gemCost,
              data.purchasedGems ?? me?.gems ?? 0,
              `${gift.emoji} ${gift.name}`,
              () => sendGift(giftKey),
            );
            return;
          }
          throw new Error(data.error ?? "");
        }
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        celebrate({ sound: "chime", confettiCount: 90, hapticPattern: [12, 30, 12] });
        const targetName = data.targetName ?? target.displayName;
        vibeToast({
          emoji: gift.emoji,
          title: t("swipe.giftSent.title", { gift: gift.name, name: targetName }),
          // Le serveur a attaché le cadeau à une conversation privée
          // (matchId) — la carte du liker passe en chip Matché ✓ + chat.
          sub: t("swipe.giftSent.sub", { name: targetName }),
        });
        setGiftTarget(null);
        setGiftNote("");
        if (data.matchId) {
          setLikers((ls) =>
            ls.map((l) => (l.id === target.id ? { ...l, matched: true, matchId: data.matchId ?? null } : l)),
          );
        }
        // Fraîcheur : resynchronisation silencieuse (myDirection/matched/matchId).
        void fetchLikes(true);
      } catch (e) {
        toast.error(apiErr(e instanceof Error ? e.message : "") || t("profile.error.generic"));
      }
    });
  };

  /// Chip Matché ✓ → bouton chat : conversation privée directe (matchId).
  const openChat = (liker: RichLiker) => {
    if (!liker.matchId) return;
    sfx.play("pop");
    haptic(8);
    // Fermer le viewer (z-[60]) pour laisser place à l'écran de chat (z-20).
    closeSilent();
    onOpenChat({ id: liker.matchId, name: liker.displayName, poster: liker.posterUrl });
  };

  // ── Rendu ────────────────────────────────────────────────────────────────
  const countLabel =
    likers.length === 1 ? t("likes.count.one") : t("likes.count.many", { n: likers.length });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — floute l'app derrière (comme la vue détaillée) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />

          {/* Viewer plein écran — monte du bas, spring douce (sheet premium) */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label={t("likes.title")}
            className="absolute inset-0 z-[60] w-full max-w-md h-full flex flex-col v-bg-app v-fg overflow-hidden"
          >
            {/* ── Header — bandeau gradient compact (comme le tray cadeau) ── */}
            <div className="relative vibe-gradient px-4 pt-4 pb-5 overflow-hidden shrink-0">
              <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-white/15 blur-2xl" aria-hidden />
              <div className="relative flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-lg text-white leading-tight flex items-center gap-1.5">
                    <span aria-hidden>❤️</span> {t("likes.title")}
                  </h3>
                  <p className="text-[11px] text-white/80 mt-0.5">{t("likes.sub")}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {likers.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-white/15 ring-1 ring-white/25 px-2.5 py-0.5 text-[10px] font-bold text-white">
                        {countLabel}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-black/20 ring-1 ring-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white tabular-nums"
                      aria-label={t("likes.discreetAria")}
                    >
                      <Heart className="h-3 w-3 text-rose-200" fill="currentColor" aria-hidden />
                      {formatMmSs(remainingMs)}
                    </span>
                  </div>
                </div>
                <motion.button
                  onClick={close}
                  whileTap={{ scale: 0.88 }}
                  aria-label={t("common.close")}
                  className="h-8 w-8 grid place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 transition shrink-0"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
              {/* Barre de progression 2px — épinglée au bord inférieur du header */}
              <div
                className="absolute bottom-0 left-0 h-0.5 bg-white/80 transition-[width] duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
                aria-hidden
              />
            </div>

            {/* ── Body — grille scrollable + états ─────────────────────────── */}
            <div className="flex-1 overflow-y-auto scrollbar-vibe p-4">
              {loading ? (
                /* Squelettes — 6 cartes pulsantes, même grille que le rendu réel */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-busy="true">
                  <span className="sr-only">{t("likes.loading")}</span>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] rounded-2xl v-surface-1 animate-pulse" />
                  ))}
                </div>
              ) : error !== null ? (
                /* Erreur de chargement — bouton Réessayer centré */
                <div className="h-full grid place-items-center text-center px-6">
                  <div>
                    <div className="text-4xl mb-3" aria-hidden>⚠️</div>
                    <p className="text-sm v-fg-muted mb-4">
                      {apiErr(error) || t("profile.error.generic")}
                    </p>
                    <button
                      onClick={() => void fetchLikes()}
                      className="h-10 px-5 rounded-full vibe-gradient text-white font-semibold text-sm active:scale-95 transition"
                    >
                      {t("common.retry")}
                    </button>
                  </div>
                </div>
              ) : expired ? (
                /* Expiré — contenu estompé + carte centrée « Prolonger » */
                <div className="relative h-full">
                  <div className="opacity-40 pointer-events-none" aria-hidden>
                    <LikersBody
                      likers={likers}
                      hiddenByGhost={hiddenByGhost}
                      t={t}
                      onOpenDetail={() => {}}
                      onOpenChat={() => {}}
                    />
                  </div>
                  <div className="absolute inset-0 grid place-items-center p-6">
                    <div className="text-center max-w-[280px] rounded-3xl v-surface-solid ring-1 ring-(--v-divider) px-6 py-6 shadow-2xl">
                      <div className="text-4xl mb-2" aria-hidden>⏰</div>
                      <h4 className="font-display text-lg font-bold mb-1">{t("likes.expired.title")}</h4>
                      <p className="text-xs v-fg-muted mb-4 leading-relaxed">{t("likes.expired.sub")}</p>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          onExtend();
                          closeSilent();
                        }}
                        className="h-11 px-6 rounded-full vibe-gradient text-white font-display font-bold text-sm vibe-glow"
                      >
                        {t("likes.expired.cta")}
                      </motion.button>
                    </div>
                  </div>
                </div>
              ) : (
                <LikersBody
                  likers={likers}
                  hiddenByGhost={hiddenByGhost}
                  t={t}
                  onOpenDetail={(l) => {
                    sfx.play("pop");
                    haptic(8);
                    setDetailLiker(l);
                  }}
                  onOpenChat={openChat}
                />
              )}
            </div>

            {/* ── Modal détail (DANS le viewer — RichLiker ⊇ DetailProfile) ── */}
            <ProfileDetailModal
              profile={detailLiker}
              onOpenChange={(o) => {
                if (!o) setDetailLiker(null);
              }}
              onSwipe={(dir) => {
                if (detailLiker) void swipeLiker(detailLiker, dir);
              }}
              onGift={() => {
                // Le modal s'est déjà fermé lui-même — on ouvre le tray
                // cadeau (extrait) ciblé sur ce liker, note vierge conservée.
                if (detailLiker) setGiftTarget(detailLiker);
              }}
              gems={me?.gems ?? 0}
            />

            {/* ── Tray cadeau (extrait de swipe-screen — même esthétique) ── */}
            <GiftTraySheet
              open={giftTarget !== null}
              onOpenChange={(o) => {
                if (!o) {
                  setGiftTarget(null);
                  setGiftNote("");
                }
              }}
              target={giftTarget}
              note={giftNote}
              onNoteChange={setGiftNote}
              onSend={sendGift}
              gems={me?.gems ?? 0}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LikersBody — grille de cartes poster + états vide/fantôme + pied de hint.
// ─────────────────────────────────────────────────────────────────────────────
function LikersBody({
  likers,
  hiddenByGhost,
  t,
  onOpenDetail,
  onOpenChat,
}: {
  likers: RichLiker[];
  hiddenByGhost: number;
  t: ReturnType<typeof useI18n>["t"];
  onOpenDetail: (l: RichLiker) => void;
  onOpenChat: (l: RichLiker) => void;
}) {
  // État vide honnête : personne ne t'a liké (et aucun fantôme caché).
  if (likers.length === 0 && hiddenByGhost === 0) {
    return (
      <div className="h-full grid place-items-center text-center px-6">
        <div>
          <div className="text-5xl mb-3" aria-hidden>💜</div>
          <h4 className="font-display text-xl font-bold mb-1">{t("likes.empty.title")}</h4>
          <p className="text-sm v-fg-muted leading-relaxed">{t("likes.empty.sub")}</p>
        </div>
      </div>
    );
  }
  // Tease fantôme (clés existantes du modal de succès) : des likes existent
  // mais leurs auteurs sont en Mode Fantôme — invisibles jusqu'à la fin de
  // leur buff. Jamais de contenu fabriqué.
  if (likers.length === 0 && hiddenByGhost > 0) {
    return (
      <div className="h-full grid place-items-center px-6">
        <div className="w-full max-w-xs rounded-2xl vibe-gradient-soft ring-1 ring-(--v-divider) px-5 py-5 text-center">
          <div className="text-4xl mb-2" aria-hidden>👻</div>
          <p className="text-sm font-semibold v-fg leading-relaxed">
            {t(hiddenByGhost > 1 ? "premium.result.ghostTease.many" : "premium.result.ghostTease.one", { n: hiddenByGhost })}
          </p>
          <p className="text-[11px] v-fg-muted mt-1.5 leading-relaxed">
            {t(hiddenByGhost > 1 ? "premium.result.ghostTeaseHidden.many" : "premium.result.ghostTeaseHidden.one")}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-label={t("likes.gridAria")}>
        <AnimatePresence initial={false}>
          {likers.map((l) => (
            <motion.li
              key={l.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="min-w-0"
            >
              <LikerCard liker={l} t={t} onOpen={() => onOpenDetail(l)} onChat={() => onOpenChat(l)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <p className="text-[10px] v-fg-muted text-center mt-3 leading-relaxed">{t("likes.hint")}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LikerCard — carte poster 3:4, chips direction (⭐/❤️) + statut
// (Matché ✓ + chat / Liké ✓ / Passé), tap → vue détaillée.
// ─────────────────────────────────────────────────────────────────────────────
function LikerCard({
  liker,
  t,
  onOpen,
  onChat,
}: {
  liker: RichLiker;
  t: ReturnType<typeof useI18n>["t"];
  onOpen: () => void;
  onChat: () => void;
}) {
  const [posterFailed, setPosterFailed] = useState(false);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      whileTap={{ scale: 0.96 }}
      aria-label={`${liker.displayName}, ${liker.age} — ${liker.city}`}
      className="relative block w-full aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-(--v-divider) v-fg-media text-left cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-vibe-purple/60"
    >
      {/* Poster (fallback dégradé si l'image est cassée) */}
      {posterFailed || !liker.posterUrl ? (
        <div className="absolute inset-0 vibe-gradient-soft" aria-hidden />
      ) : (
        <img
          src={liker.posterUrl}
          alt={liker.displayName}
          loading="lazy"
          draggable={false}
          onError={() => setPosterFailed(true)}
          className="absolute inset-0 h-full w-full object-cover select-none"
        />
      )}
      {/* Fondu bas — lisibilité du bloc infos */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" aria-hidden />

      {/* Chip direction — Super-Like ⭐ (ambre) / Like ❤️ (rose) */}
      <span
        className={`absolute top-2 left-2 rounded-full backdrop-blur px-2 py-0.5 text-[9px] font-bold ${
          liker.direction === "superlike" ? "text-amber-300 bg-black/50" : "text-rose-300 bg-black/50"
        }`}
      >
        {liker.direction === "superlike" ? t("likes.chip.superlike") : t("likes.chip.like")}
      </span>

      {/* Statut — Matché ✓ (+ chat) / Liké ✓ / Passé */}
      <span className="absolute top-2 right-2 flex items-center gap-1">
        {liker.matched ? (
          <>
            <span className="rounded-full backdrop-blur px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-black/50">
              {t("likes.matched")}
            </span>
            {liker.matchId && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onChat();
                }}
                whileTap={{ scale: 0.85 }}
                aria-label={t("likes.openChat")}
                className="h-6 w-6 grid place-items-center rounded-full bg-black/50 backdrop-blur text-emerald-300 hover:text-emerald-200 transition"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </>
        ) : liker.myDirection === "like" || liker.myDirection === "superlike" ? (
          <span className="rounded-full backdrop-blur px-2 py-0.5 text-[9px] font-bold text-violet-300 bg-black/50">
            {t("likes.likedBack")}
          </span>
        ) : liker.myDirection === "pass" ? (
          <span className="rounded-full backdrop-blur px-2 py-0.5 text-[9px] font-bold text-white/70 bg-black/50">
            {t("likes.passed")}
          </span>
        ) : null}
      </span>

      {/* Infos — prénom, âge (+ BadgeCheck si vérifié·e), ville */}
      <div className="absolute bottom-2 left-2 right-2 min-w-0">
        <p className="font-display font-bold text-sm text-white truncate flex items-center gap-1">
          <span className="truncate">
            {liker.displayName}, {liker.age}
          </span>
          {liker.verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-label={t("swipe.detail.verifiedAria")} />}
        </p>
        <p className="text-[10px] text-white/75 truncate">{liker.city}</p>
      </div>
    </motion.div>
  );
}
