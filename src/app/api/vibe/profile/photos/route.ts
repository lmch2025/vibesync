// POST /api/vibe/profile/photos — replace the whole photo set (up to 5).
//
// Body: `{ photos: string[] }`
//   - Array of 0..5 items, each a non-empty string
//   - Each item is either a `data:image/...` base64 URL (sandbox fallback,
//     client-side compression keeps each one ≲ 3 MB) or an http(s) CDN URL
//     (ideally Cloudinary)
//   - Photos are written into photoUrl1..photoUrlN and the slots beyond the
//     array length are reset to "" (compaction — no holes in the middle)
//   - modStatus is NOT touched (consistent with the existing PATCH profile)
//
// DELETE /api/vibe/profile/photos?index=1..5 — remove ONE slot and compact:
// the following photos move up by one slot, the trailing slots are reset to "".
//
// Règle métier : la vidéo garde la priorité d'affichage — les photos ne sont
// montrées que si le profil n'a AUCUNE vidéo (cette route ne fait que stocker).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";

const MAX_PHOTOS = 5;
// Tolérante : la compression client vise ~500 Ko mais on accepte jusqu'à ~3 Mo
// par data URL pour ne jamais bloquer un envoi légitime.
const MAX_DATA_URL_LENGTH = 3 * 1024 * 1024;

/// Un item photo est valide s'il s'agit d'une data URL d'image ou d'une
/// URL http(s) (CDN — idéalement Cloudinary).
function isValidPhoto(s: string): boolean {
  if (typeof s !== "string" || s.length === 0) return false;
  if (s.startsWith("data:image/")) return s.length <= MAX_DATA_URL_LENGTH;
  return /^https?:\/\//i.test(s);
}

/// Re-mappe un tableau compacté vers les 5 slots photoUrl1..photoUrl5.
function toSlots(photos: string[]): {
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

/// Lit les 5 slots et renvoie le tableau compacté (sans trous).
function readPhotos(p: {
  photoUrl1: string;
  photoUrl2: string;
  photoUrl3: string;
  photoUrl4: string;
  photoUrl5: string;
}): string[] {
  return [p.photoUrl1, p.photoUrl2, p.photoUrl3, p.photoUrl4, p.photoUrl5].filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const photos = body.photos;

    if (!Array.isArray(photos)) {
      return NextResponse.json({ error: "photos doit être un tableau" }, { status: 400 });
    }
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos` }, { status: 400 });
    }
    for (const photo of photos) {
      if (typeof photo !== "string" || photo.trim().length === 0) {
        return NextResponse.json({ error: "Photo invalide (chaîne vide)" }, { status: 400 });
      }
      if (!isValidPhoto(photo)) {
        return NextResponse.json(
          { error: "Photo invalide — data URL d'image ou URL http(s) requise (max ~3 Mo)" },
          { status: 400 }
        );
      }
    }

    // Trim + compaction : on écrit les N photos dans les slots 1..N et on
    // remet les suivantes à "" (aucun trou au milieu du set).
    const compacted = photos.map((p: string) => p.trim()).slice(0, MAX_PHOTOS);

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    await db.profile.update({
      where: { id: profile.id },
      data: toSlots(compacted),
    });

    return NextResponse.json({ ok: true, photos: compacted });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 }
    );
  }
}

/// DELETE /api/vibe/profile/photos?index=1..5 — retire la photo du slot donné
/// puis compacte (les photos suivantes remontent d'un cran).
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const index = parseInt(searchParams.get("index") || "1", 10);
    if (![1, 2, 3, 4, 5].includes(index)) {
      return NextResponse.json({ error: "index invalide (1-5)" }, { status: 400 });
    }

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

    const current = readPhotos(profile);
    // Retire le slot demandé (base 1 → base 0) puis compacte automatiquement
    // puisque filter(Boolean) supprime le trou et toSlots renumérote 1..N.
    const compacted = current.filter((_, i) => i !== index - 1);

    await db.profile.update({
      where: { id: profile.id },
      data: toSlots(compacted),
    });

    return NextResponse.json({ ok: true, photos: compacted });
  } catch (e) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
