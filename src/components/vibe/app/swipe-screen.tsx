"use client";
// Swipe deck: Tinder-like drag with spring physics, Ken Burns video posters,
// Vibe Check overlay, action bar (rewind/pass/superlike/like/boost), match overlay.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { RotateCcw, X, Star, Heart, Zap, BadgeCheck, Waves, MapPin } from "lucide-react";
import { GemBadge } from "@/components/vibe/gem-badge";
import { VideoPlayer } from "./video-player";
import { useVibe } from "@/lib/vibe/store";
import { GEM_ACTIONS, VIBE_QUESTIONS } from "@/lib/vibe/constants";
import { toast } from "sonner";

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
  const [vibeIndex] = useState(() => Math.floor(Math.random() * VIBE_QUESTIONS.length));
  const vibeQ = VIBE_QUESTIONS[vibeIndex];

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
      } catch (e: any) {
        toast.error(e.message || "Erreur");
      }
    });
  }

  const top = deck[0];

  return (
    <div className="absolute inset-0 bg-zinc-950 text-white overflow-hidden">
      {/* top bar */}
      <div className="absolute top-9 inset-x-0 z-20 flex items-center justify-between px-4 py-2">
        <span className="font-display font-bold text-lg">Découvrir</span>
        <GemBadge gems={me?.gems ?? 0} onClick={onOpenWallet} />
      </div>

      {/* deck */}
      <div className="absolute inset-0 pt-20 pb-44 px-4">
        {loading ? (
          <div className="h-full grid place-items-center">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
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
      <div className="absolute bottom-[76px] inset-x-0 z-20 pb-1 pt-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
        <div className="flex items-center justify-center gap-3">
          <ActionButton onClick={rewind} label="Rewind" cost={GEM_ACTIONS.rewind} tone="amber">
            <RotateCcw className="h-5 w-5" />
          </ActionButton>
          <ActionButton onClick={() => top && swipe(top, "pass")} label="Pass" tone="red" big>
            <X className="h-7 w-7" />
          </ActionButton>
          <ActionButton onClick={() => top && swipe(top, "superlike")} label="Super" cost={GEM_ACTIONS.superlike} tone="blue" big>
            <Star className="h-6 w-6" />
          </ActionButton>
          <ActionButton onClick={() => top && swipe(top, "like")} label="Like" tone="green" big>
            <Heart className="h-7 w-7" />
          </ActionButton>
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
    if (offset.y < -threshold || velocity.y < -500) onSwipe("superlike");
    else if (offset.x > threshold || velocity.x > 500) onSwipe("like");
    else if (offset.x < -threshold || velocity.x < -500) onSwipe("pass");
  };

  const vibeMatch = profile.vibeAnswer === vibeQ.a ? "a" : profile.vibeAnswer === vibeQ.b ? "b" : null;

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10"
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
            <div className={`rounded-xl px-3 py-2 text-center text-sm font-semibold transition ${vibeMatch === "a" ? "bg-emerald-400/30 ring-1 ring-emerald-300 text-white" : "bg-white/10 text-white/60"}`}>
              {vibeQ.a === "plage" ? "🏖️" : vibeQ.a === "chien" ? "🐶" : vibeQ.a === "aventure" ? "🧗" : vibeQ.a === "cafe" ? "☕" : "🏙️"} {vibeQ.a}
            </div>
            <div className={`rounded-xl px-3 py-2 text-center text-sm font-semibold transition ${vibeMatch === "b" ? "bg-emerald-400/30 ring-1 ring-emerald-300 text-white" : "bg-white/10 text-white/60"}`}>
              {vibeQ.b === "montagne" ? "⛰️" : vibeQ.b === "chat" ? "🐱" : vibeQ.b === "confort" ? "🛋️" : vibeQ.b === "the" ? "🍵" : "🌳"} {vibeQ.b}
            </div>
          </div>
          <p className="text-[10px] text-white/50 mt-1.5 text-center">
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
            </p>
          </div>
        </div>
        <p className="text-xs text-white/70 mt-2 line-clamp-2">{profile.bio}</p>
        <p className="text-[10px] text-white/40 mt-2">Glisse ← pass · → like · ↑ super-like</p>
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  cost?: number;
  tone: "red" | "green" | "blue" | "amber" | "purple";
  big?: boolean;
}) {
  const tones: Record<string, string> = {
    red: "text-red-400 ring-red-400/40 hover:bg-red-400/10",
    green: "text-green-400 ring-green-400/40 hover:bg-green-400/10",
    blue: "text-cyan-300 ring-cyan-300/40 hover:bg-cyan-300/10",
    amber: "text-amber-300 ring-amber-300/40 hover:bg-amber-300/10",
    purple: "text-fuchsia-300 ring-fuchsia-300/40 hover:bg-fuchsia-300/10",
  };
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <span
        className={`grid place-items-center rounded-full bg-zinc-900 ring-1 ${tones[tone]} transition active:scale-90 ${big ? "h-14 w-14" : "h-11 w-11"}`}
      >
        {children}
      </span>
      <span className="text-[9px] text-white/50 font-medium flex items-center gap-0.5">
        {label}{cost ? `·${cost}` : ""}
      </span>
    </button>
  );
}

function EmptyDeck({ onReload }: { onReload: () => void }) {
  return (
    <div className="h-full grid place-items-center text-center px-6">
      <div>
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="font-display text-xl font-bold mb-1">C&apos;est tout pour aujourd&apos;hui !</h3>
        <p className="text-sm text-white/60 mb-4">Reviens demain ou élargis ta zone. En attendant, booste ton profil.</p>
        <button onClick={onReload} className="h-10 px-5 rounded-full vibe-gradient text-white font-semibold text-sm">
          Recharger la file
        </button>
      </div>
    </div>
  );
}
