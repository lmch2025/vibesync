"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, MapPin, MessageSquare, Percent, Wallet, Gift, Video, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { SuccessBounce } from "@/components/vibe/app/interactive-animations";
import { cn } from "@/lib/utils";
import {
  WITHDRAWAL_THRESHOLD_EUR,
  MAX_MESSAGES_BEFORE_REPLY,
  PLATFORM_COMMISSION,
  WELCOME_GEMS,
} from "@/lib/vibe/constants";

function FieldRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 lg:gap-6 py-5">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="lg:w-72 lg:self-center">{children}</div>
    </div>
  );
}

export function Settings() {
  const [radius, setRadius] = useState(50);
  const [msgLimit, setMsgLimit] = useState(MAX_MESSAGES_BEFORE_REPLY);
  const [commission, setCommission] = useState(Math.round(PLATFORM_COMMISSION * 100));
  const [withdrawal, setWithdrawal] = useState(WITHDRAWAL_THRESHOLD_EUR);
  const [welcomeGems, setWelcomeGems] = useState(WELCOME_GEMS);
  const [videoMaxDuration, setVideoMaxDuration] = useState(15);
  const [videoMaxCount, setVideoMaxCount] = useState(3);
  const [videoMaxWidth, setVideoMaxWidth] = useState(480);
  const [videoQuality, setVideoQuality] = useState(50);
  const [videoMaxSizeKb, setVideoMaxSizeKb] = useState(2048);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  // Brief "saved ✓" state on the submit button after a successful save.
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending "saved" reset when unmounting.
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Load persisted settings from the DB on mount.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vibe/admin/settings");
        const data = await res.json();
        if (res.ok && data.settings) {
          const s = data.settings;
          setRadius(Number(s.defaultRadiusKm) || 50);
          setMsgLimit(Number(s.maxMessagesBeforeReply) || MAX_MESSAGES_BEFORE_REPLY);
          setCommission(Math.round((Number(s.platformCommission) || PLATFORM_COMMISSION) * 100));
          setWithdrawal(Number(s.withdrawalThresholdEur) || WITHDRAWAL_THRESHOLD_EUR);
          setWelcomeGems(Number(s.welcomeGems) || WELCOME_GEMS);
          setVideoMaxDuration(Number(s.videoMaxDuration) || 15);
          setVideoMaxCount(Number(s.videoMaxCount) || 3);
          setVideoMaxWidth(Number(s.videoMaxWidth) || 480);
          setVideoQuality(Math.round((Number(s.videoQuality) || 0.5) * 100));
          setVideoMaxSizeKb(Number(s.videoMaxSizeKb) || 2048);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vibe/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            defaultRadiusKm: String(radius),
            maxMessagesBeforeReply: String(msgLimit),
            platformCommission: String(commission / 100),
            withdrawalThresholdEur: String(withdrawal),
            welcomeGems: String(welcomeGems),
            videoMaxDuration: String(videoMaxDuration),
            videoMaxCount: String(videoMaxCount),
            videoMaxWidth: String(videoMaxWidth),
            videoQuality: String(videoQuality / 100),
            videoMaxSizeKb: String(videoMaxSizeKb),
          },
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Paramètres enregistrés", {
        description: `Vidéo ${videoMaxDuration}s · ${videoMaxWidth}px · Q${videoQuality}% · ${videoMaxSizeKb}KB max`,
      });
      // Brief "Sauvegardé ✓" swap on the button (1.5s), toast stays as is.
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-12">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm divide-y divide-border">
        <div className="p-5">
          <h3 className="font-display font-semibold text-base">Découverte & Modération</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Règles anti-spam et rayon de matching par défaut pour les nouveaux utilisateurs.
          </p>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<MapPin className="h-4 w-4" />}
            title="Rayon par défaut"
            description="Distance de matching proposée aux nouveaux utilisateurs (km)."
          >
            <div className="space-y-3">
              <Slider
                value={[radius]}
                onValueChange={(v) => setRadius(v[0] ?? 50)}
                min={5}
                max={200}
                step={5}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>5 km</span>
                <span className="font-semibold text-foreground tabular-nums">{radius} km</span>
                <span>200 km</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<MessageSquare className="h-4 w-4" />}
            title="Limite messages anti-spam"
            description="Nombre max de messages que l'initiateur d'un match peut envoyer avant réponse."
          >
            <Input
              type="number"
              min={1}
              max={10}
              value={msgLimit}
              onChange={(e) => setMsgLimit(Number(e.target.value))}
              className="rounded-xl"
            />
          </FieldRow>
        </div>
      </div>

      <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm divide-y divide-border">
        <div className="p-5">
          <h3 className="font-display font-semibold text-base">Économie & Paiements</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Commission prélevée sur les cadeaux, seuil de retrait Stripe Connect et bonus de bienvenue.
          </p>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Percent className="h-4 w-4" />}
            title="Commission plateforme"
            description="Pourcentage prélevé sur la valeur de chaque cadeau envoyé."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={50}
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
                className="rounded-xl"
              />
              <span className="text-sm font-medium text-muted-foreground">%</span>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Wallet className="h-4 w-4" />}
            title="Seuil de retrait"
            description="Montant minimum (€) pour qu'un utilisateur puisse demander un versement Stripe Connect."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={5}
                value={withdrawal}
                onChange={(e) => setWithdrawal(Number(e.target.value))}
                className="rounded-xl"
              />
              <span className="text-sm font-medium text-muted-foreground">€</span>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Gift className="h-4 w-4" />}
            title="Vibes de bienvenue"
            description="Vibes offertes à chaque nouvel utilisateur à l'inscription."
          >
            <Input
              type="number"
              min={0}
              max={500}
              value={welcomeGems}
              onChange={(e) => setWelcomeGems(Number(e.target.value))}
              className="rounded-xl"
            />
          </FieldRow>
        </div>
      </div>

      {/* ===== VIDEO CONFIGURATION ===== */}
      <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm divide-y divide-border">
        <div className="p-5">
          <h3 className="font-display font-semibold text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" /> Vidéos de présentation
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Configuration de la compression, durée et limites des vidéos de profil.
          </p>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Video className="h-4 w-4" />}
            title="Durée maximale"
            description="Durée maximale d'une vidéo de présentation (secondes)."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={60}
                value={videoMaxDuration}
                onChange={(e) => setVideoMaxDuration(Number(e.target.value))}
                className="rounded-xl"
              />
              <span className="text-sm font-medium text-muted-foreground">s</span>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Video className="h-4 w-4" />}
            title="Nombre maximal de vidéos"
            description="Nombre de vidéos qu'un utilisateur peut ajouter à son profil."
          >
            <Input
              type="number"
              min={1}
              max={10}
              value={videoMaxCount}
              onChange={(e) => setVideoMaxCount(Number(e.target.value))}
              className="rounded-xl"
            />
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Video className="h-4 w-4" />}
            title="Largeur cible (px)"
            description="Résolution de compression. Plus bas = plus petit mais moins net."
          >
            <Input
              type="number"
              min={240}
              max={1080}
              step={60}
              value={videoMaxWidth}
              onChange={(e) => setVideoMaxWidth(Number(e.target.value))}
              className="rounded-xl"
            />
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Video className="h-4 w-4" />}
            title="Qualité de compression"
            description="Plus bas = fichier plus petit (idéal pour faible débit)."
          >
            <div className="space-y-3">
              <Slider
                value={[videoQuality]}
                onValueChange={(v) => setVideoQuality(v[0] ?? 50)}
                min={10}
                max={100}
                step={5}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>10%</span>
                <span className="font-semibold text-foreground tabular-nums">{videoQuality}%</span>
                <span>100%</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Video className="h-4 w-4" />}
            title="Taille maximale (KB)"
            description="Taille maximale du fichier vidéo compressé. Rejette au-delà."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={256}
                max={10240}
                step={256}
                value={videoMaxSizeKb}
                onChange={(e) => setVideoMaxSizeKb(Number(e.target.value))}
                className="rounded-xl"
              />
              <span className="text-sm font-medium text-muted-foreground">KB</span>
            </div>
          </FieldRow>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-end gap-2 pb-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setRadius(50);
            setMsgLimit(MAX_MESSAGES_BEFORE_REPLY);
            setCommission(Math.round(PLATFORM_COMMISSION * 100));
            setWithdrawal(WITHDRAWAL_THRESHOLD_EUR);
            setWelcomeGems(WELCOME_GEMS);
            setVideoMaxDuration(15);
            setVideoMaxCount(3);
            setVideoMaxWidth(480);
            setVideoQuality(50);
            setVideoMaxSizeKb(2048);
            toast.info("Réinitialisé aux valeurs par défaut");
          }}
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Réinitialiser
        </motion.button>
        <motion.button
          type="submit"
          disabled={saving}
          whileTap={saving ? undefined : { scale: 0.95 }}
          className={cn(buttonVariants({ className: "rounded-xl gap-1.5" }))}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={saving ? "saving" : saved ? "saved" : "idle"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : saved ? (
                <>
                  <SuccessBounce>
                    <Check className="h-4 w-4" />
                  </SuccessBounce>
                  Sauvegardé
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </form>
  );
}
