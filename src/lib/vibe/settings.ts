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
};

/// Cache settings in-memory for the process lifetime (avoids a DB hit on every
/// request). Settings change rarely; admin can restart to refresh
/// or call `refreshSettings()` after an update.
let cached: AppSettings | null = null;

export async function getSettings(): Promise<AppSettings> {
  if (cached) return cached;
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
    };
    return cached;
  } catch {
    return DEFAULTS;
  }
}

/// Invalidate the cache (call after admin updates settings).
export function refreshSettings() {
  cached = null;
}
