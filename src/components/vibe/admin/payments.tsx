"use client";

// Section admin « Paiements » — agrégateur My-CoolPay.
// Configure le compte marchand (clés, mode, devise), affiche l'intégration
// (callback, URLs de redirection, solde), les statistiques et les transactions
// (achats de Vibes + retraits Mobile Money). Interface 100 % française.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Euro,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  ShoppingBag,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GemIcon } from "@/components/vibe/gem-badge";
import { SuccessBounce } from "@/components/vibe/app/interactive-animations";
import { cn } from "@/lib/utils";

// ───────────────────────────────────────────────────────────────────────────
// Types (miroir du contrat /api/vibe/admin/payments*)
// ───────────────────────────────────────────────────────────────────────────

type PayMode = "off" | "sandbox" | "live";
type PayCurrency = "XAF" | "EUR";

type PayConfig = {
  mode: PayMode | string;
  publicKey: string;
  privateKeyMasked: string | null;
  hasPrivateKey: boolean;
  payCurrency: PayCurrency | string;
  ipCheck: boolean | string;
  autoPayout: boolean | string;
  callbackSecret: string;
  callbackUrl: string;
};

type PayStats = {
  count: number;
  successCount: number;
  volumeXaf: number;
  volumeEurCents: number;
  pendingCount: number;
  withdrawalsPending: number;
  withdrawalsProcessing: number;
};

type PaymentsData = {
  config: PayConfig;
  balance: { ok: boolean; balance?: number; error?: string } | null;
  stats: PayStats;
};

type AdminPaymentTx = {
  id: string;
  appRef: string;
  providerRef: string | null;
  status: string; // success | pending | canceled | failed
  amount: number;
  currency: string; // XAF | EUR
  operator: string | null; // CM_OM | CM_MOMO | CARD | MCP
  fees: number | null;
  gems: number;
  packId: string | null;
  packTitle: string | null;
  credited: boolean;
  createdAt: string;
  paymentUrl: string | null;
  user: { phone: string; displayName: string | null } | null;
};

type AdminWithdrawal = {
  id: string;
  amountCents: number;
  status: string; // pending | processing | completed | rejected | failed
  method: string; // mobile_money | stripe
  operator: string | null;
  provider: string | null; // mycoolpay | manual | stripe
  providerRef: string | null;
  accountInfo: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
  user: { phone: string; displayName: string | null } | null;
};

type ActionResponse = {
  ok: boolean;
  payment?: AdminPaymentTx;
  withdrawal?: AdminWithdrawal;
};

// ───────────────────────────────────────────────────────────────────────────
// Constantes & helpers
// ───────────────────────────────────────────────────────────────────────────

const OPERATORS: Record<string, string> = {
  CM_OM: "Orange Money",
  CM_MOMO: "MTN MoMo",
  CARD: "Carte",
  MCP: "My-CoolPay",
};

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  success: {
    label: "Succès",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
  },
  pending: {
    label: "En cours",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
  },
  canceled: {
    label: "Annulé",
    className: "bg-muted text-muted-foreground border-transparent",
  },
  failed: {
    label: "Échoué",
    className:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-transparent",
  },
};

const WITHDRAWAL_STATUS: Record<string, { label: string; className: string }> = {
  pending: {
    label: "En attente",
    className:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
  },
  processing: {
    label: "En cours",
    className: "bg-primary/10 text-primary border-transparent",
  },
  completed: {
    label: "Terminé",
    className:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
  },
  rejected: {
    label: "Refusé",
    className:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-transparent",
  },
  failed: {
    label: "Échoué",
    className:
      "bg-red-500/10 text-red-600 dark:text-red-400 border-transparent",
  },
};

const API_BASE = "/api/vibe/admin/payments";

