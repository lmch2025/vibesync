"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, MapPin, MessageSquare, Percent, Wallet, Gift, Video, Check, Loader2, Sparkles, Upload, Trash2, Film, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { SuccessBounce } from "@/components/vibe/app/interactive-animations";
import {
  browserCanRecordWebM,
  compressLandingVideoToWebM,
  isDirectSendWebm,
  LANDING_DIRECT_WEBM_MAX_BYTES,
  type LandingVideoCompressResult,
} from "@/lib/vibe/landing-video-compress";
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
  // ── Recommendation algorithm weights ──
  const [wDistance, setWDistance] = useState(30);
  const [wAge, setWAge] = useState(20);
  const [wVibe, setWVibe] = useState(25);
  const [wVerified, setWVerified] = useState(5);
  const [wRecency, setWRecency] = useState(10);
  const [wPopularity, setWPopularity] = useState(10);
  const [boostMultiplier, setBoostMultiplier] = useState(2);
  const [deckSize, setDeckSize] = useState(12);
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
          // Recommendation weights — 0 is valid, so guard explicitly.
          const nOr = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
          setWDistance(nOr(s.recWeightDistance, 30));
          setWAge(nOr(s.recWeightAge, 20));
          setWVibe(nOr(s.recWeightVibe, 25));
          setWVerified(nOr(s.recWeightVerified, 5));
          setWRecency(nOr(s.recWeightRecency, 10));
          setWPopularity(nOr(s.recWeightPopularity, 10));
          setBoostMultiplier(nOr(s.recBoostMultiplier, 2));
          setDeckSize(nOr(s.deckSize, 12));
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
            recWeightDistance: String(wDistance),
            recWeightAge: String(wAge),
            recWeightVibe: String(wVibe),
            recWeightVerified: String(wVerified),
            recWeightRecency: String(wRecency),
            recWeightPopularity: String(wPopularity),
            recBoostMultiplier: String(boostMultiplier),
            deckSize: String(deckSize),
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

      {/* ===== APPARENCE — VIDÉO DE FOND DE L'ACCUEIL (Vercel Blob) ===== */}
      <LandingVideoCard />

      {/* ===== ALGORITHME DE RECOMMANDATION ===== */}
      <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm divide-y divide-border">
        <div className="p-5">
          <h3 className="font-display font-semibold text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Algorithme de recommandation
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Poids des signaux utilisés pour classer les profils du deck de découverte. Score = Σ(poids × signal) / somme des poids. Les profils avec un Boost actif voient leur score multiplié. Total actuel : <span className="font-semibold text-foreground tabular-nums">{wDistance + wAge + wVibe + wVerified + wRecency + wPopularity}</span>.
          </p>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<MapPin className="h-4 w-4" />}
            title="Poids — Proximité géographique"
            description="Distance Haversine entre les deux profils. Plus le poids est élevé, plus les profils proches remontent."
          >
            <div className="space-y-3">
              <Slider value={[wDistance]} onValueChange={(v) => setWDistance(v[0] ?? 30)} min={0} max={50} step={1} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Désactivé</span>
                <span className="font-semibold text-foreground tabular-nums">{wDistance}</span>
                <span>50</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<MessageSquare className="h-4 w-4" />}
            title="Poids — Proximité d'âge"
            description="Écart d'âge avec le profil qui swipe (0 an = signal maximal, ≥ 15 ans = nul)."
          >
            <div className="space-y-3">
              <Slider value={[wAge]} onValueChange={(v) => setWAge(v[0] ?? 20)} min={0} max={50} step={1} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Désactivé</span>
                <span className="font-semibold text-foreground tabular-nums">{wAge}</span>
                <span>50</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Sparkles className="h-4 w-4" />}
            title="Poids — Compatibilité Vibe Check"
            description="Même question + même réponse = signal maximal ; même question + réponse différente = signal faible ; question différente = neutre."
          >
            <div className="space-y-3">
              <Slider value={[wVibe]} onValueChange={(v) => setWVibe(v[0] ?? 25)} min={0} max={50} step={1} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Désactivé</span>
                <span className="font-semibold text-foreground tabular-nums">{wVibe}</span>
                <span>50</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Check className="h-4 w-4" />}
            title="Poids — Profil vérifié"
            description="Bonus pour les comptes vérifiés (rassure et récompense la vérification)."
          >
            <div className="space-y-3">
              <Slider value={[wVerified]} onValueChange={(v) => setWVerified(v[0] ?? 5)} min={0} max={30} step={1} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Désactivé</span>
                <span className="font-semibold text-foreground tabular-nums">{wVerified}</span>
                <span>30</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Video className="h-4 w-4" />}
            title="Poids — Récence du profil"
            description="Favorise les nouveaux profils (décroissance linéaire sur 30 jours) pour un flux vivant."
          >
            <div className="space-y-3">
              <Slider value={[wRecency]} onValueChange={(v) => setWRecency(v[0] ?? 10)} min={0} max={50} step={1} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Désactivé</span>
                <span className="font-semibold text-foreground tabular-nums">{wRecency}</span>
                <span>50</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Sparkles className="h-4 w-4" />}
            title="Poids — Popularité"
            description="Likes/superlikes reçus par le profil (échelle log : 10 likes ≈ 60 % du signal)."
          >
            <div className="space-y-3">
              <Slider value={[wPopularity]} onValueChange={(v) => setWPopularity(v[0] ?? 10)} min={0} max={50} step={1} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Désactivé</span>
                <span className="font-semibold text-foreground tabular-nums">{wPopularity}</span>
                <span>50</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Sparkles className="h-4 w-4" />}
            title="Multiplicateur Boost"
            description="Un profil avec un Boost actif voit son score × cette valeur (il remonte en haut de la file)."
          >
            <div className="space-y-3">
              <Slider value={[boostMultiplier]} onValueChange={(v) => setBoostMultiplier(v[0] ?? 2)} min={1} max={5} step={0.5} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>×1 (aucun effet)</span>
                <span className="font-semibold text-foreground tabular-nums">×{boostMultiplier}</span>
                <span>×5</span>
              </div>
            </div>
          </FieldRow>
        </div>

        <div className="px-5">
          <FieldRow
            icon={<Sparkles className="h-4 w-4" />}
            title="Taille du deck"
            description="Nombre de profils renvoyés à chaque chargement de l'onglet Découvrir."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={4}
                max={50}
                value={deckSize}
                onChange={(e) => setDeckSize(Number(e.target.value))}
                className="rounded-xl"
              />
              <span className="text-sm font-medium text-muted-foreground">profils</span>
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
            setWDistance(30);
            setWAge(20);
            setWVibe(25);
            setWVerified(5);
            setWRecency(10);
            setWPopularity(10);
            setBoostMultiplier(2);
            setDeckSize(12);
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

