"use client";
// PaymentReturnOverlay — élégant full-screen status overlay shown when the
// app is reloaded after a My-CoolPay hosted checkout. The merchant dashboard
// redirects back with ?pay=success|cancel|fail|return&ref=tiluu_pay_… (the
// ref is our own app_transaction_ref passed through My-CoolPay). If the ref
// param was dropped, we fall back to the "tiluu_pay_return" appRef persisted
// in sessionStorage right before the redirect (see wallet-screen buy()).
//
// Detection (client-only, once on mount — SSR renders nothing):
//   • URL ?ref=tiluu_…  → poll that ref (priority)
//   • else sessionStorage "tiluu_pay_return" → poll the stored ref
//     (covers merchant redirects that drop the ref, e.g. /?pay=success
//     alone, as well as plain returns without any params)
//   • no ref anywhere (or anonymous user) → render null
//
// The overlay polls GET /api/vibe/pay/status?appRef=… every 2.5 s (max 36
// attempts ≈ 90 s). The server checks the provider, credits idempotently and
// answers with a final status — the URL param is only a trigger, the server
// is the source of truth. On resolution the URL params are stripped
// (history.replaceState, other params preserved) and the sessionStorage key
// cleared.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertCircle, Ban, Clock, Wallet as WalletIcon, X } from "lucide-react";
import { useVibe, type MeUser } from "@/lib/vibe/store";
import { useI18n } from "@/lib/vibe/i18n";
import { celebrate, haptic, sfx, SuccessBounce } from "./interactive-animations";
import { resumePendingVibes } from "./pending-vibes-resume";

/// sessionStorage key shared with wallet-screen buy() — holds the JSON
/// { appRef, packId } of the checkout we redirected to.
export const PAY_RETURN_STORAGE_KEY = "tiluu_pay_return";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 36; // ≈ 90 s
const PENDING_AFTER_MS = 20_000; // switch copy to "pending" after this long

type Phase = "checking" | "pending" | "success" | "canceled" | "failed" | "timeout";

type StatusPayload = {
  status?: string;
  credited?: boolean;
  gems?: number;
  freeGems?: number;
  added?: number;
  packTitle?: string;
};

/// Read the return context — URL params first, sessionStorage fallback.
/// Returns null when there is nothing to check (no ref anywhere).
function detectReturn(): { appRef: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const refParam = params.get("ref");
  const refFromUrl = refParam?.startsWith("tiluu_") ? refParam : null;

  // Fallback — the appRef persisted before redirecting to the checkout.
  let refFromStorage: string | null = null;
  try {
    const raw = sessionStorage.getItem(PAY_RETURN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (typeof parsed?.appRef === "string" && parsed.appRef.startsWith("tiluu_")) {
      refFromStorage = parsed.appRef;
    }
  } catch {
    /* corrupted entry / private mode — ignore */
  }

  // Param has priority over the stored ref. No ref anywhere → nothing to check.
  const appRef = refFromUrl ?? refFromStorage;
  if (!appRef) return null;
  return { appRef };
}

/// Strip ?pay & ?ref from the address bar (other params preserved) and drop
/// the sessionStorage return context. Safe to call repeatedly.
function cleanupReturnContext() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of ["pay", "ref"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(null, "", url.toString());
  } catch {
    /* non-standard context — ignore */
  }
  try {
    sessionStorage.removeItem(PAY_RETURN_STORAGE_KEY);
  } catch {
    /* private mode — nothing stored anyway */
  }
}

