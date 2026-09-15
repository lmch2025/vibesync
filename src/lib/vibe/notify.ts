// Server-side notification helper. Centralizes all notification creation logic
// so every API route can trigger notifications with a single function call.
import { db } from "@/lib/db";

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
  await notify(userId, "match", `Nouveau match ! 💜`, `${otherName} a aussi swipé à droite. Dis bonjour !`, "💕", null, { matchId });
}

/// Notify on gift received.
export async function notifyGift(userId: string, fromName: string, giftName: string, giftEmoji: string, matchId?: string) {
  await notify(userId, "gift", `Cadeau reçu ! ${giftEmoji}`, `${fromName} t'a offert ${giftName}. Tape pour l'ouvrir !`, giftEmoji, null, { matchId });
}

/// Notify on message received.
export async function notifyMessage(userId: string, fromName: string, preview: string, matchId: string) {
  await notify(userId, "message", fromName, preview.length > 50 ? preview.substring(0, 50) + "…" : preview, "💬", null, { matchId });
}

/// Notify on like received (when someone likes the user's profile).
export async function notifyLike(userId: string, fromName?: string) {
  await notify(userId, "like", `Quelqu'un t'a liké ! ❤️`, fromName ? `${fromName} a swipé à droite sur ton profil.` : "Quelqu'un a swipé à droite sur ton profil.", "❤️");
}

/// Notify on superlike received.
export async function notifySuperlike(userId: string, fromName?: string) {
  await notify(userId, "superlike", `Super-Like ! ⭐`, fromName ? `${fromName} t'a super-liké — tu es en haut de sa file !` : "Quelqu'un t'a super-liké !", "⭐");
}

/// Streak reminder (marketing).
export async function notifyStreakReminder(userId: string, currentStreak: number) {
  const reward = Math.min(20, (currentStreak + 1) * 2);
  await notify(userId, "streak", `🔥 N'oublie pas ta série !`, `Tu es à ${currentStreak} jour(s). Réclame +${reward} Vibes maintenant !`, "🔥");
}

/// Boost expired.
export async function notifyBoostExpired(userId: string) {
  await notify(userId, "boost_expired", `Boost terminé 🚀`, `Ton boost a expiré. Relance pour rester en haut de la file !`, "🚀");
}

/// Withdrawal status update.
export async function notifyWithdrawal(userId: string, status: string, amountEur: string) {
  const statusLabels: Record<string, { title: string; body: string; icon: string }> = {
    processing: { title: "Retrait en cours 💸", body: `Ton retrait de ${amountEur} est en cours de traitement.`, icon: "⏳" },
    completed: { title: "Retrait effectué ✅", body: `${amountEur} ont été versés sur ton compte.`, icon: "✅" },
    rejected: { title: "Retrait refusé ❌", body: `Ton retrait de ${amountEur} a été refusé. Contacte le support.`, icon: "❌" },
  };
  const info = statusLabels[status] || { title: "Mise à jour du retrait", body: `Statut: ${status}`, icon: "💸" };
  await notify(userId, "withdrawal", info.title, info.body, info.icon);
}

/// Marketing: welcome series.
export async function notifyWelcome(userId: string) {
  await notify(userId, "marketing", "Bienvenue sur Vivilov ! 🎉", "Tu as 25 Vibes offertes. Swipe, match, et offre des cadeaux !", "🎁");
}

/// Marketing: profile incomplete reminder.
export async function notifyProfileIncomplete(userId: string) {
  await notify(userId, "marketing", "Complète ton profil 📹", "Ajoute ta vidéo de 15s pour apparaître dans le swipe et recevoir des cadeaux !", "📹");
}

/// Marketing: no matches reminder.
export async function notifyNoMatches(userId: string) {
  await notify(userId, "marketing", "Ton premier match t'attend ! 💜", "Continue à swiper — plus tu swipes, plus tu as de chances de matcher.", "💜");
}
