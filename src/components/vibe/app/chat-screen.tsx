"use client";
// Chat screen — WhatsApp-inspired UX with voice notes and message status.
// Features: message bubbles with timestamps + checkmarks, voice notes (record/play),
// read receipts (sent ✓ / delivered ✓✓ / read blue ✓✓ / listened blue ✓✓),
// emoji picker, gift tray with note, anti-spam, icebreaker IA, message boost.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const chatCache: Record<string, any> = {};

export function prefetchChat(matchId: string) {
  if (chatCache[matchId]) return Promise.resolve(chatCache[matchId]);
  return fetch(`/api/vibe/matches/${matchId}/messages`)
    .then((r) => r.json())
    .then((data) => {
      if (!data.error) chatCache[matchId] = data;
      return data;
    })
    .catch(() => null);
}

import {
  ArrowLeft, BadgeCheck, Check, CheckCheck, Clock, Gift, Lock, Mic,
  Send, Smile, Wand2, Zap, X,
} from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { sfx, haptic, TypingDots, useShake } from "@/components/vibe/app/interactive-animations";
import { useVibe } from "@/lib/vibe/store";
import { useCurrency } from "@/lib/vibe/use-currency";
import { GIFTS, GEM_ACTIONS } from "@/lib/vibe/constants";
import EmojiPicker from "./emoji-picker";
import { GiftOpenModal } from "./gift-open-modal";
import { VoiceRecorder } from "./voice-recorder";
import { VoiceNotePlayer } from "./voice-note-player";
import { toast } from "sonner";

type TimelineItem = {
  kind: "message";
  id: string;
  senderId: string;
  mine: boolean;
  text: string;
  type: string;
  boosted: boolean;
  status: string;
  voiceData: string | null;
  voiceDuration: number | null;
  voiceListened: boolean;
  createdAt: string;
  senderName: string;
} | {
  kind: "gift";
  id: string;
  senderId: string;
  mine: boolean;
  giftKey: string;
  giftName: string;
  giftEmoji: string;
  gemCost: number;
  eurValueCents: number;
  opened: boolean;
  messageText: string | null;
  createdAt: string;
  senderName: string;
};

type ChatState = {
  timeline: TimelineItem[];
  unlocked: boolean;
  isInitiator: boolean;
  locked: boolean;
  myMessagesCount: number;
  theirMessagesCount: number;
  remainingBeforeLock: number;
  // The REAL admin-configured anti-spam limit (never hardcode it client-side).
  maxMessagesBeforeReply?: number;
};

