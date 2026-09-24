// My-CoolPay Merchant API — server-side client.
// Agrégateur de paiements (Digital House International, Cameroun) :
// Orange Money, MTN Mobile Money, VISA, Mastercard, My-CoolPay.
// Doc : https://documenter.getpostman.com/view/17178321/UV5ZCx8f
//
// Endpoints (base https://my-coolpay.com/api/{publicKey}) :
//   POST /paylink            → hosted checkout URL (web flow)
//   POST /payin              → direct mobile money charge (USSD / OTP)
//   POST /payin/authorize    → confirm OTP
//   POST /payout             → send money (header X-PRIVATE-KEY + IP whitelist)
//   GET  /checkStatus/{ref}  → transaction status (PAYIN + PAYOUT)
//   GET  /balance            → merchant balance (header X-PRIVATE-KEY)
//   POST {callbackUrl}       → webhook (signature MD5, envoyé UNE seule fois)
//
// IMPORTANT : ce module tourne UNIQUEMENT côté serveur (clé privée + MD5).
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getSettings } from "./settings";

// Clé publique de l'application Sandbox My-CoolPay (doc §8). La clé privée
// sandbox n'est pas publiée → la vérification de signature est ignorée en
// sandbox ; le crédit passe alors par le polling checkStatus.
export const MYCOOLPAY_SANDBOX_PUBLIC_KEY = "118a4852-7df8-46d9-834b-23b4ef25aaab";

// IP du serveur My-CoolPay qui émet les callbacks (doc §7.5).
export const MYCOOLPAY_CALLBACK_IP = "15.236.140.89";

const API_BASE = "https://my-coolpay.com/api";

export type PayConfig = {
  mode: "sandbox" | "live" | "off";
  publicKey: string;
  privateKey: string; // "" en sandbox si non fournie
  currency: "XAF" | "EUR";
  ipCheck: boolean;
  autoPayout: boolean;
  callbackSecret: string;
  configured: boolean; // une clé publique exploitable existe
  enabled: boolean; // mode ≠ "off" → paiements réels actifs
};

/// Résout la configuration de paiement : clés Setting (admin) > env > sandbox.
export async function getPayConfig(): Promise<PayConfig> {
  const s = await getSettings();
  const mode = s.payMode;
  let publicKey = s.payPublicKey.trim();
  const privateKey = s.payPrivateKey.trim();
  if (!publicKey && mode === "sandbox") publicKey = MYCOOLPAY_SANDBOX_PUBLIC_KEY;
  return {
    mode,
    publicKey,
    privateKey,
    currency: s.payCurrency,
    ipCheck: s.payIpCheck,
    autoPayout: s.payAutoPayout,
    callbackSecret: s.payCallbackSecret,
    configured: publicKey.length > 0,
    enabled: mode !== "off",
  };
}

/// Génère un secret de callback aléatoire (URL complexe — doc §7.3).
export function generateCallbackSecret(): string {
  return createHash("sha256")
    .update(`${Date.now()}-${Math.random()}-${process.pid}`)
    .digest("hex")
    .slice(0, 24);
}

/// Garantit l'existence d'un secret de callback (le crée s'il manque).
export async function ensureCallbackSecret(): Promise<string> {
  const cfg = await getPayConfig();
  if (cfg.callbackSecret) return cfg.callbackSecret;
  const secret = generateCallbackSecret();
  await db.setting.upsert({
    where: { key: "payCallbackSecret" },
    update: { value: secret },
    create: { key: "payCallbackSecret", value: secret },
  });
  return secret;
}

// ─────────────────────────────────────────────────────────────────────────
// Requêtes HTTP
// ─────────────────────────────────────────────────────────────────────────

