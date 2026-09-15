// GET  /api/vibe/notifications — list notifications + unread count
// POST /api/vibe/notifications — mark all as read (or a specific one)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const onlyUnread = url.searchParams.get("unread") === "1";

  const notifications = await db.notification.findMany({
    where: onlyUnread ? { userId: user.id, read: false } : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await db.notification.count({
    where: { userId: user.id, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { markAll, notificationId } = await req.json().catch(() => ({} as any));

  if (markAll) {
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true, markedAll: true });
  }

  if (notificationId) {
    await db.notification.update({
      where: { id: notificationId, userId: user.id },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });
}
