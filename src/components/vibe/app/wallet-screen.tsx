"use client";
// WalletScreen — elegant, non-cluttered wallet with tabs.
// Tab 1 "Vibes": balance + packs to recharge + what Vibes buy
// Tab 2 "Gains": gift wallet (€) + withdrawal + progress to threshold
// Tab 3 "Historique": merged transaction history (purchases, spends, gifts, withdrawals)
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, Banknote, Check, Clock, Gem,
  Gift, History, Lock, Wand2, TrendingUp, Wallet as WalletIcon, Zap,
} from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { useVibe } from "@/lib/vibe/store";
import { useCurrency } from "@/lib/vibe/use-currency";
import { formatIn } from "@/lib/vibe/currency";
import { GEM_PACKS, GEM_ACTIONS, WITHDRAWAL_THRESHOLD_EUR, PLATFORM_COMMISSION } from "@/lib/vibe/constants";
import { WithdrawModal } from "./withdraw-modal";
import { toast } from "sonner";

type Tab = "vibes" | "gains" | "history";

type Tx = {
  id: string;
  type: "vibe_purchase" | "vibe_spend" | "gift_sent" | "gift_received" | "withdrawal";
  label: string;
  delta: number;
  amountEurCents: number | null;
  emoji: string;
  createdAt: string;
  status?: string;
};