/// Robust fetch wrapper — messages d'erreur propres (403 / 404 / JSON error).
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 403) {
    throw new Error("Accès refusé — connectez-vous en admin");
  }
  if (res.status === 404) {
    throw new Error(
      "Route introuvable — l'API admin Paiements n'est pas encore déployée"
    );
  }
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = String(body.error);
    } catch {
      /* réponse non JSON */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

function putPayments(body: Record<string, unknown>): Promise<PaymentsData> {
  return apiFetch<PaymentsData>(API_BASE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/// Normalise un booléen reçu du serveur (true/false ou "on"/"off").
function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "on" || value === "true" || value === "1";
  }
  if (typeof value === "number") return value === 1;
  return fallback;
}

const xafFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XAF",
  maximumFractionDigits: 0,
});
const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

function formatXaf(n: number): string {
  return xafFormatter.format(n);
}

function formatEur(n: number): string {
  return eurFormatter.format(n);
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "EUR") return formatEur(amount);
  if (currency === "XAF") return formatXaf(amount);
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback pour les contextes non sécurisés.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function userLabel(u: { phone: string; displayName: string | null } | null): string {
  return u?.displayName || u?.phone || "—";
}

// ───────────────────────────────────────────────────────────────────────────
// Sous-composants
// ───────────────────────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: string }) {
  if (mode === "live") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent">
        Live
      </Badge>
    );
  }
  if (mode === "off") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Désactivé
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent">
      Sandbox
    </Badge>
  );
}

function StatusBadge({ map, status }: { map: typeof PAYMENT_STATUS; status: string }) {
  const s = map[status] ?? {
    label: status || "—",
    className: "bg-muted text-muted-foreground border-transparent",
  };
  return <Badge className={s.className}>{s.label}</Badge>;
}

/// Ligne de réglage — même pattern que settings.tsx (icône + titre à gauche,
/// contrôle à droite sur desktop, empilé sur mobile).
function FieldRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 lg:gap-6 px-5 py-5">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <div className="lg:w-80 lg:self-center">{children}</div>
    </div>
  );
}

/// Mini carte statistique — même style que analytics.tsx (MiniKpi).
function MiniStat({
  label,
  value,
  sub,
  icon,
  accent,
  loading,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: "purple" | "pink" | "orange";
  loading?: boolean;
  delay?: number;
}) {
  const accents = {
    purple: "bg-primary/10 text-primary",
    pink: "bg-[oklch(0.65_0.24_350/0.12)] text-[oklch(0.55_0.24_350)]",
    orange: "bg-accent/15 text-accent",
  } as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl bg-card ring-1 ring-border shadow-sm p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
          {label}
        </span>
        <span className={cn("grid place-items-center h-7 w-7 rounded-lg", accents[accent])}>
          {icon}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight">
          {value}
        </p>
      )}
      {sub && !loading && (
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      )}
    </motion.div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm ring-1 ring-destructive/20 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0">{message}</span>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg gap-1.5 h-7 shrink-0"
          onClick={onRetry}
        >
          <RefreshCw className="h-3 w-3" /> Réessayer
        </Button>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Section principale
// ───────────────────────────────────────────────────────────────────────────

type TxState = {
  payments: AdminPaymentTx[] | null;
  withdrawals: AdminWithdrawal[] | null;
  loading: boolean;
  error: string | null;
};

