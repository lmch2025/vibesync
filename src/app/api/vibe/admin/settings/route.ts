// GET  /api/vibe/admin/settings — all app settings
// PUT  /api/vibe/admin/settings — upsert one or many settings
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { refreshSettings } from "@/lib/vibe/settings";
import {
  MAX_MESSAGES_BEFORE_REPLY,
  PLATFORM_COMMISSION,
  WITHDRAWAL_THRESHOLD_EUR,
  WELCOME_GEMS,
} from "@/lib/vibe/constants";

// Default settings (fallback when not in DB).
const DEFAULTS: Record<string, string> = {
  defaultRadiusKm: "50",
  maxMessagesBeforeReply: String(MAX_MESSAGES_BEFORE_REPLY),
  platformCommission: String(PLATFORM_COMMISSION),
  withdrawalThresholdEur: String(WITHDRAWAL_THRESHOLD_EUR),
  welcomeGems: String(WELCOME_GEMS),
  videoMaxDuration: "15",
  videoMaxCount: "3",
  videoMaxWidth: "480",
  videoQuality: "0.5",
  videoMaxSizeKb: "2048",
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const rows = await db.setting.findMany();
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as any));
  // Accept either {key, value} or {settings: {key, value, ...}}
  const entries: [string, string][] = [];
  if (body.key && body.value !== undefined) {
    entries.push([String(body.key), String(body.value)]);
  } else if (body.settings && typeof body.settings === "object") {
    for (const [k, v] of Object.entries(body.settings)) {
      entries.push([k, String(v)]);
    }
  } else {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  for (const [key, value] of entries) {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  refreshSettings();
  return NextResponse.json({ ok: true, updated: entries.length });
}
