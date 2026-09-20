"use client";
// AuthModal — elegant, modern authentication dialog.
// Flow: country-code selector + phone → OTP → (new) PIN create+confirm / (existing) PIN login.
// All inside a shadcn Dialog with smooth Framer Motion step transitions.
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Phone,
  Search,
  ShieldCheck,
  KeyRound,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { useVibe } from "@/lib/vibe/store";
import { COUNTRY_CODES, countryName, type Country } from "@/lib/vibe/country-codes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/vibe/i18n";

type Step = "phone" | "pin-create" | "pin-confirm" | "pin-login";

export function AuthModal({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const { t, apiErr } = useI18n();
  const setMe = useVibe((s) => s.setMe);
  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState<Country>(
    () => COUNTRY_CODES.find((c) => c.iso === "FR") ?? COUNTRY_CODES[0]
  );
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [userExists, setUserExists] = useState(false);
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
      setUserExists(false);
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
      setUserExists(!!data.exists);
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
                <div className="flex gap-2">
                  <CountryCodeSelect value={country} onChange={setCountry} />
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder={t("landing.auth.phonePlaceholder")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 h-12 rounded-2xl text-base bg-white/5 border-white/15 text-white placeholder:text-white/50"
                    onKeyDown={(e) => e.key === "Enter" && checkPhone()}
                  />
                </div>
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

function CountryCodeSelect({ value, onChange }: { value: Country; onChange: (c: Country) => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-12 rounded-2xl border border-white/15 v-surface-1 px-3 text-sm font-medium text-white hover:v-surface-2 transition shrink-0"
          aria-label={t("landing.auth.chooseCountry")}
        >
          <span className="text-xl leading-none">{value.flag}</span>
          <span className="tabular-nums">{value.dial}</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="immersive w-[280px] p-0 v-bg-app! text-white border-white/10" align="start">
        <Command className="[&_input]:bg-transparent [&_input]:text-white [&_input]:placeholder:text-white/50">
          <div className="flex items-center border-b border-white/10 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-white/50" />
            <CommandInput placeholder={t("landing.auth.searchCountry")} className="h-9" />
          </div>
          <CommandList className="max-h-[280px]">
            <CommandEmpty>{t("landing.auth.noCountry")}</CommandEmpty>
            <CommandGroup>
              {COUNTRY_CODES.map((c) => (
                <CommandItem
                  key={c.iso}
                  value={`${countryName(c, lang)} ${c.iso} ${c.dial}`}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className="gap-2.5 data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{countryName(c, lang)}</span>
                  <span className="text-white/70 tabular-nums text-sm">{c.dial}</span>
                  {c.iso === value.iso && <Check className="h-4 w-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
