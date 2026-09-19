"use client";
// OnboardingFlow — immersive, intuitive, elegant 3-step onboarding.
// Step 1: Pseudo + gender + lookingFor
// Step 2: Age (dropdown 16-100) + city (predictive search, selection-only)
// Step 3: Video (optional — unlocks match visibility, superlikes, gifts)
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Loader2,
  MapPin,
  Search,
  Info,
  User,
  Video,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { useVibe } from "@/lib/vibe/store";
import { searchCities, type City } from "@/lib/vibe/cities";
import { compressVideo, fetchVideoConfig, formatDuration } from "@/lib/vibe/video-compress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { celebrate } from "./interactive-animations";
import { PhotoPicker } from "./photo-picker";

type Gender = "f" | "m" | "nb";
type LookingFor = "f" | "m" | "nb" | "all";
type RelationshipType = "serious" | "casual" | "friendship";

const AGES = Array.from({ length: 85 }, (_, i) => i + 16); // 16..100

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const setMe = useVibe((s) => s.setMe);
  const [step, setStep] = useState(0);

  // Step 1 data
  const [pseudo, setPseudo] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(null);

  // Step 2 data
  const [age, setAge] = useState<number | null>(null);
  const [ageOpen, setAgeOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cityFocused, setCityFocused] = useState(false);

  // Step 3 data (new — relationship type)
  const [relationshipType, setRelationshipType] = useState<RelationshipType | null>(null);

  // Step 4 data (was step 3 — video)
  const [posterUrl, setPosterUrl] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  // Step 4 — photos de profil (optionnel, max 5). La vidéo reste prioritaire :
  // les photos sont surtout utiles si l'utilisateur n'ajoute pas de vidéo.
  const [photos, setPhotos] = useState<string[]>([]);
  // Upload photo en cours → verrouille le bouton Terminer (pas de submit
  // avec un set photos tronqué).
  const [photosUploading, setPhotosUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  // Garde anti double-fire (StrictMode) — la célébration ne part qu'une fois.
  const celebratedRef = useRef(false);

  // City predictive search
  useEffect(() => {
    if (!cityFocused) return;
    setCityResults(searchCities(cityQuery, 8));
  }, [cityQuery, cityFocused]);

  function selectCity(c: City) {
    setSelectedCity(c);
    setCityQuery(`${c.name}, ${c.country}`);
    setCityFocused(false);
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Format vidéo requis");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Vidéo trop lourde (max 50 Mo)");
      return;
    }

    setUploading(true);
    setUploadProgress("Chargement de la vidéo…");

    try {
      // Fetch the admin-configured video settings.
      const config = await fetchVideoConfig();
      setUploadProgress(`Compression (${config.maxWidth}px, ${config.maxDuration}s)…`);

      // Compress the video: re-encode at lower resolution/bitrate + extract poster.
      const result = await compressVideo(file, config);

      setPosterUrl(result.posterBase64);
      setVideoUrl(result.videoBase64);
      setVideoDuration(result.duration);
      setUploadProgress("");
      toast.success(`Vidéo compressée ! ${result.width}×${result.height}, ${formatDuration(result.duration)} 🎬`);
    } catch (err: any) {
      toast.error(err.message || "Compression échouée. Réessaie.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function canProceed() {
    if (step === 0) return pseudo.trim().length >= 2 && pseudo.trim().length <= 20 && gender && lookingFor;
    if (step === 1) return age !== null && selectedCity !== null;
    if (step === 2) return relationshipType !== null;
    return true; // step 3 (video) is optional
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/vibe/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          gender,
          lookingFor,
          relationshipType,
          age,
          city: `${selectedCity!.name}, ${selectedCity!.country}`,
          videoUrl: videoUrl || undefined,
          posterUrl: posterUrl || undefined,
          videoDuration: videoDuration || undefined,
          // Toujours envoyé (même vide) — le backend écrit/compacte les 5 slots.
          photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.user) {
        setMe(data.user);
        useVibe.getState().setRates(data.rates ?? {});
      }
      toast.success(videoUrl ? "Profil créé ! Bienvenue 🎉" : "Profil créé — ajoute ta vidéo plus tard pour débloquer tout.");
      if (!celebratedRef.current) {
        celebratedRef.current = true;
        celebrate({ sound: "chime", hapticPattern: [10, 30, 10], confettiCount: 140 });
      }
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitles = ["Ton identité", "Toi en bref", "Ta recherche", "Ta présentation"];

  return (
    <div className="dark relative min-h-dvh w-full flex items-center justify-center bg-[#0a0612] text-white overflow-hidden px-4 py-6">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-vibe-purple/25 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-vibe-orange/20 blur-3xl animate-float-slow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-vibe-pink/15 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo + progress */}
        <div className="flex flex-col items-center mb-6">
          <VibeLogo className="[&_span:last-child]:text-white mb-5" />
          {/* Progress bar — 4 segments */}
          <div className="flex items-center gap-1.5 w-full max-w-xs">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden v-surface-2">
                <motion.div
                  initial={false}
                  animate={{ width: i < step ? "100%" : i === step ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                  className="h-full vibe-gradient"
                  style={{ opacity: i <= step ? 1 : 0.3 }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-white/70 mt-2 tabular-nums">Étape {step + 1} / 4 — {stepTitles[step]}</p>
        </div>

        {/* Card */}
        <div className="relative rounded-3xl v-surface-1 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl p-6 sm:p-8 overflow-hidden">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-vibe-purple/15 blur-2xl" />

          {/* Conteneur scrollable — l'étape 4 (vidéo + photos) peut dépasser
              sur petits écrans ; le header logo/progression reste visible. */}
          <div className="relative max-h-[70dvh] overflow-y-auto overscroll-contain scrollbar-vibe">
          <AnimatePresence mode="wait">
            {/* STEP 1 — Identity */}
            {step === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35 }}
                className="relative space-y-6"
              >
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">Comment tu t&apos;appelles ?</h2>
                  <p className="text-sm text-white/70">Ton pseudo sera visible par les autres membres.</p>
                </div>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="ex. Alex, Léa, Marco…"
                    maxLength={20}
                    className="pl-10 h-12 rounded-2xl v-surface-1 border-white/10 text-white placeholder:text-white/70 focus:border-vibe-purple focus-visible:ring-vibe-purple/40"
                    onKeyDown={(e) => e.key === "Enter" && canProceed() && setStep(1)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/70 tabular-nums">{pseudo.length}/20</span>
                </div>

                {/* Gender */}
                <div>
                  <label className="text-xs font-semibold text-white/70 mb-2 block">Tu es…</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "f", label: "Femme", emoji: "♀" },
                      { v: "m", label: "Homme", emoji: "♂" },
                      { v: "nb", label: "Non-binaire", emoji: "⚧" },
                    ].map((g) => (
                      <motion.button
                        key={g.v}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setGender(g.v as Gender)}
                        className={cn(
                          "rounded-2xl py-3 text-sm font-semibold transition ring-1",
                          gender === g.v
                            ? "vibe-gradient text-white ring-transparent vibe-glow"
                            : "v-surface-1 text-white/70 ring-white/10 hover:v-surface-2"
                        )}
                      >
                        <span className="text-lg block mb-0.5">{g.emoji}</span>
                        {g.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Looking for */}
                <div>
                  <label className="text-xs font-semibold text-white/70 mb-2 block">Tu cherches…</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { v: "f", label: "Femmes" },
                      { v: "m", label: "Hommes" },
                      { v: "nb", label: "NB" },
                      { v: "all", label: "Tous" },
                    ].map((g) => (
                      <motion.button
                        key={g.v}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setLookingFor(g.v as LookingFor)}
                        className={cn(
                          "rounded-xl py-2.5 text-xs font-semibold transition ring-1",
                          lookingFor === g.v
                            ? "vibe-gradient text-white ring-transparent"
                            : "v-surface-1 text-white/70 ring-white/10 hover:v-surface-2"
                        )}
                      >
                        {g.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <NextBtn disabled={!canProceed()} onClick={() => setStep(1)} />
              </motion.div>
            )}

            {/* STEP 2 — Age + City */}
            {step === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35 }}
                className="relative space-y-6"
              >
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">Toi en bref</h2>
                  <p className="text-sm text-white/70">Ton âge et ta ville — le reste viendra en douceur.</p>
                </div>

                {/* Age dropdown */}
                <div>
                  <label className="text-xs font-semibold text-white/70 mb-2 block">Âge</label>
                  <div className="relative">
                    <motion.button
                      onClick={() => setAgeOpen((o) => !o)}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "w-full h-12 rounded-2xl v-surface-1 border border-white/10 text-left px-4 flex items-center justify-between transition",
                        age !== null ? "text-white" : "text-white/70",
                        ageOpen && "border-vibe-purple"
                      )}
                    >
                      <span className="font-medium">{age !== null ? `${age} ans` : "Sélectionne ton âge"}</span>
                      <ChevronDown className={cn("h-4 w-4 text-white/70 transition", ageOpen && "rotate-180")} />
                    </motion.button>
                    <AnimatePresence>
                      {ageOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute z-30 mt-1.5 inset-x-0 max-h-56 overflow-y-auto scrollbar-vibe rounded-2xl v-surface-solid ring-1 ring-white/10 shadow-2xl p-1.5"
                        >
                          {AGES.map((a) => (
                            <button
                              key={a}
                              onClick={() => { setAge(a); setAgeOpen(false); }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-xl text-sm transition tabular-nums",
                                age === a ? "vibe-gradient text-white font-semibold" : "text-white/70 hover:v-surface-2"
                              )}
                            >
                              {a} ans
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* City — predictive, selection-only */}
                <div>
                  <label className="text-xs font-semibold text-white/70 mb-2 block">Ville</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70 pointer-events-none z-10" />
                    <Input
                      value={cityQuery}
                      onChange={(e) => {
                        setCityQuery(e.target.value);
                        setSelectedCity(null);
                        setCityFocused(true);
                      }}
                      onFocus={() => setCityFocused(true)}
                      onBlur={() => setTimeout(() => setCityFocused(false), 200)}
                      placeholder="Tape ta ville…"
                      className={cn(
                        "pl-10 h-12 rounded-2xl v-surface-1 border-white/10 text-white placeholder:text-white/70 focus-visible:ring-vibe-purple/40",
                        selectedCity && "border-emerald-400/50"
                      )}
                    />
                    {selectedCity && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                    )}
                    {/* Predictive dropdown */}
                    <AnimatePresence>
                      {cityFocused && cityQuery.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute z-30 mt-1.5 inset-x-0 max-h-56 overflow-y-auto scrollbar-vibe rounded-2xl v-surface-solid ring-1 ring-white/10 shadow-2xl p-1.5"
                        >
                          {cityResults.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-white/70 flex items-center gap-2">
                              <Search className="h-3.5 w-3.5" />
                              {cityQuery.length < 2 ? "Continue à taper…" : "Aucune ville trouvée"}
                            </div>
                          ) : (
                            cityResults.map((c) => (
                              <button
                                key={`${c.name}-${c.country}`}
                                onMouseDown={(e) => { e.preventDefault(); selectCity(c); }}
                                onClick={() => selectCity(c)}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-sm hover:v-surface-2 transition flex items-center gap-2"
                              >
                                <MapPin className="h-3.5 w-3.5 text-vibe-purple shrink-0" />
                                <span className="font-medium text-white">{c.name}</span>
                                <span className="text-white/70 text-xs">{c.country}</span>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {!selectedCity && cityQuery.length > 0 && (
                    <p className="text-[11px] text-amber-300/70 mt-1.5 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Sélectionne ta ville dans la liste — la saisie libre n&apos;est pas acceptée.
                    </p>
                  )}
                </div>

                <div className="flex gap-2.5">
                  <BackBtn onClick={() => setStep(0)} />
                  <NextBtn disabled={!canProceed()} onClick={() => setStep(2)} />
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Relationship type (new) */}
            {step === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35 }}
                className="relative space-y-6"
              >
                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">Que cherches-tu ?</h2>
                  <p className="text-sm text-white/70">Sois honnête — ça aide à matcher avec les bonnes personnes.</p>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      v: "serious",
                      label: "Relation sérieuse",
                      emoji: "💍",
                      desc: "Mariage, amour durable, construire ensemble",
                    },
                    {
                      v: "casual",
                      label: "Relation sans lendemain",
                      emoji: "🔥",
                      desc: "Fun, spontané, sans engagement",
                    },
                    {
                      v: "friendship",
                      label: "Amitié",
                      emoji: "🤝",
                      desc: "Rencontrer des gens, partager des moments",
                    },
                  ].map((r) => (
                    <motion.button
                      key={r.v}
                      onClick={() => setRelationshipType(r.v as RelationshipType)}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-2xl p-3.5 ring-1 transition text-left",
                        relationshipType === r.v
                          ? "bg-vibe-gradient-soft ring-vibe-purple/50 vibe-glow"
                          : "v-surface-1 ring-white/10 hover:v-surface-2"
                      )}
                    >
                      <span className="grid place-items-center h-11 w-11 rounded-xl v-surface-2 shrink-0 text-2xl">
                        {r.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{r.label}</p>
                        <p className="text-[11px] text-white/70 mt-0.5">{r.desc}</p>
                      </div>
                      {relationshipType === r.v && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          className="grid place-items-center h-6 w-6 rounded-full vibe-gradient shrink-0"
                        >
                          <Check className="h-3.5 w-3.5 text-white" />
                        </motion.span>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-2.5">
                  <BackBtn onClick={() => setStep(1)} />
                  <NextBtn disabled={!canProceed()} onClick={() => setStep(3)} />
                </div>
              </motion.div>
            )}

            {/* STEP 4 — Video (optional) */}
            {step === 3 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35 }}
                className="relative flex flex-col gap-4"
              >
                <div>
                  <h2 className="font-display text-2xl font-bold mb-0.5">Ta vidéo de présentation</h2>
                  <p className="text-sm text-white/70">15 secondes, portrait. Optionnelle mais puissante.</p>
                </div>

                {/* Upload zone + preview — compact landscape, side-by-side with info on desktop */}
                <input ref={fileRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />

                <div className="grid sm:grid-cols-2 gap-3">
                  {!posterUrl ? (
                    <motion.button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      whileTap={uploading ? undefined : { scale: 0.98 }}
                      className="relative h-36 sm:h-44 rounded-2xl border-2 border-dashed border-white/15 hover:border-vibe-purple/50 v-surface-1 hover:v-surface-2 transition flex flex-col items-center justify-center gap-2 group"
                    >
                      {uploading ? (
                        <>
                          <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-vibe-purple animate-spin" />
                          <span className="text-xs text-white/70">Traitement…</span>
                        </>
                      ) : (
                        <>
                          <span className="grid place-items-center h-11 w-11 rounded-full vibe-gradient vibe-glow group-hover:scale-110 transition">
                            <Video className="h-5 w-5 text-white" />
                          </span>
                          <div className="text-center">
                            <p className="font-semibold text-white text-sm">Ajouter ma vidéo</p>
                            <p className="text-[10px] text-white/70 mt-0.5">Portrait · 15s · MP4/MOV</p>
                          </div>
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <div className="relative h-36 sm:h-44 rounded-2xl overflow-hidden ring-1 ring-white/10">
                      <img src={posterUrl} alt="Aperçu vidéo" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-2 left-2 glass-dark rounded-full px-2 py-0.5 text-[9px] font-semibold flex items-center gap-1">
                        <Video className="h-2.5 w-2.5 text-vibe-orange" /> 15s
                      </div>
                      <motion.button
                        onClick={() => fileRef.current?.click()}
                        whileTap={{ scale: 0.95 }}
                        className="absolute bottom-2 left-2 right-2 h-7 rounded-lg glass-dark text-[11px] font-semibold flex items-center justify-center gap-1 hover:v-surface-3 transition"
                      >
                        <Video className="h-3 w-3" /> Changer
                      </motion.button>
                      <motion.button
                        onClick={() => { setPosterUrl(""); setVideoUrl(""); }}
                        whileTap={{ scale: 0.85 }}
                        className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </motion.button>
                    </div>
                  )}

                  {/* What video unlocks — compact, beside the upload zone on desktop */}
                  <div className="rounded-2xl v-surface-1 ring-1 ring-white/10 p-3 flex flex-col justify-center">
                    <p className="text-[11px] font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-vibe-pink" /> Sans vidéo, bloqué :
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-2 text-[11px] text-white/70">
                      <li>• Apparaître dans le swipe</li>
                      <li>• Super-liker</li>
                      <li>• Recevoir des cadeaux</li>
                      <li>• Booster ton profil</li>
                    </ul>
                    {/* Ligne d'espoir — factuelle : les photos restent une porte d'entrée */}
                    <p className="text-[10px] text-white/50 mt-2 pt-2 border-t border-white/10">
                      Pas de vidéo ? Jusqu&apos;à 5 photos permettent quand même de te découvrir.
                    </p>
                  </div>
                </div>

                {/* Photos de profil — plein largeur, optionnel (max 5) */}
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <label className="text-xs font-semibold text-white/70">Tes photos</label>
                    <span className="text-[11px] text-white/50 tabular-nums">{photos.length}/5</span>
                  </div>
                  <p className="text-[11px] text-white/60 mb-2.5">
                    Optionnel — utile surtout si tu n&apos;ajoutes pas de vidéo.
                  </p>
                  <PhotoPicker photos={photos} onChange={setPhotos} onUploadingChange={setPhotosUploading} />
                </div>

                <div className="flex gap-2.5 mt-auto">
                  <BackBtn onClick={() => setStep(2)} />
                  <motion.button
                    onClick={submit}
                    disabled={submitting || uploading || photosUploading}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 h-12 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Création…</>
                    ) : videoUrl ? (
                      <><Check className="h-4 w-4" /> Terminer</>
                    ) : (
                      <>Passer &amp; terminer <ArrowRight className="h-4 w-4" /></>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextBtn({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className="flex-1 h-12 rounded-2xl vibe-gradient text-white font-semibold vibe-glow flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Continuer <ArrowRight className="h-4 w-4" />
    </motion.button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="h-12 px-4 rounded-2xl v-surface-1 ring-1 ring-white/10 text-white/70 font-medium text-sm hover:v-surface-2 transition"
    >
      Retour
    </motion.button>
  );
}
