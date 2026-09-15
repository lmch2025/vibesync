"use client";
// NotificationSettings — notification preferences section for the
// Profile tab. Mobile-first, on-brand.
//
// Layout:
//   • Push permission status row — shows the current browser permission
//     state ("Accordé" / "Refusé" / "À demander"). Includes a "Tester"
//     button that POSTs to /api/vibe/push/test (sends a real push +
//     creates an in-app Notification).
//   • 5 per-category toggle switches: matchs, messages, cadeaux, likes,
//     marketing. Each toggle has a spring animation (via Framer Motion
//     on the Switch thumb). Stored in the Setting table as JSON via
//     /api/vibe/notification-settings.
//
// Loads prefs on mount, POSTs on toggle change (debounced via the
// switch's onChange). Falls back to defaults on error.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing, Heart, MessageCircle, Gift, ThumbsUp, Megaphone, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type NotifPrefs = {
  marketingEnabled: boolean;
  matchesEnabled: boolean;
  messagesEnabled: boolean;
  giftsEnabled: boolean;
  likesEnabled: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  marketingEnabled: false,
  matchesEnabled: true,
  messagesEnabled: true,
  giftsEnabled: true,
  likesEnabled: true,
};

type Permission = "default" | "granted" | "denied" | "unsupported";

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [permission, setPermission] = useState<Permission>("default");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Load prefs from server.
    (async () => {
      try {
        const res = await fetch("/api/vibe/notification-settings", {
          cache: "no-store",
        });
        const data = await res.json();
        if (data?.prefs) setPrefs({ ...DEFAULT_PREFS, ...data.prefs });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();

    // Read current Notification permission.
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission as Permission);
    }
  }, []);

  async function updatePref<K extends keyof NotifPrefs>(
    key: K,
    value: boolean,
  ) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await fetch("/api/vibe/notification-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {
      // Silent — prefs are best-effort.
    }
  }

  async function requestPermission() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setPermission(perm as Permission);
    if (perm === "granted") toast.success("Notifications activées 🔔");
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/vibe/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data?.ok || data?.inApp) {
        toast.success("Test envoyé — vérifie tes notifications 🔔");
      } else {
        toast.error(data?.warning || "Test échoué");
      }
    } catch (e: any) {
      toast.error(e.message || "Test échoué");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
      <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-1.5">
        <BellRing className="h-4 w-4 text-accent" /> Notifications
      </h3>

      {/* Push permission status + Test button */}
      <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-3 mb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="h-4 w-4 text-white/60 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold">Push navigateur</p>
              <p className="text-[10px] text-white/40">
                {permission === "granted"
                  ? "✅ Accordé"
                  : permission === "denied"
                    ? "❌ Refusé"
                    : permission === "unsupported"
                      ? "Non supporté"
                      : "À demander"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {permission === "default" && (
              <button
                onClick={requestPermission}
                className="h-7 px-2.5 rounded-lg bg-white/10 ring-1 ring-white/15 text-[10px] font-semibold hover:bg-white/15 transition"
              >
                Autoriser
              </button>
            )}
            <button
              onClick={sendTest}
              disabled={testing || permission !== "granted"}
              className="h-7 px-2.5 rounded-lg vibe-gradient text-white text-[10px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition active:scale-95"
            >
              {testing ? (
                <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Tester
            </button>
          </div>
        </div>
      </div>

      {/* Per-category toggles */}
      <div className="space-y-1">
        <ToggleRow
          icon={<Heart className="h-3.5 w-3.5 text-vibe-pink" />}
          label="Matchs"
          desc="Nouveau match mutuel"
          checked={prefs.matchesEnabled}
          disabled={loading}
          onChange={(v) => updatePref("matchesEnabled", v)}
        />
        <ToggleRow
          icon={<MessageCircle className="h-3.5 w-3.5 text-sky-300" />}
          label="Messages"
          desc="Quelqu'un t'écrit"
          checked={prefs.messagesEnabled}
          disabled={loading}
          onChange={(v) => updatePref("messagesEnabled", v)}
        />
        <ToggleRow
          icon={<Gift className="h-3.5 w-3.5 text-emerald-300" />}
          label="Cadeaux"
          desc="Tu reçois un cadeau"
          checked={prefs.giftsEnabled}
          disabled={loading}
          onChange={(v) => updatePref("giftsEnabled", v)}
        />
        <ToggleRow
          icon={<ThumbsUp className="h-3.5 w-3.5 text-amber-300" />}
          label="Likes"
          desc="Quelqu'un t'a liké"
          checked={prefs.likesEnabled}
          disabled={loading}
          onChange={(v) => updatePref("likesEnabled", v)}
        />
        <ToggleRow
          icon={<Megaphone className="h-3.5 w-3.5 text-fuchsia-300" />}
          label="Marketing"
          desc="News, promos, nouveautés"
          checked={prefs.marketingEnabled}
          disabled={loading}
          onChange={(v) => updatePref("marketingEnabled", v)}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="grid place-items-center h-7 w-7 rounded-full bg-white/5 shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-white/40">{desc}</p>
      </div>
      <motion.div
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
      >
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      </motion.div>
    </div>
  );
}
