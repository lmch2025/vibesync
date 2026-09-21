"use client";
// AuthModal — elegant, modern authentication dialog.
// Flow: PhoneField (indicatif pays intégré + numéro local) → check-phone →
// (new) PIN create+confirm / (existing) PIN login.
// All inside a shadcn Dialog with smooth Framer Motion step transitions.
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { PhoneField } from "@/components/vibe/phone-field";
import { useVibe } from "@/lib/vibe/store";
import { GEO_COUNTRIES, getCountry, type GeoCountry } from "@/lib/vibe/geo/countries";
import { useI18n } from "@/lib/vibe/i18n";
import { toast } from "sonner";

type Step = "phone" | "pin-create" | "pin-confirm" | "pin-login";

export function AuthModal({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const { t, apiErr } = useI18n();
  const setMe = useVibe((s) => s.setMe);
  const [step, setStep] = useState<Step>("phone");
  // FR par défaut — PhoneField affine au montage (localStorage du visiteur,
  // puis détection géo /api/vibe/detect).
  const [country, setCountry] = useState<GeoCountry>(
    () => getCountry("FR") ?? GEO_COUNTRIES[0]
  );
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset state on close so the modal is fresh for the next open.
  // Intercepting onOpenChange (an event handler) is the lint-compliant way
  // to reset state: no useEffect, no ref access during render.
  function handleOpenChange(o: boolean) {
    if (!o) {
      setStep("phone");
      setPhone("");
      setPin("");
      setConfirmPin("");
      setLoading(false);
    }
    onOpenChange(o);
  }

  const fullPhone = useMemo(() => `${country.dial}${phone.replace(/\s/g, "")}`, [country, phone]);

  async function checkPhone() {
    if (phone.replace(/\s/g, "").length < 6) {
      toast.error(t("landing.auth.invalidPhone"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/vibe/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep(data.exists ? "pin-login" : "pin-create");
    } catch (e: any) {
      toast.error(apiErr(e.message) || t("landing.auth.error"));
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setLoading(true);
    try {
      const res = await fetch("/api/vibe/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.user) {
        setMe(data.user);
        useVibe.getState().setRates(data.rates ?? {});
      }
      toast.success(t("landing.auth.welcome"));
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(apiErr(e.message) || t("landing.auth.error"));
      setStep("pin-create");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setLoading(true);
    try {
      const res = await fetch("/api/vibe/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.user) {
        setMe(data.user);
        useVibe.getState().setRates(data.rates ?? {});
      }
      toast.success(t("landing.auth.welcomeBack"));
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(apiErr(e.message) || t("landing.auth.error"));
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="immersive max-w-[420px] p-0 gap-0 overflow-hidden rounded-3xl border-white/10 v-bg-app! text-white">
        {/* Gradient header */}
        <div className="relative vibe-gradient px-6 pt-6 pb-7 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <VibeLogo className="[&_span]:text-white" />
            <span className="text-[11px] font-semibold text-white/80 bg-white/15 rounded-full px-2.5 py-1 backdrop-blur">
              {step === "phone" && t("landing.auth.stepBadge")}
              {(step === "pin-create" || step === "pin-confirm" || step === "pin-login") && t("landing.auth.security")}
            </span>
          </div>
          <div className="relative mt-3 text-white">
            <DialogTitle className="font-display text-xl font-bold">
              {step === "phone" && t("landing.auth.titlePhone")}
              {step === "pin-create" && t("landing.auth.titleCreate")}
              {step === "pin-confirm" && t("landing.auth.titleConfirm")}
              {step === "pin-login" && t("landing.auth.titleLogin")}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-sm mt-0.5">
              {step === "phone" && t("landing.auth.descPhone")}
              {step === "pin-create" && t("landing.auth.descCreate")}
              {step === "pin-confirm" && t("landing.auth.descConfirm")}
              {step === "pin-login" && t("landing.auth.descLogin")}
            </DialogDescription>
          </div>
        </div>

        {/* Step body — thème immersif de la page d'accueil */}
        <div className="v-bg-app px-6 py-7 min-h-[260px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === "phone" && (
              <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <label className="text-xs font-semibold text-white/75 mb-2">{t("landing.auth.phone")}</label>
                <PhoneField
                  value={{ country, local: phone }}
                  onChange={(v) => {
                    setCountry(v.country);
                    setPhone(v.local);
                  }}
                  onEnter={checkPhone}
                  placeholder={t("landing.auth.phonePlaceholder")}
                  ariaLabel={t("landing.auth.phone")}
                />
                <button
                  onClick={checkPhone}
                  disabled={loading}
                  className="mt-5 h-12 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {loading ? t("landing.auth.checking") : t("common.continue")}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-[11px] text-white/70 text-center mt-5 leading-relaxed">
                  {t("landing.auth.legal1")}<br />{t("landing.auth.legal2")}
                </p>
              </motion.div>
            )}

            {step === "pin-create" && (
              <motion.div key="pin-create" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex-1 flex flex-col items-center">
                <BackBtn onClick={() => setStep("phone")} />
                <ShieldCheck className="h-8 w-8 text-primary mb-2 mt-2" />
                <InputOTP maxLength={4} value={pin} onChange={setPin}>
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                  </InputOTPGroup>
                </InputOTP>
                <AnimatePresence>
                  {pin.length === 4 && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setStep("pin-confirm")}
                      className="mt-5 h-11 px-5 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center gap-2 active:scale-95 transition"
                    >
                      {t("common.continue")} <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {step === "pin-confirm" && (
              <motion.div key="pin-confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center">
                <BackBtn onClick={() => setStep("pin-create")} />
                <InputOTP
                  maxLength={4}
                  value={confirmPin}
                  onChange={(v) => {
                    setConfirmPin(v);
                    if (v.length === 4 && v === pin) register();
                    else if (v.length === 4 && v !== pin) toast.error(t("landing.auth.pinMismatch"));
                  }}
                >
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                  </InputOTPGroup>
                </InputOTP>
                {loading && <p className="text-sm text-white/75 mt-5">{t("landing.auth.creating")}</p>}
              </motion.div>
            )}

            {step === "pin-login" && (
              <motion.div key="pin-login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center">
                <BackBtn onClick={() => setStep("phone")} />
                <KeyRound className="h-8 w-8 text-primary mb-2 mt-2" />
                <InputOTP maxLength={4} value={pin} onChange={setPin}>
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl rounded-xl border-white/15 bg-white/5 text-white" />
                  </InputOTPGroup>
                </InputOTP>
                <AnimatePresence>
                  {pin.length === 4 && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={login}
                      className="mt-5 h-11 px-5 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center gap-2 active:scale-95 transition"
                    >
                      {loading ? "…" : t("landing.auth.signIn")}
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button onClick={onClick} className="self-start mb-4 text-sm text-white/75 hover:text-white flex items-center gap-1 transition">
      <ArrowLeft className="h-4 w-4" /> {t("common.back")}
    </button>
  );
}
