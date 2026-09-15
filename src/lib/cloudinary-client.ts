"use client";
// cloudinary-client — direct browser-to-Cloudinary upload utility.
// Uses XMLHttpRequest (instead of fetch) so we can attach a `progress`
// event listener for true byte-level upload progress tracking.
//
// Unsigned upload presets keep the API key off the client entirely —
// Cloudinary's unsigned upload policy enforces size/format limits on
// their side, so the browser can upload safely without secrets.
//
// Two presets:
//   • `vivilov_unsigned`     → video files (returns secure_url + we
//                                derive a poster frame with the
//                                `so_1,vsingle,f_jpg` eager transform)
//   • `vivilov_unsigned_img` → image files (poster / avatar)
//
// Cloud name is exposed via NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME so it
// can be configured per-environment without rebuilding the client.
//
// Returns { url, posterUrl }:
//   - For video uploads, `url` is the video CDN URL and `posterUrl`
//     is a derived JPEG frame (Cloudinary eager transform).
//   - For image uploads, `url` is the image CDN URL and `posterUrl`
//     is the same URL (caller can ignore it).

const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "nj0oev4p";

const VIDEO_PRESET = "vibesync_unsigned";
const IMAGE_PRESET = "vibesync_unsigned_img";

const UPLOAD_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

export type UploadType = "video" | "image";

export type UploadResult = {
  url: string;
  posterUrl: string;
};

/// Upload a File directly to Cloudinary from the browser.
/// `onProgress` is called with a number 0..100 (inclusive) as bytes
/// are sent. Resolves with { url, posterUrl } on success.
///
/// In sandbox/demo environments where Cloudinary is unreachable, the
/// function throws an Error with a clear French message — callers
/// (e.g. profile-screen.tsx) catch it and toast the message.
export function uploadToCloudinary(
  file: File,
  type: UploadType,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME) {
      reject(new Error("Cloudinary non configuré"));
      return;
    }

    const preset = type === "video" ? VIDEO_PRESET : IMAGE_PRESET;
    const resourceType = type === "video" ? "video" : "image";
    const url = `${UPLOAD_ENDPOINT}/${resourceType}/upload`;

    const startTime = Date.now();
    console.log(`[CloudinaryClient] Démarrage de l'upload: fileName=${file.name}, size=${(file.size / 1024 / 1024).toFixed(2)}MB, type=${type}, resourceType=${resourceType}`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    // Track upload progress (bytes sent). `lengthComputable` is false
    // for chunked transfers; we guard against that.
    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(Math.min(100, pct));
      }
    };

    xhr.onload = () => {
      const duration = Date.now() - startTime;
      console.log(`[CloudinaryClient] onload: status=${xhr.status}, readyState=${xhr.readyState}, duration=${duration}ms`);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          const secureUrl: string | undefined = body.secure_url;
          if (!secureUrl) {
            console.error("[CloudinaryClient] Erreur: Réponse Cloudinary invalide", body);
            reject(new Error("Réponse Cloudinary invalide"));
            return;
          }

          let posterUrl = secureUrl;
          if (type === "video") {
            // Derive poster URL from the video URL using Cloudinary's
            // URL-based transformation: replace /video/upload/ with
            // /video/upload/so_1,f_jpg/ and change extension to .jpg
            posterUrl = derivePosterFromVideoUrl(secureUrl);
          }

          console.log(`[CloudinaryClient] Upload réussi en ${duration}ms: ${secureUrl}`);
          onProgress?.(100);
          resolve({ url: secureUrl, posterUrl });
        } catch {
          console.error("[CloudinaryClient] Erreur: Réponse Cloudinary illisible");
          reject(new Error("Réponse Cloudinary illisible"));
        }
      } else {
        console.error(`[CloudinaryClient] Upload échoué (${xhr.status}): ${xhr.responseText}`);
        reject(
          new Error(
            `Upload Cloudinary échoué (${xhr.status}). Réessaie plus tard.`,
          ),
        );
      }
    };

    xhr.onerror = () => {
      const duration = Date.now() - startTime;
      console.error(`[CloudinaryClient] onerror: network error, readyState=${xhr.readyState}, status=${xhr.status}, duration=${duration}ms`);
      // Network error — Cloudinary unreachable (sandbox often hits this).
      reject(
        new Error(
          "Upload Cloudinary impossible — vérifie ta connexion et réessaie.",
        ),
      );
    };

    xhr.ontimeout = () => {
      const duration = Date.now() - startTime;
      console.error(`[CloudinaryClient] ontimeout: expiré après ${duration}ms, readyState=${xhr.readyState}, status=${xhr.status}`);
      reject(new Error("Upload Cloudinary expiré — réessaie."));
    };

    xhr.timeout = 0; // Pas de timeout strict, on laisse le navigateur gérer l'upload selon la connexion
    console.log(`[CloudinaryClient] Envoi de la requête... Timeout défini à ${xhr.timeout}ms`);
    xhr.send(formData);
  });
}

/// Convert a Cloudinary video URL into a poster-frame image URL by
/// injecting the `so_1,f_jpg` transformation segment after `/upload/`.
/// Example:
///   https://res.cloudinary.com/nj0oev4p/video/upload/v123/abc.webm
///   → https://res.cloudinary.com/nj0oev4p/video/upload/so_1,f_jpg/v123/abc.jpg
function derivePosterFromVideoUrl(videoUrl: string): string {
  try {
    const idx = videoUrl.indexOf("/upload/");
    if (idx === -1) return videoUrl;
    const before = videoUrl.slice(0, idx + "/upload/".length);
    const after = videoUrl.slice(idx + "/upload/".length);
    const noExt = after.replace(/\.(mp4|webm|mov|m4v|mkv|avi|ts|flv|3gp|ogv)$/i, "");
    return `${before}${noExt}.jpg`;
  } catch {
    return videoUrl;
  }
}
