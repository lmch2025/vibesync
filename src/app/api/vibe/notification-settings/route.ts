// GET  /api/vibe/notification-settings — fetch user's notif preferences
// POST /api/vibe/notification-settings — upsert notif preferences
//
// Stored in the Setting table as a JSON string keyed by
// `notif_prefs_{userId}`. Defaults are all-true (opt-in for everything
// except marketing, which is opt-out by default per GDPR best practice).
//
// Fields:
//   - marketingEnabled (default false — opt-in for promotional email)
//   - matchesEnabled   (default true)
//   - messagesEnabled  (default true)
//   - giftsEnabled     (default true)
//   - likesEnabled     (default true)
//
// Graceful fallback: if the DB is unreachable, GET returns the defaults
// and POST returns `{ ok: false, warning: ... }` (non-fatal — the user
// just won't have their preferences persisted).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export type NotificationPrefs = {
  marketingEnabled: boolean;
  matchesEnabled: boolean;
  messagesEnabled: boolean;
  giftsEnabled: boolean;
  likesEnabled: boolean;
};

const DEFAULTS: NotificationPrefs = {
  marketingEnabled: false,
  matchesEnabled: true,
  messagesEnabled: true,
  giftsEnabled: true,
  likesEnabled: true,
};

function prefsKey(userId: string): string {
  return `notif_prefs_${userId}`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }
    const row = await db.setting.findUnique({
      where: { key: prefsKey(user.id) },
    });
    const prefs: NotificationPrefs = row
      ? { ...DEFAULTS, ...(safeParse(row.value) as Partial<NotificationPrefs>) }
      : DEFAULTS;
    return NextResponse.json({ prefs });
  } catch (e) {
    return NextResponse.json({
      prefs: DEFAULTS,
      warning: e instanceof Error ? e.message : "notification-settings unavailable",
    });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }
    const body = await req.json().catch(() => ({}) as Partial<NotificationPrefs>);
    const prefs: NotificationPrefs = {
      marketingEnabled: toBool(body.marketingEnabled, DEFAULTS.marketingEnabled),
      matchesEnabled: toBool(body.matchesEnabled, DEFAULTS.matchesEnabled),
      messagesEnabled: toBool(body.messagesEnabled, DEFAULTS.messagesEnabled),
      giftsEnabled: toBool(body.giftsEnabled, DEFAULTS.giftsEnabled),
      likesEnabled: toBool(body.likesEnabled, DEFAULTS.likesEnabled),
    };
    await db.setting.upsert({
      where: { key: prefsKey(user.id) },
      update: { value: JSON.stringify(prefs) },
      create: { key: prefsKey(user.id), value: JSON.stringify(prefs) },
    });
    return NextResponse.json({ ok: true, prefs });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      warning: e instanceof Error ? e.message : "notification-settings save failed",
    });
  }
}

function toBool(v: unknown, dflt: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return dflt;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
