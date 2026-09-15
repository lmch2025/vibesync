"use client";
// Matches list screen — WhatsApp-style inbox with boost indicators.
// Conversations with a boosted last message are sorted to the top with a
// visual ⚡ badge and amber ring. Shows last activity (text/voice/gift).
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Lock, MessageCircle, BadgeCheck, MapPin, Zap } from "lucide-react";
import { useVibe } from "@/lib/vibe/store";
import { prefetchChat } from "./chat-screen";

type MatchRow = {
  id: string;
  unlocked: boolean;
  isInitiator: boolean;
  locked: boolean;
  myMessagesCount: number;
  theirMessagesCount: number;
  createdAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageBoosted: boolean;
  lastMessageType: string;
  giftsCount: number;
  other: {
    id: string;
    displayName: string;
    posterUrl: string;
    city: string;
    age: number;
    verified: boolean;
  } | null;
};

export function MatchesScreen({ onOpenChat }: { onOpenChat: (target: { id: string, name: string, poster: string | null }) => void }) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vibe/matches");
      const data = await res.json();
      if (res.ok) setMatches(data.matches ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const active = matches.filter((m) => m.other);

  useEffect(() => {
    matches.forEach((m) => {
      if (m.other) prefetchChat(m.id);
    });
  }, [matches]);

  const lockedMatches = active.filter((m) => m.locked);
  const boostedCount = active.filter((m) => m.lastMessageBoosted).length;

  return (
    <div className="absolute inset-0 bg-zinc-950 text-white overflow-hidden">
      <div className="absolute top-9 inset-x-0 z-20 px-4 py-2 flex items-center justify-between">
        <span className="font-display font-bold text-lg">Matchs</span>
        <div className="flex items-center gap-3">
          {boostedCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[11px] text-amber-300 flex items-center gap-1 bg-amber-400/10 rounded-full px-2 py-0.5"
            >
              <Zap className="h-3 w-3" fill="currentColor" /> {boostedCount} boosté{boostedCount > 1 ? "s" : ""}
            </motion.span>
          )}
          {lockedMatches.length > 0 && (
            <span className="text-[11px] text-amber-300 flex items-center gap-1">
              <Lock className="h-3 w-3" /> {lockedMatches.length} en attente
            </span>
          )}
        </div>
      </div>

      <div className="absolute inset-0 pt-20 pb-24 overflow-y-auto no-scrollbar px-4">
        {loading ? (
          <div className="grid place-items-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        ) : active.length === 0 ? (
          <div className="grid place-items-center py-24 text-center px-6">
            <div className="text-5xl mb-3">💭</div>
            <h3 className="font-display text-lg font-bold mb-1">Aucun match pour l&apos;instant</h3>
            <p className="text-sm text-white/60">Continue à swiper — ton premier match est tout proche.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {active.map((m, i) => {
              const isBoosted = m.lastMessageBoosted;
              const time = m.lastMessageAt
                ? new Date(m.lastMessageAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                : null;

              return (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <button
                    onClick={() => onOpenChat({ id: m.id, name: m.other!.displayName, poster: m.other!.posterUrl })}
                    className={`w-full flex items-center gap-3 rounded-2xl p-2.5 transition text-left ${
                      isBoosted
                        ? "bg-amber-400/10 ring-1 ring-amber-300/40 hover:bg-amber-400/15"
                        : "bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10">
                      <img src={m.other!.posterUrl || "/profiles/lea.png"} alt={m.other!.displayName} className="absolute inset-0 w-full h-full object-cover" />
                      {isBoosted && (
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute -top-1 -right-1 grid place-items-center h-5 w-5 rounded-full bg-amber-400 text-black shadow-lg"
                        >
                          <Zap className="h-3 w-3" fill="black" />
                        </motion.div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold truncate">{m.other!.displayName}, {m.other!.age}</span>
                        {m.other!.verified && <BadgeCheck className="h-3.5 w-3.5 text-cyan-300 shrink-0" />}
                        {m.locked && <Lock className="h-3 w-3 text-amber-300 shrink-0" />}
                      </div>
                      <p className="text-xs text-white/50 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {m.other!.city}
                      </p>
                      <p className={`text-xs truncate mt-0.5 ${isBoosted ? "text-amber-200 font-medium" : "text-white/70"}`}>
                        {m.lastMessage ?? "Nouveau match — dis bonjour ! 👋"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {time && (
                        <span className={`text-[10px] tabular-nums ${isBoosted ? "text-amber-300" : "text-white/40"}`}>
                          {time}
                        </span>
                      )}
                      {isBoosted && (
                        <motion.span
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-[9px] bg-amber-400 text-black font-bold rounded-full px-1.5 py-0.5 flex items-center gap-0.5"
                        >
                          <Zap className="h-2.5 w-2.5" fill="black" /> BOOST
                        </motion.span>
                      )}
                      {m.giftsCount > 0 && !isBoosted && (
                        <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-200 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                          <Gift className="h-2.5 w-2.5" /> {m.giftsCount}
                        </span>
                      )}
                      {!m.unlocked && m.isInitiator && !isBoosted && (
                        <span className="text-[9px] text-amber-300/80">Anti-spam {m.myMessagesCount}/3</span>
                      )}
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
