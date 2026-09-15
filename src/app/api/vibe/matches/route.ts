// GET /api/vibe/matches — list current user's matches with last message + gift counts.
// Matches are sorted by "last activity" — the most recent message or gift timestamp.
// Conversations with a boosted last message get an extra priority bump (boosted = top).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { getSettings } from "@/lib/vibe/settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { maxMessagesBeforeReply } = await getSettings();

  const matches = await db.match.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      gifts: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { gifts: true } },
    },
  });

  const result = await Promise.all(
    matches.map(async (m) => {
      const otherId = m.userAId === user.id ? m.userBId : m.userAId;
      const other = await db.user.findUnique({
        where: { id: otherId },
        include: { profile: true },
      });
      const isInitiator = m.initiatedById === user.id;
      const myMessagesCount = await db.message.count({
        where: { matchId: m.id, senderId: user.id, type: "text" },
      });
      const theirMessagesCount = await db.message.count({
        where: { matchId: m.id, senderId: { not: user.id }, type: "text" },
      });
      const locked = isInitiator && !m.unlocked && myMessagesCount >= maxMessagesBeforeReply;

      // Determine the last activity (most recent message OR gift).
      const lastMsg = m.messages[0];
      const lastGift = m.gifts[0];
      const lastMsgTime = lastMsg ? new Date(lastMsg.createdAt).getTime() : 0;
      const lastGiftTime = lastGift ? new Date(lastGift.createdAt).getTime() : 0;
      const lastActivityAt = new Date(Math.max(lastMsgTime, lastGiftTime));

      // Check if the last message is boosted.
      const lastMessageBoosted = lastMsg?.boosted ?? false;

      // Build a display label for the last activity.
      let lastMessagePreview: string;
      if (lastMsg && lastMsgTime >= lastGiftTime) {
        if (lastMsg.type === "voice") {
          lastMessagePreview = lastMsg.senderId === user.id ? "🎙️ Vocal envoyé" : "🎙️ Vocal";
        } else {
          lastMessagePreview = lastMsg.text || "";
        }
      } else if (lastGift) {
        lastMessagePreview = lastGift.senderId === user.id
          ? `🎁 Cadeau envoyé`
          : `🎁 Cadeau reçu`;
      } else {
        lastMessagePreview = "Nouveau match — dis bonjour ! 👋";
      }

      return {
        id: m.id,
        unlocked: m.unlocked,
        isInitiator,
        locked,
        myMessagesCount,
        theirMessagesCount,
        createdAt: m.createdAt,
        lastMessage: lastMessagePreview,
        lastMessageAt: lastActivityAt,
        lastMessageBoosted,
        lastMessageType: lastMsg?.type ?? (lastGift ? "gift" : "text"),
        giftsCount: m._count.gifts,
        other: other?.profile
          ? {
              id: other.id,
              displayName: other.profile.displayName,
              posterUrl: other.profile.posterUrl,
              city: other.profile.city,
              age: other.profile.age,
              verified: other.verified,
            }
          : null,
      };
    })
  );

  // Sort: boosted conversations first, then by last activity (most recent first).
  result.sort((a, b) => {
    // Boosted conversations get a 2-hour priority window.
    const now = Date.now();
    const aBoosted = a.lastMessageBoosted && (now - new Date(a.lastMessageAt).getTime()) < 2 * 60 * 60 * 1000;
    const bBoosted = b.lastMessageBoosted && (now - new Date(b.lastMessageAt).getTime()) < 2 * 60 * 60 * 1000;
    if (aBoosted && !bBoosted) return -1;
    if (!aBoosted && bBoosted) return 1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  return NextResponse.json({ matches: result });
}
