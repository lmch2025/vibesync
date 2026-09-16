"use client";
// VideoPlayer — High-performance profile video player with smart preloading,
// guaranteed muted autoplay, play/pause toggle, sound controls, and Cloudinary fallback poster.
import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Volume2, VolumeX, Loader2 } from "lucide-react";

/**
 * Derive a high-quality frame (at 1s) from any Cloudinary video URL
 * Example: .../video/upload/eo_15/v123/name.mp4 -> .../video/upload/so_1,f_jpg/v123/name.jpg
 */
function deriveCloudinaryPoster(url?: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return "";
  try {
    const match = url.match(/^(.*\/video\/upload\/)(?:[a-zA-Z0-9_,]+\/)?(v\d+\/.*)$/);
    if (!match) return "";
    const base = match[1];
    const path = match[2].replace(/\.[a-zA-Z0-9]+$/, ".jpg");
    return `${base}so_1,f_jpg/${path}`;
  } catch {
    return "";
  }
}

export function VideoPlayer({
  videoUrl,
  posterUrl,
  duration = 15,
  className = "",
}: {
  videoUrl?: string;
  posterUrl?: string;
  duration?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);

  // Compute best available poster: if Cloudinary, generate a crisp frame at 1s
  const cloudinaryPoster = deriveCloudinaryPoster(videoUrl);
  const activePoster = cloudinaryPoster || posterUrl || "";

  // Guaranteed autoplay on videoUrl change or mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    setHasError(false);
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);

    // CRITICAL: Browsers strictly require DOM properties to be set for autoplay
    video.defaultMuted = true;
    video.muted = isMuted;
    video.playsInline = true;

    // Trigger video load
    video.load();

    const startPlayback = () => {
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch((err) => {
            console.log("[VideoPlayer] Autoplay prevented or delayed:", err);
            setIsPlaying(false);
            setIsLoading(false);
          });
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      startPlayback();
    };

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleError = (e: any) => {
      console.warn("[VideoPlayer] Playback error:", e);
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("error", handleError);

    // Attempt direct play immediately
    startPlayback();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("error", handleError);
    };
  }, [videoUrl, isMuted]);

  // Click anywhere to toggle play/pause
  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video) return;

      if (video.paused) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        video.pause();
        setIsPlaying(false);
      }
    },
    []
  );

  // Toggle mute/unmute
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  if (!videoUrl) {
    return (
      <div className={`w-full h-full relative overflow-hidden v-bg-app ${className}`}>
        {activePoster ? (
          <img src={activePoster} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs">
            Aucune vidéo
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={togglePlay}
      className={`w-full h-full relative overflow-hidden v-bg-app cursor-pointer select-none group ${className}`}
    >
      {/* Blurred background backdrop */}
      {activePoster && (
        <img
          src={activePoster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-50 blur-2xl scale-125 pointer-events-none"
        />
      )}

      {/* Poster image while video is loading or buffering */}
      {activePoster && (
        <img
          src={activePoster}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
            isPlaying ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {/* Main Video element */}
      <video
        key={videoUrl}
        ref={videoRef}
        src={videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        loop
        muted={isMuted}
        autoPlay
        preload="auto"
      />

      {/* Slim progress bar at the very top */}
      <div className="absolute top-0 inset-x-0 h-1 v-surface-3 z-20 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Sound toggle button — stacked cleanly under the 15s max badge */}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute top-11 right-3 z-40 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/80 transition active:scale-95 shadow-lg"
        title={isMuted ? "Activer le son" : "Couper le son"}
      >
        {isMuted ? <VolumeX className="h-4 w-4 text-white/80" /> : <Volume2 className="h-4 w-4 text-fuchsia-400" />}
      </button>

      {/* Center Play Button Overlay (when paused) */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 pointer-events-none animate-in fade-in duration-200">
          <div className="h-16 w-16 rounded-full v-surface-3 backdrop-blur-md border border-white/40 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
            <Play className="h-8 w-8 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
            <Loader2 className="h-5 w-5 animate-spin text-fuchsia-400" />
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 text-white text-center p-4">
          <p className="text-sm font-semibold">Lecture impossible</p>
          <p className="text-xs text-white/70 mt-1">Appuie pour réessayer</p>
        </div>
      )}
    </div>
  );
}

