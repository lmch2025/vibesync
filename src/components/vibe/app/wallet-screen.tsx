"use client";
// WalletScreen — elegant, non-cluttered wallet with tabs.
// Tab 1 "Vibes": balance + packs to recharge + what Vibes buy
// Tab 2 "Gains": gift wallet (€) + withdrawal + progress to threshold
// Tab 3 "Historique": COMPLETE merged history (purchases, spends, gifts,
//        rewards, withdrawals) grouped by day with filter chips.
// The history auto-refreshes every time the tab is opened or the window
// regains focus — transactions made elsewhere (chat gifts, streaks…) always
// appear without needing a full app reload.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Banknote, Check, Clock, Gem,
  Gift, History, Loader2, Lock, RefreshCw, Wand2, TrendingUp, Wallet as WalletIcon, Zap,
} from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { useVibe } from "@/lib/vibe/store";
import { useCurrency } from "@/lib/vibe/use-currency";
import { formatIn } from "@/lib/vibe/currency";
import { GEM_PACKS, GEM_ACTIONS, WITHDRAWAL_THRESHOLD_EUR, PLATFORM_COMMISSION } from "@/lib/vibe/constants";
import { WithdrawModal } from "./withdraw-modal";
import { AnimatedNumber, SuccessBounce, TabIndicator, celebrate, sfx } from "./interactive-animations";
import { toast } from "sonner";

type Tab = "vibes" | "gains" | "history";

type Tx = {
  id: string;
  type: "vibe_purchase" | "vibe_spend" | "vibe_reward" | "gift_sent" | "gift_received" | "withdrawal";
  label: string;
  delta: number;
  amountEurCents: number | null;
  emoji: string;
  createdAt: string;
  status?: string;
};

type HistoryFilter = "all" | "purchase" | "gift" | "spend" | "reward" | "withdrawal";