export function WalletScreen({ onBack }: { onBack: () => void }) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const { moneyCents, currency } = useCurrency();
  const [tab, setTab] = useState<Tab>("vibes");
  const [buying, setBuying] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  const walletEur = (me?.walletEurCents ?? 0) / 100;
  const thresholdReached = walletEur >= WITHDRAWAL_THRESHOLD_EUR;
  const progressPct = Math.min(100, (walletEur / WITHDRAWAL_THRESHOLD_EUR) * 100);

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
      loadTxs();
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { setBuying(null); }
  }

  async function loadTxs() {
    setLoadingTx(true);
    try {
      const res = await fetch("/api/vibe/wallet/transactions", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setTxs(data.transactions ?? []);
    } finally { setLoadingTx(false); }
  }

  useEffect(() => { loadTxs(); }, []);

  return (
    <div className="absolute inset-0 bg-zinc-950 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pt-9 px-3 py-2 flex items-center gap-2 border-b border-white/5 bg-zinc-900/60 backdrop-blur z-20">
        <button onClick={onBack} className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="font-display font-bold text-lg flex-1">Portefeuille</span>
        <GemIcon className="h-5 w-5 mr-1" />
        <span className="font-display font-bold tabular-nums">{me?.gems ?? 0}</span>
      </div>

      {/* Tabs */}
      <div className="px-3 py-2 flex gap-1.5 bg-zinc-900/40">
        {([
          { id: "vibes", label: "Vibes", icon: <Gem className="h-3.5 w-3.5" /> },
          { id: "gains", label: "Gains", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          { id: "history", label: "Historique", icon: <History className="h-3.5 w-3.5" /> },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold transition ${
              tab === t.id ? "vibe-gradient text-white" : "text-white/50 hover:text-white/80 bg-white/5"
            }`}
          >
            {t.icon} {t.label}
          </button>
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
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
                <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Solde Vibes</p>
                <div className="flex items-center gap-2 mt-1">
                  <GemIcon className="h-9 w-9" />
                  <span className="font-display text-4xl font-black tabular-nums">{me?.gems ?? 0}</span>
                </div>
                {/* Breakdown: purchased vs free — clear for non-digital users */}
                <div className="mt-3 flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    <span className="text-white/80">{Math.max(0, (me?.gems ?? 0) - (me?.freeGems ?? 0))} pour cadeaux</span>
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    <span className="text-white/80">{me?.freeGems ?? 0} bonus</span>
                  </span>
                </div>
                <p className="text-white/60 text-[10px] mt-2">
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
                      className={`relative w-full rounded-2xl p-3.5 ring-1 flex items-center gap-3 transition disabled:opacity-60 ${
                        pack.popular ? "bg-accent/10 ring-accent/40"
                        : pack.bestValue ? "bg-fuchsia-500/10 ring-fuchsia-400/40"
                        : "bg-white/5 ring-white/10"
                      }`}
                    >
                      {(pack.popular || pack.bestValue) && (
                        <span className={`absolute -top-2 left-3 text-[9px] font-bold rounded-full px-1.5 py-0.5 ${pack.popular ? "bg-accent text-black" : "bg-fuchsia-400 text-black"}`}>
                          {pack.popular ? "🔥 POPULAIRE" : "💎 MEILLEURE VALEUR"}
                        </span>
                      )}
                      <div className="grid place-items-center h-11 w-11 rounded-xl bg-white/10 shrink-0">
                        <GemIcon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-display text-xl font-black tabular-nums">{pack.gems}</span>
                          <span className="text-[11px] text-white/60">Vibes</span>
                          {pack.bonus > 0 && (
                            <span className="text-[10px] bg-emerald-400/20 text-emerald-200 rounded-full px-1.5 py-0.5">+{pack.bonus}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40">{total} Vibes au total</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display font-bold text-sm">{formatIn(tier.amount, tier.currency)}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* What Vibes buy — compact */}
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3.5">
                <p className="text-[11px] font-semibold text-white/60 mb-2 flex items-center gap-1">
                  <Gem className="h-3.5 w-3.5 text-accent" /> Tes Vibes te donnent accès à
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/60">
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
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-white/60 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Seuil de retrait
                  </span>
                  <span className="text-xs tabular-nums text-white/50">{moneyCents(me?.walletEurCents ?? 0)} / {moneyCents(WITHDRAWAL_THRESHOLD_EUR * 100)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className={`h-full rounded-full ${thresholdReached ? "bg-emerald-400" : "bg-gradient-to-r from-vibe-purple to-vibe-pink"}`}
                  />
                </div>
                <p className="text-[10px] text-white/40 text-center mt-1.5">
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
                <div className="w-full h-13 py-3.5 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center gap-2 text-white/40 text-sm">
                  <Lock className="h-4 w-4" /> Retrait disponible à {moneyCents(WITHDRAWAL_THRESHOLD_EUR * 100)}
                </div>
              )}

              {/* Info card */}
              <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/5 p-3.5">
                <p className="text-[11px] text-white/50 leading-relaxed">
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
              {loadingTx ? (
                <div className="grid place-items-center py-12">
                  <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-vibe-purple animate-spin" />
                </div>
              ) : txs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-8 w-8 mx-auto mb-2 text-white/20" />
                  <p className="text-sm text-white/40">Aucune transaction pour l'instant</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {txs.map((tx) => (
                    <TxRow key={tx.id} tx={tx} />
                  ))}
                </div>
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
function TxRow({ tx }: { tx: Tx }) {
  const { moneyCents } = useCurrency();
  const time = new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

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

  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-white/[0.03] transition">
      {/* Icon */}
      <div className={`grid place-items-center h-9 w-9 rounded-full shrink-0 ${isIncoming ? "bg-emerald-500/15" : "bg-white/5"}`}>
        {tx.type === "withdrawal" ? (
          <ArrowUpRight className="h-4 w-4 text-amber-400" />
        ) : isIncoming ? (
          <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-white/40" />
        )}
      </div>

      {/* Label + time */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.label}</p>
        <p className="text-[10px] text-white/40">{time}{tx.status && <span className={`ml-1.5 ${statusColors[tx.status]}`}>· {statusLabels[tx.status]}</span>}</p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        {tx.delta !== 0 && (
          <p className={`text-sm font-bold tabular-nums ${isIncoming ? "text-emerald-400" : "text-white/60"}`}>
            {isIncoming ? "+" : ""}{tx.delta} <span className="text-[10px]">💎</span>
          </p>
        )}
        {tx.amountEurCents !== null && tx.amountEurCents !== 0 && (
          <p className={`text-[11px] tabular-nums ${tx.amountEurCents > 0 ? "text-emerald-400/70" : "text-white/40"}`}>
            {tx.amountEurCents > 0 ? "+" : ""}{moneyCents(Math.abs(tx.amountEurCents))}
          </p>
        )}
      </div>
    </div>
  );
}
