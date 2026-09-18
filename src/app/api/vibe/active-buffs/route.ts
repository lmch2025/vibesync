// GET /api/vibe/active-buffs — list currently-active premium action buffs.
//
// Buffs come from two sources:
//   1. Timestamp columns on the User model (ghostModeUntil, spotlightUntil,
//      dailyDoubleUntil, passportUntil, timeFreezeUntil, crushAlertUntil,
//      goldenHeartUntil) — only `ghostModeUntil` and `spotlightUntil` are in
//      the shipped schema; the others are accessed defensively via casts so
//      the route still works on databases that haven't been migrated.
//   2. Rows in the `Boost` model — one row per boost activation, each with
//      its own `expiresAt`.
//
// Each buff returned has: type, emoji, label, desc, expiresAt, remainingMs,
// totalMs (the original duration in ms, for the progress ring), and progress
// (0..1, fraction of total elapsed).
//
// Graceful fallback: if the DB is unreachable (e.g. on Vercel preview
// deployments without DATABASE_URL), returns `{ buffs: [] }` instead of 500.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

type BuffType =
  | "boost"
  | "spotlight"
  | "ghostMode"
  | "passport"
  | "timeFreeze"
  | "dailyDouble"
  | "crushAlert"
  | "goldenHeart";

type BuffMeta = {
  type: BuffType;
  emoji: string;
  label: string;
  desc: string;
  totalMs: number; // original duration
};

const BUFF_META: Record<BuffType, BuffMeta> = {
  boost: {
    type: "boost",
    emoji: "🚀",
    label: "Boost",
    desc: "Tu es en haut de la file de 20 profils",
    totalMs: 30 * 60 * 1000, // 30 min
  },
  spotlight: {
    type: "spotlight",
    emoji: "🔦",
    label: "Projecteur",
    desc: "Ton profil apparaît dans 20 decks",
    totalMs: 60 * 60 * 1000, // 1h
  },
  ghostMode: {
    type: "ghostMode",
    emoji: "👻",
    label: "Mode Fantôme",
    desc: "Tu navigues les profils invisiblement",
    totalMs: 60 * 60 * 1000,
  },
  passport: {
    type: "passport",
    emoji: "✈️",
    label: "Passport",
    desc: "Swipe dans une autre ville",
    totalMs: 24 * 60 * 60 * 1000, // 24h
  },
  timeFreeze: {
    type: "timeFreeze",
    emoji: "❄️",
    label: "Temps Gelé",
    desc: "Vois les 3 prochains profils",
    totalMs: 15 * 60 * 1000, // 15 min
  },
  dailyDouble: {
    type: "dailyDouble",
    emoji: "🎲",
    label: "Double Quotidien",
    desc: "Ta prochaine récompense streak sera doublée",
    totalMs: 24 * 60 * 60 * 1000, // 24h
  },
  crushAlert: {
    type: "crushAlert",
    emoji: "💘",
    label: "Crush Alert",
    desc: "Notification spéciale envoyée à ton crush",
    totalMs: 60 * 60 * 1000,
  },
  goldenHeart: {
    type: "goldenHeart",
    emoji: "💛",
    label: "Cœur d'Or",
    desc: "Tu es en tête de sa file avec un badge doré",
    totalMs: 60 * 60 * 1000,
  },
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }

    const now = Date.now();
    const buffs: Array<
      BuffMeta & {
        expiresAt: string;
        remainingMs: number;
        progress: number;
      }
    > = [];

    /// Helper: push a buff if its expiry is in the future.
    const pushIfActive = (
      type: BuffType,
      expiresAtField: Date | string | null | undefined,
      descOverride?: string,
    ) => {
      if (!expiresAtField) return;
      const d = new Date(expiresAtField);
      const t = d.getTime();
      if (!Number.isFinite(t)) return;
      if (t <= now) return;
      const meta = BUFF_META[type];
      const remainingMs = t - now;
      const elapsedMs = meta.totalMs - remainingMs;
      const progress = Math.max(0, Math.min(1, elapsedMs / meta.totalMs));
      buffs.push({
        ...meta,
        ...(descOverride ? { desc: descOverride } : {}),
        expiresAt: d.toISOString(),
        remainingMs,
        progress,
      });
    };

    // Schema-backed fields (these always exist).
    pushIfActive("ghostMode", user.ghostModeUntil);
    pushIfActive("spotlight", user.spotlightUntil);
    pushIfActive(
      "passport",
      user.passportUntil,
      (user as any).passportCity ? `Tu découvres ${(user as any).passportCity}` : undefined,
    );
    pushIfActive("timeFreeze", user.timeFreezeUntil);
    pushIfActive("dailyDouble", user.dailyDoubleUntil);
    pushIfActive("crushAlert", user.crushAlertUntil);
    pushIfActive("goldenHeart", user.goldenHeartUntil);

    // Boost model — one or more active boosts may exist.
    try {
      const activeBoosts = await db.boost.findMany({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date(now) },
        },
        orderBy: { expiresAt: "desc" },
      });
      for (const b of activeBoosts) {
        pushIfActive("boost", b.expiresAt);
      }
    } catch {
      // Boost model missing or DB unreachable — skip silently.
    }

    // Sort: soonest-expiring first (most urgent to display).
    buffs.sort((a, b) => a.remainingMs - b.remainingMs);

    return NextResponse.json({
      buffs,
      now: new Date(now).toISOString(),
      count: buffs.length,
    });
  } catch (e) {
    // Graceful fallback — DB unreachable on Vercel preview deployments.
    return NextResponse.json({
      buffs: [],
      count: 0,
      now: new Date().toISOString(),
      warning: e instanceof Error ? e.message : "active-buffs unavailable",
    });
  }
}
