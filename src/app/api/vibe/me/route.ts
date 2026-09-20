// GET /api/vibe/me — current user snapshot (gems, wallet, profile, currency, rates)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { isValidLang } from "@/lib/vibe/i18n/core";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  const rates = await db.exchangeRate.findMany();
  const rateMap: Record<string, number> = {};
  for (const r of rates) rateMap[r.currency] = r.rate;
  return NextResponse.json({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      currency: user.currency,
      lang: user.lang,
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
            videoDuration: user.profile.videoDuration,
            videoUrl2: user.profile.videoUrl2,
            posterUrl2: user.profile.posterUrl2,
            videoUrl3: user.profile.videoUrl3,
            posterUrl3: user.profile.posterUrl3,
            // Photos de profil (max 5) — affichées uniquement si aucune vidéo.
            photos: [
              user.profile.photoUrl1,
              user.profile.photoUrl2,
              user.profile.photoUrl3,
              user.profile.photoUrl4,
              user.profile.photoUrl5,
            ].filter(Boolean),
            gender: user.profile.gender,
            lookingFor: user.profile.lookingFor,
            lat: user.profile.lat,
            lng: user.profile.lng,
            vibeQuestion: user.profile.vibeQuestion,
            vibeAnswer: user.profile.vibeAnswer,
            // Discovery filters — kept in sync for the filter sheet UI.
            prefMinAge: user.profile.prefMinAge,
            prefMaxAge: user.profile.prefMaxAge,
            prefMaxDistance: user.profile.prefMaxDistance,
          }
        : null,
    },
    rates: rateMap,
  });
}

// PATCH /api/vibe/me — persiste la langue UI choisie par l'utilisateur
// (appelé par le sélecteur FR/EN). Choix explicite → suit le compte sur
// tous ses appareils.
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  if (!isValidLang(body?.lang)) {
    return NextResponse.json({ error: "Langue invalide" }, { status: 400 });
  }
  await db.user.update({ where: { id: user.id }, data: { lang: body.lang } });
  return NextResponse.json({ ok: true, lang: body.lang });
}
