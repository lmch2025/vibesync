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
};

const DEFAULTS: AppSettings = {
  defaultRadiusKm: 50,
  maxMessagesBeforeReply: MAX_MESSAGES_BEFORE_REPLY,
  platformCommission: PLATFORM_COMMISSION,
  withdrawalThresholdEur: WITHDRAWAL_THRESHOLD_EUR,
  welcomeGems: WELCOME_GEMS,
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
