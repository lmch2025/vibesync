// GET    /api/vibe/admin/landing-video — URL de la vidéo d'accueil active
// POST   /api/vibe/admin/landing-video — upload d'une nouvelle vidéo (Vercel Blob)
// DELETE /api/vibe/admin/landing-video — suppression (retour à la vidéo locale)
//
// La vidéo de fond de la page d'accueil est administrable : l'admin uploade
// un fichier (webm/mp4/mov, ≤ 12 Mo) stocké dans Vercel Blob (public), et
// l'URL est persistée dans la clé Setting `landingVideoUrl`. La suppression
// efface le blob ET la clé — la page retombe sur /profiles/swipe-bg.webm.
//
// Prérequis : un Blob Store Vercel attaché au projet + la variable
// d'environnement BLOB_READ_WRITE_TOKEN (Dashboard Vercel → Storage).
import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/vibe/session";
import { refreshSettings } from "@/lib/vibe/settings";

const SETTING_KEY = "landingVideoUrl";
const MAX_BYTES = 12 * 1024 * 1024; // 12 Mo
const ALLOWED_TYPES = new Set([
  "video/webm",
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-matroska",
]);
// Extensions acceptées en secours (certains navigateurs envoient un type vide).
const ALLOWED_EXT = /\.(webm|mp4|mov|mkv)$/i;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const row = await db.setting
    .findUnique({ where: { key: SETTING_KEY } })
    .catch(() => null);
  return NextResponse.json({ url: row?.value ?? "" });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Fichier manquant (champ « file »)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Vidéo trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo) — 12 Mo max.` },
      { status: 413 }
    );
  }
  const typeOk =
    (file.type && ALLOWED_TYPES.has(file.type)) || ALLOWED_EXT.test(file.name);
  if (!typeOk) {
    return NextResponse.json(
      { error: "Format non supporté — utilisez WebM, MP4, MOV ou MKV." },
      { status: 415 }
    );
  }

  // Récupère l'ancienne URL pour nettoyage du blob après remplacement.
  const previous = await db.setting
    .findUnique({ where: { key: SETTING_KEY } })
    .catch(() => null);

  try {
    const ext = (file.name.match(ALLOWED_EXT)?.[0] ?? ".webm").toLowerCase();
    const blob = await put(`landing/hero-${Date.now()}${ext}`, file, {
      access: "public",
      contentType: file.type || "video/webm",
      addRandomSuffix: true,
    });

    await db.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value: blob.url },
      create: { key: SETTING_KEY, value: blob.url },
    });
    refreshSettings();

    // Supprime l'ancien blob s'il existait (uniquement les nôtres).
    if (previous?.value?.includes("blob.vercel-storage.com")) {
      await del(previous.value).catch(() => {});
    }

    return NextResponse.json({ url: blob.url });
  } catch (e: any) {
    const missingToken =
      !process.env.BLOB_READ_WRITE_TOKEN ||
      String(e?.message ?? "").includes("BLOB_READ_WRITE_TOKEN");
    if (missingToken) {
      return NextResponse.json(
        {
          error:
            "Vercel Blob non configuré : attachez un Blob Store au projet et définissez BLOB_READ_WRITE_TOKEN (Dashboard Vercel → Storage).",
        },
        { status: 503 }
      );
    }
    console.error("[landing-video] upload failed:", e);
    return NextResponse.json(
      { error: "Échec de l'upload — réessayez." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const row = await db.setting
    .findUnique({ where: { key: SETTING_KEY } })
    .catch(() => null);

  if (row?.value) {
    if (row.value.includes("blob.vercel-storage.com")) {
      await del(row.value).catch(() => {});
    }
    await db.setting.delete({ where: { key: SETTING_KEY } }).catch(() => {});
    refreshSettings();
  }
  return NextResponse.json({ url: "" });
}
