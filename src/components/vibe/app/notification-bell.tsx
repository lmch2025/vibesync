"use client";
// NotificationBell — badge with unread count + dropdown panel.
// Mobile-first: shows a bell icon with a pulsing red badge when there are
// unread notifications. Tapping opens a bottom sheet with the notification list.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, X } from "lucide-react";
import { useVibe } from "@/lib/vibe/store";
import { useI18n } from "@/lib/vibe/i18n";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const { t, lang } = useI18n();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/vibe/notifications");
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
    // Poll every 30s for new notifications.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await fetch("/api/vibe/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return t("misc.time.now");
    if (diff < 3600000) return t("misc.time.min", { n: Math.floor(diff / 60000) });
    if (diff < 86400000) return t("misc.time.hour", { n: Math.floor(diff / 3600000) });
    return d.toLocaleDateString(lang === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short" });
  }

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(true); if (unreadCount > 0) markAllRead(); }}
        className="relative h-9 w-9 grid place-items-center rounded-full hover:v-surface-2 transition"
        aria-label={t("misc.bellAria")}
      >
        <Bell className="h-5 w-5 v-fg-muted" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-red-500 text-white text-[9px] font-bold"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification panel — bottom sheet on mobile */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 inset-x-0 z-[70] rounded-t-3xl v-surface-solid ring-1 ring-[var(--v-divider)] p-4 pb-6 max-h-[70vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-lg">{t("misc.title")}</h3>
                <button onClick={() => setOpen(false)} className="h-8 w-8 grid place-items-center rounded-full hover:v-surface-2">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-12 v-fg-muted">
                  <Bell className="h-8 w-8 mx-auto mb-2 v-fg-muted" />
                  <p className="text-sm">{t("misc.empty")}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 rounded-2xl p-3 transition ${
                        n.read ? "v-surface-1" : "v-surface-1 ring-1 ring-[var(--v-divider)]"
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${n.read ? "v-fg-muted" : "v-fg"}`}>
                          {n.title}
                        </p>
                        <p className={`text-xs v-fg-muted`}>
                          {n.body}
                        </p>
                        <p className="text-[9px] v-fg-muted mt-0.5">{formatTime(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-vibe-purple shrink-0 mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {notifications.length > 0 && unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="mt-3 w-full h-9 rounded-xl v-surface-1 ring-1 ring-[var(--v-divider)] text-xs v-fg-muted hover:v-surface-2 transition flex items-center justify-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" /> {t("misc.markAllRead")}
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
