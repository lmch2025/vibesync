// GET  /api/vibe/streak — get current streak status
// POST /api/vibe/streak/claim — claim today's streak reward
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { notifyStreakReminder } from "@/lib/vibe/notify";

/// Streak reward table: day N gives N*2 Vibes (capped at 20).
function streakReward(day: number): number {
  return Math.min(20, day * 2);
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const today = todayISO();
  const yesterday = yesterdayISO();

  // Check if streak should be reset (missed a day).
  let streak = user.streak;
  if (user.lastStreakDay && user.lastStreakDay !== today && user.lastStreakDay !== yesterday) {
    // Streak broken — reset to 0.
    streak = 0;
    await db.user.update({
      where: { id: user.id },
      data: { streak: 0, streakRewardClaimed: false },
    });
  }

  const canClaim = user.lastStreakDay !== today;
  const todayReward = streakReward(streak + (canClaim ? 1 : 0));

  // Send a streak reminder notification if the user can claim (once per day).
  if (canClaim && streak > 0) {
    // Check if we already sent a streak reminder today (avoid duplicates).
    const existing = await db.notification.findFirst({
      where: {
        userId: user.id,
        type: "streak",
        createdAt: { gte: new Date(today) },
      },
    });
    if (!existing) {
      await notifyStreakReminder(user.id, streak);
    }
  }

  return NextResponse.json({
    streak,
    streakMax: user.streakMax,
    canClaim,
    todayReward,
    nextReward: streakReward(streak + (canClaim ? 2 : 1)),
    streakRewardClaimed: user.streakRewardClaimed,
    rewards: Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      reward: streakReward(i + 1),
      claimed: i < streak,
    })),
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const today = todayISO();
  const yesterday = yesterdayISO();

  // Already claimed today?
  if (user.lastStreakDay === today) {
    return NextResponse.json({ error: "Déjà réclamé aujourd'hui" }, { status: 400 });
  }

  // Determine new streak.
  let newStreak: number;
  if (user.lastStreakDay === yesterday) {
    newStreak = user.streak + 1; // continue streak
  } else {
    newStreak = 1; // start new streak
  }

  // Calculate reward (doubled if dailyDouble was purchased).
  let reward = streakReward(newStreak);
  const doubled = !user.streakRewardClaimed && user.lastStreakDay !== today && user.streak > 0;
  // The dailyDouble flag: if user bought it, the reward is doubled.
  // We check this by looking at whether streakRewardClaimed was set to false
  // after a dailyDouble purchase (the spend API sets it to false to allow re-claim).
  // For simplicity in this sandbox: if reward > 0 and the user has gems spent on dailyDouble today.
  // We'll just double if the flag was specifically toggled.
  if (doubled) reward *= 2;

  await db.user.update({
    where: { id: user.id },
    data: {
      streak: newStreak,
      streakMax: Math.max(user.streakMax, newStreak),
      lastStreakDay: today,
      streakRewardClaimed: true,
      gems: { increment: reward },
      freeGems: { increment: reward }, // streak rewards are FREE Vibes
    },
  });
  await db.gemTx.create({
    data: { userId: user.id, delta: reward, reason: "streak_reward" },
  });

  const updated = await db.user.findUnique({
    where: { id: user.id },
    select: { gems: true, freeGems: true, streak: true, streakMax: true },
  });

  return NextResponse.json({
    ok: true,
    streak: newStreak,
    reward,
    doubled,
    gems: updated?.gems,
    freeGems: updated?.freeGems,
    streakMax: updated?.streakMax,
    message: doubled
      ? `🔥 Streak ${newStreak} jours ! +${reward} Vibes (doublé !) 🎲`
      : `🔥 Streak ${newStreak} jours ! +${reward} Vibes`,
  });
}
