"use client";
// ProfileDetailModal — vue détaillée d'un profil du deck (onglet Découvrir).
// S'ouvre en tapant la carte du dessus ou son bouton affordance ⤢ : panneau
// immersif qui monte du bas, CONTENU dans le viewport de l'app (absolute
// inset-0 z-50 dans la racine de SwipeScreen — jamais fixed, la colonne
// mobile reste la limite visuelle).
//
// RÈGLE MÉTIER (propriétaire) : la VIDÉO est prioritaire sur les photos —
// les slides VIDÉO viennent toujours en premier. La page de détail RECENSE
// ENSUITE toutes les photos (slides suivantes) : tout le contenu du profil
// est visible dans une seule galerie élégante.
//
// Structure de la carte (flex-col, hauteur définie) :
//   1. galerie horizontale scroll-snap (55 %) — compteur discret, dots
//      synchronisés sur le scroll natif, gradient fondu vers le fond ;
//   2. zone info scrollable (prénom/âge, ville, chips premium, bio,
//      carte 💫 Vibe Check avec la réponse en pill lisible) ;
//   3. barre d'actions hors du scroll (Pass / Cadeau / Like / Super-Like) —
//      même esthétique que l'action bar du deck.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star, Gift, BadgeCheck, MapPin } from "lucide-react";
// Heart est utilisé par la barre d'actions ; l'icône de la ligne « Recherche »
// est HeartHandshake (importée ci-dessous) pour ne pas la confondre avec Like.
import { HeartHandshake } from "lucide-react";
import { VideoPlayer } from "./video-player";
import { sfx, haptic, type SfxName } from "./interactive-animations";
import { GEM_ACTIONS, VIBE_QUESTIONS } from "@/lib/vibe/constants";
import { useI18n } from "@/lib/vibe/i18n";

export type DetailProfile = {
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
  videos?: { url: string; poster: string }[];
  photos?: string[];
  // Intentions du profil (renseignées à l'onboarding) — « Recherche ».
  lookingFor?: string;
  relationshipType?: string;
};

/// RÈGLE MÉTIER — la vidéo prime (slides vidéos d'abord), puis la galerie
/// recense toutes les photos. Une seule liste de slides en résulte.
type Slide = { kind: "video"; url: string; poster: string } | { kind: "photo"; url: string };

function buildSlides(profile: DetailProfile): Slide[] {
  const videos = profile.videos ?? [];
  const photos = profile.photos ?? [];
  return [
    ...videos.map((v) => ({ kind: "video" as const, url: v.url, poster: v.poster })),
    ...photos.map((url) => ({ kind: "photo" as const, url })),
  ];
}

/// Clés i18n des intentions (mêmes valeurs que l'onboarding) — les
/// libellés lisibles vivent dans le dictionnaire swipe.* et sont traduits
/// au rendu via t().
const LOOKING_FOR_KEYS: Record<string, string> = {
  f: "swipe.detail.lookingFor.f",
  m: "swipe.detail.lookingFor.m",
  nb: "swipe.detail.lookingFor.nb",
  all: "swipe.detail.lookingFor.all",
};
const RELATIONSHIP_KEYS: Record<string, string> = {
  serious: "swipe.detail.relationship.serious",
  casual: "swipe.detail.relationship.casual",
  friendship: "swipe.detail.relationship.friendship",
};

/// La réponse Vibe stockée est le libellé lisible ("plage", "chien"…) tel
/// que défini par VIBE_QUESTIONS — on traduit quand même une éventuelle
/// lettre brute ("a"/"b") vers son libellé, par robustesse.
function readableVibeAnswer(profile: DetailProfile): string {
  const raw = (profile.vibeAnswer ?? "").trim();
  if (!raw) return "";
  const q = VIBE_QUESTIONS.find((v) => v.q === profile.vibeQuestion);
  if (q) {
    if (raw === "a") return q.a;
    if (raw === "b") return q.b;
  }
  return raw;
}

