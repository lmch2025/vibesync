"use client";
// Compression navigateur de la vidéo de fond de la page d'accueil → WebM.
//
// L'admin peut importer n'importe quel format courant (MP4, MOV, MKV, WebM) ;
// le navigateur transcode l'image en VP9 (repli VP8) via canvas + MediaRecorder
// AVANT l'envoi vers Vercel Blob. Objectifs :
//   • un fichier final toujours au format WebM, léger et diffusible en boucle ;
//   • une BONNE qualité : côté long ≤ 1280 px (jamais d'upscale), ~0,1 bit par
//     pixel et par frame à 30 fps — net sur un fond d'écran plein écran ;
//   • aucun son : la page d'accueil lit la vidéo en muet, l'audio est une
//     économie de poids pure et simple.
//
// Un WebM déjà léger (≤ 11 Mo) n'est PAS recompressé : ré-encoder ne ferait
// que dégrader la qualité sans bénéfice — il part tel quel vers le Blob.

export const LANDING_VIDEO_MAX_BYTES = 12 * 1024 * 1024; // aligné sur la limite serveur
export const LANDING_DIRECT_WEBM_MAX_BYTES = 11 * 1024 * 1024; // WebM déjà optimisé → envoi direct

const MAX_DURATION_S = 30; // garde-fou ; boucle recommandée : 6–10 s
const MAX_LONG_SIDE = 1280; // côté long maximal, sans jamais upscaler
const SIZE_TARGET_BYTES = 10.5 * 1024 * 1024; // poids visé après compression

export type LandingVideoCompressResult = {
  blob: Blob; // video/webm (VP9 si disponible, sinon VP8)
  width: number;
  height: number;
  duration: number; // secondes réellement encodées
  bitrate: number; // bits/s réellement demandés à l'encodeur
  codec: "vp9" | "vp8" | "webm";
};

/// Le navigateur sait-il encoder en WebM ? (Safari ne le peut pas — l'appelant
/// prévoit un repli : envoi de l'original s'il respecte la limite.)
export function browserCanRecordWebM(): boolean {
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") {
    return false;
  }
  try {
    return (
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ||
      MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ||
      MediaRecorder.isTypeSupported("video/webm")
    );
  } catch {
    return false;
  }
}

/// Un WebM déjà léger ne doit pas être recompressé (perte de qualité inutile).
export function isDirectSendWebm(file: File): boolean {
  const webm = file.type === "video/webm" || /\.webm$/i.test(file.name);
  return webm && file.size <= LANDING_DIRECT_WEBM_MAX_BYTES;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

/// Transcode un fichier vidéo en WebM de bonne qualité, côté navigateur.
/// `onProgress` reçoit un ratio 0..1 pendant l'encodage (temps réel : la vidéo
/// est jouée une fois pour être réenregistrée — compte ~ sa durée).
export async function compressLandingVideoToWebM(
  file: File,
  opts: { onProgress?: (ratio: number) => void } = {}
): Promise<LandingVideoCompressResult> {
  const mimeType = pickMimeType();
  if (!mimeType) {
    throw new Error(
      "Ce navigateur ne peut pas encoder en WebM — essayez Chrome, Edge ou Firefox."
    );
  }

  // 1. Chargement de la source dans un <video> hors écran.
  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = videoUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Impossible de lire ce fichier vidéo."));
    });
    await new Promise<void>((resolve, reject) => {
      if (video.readyState >= 2) return resolve();
      const t = setTimeout(
        () => reject(new Error("Chargement de la vidéo trop lent — réessayez.")),
        15_000
      );
      video.oncanplay = () => {
        clearTimeout(t);
        resolve();
      };
    });

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("Vidéo illisible (dimensions nulles).");
    }

    // WebM produits par MediaRecorder : durée parfois absente (Infinity).
    // Astuce classique : seek très loin pour forcer le navigateur à la calculer.
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      await new Promise<void>((resolve) => {
        const done = () => {
          video.removeEventListener("timeupdate", done);
          resolve();
        };
        video.addEventListener("timeupdate", done);
        video.currentTime = 1e7;
        setTimeout(done, 1200);
      });
      video.currentTime = 0;
    }

    if (!Number.isFinite(video.duration) || video.duration < 0.2) {
      throw new Error("Durée de la vidéo illisible — réessayez ou convertissez en MP4.");
    }

    const duration = Math.min(video.duration, MAX_DURATION_S);

    // 2. Dimensions cibles : côté long ≤ 1280, jamais d'upscale, nombres pairs.
    const longSide = Math.max(video.videoWidth, video.videoHeight);
    const scale = longSide > MAX_LONG_SIDE ? MAX_LONG_SIDE / longSide : 1;
    const width = Math.max(2, Math.floor((video.videoWidth * scale) / 2) * 2);
    const height = Math.max(2, Math.floor((video.videoHeight * scale) / 2) * 2);

    // 3. Bitrate « bonne qualité » (~0,1 bit/pixel/frame à 30 fps), borné,
    //    puis plafonné pour viser ≤ 10,5 Mo sur la durée de la boucle.
    let bitrate = Math.round(width * height * 3);
    bitrate = Math.min(Math.max(bitrate, 1_500_000), 5_000_000);
    bitrate = Math.min(bitrate, Math.round((SIZE_TARGET_BYTES * 8) / duration));

    // 4. Canvas + MediaRecorder — mêmes recettes éprouvées en production que
    //    la compression des vidéos de profil, en plus haute définition.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible sur ce navigateur.");

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    video.currentTime = 0;
    recorder.start();

    let rafId = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      video.pause();
      if (recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
    };

    // Garde-fou : jamais plus que la durée visée + 5 s.
    const safety = setTimeout(finish, (duration + 5) * 1000);

    try {
      await video.play();
    } catch {
      clearTimeout(safety);
      finish();
      throw new Error("Lecture automatique bloquée — recliquez sur « Importer une vidéo ».");
    }

    const draw = () => {
      if (finished) return;
      if (video.currentTime >= duration - 0.03 || video.ended) {
        finish();
        return;
      }
      ctx.drawImage(video, 0, 0, width, height);
      opts.onProgress?.(Math.min(1, video.currentTime / duration));
      rafId = requestAnimationFrame(draw);
    };
    draw();

    const blob = await stopped;
    clearTimeout(safety);
    opts.onProgress?.(1);

    if (blob.size === 0) {
      throw new Error("Compression vide — réessayez avec un autre fichier.");
    }

    return {
      blob,
      width,
      height,
      duration: Math.round(duration * 10) / 10,
      bitrate,
      codec: mimeType.includes("vp9") ? "vp9" : mimeType.includes("vp8") ? "vp8" : "webm",
    };
  } finally {
    URL.revokeObjectURL(videoUrl);
    video.removeAttribute("src");
  }
}