export function PaymentReturnOverlay({ onGoWallet }: { onGoWallet?: () => void }) {
  const { t } = useI18n();
  const patchMe = useVibe((s) => s.patchMe);
  const [open, setOpen] = useState(false);
  const [appRef, setAppRef] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [result, setResult] = useState<StatusPayload | null>(null);
  // Mount flag — once a payment return has been seen we keep the (invisible)
  // wrapper mounted so exit animations can play on close.
  const [everOpened, setEverOpened] = useState(false);

  // Keep the latest `t` (changes with the language) without re-running the
  // polling effect — a language switch must not restart the 90 s window.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // True as soon as the user closes the overlay — closes the tiny race
  // window between close() and the polling effect's cleanup, so a poll
  // resolving in that instant can't fire a late celebrate/patch.
  const stoppedRef = useRef(false);

  // Detection — ONCE on mount, client-side only. Anonymous visitors see
  // nothing even with ?ref=… (the status endpoint requires the owner's
  // session anyway).
  useEffect(() => {
    if (!useVibe.getState().me) return;
    const detected = detectReturn();
    if (detected) {
      setAppRef(detected.appRef);
      setOpen(true);
      setEverOpened(true);
    }
  }, []);

  // Polling loop — one pass per detected payment.
  useEffect(() => {
    if (!appRef) return;
    let cancelled = false;
    stoppedRef.current = false;
    const startedAt = Date.now();
    setPhase("checking");
    setResult(null);

    const finish = (p: Phase, payload?: StatusPayload | null) => {
      if (cancelled || stoppedRef.current) return;
      cancelled = true; // stop the loop — same guard as the async closure
      setPhase(p);
      setResult(payload ?? null);
      cleanupReturnContext();
      if (p === "success") {
        const data = payload ?? {};
        const patch: Partial<MeUser> = {};
        if (typeof data.gems === "number") patch.gems = data.gems;
        if (typeof data.freeGems === "number") patch.freeGems = data.freeGems;
        if (Object.keys(patch).length > 0) patchMe(patch);
        celebrate({ sound: "coin", hapticPattern: [15, 40, 15], confettiCount: 120 });
        resumePendingVibes(tRef.current);
      } else if (p === "failed") {
        sfx.play("error");
        haptic(20);
      } else if (p === "canceled") {
        haptic(10);
      }
    };

    (async () => {
      let consecutiveErrors = 0; // non-ok responses (404/5xx/network)
      for (let attempt = 1; attempt <= MAX_POLLS; attempt++) {
        if (cancelled || stoppedRef.current) return;
        // Poll only while authenticated — a logged-out user can't be credited.
        if (!useVibe.getState().me) return;
        let data: StatusPayload | null = null;
        let failedFetch = false;
        try {
          const res = await fetch(
            `/api/vibe/pay/status?appRef=${encodeURIComponent(appRef)}`,
            { cache: "no-store" },
          );
          if (res.ok) data = await res.json();
          else failedFetch = true;
        } catch {
          failedFetch = true;
        }
        if (cancelled || stoppedRef.current) return;
        // Repeated hard failures (unknown ref / API down) → don't spin for
        // 90 s, fall through to the timeout state (closeable, wallet
        // auto-refreshes if the payment confirms later anyway).
        consecutiveErrors = failedFetch ? consecutiveErrors + 1 : 0;
        if (consecutiveErrors >= 3) return finish("timeout");
        const st = data?.status;
        if (st === "success") return finish("success", data);
        if (st === "canceled") return finish("canceled", data);
        if (st === "failed") return finish("failed", data);
        // Still pending after a few polls → softer "it's being validated" copy.
        if (Date.now() - startedAt >= PENDING_AFTER_MS) {
          setPhase((p) => (p === "checking" ? "pending" : p));
        }
        if (attempt < MAX_POLLS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
      }
      // 90 s without a final state — let the user go; the payment may still
      // confirm later (webhook) and the wallet auto-refreshes.
      finish("timeout");
    })();

    return () => {
      cancelled = true;
    };
    // patchMe is a stable zustand action and t is read via tRef on purpose —
    // a language switch must not restart the polling window.
  }, [appRef]);

  const close = useCallback(() => {
    stoppedRef.current = true;
    setOpen(false);
    setAppRef(null);
    setPhase("checking");
    setResult(null);
    cleanupReturnContext();
  }, []);

  const goWallet = useCallback(() => {
    sfx.play("pop");
    close();
    onGoWallet?.();
  }, [close, onGoWallet]);

  // Renders nothing while idle — AnimatePresence has no children and the
  // Radix Root with open={false} renders nothing else. Staying mounted lets
  // the close/exit animation play out before the portal unmounts.
  if (!everOpened) return null;

  const added = typeof result?.added === "number" ? result.added : 0;
  const isChecking = phase === "checking" || phase === "pending";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            {/* Glassmorphism backdrop — blurred, deep-dim, premium */}
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-md"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="fixed left-1/2 top-1/2 z-[80] w-[min(calc(100vw-2.5rem),340px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl v-bg-app v-fg ring-1 ring-(--v-divider) shadow-2xl overflow-hidden"
              >
              {/* Ambient brand aura behind the card content */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full vibe-gradient opacity-[0.16] blur-3xl"
              />
              {/* Close — 44px touch target */}
              <button
                onClick={close}
                aria-label={t("pay.return.close")}
                className="absolute top-2.5 right-2.5 z-10 h-11 w-11 grid place-items-center rounded-full v-fg-muted hover:v-surface-2 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div
                role="status"
                aria-live="polite"
                className="relative px-6 pt-9 pb-6 flex flex-col items-center text-center"
              >
                <AnimatePresence mode="wait">
                  {isChecking && (
                    <motion.div
                      key="checking"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="w-full flex flex-col items-center"
                    >
                      {/* Pulsing 💎 in a brand-gradient halo + spinner ring */}
                      <div className="relative h-24 w-24 grid place-items-center">
                        <motion.span
                          aria-hidden
                          animate={{ scale: [1, 1.28, 1], opacity: [0.35, 0.14, 0.35] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-2 rounded-full vibe-gradient blur-lg"
                        />
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full border-2 v-divider border-t-vibe-purple animate-spin"
                          style={{ animationDuration: "1.1s" }}
                        />
                        <motion.span
                          aria-hidden
                          animate={{ scale: [1, 1.12, 1] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                          className="relative text-4xl drop-shadow-lg"
                        >
                          💎
                        </motion.span>
                      </div>

                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] v-fg-faint mt-5">
                        {t("pay.return.title")}
                      </p>
                      <DialogPrimitive.Title className="font-display text-lg font-bold mt-1">
                        {phase === "pending" ? t("pay.return.pending") : t("pay.return.checking")}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className="text-[13px] v-fg-muted mt-1.5 max-w-[260px] leading-relaxed">
                        {phase === "pending" ? t("pay.return.pendingSub") : t("pay.return.checkingSub")}
                      </DialogPrimitive.Description>

                      {/* Indeterminate gradient progress sweep */}
                      <div aria-hidden className="mt-6 h-1 w-40 overflow-hidden rounded-full v-surface-2">
                        <motion.div
                          animate={{ x: ["-110%", "330%"] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                          className="h-full w-1/3 rounded-full vibe-gradient"
                        />
                      </div>
                    </motion.div>
                  )}

                  {phase === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="w-full flex flex-col items-center"
                    >
                      {/* Emerald celebration — gems landed 💎 */}
                      <SuccessBounce>
                        <span className="grid place-items-center h-24 w-24 rounded-full bg-emerald-400 shadow-xl shadow-emerald-400/40">
                          <span aria-hidden className="text-4xl drop-shadow">💎</span>
                        </span>
                      </SuccessBounce>

                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] v-fg-faint mt-5">
                        {t("pay.return.title")}
                      </p>
                      <DialogPrimitive.Title className="font-display text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                        {t("pay.return.success")}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className="text-[13px] v-fg-muted mt-1.5 max-w-[260px] leading-relaxed">
                        {t("pay.return.successSub", { n: added })}
                      </DialogPrimitive.Description>

                      <div className="mt-7 w-full flex flex-col gap-2">
                        <motion.button
                          onClick={goWallet}
                          whileTap={{ scale: 0.97 }}
                          className="h-12 w-full rounded-2xl vibe-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
                        >
                          <WalletIcon className="h-4 w-4" /> {t("pay.return.wallet")}
                        </motion.button>
                        <button
                          onClick={close}
                          className="h-12 w-full rounded-2xl v-surface-2 ring-1 ring-(--v-divider) text-sm font-medium v-fg-muted hover:v-fg transition"
                        >
                          {t("pay.return.close")}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {phase === "canceled" && (
                    <motion.div
                      key="canceled"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="w-full flex flex-col items-center"
                    >
                      {/* Neutral — nothing was charged */}
                      <SuccessBounce>
                        <span className="grid place-items-center h-24 w-24 rounded-full v-surface-2 ring-1 ring-(--v-divider)">
                          <Ban className="h-10 w-10 v-fg-muted" />
                        </span>
                      </SuccessBounce>

                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] v-fg-faint mt-5">
                        {t("pay.return.title")}
                      </p>
                      <DialogPrimitive.Title className="font-display text-lg font-bold mt-1">
                        {t("pay.return.canceled")}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className="text-[13px] v-fg-muted mt-1.5 max-w-[260px] leading-relaxed">
                        {t("pay.return.canceledSub")}
                      </DialogPrimitive.Description>

                      <button
                        onClick={close}
                        className="mt-7 h-12 w-full rounded-2xl v-surface-2 ring-1 ring-(--v-divider) text-sm font-semibold hover:v-surface-3 transition active:scale-95"
                      >
                        {t("pay.return.close")}
                      </button>
                    </motion.div>
                  )}

                  {phase === "failed" && (
                    <motion.div
                      key="failed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="w-full flex flex-col items-center"
                    >
                      {/* Red accent — the payment was refused */}
                      <SuccessBounce>
                        <span className="grid place-items-center h-24 w-24 rounded-full bg-red-500/10 ring-1 ring-red-400/40">
                          <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
                        </span>
                      </SuccessBounce>

                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] v-fg-faint mt-5">
                        {t("pay.return.title")}
                      </p>
                      <DialogPrimitive.Title className="font-display text-lg font-bold mt-1 text-red-600 dark:text-red-400">
                        {t("pay.return.failed")}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className="text-[13px] v-fg-muted mt-1.5 max-w-[260px] leading-relaxed">
                        {t("pay.return.failedSub")}
                      </DialogPrimitive.Description>

                      <button
                        onClick={close}
                        className="mt-7 h-12 w-full rounded-2xl v-surface-2 ring-1 ring-(--v-divider) text-sm font-semibold hover:v-surface-3 transition active:scale-95"
                      >
                        {t("pay.return.close")}
                      </button>
                    </motion.div>
                  )}

                  {phase === "timeout" && (
                    <motion.div
                      key="timeout"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="w-full flex flex-col items-center"
                    >
                      {/* Amber — taking longer than expected */}
                      <SuccessBounce>
                        <span className="grid place-items-center h-24 w-24 rounded-full bg-amber-400/10 ring-1 ring-amber-300/40">
                          <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                        </span>
                      </SuccessBounce>

                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] v-fg-faint mt-5">
                        {t("pay.return.title")}
                      </p>
                      <DialogPrimitive.Title className="font-display text-lg font-bold mt-1">
                        {t("pay.return.timeout")}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className="text-[13px] v-fg-muted mt-1.5 max-w-[260px] leading-relaxed">
                        {t("pay.return.timeoutSub")}
                      </DialogPrimitive.Description>

                      <button
                        onClick={close}
                        className="mt-7 h-12 w-full rounded-2xl v-surface-2 ring-1 ring-(--v-divider) text-sm font-semibold hover:v-surface-3 transition active:scale-95"
                      >
                        {t("pay.return.close")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