async function mcpFetch(
  cfg: PayConfig,
  path: string,
  init: { method?: string; body?: unknown; privateKey?: boolean } = {}
): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (init.privateKey) headers["X-PRIVATE-KEY"] = cfg.privateKey;
  try {
    const res = await fetch(`${API_BASE}/${cfg.publicKey}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      // Les appels réseau vers l'agrégateur ne doivent pas être mis en cache.
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => ({} as any));
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: { status: "error", message: e?.message || "network" } };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Paylink — achat web (redirection vers la page de paiement hébergée)
// ─────────────────────────────────────────────────────────────────────────

export type PaylinkInput = {
  amount: number; // transaction_amount
  currency: "XAF" | "EUR"; // transaction_currency
  reason: string; // transaction_reason
  appRef: string; // app_transaction_ref (notre référence unique)
  customerName?: string;
  customerPhone?: string; // format local opérateur (ex. 6XXXXXXXX)
  customerEmail?: string;
  customerLang?: "fr" | "en";
  returnUrlParam?: string; // paramètre d'URL transmis à la redirection (≤255c)
};

export type PaylinkResult =
  | { ok: true; transactionRef: string; paymentUrl: string }
  | { ok: false; error: string };

export async function createPaylink(cfg: PayConfig, input: PaylinkInput): Promise<PaylinkResult> {
  // Paramètres d'URL transmis : réinsérés dans l'URL de redirection du client
  // après paiement (doc §1) — permet de retrouver le paiement au retour.
  const qs = input.returnUrlParam
    ? `?ref=${encodeURIComponent(input.returnUrlParam)}`
    : "";
  const { ok, data } = await mcpFetch(cfg, `/paylink${qs}`, {
    method: "POST",
    body: {
      transaction_amount: input.amount,
      transaction_currency: input.currency,
      transaction_reason: input.reason,
      app_transaction_ref: input.appRef,
      customer_name: input.customerName || "",
      customer_phone_number: input.customerPhone || "",
      customer_email: input.customerEmail || "",
      customer_lang: input.customerLang || "fr",
    },
  });
  if (ok && data?.status === "success" && data.payment_url) {
    return { ok: true, transactionRef: data.transaction_ref, paymentUrl: data.payment_url };
  }
  return { ok: false, error: data?.message || `Paylink refusé (${data?.status || "erreur"})` };
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Payin mobile — charge directe Mobile Money (USSD / OTP)
// ─────────────────────────────────────────────────────────────────────────

export type PayinResult =
  | { ok: true; transactionRef: string; action: "PENDING" | "REQUIRE_OTP"; ussd?: string }
  | { ok: false; error: string };

export async function createPayin(cfg: PayConfig, input: PaylinkInput): Promise<PayinResult> {
  const { ok, data } = await mcpFetch(cfg, "/payin", {
    method: "POST",
    body: {
      transaction_amount: input.amount,
      transaction_currency: input.currency,
      transaction_reason: input.reason,
      app_transaction_ref: input.appRef,
      customer_name: input.customerName || "",
      customer_phone_number: input.customerPhone || "",
      customer_email: input.customerEmail || "",
      customer_lang: input.customerLang || "fr",
    },
  });
  if (ok && data?.status === "success" && data.transaction_ref) {
    return {
      ok: true,
      transactionRef: data.transaction_ref,
      action: data.action === "REQUIRE_OTP" ? "REQUIRE_OTP" : "PENDING",
      ussd: data.ussd,
    };
  }
  return { ok: false, error: data?.message || "Payin refusé" };
}

export async function authorizePayinOtp(
  cfg: PayConfig,
  transactionRef: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const { ok, data } = await mcpFetch(cfg, "/payin/authorize", {
    method: "POST",
    body: { transaction_ref: transactionRef, code },
  });
  if (ok && data?.status === "success") return { ok: true };
  return { ok: false, error: data?.message || "Code invalide" };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Payout — transfert vers un compte Mobile Money (retraits)
// ─────────────────────────────────────────────────────────────────────────

export type PayoutOperator = "CM_OM" | "CM_MOMO" | "MCP";
// CM_OM = Orange Money Cameroun, CM_MOMO = MTN Mobile Money Cameroun,
// MCP = compte My-CoolPay.

export type PayoutInput = {
  amount: number; // XAF
  currency: "XAF" | "EUR";
  reason: string;
  operator: PayoutOperator;
  appRef: string;
  customerName?: string;
  customerPhone: string; // numéro du bénéficiaire
  customerEmail?: string;
};

export type PayoutResult =
  | { ok: true; transactionRef: string; done: boolean } // done=true → 200 exécuté
  | { ok: false; error: string; status?: number };

export async function createPayout(cfg: PayConfig, input: PayoutInput): Promise<PayoutResult> {
  const { ok, status, data } = await mcpFetch(cfg, "/payout", {
    method: "POST",
    privateKey: true,
    body: {
      transaction_amount: input.amount,
      transaction_currency: input.currency,
      transaction_reason: input.reason,
      transaction_operator: input.operator,
      app_transaction_ref: input.appRef,
      customer_name: input.customerName || "",
      customer_phone_number: input.customerPhone,
      customer_email: input.customerEmail || "",
      customer_lang: "fr",
    },
  });
  if (ok && data?.status === "success" && data.transaction_ref) {
    return { ok: true, transactionRef: data.transaction_ref, done: status === 200 };
  }
  return { ok: false, error: data?.message || "Payout refusé", status };
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Check status — statut d'une transaction (filet de sécurité callback)
// ─────────────────────────────────────────────────────────────────────────

export type McpTransactionStatus = {
  appTransactionRef: string | null;
  operatorTransactionRef: string | null;
  transactionRef: string;
  transactionType: "PAYIN" | "PAYOUT" | string;
  transactionAmount: number;
  transactionFees: number | null;
  transactionCurrency: string;
  transactionOperator: string | null; // CM_OM | CM_MOMO | CARD | MCP | ""
  transactionStatus: string; // CREATED | PENDING | SUCCESS | CANCELED | FAILED | …
  transactionMessage: string | null;
  customerPhoneNumber: string | null;
};

export async function checkTransactionStatus(
  cfg: PayConfig,
  transactionRef: string
): Promise<{ ok: boolean; tx?: McpTransactionStatus; error?: string }> {
  const { ok, data } = await mcpFetch(cfg, `/checkStatus/${encodeURIComponent(transactionRef)}`);
  if (ok && data?.status === "success") {
    return {
      ok: true,
      tx: {
        appTransactionRef: data.app_transaction_ref ?? null,
        operatorTransactionRef: data.operator_transaction_ref ?? null,
        transactionRef: data.transaction_ref ?? transactionRef,
        transactionType: data.transaction_type ?? "PAYIN",
        transactionAmount: Number(data.transaction_amount) || 0,
        transactionFees: data.transaction_fees ?? null,
        transactionCurrency: data.transaction_currency ?? "XAF",
        transactionOperator: data.transaction_operator || null,
        transactionStatus: data.transaction_status ?? "PENDING",
        transactionMessage: data.transaction_message ?? null,
        customerPhoneNumber: data.customer_phone_number ?? null,
      },
    };
  }
  return { ok: false, error: data?.message || "Statut indisponible" };
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Balance — solde du compte marchand
// ─────────────────────────────────────────────────────────────────────────

export async function getMerchantBalance(
  cfg: PayConfig
): Promise<{ ok: boolean; balance?: number; currency?: string; error?: string }> {
  if (!cfg.privateKey) {
    return { ok: false, error: "Clé privée My-CoolPay requise (mode live)" };
  }
  const { ok, data } = await mcpFetch(cfg, "/balance", { privateKey: true });
  if (ok && data?.status === "success") {
    return { ok: true, balance: Number(data.balance) || 0, currency: "XAF" };
  }
  return { ok: false, error: data?.message || "Solde indisponible" };
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Callback — vérification de l'authenticité du webhook
// ─────────────────────────────────────────────────────────────────────────

export type McpCallbackPayload = {
  application?: string;
  app_transaction_ref?: string;
  operator_transaction_ref?: string | null;
  transaction_ref?: string;
  transaction_type?: "PAYIN" | "PAYOUT";
  transaction_amount?: number;
  transaction_fees?: number;
  transaction_currency?: string;
  transaction_operator?: string;
  transaction_status?: string; // SUCCESS | CANCELED | FAILED
  transaction_reason?: string;
  transaction_message?: string;
  customer_phone_number?: string;
  signature?: string;
};

/// signature = md5(transaction_ref + transaction_type + transaction_amount +
///                  transaction_currency + transaction_operator + private_key)
/// Les nombres sont convertis en chaînes SANS zéros non significatifs
/// (ex. 100.0 → "100" ; 2.5 → "2.5").
function numberToSignString(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toFixed(6)));
}

export function computeCallbackSignature(
  payload: McpCallbackPayload,
  privateKey: string
): string {
  const parts = [
    payload.transaction_ref ?? "",
    payload.transaction_type ?? "",
    numberToSignString(Number(payload.transaction_amount ?? 0)),
    payload.transaction_currency ?? "",
    payload.transaction_operator ?? "",
    privateKey,
  ];
  return createHash("md5").update(parts.join("")).digest("hex");
}

/// Vérifie la signature d'un callback. En sandbox sans clé privée (clé non
/// publiée par My-CoolPay), la vérification est ignorée — le crédit est alors
/// confirmé par polling checkStatus côté serveur, jamais côté client.
export function verifyCallbackSignature(
  cfg: PayConfig,
  payload: McpCallbackPayload
): { verified: boolean; skipped: boolean } {
  if (cfg.mode === "sandbox" && !cfg.privateKey) return { verified: true, skipped: true };
  if (!cfg.privateKey || !payload.signature) return { verified: false, skipped: false };
  const expected = computeCallbackSignature(payload, cfg.privateKey);
  return { verified: expected === payload.signature.toLowerCase(), skipped: false };
}

/// Extrait l'IP source d'une requête derrière proxy (Vercel / Caddy).
export function extractClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "";
}

/// Vérifie que le callback provient bien du serveur My-CoolPay (doc §7.5).
export function isMyCoolPayIp(ip: string): boolean {
  return ip === MYCOOLPAY_CALLBACK_IP;
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Utilitaires
// ─────────────────────────────────────────────────────────────────────────

/// Référence d'application unique lisible (app_transaction_ref).
export function makeAppRef(prefix: "pay" | "wd" = "pay"): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `tiluu_${prefix}_${Date.now().toString(36)}${rand}`;
}

/// Mappe le statut provider → statut interne PaymentTx/Withdrawal.
/// Les statuts intermédiaires (CREATED, PENDING, …) restent "pending".
export function mapProviderStatus(s: string): "pending" | "success" | "canceled" | "failed" {
  switch ((s || "").toUpperCase()) {
    case "SUCCESS":
    case "SUCCESSFUL":
    case "COMPLETED":
      return "success";
    case "CANCELED":
    case "CANCELLED":
      return "canceled";
    case "FAILED":
    case "REJECTED":
      return "failed";
    default:
      return "pending"; // CREATED | PENDING | …
  }
}

/// Conversion EUR (cents) → XAF via la table ExchangeRate (fallback ~655.957).
export async function eurCentsToXaf(eurCents: number): Promise<number> {
  try {
    const rate = await db.exchangeRate.findUnique({ where: { currency: "XAF" } });
    const r = rate && Number.isFinite(rate.rate) && rate.rate > 0 ? rate.rate : 655.957;
    return Math.round((eurCents / 100) * r);
  } catch {
    return Math.round((eurCents / 100) * 655.957);
  }
}

/// Normalise un numéro de téléphone au format opérateur local camerounais
/// (6XXXXXXXX) — My-CoolPay attend le format local, pas l'E.164.
export function toLocalCmPhone(e164: string): string {
  let p = (e164 || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+237")) p = p.slice(4);
  else if (p.startsWith("237") && p.length > 9) p = p.slice(3);
  return p; // 6XXXXXXXX
}
