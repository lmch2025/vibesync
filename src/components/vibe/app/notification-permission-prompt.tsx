"use client";
// NotificationPermissionPrompt — elegant notification opt-in prompt
// with backdrop blur.
//
// Behavior:
//   • Shows after a 4s delay (only if not already shown this session).
//   • Once-per-session guard via sessionStorage.
//   • Max 2 dismisses (lifetime, localStorage key `notif_dismiss_count`).
//   • Only shows if Notification.permission === "default" (not yet
//     asked). If already granted or denied, never shows.
//   • On accept: requests Notification.requestPermission(). If granted,
//     subscribes to push via /api/vibe/push/vapid-key (publicKey) +
//     /api/vibe/push/subscribe (subscription POST). On deny or failure,
//     the prompt closes silently — no nag.
//   • Shows 4 notification type previews: matchs, messages, cadeaux,
//     série (streak) — each with its emoji + label, so the user knows
//     exactly what they're opting in to.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Heart, MessageCircle, Gift, Flame, X } from "lucide-react";
import { useI18n } from "@/lib/vibe/i18n";

const SESSION_KEY = "notif_prompt_shown";
const DISMISS_KEY = "notif_dismiss_count";
const MAX_DISMISSES = 2;
const SHOW_DELAY_MS = 4000;

type NotifPreview = {
  emoji: string;
  /// Clés i18n (dictionnaire misc) — label/desc traduits au rendu.
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
  accent: string;
};

const NOTIF_PREVIEWS: NotifPreview[] = [
  {
    emoji: "💜",
    labelKey: "misc.catMatches",
    descKey: "misc.permPrevMatches",
    icon: <Heart className="h-3.5 w-3.5" />,
    accent: "text-vibe-pink",
  },
  {
    emoji: "💬",
    labelKey: "misc.catMessages",
    descKey: "misc.catMessagesDesc",
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    accent: "text-sky-500 dark:text-sky-300",
  },
  {
    emoji: "🎁",
    labelKey: "misc.catGifts",
    descKey: "misc.catGiftsDesc",
    icon: <Gift className="h-3.5 w-3.5" />,
    accent: "text-emerald-500 dark:text-emerald-300",
  },
  {
    emoji: "🔥",
    labelKey: "misc.catStreak",
    descKey: "misc.catStreakDesc",
    icon: <Flame className="h-3.5 w-3.5" />,
    accent: "text-amber-500 dark:text-amber-300",
  },
];

export function NotificationPermissionPrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Only show if Notification API exists and permission is "default".
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;

    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    const dismissCount = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissCount >= MAX_DISMISSES) return;

    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setOpen(false);
    const n = Number(localStorage.getItem(DISMISS_KEY) ?? "0") + 1;
    localStorage.setItem(DISMISS_KEY, String(n));
  }

  async function accept() {
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        // User denied — close silently, no nag.
        dismiss();
        return;
      }

      // UX Optimization: Close modal immediately after OS permission is granted.
      // The push subscription network calls can happen silently in the background.
      setOpen(false);
      subscribeToPush();
    } catch {
      // Silent failure — the in-app Notification bell still works.
      setOpen(false);
    } finally {
      setSubscribing(false);
    }
  }

  async function subscribeToPush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }
      const keyRes = await fetch("/api/vibe/push/vapid-key");
      const keyData = await keyRes.json();
      if (!keyData?.publicKey) return; // VAPID not configured — skip.

      // Register / wait for the service worker.
      const reg = await navigator.serviceWorker
        .register("/sw.js")
        .catch(() => navigator.serviceWorker.ready);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as unknown as BufferSource,
      });

      // POST the subscription to the server.
      const json = sub.toJSON();
      await fetch("/api/vibe/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: JSON.stringify(json.keys ?? {}),
        }),
      });
    } catch {
      // Subscription failed — in-app notifications still work via the bell.
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] grid place-items-center px-4"
          onClick={dismiss}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm rounded-3xl v-surface-solid ring-1 ring-[var(--v-divider)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-full v-surface-2 v-fg hover:v-surface-3 transition"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Bell icon */}
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.1 }}
              className="mx-auto h-16 w-16 grid place-items-center rounded-2xl vibe-gradient vibe-glow mb-4"
            >
              <Bell className="h-8 w-8 text-white" fill="currentColor" />
            </motion.div>

            <h3 className="font-display text-xl font-bold text-center v-fg">
              {t("misc.permTitle")}
            </h3>
            <p className="text-sm v-fg-muted text-center mt-1 mb-5">
              {t("misc.permBody")}
            </p>

            {/* Notification type previews */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {NOTIF_PREVIEWS.map((p, i) => (
                <motion.div
                  key={p.labelKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-center gap-2 rounded-2xl v-surface-1 ring-1 ring-[var(--v-divider)] px-3 py-2"
                >
                  <span className="text-xl">{p.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${p.accent} flex items-center gap-1`}>
                      {t(p.labelKey)}
                    </p>
                    <p className="text-[9px] v-fg-muted truncate">{t(p.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTAs */}
            <button
              onClick={accept}
              disabled={subscribing}
              className="w-full h-12 rounded-2xl vibe-gradient text-white font-display font-bold text-sm active:scale-95 transition vibe-glow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {subscribing ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {t("misc.permActivating")}
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" /> {t("misc.permEnable")}
                </>
              )}
            </button>
            <button
              onClick={dismiss}
              className="w-full text-center text-[11px] v-fg-muted hover:v-fg transition mt-3"
            >
              {t("misc.later")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/// Convert a base64-url VAPID public key to a Uint8Array (needed by
/// PushManager.subscribe).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