export function WalletScreen({ onBack }: { onBack: () => void }) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const { moneyCents, currency } = useCurrency();
  const [tab, setTab] = useState<Tab>("vibes");
  const [buying, setBuying] = useState<string | null>(null);
  // Pack that just got purchased — drives the 1.2s success flash (check + halo).
  const [flashPack, setFlashPack] = useState<string | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  // Bump on every reload — drives the staggered re-entry animation of rows.
  const [reloadKey, setReloadKey] = useState(0);

  const walletEur = (me?.walletEurCents ?? 0) / 100;
  const thresholdReached = walletEur >= WITHDRAWAL_THRESHOLD_EUR;
  const progressPct = Math.min(100, (walletEur / WITHDRAWAL_THRESHOLD_EUR) * 100);

  // Filtered history according to the active chip.
  const filteredTxs = useMemo(() => {
    switch (filter) {
      case "purchase": return txs.filter((t) => t.type === "vibe_purchase");
      case "gift": return txs.filter((t) => t.type === "gift_sent" || t.type === "gift_received");
      case "spend": return txs.filter((t) => t.type === "vibe_spend");
      case "reward": return txs.filter((t) => t.type === "vibe_reward");
      case "withdrawal": return txs.filter((t) => t.type === "withdrawal");
      default: return txs;
    }
  }, [txs, filter]);

  // Group the filtered history by calendar day (Aujourd'hui / Hier / date),
  // preserving the most-recent-first order from the API.
  const groupedTxs = useMemo(() => {
    const groups: [string, Tx[]][] = [];
    const todayStr = new Date().toLocaleDateString("fr-FR");
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("fr-FR");
    for (const tx of filteredTxs) {
      const d = new Date(tx.createdAt);
      const dayKey = d.toLocaleDateString("fr-FR");
      const label = dayKey === todayStr ? "Aujourd'hui"
        : dayKey === yesterday ? "Hier"
        : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
      const last = groups[groups.length - 1];
      if (last && last[0] === label) last[1].push(tx);
      else groups.push([label, [tx]]);
    }
    return groups;
  }, [filteredTxs]);

  async function buy(packId: string) {
    setBuying(packId);
    try {
      const res = await fetch("/api/vibe/gems/purchase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      patchMe({ gems: data.gems, freeGems: data.freeGems });
      toast.success(`+${data.added} Vibes ! 💎`);
      // Immersive purchase feedback: coin sound, haptic pulse, confetti shower.
      // Fired inside the success handler — exactly once per purchase.
      celebrate({ sound: "coin", hapticPattern: [15, 40, 15], confettiCount: 120 });
      // Brief success flash on the purchased pack (check overlay + emerald halo).
      setFlashPack(packId);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlashPack(null), 1200);
      loadTxs();
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { setBuying(null); }
  }

  const loadTxs = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoadingTx(true);
    try {
      const res = await fetch("/api/vibe/wallet/transactions", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setTxs(data.transactions ?? []);
        setReloadKey((k) => k + 1);
      }
    } finally {
      setLoadingTx(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load.
  useEffect(() => { loadTxs(); }, [loadTxs]);

  // AUTO-REFRESH — the wallet screen stays mounted (hidden/block strategy),
  // so a plain mount-effect would show a stale list after gifts sent from
  // the chat or purchases made on another device. Reload whenever:
  //   • the History tab becomes active (fresh list on every visit)
  //   • the window regains focus (transactions made in another tab)
  useEffect(() => {
    if (tab === "history") loadTxs(true);
  }, [tab, loadTxs]);
  useEffect(() => {
    const onFocus = () => loadTxs(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadTxs]);

  // Clear the pending pack-flash timer on unmount.
  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
  }, []);

  return (
    <div className="absolute inset-0 v-bg-app text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pt-9 px-3 py-2 flex items-center gap-2 border-b border-white/5 v-surface-solid/60 backdrop-blur z-20">
        <button onClick={onBack} className="h-9 w-9 grid place-items-center rounded-full hover:v-surface-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="font-display font-bold text-lg flex-1 v-text-gradient">Portefeuille</span>
        <GemIcon className="h-5 w-5 mr-1" />
        <span className="font-display font-bold tabular-nums">{me?.gems ?? 0}</span>
      </div>

      {/* Tabs */}
      <div className="px-3 py-2 flex gap-1.5 v-surface-solid/40">
        {([
          { id: "vibes", label: "Vibes", icon: <Gem className="h-3.5 w-3.5" /> },
          { id: "gains", label: "Gains", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          { id: "history", label: "Historique", icon: <History className="h-3.5 w-3.5" /> },
        ] as const).map((t) => (
          <motion.button
            key={t.id}
            onClick={() => { sfx.play("pop"); setTab(t.id); }}
            whileTap={{ scale: 0.94 }}
            className={`relative isolate flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold transition-colors ${
              tab === t.id ? "text-white" : "text-white/70 hover:text-white/80 v-surface-1"
            }`}
          >
            {tab === t.id && <TabIndicator id="wallet-tab-indicator" />}
            {t.icon} {t.label}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
        <AnimatePresence mode="wait">
          {/* ===== TAB: VIBES ===== */}
          {tab === "vibes" && (
            <motion.div key="vibes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4 pt-2">
              {/* Balance card */}
              <div className="rounded-3xl p-5 vibe-gradient vibe-glow relative overflow-hidden">
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full v-surface-3 blur-2xl" />
                <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Solde Vibes</p>
                <div className="flex items-center gap-2 mt-1">
                  <GemIcon className="h-9 w-9" />
                  <AnimatedNumber value={me?.gems ?? 0} className="font-display text-4xl font-black" />
                </div>
                {/* Breakdown: purchased vs free — clear for non-digital users */}
                <div className="mt-3 flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 rounded-full v-surface-3 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    <span className="text-white/80">{Math.max(0, (me?.gems ?? 0) - (me?.freeGems ?? 0))} pour cadeaux</span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full v-surface-3 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    <span className="text-white/80">{me?.freeGems ?? 0} bonus</span>
                  </span>
                </div>
                <p className="text-white/70 text-[10px] mt-2">
                  💡 Les Vibes <span className="font-semibold text-emerald-200">vertes</span> peuvent offrir des cadeaux.
                  Les Vibes <span className="font-semibold text-amber-200">bonus</span> servent pour les actions premium.
                </p>
              </div>

              {/* Packs */}
              <div className="space-y-2.5">
                {GEM_PACKS.map((pack) => {
                  const tier = pack.tiers.find((t) => t.currency === currency) ?? pack.tiers[0];
                  const total = pack.gems + pack.bonus;
                  return (
                    <motion.button
                      key={pack.id}
                      onClick={() => buy(pack.id)}
                      disabled={buying === pack.id}
                      whileTap={{ scale: 0.98 }}
                      animate={
                        flashPack === pack.id
                          ? {
                              // Success halo — brief emerald glow around the purchased pack.
                              boxShadow: [
                                "0 0 0px rgba(52, 211, 153, 0)",
                                "0 0 34px rgba(52, 211, 153, 0.6)",
                                "0 0 0px rgba(52, 211, 153, 0)",
                              ],
                              transition: { duration: 1.2, times: [0, 0.3, 1] },
                            }
                          : { boxShadow: "0 0 0px rgba(52, 211, 153, 0)" }
                      }
                      className={`relative w-full rounded-2xl p-3.5 ring-1 flex items-center gap-3 transition disabled:opacity-60 ${
                        pack.popular ? "bg-accent/10 ring-accent/40"
                        : pack.bestValue ? "bg-fuchsia-500/10 ring-fuchsia-400/40"
                        : "v-surface-1 ring-white/10"
                      }`}
                    >
                      {(pack.popular || pack.bestValue) && (
                        <span className={`absolute -top-2 left-3 text-[9px] font-bold rounded-full px-1.5 py-0.5 ${pack.popular ? "bg-accent text-black" : "bg-fuchsia-400 text-black"}`}>
                          {pack.popular ? "🔥 POPULAIRE" : "💎 MEILLEURE VALEUR"}
                        </span>
                      )}
                      {/* Success flash — check pops in over the pack for 1.2s */}
                      {flashPack === pack.id && (
                        <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-emerald-400/15">
                          <SuccessBounce>
                            <span className="grid place-items-center h-10 w-10 rounded-full bg-emerald-400 text-zinc-950 shadow-lg">
                              <Check className="h-6 w-6" strokeWidth={3} />
                            </span>
                          </SuccessBounce>
                        </div>
                      )}
                      <div className="grid place-items-center h-11 w-11 rounded-xl v-surface-2 shrink-0">
                        {buying === pack.id
                          ? <Loader2 className="h-6 w-6 animate-spin" />
                          : <GemIcon className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-display text-xl font-black tabular-nums">{pack.gems}</span>
                          <span className="text-[11px] text-white/70">Vibes</span>
                          {pack.bonus > 0 && (
                            <span className="text-[10px] bg-emerald-400/20 text-emerald-200 rounded-full px-1.5 py-0.5">+{pack.bonus}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/70">{total} Vibes au total</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display font-bold text-sm">{formatIn(tier.amount, tier.currency)}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* What Vibes buy — compact */}
              <div className="rounded-2xl v-surface-1 ring-1 ring-white/10 p-3.5">
                <p className="text-[11px] font-semibold text-white/70 mb-2 flex items-center gap-1">
                  <Gem className="h-3.5 w-3.5 text-accent" /> Tes Vibes te donnent accès à
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/70">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-400" /> Super-Like · {GEM_ACTIONS.superlike}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-fuchsia-400" /> Boost · {GEM_ACTIONS.boost}</span>
                  <span className="flex items-center gap-1"><Gift className="h-3 w-3 text-pink-400" /> Cadeaux · {GEM_ACTIONS.superlike}+</span>
                  <span className="flex items-center gap-1"><Wand2 className="h-3 w-3 text-vibe-purple" /> Icebreaker · {GEM_ACTIONS.icebreaker}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-cyan-400" /> Rewind · {GEM_ACTIONS.rewind}</span>
                  <span className="flex items-center gap-1"><Gem className="h-3 w-3 text-orange-400" /> Passport · {GEM_ACTIONS.passport}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== TAB: GAINS ===== */}
          {tab === "gains" && (
            <motion.div key="gains" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4 pt-2">
              {/* Wallet balance card */}
              <div className="rounded-3xl p-5 bg-emerald-500/10 ring-1 ring-emerald-400/30 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
                <p className="text-emerald-300/80 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                  <WalletIcon className="h-3 w-3" /> Gains cadeaux
                </p>
                <div className="font-display text-4xl font-black mt-1 tabular-nums">{moneyCents(me?.walletEurCents ?? 0)}</div>
                <p className="text-emerald-200/60 text-[11px] mt-1">
                  Cumulé via cadeaux reçus (70% après commission {PLATFORM_COMMISSION * 100}%)
                </p>
              </div>

              {/* Progress to threshold */}
              <div className="rounded-2xl v-surface-1 ring-1 ring-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white/70 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Seuil de retrait
                  </span>
                  <span className="text-xs tabular-nums text-white/70">{moneyCents(me?.walletEurCents ?? 0)} / {moneyCents(WITHDRAWAL_THRESHOLD_EUR * 100)}</span>
                </div>
                <div className="h-2.5 rounded-full v-surface-1 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className={`h-full rounded-full ${thresholdReached ? "bg-emerald-400" : "bg-gradient-to-r from-vibe-purple to-vibe-pink"}`}
                  />
                </div>
                <p className="text-[10px] text-white/70 text-center mt-1.5">
                  {thresholdReached
                    ? "✓ Seuil atteint ! Tu peux retirer tes gains."
                    : `Plus que ${(WITHDRAWAL_THRESHOLD_EUR - walletEur).toFixed(2)}€ avant de pouvoir retirer.`}
                </p>
              </div>

              {/* Withdraw button */}
              {thresholdReached ? (
                <button
                  onClick={() => setWithdrawOpen(true)}
                  className="w-full h-13 py-3.5 rounded-2xl bg-emerald-500 text-white font-display font-bold flex items-center justify-center gap-2 active:scale-95 transition vibe-glow"
                  style={{ background: "oklch(0.72 0.19 160)" }}
                >
                  <Banknote className="h-5 w-5" /> Retirer mes gains
                </button>
              ) : (
                <div className="w-full h-13 py-3.5 rounded-2xl v-surface-1 ring-1 ring-white/10 flex items-center justify-center gap-2 text-white/70 text-sm">
                  <Lock className="h-4 w-4" /> Retrait disponible à {moneyCents(WITHDRAWAL_THRESHOLD_EUR * 100)}
                </div>
              )}

              {/* Info card */}
              <div className="rounded-2xl v-surface-1 ring-1 ring-white/5 p-3.5">
                <p className="text-[11px] text-white/70 leading-relaxed">
                  💡 Les cadeaux reçus des autres membres sont convertis en euros sur ton portefeuille.
                  Une fois le seuil de {moneyCents(WITHDRAWAL_THRESHOLD_EUR * 100)} atteint, tu peux retirer
                  via virement bancaire (Stripe Connect) ou Mobile Money.
                </p>
                <div className="mt-2.5 rounded-xl bg-amber-400/10 ring-1 ring-amber-300/20 px-3 py-2">
                  <p className="text-[10px] text-amber-100/80 leading-relaxed">
                    ⚠️ <span className="font-semibold">Important :</span> Seules les Vibes <span className="font-semibold text-emerald-300">achetées</span> peuvent être utilisées pour envoyer des cadeaux.
                    Les Vibes <span className="font-semibold text-amber-300">bonus</span> (série quotidienne, bienvenue, parrainage) servent uniquement pour les actions premium (super-like, boost, etc.).
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== TAB: HISTORY ===== */}
          {tab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="pt-2">
              {/* Filter chips + manual refresh */}
              <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-0.5">
                {([
                  { id: "all", label: "Tout", count: txs.length },
                  { id: "purchase", label: "💎 Achats", count: txs.filter((t) => t.type === "vibe_purchase").length },
                  { id: "gift", label: "🎁 Cadeaux", count: txs.filter((t) => t.type === "gift_sent" || t.type === "gift_received").length },
                  { id: "spend", label: "⚡ Actions", count: txs.filter((t) => t.type === "vibe_spend").length },
                  { id: "reward", label: "🔥 Bonus", count: txs.filter((t) => t.type === "vibe_reward").length },
                  { id: "withdrawal", label: "💸 Retraits", count: txs.filter((t) => t.type === "withdrawal").length },
                ] as { id: HistoryFilter; label: string; count: number }[]).map((f) => (
                  <motion.button
                    key={f.id}
                    onClick={() => { sfx.play("pop"); setFilter(f.id); }}
                    whileTap={{ scale: 0.92 }}
                    className={`shrink-0 flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold ring-1 transition ${
                      filter === f.id
                        ? "vibe-gradient text-white ring-white/20"
                        : "v-surface-1 text-white/70 ring-white/10 hover:text-white/80"
                    }`}
                  >
                    {f.label}
                    {f.count > 0 && <span className="text-[9px] opacity-60 tabular-nums">{f.count}</span>}
                  </motion.button>
                ))}
                <motion.button
                  onClick={() => loadTxs(true)}
                  whileTap={{ scale: 0.85, rotate: 90 }}
                  aria-label="Rafraîchir l'historique"
                  className="shrink-0 ml-auto h-7 w-7 grid place-items-center rounded-full v-surface-1 ring-1 ring-white/10 text-white/70 hover:text-white/80"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </motion.button>
              </div>

              {/* Subtle live-refresh indicator */}
              <AnimatePresence>
                {refreshing && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[10px] text-white/70 text-center overflow-hidden"
                  >
                    Actualisation…
                  </motion.p>
                )}
              </AnimatePresence>

              {loadingTx ? (
                <div className="grid place-items-center py-12">
                  <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-vibe-purple animate-spin" />
                </div>
              ) : filteredTxs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-8 w-8 mx-auto mb-2 text-white/70" />
                  <p className="text-sm text-white/70">
                    {filter === "all" ? "Aucune transaction pour l'instant" : "Aucune transaction de ce type"}
                  </p>
                </div>
              ) : (
                groupedTxs.map(([day, dayTxs]) => (
                  <div key={day} className="mb-2">
                    {/* Sticky day header */}
                    <p className="sticky top-0 z-10 v-bg-app/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wide text-white/70 px-2 py-1.5">
                      {day}
                    </p>
                    <div className="space-y-0.5">
                      {dayTxs.map((tx, i) => (
                        <TxRow key={tx.id} tx={tx} index={i} reloadKey={reloadKey} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Withdraw modal */}
      <WithdrawModal
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        walletEurCents={me?.walletEurCents ?? 0}
        thresholdEur={WITHDRAWAL_THRESHOLD_EUR}
        onSuccess={(newCents) => { patchMe({ walletEurCents: newCents }); loadTxs(); }}
      />
    </div>
  );
}

// ===== TRANSACTION ROW =====
function TxRow({ tx, index = 0, reloadKey = 0 }: { tx: Tx; index?: number; reloadKey?: number }) {
  const { moneyCents } = useCurrency();
  const time = new Date(tx.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const isIncoming = tx.delta > 0 || tx.type === "gift_received";
  const statusColors: Record<string, string> = {
    pending: "text-amber-400",
    processing: "text-cyan-400",
    completed: "text-emerald-400",
    rejected: "text-red-400",
  };
  const statusLabels: Record<string, string> = {
    pending: "En attente",
    processing: "En cours",
    completed: "Terminé",
    rejected: "Refusé",
  };

  // Type-aware visual identity — each operation family gets its own colour.
  const iconStyles: Record<Tx["type"], string> = {
    vibe_purchase: "bg-vibe-purple/15 ring-1 ring-vibe-purple/30",
    vibe_spend: "v-surface-1 ring-1 ring-white/10",
    vibe_reward: "bg-amber-400/10 ring-1 ring-amber-300/25",
    gift_sent: "bg-pink-500/10 ring-1 ring-pink-400/25",
    gift_received: "bg-emerald-500/15 ring-1 ring-emerald-400/25",
    withdrawal: "bg-cyan-500/10 ring-1 ring-cyan-400/25",
  };

  return (
    <motion.div
      key={`${reloadKey}-${tx.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.6), duration: 0.25 }}
      className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:v-surface-1 transition"
    >
      {/* Icon — the operation's own emoji in a type-coloured bubble */}
      <div className={`grid place-items-center h-9 w-9 rounded-full shrink-0 text-base ${iconStyles[tx.type]}`}>
        <span aria-hidden>{tx.emoji}</span>
      </div>

      {/* Label + time */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.label}</p>
        <p className="text-[10px] text-white/70">{time}{tx.status && <span className={`ml-1.5 ${statusColors[tx.status]}`}>· {statusLabels[tx.status]}</span>}</p>
      </div>

      {/* Amounts — Vibes delta + € semantics per type */}
      <div className="text-right shrink-0">
        {tx.delta !== 0 && (
          <p className={`text-sm font-bold tabular-nums ${isIncoming ? "text-emerald-400" : "text-white/70"}`}>
            {isIncoming ? "+" : ""}{tx.delta} <span className="text-[10px]">💎</span>
          </p>
        )}
        {tx.type === "vibe_purchase" && tx.amountEurCents ? (
          // A purchase: the € line is what was PAID (neutral, not a gain).
          <p className="text-[11px] tabular-nums text-white/70">{moneyCents(tx.amountEurCents)} payés</p>
        ) : tx.type === "gift_received" && tx.amountEurCents ? (
          // A received gift: real money credited to the wallet.
          <p className="text-[11px] tabular-nums text-emerald-400/80">+{moneyCents(tx.amountEurCents)} crédités</p>
        ) : tx.type === "withdrawal" && tx.amountEurCents ? (
          <p className="text-[11px] tabular-nums text-cyan-300/80">−{moneyCents(Math.abs(tx.amountEurCents))}</p>
        ) : null}
      </div>
    </motion.div>
  );
}
