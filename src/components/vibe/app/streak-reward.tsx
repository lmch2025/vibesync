"use client";
// StreakReward — daily check-in modal that rewards consecutive days.
// Shows a 7-day progress bar with escalating rewards, claim button, and
// a satisfying animation when claimed. This is the core addictive loop.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flame, Gift, Link } from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { useVibe } from "@/lib/vibe/store";
import { toast } from "sonner";
import { ConfettiBurst, haptic, sfx } from "./interactive-animations";

type StreakData = {
  streak: number;
  streakMax: number;
  canClaim: boolean;
  todayReward: number;
  nextReward: number;
  streakRewardClaimed: boolean;
  rewards: { day: number; reward: number; claimed: boolean }[];
};

export function StreakReward() {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const [data, setData] = useState<StreakData | null>(null);
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/vibe/streak");
      const d = await res.json();
      if (res.ok) {
        setData(d);
        // Auto-open if user can claim and hasn't seen it this session.
        if (d.canClaim && !sessionStorage.getItem("streakSeen")) {
          sessionStorage.setItem("streakSeen", "1");
          setTimeout(() => setOpen(true), 1500);
        }
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  async function claim() {
    setClaiming(true);
    try {
      const res = await fetch("/api/vibe/streak", { method: "POST" });
      // Silently ignore non-OK responses (400 = already claimed today, etc.).
      // We never throw here so no console error is emitted.
      if (!res.ok) {
        load(); // Refresh UI state (disables the claim button if already claimed)
        return;
      }
      const d = await res.json();
      patchMe({ gems: d.gems, freeGems: d.freeGems });
      // Claim juice — coin sound + haptic pulse (confetti already bursts in
      // the claimed view). Fired once, inside the success handler.
      sfx.play("coin");
      haptic([10, 30, 10]);
      setJustClaimed(true);
      toast.success(d.message);
      // After 2.5s, show the referral invite instead of auto-closing.
      setTimeout(() => {
        setJustClaimed(false);
        setShowReferral(true);
        load();
      }, 2500);
    } catch {
      // Network error — fail silently, refresh state
      load();
    } finally {
      setClaiming(false);
    }
  }

  if (!data) return null;

  return (
    <>
      {/* Compact streak indicator — visible in the app */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 ring-1 ring-amber-300/30 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition"
      >
        <Flame className="h-3.5 w-3.5" fill="currentColor" />
        <span className="tabular-nums">{data.streak} {data.streak > 1 ? "jours" : "jour"}</span>
        {data.canClaim && (
          <motion.span
            animate={{ scale: [1, 1.2] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            className="h-1.5 w-1.5 rounded-full bg-amber-400"
          />
        )}
      </button>

      {/* Full streak modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] grid place-items-center px-4"
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-sm rounded-3xl bg-zinc-900 ring-1 ring-white/10 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {justClaimed ? (
                /* Claim success animation */
                <div className="flex flex-col items-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="text-7xl mb-3"
                  >
                    🔥
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="flex items-center gap-1.5 rounded-full bg-amber-400/20 ring-1 ring-amber-300/40 px-4 py-2"
                  >
                    <GemIcon className="h-5 w-5" />
                    <span className="font-display text-xl font-black text-amber-300">+{data.todayReward}</span>
                    <span className="text-sm text-amber-200/70">Vibes</span>
                  </motion.div>
                  {/* Confetti */}
                  <ConfettiBurst count={150} duration={2} />
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-4">
                    <motion.div
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-5xl mb-2"
                    >
                      🔥
                    </motion.div>
                    <h3 className="font-display text-xl font-bold text-white">Série de {data.streak} jour{data.streak > 1 ? "s" : ""}</h3>
                    <p className="text-xs text-white/50 mt-0.5">Record: {data.streakMax} jours</p>
                  </div>

                  {/* 7-day progress bar */}
                  <div className="flex items-center justify-between mb-5 px-1">
                    {data.rewards.map((r) => {
                      const isToday = r.day === data.streak + (data.canClaim ? 1 : 0);
                      const isClaimed = r.claimed;
                      return (
                        <div key={r.day} className="flex flex-col items-center gap-1">
                          <motion.div
                            animate={isToday && data.canClaim ? { scale: [1, 1.15, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className={`grid place-items-center h-9 w-9 rounded-full text-xs font-bold transition ${
                              isClaimed
                                ? "bg-amber-400 text-black"
                                : isToday && data.canClaim
                                  ? "bg-amber-400/20 ring-2 ring-amber-300 text-amber-300"
                                  : "bg-white/5 text-white/30 ring-1 ring-white/10"
                            }`}
                          >
                            {isClaimed ? <Check className="h-4 w-4" /> : r.day}
                          </motion.div>
                          <span className={`text-[8px] tabular-nums ${isClaimed ? "text-amber-300" : "text-white/30"}`}>
                            +{r.reward}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Today's reward */}
                  <div className="rounded-2xl bg-gradient-to-br from-amber-400/10 to-vibe-orange/10 ring-1 ring-amber-300/20 px-4 py-3 mb-4 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-amber-300/70">Récompense du jour</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <GemIcon className="h-5 w-5" />
                      <span className="font-display text-2xl font-black text-amber-300">+{data.todayReward}</span>
                      <span className="text-sm text-amber-200/60">Vibes</span>
                    </div>
                  </div>

                  {/* Claim button */}
                  {data.canClaim ? (
                    <motion.button
                      onClick={claim}
                      disabled={claiming}
                      whileTap={{ scale: 0.95 }}
                      className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-display font-bold text-base active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <Gift className="h-5 w-5" />
                      {claiming ? "…" : "Réclamer"}
                    </motion.button>
                  ) : (
                    <div className="w-full h-12 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center gap-2 text-sm text-white/40">
                      <Check className="h-4 w-4 text-emerald-400" /> Réclamé aujourd'hui — reviens demain !
                    </div>
                  )}

                  <p className="text-[10px] text-white/30 text-center mt-3">
                    Reviens chaque jour pour augmenter ta série et gagner plus de Vibes
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Referral modal — appears after claiming streak reward ===== */}
      <AnimatePresence>
        {showReferral && (
          <ReferralModal onClose={() => { setShowReferral(false); setOpen(false); }} reward={data?.todayReward ?? 2} />
        )}
      </AnimatePresence>
    </>
  );
}

/// ReferralModal — immersive invite screen shown after streak claim.
/// Encourages the user to invite friends for bonus Vibes.
function ReferralModal({ onClose, reward }: { onClose: () => void; reward: number }) {
  const [copied, setCopied] = useState(false);
  const referralLink = "https://vivilov.app/r/vibe-friend";

  function share(platform: string) {
    const text = `J'ai gagné ${reward} Vibes sur Vivilov ! Rejoins-moi et découvre la rencontre authentique en vidéo 🎬`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + referralLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
    };
    if (urls[platform]) window.open(urls[platform], "_blank");
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] grid place-items-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-sm rounded-3xl bg-zinc-900 ring-1 ring-white/10 p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow background */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-vibe-purple/30 blur-3xl" />

        {/* Gift icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
          className="text-5xl text-center mb-2"
        >
          🎁
        </motion.div>

        <h3 className="font-display text-xl font-bold text-center text-white mb-1">
          Gagne encore plus !
        </h3>
        <p className="text-sm text-white/60 text-center mb-4">
          Invite tes amis sur Vivilov et reçois <span className="font-bold text-amber-300">+10 Vibes</span> par inscription.
        </p>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => share("whatsapp")}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 hover:bg-white/10 transition active:scale-95"
          >
            <span className="h-9 w-9 grid place-items-center rounded-full" style={{ backgroundColor: "#25D366" }}>
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            </span>
            <span className="text-[10px] text-white/60">WhatsApp</span>
          </button>
          <button
            onClick={() => share("facebook")}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 hover:bg-white/10 transition active:scale-95"
          >
            <span className="h-9 w-9 grid place-items-center rounded-full" style={{ backgroundColor: "#1877F2" }}>
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </span>
            <span className="text-[10px] text-white/60">Facebook</span>
          </button>
          <button
            onClick={() => share("twitter")}
            className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 hover:bg-white/10 transition active:scale-95"
          >
            <span className="h-9 w-9 grid place-items-center rounded-full bg-black">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </span>
            <span className="text-[10px] text-white/60">Twitter / X</span>
          </button>
        </div>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="w-full h-10 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center gap-2 text-sm text-white/70 hover:bg-white/10 transition mb-3"
        >
          {copied ? (
            <><Check className="h-4 w-4 text-emerald-400" /> Lien copié !</>
          ) : (
            <><Link className="h-4 w-4 text-vibe-purple" /> Copier le lien d'invitation</>
          )}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full h-11 rounded-2xl vibe-gradient text-white font-bold text-sm active:scale-95 transition"
        >
          Plus tard
        </button>

        <p className="text-[10px] text-white/30 text-center mt-3">
          10 Vibes offertes pour chaque ami qui s'inscrit avec ton lien
        </p>
      </motion.div>
    </motion.div>
  );
}
