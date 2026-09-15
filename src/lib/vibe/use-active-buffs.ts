"use client";
// useActiveBuffs — polls `/api/vibe/active-buffs` every 15 seconds and
// returns the current active premium action buffs (boost, spotlight,
// ghost mode, passport, etc.). The hook also listens for the custom
// `vivilov:buff-activated` event so the UI can refresh INSTANTLY when
// a new buff is purchased (no need to wait for the next 15s tick).
//
// Returns:
//   - buffs:   array of active buff descriptors (empty if none)
//   - loading: true during the initial fetch
//   - has:     (type) => boolean — quick predicate ("is boost active now?")
//   - get:     (type) => buff | undefined — lookup by type
//   - reload:  () => void — manually trigger a refetch
import { useCallback, useEffect, useRef, useState } from "react";

export type BuffType =
  | "boost"
  | "spotlight"
  | "ghostMode"
  | "passport"
  | "timeFreeze"
  | "dailyDouble"
  | "crushAlert"
  | "goldenHeart";

export type ActiveBuff = {
  type: BuffType;
  emoji: string;
  label: string;
  desc: string;
  expiresAt: string; // ISO
  remainingMs: number;
  totalMs: number;
  progress: number; // 0..1
};

const POLL_INTERVAL_MS = 15_000;
const BUFF_ACTIVATED_EVENT = "vivilov:buff-activated";

export function useActiveBuffs() {
  const [buffs, setBuffs] = useState<ActiveBuff[]>([]);
  const [loading, setLoading] = useState(true);
  const abortedRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/vibe/active-buffs", { cache: "no-store" });
      const data = await res.json();
      if (abortedRef.current) return;
      if (Array.isArray(data?.buffs)) {
        setBuffs(data.buffs as ActiveBuff[]);
      }
    } catch {
      // Silent — buffs are non-critical UI.
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    abortedRef.current = false;
    reload();
    const interval = setInterval(reload, POLL_INTERVAL_MS);

    // Instant refresh on `vivilov:buff-activated` (e.g. user just
    // bought a Boost — no need to wait 15s for the next poll tick).
    const onActivated = () => {
      reload();
    };
    if (typeof window !== "undefined") {
      window.addEventListener(BUFF_ACTIVATED_EVENT, onActivated as EventListener);
    }

    return () => {
      abortedRef.current = true;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener(
          BUFF_ACTIVATED_EVENT,
          onActivated as EventListener,
        );
      }
    };
  }, [reload]);

  const has = useCallback(
    (type: BuffType) => buffs.some((b) => b.type === type),
    [buffs],
  );

  const get = useCallback(
    (type: BuffType) => buffs.find((b) => b.type === type),
    [buffs],
  );

  return { buffs, loading, has, get, reload };
}
