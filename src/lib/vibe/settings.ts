// Server-side settings helper. Reads admin-configurable settings from the DB
// (Setting table) with fallback to the constant defaults.
import { db } from "@/lib/db";
import {
  MAX_MESSAGES_BEFORE_REPLY,
  PLATFORM_COMMISSION,
  WITHDRAWAL_THRESHOLD_EUR,
  WELCOME_GEMS,
} from "./constants";

export type AppSettings = {
  defaultRadiusKm: number;
  maxMessagesBeforeReply: number;
  platformCommission: number; // fraction 0..1
  withdrawalThresholdEur: number;
  welcomeGems: number;
  seeLikesWindowMin: number; // minutes — durée de la fenêtre d'accès « Voir mes Likes » (défaut 5)
  // Video configuration
  videoMaxDuration: number; // seconds (default 15)
  videoMaxCount: number; // max videos per profile (default 3)
  videoMaxWidth: number; // px, compression target (default 480)
  videoQuality: number; // 0..1, compression quality (default 0.5)
  videoMaxSizeKb: number; // max compressed size in KB (default 2048)
  // ── Recommendation algorithm (admin-configurable weights) ──
  // Each weight is a relative importance on a 100-point scale. The final
  // score of a candidate = Σ(weight × normalized-signal) / Σweights, then
  // × recBoostMultiplier if the profile has an active Boost.
  recWeightDistance: number; // geographic proximity (Haversine)
  recWeightAge: number; // age proximity to the viewer
  recWeightVibe: number; // Vibe Check compatibility (same question/answer)
  recWeightVerified: number; // verified-profile bonus
  recWeightRecency: number; // recently joined profiles
  recWeightPopularity: number; // likes/superlikes received
  recBoostMultiplier: number; // score multiplier for boosted profiles
  deckSize: number; // profiles returned per deck fetch
  // ── Apparence — page d'accueil ──
  landingVideoUrl: string; // vidéo de fond (Vercel Blob), "" ⇒ vidéo locale par défaut
  // ── Paiements — agrégateur My-CoolPay (achats Vibes + payouts Mobile Money) ──
  payMode: "sandbox" | "live" | "off"; // sandbox (clé test) | live (clés réelles) | off (démo, crédit immédiat)
  payPublicKey: string; // clé publique marchand (env fallback MYCOOLPAY_PUBLIC_KEY)
  payPrivateKey: string; // clé privée (env fallback MYCOOLPAY_PRIVATE_KEY) — jamais exposée au client
  payCurrency: "XAF" | "EUR"; // devise de facturation des packs
  payIpCheck: boolean; // vérifier l'IP source du callback (15.236.140.89)
  payAutoPayout: boolean; // exécuter automatiquement les payouts Mobile Money via l'API
  payCallbackSecret: string; // segment secret de l'URL de callback
};

const DEFAULTS: AppSettings = {
  defaultRadiusKm: 50,
  maxMessagesBeforeReply: MAX_MESSAGES_BEFORE_REPLY,
  platformCommission: PLATFORM_COMMISSION,
  withdrawalThresholdEur: WITHDRAWAL_THRESHOLD_EUR,
  welcomeGems: WELCOME_GEMS,
  seeLikesWindowMin: 5,
  videoMaxDuration: 15,
  videoMaxCount: 3,
  videoMaxWidth: 480,
  videoQuality: 0.5,
  videoMaxSizeKb: 2048,
  // Recommendation defaults — balanced starter weights (sum = 100).
  recWeightDistance: 30,
  recWeightAge: 20,
  recWeightVibe: 25,
  recWeightVerified: 5,
  recWeightRecency: 10,
  recWeightPopularity: 10,
  recBoostMultiplier: 2,
  deckSize: 12,
  landingVideoUrl: "",
  // ── Paiements My-CoolPay ──
  payMode: (process.env.MYCOOLPAY_MODE as "sandbox" | "live") === "live" ? "live" : "sandbox",
  // NOTE : payMode peut aussi valoir "off" via la Setting admin (démo sans paiement réel).
  payPublicKey: process.env.MYCOOLPAY_PUBLIC_KEY || "",
  payPrivateKey: process.env.MYCOOLPAY_PRIVATE_KEY || "",
  payCurrency: "XAF",
  payIpCheck: false,
  payAutoPayout: true,
  payCallbackSecret: "",
};