/// Carte d'administration de la vidéo de fond de la page d'accueil.
/// Upload/suppression via Vercel Blob (route /api/vibe/admin/landing-video).
/// Auto-contenue : son propre état, indépendante du bouton « Enregistrer »
/// du formulaire (chaque action est persistée immédiatement).
function LandingVideoCard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  // « compressing » : transcodage navigateur en WebM (barre de progression) ;
  // « uploading » : envoi du WebM résultant vers Vercel Blob.
  const [phase, setPhase] = useState<"idle" | "compressing" | "uploading">("idle");
  const [progress, setProgress] = useState(0); // ratio 0..1 de la compression
  const busy = phase !== "idle";
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vibe/admin/landing-video");
        const data = await res.json();
        if (res.ok) setUrl(data.url ?? "");
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function send(file: File) {
    setPhase("uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/vibe/admin/landing-video", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'upload");
      setUrl(data.url);
      toast.success("Vidéo d'accueil mise à jour", {
        description: "La page d'accueil utilise désormais cette vidéo (sous ~15 s de cache).",
      });
    } catch (e: any) {
      toast.error("Upload impossible", { description: e.message });
    } finally {
      setPhase("idle");
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function upload(file: File) {
    const reset = () => {
      setPhase("idle");
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    };

    // WebM déjà léger : recompresser ne ferait que dégrader — envoi direct.
    if (isDirectSendWebm(file)) {
      toast.info("WebM déjà optimisé", {
        description: "Envoi direct sans recompression — qualité préservée.",
      });
      return send(file);
    }

    // Navigateur incapable d'encoder en WebM (Safari…) : envoi de l'original
    // s'il respecte la limite, sinon refus explicite avec la marche à suivre.
    if (!browserCanRecordWebM()) {
      if (file.size > LANDING_DIRECT_WEBM_MAX_BYTES) {
        toast.error("Compression indisponible sur ce navigateur", {
          description: `Fichier trop lourd (${(file.size / 1024 / 1024).toFixed(1)} Mo) et compression WebM impossible — utilisez Chrome ou Edge.`,
        });
        return reset();
      }
      toast.info("Compression indisponible sur ce navigateur", {
        description: "Envoi du fichier original tel quel.",
      });
      return send(file);
    }

    // Transcodage navigateur → WebM (VP9 si dispo), puis envoi vers le Blob.
    setPhase("compressing");
    setProgress(0);
    let result: LandingVideoCompressResult;
    try {
      result = await compressLandingVideoToWebM(file, { onProgress: setProgress });
    } catch (e: any) {
      toast.error("Compression impossible", { description: e?.message ?? "Réessayez." });
      return reset();
    }

    if (result.blob.size > LANDING_DIRECT_WEBM_MAX_BYTES) {
      toast.error("Vidéo trop longue après compression", {
        description: `${(result.blob.size / 1024 / 1024).toFixed(1)} Mo — visez une boucle de 6 à 10 s.`,
      });
      return reset();
    }

    toast.success("Compression terminée", {
      description: `WebM ${result.codec.toUpperCase()} · ${result.width}×${result.height} · ${(result.blob.size / 1024 / 1024).toFixed(1)} Mo (source : ${(file.size / 1024 / 1024).toFixed(1)} Mo).`,
    });
    await send(
      new File([result.blob], "fond-accueil.webm", { type: "video/webm" })
    );
  }

  async function remove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/vibe/admin/landing-video", { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      setUrl("");
      toast.success("Vidéo d'accueil supprimée", {
        description: "Retour à la vidéo locale par défaut.",
      });
    } catch (e: any) {
      toast.error("Suppression impossible", { description: e.message });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border shadow-sm divide-y divide-border">
      <div className="p-5">
        <h3 className="font-display font-semibold text-base flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" /> Vidéo de fond — page d'accueil
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Vidéo plein écran diffusée en boucle derrière le titre de l'accueil. Importez MP4, MOV, MKV ou WebM :
          votre navigateur la convertit en WebM haute qualité (VP9) avant l'envoi vers le cloud.
          Boucle recommandée : 6 à 10 s.
        </p>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="h-28 rounded-xl bg-muted animate-pulse" />
        ) : url ? (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden ring-1 ring-border bg-black">
              <video
                src={url}
                controls
                muted
                loop
                playsInline
                className="w-full aspect-video object-contain"
              />
            </div>
            <p className="text-[11px] text-muted-foreground break-all">{url}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center">
            <p className="text-sm font-medium">Vidéo locale par défaut en cours</p>
            <p className="text-xs text-muted-foreground mt-1">
              /profiles/swipe-bg.webm — importez une vidéo personnalisée pour la remplacer.
            </p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="video/webm,video/mp4,video/quicktime,.webm,.mp4,.mov,.mkv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          {phase === "compressing" ? (
            <div
              className="flex-1 min-w-[220px] rounded-xl ring-1 ring-border bg-muted/40 px-3 py-2"
              role="status"
              aria-live="polite"
              aria-label={`Compression en cours, ${Math.round(progress * 100)} %`}
            >
              <p className="text-xs font-medium flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-primary" />
                Compression navigateur — {Math.round(progress * 100)} %
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-background overflow-hidden">
                <motion.div
                  className="h-full vibe-gradient"
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ ease: "linear", duration: 0.2 }}
                />
              </div>
            </div>
          ) : (
            <motion.button
              type="button"
              whileTap={busy ? undefined : { scale: 0.97 }}
              disabled={busy || removing}
              onClick={() => fileRef.current?.click()}
              className={cn(buttonVariants({ className: "rounded-xl gap-1.5" }))}
            >
              {phase === "uploading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Envoi vers le cloud…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> {url ? "Remplacer la vidéo" : "Importer une vidéo"}
                </>
              )}
            </motion.button>
          )}
          {url && (
            <motion.button
              type="button"
              whileTap={removing ? undefined : { scale: 0.97 }}
              disabled={busy || removing}
              onClick={remove}
              className={cn(buttonVariants({ variant: "destructive", className: "rounded-xl gap-1.5" }))}
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Supprimer
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
