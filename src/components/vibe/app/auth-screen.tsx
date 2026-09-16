"use client";
// Auth flow: phone → OTP → (new user) PIN create+confirm / (existing user) PIN login.
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Phone, ShieldCheck, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { useVibe } from "@/lib/vibe/store";
import { toast } from "sonner";
import { celebrate, haptic, sfx, useShake } from "./interactive-animations";

type Step = "phone" | "otp" | "pin-create" | "pin-confirm" | "pin-login";

export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const setMe = useVibe((s) => s.setMe);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  // Feedback immersif : shake de la carte sur erreur, célébration unique au succès.
  const { controls: shakeControls, trigger: triggerShake } = useShake();
  const celebratedRef = useRef(false);

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

  async function requestOtp() {
    if (phone.replace(/\s/g, "").length < 8) {
      authError("Numéro invalide");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/vibe/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUserExists(!!data.exists);
      setDevOtp(data.otp);
      setStep("otp");
      toast.success("Code envoyé par SMS (démo : " + data.otp + ")");
    } catch (e: any) {
      authError(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function verifyOtp(v: string) {
    if (v.length === 4) {
      if (v !== devOtp && v !== "4242") {
        authError("Code incorrect");
        return;
      }
      setStep(userExists ? "pin-login" : "pin-create");
    }
  }

  async function register() {
    setLoading(true);
    try {
      const res = await fetch("/api/vibe/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
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
      toast.success("Bienvenue sur Vivilov ! +25 Vibes offertes 🎁");
      fireAuthCelebrate();
      onSuccess();
    } catch (e: any) {
      authError(e.message || "Erreur");
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
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Use the user + rates returned directly by the auth response — no second
      // /me fetch (robust against cross-site iframe cookie restrictions).
      if (data.user) {
        setMe(data.user);
        useVibe.getState().setRates(data.rates ?? {});
      }
      toast.success("Content de te revoir 👋");
      fireAuthCelebrate();
      onSuccess();
    } catch (e: any) {
      authError(e.message || "Erreur");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      animate={shakeControls}
      className="relative w-full max-w-md h-[600px] sm:h-[680px] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10 v-bg-page text-white"
    >
      <div className="absolute inset-0 vibe-gradient-soft" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="v-ambient-orb absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl animate-float-slow" />
        <div className="v-ambient-orb absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
      </div>
      <div className="relative z-10 h-full flex flex-col px-6 pt-10 pb-8 overflow-y-auto no-scrollbar">
        <div className="flex justify-center mb-6">
          <VibeLogo className="[&_span:last-child]:text-white" />
        </div>

        <AnimatePresence mode="wait">
          {step === "phone" && (
            <motion.div key="phone" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex-1 flex flex-col">
              <h2 className="font-display text-2xl font-bold text-center mb-2">Ton numéro, ta vibe.</h2>
              <p className="text-sm text-white/75 text-center mb-8">
                On t&apos;envoie un code par SMS. Aucune photo de profil à remplir — juste toi, en vidéo.
              </p>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12 rounded-2xl bg-white/5 border-white/15 text-white placeholder:text-white/50 text-base"
                  onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                />
              </div>
              <button
                onClick={requestOtp}
                disabled={loading}
                className="mt-4 h-12 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Envoi du code…</>
                ) : (
                  <>Recevoir le code <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
              <p className="text-[11px] text-white/70 text-center mt-6 leading-relaxed">
                En continuant, tu acceptes nos CGU et notre Politique RGPD.
                Ton numéro n&apos;est jamais affiché publiquement.
              </p>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex-1 flex flex-col">
              <button onClick={() => setStep("phone")} className="self-start mb-4 text-sm text-white/75 hover:text-white flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <h2 className="font-display text-2xl font-bold text-center mb-2">Entre le code</h2>
              <p className="text-sm text-white/75 text-center mb-8">
                SMS envoyé au {phone}. <span className="text-primary font-medium">(Démo : 4242)</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={otp} onChange={(v) => { if (v.length > otp.length) digitTap(); setOtp(v); verifyOtp(v); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl border-white/15 bg-white/5 text-white rounded-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </motion.div>
          )}

          {step === "pin-create" && (
            <motion.div key="pin-create" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex-1 flex flex-col">
              <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-3" />
              <h2 className="font-display text-2xl font-bold text-center mb-2">Crée ton code PIN</h2>
              <p className="text-sm text-white/75 text-center mb-8">
                4 chiffres. Sert à te reconnecter vite. Hashé en base, jamais partagé.
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
                    Continuer <ArrowRight className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {step === "pin-confirm" && (
            <motion.div key="pin-confirm" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex-1 flex flex-col">
              <button onClick={() => setStep("pin-create")} className="self-start mb-4 text-sm text-white/75 hover:text-white flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <h2 className="font-display text-2xl font-bold text-center mb-2">Confirme ton PIN</h2>
              <p className="text-sm text-white/75 text-center mb-8">Retape les 4 chiffres.</p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={confirmPin}
                  onChange={(v) => {
                    if (v.length > confirmPin.length) digitTap();
                    setConfirmPin(v);
                    if (v.length === 4 && v === pin) register();
                    else if (v.length === 4 && v !== pin) authError("Les codes ne correspondent pas");
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Création du compte…
                </p>
              )}
            </motion.div>
          )}

          {step === "pin-login" && (
            <motion.div key="pin-login" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="flex-1 flex flex-col">
              <button onClick={() => setStep("otp")} className="self-start mb-4 text-sm text-white/75 hover:text-white flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <KeyRound className="h-10 w-10 text-primary mx-auto mb-3" />
              <h2 className="font-display text-2xl font-bold text-center mb-2">Ton code PIN</h2>
              <p className="text-sm text-white/75 text-center mb-8">Heureux de te revoir. Entre ton PIN à 4 chiffres.</p>
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
                      <><Loader2 className="h-4 w-4 animate-spin" /> Connexion…</>
                    ) : (
                      "Se connecter"
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