export function Payments() {
  // ── Vue d'ensemble (config + solde + stats) ──
  const [overview, setOverview] = useState<{
    data: PaymentsData | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  // ── Formulaire de configuration ──
  const [mode, setMode] = useState<PayMode>("sandbox");
  const [publicKey, setPublicKey] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [hasPrivateKey, setHasPrivateKey] = useState(false);
  const [payCurrency, setPayCurrency] = useState<PayCurrency>("XAF");
  const [ipCheck, setIpCheck] = useState(false);
  const [autoPayout, setAutoPayout] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearingKey, setClearingKey] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Intégration (copie + régénération du secret) ──
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmSecret, setConfirmSecret] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // ── Transactions ──
  const [tx, setTx] = useState<TxState>({
    payments: null,
    withdrawals: null,
    loading: true,
    error: null,
  });
  const [actingId, setActingId] = useState<string | null>(null);

  // Nettoyage des timers au démontage.
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  /// Synchronise le formulaire depuis la config serveur (après chargement,
  /// enregistrement, effacement de clé ou régénération du secret).
  const syncFormFromConfig = useCallback((c: PayConfig | undefined | null) => {
    if (!c) return;
    setMode(c.mode === "live" ? "live" : c.mode === "off" ? "off" : "sandbox");
    setPublicKey(c.publicKey ?? "");
    setPrivateKeyInput("");
    setHasPrivateKey(Boolean(c.hasPrivateKey));
    setPayCurrency(c.payCurrency === "EUR" ? "EUR" : "XAF");
    setIpCheck(asBool(c.ipCheck, false));
    setAutoPayout(asBool(c.autoPayout, true));
  }, []);

  /// Charge la config + solde + stats. `syncForm` à false pour les refresh
  /// silencieux (on ne veut pas écraser un formulaire en cours d'édition).
  const loadOverview = useCallback(async (showLoading: boolean, syncForm: boolean) => {
    if (showLoading) {
      setOverview((o) => ({ ...o, loading: true, error: null }));
    }
    try {
      const d = await apiFetch<PaymentsData>(API_BASE);
      setOverview({ data: d, loading: false, error: null });
      if (syncForm) syncFormFromConfig(d.config);
    } catch (e) {
      if (showLoading) {
        setOverview({ data: null, loading: false, error: (e as Error).message });
      }
    }
  }, [syncFormFromConfig]);

  // Chargement initial : config + les deux listes de transactions en parallèle.
  useEffect(() => {
    const controller = new AbortController();
    const signal = { signal: controller.signal };

    void loadOverview(true, true);

    setTx((t) => ({ ...t, loading: true, error: null }));
    Promise.all([
      apiFetch<{ payments?: AdminPaymentTx[] }>(
        `${API_BASE}/transactions?tab=payments&limit=50`,
        signal
      ),
      apiFetch<{ withdrawals?: AdminWithdrawal[] }>(
        `${API_BASE}/transactions?tab=withdrawals&limit=50`,
        signal
      ),
    ])
      .then(([p, w]) => {
        setTx({
          payments: p.payments ?? [],
          withdrawals: w.withdrawals ?? [],
          loading: false,
          error: null,
        });
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setTx({ payments: [], withdrawals: [], loading: false, error: e.message });
      });

    return () => controller.abort();
    // reloadKey relance tout (bouton Réessayer) ; loadOverview est stable.
  }, [reloadKey, loadOverview]);

  const retry = () => setReloadKey((k) => k + 1);

  // ── Enregistrement de la configuration ──
  const flashSaved = () => {
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
  };

  const applySaved = (d: PaymentsData) => {
    setOverview({ data: d, loading: false, error: null });
    syncFormFromConfig(d.config);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        mode,
        payCurrency,
        ipCheck,
        autoPayout,
      };
      // Clé publique : envoyée uniquement si renseignée (vide = inchangée).
      if (publicKey.trim()) body.publicKey = publicKey.trim();
      // Clé privée : vide = conserver l'actuelle ; "__CLEAR__" passe par Effacer.
      if (privateKeyInput.trim()) body.privateKey = privateKeyInput.trim();

      const d = await putPayments(body);
      applySaved(d);
      toast.success("Paramètres de paiement enregistrés", {
        description:
          mode === "live"
            ? "Mode production — les paiements sont réels."
            : `Mode ${mode === "off" ? "désactivé (démo)" : "sandbox (test)"}`,
      });
      flashSaved();
    } catch (err) {
      toast.error((err as Error).message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const onClearPrivateKey = async () => {
    setClearingKey(true);
    try {
      const d = await putPayments({ privateKey: "__CLEAR__" });
      applySaved(d);
      toast.success("Clé privée supprimée");
    } catch (err) {
      toast.error((err as Error).message || "Erreur lors de la suppression");
    } finally {
      setClearingKey(false);
    }
  };

  // ── Copie du callback + régénération du secret (double-clic de confirmation) ──
  const callbackUrl = overview.data?.config?.callbackUrl ?? "";
  const origin = useMemo(() => {
    if (callbackUrl) {
      try {
        return new URL(callbackUrl).origin;
      } catch {
        /* URL invalide → fallback */
      }
    }
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, [callbackUrl]);

  const onCopy = async () => {
    if (!callbackUrl) return;
    const ok = await copyToClipboard(callbackUrl);
    if (ok) {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error("Copie impossible dans ce navigateur");
    }
  };

  const onRegenerate = async () => {
    if (!confirmSecret) {
      setConfirmSecret(true);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmSecret(false), 4000);
      return;
    }
    setConfirmSecret(false);
    setRegenerating(true);
    try {
      const d = await putPayments({ regenerateSecret: true });
      applySaved(d);
      toast.success("Secret callback régénéré", {
        description: "Mettez à jour l'URL de callback dans le dashboard My-CoolPay.",
      });
    } catch (err) {
      toast.error((err as Error).message || "Erreur lors de la régénération");
    } finally {
      setRegenerating(false);
    }
  };

  // ── Actions sur les transactions ──
  const doAction = async (
    action: "sync_payment" | "sync_withdrawal" | "complete_withdrawal" | "reject_withdrawal",
    id: string,
    reason?: string
  ) => {
    setActingId(id);
    try {
      const res = await apiFetch<ActionResponse>(`${API_BASE}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reason !== undefined ? { action, id, reason } : { action, id }),
      });
      // Mise à jour de la ligne depuis la réponse, sans rechargement complet.
      if (res.payment) {
        setTx((t) => ({
          ...t,
          payments: (t.payments ?? []).map((p) => (p.id === id ? res.payment! : p)),
        }));
      }
      if (res.withdrawal) {
        setTx((t) => ({
          ...t,
          withdrawals: (t.withdrawals ?? []).map((w) =>
            w.id === id ? res.withdrawal! : w
          ),
        }));
      }
      const messages: Record<string, string> = {
        sync_payment: "Paiement synchronisé",
        sync_withdrawal: "Retrait synchronisé",
        complete_withdrawal: "Retrait marqué terminé",
        reject_withdrawal: "Retrait refusé",
      };
      toast.success(messages[action] ?? "Action effectuée");
      // Refresh silencieux des stats/solde (sans toucher au formulaire).
      void loadOverview(false, false);
    } catch (err) {
      toast.error((err as Error).message || "Erreur lors de l'action");
    } finally {
      setActingId(null);
    }
  };

  const onRejectWithdrawal = (w: AdminWithdrawal) => {
    const reason = window.prompt(
      `Motif du refus pour ${userLabel(w.user)} (optionnel) :`
    );
    if (reason === null) return; // Annulé
    void doAction("reject_withdrawal", w.id, reason);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────────

  const stats = overview.data?.stats;
  const balance = overview.data?.balance;
  const savedMode = overview.data?.config?.mode ?? mode;

  // Squelette global pendant le premier chargement.
  if (overview.loading && !overview.data) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-80" />
        </div>
        <div className="rounded-2xl bg-card ring-1 ring-border divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-5">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-9 w-64 rounded-xl" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  // État d'erreur bloquant (route absente, accès refusé, etc.).
  if (overview.error && !overview.data) {
    return (
      <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm p-8 flex flex-col items-center text-center gap-3">
        <span className="grid place-items-center h-12 w-12 rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold text-sm">
            Impossible de charger la configuration des paiements
          </p>
          <p className="text-xs text-muted-foreground mt-1">{overview.error}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={retry}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Réessayer
        </Button>
      </div>
    );
  }

  const paymentsList = tx.payments ?? [];
  const withdrawalsList = tx.withdrawals ?? [];

  return (
    <div className="space-y-5">
      {/* ── a) En-tête ── */}
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="font-display font-bold text-xl tracking-tight">
            Paiements My-CoolPay
          </h2>
          <ModeBadge mode={savedMode} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Agrégateur : Orange Money · MTN MoMo · VISA/Mastercard
        </p>
      </div>

      {/* ── b) Réglages du compte marchand ── */}
      <form
        onSubmit={onSave}
        className="rounded-2xl bg-card ring-1 ring-border shadow-sm divide-y divide-border"
      >
        <div className="p-5">
          <h3 className="font-display font-semibold text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Réglages du compte
            marchand
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Clés API et mode de fonctionnement de l'agrégateur My-CoolPay pour
            les achats de Vibes et les retraits Mobile Money.
          </p>
        </div>

        {/* Mode */}
        <FieldRow
          icon={<CreditCard className="h-4 w-4" />}
          title="Mode de fonctionnement"
          description="Désactivé : achat simulé (démo) · Sandbox : checkout de test My-CoolPay · Live : paiements réels."
        >
          <div>
            <Select value={mode} onValueChange={(v) => setMode(v as PayMode)}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Désactivé (démo)</SelectItem>
                <SelectItem value="sandbox">Sandbox (test)</SelectItem>
                <SelectItem value="live">Live (production)</SelectItem>
              </SelectContent>
            </Select>
            {mode === "live" && (
              <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 translate-y-px" />
                Mode production — les paiements sont réels.
              </p>
            )}
          </div>
        </FieldRow>

        {/* Clé publique */}
        <FieldRow
          icon={<BadgeCheck className="h-4 w-4" />}
          title="Clé publique"
          description="Identifiant marchand transmis dans les URLs de l'API My-CoolPay (espace marchand → API)."
        >
          <Input
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="ex. 118a4852-7df8-46d9-…"
            autoComplete="off"
            className="rounded-xl font-mono text-xs"
          />
        </FieldRow>

        {/* Clé privée */}
        <FieldRow
          icon={<Wallet className="h-4 w-4" />}
          title="Clé privée"
          description={
            hasPrivateKey
              ? "Utilisée pour les payouts et la vérification de signature des callbacks (X-PRIVATE-KEY)."
              : "Requise pour les payouts automatiques et la vérification des callbacks."
          }
        >
          <div className="space-y-2">
            <Input
              type="password"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
              placeholder={
                hasPrivateKey ? "•••••••• (configurée)" : "Clé privée My-CoolPay"
              }
              autoComplete="new-password"
              className="rounded-xl font-mono text-xs"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground leading-snug">
                {hasPrivateKey
                  ? "Laisser vide pour conserver la clé actuelle."
                  : "Stockée côté serveur, jamais retournée en clair."}
              </p>
              {hasPrivateKey && (
                <motion.button
                  type="button"
                  whileTap={clearingKey ? undefined : { scale: 0.95 }}
                  disabled={clearingKey || saving}
                  onClick={onClearPrivateKey}
                  className={cn(
                    buttonVariants({
                      variant: "ghost",
                      size: "sm",
                      className:
                        "h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/5",
                    })
                  )}
                >
                  {clearingKey ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Effacer
                </motion.button>
              )}
            </div>
          </div>
        </FieldRow>

        {/* Devise de facturation */}
        <FieldRow
          icon={<Euro className="h-4 w-4" />}
          title="Devise de facturation"
          description="Devise envoyée à My-CoolPay pour les transactions d'achat de Vibes."
        >
          <Select
            value={payCurrency}
            onValueChange={(v) => setPayCurrency(v as PayCurrency)}
          >
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="Devise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="XAF">XAF (FCFA)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        {/* Vérification IP */}
        <FieldRow
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Vérification IP du callback"
          description="Vérifie que le callback provient de 15.236.140.89."
        >
          <div className="flex items-center justify-between lg:justify-end gap-3">
            <span className="text-xs text-muted-foreground lg:hidden">
              {ipCheck ? "Activée" : "Désactivée"}
            </span>
            <Switch checked={ipCheck} onCheckedChange={setIpCheck} />
          </div>
        </FieldRow>

        {/* Payouts automatiques */}
        <FieldRow
          icon={<ArrowDownToLine className="h-4 w-4" />}
          title="Payouts automatiques Mobile Money"
          description="Retraits envoyés automatiquement via l'API (sinon manuels)."
        >
          <div className="flex items-center justify-between lg:justify-end gap-3">
            <span className="text-xs text-muted-foreground lg:hidden">
              {autoPayout ? "Activés" : "Désactivés"}
            </span>
            <Switch checked={autoPayout} onCheckedChange={setAutoPayout} />
          </div>
        </FieldRow>

        {/* Enregistrer */}
        <div className="px-5 py-4 flex items-center justify-end">
          <motion.button
            type="submit"
            disabled={saving || clearingKey}
            whileTap={saving ? undefined : { scale: 0.95 }}
            className={cn(buttonVariants({ className: "rounded-xl gap-1.5" }))}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={saving ? "saving" : saved ? "saved" : "idle"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="inline-flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : saved ? (
                  <>
                    <SuccessBounce>
                      <Check className="h-4 w-4" />
                    </SuccessBounce>
                    Sauvegardé
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </form>

      {/* ── c) Intégration : callback, redirections, solde ── */}
      <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-semibold text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" /> Intégration
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Callback serveur et URLs de redirection à configurer dans l'espace
            marchand My-CoolPay.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* URL de callback */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              URL de callback (webhook)
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                readOnly
                value={callbackUrl || "…"}
                className="rounded-xl font-mono text-xs flex-1 bg-muted/40"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  onClick={onCopy}
                  disabled={!callbackUrl}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copier
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-xl gap-1.5",
                    confirmSecret &&
                      "text-destructive hover:text-destructive hover:bg-destructive/10"
                  )}
                  onClick={onRegenerate}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {confirmSecret ? "Confirmer ?" : "Régénérer"}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Le secret est intégré à l'URL — le régénérer invalide l'ancien
              callback.
            </p>
          </div>

          {/* Checklist de configuration */}
          <div className="rounded-xl bg-muted/40 ring-1 ring-border p-4">
            <p className="text-xs font-semibold mb-3">
              Configuration de l'espace marchand my-coolpay.com
            </p>
            <ol className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <li className="flex gap-2.5">
                <span className="grid place-items-center h-[18px] w-[18px] rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-px">
                  1
                </span>
                <span>Créer l'application sur my-coolpay.com (espace marchand)</span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid place-items-center h-[18px] w-[18px] rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-px">
                  2
                </span>
                <span className="min-w-0">
                  URL de succès →{" "}
                  <code className="font-mono text-[11px] text-foreground/80 bg-background ring-1 ring-border rounded px-1 py-0.5 break-all">
                    {origin}/?pay=success
                  </code>{" "}
                  · URL d'annulation →{" "}
                  <code className="font-mono text-[11px] text-foreground/80 bg-background ring-1 ring-border rounded px-1 py-0.5 break-all">
                    {origin}/?pay=cancel
                  </code>{" "}
                  · URL d'échec →{" "}
                  <code className="font-mono text-[11px] text-foreground/80 bg-background ring-1 ring-border rounded px-1 py-0.5 break-all">
                    {origin}/?pay=fail
                  </code>
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid place-items-center h-[18px] w-[18px] rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-px">
                  3
                </span>
                <span>URL de callback → l'URL ci-dessus</span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid place-items-center h-[18px] w-[18px] rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-px">
                  4
                </span>
                <span>
                  Pour les payouts : envoyer les IP des serveurs à{" "}
                  <a
                    href="mailto:support@my-coolpay.com"
                    className="text-primary hover:underline"
                  >
                    support@my-coolpay.com
                  </a>
                </span>
              </li>
            </ol>
          </div>

          {/* Solde marchand */}
          <div className="rounded-xl ring-1 ring-border bg-muted/20 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Solde marchand
              </p>
              {balance?.ok && typeof balance.balance === "number" ? (
                <p className="mt-1 font-display text-2xl font-bold tabular-nums tracking-tight">
                  {formatXaf(balance.balance)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {balance?.error || "Solde disponible en mode live uniquement."}
                </p>
              )}
            </div>
            <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>

      {/* ── d) Statistiques ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MiniStat
          label="Paiements réussis"
          value={stats ? stats.successCount.toLocaleString("fr-FR") : "—"}
          sub={stats ? `${stats.count.toLocaleString("fr-FR")} transactions au total` : undefined}
          accent="purple"
          icon={<BadgeCheck className="h-4 w-4" />}
          loading={!stats}
          delay={0}
        />
        <MiniStat
          label="Volume XAF"
          value={stats ? formatXaf(stats.volumeXaf) : "—"}
          sub="Volume cumulé FCFA"
          accent="orange"
          icon={<Banknote className="h-4 w-4" />}
          loading={!stats}
          delay={0.05}
        />
        <MiniStat
          label="Volume EUR"
          value={stats ? formatEur(stats.volumeEurCents / 100) : "—"}
          sub="Équivalent EUR cumulé"
          accent="pink"
          icon={<Euro className="h-4 w-4" />}
          loading={!stats}
          delay={0.1}
        />
        <MiniStat
          label="En attente"
          value={stats ? stats.pendingCount.toLocaleString("fr-FR") : "—"}
          sub={
            stats
              ? `dont ${stats.withdrawalsPending} retrait${stats.withdrawalsPending > 1 ? "s" : ""} en attente`
              : undefined
          }
          accent="purple"
          icon={<Clock className="h-4 w-4" />}
          loading={!stats}
          delay={0.15}
        />
      </div>

      {/* ── e) Transactions ── */}
      <div className="space-y-4">
        <Tabs defaultValue="payments">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="rounded-xl">
              <TabsTrigger value="payments" className="gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" /> Achats
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="gap-1.5">
                <ArrowDownToLine className="h-3.5 w-3.5" /> Retraits
              </TabsTrigger>
            </TabsList>
            <p className="text-xs text-muted-foreground">
              50 dernières opérations
            </p>
          </div>

          {/* ── Achats (paiements) ── */}
          <TabsContent value="payments" className="mt-4">
            {tx.error ? (
              <ErrorBanner message={tx.error} onRetry={retry} />
            ) : (
              <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Date</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead className="hidden lg:table-cell">Pack</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="hidden md:table-cell">Opérateur</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="pr-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tx.loading &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`ps-${i}`}>
                          <TableCell className="pl-4">
                            <Skeleton className="h-3 w-20" />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-2 w-16" />
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Skeleton className="h-3 w-20" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="h-3 w-14 ml-auto" />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Skeleton className="h-3 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      ))}

                    {!tx.loading && paymentsList.length === 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ShoppingBag className="h-6 w-6 opacity-40" />
                            <p className="text-sm">
                              Aucun paiement pour l'instant
                            </p>
                            <p className="text-xs">
                              Les achats de Vibes apparaîtront ici.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {!tx.loading &&
                      paymentsList.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="pl-4 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(p.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[150px]">
                                {userLabel(p.user)}
                              </p>
                              {p.user?.phone && (
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {p.user.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="min-w-0">
                              <p className="text-sm truncate max-w-[150px]">
                                {p.packTitle ?? "—"}
                              </p>
                              {p.gems > 0 && (
                                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <GemIcon className="h-3 w-3" />
                                  {p.gems.toLocaleString("fr-FR")} Vibes
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <span className="text-sm font-medium tabular-nums">
                              {formatAmount(p.amount, p.currency)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {(p.operator && OPERATORS[p.operator]) || "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge map={PAYMENT_STATUS} status={p.status} />
                          </TableCell>
                          <TableCell className="pr-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {p.status === "pending" && (
                                <motion.button
                                  type="button"
                                  whileTap={{ scale: 0.95 }}
                                  disabled={actingId === p.id}
                                  onClick={() => void doAction("sync_payment", p.id)}
                                  className={cn(
                                    buttonVariants({
                                      variant: "ghost",
                                      size: "sm",
                                      className: "h-8 px-2.5 gap-1.5",
                                    })
                                  )}
                                >
                                  <RefreshCw
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      actingId === p.id && "animate-spin"
                                    )}
                                  />
                                  Synchroniser
                                </motion.button>
                              )}
                              {p.paymentUrl && (
                                <a
                                  href={p.paymentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Ouvrir la page de paiement"
                                  className={cn(
                                    buttonVariants({
                                      variant: "ghost",
                                      size: "icon",
                                      className: "h-8 w-8",
                                    })
                                  )}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span className="sr-only">
                                    Ouvrir la page de paiement
                                  </span>
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Retraits ── */}
          <TabsContent value="withdrawals" className="mt-4">
            {tx.error ? (
              <ErrorBanner message={tx.error} onRetry={retry} />
            ) : (
              <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-4">Date</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="pr-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tx.loading &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={`ws-${i}`}>
                          <TableCell className="pl-4">
                            <Skeleton className="h-3 w-20" />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-2 w-16" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="h-3 w-14 ml-auto" />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-2 w-16" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      ))}

                    {!tx.loading && withdrawalsList.length === 0 && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <ArrowDownToLine className="h-6 w-6 opacity-40" />
                            <p className="text-sm">Aucun retrait pour l'instant</p>
                            <p className="text-xs">
                              Les demandes de retrait apparaîtront ici.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {!tx.loading &&
                      withdrawalsList.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="pl-4 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(w.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-[150px]">
                                {userLabel(w.user)}
                              </p>
                              {w.user?.phone && (
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {w.user.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <span className="text-sm font-medium tabular-nums">
                              {formatEur(w.amountCents / 100)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {w.method === "stripe" ? (
                              <span className="text-sm">Virement Stripe</span>
                            ) : (
                              <div className="min-w-0">
                                <p className="text-sm">
                                  {(w.operator && OPERATORS[w.operator]) ||
                                    "Mobile Money"}
                                </p>
                                {w.accountInfo && (
                                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                                    {w.accountInfo}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <StatusBadge
                                map={WITHDRAWAL_STATUS}
                                status={w.status}
                              />
                              {(w.status === "failed" || w.status === "rejected") &&
                                w.failureReason && (
                                  <p
                                    className="text-[11px] text-destructive/80 mt-1 max-w-[160px] truncate"
                                    title={w.failureReason}
                                  >
                                    {w.failureReason}
                                  </p>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="pr-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {w.provider === "mycoolpay" &&
                                (w.status === "processing" ||
                                  w.status === "pending") && (
                                  <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.95 }}
                                    disabled={actingId === w.id}
                                    onClick={() =>
                                      void doAction("sync_withdrawal", w.id)
                                    }
                                    className={cn(
                                      buttonVariants({
                                        variant: "ghost",
                                        size: "sm",
                                        className: "h-8 px-2.5 gap-1.5",
                                      })
                                    )}
                                  >
                                    <RefreshCw
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        actingId === w.id && "animate-spin"
                                      )}
                                    />
                                    Synchroniser
                                  </motion.button>
                                )}
                              {w.status === "pending" &&
                                w.provider !== "mycoolpay" && (
                                  <>
                                    <motion.button
                                      type="button"
                                      whileTap={{ scale: 0.95 }}
                                      disabled={actingId === w.id}
                                      onClick={() =>
                                        void doAction("complete_withdrawal", w.id)
                                      }
                                      className={cn(
                                        buttonVariants({
                                          variant: "ghost",
                                          size: "sm",
                                          className:
                                            "h-8 px-2.5 gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10",
                                        })
                                      )}
                                    >
                                      {actingId === w.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      )}
                                      Marquer terminé
                                    </motion.button>
                                    <motion.button
                                      type="button"
                                      whileTap={{ scale: 0.95 }}
                                      disabled={actingId === w.id}
                                      onClick={() => onRejectWithdrawal(w)}
                                      className={cn(
                                        buttonVariants({
                                          variant: "ghost",
                                          size: "sm",
                                          className:
                                            "h-8 px-2.5 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10",
                                        })
                                      )}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Refuser
                                    </motion.button>
                                  </>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
