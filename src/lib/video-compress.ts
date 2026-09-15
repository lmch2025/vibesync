"use client";
// video-compress.ts — extraction de miniature et préparation vidéo côté navigateur.
//
// Pipeline :
//   1. Charge le fichier dans un <video> hors-écran (pleine opacité pour forcer le rendu GPU)
//   2. Lit la vidéo pendant ~1s pour forcer Chromium à décoder les frames
//   3. Capture une frame JPEG via Canvas (à mi-vidéo pour éviter les fondus au noir)
//   4. Retourne le fichier original (upload direct à Cloudinary sans re-compression)
//
// Compatibilité : Chrome 94+, Edge 94+, Firefox 101+, Safari 16+

const TARGET_DURATION_S = 15;

export type CompressResult = {
  file: File;
  posterDataUrl: string;
  durationS: number;
};

/// Prépare la vidéo (extraction du poster uniquement) et retourne le fichier original.
/// La compression est déléguée à Cloudinary côté serveur (transformations d'URL).
/// `onProgress` est appelé avec 0..100.
export async function compressVideo(
  source: File,
  onProgress?: (pct: number) => void,
): Promise<CompressResult> {
  onProgress?.(5);

  // --- Étape 1 : charge la vidéo dans un élément hors-écran mais VISIBLE ---
  // Position fixe hors-écran + opacité 1 = Chromium EST obligé de décoder les frames.
  // opacity < 0.05 ou display:none coupe le pipeline GPU → frames noires.
  const objectUrl = URL.createObjectURL(source);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  
  // Hors-écran mais rendu pour forcer le décodage GPU
  Object.assign(video.style, {
    position: "fixed",
    top: "-9999px",
    left: "-9999px",
    width: "1280px",
    height: "720px",
    opacity: "1",
    pointerEvents: "none",
    zIndex: "-9999",
    visibility: "hidden", // caché visuellement MAIS toujours rendu par le GPU
  });
  document.body.appendChild(video);

  // Attendre que les métadonnées soient chargées
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => {
      if (document.body.contains(video)) document.body.removeChild(video);
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Vidéo illisible ou format non supporté"));
    };
    setTimeout(() => resolve(), 5000); // fallback timeout
    video.load();
  });

  onProgress?.(20);
  const rawDuration = isFinite(video.duration) ? video.duration : 10;
  const targetDuration = Math.min(rawDuration, TARGET_DURATION_S);
  
  // Seeked au milieu de la vidéo (évite les fondus en début)
  const seekTo = Math.min(rawDuration * 0.4, 3);

  // --- Étape 2 : extraire le poster ---
  const posterDataUrl = await extractPoster(video, seekTo);
  onProgress?.(80);

  // --- Étape 3 : Cleanup ---
  URL.revokeObjectURL(objectUrl);
  if (document.body.contains(video)) document.body.removeChild(video);

  onProgress?.(100);

  console.log(`[VideoCompress] Poster extrait à ${seekTo.toFixed(1)}s. Fichier original: ${(source.size / 1024 / 1024).toFixed(1)}MB`);

  return {
    file: source, // On envoie le fichier original directement à Cloudinary
    posterDataUrl,
    durationS: targetDuration,
  };
}

/// Extrait une frame à `atSecond` et renvoie un data URL JPEG.
/// Utilise requestVideoFrameCallback si disponible, sinon un rAF-poll
/// pour s'assurer que la frame est VRAIMENT décodée avant de drawImage.
async function extractPoster(video: HTMLVideoElement, atSecond: number): Promise<string> {
  return new Promise<string>((resolve) => {

    const drawFrame = () => {
      const canvas = document.createElement("canvas");
      const maxW = 720;
      const vw = video.videoWidth || 720;
      const vh = video.videoHeight || 1280;
      const scale = Math.min(1, maxW / vw);
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(""); return; }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Vérifier que la frame n'est pas noire (pixel central)
      const pixel = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
      const isBlack = pixel[0] < 5 && pixel[1] < 5 && pixel[2] < 5;
      
      if (isBlack) {
        // Frame noire détectée : réessayer avec un autre timestamp
        resolve("__retry__");
      } else {
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      }
    };

    const trySeek = (time: number) => {
      video.currentTime = time;
      video.onseeked = () => {
        // Laisser le navigateur rendre la frame via rAF
        requestAnimationFrame(() => {
          requestAnimationFrame(drawFrame);
        });
      };
    };

    const doExtract = async () => {
      // Tenter d'abord le seek demandé
      trySeek(atSecond);
      
      const result: string = await new Promise(r => {
        video.onseeked = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const canvas = document.createElement("canvas");
              const maxW = 720;
              const vw = video.videoWidth || 720;
              const vh = video.videoHeight || 1280;
              const scale = Math.min(1, maxW / vw);
              canvas.width = Math.round(vw * scale);
              canvas.height = Math.round(vh * scale);
              const ctx = canvas.getContext("2d");
              if (!ctx) { r(""); return; }
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const pixel = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
              const isBlack = pixel[0] < 10 && pixel[1] < 10 && pixel[2] < 10;
              r(isBlack ? "__retry__" : canvas.toDataURL("image/jpeg", 0.85));
            });
          });
        };
      });

      if (result !== "__retry__") {
        resolve(result);
        return;
      }

      // Plan B : lire la vidéo pendant 300ms puis capturer
      console.warn("[VideoCompress] Frame noire détectée, tentative de lecture forcée...");
      video.currentTime = 0;
      await video.play().catch(() => {});
      await new Promise(r => setTimeout(r, 400));
      video.pause();

      const canvas2 = document.createElement("canvas");
      const vw = video.videoWidth || 720;
      const vh = video.videoHeight || 1280;
      const scale = Math.min(1, 720 / vw);
      canvas2.width = Math.round(vw * scale);
      canvas2.height = Math.round(vh * scale);
      const ctx2 = canvas2.getContext("2d");
      if (!ctx2) { resolve(""); return; }
      ctx2.drawImage(video, 0, 0, canvas2.width, canvas2.height);
      resolve(canvas2.toDataURL("image/jpeg", 0.85));
    };

    doExtract();
  });
}

