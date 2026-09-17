"use client";
// Swipe deck: Tinder-like drag with spring physics, Ken Burns video posters,
// Vibe Check overlay, action bar (rewind/pass/superlike/like/boost), match overlay.
// Includes the non-intrusive discovery FILTERS (distance, age range, gender)
// — a discreet button in the top bar opens a bottom sheet; filters are saved
// to the profile and enforced server-side by the recommendation algorithm.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { RotateCcw, X, Star, Heart, Zap, BadgeCheck, Waves, MapPin, SlidersHorizontal, Check, Loader2 } from "lucide-react";
import { GemBadge } from "@/components/vibe/gem-badge";
import { sfx, haptic, EmojiBurst, Shimmer, type SfxName } from "@/components/vibe/app/interactive-animations";
import { VideoPlayer } from "./video-player";
import { useVibe } from "@/lib/vibe/store";
import { GEM_ACTIONS, VIBE_QUESTIONS } from "@/lib/vibe/constants";
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
  // Burst d'emojis sur les boutons Like / Super-Like (incrémentés pour re-fire)
  const [likeBurst, setLikeBurst] = useState(0);
  const [superBurst, setSuperBurst] = useState(0);
  const [vibeIndex] = useState(() => Math.floor(Math.random() * VIBE_QUESTIONS.length));
  const vibeQ = VIBE_QUESTIONS[vibeIndex];
  // Discovery filters sheet — collapsed by default (non-intrusive).
  const [filterOpen, setFilterOpen] = useState(false);
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
      if (res.ok) setDeck(data.profiles ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  async function swipe(profile: Profile, direction: "pass" | "like" | "superlike") {
    const cost = direction === "superlike" ? GEM_ACTIONS.superlike : 0;
    const doSwipe = async () => {
      setHistory((h) => [...h, { profile, direction }]);
      setDeck((d) => d.filter((p) => p.id !== profile.id));
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
        if (data.match) onMatch(data.match);
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
        toast.success("Swipe annulé ↩");
      } catch (e: any) {
        toast.error(e.message || "Erreur");
      }
    });
  }

  function boost() {
    requireVibes(GEM_ACTIONS.boost, "Boost profil (50 Vibes)", async () => {
      try {
        const res = await fetch("/api/vibe/gems/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "boost" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        toast.success("🚀 Boost activé ! Top de la file pendant 30 min.");
        // Rafraîchit instantanément la section « Actions actives » du profil
        // (le Boost y apparaît avec son compte à rebours dégradé).
        window.dispatchEvent(new CustomEvent("vivilov:buff-activated"));
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
        </div>
        <GemBadge gems={me?.gems ?? 0} onClick={onOpenWallet} />
      </div>

      {/* Discovery filters — non-intrusive bottom sheet */}
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onSaved={() => loadDeck()}
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
                {/* bloc vibe check factice */}
                <div className="absolute top-16 inset-x-4 h-28 rounded-2xl v-surface-1 animate-pulse" />
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
          <EmptyDeck onReload={loadDeck} />
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
                    vibeQ={vibeQ}
                    onSwipe={(dir) => swipe(p, dir)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
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
                setSuperBurst((k) => k + 1);
                swipe(top, "superlike");
              }}
              label="Super"
              cost={GEM_ACTIONS.superlike}
              tone="blue"
              big
              sound="chime"
            >
              <Star className="h-6 w-6" />
            </ActionButton>
            <EmojiBurst trigger={superBurst} emojis={["⭐", "✨"]} />
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
          <ActionButton onClick={boost} label="Boost" cost={GEM_ACTIONS.boost} tone="purple">
            <Zap className="h-5 w-5" />
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function SwipeCard({
  profile,
  isTop,
  vibeQ,
  onSwipe,
}: {
  profile: Profile;
  isTop: boolean;
  vibeQ: { id: string; q: string; a: string; b: string };
  onSwipe: (dir: "pass" | "like" | "superlike") => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);
  const superOpacity = useTransform(y, [-140, -40], [1, 0]);

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

  const vibeMatch = profile.vibeAnswer === vibeQ.a ? "a" : profile.vibeAnswer === vibeQ.b ? "b" : null;

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-[var(--v-divider)] v-fg-media"
      style={{ x, y, rotate, zIndex: isTop ? 10 : 1 }}
      drag={isTop}
      dragSnapToOrigin
      onDragEnd={onDragEnd}
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
    >
      {/* Video player with poster fallback + preloading */}
      <div className="absolute inset-0 overflow-hidden">
        <VideoPlayer
          videoUrl={profile.videoUrl}
          posterUrl={profile.posterUrl || "/profiles/lea.png"}
          duration={profile.videoDuration}
          sizes="300px"
          priority
          className="absolute inset-0"
        />
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

      {/* verified + vibe badges */}
      <div className="absolute top-4 inset-x-4 flex items-start justify-between">
        <div className="glass-dark rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1">
          <Waves className="h-3 w-3 text-accent" /> Vibe Check
        </div>
        {profile.verified && (
          <div className="glass-dark rounded-full p-1">
            <BadgeCheck className="h-4 w-4 text-cyan-300" />
          </div>
        )}
      </div>

      {/* vibe check overlay */}
      <div className="absolute top-16 inset-x-4">
        <div className="glass-dark rounded-2xl p-3">
          <p className="text-xs text-white/70 mb-2 font-medium">{vibeQ.q}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-xl px-3 py-2 text-center text-sm font-semibold transition ${vibeMatch === "a" ? "bg-emerald-400/30 ring-1 ring-emerald-300 text-white" : "v-surface-2 text-white/85"}`}>
              {vibeQ.a === "plage" ? "🏖️" : vibeQ.a === "chien" ? "🐶" : vibeQ.a === "aventure" ? "🧗" : vibeQ.a === "cafe" ? "☕" : "🏙️"} {vibeQ.a}
            </div>
            <div className={`rounded-xl px-3 py-2 text-center text-sm font-semibold transition ${vibeMatch === "b" ? "bg-emerald-400/30 ring-1 ring-emerald-300 text-white" : "v-surface-2 text-white/85"}`}>
              {vibeQ.b === "montagne" ? "⛰️" : vibeQ.b === "chat" ? "🐱" : vibeQ.b === "confort" ? "🛋️" : vibeQ.b === "the" ? "🍵" : "🌳"} {vibeQ.b}
            </div>
          </div>
          <p className="text-[10px] text-white/70 mt-1.5 text-center">
            {vibeMatch ? "✓ Vibe compatible" : "Vibe différente — ose quand même !"}
          </p>
        </div>
      </div>

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
        </div>
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
  tone: "red" | "green" | "blue" | "amber" | "purple";
  big?: boolean;
  sound?: SfxName;
}) {
  const tones: Record<string, string> = {
    red: "text-red-500 dark:text-red-400 ring-red-400/60 dark:ring-red-400/40 hover:bg-red-400/10",
    green: "text-green-600 dark:text-green-400 ring-green-500/60 dark:ring-green-400/40 hover:bg-green-400/10",
    blue: "text-cyan-600 dark:text-cyan-300 ring-cyan-400/60 dark:ring-cyan-300/40 hover:bg-cyan-300/10",
    amber: "text-amber-600 dark:text-amber-300 ring-amber-400/60 dark:ring-amber-300/40 hover:bg-amber-300/10",
    purple: "text-fuchsia-600 dark:text-fuchsia-300 ring-fuchsia-400/60 dark:ring-fuchsia-300/40 hover:bg-fuchsia-300/10",
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

function EmptyDeck({ onReload }: { onReload: () => void }) {
  return (
    <div className="h-full grid place-items-center text-center px-6">
      <div>
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="font-display text-xl font-bold mb-1">C&apos;est tout pour aujourd&apos;hui !</h3>
        <p className="text-sm v-fg-muted mb-4">Reviens demain ou élargis ta zone. En attendant, booste ton profil.</p>
        <button onClick={onReload} className="h-10 px-5 rounded-full vibe-gradient text-white font-semibold text-sm">
          Recharger la file
        </button>
      </div>
    </div>
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
