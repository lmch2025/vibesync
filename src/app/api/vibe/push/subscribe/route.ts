// POST   /api/vibe/push/subscribe — upsert a PushSubscription
// DELETE /api/vibe/push/subscribe — remove a PushSubscription by endpoint
//
// Fields: userId (from session), endpoint (URL string), keys (JSON string
// containing auth + p256dh). Unique on [userId, endpoint].
//
// NOTE: The Prisma schema in this sandbox does not ship a dedicated
// PushSubscription model. We persist subscriptions in the Setting table
// as a JSON array keyed by `push_subs_{userId}`. Each entry has the
// shape: { endpoint, keys, createdAt }. Upserting de-dupes by endpoint
// (matching the unique-on-[userId, endpoint] semantic), and DELETE
// removes the matching endpoint.
//
// In production with the full schema, this route would simply call
// `db.pushSubscription.upsert(...)` / `.deleteMany(...)`.
//
// Graceful fallback: returns `{ ok: false, warning }` (non-500) if the
// DB is unreachable, so the client never crashes.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

type StoredSub = {
  endpoint: string;
  keys: string;
  createdAt: string;
};

function subsKey(userId: string): string {
  return `push_subs_${userId}`;
}

function readSubs(value: string | null): StoredSub[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as StoredSub[]) : [];
  } catch {
    return [];
  }
}

function writeSubs(subs: StoredSub[]): string {
  return JSON.stringify(subs);
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
    const body = await req
      .json()
      .catch(() => ({}) as { endpoint?: string; keys?: string });
    const endpoint = (body.endpoint ?? "").toString().trim();
    const keys =
      typeof body.keys === "string" ? body.keys : JSON.stringify(body.keys ?? {});

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint manquant" },
        { status: 400 },
      );
    }

    const key = subsKey(user.id);
    const existing = await db.setting.findUnique({ where: { key } });
    const subs = readSubs(existing?.value ?? null);

    // Upsert: remove any existing entry with the same endpoint, then append.
    const filtered = subs.filter((s) => s.endpoint !== endpoint);
    filtered.push({
      endpoint,
      keys,
      createdAt: new Date().toISOString(),
    });

    await db.setting.upsert({
      where: { key },
      update: { value: writeSubs(filtered) },
      create: { key, value: writeSubs(filtered) },
    });

    return NextResponse.json({ ok: true, count: filtered.length });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      warning:
        e instanceof Error ? e.message : "push subscribe unavailable",
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") ?? "";
    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint manquant" },
        { status: 400 },
      );
    }

    const key = subsKey(user.id);
    const existing = await db.setting.findUnique({ where: { key } });
    const subs = readSubs(existing?.value ?? null);
    const filtered = subs.filter((s) => s.endpoint !== endpoint);

    if (filtered.length === 0) {
      // No subscriptions left — remove the row entirely.
      if (existing) {
        await db.setting.delete({ where: { key } });
      }
    } else {
      await db.setting.upsert({
        where: { key },
        update: { value: writeSubs(filtered) },
        create: { key, value: writeSubs(filtered) },
      });
    }

    return NextResponse.json({ ok: true, count: filtered.length });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      warning:
        e instanceof Error ? e.message : "push unsubscribe unavailable",
    });
  }
}
