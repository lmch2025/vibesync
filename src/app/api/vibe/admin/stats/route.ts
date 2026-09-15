// GET /api/vibe/admin/stats — admin dashboard KPIs
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { PLATFORM_COMMISSION } from "@/lib/vibe/constants";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const [users, matches, messages, gifts, gemPurchases, profiles, reports, boosts] = await Promise.all([
    db.user.count(),
    db.match.count(),
    db.message.count(),
    db.giftTx.count(),
    db.gemTx.findMany({ where: { reason: "purchase" } }),
    db.profile.count(),
    db.videoReport.count(),
    db.boost.count(),
  ]);

  const revenueEurCents = gemPurchases.reduce((s, g) => s + (g.eurPaidCents ?? 0), 0);
  const giftsValueEurCents = (await db.giftTx.findMany({ include: { gift: true } })).reduce(
    (s, g) => s + g.gift.eurValueCents,
    0
  );
  const platformCommissionCents = Math.round(giftsValueEurCents * PLATFORM_COMMISSION);

  // Conversion rate
  const payingUsers = new Set(gemPurchases.map((g) => g.userId)).size;
  const conversionRate = users > 0 ? payingUsers / users : 0;

  // Match rate (matches / total swipes * 2 since each match needs 2 swipes)
  const totalSwipes = await db.swipe.count();
  const likeSwipes = await db.swipe.count({ where: { direction: { in: ["like", "superlike"] } } });
  const matchRate = likeSwipes > 0 ? matches / likeSwipes : 0;

  // DAU proxy: users created today (sandbox has no real session tracking)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dau = await db.user.count({ where: { createdAt: { gte: today } } });

  // Synthetic 7-day retention series (sandbox demo)
  const retention = [100, 62, 48, 41, 38, 35, 33];

  return NextResponse.json({
    kpis: {
      users,
      profiles,
      dau,
      matches,
      messages,
      gifts,
      boosts,
      reports,
      matchRate,
      conversionRate,
      revenueEurCents,
      giftsValueEurCents,
      platformCommissionCents,
      payingUsers,
    },
    series: {
      retention,
      // last 7 days synthetic gem revenue
      revenue: [420, 510, 480, 690, 720, 980, 1240],
      gifts: [38, 52, 41, 67, 73, 89, 102],
    },
  });
}
