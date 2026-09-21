"use client";
// Auth flow: phone (PhoneField — indicatif pays intégré + numéro local) →
// check-phone → (new user) PIN create+confirm / (existing user) PIN login.
// Même flux que la modale d'auth du landing (auth-modal.tsx) — l'ancien flux
// OTP appelait /api/vibe/auth/request-otp qui n'existait pas (404 systématique).
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { PhoneField } from "@/components/vibe/phone-field";
import { useVibe } from "@/lib/vibe/store";
import { useI18n } from "@/lib/vibe/i18n";
import { LangSwitcher } from "@/components/vibe/lang-switcher";
import { GEO_COUNTRIES, getCountry, type GeoCountry } from "@/lib/vibe/geo/countries";
import { toast } from "sonner";
import { celebrate, haptic, sfx, useShake } from "./interactive-animations";

type Step = "phone" | "pin-create" | "pin-confirm" | "pin-login";

export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const setMe = useVibe((s) => s.setMe);
  const { t, apiErr } = useI18n();
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

  // Feedback immersif : shake de la carte sur erreur, célébration unique au succès.
  const { controls: shakeControls, trigger: triggerShake } = useShake();
  const celebratedRef = useRef(false);

  // Le numéro complet (indicatif + numéro local sans espaces) envoyé aux API.
  const fullPhone = useMemo(
    () => `${country.dial}${phone.replace(/\s/g, "")}`,
    [country, phone]
  );

  function fireAuthCelebrate() {
    if (celebratedRef.current) return; // garde anti double-fire (StrictMode)
    celebratedRef.current = true;
    celebrate({ sound: "chime", confettiCount: 90, hapticPattern: [10, 20, 10] });
  }

  function authError(message: string) {
    sfx.play("error");
    triggerShake();
    toast.error(message);
  }

  // Chaque chiffre saisi → pop discret + micro-haptique.
  function digitTap() {
    sfx.play("pop");
    haptic(6);
  }

  // Étape 1 → le numéro existe-t-il déjà ? (PIN login) sinon création de compte.
  async function checkPhone() {
    if (phone.replace(/\s/g, "").length < 6) {
      authError(t("auth.phoneInvalid"));
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
      authError(apiErr(e.message) || t("auth.error"));
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
      // Use the user + rates returned directly by the auth response — no second
      // /me fetch. This is critical in cross-site iframe contexts where the
      // session cookie may not be sent on the immediate next request.
      if (data.user) {
        setMe(data.user);
        useVibe.getState().setRates(data.rates ?? {});
      }
      toast.success(t("auth.welcomeToast"));
      fireAuthCelebrate();
      onSuccess();
    } catch (e: any) {
      authError(apiErr(e.message) || t("auth.error"));
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
      // Use the user + rates returned directly by the auth response — no second
      // /me fetch (robust against cross-site iframe cookie restrictions).
      if (data.user) {
        setMe(data.user);
        useVibe.getState().setRates(data.rates ?? {});
      }
      toast.success(t("auth.welcomeBackToast"));
      fireAuthCelebrate();
      onSuccess();
    } catch (e: any) {
      authError(apiErr(e.message) || t("auth.error"));
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      animate={shakeControls}
      className="immersive relative w-full max-w-md h-[600px] sm:h-[680px] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10 v-bg-page text-white"
    >
      <div className="absolute inset-0 vibe-gradient-soft" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="v-ambient-orb absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl animate-float-slow" />
        <div className="v-ambient-orb absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
      </div>
      {/* Sélecteur de langue — le visiteur peut changer avant de se connecter. */}
      <LangSwitcher tone="onDark" className="absolute top-3 right-3 z-20" />
      <div className="relative z-10 h-full flex flex-col px-6 pt-10 pb-8 overflow-y-auto no-scrollbar">
        <div className="flex justify-center mb-6">
          <VibeLogo className="[&_span:last-child]:text-white" />
        </div>

        <AnimatePresence mode="wait">
          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex-1 flex flex-col">
              <h2 className="font-display text-2xl font-bold text-center mb-2">{t("auth.title")}</h2>
              <p className="text-sm text-white/75 text-center mb-8">
                {t("auth.subtitle")}
              </p>
              <PhoneField
                value={{ country, local: phone }}
                onChange={(v) => {
                  setCountry(v.country);
                  setPhone(v.local);
                }}
                onEnter={checkPhone}
                placeholder={t("auth.phonePlaceholder")}
                ariaLabel={t("auth.phone")}
              />
              <button
                onClick={checkPhone}
                disabled={loading}
                className="mt-4 h-12 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t("auth.checking")}</>
                ) : (
                  <>{t("auth.continue")} <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
              <p className="text-[11px] text-white/70 text-center mt-6 leading-relaxed">
                {t("auth.legal")}
              </p>
            </motion.div>
          )}

          {step === "pin-create" && (
            <motion.div key="pin-create" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex-1 flex flex-col">
              <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-3" />
              <h2 className="font-display text-2xl font-bold text-center mb-2">{t("auth.pinCreateTitle")}</h2>
              <p className="text-sm text-white/75 text-center mb-8">
                {t("auth.pinCreateHint")}
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={pin} onChange={(v) => { if (v.length > pin.length) digitTap(); setPin(v); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <AnimatePresence>
                {pin.length === 4 && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setStep("pin-confirm")}
                    className="mt-6 h-12 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    {t("auth.continue")} <ArrowRight className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {step === "pin-confirm" && (
            <motion.div key="pin-confirm" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex-1 flex flex-col">
              <button onClick={() => setStep("pin-create")} className="self-start mb-4 text-sm text-white/75 hover:text-white flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> {t("auth.back")}
              </button>
              <h2 className="font-display text-2xl font-bold text-center mb-2">{t("auth.pinConfirmTitle")}</h2>
              <p className="text-sm text-white/75 text-center mb-8">{t("auth.pinConfirmHint")}</p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={confirmPin}
                  onChange={(v) => {
                    if (v.length > confirmPin.length) digitTap();
                    setConfirmPin(v);
                    if (v.length === 4 && v === pin) register();
                    else if (v.length === 4 && v !== pin) authError(t("auth.pinMismatch"));
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {loading && (
                <p className="text-center text-sm text-white/75 mt-6 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("auth.creatingAccount")}
                </p>
              )}
            </motion.div>
          )}

          {step === "pin-login" && (
            <motion.div key="pin-login" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex-1 flex flex-col">
              <button onClick={() => setStep("phone")} className="self-start mb-4 text-sm text-white/75 hover:text-white flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> {t("auth.back")}
              </button>
              <KeyRound className="h-10 w-10 text-primary mx-auto mb-3" />
              <h2 className="font-display text-2xl font-bold text-center mb-2">{t("auth.pinLoginTitle")}</h2>
              <p className="text-sm text-white/75 text-center mb-8">{t("auth.pinLoginHint")}</p>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={pin} onChange={(v) => { if (v.length > pin.length) digitTap(); setPin(v); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <AnimatePresence>
                {pin.length === 4 && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={login}
                    className="mt-6 h-12 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {t("auth.signingIn")}</>
                    ) : (
                      t("auth.signIn")
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
