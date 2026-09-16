"use client";
// PwaInstallPrompt — elegant PWA install prompt with backdrop blur.
//
// Behavior:
//   • Shows after a 3s delay (only if not already shown this session).
//   • Once-per-session guard via sessionStorage.
//   • Max 3 dismisses (lifetime, localStorage key `pwa_dismiss_count`).
//   • Listens for `beforeinstallprompt` (Chrome/Edge Android, desktop
//     Chromium). When the native prompt is available, the "Installer"
//     button triggers it. Otherwise, falls back to platform-specific
//     instructions: iOS (Share → Add to Home Screen) and Android
//     (Menu → Install app).
//   • On `appinstalled` event, the prompt is dismissed silently.
//
// Pure client component — renders nothing on SSR. Mounts once at the
// app-demo root level so it's available across all screens.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, MoreVertical, Smartphone, X } from "lucide-react";

const SESSION_KEY = "pwa_prompt_shown";
const DISMISS_KEY = "pwa_dismiss_count";
const MAX_DISMISSES = 3;
const SHOW_DELAY_MS = 3000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop" | "standalone";

export function PwaInstallPrompt() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    // Don't show inside the standalone PWA context (already installed).
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlatform("standalone");
      return;
    }

    // Detect platform.
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "desktop");

    // Check dismiss count.
    const dismissCount = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissCount >= MAX_DISMISSES) return;

    // Check session guard.
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    // Capture `beforeinstallprompt` (Chromium-only).
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // Dismiss silently on appinstalled.
    const onInstalled = () => setOpen(false);
    window.addEventListener("appinstalled", onInstalled);

    // Show after delay (if no native BIP fired, we still show the
    // instructions-based fallback prompt on iOS/desktop).
    const showTimer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(showTimer);
    };
  }, []);

  function dismiss() {
    setOpen(false);
    const n = Number(localStorage.getItem(DISMISS_KEY) ?? "0") + 1;
    localStorage.setItem(DISMISS_KEY, String(n));
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setOpen(false);
      }
      setDeferred(null);
    } else {
      // No native prompt — the instructions are already shown; just
      // keep the modal open so the user can read them.
    }
  }

  return (
    <AnimatePresence>
      {open && platform !== "standalone" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center px-4"
          onClick={dismiss}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm rounded-3xl bg-[#0a0612] ring-1 ring-white/10 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full v-surface-2 text-white hover:v-surface-3 transition"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.1 }}
              className="mx-auto h-16 w-16 grid place-items-center rounded-2xl vibe-gradient vibe-glow mb-4"
            >
              <Smartphone className="h-8 w-8 text-white" />
            </motion.div>

            <h3 className="font-display text-xl font-bold text-center text-white">
              Installe Vivilov
            </h3>
            <p className="text-sm text-white/70 text-center mt-1 mb-5">
              Lance-toi en 1 tap — pas de store, pas d'attente. Ton app
              plein écran, notifications incluses.
            </p>

            {/* Platform-specific instructions */}
            <div className="space-y-2 mb-5">
              {platform === "ios" && (
                <Instruction
                  icon={<Share className="h-4 w-4 text-sky-300" />}
                  text="Tape le bouton Partager"
                />
              )}
              {platform === "ios" && (
                <Instruction
                  icon={<PlusIcon />}
                  text="Puis « Sur l'écran d'accueil »"
                />
              )}
              {platform === "android" && !deferred && (
                <Instruction
                  icon={<MoreVertical className="h-4 w-4 text-white/70" />}
                  text="Menu ⋮ → Installer l'application"
                />
              )}
              {platform === "desktop" && !deferred && (
                <Instruction
                  icon={<Download className="h-4 w-4 text-vibe-pink" />}
                  text="Icône d'installation dans la barre d'adresse"
                />
              )}
            </div>

            {/* CTA */}
            {deferred ? (
              <button
                onClick={install}
                className="w-full h-12 rounded-2xl vibe-gradient text-white font-display font-bold text-sm active:scale-95 transition vibe-glow flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" /> Installer maintenant
              </button>
            ) : (
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  dismiss();
                }}
                className="block w-full h-12 rounded-2xl v-surface-2 ring-1 ring-white/15 text-white font-display font-bold text-sm active:scale-95 transition text-center leading-[3rem]"
              >
                J'ai compris
              </a>
            )}

            <button
              onClick={dismiss}
              className="w-full text-center text-[11px] text-white/70 hover:text-white/70 transition mt-3"
            >
              Plus tard
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Instruction({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl v-surface-1 ring-1 ring-white/10 px-3 py-2.5">
      <span className="grid place-items-center h-7 w-7 rounded-full v-surface-2 shrink-0">
        {icon}
      </span>
      <span className="text-sm text-white/80">{text}</span>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-emerald-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
