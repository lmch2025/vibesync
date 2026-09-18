"use client";
// Nudges — the contextual recommendation engine for premium actions.
//
// Every premium action has circumstantial moments where it genuinely helps
// the user. This module tracks WHICH nudges have already been shown so the
// app stays elegant and never nags:
//   • scope "session" → once per browser session (sessionStorage)
//   • scope "day"     → once per calendar day (localStorage)
//
// UI: components render `SmartNudgeBanner` with a contextual message + CTA
// when `canShowNudge(id)` returns true, then call `markNudgeShown(id)`.

export type NudgeScope = "session" | "day";

const SESSION_KEY = "vivilov:nudges:session";
const DAY_KEY = "vivilov:nudges:day";

function readSet(store: Storage | null, key: string): Set<string> {
  if (!store) return new Set();
  try {
    const raw = store.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(store: Storage | null, key: string, set: Set<string>) {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify([...set]));
  } catch {
    // storage full / private mode — nudges are non-critical.
  }
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/// Can this nudge still be shown? (true = not shown yet in its scope)
export function canShowNudge(id: string, scope: NudgeScope = "session"): boolean {
  if (typeof window === "undefined") return false;
  if (scope === "session") {
    return !readSet(window.sessionStorage, SESSION_KEY).has(id);
  }
  // Day scope: reset the set when the calendar day changes.
  const store = window.localStorage;
  const today = todayISO();
  const stamped = store.getItem(`${DAY_KEY}:date`);
  if (stamped !== today) {
    store.setItem(`${DAY_KEY}:date`, today);
    store.removeItem(DAY_KEY);
  }
  return !readSet(store, DAY_KEY).has(id);
}

/// Mark a nudge as shown (call the moment it's displayed).
export function markNudgeShown(id: string, scope: NudgeScope = "session") {
  if (typeof window === "undefined") return;
  if (scope === "session") {
    const set = readSet(window.sessionStorage, SESSION_KEY);
    set.add(id);
    writeSet(window.sessionStorage, SESSION_KEY, set);
  } else {
    const set = readSet(window.localStorage, DAY_KEY);
    set.add(id);
    writeSet(window.localStorage, DAY_KEY, set);
  }
}

/// Convenience: returns true exactly once (checks + marks atomically).
export function nudgeOnce(id: string, scope: NudgeScope = "session"): boolean {
  if (!canShowNudge(id, scope)) return false;
  markNudgeShown(id, scope);
  return true;
}
