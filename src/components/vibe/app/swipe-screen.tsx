"use client";
// Swipe deck: Tinder-like drag with spring physics, Ken Burns video posters,
// clean full-bleed video (the interests/Vibe Check overlay was removed — the
// compatibility data now feeds the contextual nudges only), action bar
// (rewind/pass/gift/like — the Super-Like stays available via the swipe-up
// gesture and the contextual nudges, the premium actions via the 👑 Premium
// button in the header, contextual to the top card), match overlay. Includes
// the non-intrusive discovery FILTERS (distance, age range, gender) — a
// discreet button in the top bar opens a bottom sheet; filters are saved to
// the profile and enforced server-side by the recommendation algorithm.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { RotateCcw, X, Star, Heart, BadgeCheck, MapPin, SlidersHorizontal, Check, Loader2, Plane, Gift, Maximize2 } from "lucide-react";
import { GemBadge, GemIcon } from "@/components/vibe/gem-badge";
import { sfx, haptic, celebrate, EmojiBurst, Shimmer, type SfxName } from "@/components/vibe/app/interactive-animations";
import { VideoPlayer } from "./video-player";
import { ProfileDetailModal } from "./profile-detail-modal";
import { PremiumActionsSheet } from "./premium-actions-sheet";
import { SmartNudgeBanner, useNudgeSlot, type SmartNudge } from "./smart-nudge";
import { vibeToast } from "./center-feedback";
import { useVibe } from "@/lib/vibe/store";
import { GEM_ACTIONS, GIFTS, VIBE_QUESTIONS } from "@/lib/vibe/constants";
import { useCurrency } from "@/lib/vibe/use-currency";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

type Profile = {
  id: string;
  displayName: string;
  age: number;
  city: string;
  bio: string;
  videoUrl: string;
  posterUrl: string;
  videoDuration: number;
  gender: string;
  vibeQuestion: string;
  vibeAnswer: string;
  verified: boolean;
  distanceKm: number | null;
  boosted?: boolean;
  goldenHeart?: boolean;
  spotlight?: boolean;
  passport?: boolean;
  // Contrat deck (Task 1-a) : les 3 slots vidéo + les 5 photos (compactés).
  // Règle métier : la vidéo est prioritaire — dans la VUE DÉTAILLÉE les
  // slides vidéos viennent d'abord, puis toutes les photos (recensées).
  videos?: { url: string; poster: string }[];
  photos?: string[];
  // Intentions du profil — ligne « Recherche » de la vue détaillée.
  lookingFor?: string;
  relationshipType?: string;
};

type SwipeResult = {
  match?: { id: string; withProfile: { id: string; displayName: string; posterUrl: string; city: string } } | null;
  gems: number;
  freeGems?: number;
  error?: string;
  locked?: boolean;
};

