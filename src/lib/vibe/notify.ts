// Server-side notification helper. Centralizes all notification creation logic
// so every API route can trigger notifications with a single function call.
// Bilingue : chaque notification est créée dans la langue du compte du
// destinataire (User.lang, repli "fr") — voir lib/vibe/i18n.
import { db } from "@/lib/db";
import { getUserLang, tFor } from "@/lib/vibe/i18n/server";
import type { Lang } from "@/lib/vibe/i18n/core";

export type NotificationType =
  | "match" | "gift" | "message" | "like" | "superlike"
  | "streak" | "boost_expired" | "marketing" | "system" | "withdrawal";

/// Create a notification for a user. Safe to call from any API route.
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  icon: string = "🔔",
  actionUrl: string | null = null,
  metadata: Record<string, any> | null = null,
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        icon,
        actionUrl,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (e) {
    // Silently fail — notifications are non-critical.
    console.error("[notify] Failed:", e);
  }
}

/// Notify on match creation.
export async function notifyMatch(userId: string, otherName: string, matchId: string) {
  const lang = await getUserLang(userId);
  await notify(userId, "match", tFor(lang, "notif.match.title"), tFor(lang, "notif.match.body", { name: otherName }), "💕", null, { matchId });
}

/// Notify on gift received.
export async function notifyGift(userId: string, fromName: string, giftName: string, giftEmoji: string, matchId?: string) {
  const lang = await getUserLang(userId);
  await notify(userId, "gift", tFor(lang, "notif.gift.title", { emoji: giftEmoji }), tFor(lang, "notif.gift.body", { name: fromName, gift: giftName }), giftEmoji, null, { matchId });
}

/// Notify on message received (preview = raw user content, non traduit).
export async function notifyMessage(userId: string, fromName: string, preview: string, matchId: string) {
  await notify(userId, "message", fromName, preview.length > 50 ? preview.substring(0, 50) + "…" : preview, "💬", null, { matchId });
}

/// Notify on like received (when someone likes the user's profile).
export async function notifyLike(userId: string, fromName?: string) {
  const lang = await getUserLang(userId);
  await notify(userId, "like", tFor(lang, "notif.like.title"), tFor(lang, fromName ? "notif.like.body.name" : "notif.like.body.anon", fromName ? { name: fromName } : undefined), "❤️");
}

/// Notify on superlike received.
export async function notifySuperlike(userId: string, fromName?: string) {
  const lang = await getUserLang(userId);
  await notify(userId, "superlike", tFor(lang, "notif.superlike.title"), tFor(lang, fromName ? "notif.superlike.body.name" : "notif.superlike.body.anon", fromName ? { name: fromName } : undefined), "⭐");
}

/// Streak reminder (marketing).
export async function notifyStreakReminder(userId: string, currentStreak: number) {
  const lang = await getUserLang(userId);
  const reward = Math.min(20, (currentStreak + 1) * 2);
  await notify(userId, "streak", tFor(lang, "notif.streak.title"), tFor(lang, "notif.streak.body", { days: currentStreak, reward }), "🔥");
}

/// Boost expired.
export async function notifyBoostExpired(userId: string) {
  const lang = await getUserLang(userId);
  await notify(userId, "boost_expired", tFor(lang, "notif.boostExpired.title"), tFor(lang, "notif.boostExpired.body"), "🚀");
}

/// Withdrawal status update.
export async function notifyWithdrawal(userId: string, status: string, amountEur: string) {
  const lang: Lang = await getUserLang(userId);
  const map: Record<string, { titleKey: string; bodyKey: string; icon: string }> = {
    processing: { titleKey: "notif.withdraw.processing.title", bodyKey: "notif.withdraw.processing.body", icon: "⏳" },
    completed: { titleKey: "notif.withdraw.completed.title", bodyKey: "notif.withdraw.completed.body", icon: "✅" },
    rejected: { titleKey: "notif.withdraw.rejected.title", bodyKey: "notif.withdraw.rejected.body", icon: "❌" },
  };
  const info = map[status];
  if (info) {
    await notify(userId, "withdrawal", tFor(lang, info.titleKey), tFor(lang, info.bodyKey, { amount: amountEur }), info.icon);
  } else {
    await notify(userId, "withdrawal", tFor(lang, "notif.withdraw.updated.title"), tFor(lang, "notif.withdraw.updated.body", { status }), "💸");
  }
}

/// Marketing: welcome series.
export async function notifyWelcome(userId: string, welcomeGems = 25) {
  const lang = await getUserLang(userId);
  await notify(userId, "marketing", tFor(lang, "notif.welcome.title"), tFor(lang, "notif.welcome.body", { gems: welcomeGems }), "🎁");
}

/// Marketing: profile incomplete reminder.
export async function notifyProfileIncomplete(userId: string) {
  const lang = await getUserLang(userId);
  await notify(userId, "marketing", tFor(lang, "notif.profileIncomplete.title"), tFor(lang, "notif.profileIncomplete.body"), "📹");
}

/// Marketing: no matches reminder.
export async function notifyNoMatches(userId: string) {
  const lang = await getUserLang(userId);
  await notify(userId, "marketing", tFor(lang, "notif.noMatches.title"), tFor(lang, "notif.noMatches.body"), "💜");
}
