"use client";
// ImmersiveLanding — full-screen video background, non-scrollable.
import { useState, useRef, useEffect } from "react";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { AuthModal } from "@/components/vibe/auth-modal";
import { useVibe } from "@/lib/vibe/store";

export function ImmersiveLanding({
  onEnterApp,
}: {
  onEnterApp: () => void;
}) {
  const setView = useVibe((s) => s.setView);
  const me = useVibe((s) => s.me);
  const [authOpen, setAuthOpen] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Detect data saver mode for performance
    if (
      typeof navigator !== "undefined" &&
      "connection" in navigator &&
      (navigator as any).connection?.saveData
    ) {
      setSaveData(true);
    }
  }, []);

  function handleAuthSuccess() {
    setAuthOpen(false);
    setView("app");
  }

  function enterApp() {
    if (me) {
      setView("app");
    } else {
      setAuthOpen(true);
    }
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-[#09090B] text-white flex flex-col font-sans"
      style={{ height: "100dvh" }}
    >
      {/* ===== BACKGROUND VIDEO LAYER (z-0) ===== */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Loading state */}
        <div
          className={`absolute inset-0 bg-zinc-950 flex items-center justify-center transition-opacity duration-700 ${
            videoLoaded || saveData ? "opacity-0" : "opacity-100"
          }`}
          style={{ zIndex: 1 }}
        >
          <div className="h-8 w-8 rounded-full border border-white/10 border-t-white/60 animate-spin" />
        </div>

        {/* Video: Respects save-data by conditionally rendering autoPlay */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded || saveData ? "opacity-100" : "opacity-0"
          } ${!saveData ? "animate-ken-burns" : ""}`}
          autoPlay={!saveData}
          loop
          muted
          playsInline
          preload={saveData ? "none" : "auto"}
          poster="/verify-landing.png"
          onLoadedData={() => setVideoLoaded(true)}
          style={{ filter: "contrast(1.05) saturate(1.1)" }}
        >
          <source src="/profiles/swipe-bg.webm" type="video/webm" />
        </video>

        {/* OVERLAY: vignette + gradient for legibility without uniform veil */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.3) 100%), linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.85) 100%)",
          }}
        />
      </div>

      {/* ===== TOP HEADER (z-30) ===== */}
      <header
        className="relative z-30 flex items-center justify-between px-5 shrink-0"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 12px) + 12px)",
          paddingBottom: "12px",
          animation: "fadeInDown 0.7s ease both",
        }}
      >
        <VibeLogo withText={false} className="scale-110 origin-left" />
        <div className="flex items-center gap-2">
          {/* NOTE: the public "Admin" button was removed — admin panel access
              is now EXCLUSIVELY via the profile tab of an admin account. */}
          <button
            onClick={enterApp}
            className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold text-white/90 bg-white/10 backdrop-blur-md ring-1 ring-white/15 active:scale-95 active:bg-white/20 transition-all min-h-[44px]"
          >
            {me ? "Mon compte" : "Connexion"}
          </button>
        </div>
      </header>

      {/* ===== CENTER CONTENT (z-20) ===== */}
      <main
        className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 text-center"
        style={{ animation: "fadeInUp 0.9s ease 0.15s both" }}
      >
        {/* Hypnotic Glow behind the brand (Signature Geste Part 1) */}
        <div className="relative mb-2">
          <div 
            className="absolute inset-0 bg-[#9B51E0]/30 blur-[70px] rounded-full"
            style={{ animation: "vibeBreathing 4s ease-in-out infinite" }}
          />
          <h1
            className="relative font-display leading-none"
            style={{
              fontSize: "clamp(3.5rem, 16vw, 6rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            <span className="text-white drop-shadow-lg">
              Vivilov
            </span>
          </h1>
        </div>

        <p
          className="text-white/90 max-w-sm mx-auto leading-snug drop-shadow-md mb-6"
          style={{
            fontSize: "clamp(1.125rem, 4.5vw, 1.35rem)",
            fontWeight: 500,
          }}
        >
          La rencontre authentique,<br/>
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF7E67] to-[#9B51E0]">
            en vidéo de 15 secondes.
          </span>
        </p>

        {/* Feature Pills Grouped */}
        <div
          className="flex flex-wrap items-center justify-center gap-2 max-w-[320px]"
          style={{ animation: "fadeIn 1.1s ease 0.4s both" }}
        >
          {[
            { icon: "🛡️", text: "Profils vérifiés" },
            { icon: "🎬", text: "Vidéo 15s" },
            { icon: "✨", text: "Vibe Check" },
            { icon: "🚀", text: "Zéro abonnement" }
          ].map((feature) => (
            <span
              key={feature.text}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white/90 shadow-sm"
            >
              <span className="text-[14px]">{feature.icon}</span>
              {feature.text}
            </span>
          ))}
        </div>
      </main>

      {/* ===== BOTTOM CTA — THUMB COMFORT ZONE (z-30) ===== */}
      <footer
        className="relative z-30 flex flex-col items-center gap-4 px-6 shrink-0 w-full max-w-sm mx-auto"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 24px)",
          animation: "fadeInUp 0.9s ease 0.3s both",
        }}
      >
        <div className="w-full flex flex-col items-center gap-3">
          {/* Social Proof Indicator */}
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 border border-white/5" style={{ animation: "fadeIn 1.1s ease 0.6s both" }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9B51E0] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9B51E0]"></span>
            </span>
            <span className="text-[12px] font-medium text-white/80">342 Vibes en cours</span>
          </div>

          {/* CTA Button with Hypnotic Sync (Signature Geste Part 2) */}
          <button
            onClick={enterApp}
            className="group relative w-full flex items-center justify-center gap-2 rounded-full bg-white text-zinc-950 font-display font-bold overflow-hidden transition-transform touch-manipulation"
            style={{
              minHeight: "60px",
              fontSize: "clamp(1.125rem, 4vw, 1.25rem)",
              animation: "vibeBreathingShadow 4s ease-in-out infinite",
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)";
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
            onPointerLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            <span
              className="absolute inset-0 -translate-x-full opacity-40"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)",
                animation: "shimmerBtn 3s ease infinite",
              }}
            />
            <span className="relative tracking-tight text-[#1a0833]">
              {me ? "Retour à l'app" : "Rejoins l'expérience"}
            </span>
          </button>
        </div>

        <p className="text-[12px] font-medium text-white/70 text-center tracking-wide drop-shadow-sm px-2">
          Inscription en 30s · <span className="text-white">25 Vibes offertes</span> · Sans engagement
        </p>
      </footer>

      {/* Auth modal */}
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleAuthSuccess}
      />

      {/* Page-level keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmerBtn {
          0%   { transform: translateX(-100%); }
          50%, 100% { transform: translateX(200%); }
        }
        /* Geste Signature : synchronisation de la respiration (pulse) */
        @keyframes vibeBreathing {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50%      { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes vibeBreathingShadow {
          0%, 100% { box-shadow: 0 4px 15px -5px rgba(155, 81, 224, 0.2); }
          50%      { box-shadow: 0 10px 30px -5px rgba(155, 81, 224, 0.7); }
        }
      `}</style>
    </div>
  );
}
