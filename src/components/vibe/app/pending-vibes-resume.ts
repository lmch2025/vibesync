"use client";
// pending-vibes-resume — shared post-top-up hook. After a successful Vibes
// purchase (instant mock credit from the wallet OR My-CoolPay confirmation
// via the payment-return overlay), re-run the premium action / gift that was
// interrupted by an insufficient-balance redirect (see store.redirectForVibes).
// Both call sites show the same « Ton action reprend… » toast, then run the
// stored callback after a short beat so it doesn't step on the celebration.
import { useVibe } from "@/lib/vibe/store";
import { vibeToast } from "./center-feedback";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function resumePendingVibes(t: Translate): void {
  const resume = useVibe.getState().takePendingVibes();
  if (!resume) return;
  vibeToast({
    emoji: "✨",
    title: t("wallet.resumeTitle"),
    sub: t("wallet.resumeSub"),
  });
  window.setTimeout(resume, 700);
}
