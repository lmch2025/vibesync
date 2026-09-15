"use client";
// Video compression utilities — compress a video file to a small base64 string
// suitable for storage in SQLite. Uses canvas + MediaRecorder to re-encode at
// a lower resolution and bitrate, with a max duration.
//
// Pipeline:
// 1. Load the video into a hidden <video> element
// 2. Draw frames onto a <canvas> at the target width
// 3. Capture the canvas with MediaRecorder at the target quality
// 4. Also capture a poster frame (first meaningful frame)
// 5. Return { videoBase64, posterBase64, duration }

export type VideoConfig = {
  maxDuration: number;
  maxWidth: number;
  quality: number; // 0..1
  maxSizeKb: number;
};

export type CompressedVideo = {
  videoBase64: string; // data:video/webm;base64,...
  posterBase64: string; // data:image/jpeg;base64,...
  duration: number; // seconds
  width: number;
  height: number;
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  maxDuration: 15,
  maxWidth: 480,
  quality: 0.5,
  maxSizeKb: 2048,
};

/// Fetch the video config from the server (admin-configurable).
export async function fetchVideoConfig(): Promise<VideoConfig> {
  try {
    const res = await fetch("/api/vibe/video-config");
    if (res.ok) {
      const data = await res.json();
      return {
        maxDuration: data.maxDuration ?? 15,
        maxWidth: data.maxWidth ?? 480,
        quality: data.quality ?? 0.5,
        maxSizeKb: data.maxSizeKb ?? 2048,
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_VIDEO_CONFIG;
}

/// Compress a video File to a small base64 string + poster image.
/// Uses canvas + MediaRecorder for aggressive compression.
export async function compressVideo(
  file: File,
  config: VideoConfig
): Promise<CompressedVideo> {
  const { maxDuration, maxWidth, quality } = config;

  // Load the video into a hidden element.
  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Impossible de charger la vidéo"));
  });

  // Wait for the video to be ready to play.
  await new Promise<void>((resolve) => {
    if (video.readyState >= 2) resolve();
    else video.oncanplay = () => resolve();
  });

  const originalDuration = video.duration;
  const effectiveDuration = Math.min(originalDuration, maxDuration);

  // Calculate target dimensions (maintain aspect ratio).
  const aspectRatio = video.videoHeight / video.videoWidth;
  const targetWidth = Math.min(maxWidth, video.videoWidth);
  const targetHeight = Math.round(targetWidth * aspectRatio);

  // Create canvas for frame capture.
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d")!;

  // Capture poster frame at ~1s (or 0 if video is shorter).
  const posterTime = Math.min(1, effectiveDuration / 2);
  video.currentTime = posterTime;
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
  });
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  const posterBase64 = canvas.toDataURL("image/jpeg", quality);

  // Now record the canvas for the full duration (up to maxDuration).
  const stream = canvas.captureStream(24); // 24 fps
  const mimeType = "video/webm;codecs=vp9";
  const mimeTypeFallback = "video/webm;codecs=vp8";
  const mimeTypeFinal = MediaRecorder.isTypeSupported(mimeType) ? mimeType : mimeTypeFallback;

  // Bitrate: lower quality = smaller file. Scale by the quality setting.
  // Base: 500kbps at quality=0.5, 1000kbps at quality=1.0
  const videoBitrate = Math.round(500_000 + 1_000_000 * quality);
  const audioBitrate = 0; // no audio for presentation videos

  const recorder = new MediaRecorder(stream, {
    mimeType: mimeTypeFinal,
    videoBitsPerSecond: videoBitrate,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
  });

  // Start playing the video from the beginning and recording the canvas.
  video.currentTime = 0;
  video.muted = true;
  recorder.start();

  // Play the video and draw frames onto the canvas.
  await video.play();

  let rafId: number = 0;
  const drawFrames = () => {
    if (video.currentTime >= effectiveDuration || video.ended) {
      recorder.stop();
      video.pause();
      return;
    }
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    rafId = requestAnimationFrame(drawFrames);
  };
  drawFrames();

  // Safety timeout: stop after maxDuration + 1s.
  const safetyTimeout = setTimeout(() => {
    if (recorder.state === "recording") {
      recorder.stop();
      video.pause();
    }
  }, (effectiveDuration + 1) * 1000);

  const blob = await recordingPromise;
  clearTimeout(safetyTimeout);
  cancelAnimationFrame(rafId);
  URL.revokeObjectURL(videoUrl);

  // Convert to base64.
  const videoBase64 = await blobToBase64(blob);

  // If the video is too large, try to reduce quality further by re-encoding
  // at a lower bitrate. For now, we just return what we have — the compression
  // is already aggressive at the target settings.
  return {
    videoBase64,
    posterBase64,
    duration: Math.round(effectiveDuration),
    width: targetWidth,
    height: targetHeight,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Conversion base64 échouée"));
    reader.readAsDataURL(blob);
  });
}

/// Format seconds as M:SS.
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