export function ChatScreen({ matchId, initialName, initialPoster, onBack }: { matchId: string; initialName?: string; initialPoster?: string | null; onBack: () => void }) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const requireVibes = useVibe((s) => s.requireVibes);
  const { moneyCents } = useCurrency();
  const [state, setState] = useState<ChatState | null>(chatCache[matchId] || null);
  const [text, setText] = useState("");
  const [boost, setBoost] = useState(false);
  const [boostInfo, setBoostInfo] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [otherName, setOtherName] = useState(initialName || "");
  const [otherPoster, setOtherPoster] = useState<string | null>(initialPoster || null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Envoi optimiste : bulle locale affichée immédiatement, remplacée par les
  // données serveur au load().
  const [optimistic, setOptimistic] = useState<Extract<TimelineItem, { kind: "message" }> | null>(null);
  // Indicateur « écrit… » simulé dans le header après chaque envoi.
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ids déjà rendus — évite de rejouer l'animation d'entrée des bulles quand
  // load() rafraîchit la timeline (les bulles restent montées via key stable).
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());
  // Shake d'erreur sur la zone de saisie.
  const { controls: shakeControls, trigger: shakeTrigger } = useShake();

  const [openingGift, setOpeningGift] = useState<TimelineItem | null>(null);
  const [giftNote, setGiftNote] = useState("");

  /// Affiche « écrit… » ~2-3 s dans le header (simulé localement, sans websocket).
  /// Ne bloque rien — pur retour visuel après un envoi.
  const simulatePartnerTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setPartnerTyping(true);
    typingTimer.current = setTimeout(() => setPartnerTyping(false), 2200 + Math.random() * 800);
  }, []);

  // Nettoie le timer de typing simulé au démontage.
  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  // Marque les ids rendus comme « vus » après leur premier affichage — les
  // prochains rendus ne rejoueront donc pas l'animation d'entrée.
  useEffect(() => {
    if (!state) return;
    setAnimatedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const t of state.timeline) {
        if (!next.has(t.id)) {
          next.add(t.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [state]);

  const load = async () => {
    // Show cached state immediately via useState initial value, but always fetch fresh in background
    const res = await fetch(`/api/vibe/matches/${matchId}/messages`);
    const data = await res.json();
    if (res.ok) {
      chatCache[matchId] = data;
      setState(data);
      // Cache the other user's info for the chat header if not provided
      if (!initialName) {
        const firstGift = (data.timeline ?? []).find((t: TimelineItem) => t.kind === "gift" && !t.mine);
        if (firstGift && firstGift.kind === "gift") setOtherName(firstGift.senderName);
      }
    }
  };

  useEffect(() => { load(); }, [matchId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state?.timeline.length, optimistic?.id]);

  async function send() {
    if (!text.trim() || !state) return;
    if (state.locked) return;
    const boostCost = boost ? GEM_ACTIONS.messageBoost : 0;
    const doSend = async () => {
      setSending(true);
      const bodyText = text.trim();
      const body: any = { text: bodyText, boost, type: "text" };
      // Feedback immédiat : son + haptic + bulle optimiste locale.
      const tempId = `local-${Date.now()}`;
      setOptimistic({
        kind: "message",
        id: tempId,
        senderId: me?.id ?? "",
        mine: true,
        text: bodyText,
        type: "text",
        boosted: boost,
        status: "sending",
        voiceData: null,
        voiceDuration: null,
        voiceListened: false,
        createdAt: new Date().toISOString(),
        senderName: me?.profile?.displayName ?? me?.name ?? "",
      });
      sfx.play("send");
      haptic(10);
      setText("");
      const wasBoost = boost;
      setBoost(false);
      try {
        const res = await fetch(`/api/vibe/matches/${matchId}/messages`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setOptimistic(null);
          setText(bodyText);
          sfx.play("error");
          shakeTrigger();
          if (data.locked) toast.error(data.error, { duration: 4000 });
          else toast.error(data.error);
          return;
        }
        if (data.gems !== undefined) patchMe({ gems: data.gems, freeGems: data.freeGems });
        if (wasBoost) {
          toast.success("Message boosté ! ⚡", {
            description: "Ton message est en haut de sa boîte de réception.",
            duration: 3000,
          });
        }
        // Remplace la bulle optimiste par les données serveur, puis simule
        // le typing du partenaire (retour visuel élégant, non bloquant).
        await load();
        setOptimistic(null);
        simulatePartnerTyping();
      } catch {
        // Erreur réseau — retire la bulle optimiste et restaure le texte.
        setOptimistic(null);
        setText(bodyText);
        sfx.play("error");
        shakeTrigger();
      } finally { setSending(false); }
    };
    if (boostCost > 0) requireVibes(boostCost, "Booster ce message (10 Vibes)", doSend);
    else doSend();
  }

  async function sendVoiceNote(base64: string, duration: number) {
    setSending(true);
    setVoiceMode(false);
    sfx.play("send");
    haptic(10);
    try {
      const res = await fetch(`/api/vibe/matches/${matchId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "voice", voiceData: base64, voiceDuration: duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.gems !== undefined) patchMe({ gems: data.gems, freeGems: data.freeGems });
      await load();
      simulatePartnerTyping();
    } catch (e: any) {
      sfx.play("error");
      toast.error(e.message || "Erreur");
    } finally { setSending(false); }
  }

  function markVoiceListened(messageId: string) {
    fetch(`/api/vibe/matches/${matchId}/messages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    }).then(() => load()).catch(() => {});
  }

  function sendGift(giftKey: string) {
    const gift = GIFTS.find((g) => g.key === giftKey);
    if (!gift) return;
    const note = giftNote.trim();
    requireVibes(gift.gemCost, `${gift.emoji} ${gift.name} (${gift.gemCost} Vibes)`, async () => {
      try {
        const res = await fetch(`/api/vibe/matches/${matchId}/gift`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giftKey, messageText: note || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Elegant fallback: when the server rejects because only free Vibes
          // are available (gifts require purchased Vibes), open the refill
          // modal instead of a bare error toast — the pending proceed lets the
          // gift retry automatically after a successful pack purchase.
          if (res.status === 402 && data.needPurchased) {
            sfx.play("error");
            useVibe.getState().openInsufficient(
              gift.gemCost,
              data.purchasedGems ?? 0,
              `${gift.emoji} ${gift.name}`,
              () => sendGift(giftKey),
            );
            return;
          }
          throw new Error(data.error);
        }
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        toast.success(`${gift.emoji} ${gift.name} envoyé ! Il/elle le découvrira en l'ouvrant. 🎁`);
        setGiftOpen(false);
        setGiftNote("");
        await load();
      } catch (e: any) { toast.error(e.message || "Erreur"); }
    });
  }

  function icebreaker() {
    requireVibes(GEM_ACTIONS.icebreaker, "Icebreaker IA (3 Vibes)", async () => {
      try {
        const res = await fetch("/api/vibe/gems/spend", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "icebreaker" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        if (data.icebreaker) setText(data.icebreaker);
        toast.success("✨ Phrase d'accroche générée par IA");
      } catch (e: any) { toast.error(e.message || "Erreur"); }
    });
  }

  const locked = !!state?.locked;
  const hasText = text.trim().length > 0;

  return (
    <div className="absolute inset-0 v-bg-app v-fg overflow-hidden flex flex-col">
      {/* ===== WHATSAPP-STYLE HEADER ===== */}
      <div className="pt-9 px-3 py-2 flex items-center gap-2.5 border-b v-divider v-surface-solid backdrop-blur-md z-20">
        <button onClick={onBack} className="h-9 w-9 grid place-items-center rounded-full hover:v-surface-2 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative h-9 w-9 rounded-full overflow-hidden ring-1 ring-[var(--v-divider)] shrink-0">
          {otherPoster && <img src={otherPoster} alt={otherName} className="h-9 w-9 rounded-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm truncate">{otherName || "..."}</span>
            <BadgeCheck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300 shrink-0" />
          </div>
          {partnerTyping ? (
            <TypingDots label="écrit…" className="text-[10px] text-emerald-600 dark:text-emerald-400" dotClassName="bg-emerald-500 dark:bg-emerald-400" />
          ) : (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">en ligne</p>
          )}
        </div>
        <button onClick={() => setGiftOpen(true)} className="h-9 w-9 grid place-items-center rounded-full hover:v-surface-2 text-fuchsia-500 dark:text-fuchsia-300 transition shrink-0" aria-label="Offrir un cadeau">
          <Gift className="h-5 w-5" />
        </button>
      </div>

      {/* ===== MESSAGE TIMELINE (WhatsApp-style background) ===== */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-1"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, oklch(0.55 0.24 295 / 0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.72 0.19 55 / 0.03) 0%, transparent 50%)`,
        }}
      >
        {state?.timeline.length === 0 && (
          <div className="text-center py-10">
            <div className="inline-block rounded-2xl bg-amber-500/15 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-100/80">
              🔒 Les messages sont sécurisés. Sois toi-même. 👋
            </div>
          </div>
        )}

        {state?.timeline.map((item) => {
          // Les messages déjà rendus n'ont pas de nouvelle animation d'entrée
          // quand load() rafraîchit la timeline.
          const isNew = !animatedIds.has(item.id);
          if (item.kind === "gift") {
            return <GiftBubble key={item.id} item={item} animateIn={isNew} onOpen={() => item.kind === "gift" && !item.mine && !item.opened && setOpeningGift(item)} />;
          }
          return (
            <MessageBubble
              key={item.id}
              item={item}
              animateIn={isNew}
              onListened={() => markVoiceListened(item.id)}
            />
          );
        })}

        {/* Bulle optimiste — affichée immédiatement, statut « sending » */}
        {optimistic && (
          <MessageBubble key={optimistic.id} item={optimistic} animateIn onListened={() => {}} />
        )}
      </div>

      {/* ===== ANTI-SPAM BANNER ===== */}
      {locked && (
        <div className="mx-3 mb-2 rounded-2xl bg-amber-400/15 ring-1 ring-amber-300/40 p-3 text-center">
          <Lock className="h-5 w-5 mx-auto mb-1 text-amber-500 dark:text-amber-300" />
          <p className="text-xs text-amber-800 dark:text-amber-100 font-medium">Anti-spam actif</p>
          <p className="text-[11px] text-amber-800/85 dark:text-amber-100/85 mt-0.5">
            Tu as envoyé tes {state?.maxMessagesBeforeReply ?? 3} messages. Attends une réponse, ou envoie un cadeau.
          </p>
          <button onClick={() => setGiftOpen(true)} className="mt-2 h-8 px-3 rounded-full bg-amber-300 text-black text-xs font-bold">
            Offrir un cadeau
          </button>
        </div>
      )}

      {/* ===== ICEBREAKER (empty chat) ===== */}
      {state && state.timeline.length === 0 && !locked && (
        <div className="mx-3 mb-2">
          <motion.button
            onClick={() => {
              sfx.play("pop");
              icebreaker();
            }}
            whileTap={{ scale: 0.95 }}
            className="w-full h-9 rounded-xl v-surface-1 ring-1 ring-[var(--v-divider)] text-xs v-fg-muted flex items-center justify-center gap-1.5 hover:v-surface-2"
          >
            <Wand2 className="h-3.5 w-3.5 text-accent" /> Icebreaker IA · 3 <GemIcon className="h-3 w-3" />
          </motion.button>
        </div>
      )}

      {/* ===== WHATSAPP-STYLE INPUT BAR ===== */}
      <div className="px-2.5 pb-3 pt-2 v-surface-solid backdrop-blur-md border-t v-divider">
        {/* Boost banner — single unified element (replaces old banner + tooltip).
            Shows full explanation on first activation, compact on subsequent. */}
        <AnimatePresence>
          {boost && !voiceMode && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 rounded-2xl bg-amber-400/15 ring-1 ring-amber-300/40 px-3 py-2">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="text-lg shrink-0 mt-0.5"
                >
                  ⚡
                </motion.span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-100">
                    Message boosté
                    {boostInfo && (
                      <span className="ml-1.5 text-[10px] font-normal text-amber-800/70 dark:text-amber-100/60">
                        · mis en haut de sa boîte ⚡ 2h
                      </span>
                    )}
                  </p>
                  {boostInfo ? (
                    <p className="text-[10px] text-amber-800/70 dark:text-amber-100/70 mt-0.5 leading-relaxed">
                      Ton message sera mis en <span className="text-amber-600 dark:text-amber-300 font-medium">haut de sa boîte de réception</span> avec un badge ⚡ visible pendant 2h.
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-800/60 dark:text-amber-100/50">
                      Remonte en haut + notification visuelle
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-300 tabular-nums">
                    <GemIcon className="h-3 w-3" /> 10
                  </span>
                  {boostInfo && (
                    <button
                      onClick={() => setBoostInfo(false)}
                      className="text-[9px] bg-amber-400/30 text-amber-800 dark:text-amber-100 rounded-full px-2 py-0.5 hover:bg-amber-400/40 transition"
                    >
                      Compris
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {voiceMode ? (
          <VoiceRecorder onSend={sendVoiceNote} onCancel={() => setVoiceMode(false)} />
        ) : (
          <motion.div animate={shakeControls} className="flex items-center gap-1.5">
            {/* Emoji */}
            <button
              onClick={() => setEmojiOpen(true)}
              className="h-10 w-10 grid place-items-center rounded-full shrink-0 v-fg-muted hover:v-fg transition"
              aria-label="Emojis"
            >
              <Smile className="h-5 w-5" />
            </button>
            {/* Boost toggle — animated, shows cost */}
            <motion.button
              onClick={() => {
                if (!boost) {
                  setBoostInfo(true);
                  setBoost(true);
                } else {
                  setBoost(false);
                  setBoostInfo(false);
                }
              }}
              whileTap={{ scale: 0.85 }}
              animate={boost ? { boxShadow: "0 0 20px oklch(0.85 0.18 75 / 0.5)" } : {}}
              className={`relative h-10 w-10 grid place-items-center rounded-full shrink-0 transition ${
                boost
                  ? "bg-gradient-to-br from-amber-300 to-amber-500 text-black"
                  : "v-fg-muted hover:text-amber-500 dark:hover:text-amber-300 hover:bg-amber-400/10"
              }`}
              aria-label="Booster ce message (10 Vibes)"
              title="Booster — 10 Vibes"
            >
              <motion.div
                animate={boost ? { rotate: [0, -15, 15, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Zap className="h-4 w-4" fill={boost ? "currentColor" : "none"} />
              </motion.div>
              {boost && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-black text-amber-300 rounded-full px-1 py-0.5 leading-none"
                >
                  10
                </motion.span>
              )}
              {boost && (
                <motion.span
                  className="absolute inset-0 rounded-full ring-2 ring-amber-300"
                  animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>
            {/* Text input */}
            <div className="flex-1 relative">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={locked}
                placeholder={locked ? "En attente…" : boost ? "✨ Message boosté…" : "Écris un message…"}
                className={`w-full h-10 rounded-full px-4 pr-10 text-sm placeholder:v-fg-muted outline-none ring-1 transition disabled:opacity-50 ${
                  boost
                    ? "bg-amber-400/10 ring-amber-400/60 dark:ring-amber-300/40 focus:ring-amber-500 dark:focus:ring-amber-300/60"
                    : "v-surface-2 ring-[var(--v-divider)] focus:ring-vibe-purple/50"
                }`}
              />
            </div>
            {/* Send OR Mic button */}
            {hasText ? (
              <motion.button
                onClick={send}
                disabled={sending || locked}
                whileTap={{ scale: 0.85 }}
                className={`h-10 w-10 grid place-items-center rounded-full text-white shrink-0 transition disabled:opacity-40 ${
                  boost
                    ? "bg-gradient-to-br from-amber-400 to-orange-500"
                    : "vibe-gradient"
                }`}
                aria-label="Envoyer"
              >
                {sending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </motion.button>
            ) : (
              <button
                onClick={() => setVoiceMode(true)}
                disabled={locked}
                className="h-10 w-10 grid place-items-center rounded-full v-fg-muted hover:v-fg transition disabled:opacity-40 shrink-0"
                aria-label="Enregistrer un vocal"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </motion.div>
        )}
        {state && !state.unlocked && state.isInitiator && state.remainingBeforeLock > 0 && !voiceMode && (
          <p className="text-[10px] v-fg-muted text-center mt-1">
            Reste {state.remainingBeforeLock} message{state.remainingBeforeLock > 1 ? "s" : ""} sur {state.maxMessagesBeforeReply ?? 3} avant blocage anti-spam
          </p>
        )}
      </div>

      {/* ===== EMOJI PICKER ===== */}
      <AnimatePresence>
        {emojiOpen && (
          <EmojiPicker onSelect={(emoji) => setText((t) => t + emoji)} onClose={() => setEmojiOpen(false)} />
        )}
      </AnimatePresence>

      {/* ===== GIFT TRAY ===== */}
      <AnimatePresence>
        {giftOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGiftOpen(false)} className="absolute inset-0 v-veil z-40" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute bottom-0 inset-x-0 z-50 rounded-t-3xl v-surface-solid ring-1 ring-[var(--v-divider)] p-4 pb-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-lg">Offrir un cadeau 🎁</h3>
                <button onClick={() => setGiftOpen(false)} className="h-8 w-8 grid place-items-center rounded-full hover:v-surface-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] v-fg-muted mb-2">Le destinataire découvrira le cadeau en l'ouvrant. 70% de la valeur lui est créditée.</p>
              <input
                value={giftNote} onChange={(e) => setGiftNote(e.target.value)} maxLength={200}
                placeholder="Ajoute un petit mot (optionnel)…"
                className="w-full h-9 rounded-xl v-surface-1 ring-1 ring-[var(--v-divider)] px-3 text-sm placeholder:v-fg-muted outline-none focus:ring-vibe-purple/50 mb-3"
              />
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto no-scrollbar">
                {GIFTS.map((g) => (
                  <button key={g.key} onClick={() => sendGift(g.key)} className="relative flex flex-col items-center gap-1 rounded-2xl v-surface-1 ring-1 ring-[var(--v-divider)] p-2 hover:v-surface-2 active:scale-95 transition">
                    {g.popular && <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-accent text-black font-bold rounded-full px-1 py-0.5">HOT</span>}
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-[10px] v-fg text-center leading-tight">{g.name}</span>
                    <span className="text-[9px] text-fuchsia-600 dark:text-fuchsia-300 flex items-center gap-0.5"><GemIcon className="h-2.5 w-2.5" /> {g.gemCost}</span>
                    <span className="text-[8px] text-emerald-600 dark:text-emerald-300/80">≈ {moneyCents(g.eurValueCents * 0.7)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== GIFT OPEN MODAL ===== */}
      {openingGift && (
        <GiftOpenModalMemo openingGift={openingGift} onOpenChange={(o) => { if (!o) { setOpeningGift(null); load(); } }} />
      )}
    </div>
  );
}

// ===== WHATSAPP-STYLE MESSAGE BUBBLE =====
function MessageBubble({ item, onListened, animateIn = true }: { item: Extract<TimelineItem, { kind: "message" }>; onListened: () => void; animateIn?: boolean }) {
  const time = new Date(item.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const isVoice = item.type === "voice";
  const isSending = item.status === "sending";

  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 6, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${item.mine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative max-w-[78%] rounded-2xl px-3 py-1.5 text-sm ${
          item.mine
            ? item.boosted
              ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-md"
              : "bg-gradient-to-br from-vibe-purple to-vibe-pink/80 text-white rounded-br-md"
            : item.boosted
              ? "bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600/40 dark:to-orange-700/40 text-white rounded-bl-md ring-1 ring-amber-400/40"
              : "v-surface-2 v-fg rounded-bl-md"
        } ${item.boosted ? "ring-2 ring-amber-300/80" : ""} ${isSending ? "opacity-70 animate-pulse" : ""}`}
      >
        {item.boosted && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="absolute -top-2.5 -right-1.5 text-[9px] bg-amber-300 text-black font-bold rounded-full px-1.5 py-0.5 flex items-center gap-0.5 z-10 shadow-lg"
          >
            <motion.span
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Zap className="h-2.5 w-2.5" fill="black" />
            </motion.span>
            BOOST
          </motion.span>
        )}
        {item.boosted && (
          <motion.span
            className="absolute inset-0 rounded-2xl ring-2 ring-amber-300/50 pointer-events-none"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Voice note or text */}
        {isVoice ? (
          <div className="py-1">
            <VoiceNotePlayer
              voiceData={item.voiceData || undefined}
              duration={item.voiceDuration}
              mine={item.mine}
              listened={item.voiceListened}
              onListened={onListened}
            />
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words pr-12">{item.text}</p>
        )}

        {/* Timestamp + status checkmarks — WhatsApp style */}
        <div className={`flex items-center gap-1 ${item.mine ? "justify-end" : "justify-end"} -mt-0.5 -mb-0.5`}>
          <span className={`text-[9px] ${item.mine || item.boosted ? "text-white/70" : "v-fg-muted"}`}>{time}</span>
          {item.mine && <StatusCheckmarks status={item.status} listened={item.voiceListened} isVoice={isVoice} />}
        </div>
      </div>
    </motion.div>
  );
}

// ===== GIFT BUBBLE =====
function GiftBubble({ item, onOpen, animateIn = true }: { item: Extract<TimelineItem, { kind: "gift" }>; onOpen: () => void; animateIn?: boolean }) {
  const time = new Date(item.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 6, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${item.mine ? "justify-end" : "justify-start"}`}
    >
      {item.mine ? (
        <div className="max-w-[78%] rounded-2xl bg-gradient-to-br from-vibe-purple to-vibe-pink/80 text-white rounded-br-md px-3 py-2 flex items-center gap-2">
          <span className="text-2xl">{item.giftEmoji}</span>
          <div><p className="text-[10px] uppercase tracking-wide text-white/70">Cadeau envoyé</p><p className="text-sm font-semibold">{item.giftName}</p></div>
          <span className="text-[9px] text-white/70 ml-2">{time}</span>
        </div>
      ) : item.opened ? (
        <div className="max-w-[78%] rounded-2xl v-surface-2 v-fg rounded-bl-md px-3 py-2 flex items-center gap-2">
          <span className="text-2xl">{item.giftEmoji}</span>
          <div><p className="text-[10px] uppercase tracking-wide v-fg-muted">Cadeau de {item.senderName}</p><p className="text-sm font-semibold">{item.giftName}</p></div>
          <span className="text-[9px] v-fg-muted ml-2">{time}</span>
        </div>
      ) : (
        <motion.button
          onClick={onOpen}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
          className="relative max-w-[78%] rounded-2xl bg-gradient-to-br from-vibe-purple to-vibe-pink dark:from-vibe-purple/40 dark:to-vibe-pink/30 ring-1 ring-vibe-purple/30 rounded-bl-md px-4 py-3 flex items-center gap-3 overflow-hidden"
        >
          <span className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="relative text-3xl">🎁</motion.div>
          <div className="relative text-left">
            <p className="text-[10px] uppercase tracking-wide text-white/70">{item.senderName} t'offre</p>
            <p className="text-sm font-bold text-white">Un cadeau surprise</p>
            <p className="text-[10px] text-white/70 mt-0.5">👆 Tape pour ouvrir</p>
          </div>
          <span className="relative text-[9px] text-white/70 ml-2">{time}</span>
        </motion.button>
      )}
    </motion.div>
  );
}

// ===== WHATSAPP-STYLE STATUS CHECKMARKS =====
function StatusCheckmarks({ status, listened, isVoice }: { status: string; listened: boolean; isVoice: boolean }) {
  // Envoi en cours : petite horloge pulsée (bulle optimiste)
  if (status === "sending") {
    return <Clock className="h-3 w-3 text-white/70 animate-pulse" />;
  }
  // For voice notes: blue ✓✓ when listened, gray ✓✓ when delivered, gray ✓ when sent
  // For text: blue ✓✓ when read, gray ✓✓ when delivered, gray ✓ when sent
  const isRead = status === "read" || (isVoice && listened);

  if (status === "sent") {
    return <Check className="h-3 w-3 text-white/70" />;
  }
  return (
    <CheckCheck
      className={`h-3 w-3 ${isRead ? "text-sky-400" : "text-white/70"}`}
      style={isRead ? { filter: "drop-shadow(0 0 1px oklch(0.7 0.15 230))" } : undefined}
    />
  );
}

// ===== MEMOIZED GIFT OPEN MODAL WRAPPER =====
function GiftOpenModalMemo({ openingGift, onOpenChange }: { openingGift: TimelineItem; onOpenChange: (o: boolean) => void }) {
  const gift = useMemo(() => {
    if (openingGift.kind !== "gift") return null;
    return {
      id: openingGift.id, giftEmoji: openingGift.giftEmoji, giftName: openingGift.giftName,
      gemCost: openingGift.gemCost, eurValueCents: openingGift.eurValueCents,
      messageText: openingGift.messageText, fromName: openingGift.senderName, opened: openingGift.opened,
    };
  }, [
    openingGift.id, openingGift.kind, openingGift.kind === "gift" ? openingGift.giftEmoji : "",
    openingGift.kind === "gift" ? openingGift.giftName : "", openingGift.kind === "gift" ? openingGift.gemCost : 0,
    openingGift.kind === "gift" ? openingGift.eurValueCents : 0, openingGift.kind === "gift" ? openingGift.messageText : null,
    openingGift.kind === "gift" ? openingGift.senderName : "", openingGift.kind === "gift" ? openingGift.opened : false,
  ]);
  if (!gift) return null;
  return <GiftOpenModal open={true} onOpenChange={onOpenChange} gift={gift} />;
}
