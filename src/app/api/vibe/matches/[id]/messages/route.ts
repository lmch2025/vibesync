// GET  /api/vibe/matches/[id]/messages — list messages AND gifts in the
// conversation, merged and ordered by createdAt. Gifts appear inline as
// special "gift bubbles" with a wrapped/opened state. Messages include
// status (sent/delivered/read), type (text/voice), and voice note metadata.
// On GET, all messages from the OTHER user are marked as "read".
// POST /api/vibe/matches/[id]/messages — send a message or voice note.
// PATCH /api/vibe/matches/[id]/messages — mark voice notes as listened.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { GEM_ACTIONS } from "@/lib/vibe/constants";
import { getSettings } from "@/lib/vibe/settings";
import { notifyMessage } from "@/lib/vibe/notify";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const match = await db.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  }
  const [messages, gifts] = await Promise.all([
    db.message.findMany({
      where: { matchId: id },
      orderBy: { createdAt: "asc" },
      include: { sender: { include: { profile: true } } },
    }),
    db.giftTx.findMany({
      where: { matchId: id },
      orderBy: { createdAt: "asc" },
      include: { gift: true, sender: { include: { profile: true } } },
    }),
  ]);

  // Mark all messages from the OTHER user as "read" (delivered → read).
  // This simulates WhatsApp's read receipts: opening the chat marks
  // incoming messages as read.
  const unreadFromOther = messages.filter(
    (m) => m.senderId !== user.id && m.status !== "read"
  );
  if (unreadFromOther.length > 0) {
    await db.message.updateMany({
      where: { id: { in: unreadFromOther.map((m) => m.id) } },
      data: { status: "read" },
    });
  }

  // Merge messages + gifts into a single timeline ordered by createdAt.
  type TimelineItem = {
    kind: "message";
    id: string;
    senderId: string;
    mine: boolean;
    text: string;
    type: string;
    boosted: boolean;
    status: string;
    voiceData: string | null;
    voiceDuration: number | null;
    voiceListened: boolean;
    createdAt: string;
    senderName: string;
  } | {
    kind: "gift";
    id: string;
    senderId: string;
    mine: boolean;
    giftKey: string;
    giftName: string;
    giftEmoji: string;
    gemCost: number;
    eurValueCents: number;
    opened: boolean;
    messageText: string | null;
    createdAt: string;
    senderName: string;
  };

  const timeline: TimelineItem[] = [
    ...messages.map((m) => ({
      kind: "message" as const,
      id: m.id,
      senderId: m.senderId,
      mine: m.senderId === user.id,
      text: m.text,
      type: m.type,
      boosted: m.boosted,
      status: m.senderId === user.id ? m.status : "read",
      voiceData: m.voiceData,
      voiceDuration: m.voiceDuration,
      voiceListened: m.voiceListened,
      createdAt: m.createdAt.toISOString(),
      senderName: m.sender.profile?.displayName ?? "Utilisateur",
    })),
    ...gifts.map((g) => ({
      kind: "gift" as const,
      id: g.id,
      senderId: g.senderId,
      mine: g.senderId === user.id,
      giftKey: g.gift.key,
      giftName: g.gift.name,
      giftEmoji: g.gift.emoji,
      gemCost: g.gift.gemCost,
      eurValueCents: g.gift.eurValueCents,
      opened: g.opened,
      messageText: g.messageText,
      createdAt: g.createdAt.toISOString(),
      senderName: g.sender.profile?.displayName ?? "Utilisateur",
    })),
  ];
  timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const myMessagesCount = messages.filter((m) => m.senderId === user.id && m.type === "text").length;
  const theirMessagesCount = messages.filter((m) => m.senderId !== user.id && m.type === "text").length;
  const isInitiator = match.initiatedById === user.id;
  const { maxMessagesBeforeReply } = await getSettings();
  const locked = isInitiator && !match.unlocked && myMessagesCount >= maxMessagesBeforeReply;
  return NextResponse.json({
    timeline,
    unlocked: match.unlocked,
    isInitiator,
    locked,
    myMessagesCount,
    theirMessagesCount,
    remainingBeforeLock: Math.max(0, maxMessagesBeforeReply - myMessagesCount),
    // The REAL admin-configured limit — the client must never hardcode it.
    maxMessagesBeforeReply,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({} as any));
  const { text, boost, type, voiceData, voiceDuration } = body;

  // Validate: either text or voice note must be present.
  if (type === "voice") {
    if (!voiceData || typeof voiceData !== "string") {
      return NextResponse.json({ error: "Donnée vocale manquante" }, { status: 400 });
    }
  } else {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }
  }

  const match = await db.match.findUnique({ where: { id } });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  }

  const isInitiator = match.initiatedById === user.id;
  // Count only text messages for anti-spam (voice notes don't count toward the limit).
  const myMessagesCount = await db.message.count({
    where: { matchId: id, senderId: user.id, type: "text" },
  });

  const { maxMessagesBeforeReply: msgLimit } = await getSettings();
  if (isInitiator && !match.unlocked && myMessagesCount >= msgLimit && type !== "voice") {
    return NextResponse.json(
      { error: "Anti-spam: attends une réponse pour continuer. Envoie un cadeau pour te démarquer !", locked: true },
      { status: 403 }
    );
  }

  const wantsBoost = !!boost;
  const cost = wantsBoost ? GEM_ACTIONS.messageBoost : 0;
  if (cost > 0 && user.gems < cost) {
    return NextResponse.json({ error: "Pas assez de Vibes pour le boost" }, { status: 402 });
  }

  const msg = await db.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        matchId: id,
        senderId: user.id,
        text: type === "voice" ? "" : text.trim(),
        type: type === "voice" ? "voice" : "text",
        voiceData: type === "voice" ? voiceData : null,
        voiceDuration: type === "voice" ? Number(voiceDuration) || 0 : null,
        boosted: wantsBoost,
        status: "sent",
      },
    });
    if (cost > 0) {
      // Deduct from freeGems first, then purchased.
      const freeUsed = Math.min(user.freeGems, cost);
      const res = await tx.user.updateMany({
        where: { id: user.id, gems: { gte: cost } },
        data: {
          gems: { decrement: cost },
          freeGems: { decrement: freeUsed },
        },
      });
      if (res.count === 0) {
        throw new Error("Pas assez de Vibes pour le boost");
      }
      await tx.gemTx.create({ data: { userId: user.id, delta: -cost, reason: "message_boost" } });
    }
    if (!isInitiator && !match.unlocked) {
      await tx.match.update({ where: { id }, data: { unlocked: true } });
    }
    return created;
  });

  // Notify the other user about the new message.
  const receiverId = match.userAId === user.id ? match.userBId : match.userAId;
  const senderName = user.profile?.displayName ?? "Quelqu'un";
  const preview = type === "voice" ? "🎙️ Message vocal" : (body.text || "").substring(0, 60);
  await notifyMessage(receiverId, senderName, preview, id);

  const updatedGems = await db.user.findUnique({ where: { id: user.id }, select: { gems: true, freeGems: true } });
  return NextResponse.json({
    ok: true,
    message: {
      id: msg.id,
      senderId: msg.senderId,
      text: msg.text,
      type: msg.type,
      boosted: msg.boosted,
      status: msg.status,
      voiceDuration: msg.voiceDuration,
      createdAt: msg.createdAt,
    },
    gems: updatedGems?.gems ?? user.gems,
    freeGems: updatedGems?.freeGems ?? user.freeGems,
    unlocked: !isInitiator ? true : match.unlocked,
  });
}

// PATCH — mark a voice note as listened (by the recipient).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { messageId } = await req.json().catch(() => ({} as any));
  if (!messageId) return NextResponse.json({ error: "messageId requis" }, { status: 400 });

  const msg = await db.message.findUnique({ where: { id: messageId } });
  if (!msg) return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  // Only the receiver can mark as listened.
  if (msg.senderId === user.id) {
    return NextResponse.json({ ok: true, alreadyMine: true });
  }
  if (msg.matchId !== id) {
    return NextResponse.json({ error: "Message n'appartient pas à ce match" }, { status: 400 });
  }
  if (!msg.voiceListened) {
    await db.message.update({
      where: { id: messageId },
      data: { voiceListened: true, status: "read" },
    });
  }
  return NextResponse.json({ ok: true, voiceListened: true });
}
