"use client";
// useRelayTypewriter — a prefix (persistent 3-word unifying phrase) stays
// fixed on screen while a rotating suffix is typed char-by-char then erased
// char-by-char, cycling through N taglines. Very fluid, no emojis, no counters.
import { useEffect, useState } from "react";

export type RelayLine = { prefix: string; suffix: string };

type Phase = "type" | "pause" | "erase" | "gap";

const TYPE_MS = 38;
const ERASE_MS = 18;
const PAUSE_MS = 2400;
const GAP_MS = 220;

export function useRelayTypewriter(lines: RelayLine[]) {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("type");

  useEffect(() => {
    const line = lines[idx];
    let t: ReturnType<typeof setTimeout>;

    if (phase === "type") {
      if (typed.length < line.suffix.length) {
        t = setTimeout(() => setTyped(line.suffix.slice(0, typed.length + 1)), TYPE_MS);
      } else {
        t = setTimeout(() => setPhase("pause"), PAUSE_MS);
      }
    } else if (phase === "pause") {
      t = setTimeout(() => setPhase("erase"), 0);
    } else if (phase === "erase") {
      if (typed.length > 0) {
        t = setTimeout(() => setTyped(line.suffix.slice(0, typed.length - 1)), ERASE_MS);
      } else {
        t = setTimeout(() => setPhase("gap"), GAP_MS);
      }
    } else if (phase === "gap") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIdx((i) => (i + 1) % lines.length);
      setPhase("type");
    }

    return () => clearTimeout(t);
  }, [typed, phase, idx, lines]);

  const typing = phase === "type";
  const erasing = phase === "erase";

  return {
    idx,
    prefix: lines[idx].prefix,
    typed,
    typing,
    erasing,
    phase,
  };
}
