// POST /api/vibe/auth/demo-admin
// Sandbox-only shortcut: logs in as the seeded admin user so the admin
// dashboard preview is reachable. In production this route does NOT exist.
// Returns user + rates directly (no second /me fetch needed — iframe-safe).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setCurrentUser } from "@/lib/vibe/session";
import { FALLBACK_RATES } from "@/lib/vibe/constants";

export async function POST() {
  const user = await db.user.findFirst({
    where: { role: "admin" },
    include: { profile: true },
  });
  if (!user) return NextResponse.json({ error: "Aucun admin seedé" }, { status: 500 });
  await setCurrentUser(user.id);

  const rateRows = await db.exchangeRate.findMany();
  const rates: Record<string, number> = { ...FALLBACK_RATES };
  for (const r of rateRows) rates[r.currency] = r.rate;

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      currency: user.currency,
      country: user.country,
      gems: user.gems,
      freeGems: user.freeGems,
      walletEurCents: user.walletEurCents,
      verified: user.verified,
      onboardingComplete: user.onboardingComplete,
      profile: user.profile
        ? {
            id: user.profile.id,
            displayName: user.profile.displayName,
            age: user.profile.age,
            city: user.profile.city,
            bio: user.profile.bio,
            videoUrl: user.profile.videoUrl,
            posterUrl: user.profile.posterUrl,
            vibeQuestion: user.profile.vibeQuestion,
            vibeAnswer: user.profile.vibeAnswer,
          }
        : null,
    },
    rates,
  });
}
