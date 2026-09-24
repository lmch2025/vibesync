"use client";
// WithdrawModal — elegant withdrawal flow for cashing out gift wallet (€).
// Shows available balance, threshold, amount input, method selection,
// and confirmation. Calls POST /api/vibe/wallet/withdraw.
// Mobile Money withdrawals go through My-CoolPay auto-payout: the user
// picks an operator (Orange Money / MTN MoMo — subtle brand-color cards)
// and a Cameroonian number (6XX XX XX XX, auto-formatted while typing).
// When the server answers withdrawal.status "processing" (auto-payout
// accepted), the done step shows a live « transfert en cours » state with
// an animated smartphone/banknote icon instead of the generic success.
import { useState } from "react";
import { motion } from "framer-motion";
import { Banknote, Check, Loader2, Lock, Smartphone, X, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/lib/vibe/use-currency";
import { useI18n } from "@/lib/vibe/i18n";
import { toast } from "sonner";
import { SuccessBounce, celebrate, haptic, sfx, useShake } from "./interactive-animations";

/// Mobile Money operators supported by My-CoolPay payouts (Cameroon).
type Operator = "CM_OM" | "CM_MOMO";

/// Auto-formats a Cameroonian local number as « 6XX XX XX XX » while typing
/// (digits only, capped at 9). "612345678" → "612 34 56 78".
function formatCmPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)]
    .filter(Boolean)
    .join(" ");
}

