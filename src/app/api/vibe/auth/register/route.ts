// POST /api/vibe/auth/register
// New user: creates account with PIN + currency detected from country header.
// If a user exists WITHOUT a pinHash (seeded demo profile), upserts the PIN
// instead of returning a 409 — so the "existing seed user" flow is playable.
// Returns the user + rates directly so the client can transition without a
// second /me fetch (important in cross-site iframe contexts where the session
// cookie may not be sent on the immediate next request).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setCurrentUser, hashPin } from "@/lib/vibe/session";
import { detectCurrencyFromCountry, FALLBACK_RATES } from "@/lib/vibe/constants";
import { getSettings } from "@/lib/vibe/settings";
import { notifyWelcome } from "@/lib/vibe/notify";

export async function POST(req: Request) {
  const { phone, pin } = await req.json().catch(() => ({} as any));
  if (!phone || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Phone ou PIN invalide" }, { status: 400 });
  }
  const normalized = phone.trim();
  const country = req.headers.get("x-vercel-ip-country") || req.headers.get("x-country") || "CM";
  const currency = detectCurrencyFromCountry(country);

  // Parallelize independent queries: user lookup + settings + rates.
  const [existing, { welcomeGems }, rateRows] = await Promise.all([
    db.user.findUnique({ where: { phone: normalized }, include: { profile: true } }),
    getSettings(),
    db.exchangeRate.findMany(),
  ]);

  // User already has a PIN → real conflict, cannot re-register.
  if (existing?.pinHash) {
    return NextResponse.json({ error: "Compte déjà existant" }, { status: 409 });
  }

  let user;
  let gaveWelcome = false;
  const pinHash = hashPin(pin);

  if (existing) {
    // Seed-created user with a profile but no PIN — assign the PIN now.
    user = await db.user.update({
      where: { id: existing.id },
      data: {
        pinHash,
        currency: existing.currency ?? currency,
        country: existing.country ?? country ?? null,
      },
      include: { profile: true },
    });
  } else {
    // Brand new user — create + gemTx in parallel after create.
    user = await db.user.create({
      data: {
        phone: normalized,
        pinHash,
        currency,
        country: country ?? null,
        gems: welcomeGems,
        freeGems: welcomeGems, // welcome bonus is free (not usable for gifts)
      },
      include: { profile: true },
    });
    // GemTx is non-critical, run it in parallel with session cookie.
    db.gemTx.create({ data: { userId: user.id, delta: welcomeGems, reason: "welcome" } }).catch(() => {});
    gaveWelcome = true;
  }

  // Set session cookie + fire welcome notification in parallel (notification is non-blocking).
  await setCurrentUser(user.id);

  // Fire-and-forget: welcome notification does not block the response.
  if (gaveWelcome) {
    notifyWelcome(user.id).catch(() => {});
  }

  // Build rates from pre-fetched rows.
  const rates: Record<string, number> = { ...FALLBACK_RATES };
  for (const r of rateRows) rates[r.currency] = r.rate;

  return NextResponse.json({
    ok: true,
    gaveWelcome,
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
