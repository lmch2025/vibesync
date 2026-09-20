"use client";
// VoiceRecorder — WhatsApp-style voice note recorder.
// Tap mic to start recording, shows live waveform + timer + cancel/send.
// Uses MediaRecorder API. Returns base64 audio + duration on send.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useI18n } from "@/lib/vibe/i18n";

export function VoiceRecorder({
  onSend,
  onCancel,
}: {
  onSend: (base64: string, duration: number) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(Array(40).fill(0.1));
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  function stopAll() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onSend(base64, duration);
        };
        reader.readAsDataURL(blob);
        stopAll();
      };

      // Set up audio analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      mr.start();
      setRecording(true);
      startTimeRef.current = Date.now();

      // Timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);

      // Waveform animation
      const updateWaveform = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const bars = Array.from({ length: 40 }, (_, i) => {
          const idx = Math.floor((i / 40) * data.length);
          return Math.max(0.08, Math.min(1, data[idx] / 200));
        });
        setWaveform(bars);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch (e: any) {
      setError(t("chat.voice.micDenied"));
      setRecording(false);
    }
  }

  function stopAndSend() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  function cancel() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.onstop = null; // prevent sending
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
    stopAll();
    onCancel();
  }

  // Auto-start recording on mount (user already pressed the mic button to get here).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startRecording();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-500 dark:text-red-300">
        <X className="h-4 w-4" />
        {error}
        <button onClick={onCancel} className="ml-auto v-fg-muted underline">{t("common.close")}</button>
      </div>
    );
  }

  // While initializing the microphone (before recording starts), show a loader.
  if (!recording) {
    return (
      <div className="flex-1 flex items-center justify-center h-10">
        <div className="h-5 w-5 rounded-full border-2 v-divider border-t-vibe-purple animate-spin" />
        <span className="ml-2 text-xs v-fg-muted">{t("chat.voice.micLoading")}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-2">
      {/* Cancel */}
      <button
        onClick={cancel}
        className="h-10 w-10 grid place-items-center rounded-full bg-red-500/20 text-red-500 dark:text-red-300 hover:bg-red-500/30 transition shrink-0"
        aria-label={t("common.cancel")}
      >
        <X className="h-5 w-5" />
      </button>

      {/* Waveform + timer */}
      <div className="flex-1 flex items-center gap-2 h-10 rounded-full v-surface-1 px-3 ring-1 ring-[var(--v-divider)]">
        <span className="text-xs tabular-nums text-red-500 dark:text-red-300 font-mono shrink-0">
          {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
        </span>
        <div className="flex-1 flex items-center gap-[1.5px] h-6 overflow-hidden">
          {waveform.map((h, i) => (
            <motion.div
              key={i}
              animate={{ height: `${h * 100}%` }}
              transition={{ duration: 0.05 }}
              className="flex-1 bg-vibe-purple/70 rounded-full min-h-[2px]"
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Send */}
      <button
        onClick={stopAndSend}
        className="h-10 w-10 grid place-items-center rounded-full vibe-gradient text-white shrink-0 active:scale-95 transition"
        aria-label={t("chat.voice.send")}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