export function ProfileDetailModal({
  profile,
  onOpenChange,
  onSwipe,
  onGift,
  gems,
}: {
  profile: DetailProfile | null;
  onOpenChange: (open: boolean) => void;
  onSwipe: (dir: "pass" | "like" | "superlike") => void;
  onGift: () => void;
  gems: number;
}) {
  const { t } = useI18n();
  // Escape → ferme (le clic backdrop et le bouton ✕ ferment aussi).
  useEffect(() => {
    if (!profile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profile, onOpenChange]);

  return (
    <AnimatePresence>
      {profile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          {/* Backdrop — floute le deck derrière */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Carte principale — monte du bas, spring douce */}
          <motion.div
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={t("swipe.detail.aria", { name: profile.displayName })}
            className="relative w-[92%] max-w-md h-[88%] flex flex-col overflow-hidden rounded-3xl v-bg-app v-fg shadow-2xl ring-1 ring-(--v-divider)"
          >
            <MediaGallery profile={profile} onClose={() => { sfx.play("pop"); onOpenChange(false); }} />
            <InfoSection profile={profile} />
            <ModalActions
              gems={gems}
              onAct={(dir) => {
                // Fermeture PUIS swipe — le parent enchaîne : la carte quitte
                // le deck pendant que le backdrop s'efface (transition propre).
                onOpenChange(false);
                onSwipe(dir);
              }}
              onGiftAction={() => {
                onOpenChange(false);
                onGift();
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Galerie média (55 % haut) ─────────────────────────────────────────────
function MediaGallery({ profile, onClose }: { profile: DetailProfile; onClose: () => void }) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const slides = buildSlides(profile);

  // Dots + compteur synchronisés sur le scroll-snap natif (scrollLeft/width).
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive((a) => (idx !== a && idx >= 0 && idx < slides.length ? idx : a));
  };

  return (
    <div className="relative h-[55%] min-h-0 shrink-0">
      {slides.length === 0 ? (
        // Aucun média → poster placeholder, rien d'autre.
        <img
          src={profile.posterUrl || "/profiles/lea.png"}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {slides.map((s, i) => (
            <div key={`${s.kind}-${i}`} className="relative w-full h-full shrink-0 snap-start">
              {s.kind === "video" ? (
                <VideoPlayer
                  videoUrl={s.url}
                  posterUrl={s.poster}
                  duration={profile.videoDuration}
                  className="absolute inset-0"
                />
              ) : (
                <PhotoSlide src={s.url} alt={t("swipe.detail.photoAlt", { n: i + 1, name: profile.displayName })} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Gradient bas — fond la zone média dans le fond de la carte */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--v-bg-app)] to-transparent pointer-events-none z-10" />

      {/* Dots de pagination (≥ 2 médias) — posés sur le gradient */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-1.5 pointer-events-none">
          {slides.map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-4 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* Compteur discret (≥ 2 médias) */}
      {slides.length > 1 && (
        <span className="absolute top-3 right-3 z-30 glass-dark rounded-full px-2.5 py-1 text-[10px] font-semibold text-white tabular-nums">
          {active + 1}/{slides.length}
        </span>
      )}

      {/* Fermeture — en haut à GAUCHE de la zone média */}
      <motion.button
        onClick={onClose}
        whileTap={{ scale: 0.88 }}
        aria-label={t("swipe.detail.closeAria")}
        className="absolute top-3 left-3 z-30 h-9 w-9 rounded-full glass-dark grid place-items-center text-white/90 hover:text-white transition"
      >
        <X className="h-4 w-4" />
      </motion.button>
    </div>
  );
}

/// Photo plein-cadre ; une image cassée est simplement masquée (fallback
/// onError — la slide reste vide plutôt que d'afficher un pictogramne d'erreur).
function PhotoSlide({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      className="absolute inset-0 w-full h-full object-cover select-none"
    />
  );
}

// ─── Zone info (scrollable) ────────────────────────────────────────────────
function InfoSection({ profile }: { profile: DetailProfile }) {
  const { t } = useI18n();
  // Chips premium — même mapping/symbolique que la SwipeCard du deck, en
  // teintes lisibles sur le fond de la carte (clair ou sombre).
  const chips: { emoji: string; label: string; cls: string }[] = [];
  if (profile.goldenHeart) chips.push({ emoji: "💛", label: t("swipe.chip.goldenHeart"), cls: "ring-amber-400/50 text-amber-600 dark:text-amber-300" });
  if (profile.spotlight) chips.push({ emoji: "🔦", label: t("swipe.chip.spotlight"), cls: "ring-fuchsia-400/50 text-fuchsia-600 dark:text-fuchsia-300" });
  if (profile.boosted) chips.push({ emoji: "🚀", label: t("swipe.chip.boost"), cls: "ring-orange-400/50 text-orange-600 dark:text-orange-300" });
  if (profile.passport) chips.push({ emoji: "✈️", label: t("swipe.chip.passport"), cls: "ring-sky-400/50 text-sky-600 dark:text-sky-300" });

  const answer = readableVibeAnswer(profile);
  const answerLabel = answer ? answer.charAt(0).toUpperCase() + answer.slice(1) : "";

  // Intentions du profil — « Recherche : Femmes · Relation sérieuse ».
  const lookingKey = LOOKING_FOR_KEYS[profile.lookingFor ?? ""];
  const relKey = RELATIONSHIP_KEYS[profile.relationshipType ?? ""];
  const lookingLabel = lookingKey ? t(lookingKey) : undefined;
  const relLabel = relKey ? t(relKey) : undefined;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 pb-4 pt-2">
      <div className="flex items-center gap-1.5">
        <h2 className="font-display text-2xl font-bold v-text-gradient leading-tight">
          {profile.displayName}, {profile.age}
        </h2>
        {profile.verified && (
          <BadgeCheck className="h-5 w-5 text-cyan-500 dark:text-cyan-300 shrink-0" aria-label={t("swipe.detail.verifiedAria")} />
        )}
      </div>
      <p className="text-sm v-fg-muted flex items-center gap-1 mt-0.5">
        <MapPin className="h-3.5 w-3.5 shrink-0" /> {profile.city}
        {profile.distanceKm != null && <span>· {profile.distanceKm} km</span>}
      </p>

      {(lookingLabel || relLabel) && (
        <p className="text-[13px] v-fg-muted flex items-center gap-1.5 mt-1">
          <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-hidden />
          {t("swipe.detail.lookingForPrefix")} {lookingLabel ?? relLabel}
          {lookingLabel && relLabel ? ` · ${relLabel}` : ""}
        </p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {chips.map((c) => (
            <span
              key={c.label}
              className={`inline-flex items-center gap-1 rounded-full v-glass px-2 py-0.5 text-[10px] font-bold ring-1 ${c.cls}`}
            >
              {c.emoji} {c.label}
            </span>
          ))}
        </div>
      )}

      {profile.bio && (
        <p className="text-sm v-fg leading-relaxed whitespace-pre-line mt-3">{profile.bio}</p>
      )}

      {profile.vibeQuestion && (
        <div className="mt-3 rounded-2xl v-surface-1 ring-1 ring-(--v-divider) p-3.5">
          <p className="text-[10px] uppercase tracking-wide font-bold v-fg-faint">💫 Vibe Check</p>
          <p className="text-sm font-semibold mt-1">{profile.vibeQuestion}</p>
          {answerLabel && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs v-fg-muted">{t("swipe.detail.theirAnswer")}</span>
              <span className="inline-flex items-center rounded-full vibe-gradient-soft ring-1 ring-accent/30 px-2.5 py-0.5 text-[11px] font-bold text-vibe-purple dark:text-vibe-pink">
                {answerLabel}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Barre d'actions (hors du scroll) ──────────────────────────────────────
function ModalActions({
  gems,
  onAct,
  onGiftAction,
}: {
  gems: number;
  onAct: (dir: "pass" | "like" | "superlike") => void;
  onGiftAction: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="shrink-0 p-4 pt-2">
      <div className="flex items-center justify-center gap-3">
        <ModalActionButton onClick={() => onAct("pass")} label={t("swipe.detail.pass")} aria={t("swipe.detail.passAria")} tone="red">
          <X className="h-6 w-6" />
        </ModalActionButton>
        <ModalActionButton onClick={onGiftAction} label={t("swipe.detail.gift")} aria={t("swipe.detail.giftAria")} tone="rose" sound="chime">
          <Gift className="h-5 w-5" />
        </ModalActionButton>
        <ModalActionButton onClick={() => onAct("like")} label={t("swipe.detail.like")} aria={t("swipe.detail.likeAria")} tone="green" big>
          <Heart className="h-7 w-7" />
        </ModalActionButton>
        <ModalActionButton
          onClick={() => onAct("superlike")}
          label={t("swipe.detail.superlike", { cost: GEM_ACTIONS.superlike })}
          aria={t("swipe.detail.superlikeAria")}
          tone="blue"
          dim={gems < GEM_ACTIONS.superlike}
        >
          <Star className="h-5 w-5" />
        </ModalActionButton>
      </div>
    </div>
  );
}

/// Pattern visuel de l'ActionButton du deck (copié, pas importé — le modal
/// vit sa propre vie) : pastille ronde ring + icône, label discret dessous.
function ModalActionButton({
  children,
  onClick,
  label,
  aria,
  tone,
  big,
  sound = "pop",
  dim,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  aria: string;
  tone: "red" | "green" | "blue" | "rose";
  big?: boolean;
  sound?: SfxName;
  dim?: boolean;
}) {
  const tones: Record<string, string> = {
    red: "text-red-500 dark:text-red-400 ring-red-400/60 dark:ring-red-400/40 hover:bg-red-400/10",
    green: "text-green-600 dark:text-green-400 ring-green-500/60 dark:ring-green-400/40 hover:bg-green-400/10",
    blue: "text-cyan-600 dark:text-cyan-300 ring-cyan-400/60 dark:ring-cyan-300/40 hover:bg-cyan-300/10",
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
      aria-label={aria}
      className="flex flex-col items-center gap-1 group"
    >
      <span
        className={`grid place-items-center rounded-full v-surface-solid ring-1 ${tones[tone]} transition group-hover:v-surface-1 ${big ? "h-14 w-14" : "h-11 w-11"}`}
      >
        {children}
      </span>
      <span className={`text-[9px] v-fg-muted font-medium ${dim ? "opacity-60" : ""}`}>{label}</span>
    </motion.button>
  );
}
