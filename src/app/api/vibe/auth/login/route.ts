// POST /api/vibe/auth/login
// Existing user: verify PIN and start session.
// Returns the user + rates directly so the client can transition without a
// second /me fetch (robust against cross-site iframe cookie restrictions).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setCurrentUser, verifyPin } from "@/lib/vibe/session";
import { detectCurrencyFromCountry, FALLBACK_RATES } from "@/lib/vibe/constants";

export async function POST(req: Request) {
  const { phone, pin } = await req.json().catch(() => ({} as any));
  if (!phone || !pin) {
    return NextResponse.json({ error: "Phone ou PIN manquant" }, { status: 400 });
  }
  const normalized = phone.trim();

  // Parallelize user lookup + rates fetch.
  const [user, rateRows] = await Promise.all([
    db.user.findUnique({ where: { phone: normalized }, include: { profile: true } }),
    db.exchangeRate.findMany(),
  ]);

  if (!user || !user.pinHash) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  }
  if (user.banned) {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }
  if (!verifyPin(pin, user.pinHash)) {
    return NextResponse.json({ error: "PIN incorrect" }, { status: 401 });
  }

  // Refresh currency from geo if missing (fire-and-forget, non-blocking).
  if (!user.country) {
    const country = req.headers.get("x-vercel-ip-country") || req.headers.get("x-country") || null;
    if (country) {
      const newCurrency = detectCurrencyFromCountry(country);
      user.currency = newCurrency;
      user.country = country;
      db.user.update({
        where: { id: user.id },
        data: { country, currency: newCurrency },
      }).catch(() => {});
    }
  }

  await setCurrentUser(user.id);

  // Build rates from pre-fetched rows.
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