export function SwipeScreen({
  onOpenWallet,
  onMatch,
}: {
  onOpenWallet: () => void;
  onMatch: (m: NonNullable<SwipeResult["match"]>) => void;
}) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const requireVibes = useVibe((s) => s.requireVibes);
  const [deck, setDeck] = useState<Profile[]>([]);
  const [history, setHistory] = useState<{ profile: Profile; direction: string }[]>([]);
  const [loading, setLoading] = useState(true);
  // Burst d'emojis sur les boutons Like / Cadeau (incrémentés pour re-fire)
  const [likeBurst, setLikeBurst] = useState(0);
  const [giftBurst, setGiftBurst] = useState(0);
  const [vibeIndex] = useState(() => Math.floor(Math.random() * VIBE_QUESTIONS.length));
  const vibeQ = VIBE_QUESTIONS[vibeIndex];
  // Discovery filters sheet — collapsed by default (non-intrusive).
  const [filterOpen, setFilterOpen] = useState(false);
  // Contextual premium sheet — targets the profile of the card that opened it.
  const [cardActions, setCardActions] = useState<Profile | null>(null);
  // Passport flow from the empty deck (« explore une autre ville »).
  const [passportSheet, setPassportSheet] = useState(false);
  // Passport — destination + expiry from the deck API. The header shows a
  // DISCREET "✈️ Passport" indicator only: the destination (pays/ville) is
  // deliberately NOT displayed in the header (privacy + sobriety) — tapping
  // the chip reveals it on demand through a toast; the full status lives in
  // the Profile tab's active-actions area.
  const [passportCity, setPassportCity] = useState<string | null>(null);
  const [passportUntil, setPassportUntil] = useState<string | null>(null);
  // Gift tray — opens from the 🎁 action button, targets the top card.
  const [giftTarget, setGiftTarget] = useState<Profile | null>(null);
  const [giftNote, setGiftNote] = useState("");
  // Detailed profile view — opened by tapping the top card (or its ⤢
  // affordance). Tap on an action closes the modal first, then the parent
  // swipes / opens the gift tray (clean transition).
  const [detailProfile, setDetailProfile] = useState<Profile | null>(null);
  // Contextual premium-action recommendations (elegant, cooldown-guarded).
  const { nudge, dismiss, offer } = useNudgeSlot();
  const passStreakRef = useRef(0);
  const swipeCountRef = useRef(0);
  // Consecutive "like" swipes without a match — the Boost nudge trigger.
  const likeStreakRef = useRef(0);
  const pref = me?.profile as any;
  const filtersActive =
    !!pref &&
    ((pref.lookingFor && pref.lookingFor !== "all") ||
      (pref.prefMinAge != null && pref.prefMinAge > 18) ||
      (pref.prefMaxAge != null && pref.prefMaxAge < 99) ||
      (pref.prefMaxDistance != null && pref.prefMaxDistance < 50));

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vibe/profiles/deck");
      const data = await res.json();
      if (res.ok) {
        setDeck(data.profiles ?? []);
        setPassportCity(data.passport?.city ?? null);
        setPassportUntil(data.passport?.until ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // Instant reload when a premium action changed the deck (rewind,
  // superRewind, passport, boost — dispatched by the premium sheet).
  useEffect(() => {
    const onRefresh = () => loadDeck();
    window.addEventListener("vivilov:deck-refresh", onRefresh);
    return () => window.removeEventListener("vivilov:deck-refresh", onRefresh);
  }, [loadDeck]);

  // When a premium action / gift redirects to the purchase page
  // (insufficient balance), close the gift tray — the pending gift resumes
  // automatically after a successful pack purchase.
  useEffect(() => {
    const closeGiftTray = () => setGiftTarget(null);
    window.addEventListener("vivilov:go-buy-vibes", closeGiftTray);
    return () => window.removeEventListener("vivilov:go-buy-vibes", closeGiftTray);
  }, []);

  // The header 👑 Premium button (and this screen's nudges) open the
  // CONTEXTUAL premium sheet — it targets the profile currently on top of
  // the deck so the profile-specific actions (Super-Like ciblé, rapport
  // compatibilité, Cœur d'Or…) are available. Empty deck → Passport flow,
  // the natural premium action when there is no one left to discover.
  useEffect(() => {
    const openContextual = () => {
      const topCard = deck[0];
      if (topCard) {
        sfx.play("pop");
        haptic(8);
        setCardActions(topCard);
      } else {
        setPassportSheet(true);
      }
    };
    window.addEventListener("vivilov:open-premium-contextual", openContextual);
    return () => window.removeEventListener("vivilov:open-premium-contextual", openContextual);
  }, [deck]);

  /// Circumstantial recommendations — the deck loaded is the best moment to
  /// suggest a discovery action. One at a time, cooldown-guarded.
  useEffect(() => {
    if (loading || deck.length === 0) return;
    const topCard = deck[0];
    const compatible =
      topCard.vibeAnswer === vibeQ.a || topCard.vibeAnswer === vibeQ.b;
    const hour = new Date().getHours();

    const openPremium = () =>
      window.dispatchEvent(new Event("vivilov:open-premium-contextual"));

    // Low balance → proactive (and gentle) recharge suggestion. Only when
    // the user can't even afford a Super-Like anymore — once/day max, and
    // after the circumstantial suggestions so it never steals their slot.
    if ((me?.gems ?? 0) < GEM_ACTIONS.superlike) {
      offer(
        {
          id: "low-balance-recharge",
          emoji: "💎",
          text: "Ton stock de Vibes est presque à sec — garde ton élan pour les Super-Likes et cadeaux.",
          ctaLabel: "Recharger",
          onCta: onOpenWallet,
        },
        "day",
      );
    }

    if (compatible) {
      offer(
        {
          id: "superlike-vibe",
          emoji: "⭐",
          text: `Ta vibe matche avec ${topCard.displayName} — un Super-Like te place en haut de sa file.`,
          ctaLabel: "Super-Liker (5 💎)",
          onCta: () => swipe(topCard, "superlike"),
        },
        "session",
      );
    } else {
      offer(
        {
          id: "compat-check",
          emoji: "🧬",
          text: `${topCard.displayName} garde son mystère — vérifie votre compatibilité avant de swiper.`,
          ctaLabel: "Analyser (20 💎)",
          onCta: () => setCardActions(topCard),
          tone: "cool",
        },
        "session",
      );
    }

    // Evening → someone might be online right next to you.
    if (hour >= 18 || hour <= 1) {
      offer(
        {
          id: "vibe-radar-evening",
          emoji: "📍",
          text: "C'est l'heure où le monde est en ligne — vois qui est près de toi en ce moment.",
          ctaLabel: "Radar (25 💎)",
          onCta: openPremium,
          tone: "cool",
        },
        "day",
      );
    }

    // Gift suggestion — stands out before the first message (once/day max,
    // and only when no other nudge already occupies the slot).
    offer(
      {
        id: "gift-standout",
        emoji: "🎁",
        text: `Sors du lot auprès de ${topCard.displayName} — un cadeau attire l'œil avant même le premier message.`,
        ctaLabel: "Offrir (dès 10 💎)",
        onCta: () => setGiftTarget(topCard),
        tone: "gold",
      },
      "day",
    );

    // An unread like → the seeLikes tease.
    (async () => {
      try {
        const res = await fetch("/api/vibe/notifications");
        const data = await res.json();
        const hasUnreadLike = (data.notifications || []).some(
          (n: any) => !n.read && (n.type === "like" || n.type === "superlike"),
        );
        if (hasUnreadLike) {
          offer(
            {
              id: "see-likes-tease",
              emoji: "👁️",
              text: "Quelqu'un t'a liké récemment — dévoile qui.",
              ctaLabel: "Dévoiler (20 💎)",
              onCta: openPremium,
              tone: "gold",
            },
            "day",
          );
        }
      } catch {
        /* non-critical */
      }
    })();
  }, [loading, deck.length, me?.gems]);

  async function swipe(profile: Profile, direction: "pass" | "like" | "superlike") {
    const cost = direction === "superlike" ? GEM_ACTIONS.superlike : 0;
    const doSwipe = async () => {
      setHistory((h) => [...h, { profile, direction }]);
      setDeck((d) => d.filter((p) => p.id !== profile.id));

      // ── Circumstantial recommendations on swipe rhythm ────────────────
      const compatible =
        profile.vibeAnswer === vibeQ.a || profile.vibeAnswer === vibeQ.b;
      if (direction === "pass") {
        passStreakRef.current += 1;
        // Passed on a highly compatible profile → Rewind rescue.
        if (compatible) {
          offer(
            {
              id: "rewind-rescue",
              emoji: "↩️",
              text: `${profile.displayName} était très compatible… un Rewind le/la ramène dans ton deck.`,
              ctaLabel: "Annuler (2 💎)",
              onCta: () => rewind(),
            },
            "session",
          );
        }
        // 3+ passes in a row → Time Freeze to preview what's coming.
        if (passStreakRef.current >= 3) {
          offer(
            {
              id: "time-freeze-passes",
              emoji: "❄️",
              text: "Trois passes d'affilée ? Aperçois les 3 prochains profils avant de décider.",
              ctaLabel: "Apercevoir (45 💎)",
              onCta: () => window.dispatchEvent(new Event("vivilov:open-premium-contextual")),
              tone: "cool",
            },
            "session",
          );
        }
      } else {
        passStreakRef.current = 0;
      }
      // Likes without a match → visibility suggestion. After 4 likes that
      // didn't convert, the Boost (top of the queue) is the natural next
      // step — once per session, replaces the action-bar Boost button with
      // a circumstantial, high-intent moment.
      if (direction === "like") likeStreakRef.current += 1;
      if (likeStreakRef.current >= 4) {
        offer(
          {
            id: "boost-like-streak",
            emoji: "🚀",
            text: `${likeStreakRef.current} likes sans match ? Les profils Boostés sont vus en premier — passe devant tout le monde.`,
            ctaLabel: "Booster (50 💎)",
            onCta: () => window.dispatchEvent(new Event("vivilov:open-premium-contextual")),
            tone: "gold",
          },
          "session",
        );
      }
      // 6+ swipes this session → visibility suggestion (once/day).
      swipeCountRef.current += 1;
      if (swipeCountRef.current >= 6) {
        offer(
          {
            id: "spotlight-visibility",
            emoji: "🔦",
            text: "Tu swipes beaucoup — fais-toi voir : ton profil en tête de 20 decks pendant 1h.",
            ctaLabel: "Briller (40 💎)",
            onCta: () => window.dispatchEvent(new Event("vivilov:open-premium-contextual")),
            tone: "gold",
          },
          "day",
        );
      }

      try {
        const res = await fetch("/api/vibe/swipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: profile.id, direction }),
        });
        const data: SwipeResult = await res.json();
        if (!res.ok) {
          if (data.locked) toast.info(data.error);
          return;
        }
        if (data.gems !== undefined) patchMe({ gems: data.gems, freeGems: data.freeGems });
        if (data.match) {
          // A match converts the efforts — reset the like streak.
          likeStreakRef.current = 0;
          onMatch(data.match);
        }
      } catch {
        /* ignore */
      }
    };
    if (cost > 0) {
      requireVibes(cost, "Super-Like (5 Vibes)", doSwipe);
    } else {
      doSwipe();
    }
  }

  function rewind() {
    if (history.length === 0) {
      toast.info("Rien à annuler");
      return;
    }
    requireVibes(GEM_ACTIONS.rewind, "Rewind (2 Vibes)", async () => {
      try {
        const res = await fetch("/api/vibe/gems/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rewind" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        const last = history[history.length - 1];
        setHistory((h) => h.slice(0, -1));
        setDeck((d) => [last.profile, ...d]);
        vibeToast({
          emoji: "↩️",
          title: "Swipe annulé",
          sub: `${last.profile.displayName} est de retour dans ton deck`,
        });
      } catch (e: any) {
        toast.error(e.message || "Erreur");
      }
    });
  }

  /// Send a gift DIRECTLY from the deck to the targeted profile (no match
  /// required — the receiver is notified + credited their share). Uses the
  /// shared requireVibes gate: insufficient balance redirects to the Vibes
  /// purchase page and the gift resumes automatically after purchase.
  function sendDeckGift(giftKey: string) {
    const target = giftTarget;
    const gift = GIFTS.find((g) => g.key === giftKey);
    if (!target || !gift) return;
    const note = giftNote.trim();
    requireVibes(gift.gemCost, `${gift.emoji} ${gift.name} (${gift.gemCost} Vibes)`, async () => {
      try {
        const res = await fetch("/api/vibe/gifts/send", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: target.id, giftKey, messageText: note || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Gifts require PURCHASED Vibes — redirect to the purchase page;
          // the pending proceed retries the gift after a successful purchase.
          if (res.status === 402 && (data.needPurchased || data.needVibes)) {
            sfx.play("error");
            useVibe.getState().redirectForVibes(
              gift.gemCost,
              data.purchasedGems ?? me?.gems ?? 0,
              `${gift.emoji} ${gift.name}`,
              () => sendDeckGift(giftKey),
            );
            return;
          }
          throw new Error(data.error);
        }
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        celebrate({ sound: "chime", confettiCount: 90, hapticPattern: [12, 30, 12] });
        setGiftBurst((k) => k + 1);
        vibeToast({
          emoji: gift.emoji,
          title: `${gift.name} pour ${data.targetName ?? target.displayName}`,
          sub: "Notification envoyée 🎁",
        });
        setGiftTarget(null);
        setGiftNote("");
      } catch (e: any) {
        toast.error(e.message || "Erreur");
      }
    });
  }

  const top = deck[0];

  return (
    <div className="absolute inset-0 v-bg-app v-fg overflow-hidden">
      {/* top bar */}
      <div className="absolute top-9 inset-x-0 z-20 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-lg v-text-gradient">Découvrir</span>
          {/* Discreet filter toggle — a small dot signals active filters */}
          <motion.button
            onClick={() => { sfx.play("pop"); setFilterOpen(true); }}
            whileTap={{ scale: 0.85 }}
            aria-label="Filtres de découverte"
            className="relative h-8 w-8 grid place-items-center rounded-full v-surface-1 ring-1 ring-[var(--v-divider)] v-fg-muted hover:v-fg hover:v-surface-2 transition"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {filtersActive && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-vibe-pink ring-2 ring-[var(--v-bg-app)]" />
            )}
          </motion.button>
          {/* Passport indicator — discreet, destination deliberately hidden
              in the header (tapped → on-demand toast). See comment above. */}
          {passportCity && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                sfx.play("pop");
                const leftH = passportUntil
                  ? Math.max(1, Math.round((new Date(passportUntil).getTime() - Date.now()) / 3600000))
                  : null;
                toast.info(`✈️ Passport actif — tu découvres ${passportCity}${leftH ? ` · encore ${leftH} h` : ""}`, {
                  description: "Ta destination et son compte à rebours restent visibles dans Profil → Actions premium.",
                  duration: 5000,
                });
              }}
              aria-label="Passport actif — afficher la destination"
              className="inline-flex items-center gap-1 rounded-full vibe-gradient-soft ring-1 ring-accent/30 px-2.5 py-1 text-[10px] font-bold text-vibe-purple dark:text-vibe-pink hover:ring-accent/60 transition"
            >
              <Plane className="h-3 w-3" /> Passport
            </motion.button>
          )}
        </div>
        <GemBadge gems={me?.gems ?? 0} onClick={onOpenWallet} />
      </div>

      {/* Discovery filters — non-intrusive bottom sheet */}
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onSaved={() => loadDeck()}
      />

      {/* Contextual premium sheet — targets the card that opened it */}
      <PremiumActionsSheet
        open={cardActions !== null}
        onOpenChange={(o) => { if (!o) setCardActions(null); }}
        category="all"
        profileId={cardActions?.id}
        profileName={cardActions?.displayName}
      />

      {/* Passport sheet from the empty deck — no target, city picker first */}
      <PremiumActionsSheet
        open={passportSheet}
        onOpenChange={setPassportSheet}
        category="profile"
        startInPassportPick
      />

      {/* Gift tray — offer a gift directly from the deck (no match needed) */}
      <GiftTraySheet
        open={giftTarget !== null}
        onOpenChange={(o) => { if (!o) { setGiftTarget(null); setGiftNote(""); } }}
        target={giftTarget}
        note={giftNote}
        onNoteChange={setGiftNote}
        onSend={sendDeckGift}
        gems={me?.gems ?? 0}
      />

      {/* Detailed profile view — tap the top card to discover the full
          profile (media gallery, bio, Vibe Check) before deciding. */}
      <ProfileDetailModal
        profile={detailProfile}
        onOpenChange={(o) => { if (!o) setDetailProfile(null); }}
        onSwipe={(dir) => { if (detailProfile) swipe(detailProfile, dir); }}
        onGift={() => { if (detailProfile) setGiftTarget(detailProfile); }}
        gems={me?.gems ?? 0}
      />

      {/* deck */}
      <div className="absolute inset-0 pt-20 pb-44 px-4">
        {loading ? (
          <div className="relative h-full w-full" aria-busy="true" aria-label="Chargement des profils">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-3xl overflow-hidden ring-1 ring-[var(--v-divider)] v-surface-1"
                style={{
                  transform: `scale(${1 - i * 0.045}) translateY(${i * 12}px)`,
                  opacity: 1 - i * 0.25,
                }}
              >
                <Shimmer />
                <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-[var(--v-surface-3)] via-transparent to-[var(--v-surface-1)]" />
                {/* bloc infos factices */}
                <div className="absolute bottom-0 inset-x-0 p-4 pb-5 space-y-2">
                  <div className="h-5 w-36 rounded-lg v-surface-3 animate-pulse" />
                  <div className="h-3 w-24 rounded v-surface-2 animate-pulse" />
                  <div className="h-3 w-full rounded v-surface-2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : deck.length === 0 ? (
          <EmptyDeck onReload={loadDeck} onPassport={() => { sfx.play("pop"); setPassportSheet(true); }} />
        ) : (
          <div className="relative h-full w-full">
            <AnimatePresence>
              {deck.slice(0, 3).reverse().map((p, i, arr) => {
                const isTop = i === arr.length - 1;
                return (
                  <SwipeCard
                    key={p.id}
                    profile={p}
                    isTop={isTop}
                    onSwipe={(dir) => swipe(p, dir)}
                    onOpenDetail={
                      isTop
                        ? () => {
                            sfx.play("pop");
                            haptic(8);
                            setDetailProfile(p);
                          }
                        : undefined
                    }
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* contextual premium recommendation — floating just above the action bar */}
      <div className="absolute bottom-[152px] inset-x-4 z-30 pointer-events-auto">
        <SmartNudgeBanner nudge={nudge} onDismiss={dismiss} />
      </div>

      {/* action bar — sits above the bottom nav */}
      <div className="absolute bottom-[76px] inset-x-0 z-20 pb-1 pt-2 v-fade-bottom">
        <div className="flex items-center justify-center gap-3">
          <ActionButton onClick={rewind} label="Rewind" cost={GEM_ACTIONS.rewind} tone="amber">
            <RotateCcw className="h-5 w-5" />
          </ActionButton>
          <ActionButton onClick={() => top && swipe(top, "pass")} label="Pass" tone="red" big>
            <X className="h-7 w-7" />
          </ActionButton>
          <div className="relative">
            <ActionButton
              onClick={() => {
                if (!top) return;
                setGiftTarget(top);
              }}
              label="Cadeau"
              tone="rose"
              big
              sound="chime"
            >
              <Gift className="h-6 w-6" />
            </ActionButton>
            <EmojiBurst trigger={giftBurst} emojis={["🎁", "💝", "✨"]} />
          </div>
          <div className="relative">
            <ActionButton
              onClick={() => {
                if (!top) return;
                setLikeBurst((k) => k + 1);
                swipe(top, "like");
              }}
              label="Like"
              tone="green"
              big
            >
              <Heart className="h-7 w-7" />
            </ActionButton>
            <EmojiBurst trigger={likeBurst} emojis={["❤️", "💜", "💖"]} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SwipeCard({
  profile,
  isTop,
  onSwipe,
  onOpenDetail,
}: {
  profile: Profile;
  isTop: boolean;
  onSwipe: (dir: "pass" | "like" | "superlike") => void;
  /// Opens the detailed profile view — only ever provided for the top card.
  onOpenDetail?: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);
  const superOpacity = useTransform(y, [-140, -40], [1, 0]);

  // Tap → vue détaillée. Détection MANUELLE (framer-motion onTap
  // interférerait avec le drag) : pointerdown mémorise le point de départ,
  // pointerup compare — déplacement < 10 px en < 400 ms = tap intentionnel.
  const tapRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // Le tap a ouvert la vue détaillée → le click qui suit (togglePlay du
  // VideoPlayer) doit être avalé pour éviter la double action.
  const suppressClickRef = useRef(false);
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = tapRef.current;
    tapRef.current = null;
    if (!start || !isTop || !onOpenDetail) return;
    // Un tap visant un contrôle imbriqué (son, affordance ⤢…) garde son
    // comportement propre — il n'ouvre pas la vue détaillée en doublon.
    if ((e.target as HTMLElement).closest("button")) return;
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (dist < 10 && Date.now() - start.t < 400) {
      suppressClickRef.current = true;
      onOpenDetail();
    }
  };
  // Capture : avalé AVANT le onClick du VideoPlayer (le click natif suit
  // immédiatement le pointerup — le flag est fiable).
  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const onDragEnd = (_e: any, info: PanInfo) => {
    const { offset, velocity } = info;
    const threshold = 90;
    // Haptic léger au moment où la carte franchit le seuil de décision.
    if (offset.y < -threshold || velocity.y < -500) {
      haptic(10);
      onSwipe("superlike");
    } else if (offset.x > threshold || velocity.x > 500) {
      haptic(10);
      onSwipe("like");
    } else if (offset.x < -threshold || velocity.x < -500) {
      haptic(10);
      onSwipe("pass");
    }
  };

  // Premium visibility chips (from the deck API — each flag is a real,
  // paid premium effect, not decoration).
  const chips: { emoji: string; label: string; cls: string }[] = [];
  if (profile.goldenHeart) chips.push({ emoji: "💛", label: "Cœur d'Or", cls: "bg-amber-400/25 ring-amber-300/60 text-amber-100" });
  if (profile.spotlight) chips.push({ emoji: "🔦", label: "Projecteur", cls: "bg-fuchsia-500/25 ring-fuchsia-300/50 text-fuchsia-100" });
  if (profile.boosted) chips.push({ emoji: "🚀", label: "Boost", cls: "bg-orange-500/25 ring-orange-300/50 text-orange-100" });
  if (profile.passport) chips.push({ emoji: "✈️", label: "Passport", cls: "bg-sky-500/25 ring-sky-300/50 text-sky-100" });

  return (
    <motion.div
      className={`absolute inset-0 rounded-3xl overflow-hidden shadow-2xl v-fg-media ${
        profile.goldenHeart ? "ring-2 ring-amber-300/80 shadow-amber-400/20" : "ring-1 ring-[var(--v-divider)]"
      }`}
      style={{ x, y, rotate, zIndex: isTop ? 10 : 1 }}
      drag={isTop}
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClickCapture={handleClickCapture}
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
    >
      {/* Media — RÈGLE MÉTIER : la vidéo est prioritaire ; sans vidéo, la
          1ʳᵉ photo prend le relais ; sinon poster placeholder (VideoPlayer). */}
      <div className="absolute inset-0 overflow-hidden">
        {profile.videoUrl || !profile.photos?.[0] ? (
          <VideoPlayer
            videoUrl={profile.videoUrl}
            posterUrl={profile.posterUrl || "/profiles/lea.png"}
            duration={profile.videoDuration}
            sizes="300px"
            priority
            className="absolute inset-0"
          />
        ) : (
          <img
            src={profile.photos[0]}
            alt={`Photo de ${profile.displayName}`}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover select-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />
      </div>

      {/* stamps */}
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-6 -rotate-12">
        <span className="text-4xl font-black text-green-400 ring-4 ring-green-400 rounded-xl px-3 py-1">LIKE</span>
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-6 rotate-12">
        <span className="text-4xl font-black text-red-400 ring-4 ring-red-400 rounded-xl px-3 py-1">NOPE</span>
      </motion.div>
      <motion.div style={{ opacity: superOpacity }} className="absolute top-10 left-1/2 -translate-x-1/2">
        <span className="text-3xl font-black text-cyan-300 ring-4 ring-cyan-300 rounded-xl px-3 py-1">SUPER</span>
      </motion.div>

      {/* verified badge — the only chip over the video, kept minimal so the
          video breathes. The premium entry point lives in the header (👑). */}
      {profile.verified && (
        <div className="absolute top-4 right-4 glass-dark rounded-full p-1">
          <BadgeCheck className="h-4 w-4 text-cyan-300" />
        </div>
      )}

      {/* info */}
      <div className="absolute bottom-0 inset-x-0 p-4 pb-5">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-bold flex items-center gap-1.5">
              {profile.displayName}, {profile.age}
            </h3>
            <p className="text-sm text-white/80 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {profile.city}
              {profile.distanceKm != null && (
                <span className="text-white/70">· {profile.distanceKm} km</span>
              )}
            </p>
          </div>
          {/* Affordance discrète — même handler que le tap sur la carte */}
          {isTop && onOpenDetail && (
            <motion.button
              onClick={onOpenDetail}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              whileTap={{ scale: 0.88 }}
              aria-label="Voir le profil détaillé"
              className="h-8 w-8 rounded-full glass-dark grid place-items-center text-white/90 hover:text-white opacity-80 hover:opacity-100 transition shrink-0 self-start"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>
        {/* premium visibility chips — real effects from the deck API */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map((c) => (
              <span
                key={c.label}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${c.cls}`}
              >
                {c.emoji} {c.label}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-white/70 mt-2 line-clamp-2">{profile.bio}</p>
        <p className="text-[10px] text-white/70 mt-2">Glisse ← pass · → like · ↑ super-like</p>
      </div>
    </motion.div>
  );
}

function ActionButton({
  children,
  onClick,
  label,
  cost,
  tone,
  big,
  sound = "pop",
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  cost?: number;
  tone: "red" | "green" | "blue" | "amber" | "purple" | "rose";
  big?: boolean;
  sound?: SfxName;
}) {
  const tones: Record<string, string> = {
    red: "text-red-500 dark:text-red-400 ring-red-400/60 dark:ring-red-400/40 hover:bg-red-400/10",
    green: "text-green-600 dark:text-green-400 ring-green-500/60 dark:ring-green-400/40 hover:bg-green-400/10",
    blue: "text-cyan-600 dark:text-cyan-300 ring-cyan-400/60 dark:ring-cyan-300/40 hover:bg-cyan-300/10",
    amber: "text-amber-600 dark:text-amber-300 ring-amber-400/60 dark:ring-amber-300/40 hover:bg-amber-300/10",
    purple: "text-fuchsia-600 dark:text-fuchsia-300 ring-fuchsia-400/60 dark:ring-fuchsia-300/40 hover:bg-fuchsia-300/10",
    rose: "text-rose-500 dark:text-rose-300 ring-rose-400/60 dark:ring-rose-300/40 hover:bg-rose-400/10",
  };
  return (
    <motion.button
      onClick={() => {
        sfx.play(sound);
        haptic(12);
        onClick();
      }}
      whileTap={{ scale: 0.82 }}
      className="flex flex-col items-center gap-1 group"
    >
      <span
        className={`grid place-items-center rounded-full v-surface-solid ring-1 ${tones[tone]} transition group-hover:v-surface-1 ${big ? "h-14 w-14" : "h-11 w-11"}`}
      >
        {children}
      </span>
      <span className="text-[9px] v-fg-muted font-medium flex items-center gap-0.5">
        {label}{cost ? `·${cost}` : ""}
      </span>
    </motion.button>
  );
}

function EmptyDeck({ onReload, onPassport }: { onReload: () => void; onPassport: () => void }) {
  return (
    <div className="h-full grid place-items-center text-center px-6">
      <div>
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="font-display text-xl font-bold mb-1">C&apos;est tout pour aujourd&apos;hui !</h3>
        <p className="text-sm v-fg-muted mb-4">Reviens demain ou explore une autre ville avec ton Passport.</p>
        <div className="flex flex-col gap-2">
          <button onClick={onPassport} className="h-10 px-5 rounded-full vibe-gradient text-white font-semibold text-sm">
            ✈️ Explorer une autre ville
          </button>
          <button onClick={onReload} className="h-10 px-5 rounded-full v-surface-1 ring-1 ring-[var(--v-divider)] v-fg-muted font-semibold text-sm hover:v-surface-2 transition">
            Recharger la file
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== GIFT TRAY SHEET (élégant, depuis le deck) =====
// S'ouvre depuis le bouton 🎁 de la barre d'actions du Découvrir tab.
// Permet d'offrir un cadeau DIRECTEMENT au profil de la carte du dessus —
// sans attendre un match. Le destinataire reçoit une notification et touche
// 70% de la valeur du cadeau. Un cadeau insuffisamment couvert par le solde
// redirige vers la page d'achat de Vibes (l'envoi reprend après achat).
function GiftTraySheet({
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
  target: Profile | null;
  note: string;
  onNoteChange: (n: string) => void;
  onSend: (giftKey: string) => void;
  gems: number;
}) {
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
            aria-label={`Offrir un cadeau à ${target.displayName}`}
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
                    Offrir un cadeau
                  </h3>
                  <p className="text-[11px] text-white/80 truncate">
                    à <span className="font-semibold text-white">{target.displayName}</span>
                    {" · "}
                    {target.city}
                  </p>
                </div>
                <motion.button
                  onClick={() => onOpenChange(false)}
                  whileTap={{ scale: 0.88 }}
                  aria-label="Fermer"
                  className="h-8 w-8 grid place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 transition shrink-0"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
              <p className="relative text-[10px] text-white/75 mt-2 leading-relaxed">
                Il/elle recevra une notification avec ton prénom — un cadeau attire
                l&apos;œil bien avant le premier message. ✨
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
                placeholder="Ajoute un petit mot qui accompagnera ton cadeau (optionnel)…"
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
                      aria-label={`Offrir ${g.name} — ${g.gemCost} Vibes`}
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
                        ≈ {moneyCents(g.eurValueCents * 0.7)} pour lui/elle
                      </span>
                      {!affordable && (
                        <span className="text-[8px] v-fg-muted">recharge requise</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[10px] v-fg-muted text-center mt-3 leading-relaxed">
                Les cadeaux s&apos;offrent avec des Vibes achetées (les Vibes gratuites sont
                réservées aux actions premium). Le destinataire touche 70% de la valeur.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ===== DISCOVERY FILTER SHEET (non-intrusive) =====
// Opens from the small sliders button in the top bar. Saves the user's
// preferences to their profile; the server-side recommendation algorithm
// applies them (hard filters: gender, age range, max distance) and re-ranks.
function FilterSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const pref = me?.profile as any;

  const [maxDistance, setMaxDistance] = useState<number>(pref?.prefMaxDistance ?? 50);
  const [ageRange, setAgeRange] = useState<[number, number]>([
    pref?.prefMinAge ?? 18,
    pref?.prefMaxAge ?? 99,
  ]);
  const [lookingFor, setLookingFor] = useState<string>(pref?.lookingFor ?? "all");
  const [saving, setSaving] = useState(false);

  // Sync local state when the sheet opens (profile may have changed elsewhere).
  useEffect(() => {
    if (open) {
      setMaxDistance(pref?.prefMaxDistance ?? 50);
      setAgeRange([pref?.prefMinAge ?? 18, pref?.prefMaxAge ?? 99]);
      setLookingFor(pref?.lookingFor ?? "all");
    }
  }, [open, pref?.prefMaxDistance, pref?.prefMinAge, pref?.prefMaxAge, pref?.lookingFor]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/vibe/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookingFor,
          prefMinAge: ageRange[0],
          prefMaxAge: ageRange[1],
          prefMaxDistance: maxDistance,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.user) {
        const meNow = useVibe.getState().me;
        patchMe({ ...meNow, ...data.user });
      }
      sfx.play("success");
      haptic(12);
      toast.success("Filtres enregistrés", {
        description: "Ta file de découverte a été mise à jour.",
        duration: 2500,
      });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const genderOptions = [
    { v: "f", l: "Femmes", e: "👩" },
    { v: "m", l: "Hommes", e: "👨" },
    { v: "nb", l: "NB", e: "🌈" },
    { v: "all", l: "Tous", e: "✨" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 v-veil backdrop-blur-sm flex items-end"
          onClick={() => !saving && onOpenChange(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="w-full rounded-t-3xl v-surface-solid ring-1 ring-[var(--v-divider)] p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Filtres de découverte"
          >
            {/* grabber */}
            <div className="mx-auto h-1 w-10 rounded-full v-surface-3 mb-4" />

            <h3 className="font-display font-bold text-lg mb-1">Filtres de découverte</h3>
            <p className="text-[11px] v-fg-muted mb-5">
              Affine les profils recommandés. Les changements s'appliquent immédiatement à ta file.
            </p>

            {/* Distance */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-accent" /> Distance max
                </span>
                <span className="text-sm font-bold tabular-nums vibe-text-gradient">{maxDistance} km</span>
              </div>
              <Slider
                value={[maxDistance]}
                onValueChange={(v) => setMaxDistance(v[0] ?? 50)}
                min={1}
                max={500}
                step={1}
                aria-label="Distance maximum"
              />
              <div className="flex justify-between text-[10px] v-fg-muted mt-1.5">
                <span>1 km</span>
                <span>500 km</span>
              </div>
            </div>

            {/* Age range — dual-thumb */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" /> Âge recherché
                </span>
                <span className="text-sm font-bold tabular-nums vibe-text-gradient">
                  {ageRange[0]} – {ageRange[1] === 99 ? "99+" : ageRange[1]} ans
                </span>
              </div>
              <Slider
                value={ageRange}
                onValueChange={(v) => setAgeRange([v[0] ?? 18, v[1] ?? 99])}
                min={18}
                max={99}
                step={1}
                aria-label="Tranche d'âge"
              />
              <div className="flex justify-between text-[10px] v-fg-muted mt-1.5">
                <span>18 ans</span>
                <span>99+</span>
              </div>
            </div>

            {/* Gender preference */}
            <div className="mb-7">
              <span className="text-sm font-medium flex items-center gap-1.5 mb-2.5">
                <Heart className="h-3.5 w-3.5 text-pink-400" /> Je cherche
              </span>
              <div className="grid grid-cols-4 gap-2">
                {genderOptions.map((g) => (
                  <motion.button
                    key={g.v}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { sfx.play("pop"); setLookingFor(g.v); }}
                    className={`h-11 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition ${
                      lookingFor === g.v
                        ? "vibe-gradient text-white vibe-glow"
                        : "v-surface-1 v-fg-muted ring-1 ring-[var(--v-divider)] hover:v-surface-2"
                    }`}
                  >
                    <span className="text-base leading-none">{g.e}</span> {g.l}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setMaxDistance(500);
                  setAgeRange([18, 99]);
                  setLookingFor("all");
                  sfx.play("pop");
                }}
                className="flex-1 h-12 rounded-2xl v-surface-1 ring-1 ring-[var(--v-divider)] v-fg-muted font-semibold hover:v-surface-2 transition"
              >
                Tout afficher
              </motion.button>
              <motion.button
                whileTap={saving ? undefined : { scale: 0.95 }}
                onClick={save}
                disabled={saving}
                className="flex-1 h-12 rounded-2xl vibe-gradient text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Enregistrement…" : "Appliquer"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