export function WithdrawModal({
  open,
  onOpenChange,
  walletEurCents,
  thresholdEur,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  walletEurCents: number;
  thresholdEur: number;
  onSuccess: (newWalletEurCents: number) => void;
}) {
  const { moneyCents } = useCurrency();
  const { t, apiErr } = useI18n();
  const [step, setStep] = useState<"amount" | "method" | "confirm" | "processing" | "done">("amount");
  const [amountEur, setAmountEur] = useState<string>(String(thresholdEur));
  const [method, setMethod] = useState<"stripe" | "mobile_money">("stripe");
  const [operator, setOperator] = useState<Operator>("CM_OM");
  const [phone, setPhone] = useState("");
  // My-CoolPay accepted the payout → funds are being pushed automatically.
  const [autoPayout, setAutoPayout] = useState(false);
  // Error feedback — briefly flashes the amount input border red (300 ms CSS transition).
  const [inputError, setInputError] = useState(false);
  // Shake the modal body when the server refuses the withdrawal.
  const { controls: shakeControls, trigger: triggerShake } = useShake();

  const availableEur = walletEurCents / 100;
  const requestedCents = Math.round(parseFloat(amountEur || "0") * 100);
  const isValid = requestedCents >= thresholdEur * 100 && requestedCents <= walletEurCents;

  // Mobile Money destination — operator label + validated 9-digit number.
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = /^6\d{8}$/.test(phoneDigits);
  const operatorLabel = operator === "CM_OM" ? t("pay.wd.om") : t("pay.wd.momo");

  function reset() {
    setStep("amount");
    setAmountEur(String(thresholdEur));
    setMethod("stripe");
    setOperator("CM_OM");
    setPhone("");
    setAutoPayout(false);
    setInputError(false);
  }

  function close() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  async function submit() {
    setStep("processing");
    try {
      const res = await fetch("/api/vibe/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: requestedCents,
          method,
          operator: method === "mobile_money" ? operator : undefined,
          accountInfo: method === "mobile_money" ? phoneDigits : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // withdrawal.status "processing" → My-CoolPay auto-payout in flight.
      setAutoPayout(data?.withdrawal?.status === "processing");
      setStep("done");
      // Withdrawal confirmed — success fanfare. Fired inside the success
      // handler (not the render) so it triggers exactly once per withdrawal.
      celebrate({ sound: "success", confettiCount: 100 });
      onSuccess(data.walletEurCents);
    } catch (e: any) {
      toast.error(apiErr(e.message) || t("wallet.error"));
      // Refused withdrawal — error sound + modal shake + red border flash.
      sfx.play("error");
      triggerShake();
      setInputError(true);
      window.setTimeout(() => setInputError(false), 1000);
      setStep("amount");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-[400px] p-0 gap-0 overflow-hidden rounded-3xl v-divider v-bg-app! v-fg">
        <VisuallyHidden>
          <DialogTitle>{t("wallet.withdraw.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("wallet.withdraw.dialogDesc")}</DialogDescription>
        </VisuallyHidden>

        {/* Header */}
        <div className="relative bg-emerald-600 px-6 pt-6 pb-5 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full v-surface-3 blur-2xl" />
          <button onClick={close} className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full v-surface-2 text-white hover:v-surface-3">
            <X className="h-4 w-4" />
          </button>
          <div className="relative text-white">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Banknote className="h-5 w-5" /> {t("wallet.withdraw.dialogTitle")}
            </h2>
            <p className="text-white/70 text-xs mt-0.5">{t("wallet.withdraw.sub")}</p>
          </div>
          {/* Available balance */}
          <div className="relative mt-4 rounded-2xl v-surface-2 backdrop-blur p-3">
            <p className="text-white/70 text-[10px] uppercase tracking-wide">{t("wallet.withdraw.available")}</p>
            <p className="font-display text-2xl font-black text-white">{moneyCents(walletEurCents)}</p>
          </div>
        </div>

        {/* Body — shakes horizontally when the server refuses the withdrawal */}
        <motion.div animate={shakeControls} className="v-bg-app px-5 py-5 min-h-[280px]">
          {step === "amount" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <label className="text-xs font-semibold v-fg-muted mb-2 block">{t("wallet.withdraw.amountLabel")}</label>
              <Input
                type="number"
                min={thresholdEur}
                max={availableEur}
                step="1"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                className={`h-12 rounded-2xl v-surface-2 v-divider v-fg text-lg font-bold tabular-nums transition-[border-color,box-shadow] duration-300 ${
                  inputError ? "border-red-500 ring-2 ring-red-500/30" : ""
                }`}
              />
              <div className="flex items-center justify-between mt-2 text-[11px] v-fg-muted">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> {t("wallet.withdraw.min", { n: thresholdEur })}</span>
                <button onClick={() => setAmountEur(String(availableEur))} className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                  {t("wallet.withdraw.all", { amount: availableEur.toFixed(2) })}
                </button>
              </div>
              {isValid && (
                <button onClick={() => setStep("method")} className="mt-5 w-full h-12 rounded-2xl bg-emerald-600 text-white font-bold text-sm active:scale-95 transition flex items-center justify-center gap-2">
                  {t("common.continue")} <Check className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          )}

          {step === "method" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <label className="text-xs font-semibold v-fg-muted mb-3 block">{t("wallet.withdraw.method")}</label>
              <div className="space-y-2">
                <motion.button
                  onClick={() => { setMethod("stripe"); sfx.play("pop"); haptic(8); }}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={method === "stripe"}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl ring-1 transition ${method === "stripe" ? "ring-emerald-500 bg-emerald-500/5" : "ring-(--v-divider) hover:v-surface-2"}`}
                >
                  <Banknote className={`h-5 w-5 ${method === "stripe" ? "text-emerald-600 dark:text-emerald-400" : "v-fg-muted"}`} />
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold">{t("wallet.withdraw.bankTransfer")}</p>
                    <p className="text-[11px] v-fg-muted">{t("wallet.withdraw.bankNote")}</p>
                  </div>
                  {method === "stripe" && (
                    <SuccessBounce>
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </SuccessBounce>
                  )}
                </motion.button>
                <motion.button
                  onClick={() => { setMethod("mobile_money"); sfx.play("pop"); haptic(8); }}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={method === "mobile_money"}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl ring-1 transition ${method === "mobile_money" ? "ring-emerald-500 bg-emerald-500/5" : "ring-(--v-divider) hover:v-surface-2"}`}
                >
                  <Smartphone className={`h-5 w-5 ${method === "mobile_money" ? "text-emerald-600 dark:text-emerald-400" : "v-fg-muted"}`} />
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold">Mobile Money</p>
                    <p className="text-[11px] v-fg-muted">{t("wallet.withdraw.mmNote")}</p>
                  </div>
                  {method === "mobile_money" && (
                    <SuccessBounce>
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </SuccessBounce>
                  )}
                </motion.button>
              </div>

              {method === "stripe" && (
                <p className="mt-3 text-[11px] v-fg-muted leading-relaxed">
                  {t("pay.wd.manualNote")}
                </p>
              )}

              {method === "mobile_money" && (
                <div className="mt-4 space-y-3">
                  {/* Operator selector — subtle brand accents, no full brand blocks */}
                  <div>
                    <label className="text-xs font-semibold v-fg-muted mb-2 block">{t("pay.wd.operator")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        onClick={() => { setOperator("CM_OM"); sfx.play("pop"); haptic(8); }}
                        whileTap={{ scale: 0.97 }}
                        aria-pressed={operator === "CM_OM"}
                        className={`relative w-full flex items-center gap-2.5 p-3 rounded-2xl ring-1 transition ${
                          operator === "CM_OM" ? "ring-orange-500 bg-orange-500/5" : "ring-(--v-divider) hover:v-surface-2"
                        }`}
                      >
                        <span aria-hidden className="h-3 w-3 rounded-full bg-orange-500 shrink-0 shadow-sm" />
                        <span className="text-[13px] font-semibold text-left leading-tight">{t("pay.wd.om")}</span>
                        {operator === "CM_OM" && (
                          <SuccessBounce>
                            <Check className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                          </SuccessBounce>
                        )}
                      </motion.button>
                      <motion.button
                        onClick={() => { setOperator("CM_MOMO"); sfx.play("pop"); haptic(8); }}
                        whileTap={{ scale: 0.97 }}
                        aria-pressed={operator === "CM_MOMO"}
                        className={`relative w-full flex items-center gap-2.5 p-3 rounded-2xl ring-1 transition ${
                          operator === "CM_MOMO" ? "ring-yellow-500 bg-yellow-400/5" : "ring-(--v-divider) hover:v-surface-2"
                        }`}
                      >
                        <span aria-hidden className="h-3 w-3 rounded-full bg-yellow-400 shrink-0 ring-1 ring-yellow-600/20 shadow-sm" />
                        <span className="text-[13px] font-semibold text-left leading-tight">{t("pay.wd.momo")}</span>
                        {operator === "CM_MOMO" && (
                          <SuccessBounce>
                            <Check className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                          </SuccessBounce>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Mobile Money number — Cameroonian, auto-formatted */}
                  <div>
                    <label htmlFor="wd-phone" className="text-xs font-semibold v-fg-muted mb-2 block">{t("pay.wd.phone")}</label>
                    <div
                      className={`flex items-center rounded-2xl v-surface-2 ring-1 transition-[color,box-shadow] duration-300 ${
                        inputError ? "ring-red-500" : phoneValid ? "ring-emerald-500" : "ring-(--v-divider)"
                      }`}
                    >
                      <span aria-hidden className="pl-3.5 pr-2 text-sm font-semibold v-fg-muted tabular-nums select-none">🇨🇲 +237</span>
                      <input
                        id="wd-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={(e) => setPhone(formatCmPhone(e.target.value))}
                        placeholder={t("pay.wd.phonePlaceholder")}
                        className="h-12 flex-1 min-w-0 bg-transparent pr-3.5 v-fg text-base font-semibold tracking-wide outline-none placeholder:v-fg-faint placeholder:font-normal placeholder:tracking-normal tabular-nums"
                      />
                      {phoneValid && (
                        <SuccessBounce className="pr-3">
                          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </SuccessBounce>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] v-fg-muted leading-relaxed flex items-start gap-1.5">
                    <Zap className="h-3.5 w-3.5 mt-px text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {t("pay.wd.autoNote", { operator: operatorLabel })}
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button onClick={() => setStep("amount")} className="h-12 px-4 rounded-2xl v-surface-2 ring-1 ring-(--v-divider) text-sm font-medium hover:v-surface-3">
                  {t("common.back")}
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={method === "mobile_money" && !phoneValid}
                  className="flex-1 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-sm active:scale-95 transition disabled:opacity-40"
                >
                  {t("common.continue")}
                </button>
              </div>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
              <div className="rounded-2xl v-surface-1 ring-1 ring-(--v-divider) p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="v-fg-muted">{t("wallet.withdraw.confirmAmount")}</span>
                  <span className="font-bold tabular-nums">{parseFloat(amountEur).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="v-fg-muted">{t("wallet.withdraw.confirmMethod")}</span>
                  <span className="font-medium">{method === "stripe" ? t("wallet.withdraw.bankTransfer") : `Mobile Money · ${operatorLabel}`}</span>
                </div>
                {method === "mobile_money" && (
                  <div className="flex justify-between text-sm">
                    <span className="v-fg-muted">{t("pay.wd.phone")}</span>
                    <span className="font-medium tabular-nums">+237 {phone}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="v-fg-muted">{t("wallet.withdraw.fees")}</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{t("wallet.withdraw.free")}</span>
                </div>
                <div className="h-px bg-(--v-divider) my-1" />
                <div className="flex justify-between text-sm">
                  <span className="v-fg-muted">{t("wallet.withdraw.youGet")}</span>
                  <span className="font-display font-black text-lg tabular-nums">{parseFloat(amountEur).toFixed(2)} €</span>
                </div>
              </div>
              <p className="text-[11px] v-fg-muted text-center">
                {method === "stripe" ? t("wallet.withdraw.bankDelay") : t("wallet.withdraw.mmDelay")}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep("method")} className="h-12 px-4 rounded-2xl v-surface-2 ring-1 ring-(--v-divider) text-sm font-medium">
                  {t("common.back")}
                </button>
                <button onClick={submit} className="flex-1 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-sm active:scale-95 transition">
                  {t("wallet.withdraw.confirmBtn")}
                </button>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400" />
              <p className="mt-3 text-sm v-fg-muted">{t("wallet.withdraw.processing")}</p>
            </div>
          )}

          {step === "done" && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10 text-center">
              {autoPayout ? (
                <>
                  {/* Auto-payout live — smartphone emitting a banknote pulse */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="relative grid place-items-center h-16 w-16 rounded-full bg-emerald-500/15 ring-2 ring-emerald-500"
                  >
                    <Smartphone className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    <motion.span
                      aria-hidden
                      animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full ring-2 ring-emerald-400"
                    />
                    <motion.span
                      aria-hidden
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -bottom-1.5 -right-1.5 grid place-items-center h-7 w-7 rounded-full bg-emerald-500 text-white shadow-md"
                    >
                      <Banknote className="h-3.5 w-3.5" />
                    </motion.span>
                  </motion.div>
                  <h3 className="font-display text-lg font-bold mt-4">{t("pay.wd.processing")}</h3>
                  <p className="text-sm v-fg-muted mt-1 max-w-[260px]">{t("pay.wd.processingSub")}</p>
                  <p className="text-[12px] v-fg-muted mt-2 tabular-nums">
                    {parseFloat(amountEur).toFixed(2)} € · {operatorLabel} +237 {phone}
                  </p>
                </>
              ) : (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="grid place-items-center h-16 w-16 rounded-full bg-emerald-500/15 ring-2 ring-emerald-500">
                    <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                  <h3 className="font-display text-lg font-bold mt-4">{t("wallet.withdraw.doneTitle")}</h3>
                  <p className="text-sm v-fg-muted mt-1 max-w-[260px]">
                    {parseFloat(amountEur).toFixed(2)} € {method === "stripe" ? t("wallet.withdraw.doneBank") : t("wallet.withdraw.doneMm")}
                  </p>
                </>
              )}
              <button onClick={close} className="mt-5 h-12 px-6 rounded-2xl bg-emerald-600 text-white font-bold text-sm active:scale-95 transition">
                {t("wallet.withdraw.done")}
              </button>
            </motion.div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
