"use client";
// VoiceNotePlayer — WhatsApp-style voice note playback in chat bubbles.
// Shows play/pause button, static waveform, duration, and progress.
// Marks the voice note as "listened" on first play (calls onListened).
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export function VoiceNotePlayer({
  voiceData,
  duration,
  mine,
  listened,
  onListened,
}: {
  voiceData?: string;
  duration: number | null;
  mine: boolean;
  listened: boolean;
  onListened?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasListened = useRef(false);

  // Generate a pseudo-random static waveform (deterministic from duration).
  const waveform = useMemo(
    () => Array.from({ length: 32 }, (_, i) => {
      const seed = (i * 7 + (duration ?? 0) * 3) % 100;
      return 0.15 + (seed / 100) * 0.7;
    }),
    [duration]
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  function togglePlay() {
    if (!audioRef.current) {
      audioRef.current = new Audio(voiceData);
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current) {
          const pct = audioRef.current.currentTime / (audioRef.current.duration || 1);
          setProgress(pct);
          setCurrentTime(audioRef.current.currentTime);
        }
      });
      audioRef.current.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      if (!hasListened.current && !mine) {
        hasListened.current = true;
        onListened?.();
      }
    }
  }

  const totalSec = duration ?? 0;
  const displaySec = playing || progress > 0 ? Math.floor(currentTime) : totalSec;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button
        onClick={togglePlay}
        className={`h-9 w-9 grid place-items-center rounded-full shrink-0 transition active:scale-90 ${
          mine ? "bg-white/25" : "bg-vibe-purple/30"
        }`}
        aria-label={playing ? "Pause" : "Lire"}
      >
        {playing ? (
          <Pause className="h-4 w-4 text-white" fill="white" />
        ) : (
          <Play className="h-4 w-4 text-white ml-0.5" fill="white" />
        )}
      </button>

      {/* Waveform with progress */}
      <div className="flex-1 flex items-center gap-[1.5px] h-7">
        {waveform.map((h, i) => {
          const barProgress = i / waveform.length;
          const isPlayed = barProgress < progress;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full min-h-[2px] transition-colors ${
                isPlayed
                  ? mine ? "bg-white" : "bg-vibe-purple"
                  : mine ? "bg-white/40" : "bg-white/25"
              }`}
              style={{ height: `${h * 100}%` }}
            />
          );
        })}
      </div>

      {/* Duration / current time */}
      <span className="text-[10px] tabular-nums text-white/70 shrink-0 font-mono">
        {fmt(displaySec)}
      </span>
    </div>
  );
}
