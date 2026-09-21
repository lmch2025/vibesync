// POST /api/vibe/onboarding
// 3-step onboarding data collection. Creates or updates the user's Profile
// and marks onboardingComplete = true. Video is optional.
// Fields: pseudo, gender (f|m|nb), lookingFor (f|m|nb|all), age (16-100),
// city (chaîne d'affichage « Nom, Pays »), cityCountryCode?/cityLat?/cityLng?
// (sélection structurée — voie PRIVILÉGIÉE : validation mondiale nom+pays via
// le dataset géo 148k villes, coords du dataset), videoUrl?, posterUrl?,
// photos? (string[], max 5 — data URL image sandbox ou URL http(s) CDN)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { CITIES } from "@/lib/vibe/cities";
import { findGeoCity } from "@/lib/vibe/geo/city-search";
import { FALLBACK_RATES } from "@/lib/vibe/constants";

const MAX_PHOTOS = 5;
// Tolérante : la compression client vise ~500 Ko mais on accepte jusqu'à ~3 Mo
// par data URL pour ne jamais bloquer un envoi légitime.
const MAX_DATA_URL_LENGTH = 3 * 1024 * 1024;

/// Une photo est valide s'il s'agit d'une data URL d'image ou d'une URL
/// http(s) (CDN — idéalement Cloudinary).
function isValidPhoto(s: string): boolean {
  if (typeof s !== "string" || s.length === 0) return false;
  if (s.startsWith("data:image/")) return s.length <= MAX_DATA_URL_LENGTH;
  return /^https?:\/\//i.test(s);
}

/// Valide le tableau `photos` optionnel. Renvoie soit un message d'erreur,
/// soit le tableau compacté (trimmé) à écrire dans photoUrl1..5.
function parsePhotos(raw: unknown): { error: string } | { photos: string[] } {
  if (raw === undefined || raw === null) return { photos: [] };
  if (!Array.isArray(raw)) return { error: "photos doit être un tableau" };
  if (raw.length > MAX_PHOTOS) return { error: `Maximum ${MAX_PHOTOS} photos` };
  for (const photo of raw) {
    if (typeof photo !== "string" || photo.trim().length === 0) {
      return { error: "Photo invalide (chaîne vide)" };
    }
    if (!isValidPhoto(photo)) {
      return { error: "Photo invalide — data URL d'image ou URL http(s) requise (max ~3 Mo)" };
    }
  }
  return { photos: raw.map((p: string) => p.trim()) };
}

/// Re-mappe un tableau compacté vers les 5 slots photoUrl1..photoUrl5.
function toPhotoSlots(photos: string[]): {
  photoUrl1: string;
  photoUrl2: string;
  photoUrl3: string;
  photoUrl4: string;
  photoUrl5: string;
} {
  const slots = [0, 1, 2, 3, 4].map((i) => photos[i] ?? "");
  return {
    photoUrl1: slots[0],
    photoUrl2: slots[1],
    photoUrl3: slots[2],
    photoUrl4: slots[3],
    photoUrl5: slots[4],
  };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const {
    pseudo,
    gender,
    lookingFor,
    relationshipType,
    age,
    city,
    cityCountryCode,
    cityLat,
    cityLng,
    videoUrl,
    posterUrl,
    videoDuration,
  } = body;

  // Photos optionnelles (max 5) — même validation que /api/vibe/profile/photos.
  const photosResult = parsePhotos(body.photos);
  if ("error" in photosResult) {
    return NextResponse.json({ error: photosResult.error }, { status: 400 });
  }
  const photoSlots = toPhotoSlots(photosResult.photos);

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
  // City — validation stricte (sélection dans la liste, jamais une saisie
  // libre). Deux chemins :
  //  • NOUVEAU (privilégié) : cityCountryCode fourni → lookup exact
  //    nom+pays dans le dataset mondial (findGeoCity, insensible aux
  //    accents). Les lat/lng du DATASET font foi (jamais ceux du client) ;
  //    les coordonnées client ne servent qu'au départage des homonymes.
  //    profile.city stocke le NOM SEUL — format historique crucial : le
  //    deck et le Passport matchent les profils par égalité de chaîne sur
  //    profile.city.
  //  • HÉRITAGE : vieux clients sans cityCountryCode → ancienne liste locale
  //    CITIES (le client y envoie « Nom, Pays » ou « Nom »).
  const cityRaw = typeof city === "string" ? city.trim() : "";
  // Le client envoie « Nom, Pays » — le serveur valide le NOM SEUL.
  const cityName = cityRaw.includes(",") ? cityRaw.slice(0, cityRaw.indexOf(",")).trim() : cityRaw;
  let cityMatch: { name: string; lat: number; lng: number } | null = null;

  if (typeof cityCountryCode === "string" && /^[a-zA-Z]{2}$/.test(cityCountryCode)) {
    const latNum = Number(cityLat);
    const lngNum = Number(cityLng);
    const found = findGeoCity(
      cityName,
      cityCountryCode,
      Number.isFinite(latNum) ? latNum : undefined,
      Number.isFinite(lngNum) ? lngNum : undefined,
    );
    if (found) cityMatch = { name: found.name, lat: found.lat, lng: found.lng };
  }
  if (!cityMatch) {
    // Repli héritage — vieux clients encore déployés (pas de champs
    // structurés). Correspondance exacte sur l'ancienne liste locale.
    const legacy = CITIES.find((c) => `${c.name}, ${c.country}` === cityRaw || c.name === cityRaw);
    if (legacy) cityMatch = { name: legacy.name, lat: legacy.lat, lng: legacy.lng };
  }
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
        // Photos de profil (max 5) — compactées dans les slots 1..N.
        ...photoSlots,
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
        // Photos de profil (max 5) — compactées dans les slots 1..N.
        ...photoSlots,
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
                videoDuration: updatedUser.profile.videoDuration,
                videoUrl2: updatedUser.profile.videoUrl2,
                posterUrl2: updatedUser.profile.posterUrl2,
                videoUrl3: updatedUser.profile.videoUrl3,
                posterUrl3: updatedUser.profile.posterUrl3,
                // Photos (set compacté) — sans ce champ, l'onglet Profil
                // affichait « 0/5 » juste après l'onboarding avec photos.
                photos: [
                  updatedUser.profile.photoUrl1,
                  updatedUser.profile.photoUrl2,
                  updatedUser.profile.photoUrl3,
                  updatedUser.profile.photoUrl4,
                  updatedUser.profile.photoUrl5,
                ].filter(Boolean),
                gender: updatedUser.profile.gender,
                lookingFor: updatedUser.profile.lookingFor,
                lat: updatedUser.profile.lat,
                lng: updatedUser.profile.lng,
                vibeQuestion: updatedUser.profile.vibeQuestion,
                vibeAnswer: updatedUser.profile.vibeAnswer,
              }
            : null,
        }
      : null,
    rates,
  });
}
