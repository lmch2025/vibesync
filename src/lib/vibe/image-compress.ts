"use client";
// Image compression utilities — resize + re-encode an image File in the
// browser (canvas) before upload. Mirrors the video-compress philosophy:
// compress locally, upload a small artifact.
//
// Pipeline:
// 1. Validate the file (image only, ≤ 15 Mo) with clear French errors
// 2. Decode EXIF-safe: createImageBitmap(file, { imageOrientation: "from-image" })
//    with an HTMLImageElement + object-URL fallback for older engines
// 3. Draw onto a <canvas> at the target size (long side ≤ maxDim, NEVER upscaled)
// 4. Export JPEG (quality, default 0.85) via canvas.toBlob
//    (toDataURL + fetch fallback when toBlob is unavailable)
// 5. Return { dataUrl, blob } — the dataUrl doubles as sandbox fallback storage

export type CompressedImage = {
  /** data:image/jpeg;base64,… — preview locale + fallback bac à sable */
  dataUrl: string;
  /** Blob JPEG prêt pour l'upload (à envelopper dans un File) */
  blob: Blob;
};

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 Mo

/// Decode an image File into a drawable source, EXIF orientation respected.
/// Modern path: createImageBitmap with "from-image" bakes the EXIF rotation
/// into the bitmap pixels. Fallback: HTMLImageElement + object URL (recent
/// browsers apply EXIF orientation to <img> by default too).
async function decodeImage(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Vieux moteurs qui rejettent les options / formats exotiques —
      // on tente la voie <img> ci-dessous.
    }
  }

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Impossible de lire cette image"));
      img.src = url;
    });
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

/// Export a canvas as JPEG — toBlob d'abord (efficace, pas d'inflation
/// base64 à l'export), puis repli sur toDataURL pour les moteurs sans toBlob.
async function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<{ dataUrl: string; blob: Blob }> {
  if (typeof canvas.toBlob === "function") {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(blob);
      });
      return { dataUrl, blob };
    }
  }

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob = await (await fetch(dataUrl)).blob();
  return { dataUrl, blob };
}

/// Compress an image File: long side capped at `maxDim` (no upscale), JPEG
/// re-encode at `quality`. Throws French errors for invalid format / size /
/// unreadable images so callers can toast them directly.
export async function compressImage(
  file: File,
  maxDim = 1080,
  quality = 0.85,
): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Format image requis (JPG, PNG, WebP…)");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Image trop lourde (max 15 Mo)");
  }

  // Erreurs de décodage déjà user-friendly — elles passent telles quelles.
  const { source, width, height, release } = await decodeImage(file);
  try {
    if (!width || !height) throw new Error("empty");

    // Long côté ≤ maxDim — jamais d'agrandissement.
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, targetW, targetH);

    return await canvasToJpeg(canvas, quality);
  } catch {
    // Dimensions nulles, canvas indisponible/taint, export impossible…
    // → message unique et clair pour l'utilisateur.
    throw new Error("Compression impossible — essaie une autre photo.");
  } finally {
    release();
  }
}