/// Cache settings in-memory with a SHORT TTL (15s). A process-lifetime cache
/// proved dangerous on serverless (Vercel): `refreshSettings()` only clears
/// the cache on the instance that handled the admin PUT — other warm
/// instances kept enforcing a STALE limit (e.g. 1 message instead of 3).
/// With a 15s TTL, every instance converges to the admin-configured value
/// within seconds, and DB load stays negligible (≤ 1 query / 15s / instance).
const CACHE_TTL_MS = 15_000;
let cached: AppSettings | null = null;
let cachedAt = 0;

/// Parse a setting value that may legitimately be 0 (unlike `||`).
function numOr(v: string | undefined, d: number): number {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) ? n : d;
}

export async function getSettings(): Promise<AppSettings> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  try {
    const rows = await db.setting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    cached = {
      defaultRadiusKm: Number(map.defaultRadiusKm) || DEFAULTS.defaultRadiusKm,
      maxMessagesBeforeReply: Number(map.maxMessagesBeforeReply) || DEFAULTS.maxMessagesBeforeReply,
      platformCommission: Number(map.platformCommission) || DEFAULTS.platformCommission,
      withdrawalThresholdEur: Number(map.withdrawalThresholdEur) || DEFAULTS.withdrawalThresholdEur,
      welcomeGems: Number(map.welcomeGems) || DEFAULTS.welcomeGems,
      seeLikesWindowMin: Math.min(1440, Math.max(1, numOr(map.seeLikesWindowMin, DEFAULTS.seeLikesWindowMin))),
      videoMaxDuration: Number(map.videoMaxDuration) || DEFAULTS.videoMaxDuration,
      videoMaxCount: Number(map.videoMaxCount) || DEFAULTS.videoMaxCount,
      videoMaxWidth: Number(map.videoMaxWidth) || DEFAULTS.videoMaxWidth,
      videoQuality: Number(map.videoQuality) || DEFAULTS.videoQuality,
      videoMaxSizeKb: Number(map.videoMaxSizeKb) || DEFAULTS.videoMaxSizeKb,
      // Weights: 0 is a legitimate value ("signal disabled"), so we can't use
      // `||` — we need an explicit finite check (Number(undefined) is NaN,
      // and `NaN ?? d` would silently return NaN, not d).
      recWeightDistance: numOr(map.recWeightDistance, DEFAULTS.recWeightDistance),
      recWeightAge: numOr(map.recWeightAge, DEFAULTS.recWeightAge),
      recWeightVibe: numOr(map.recWeightVibe, DEFAULTS.recWeightVibe),
      recWeightVerified: numOr(map.recWeightVerified, DEFAULTS.recWeightVerified),
      recWeightRecency: numOr(map.recWeightRecency, DEFAULTS.recWeightRecency),
      recWeightPopularity: numOr(map.recWeightPopularity, DEFAULTS.recWeightPopularity),
      recBoostMultiplier: numOr(map.recBoostMultiplier, DEFAULTS.recBoostMultiplier),
      deckSize: Math.min(50, Math.max(4, numOr(map.deckSize, DEFAULTS.deckSize))),
      landingVideoUrl: typeof map.landingVideoUrl === "string" ? map.landingVideoUrl : "",
      // ── Paiements My-CoolPay — les clés Setting ont priorité sur l'env ──
      payMode: map.payMode === "live" ? "live" : map.payMode === "off" ? "off" : map.payMode === "sandbox" ? "sandbox" : DEFAULTS.payMode,
      payPublicKey: map.payPublicKey || DEFAULTS.payPublicKey,
      payPrivateKey: map.payPrivateKey || DEFAULTS.payPrivateKey,
      payCurrency: map.payCurrency === "EUR" ? "EUR" : "XAF",
      payIpCheck: map.payIpCheck === "on",
      // NOTE : bug fix (agent A, task 4-a) — la clé Setting documentée est
      // "payAutoPayout" (worklog task 1) mais on lisait "payAutoP" (clé jamais
      // écrite) → le réglage admin "auto-payout OFF" était sans effet.
      payAutoPayout: map.payAutoPayout !== "off",
      payCallbackSecret: map.payCallbackSecret || "",
    };
    cachedAt = Date.now();
    return cached;
  } catch {
    return DEFAULTS;
  }
}

/// Invalidate the cache (call after admin updates settings).
export function refreshSettings() {
  cached = null;
  cachedAt = 0;
}
