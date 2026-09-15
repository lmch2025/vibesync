// POST /api/vibe/onboarding
// 3-step onboarding data collection. Creates or updates the user's Profile
// and marks onboardingComplete = true. Video is optional.
// Fields: pseudo, gender (f|m|nb), lookingFor (f|m|nb|all), age (16-100),
// city (must be a valid selection from /api/vibe/cities), videoUrl?, posterUrl?
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { CITIES } from "@/lib/vibe/cities";
import { FALLBACK_RATES } from "@/lib/vibe/constants";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const { pseudo, gender, lookingFor, relationshipType, age, city, videoUrl, posterUrl, videoDuration } = body;

  // Validation
  if (!pseudo || typeof pseudo !== "string" || pseudo.trim().length < 2 || pseudo.trim().length > 20) {
    return NextResponse.json({ error: "Pseudo invalide (2-20 caractères)" }, { status: 400 });
  }
  if (!["f", "m", "nb"].includes(gender)) {
    return NextResponse.json({ error: "Sexe invalide" }, { status: 400 });
  }
  if (!["f", "m", "nb", "all"].includes(lookingFor)) {
    return NextResponse.json({ error: "Sexe recherché invalide" }, { status: 400 });
  }
  const ageNum = Number(age);
  if (!Number.isInteger(ageNum) || ageNum < 16 || ageNum > 100) {
    return NextResponse.json({ error: "Âge invalide (16-100)" }, { status: 400 });
  }
  // City must be an EXACT selection (validate against the dataset).
  const cityMatch = CITIES.find((c) => `${c.name}, ${c.country}` === city || c.name === city);
  if (!cityMatch) {
    return NextResponse.json({ error: "Ville invalide — sélectionne dans la liste" }, { status: 400 });
  }

  const validRelTypes = ["serious", "casual", "friendship"];
  const finalRelType = validRelTypes.includes(relationshipType) ? relationshipType : "serious";

  const finalVideoUrl = videoUrl || "";
  const finalPosterUrl = posterUrl || "";
  const finalDuration = videoDuration ? Number(videoDuration) : 0;
  const hasVideo = !!videoUrl;

  // Create or update the profile
  const existing = await db.profile.findUnique({ where: { userId: user.id } });
  if (existing) {
    await db.profile.update({
      where: { id: existing.id },
      data: {
        displayName: pseudo.trim(),
        age: ageNum,
        city: cityMatch.name,
        bio: existing.bio || "",
        videoUrl: finalVideoUrl,
        posterUrl: finalPosterUrl,
        videoDuration: finalDuration,
        gender,
        lookingFor,
        relationshipType: finalRelType,
        lat: cityMatch.lat,
        lng: cityMatch.lng,
        modStatus: hasVideo ? "pending" : "approved",
      },
    });
  } else {
    await db.profile.create({
      data: {
        userId: user.id,
        displayName: pseudo.trim(),
        age: ageNum,
        city: cityMatch.name,
        bio: "",
        videoUrl: finalVideoUrl,
        posterUrl: finalPosterUrl,
        videoDuration: finalDuration,
        gender,
        lookingFor,
        relationshipType: finalRelType,
        lat: cityMatch.lat,
        lng: cityMatch.lng,
        modStatus: hasVideo ? "pending" : "approved",
      },
    });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: pseudo.trim(),
      onboardingComplete: true,
    },
  });

  // Return the fresh user + profile + rates so the client transitions without
  // a second /me fetch (iframe-safe).
  const updatedUser = await db.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });
  const rateRows = await db.exchangeRate.findMany();
  const rates: Record<string, number> = { ...FALLBACK_RATES };
  for (const r of rateRows) rates[r.currency] = r.rate;

  return NextResponse.json({
    ok: true,
    user: updatedUser
      ? {
          id: updatedUser.id,
          phone: updatedUser.phone,
          name: updatedUser.name,
          role: updatedUser.role,
          currency: updatedUser.currency,
          country: updatedUser.country,
          gems: updatedUser.gems,
          walletEurCents: updatedUser.walletEurCents,
          verified: updatedUser.verified,
          onboardingComplete: updatedUser.onboardingComplete,
          profile: updatedUser.profile
            ? {
                id: updatedUser.profile.id,
                displayName: updatedUser.profile.displayName,
                age: updatedUser.profile.age,
                city: updatedUser.profile.city,
                bio: updatedUser.profile.bio,
                videoUrl: updatedUser.profile.videoUrl,
                posterUrl: updatedUser.profile.posterUrl,
                vibeQuestion: updatedUser.profile.vibeQuestion,
                vibeAnswer: updatedUser.profile.vibeAnswer,
              }
            : null,
        }
      : null,
    rates,
  });
}
