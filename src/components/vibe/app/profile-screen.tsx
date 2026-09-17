"use client";
// Profile screen — video profile, stats, premium actions, settings, logout.
// Supports up to 3 mini videos with confetti on successful upload.
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ArrowLeft, BadgeCheck, Eye, Globe, Loader2, LogOut, MapPin, Moon, Plane, Volume2, VolumeX, Waves, Video, X, Check, Pencil, Trash2, Play, ShieldCheck,
} from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { VideoPlayer } from "./video-player";
import { useVibe } from "@/lib/vibe/store";
import { useCurrency } from "@/lib/vibe/use-currency";
import { GEM_ACTIONS } from "@/lib/vibe/constants";
import { toast } from "sonner";
import { CompletionRing } from "./completion-ring";
import { Input } from "@/components/ui/input";
import { ConfettiBurst, AnimatedNumber, haptic, sfx, useSfxEnabled } from "./interactive-animations";

type VideoSlot = { url: string; poster: string };

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const setView = useVibe((s) => s.setView);
  const requireVibes = useVibe((s) => s.requireVibes);
  const { moneyCents, currency } = useCurrency();
  const [busy, setBusy] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"compress" | "upload">("compress");
  const [uploadingSlot, setUploadingSlot] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);
  // Build video slots from profile data
  const videos: VideoSlot[] = [
    { url: me?.profile?.videoUrl || "", poster: me?.profile?.posterUrl || "" },
    { url: (me?.profile as any)?.videoUrl2 || "", poster: (me?.profile as any)?.posterUrl2 || "" },
    { url: (me?.profile as any)?.videoUrl3 || "", poster: (me?.profile as any)?.posterUrl3 || "" },
  ];
  const filledSlots = videos.filter(v => v.url).length;

  // Auto-select the first slot that has a video (avoids showing a black/empty main frame)
  const firstFilledSlot = videos.findIndex(v => v.url) + 1 || 1;
  const [activeSlot, setActiveSlot] = useState(firstFilledSlot);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null); // slot à supprimer
  const [deleting, setDeleting] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  // Transition de sortie douce avant le logout (fade + léger zoom-out).
  const [exiting, setExiting] = useState(false);
  // Toggle sons d'interface — branché sur le socle sfx (persisté localStorage).
  const [sfxOn, setSfxOn] = useSfxEnabled();
  // Thème : « vivi » = thème CLAIR (rendu par défaut de toute l'app) ;
  // « sombre » = mode nuit OPT-IN (fond #09090B) choisi par l'utilisateur.
  // next-themes ne résout le thème qu'après montage — on évite tout
  // mismatch d'hydratation.
  const { resolvedTheme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => setThemeMounted(true), []);
  const sombreOn = themeMounted ? resolvedTheme === "sombre" : false;
  const videoFileRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef(1);

  const activeVideo = videos[activeSlot - 1];


  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Format vidéo requis"); return; }
    if (file.size > 500 * 1024 * 1024) { toast.error("Vidéo trop lourde (max 500 Mo)"); return; }

    // Formats exotiques : on informe l'utilisateur que l'upload peut être plus lent
    const exoticFormats = ["video/x-matroska", "video/mkv", "video/avi", "video/x-msvideo", "video/x-flv"];
    if (exoticFormats.includes(file.type) || file.name.match(/\.(mkv|avi|flv|ts|3gp)$/i)) {
      toast.info("Format MKV/AVI détecté — l'upload peut prendre plus de temps. Préfère MP4 ou MOV pour des uploads rapides 🎬");
    }

    const slot = pendingSlotRef.current;
    setVideoUploading(true);
    setUploadingSlot(slot);
    setUploadProgress(0);
    setUploadPhase("compress");
    try {
      // --- Phase 1 : Compression + rognage à 15s côté navigateur ---
      const { compressVideo } = await import("@/lib/video-compress");
      const { file: compressedFile, posterDataUrl, durationS } = await compressVideo(
        file,
        (pct) => setUploadProgress(Math.round(pct * 0.4)), // 0–40% = compression
      );

      // --- Pré-visualisation instantanée dès la compression terminée ---
      if (posterDataUrl) {
        const previewPatch: any = { ...me?.profile };
        if (slot === 1) { previewPatch.videoUrl = ""; previewPatch.posterUrl = posterDataUrl; }
        else if (slot === 2) { previewPatch.videoUrl2 = ""; previewPatch.posterUrl2 = posterDataUrl; }
        else { previewPatch.videoUrl3 = ""; previewPatch.posterUrl3 = posterDataUrl; }
        patchMe({ profile: previewPatch });
        setActiveSlot(slot);
      }

      // --- Phase 2 : Upload Cloudinary (fichier compressé, ~2–4 Mo) ---
      setUploadPhase("upload");
      
      let videoUrl = "";
      let finalPosterUrl = posterDataUrl;
      
      try {
        const { uploadToCloudinary } = await import("@/lib/cloudinary-client");
        const res = await uploadToCloudinary(
          compressedFile,
          "video",
          (p) => setUploadProgress(40 + Math.round(p * 0.6)), // 40–100% = upload
        );
        videoUrl = res.url;
        finalPosterUrl = res.posterUrl;
      } catch (e: any) {
        console.warn("Cloudinary upload failed, falling back to Base64 Data URL for sandbox:", e);
        
        // Simuler la progression
        for (let i = 40; i <= 100; i += 15) {
          setUploadProgress(i);
          await new Promise(r => setTimeout(r, 100));
        }

        videoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
        });
        toast.info("Mode bac à sable : la vidéo est sauvegardée localement (Cloudinary non configuré).");
      }

      const profileRes = await fetch("/api/vibe/profile/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, posterUrl: finalPosterUrl, videoDuration: Math.round(durationS), slot }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error);

      // --- Mise à jour finale avec les URLs CDN (ou Data URL) ---
      const profilePatch: any = { ...me?.profile };
      if (slot === 1) { profilePatch.videoUrl = videoUrl; profilePatch.posterUrl = finalPosterUrl; }
      else if (slot === 2) { profilePatch.videoUrl2 = videoUrl; profilePatch.posterUrl2 = finalPosterUrl; }
      else { profilePatch.videoUrl3 = videoUrl; profilePatch.posterUrl3 = finalPosterUrl; }
      patchMe({ profile: profilePatch });

      // EXPLOSION OF CONFETTI! 🎉
      sfx.play("success");
      setShowConfetti(true);
      toast.success(`Vidéo ${slot} ajoutée ! 🎬`);
      setTimeout(() => setShowConfetti(false), 2500);

      setActiveSlot(slot);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'upload");
    } finally {
      setVideoUploading(false);
      setUploadProgress(0);
      if (videoFileRef.current) videoFileRef.current.value = "";
    }
  }

  function startUpload(slot: number) {
    pendingSlotRef.current = slot;
    videoFileRef.current?.click();
  }

  async function deleteVideo(slot: number) {
    setDeleting(true);
    try {
      await fetch(`/api/vibe/profile/video?slot=${slot}`, { method: "DELETE" });
      const profilePatch: any = { ...me?.profile };
      if (slot === 1) { profilePatch.videoUrl = ""; profilePatch.posterUrl = ""; }
      else if (slot === 2) { profilePatch.videoUrl2 = ""; profilePatch.posterUrl2 = ""; }
      else { profilePatch.videoUrl3 = ""; profilePatch.posterUrl3 = ""; }
      patchMe({ profile: profilePatch });
      if (activeSlot === slot) setActiveSlot(videos.findIndex((v, i) => i !== slot - 1 && v.url) + 1 || 1);
      toast.success("Vidéo supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  function spend(action: "seeLikes" | "passport") {
    const cost = GEM_ACTIONS[action];
    const label = action === "seeLikes" ? "Voir les likes reçus (20 Vibes)" : "Passport (30 Vibes)";
    requireVibes(cost, label, async () => {
      setBusy(action);
      try {
        const res = await fetch("/api/vibe/gems/spend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        if (action === "seeLikes") toast.success("👁️ Likes reçus dévoilés");
        if (action === "passport") toast.success("✈️ Passport activé 24h");
      } catch (e: any) { toast.error(e.message || "Erreur"); }
      finally { setBusy(null); }
    });
  }

  async function logout() {
    await fetch("/api/vibe/auth/logout", { method: "POST" });
    useVibe.getState().setMe(null);
    setView("landing");
    toast.success("Déconnecté");
  }

  // Joue une transition de sortie douce (fade + zoom-out, 250 ms) AVANT le logout réel.
  async function handleLogoutClick() {
    if (exiting) return;
    setExiting(true);
    sfx.play("pop");
    await new Promise((r) => setTimeout(r, 280));
    await logout();
  }

  function toggleSounds() {
    setSfxOn(!sfxOn);
    haptic(8);
  }

  // Bascule thème clair (vivi) ↔ mode nuit opt-in (sombre, fond #09090B).
  // Le choix est persisté par next-themes (localStorage) et réappliqué
  // avant le premier rendu suivant.
  function toggleSombre() {
    const next = resolvedTheme === "sombre" ? "vivi" : "sombre";
    setTheme(next);
    haptic(8);
    sfx.play("pop");
    toast(next === "sombre" ? "Mode sombre activé 🌙" : "Mode clair activé ☀️");
  }

  const poster = activeVideo?.poster || "/profiles/lea.png";
  const videoUrl = activeVideo?.url || "";

  function handleTaskClick(key: string) {
    if (key === "video_uploaded" || key === "poster_uploaded") {
      startUpload(filledSlots + 1);
    } else if (key === "verified") {
      toast.success("Demande envoyée");
      saveEdit("verified", true);
    } else if (key === "streak_started") {
      toast.info("Reviens tous les jours pour augmenter ta série et gagner des Vibes !");
    } else if (key !== "account_created" && key !== "profile_created") {
      let currentVal = "";
      if (key === "bio_filled") currentVal = me?.profile?.bio || "";
      if (key === "city_set") currentVal = me?.profile?.city || "";
      if (key === "age_set") currentVal = me?.profile?.age?.toString() || "";
      if (key === "gender_set") currentVal = me?.profile?.gender || "";
      if (key === "looking_for_set") currentVal = me?.profile?.lookingFor || "";
      if (key === "vibe_answered") currentVal = me?.profile?.vibeAnswer || "";
      
      setEditValue(currentVal);
      setEditingField(key);
    }
  }

  async function saveEdit(field: string, val: any) {
    const prevMe = useVibe.getState().me;
    let optimisticProfile = { ...prevMe?.profile } as any;
    let optimisticUser = { ...prevMe } as any;

    const payload: any = {};
    if (field === "bio_filled") { payload.bio = val; optimisticProfile.bio = val; }
    if (field === "city_set") { payload.city = val; optimisticProfile.city = val; }
    if (field === "age_set") { payload.age = Number(val); optimisticProfile.age = Number(val); }
    if (field === "gender_set") { payload.gender = val; optimisticProfile.gender = val; }
    if (field === "looking_for_set") { payload.lookingFor = val; optimisticProfile.lookingFor = val; }
    if (field === "vibe_answered") { payload.vibeAnswer = val; optimisticProfile.vibeAnswer = val; }
    if (field === "verified") { payload.verified = val; optimisticUser.verified = val; }

    optimisticUser.profile = optimisticProfile;
    
    patchMe(optimisticUser);
    setEditingField(null);
    if (field !== "verified") toast.success("Profil mis à jour");

    try {
      const res = await fetch("/api/vibe/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.user) {
        const meCopy = { ...useVibe.getState().me, ...data.user };
        patchMe(meCopy);
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la mise à jour");
      if (prevMe) patchMe(prevMe);
    }
  }

  return (
    <motion.div
      initial={false}
      animate={exiting ? { opacity: 0, scale: 0.98 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="absolute inset-0 v-bg-app v-fg overflow-hidden flex flex-col"
    >
      {/* Confetti explosion overlay */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 z-[90] pointer-events-none grid place-items-center">
            <ConfettiBurst count={300} duration={2.5} />
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="text-5xl">🎬</motion.div>
          </div>
        )}
      </AnimatePresence>

      <input ref={videoFileRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />

      <div className="pt-9 px-3 py-2 flex items-center gap-2">
        <motion.button onClick={onBack} whileTap={{ scale: 0.88 }} className="h-9 w-9 grid place-items-center rounded-full hover:v-surface-2"><ArrowLeft className="h-5 w-5" /></motion.button>
        <span className="font-display font-bold text-lg v-text-gradient">Profil</span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
        {/* Grand cadre — vidéo active + actions Remplacer / Supprimer */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden ring-1 ring-(--v-divider) aspect-[4/5] mb-4">
          <VideoPlayer
            key={`profile-slot-${activeSlot}-${videoUrl}`}
            videoUrl={videoUrl}
            posterUrl={poster}
            duration={15}
            className="absolute inset-0"
            sizes="280px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

          {/* Badge 15s max — posé sur la vidéo : verre sombre + texte blanc constant */}
          <div className="absolute top-3 right-3 z-50 glass-dark v-fg-media rounded-full px-2.5 py-1 text-[10px] flex items-center gap-1 pointer-events-none">
            <Video className="h-3 w-3 text-accent" /> 15s max
          </div>

          {/* Boutons action sur le grand cadre quand une vidéo est présente */}
          {activeVideo?.url && (
            <div className="absolute top-3 left-3 flex gap-1.5 z-50">
              <motion.button
                onClick={() => startUpload(activeSlot)}
                disabled={videoUploading}
                whileTap={{ scale: 0.92 }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 transition text-[10px] font-semibold text-white disabled:opacity-50"
              >
                <Pencil className="h-3 w-3" /> Remplacer
              </motion.button>
              <motion.button
                onClick={() => setConfirmDelete(activeSlot)}
                disabled={videoUploading}
                whileTap={{ scale: 0.92 }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/70 backdrop-blur hover:bg-red-500/90 transition text-[10px] font-semibold text-white disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" /> Supprimer
              </motion.button>
            </div>
          )}

          {/* Info profil en bas */}
          <div className="absolute bottom-0 inset-x-0 p-4 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <h2 className="font-display text-2xl font-bold v-text-gradient">{me?.profile?.displayName ?? me?.name ?? "Toi"}</h2>
              {me?.verified && <BadgeCheck className="h-5 w-5 text-cyan-300" />}
            </div>
            {me?.profile && (
              <>
                <p className="text-sm text-white/80 flex items-center gap-1"><MapPin className="h-3 w-3" /> {me.profile.city}</p>
                <p className="text-xs text-white/70 mt-1 line-clamp-2">{me.profile.bio}</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Miniatures des slots vidéo */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wide v-fg-muted font-semibold">Mes vidéos ({filledSlots}/3)</p>
            {filledSlots < 3 && (
              <motion.button onClick={() => startUpload(filledSlots + 1)} disabled={videoUploading} whileTap={{ scale: 0.9 }}
                className="text-[10px] text-vibe-purple font-semibold flex items-center gap-1 hover:opacity-80 transition disabled:opacity-40">
                <Video className="h-3 w-3" /> Ajouter
              </motion.button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((slot) => {
              const v = videos[slot - 1];
              const hasVideo = !!v.url;
              const isActive = activeSlot === slot;
              const isUploading = videoUploading && uploadingSlot === slot;
              const slotPoster = v.poster || (v.url.includes("cloudinary.com") ? v.url.replace(/^(.*\/video\/upload\/)(?:[a-zA-Z0-9_,]+\/)?(v\d+\/.*)\.[a-zA-Z0-9]+$/, "$1so_1,f_jpg/$2.jpg") : "");
              return (
                <div key={slot} className="relative aspect-[3/4]">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (isUploading) return;
                      if (hasVideo) {
                        setActiveSlot(slot);
                      } else {
                        startUpload(slot);
                      }
                    }}
                    disabled={isUploading}
                    className={`absolute inset-0 rounded-xl overflow-hidden ring-1 transition w-full h-full ${
                      isActive ? "ring-2 ring-vibe-purple shadow-[0_0_12px_rgba(192,38,211,0.5)]" : "ring-(--v-divider)"
                    } ${!hasVideo && !isUploading ? "v-surface-1 hover:v-surface-2 border-2 border-dashed v-divider" : ""}`}
                  >
                    {isUploading ? (
                      <div className="absolute inset-0 grid place-items-center flex-col gap-1">
                        <ProgressRing percent={uploadProgress} size={40} strokeWidth={3} />
                        <span className="text-[7px] v-fg-muted mt-0.5 absolute bottom-2 left-0 right-0 text-center">
                          {uploadPhase === "compress" ? "⚙️ Compression…" : "☁️ Envoi…"}
                        </span>
                      </div>
                    ) : hasVideo ? (
                      <>
                        <img
                          src={slotPoster}
                          alt={`Vidéo ${slot}`}
                          onError={(e) => { e.currentTarget.style.opacity = "0"; e.currentTarget.parentElement!.style.background = "#27272a" }}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                        <span className="absolute bottom-1 left-1 text-[9px] font-bold text-white bg-black/40 rounded px-1">{slot}</span>
                        {isActive && <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-vibe-purple ring-2 ring-black" />}
                      </>
                    ) : (
                      <div className="absolute inset-0 grid place-items-center flex-col gap-1 v-fg-muted">
                        <Video className="h-5 w-5" />
                        <span className="text-[8px]">Ajouter</span>
                      </div>
                    )}
                  </motion.button>

                </div>
              );
            })}
          </div>
        </div>

        {/* Completion Ring */}
        <div className="mb-4">
          <CompletionRing onTaskClick={handleTaskClick} />
        </div>

        {/* stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Vibes" value={<AnimatedNumber value={me?.gems ?? 0} duration={900} />} icon={<GemIcon className="h-3.5 w-3.5" />} />
          <Stat label="Portefeuille" value={<AnimatedNumber value={me?.walletEurCents ?? 0} duration={900} format={(n) => moneyCents(Math.round(n))} />} />
          <Stat label="Vibe" value={me?.profile?.vibeAnswer ?? "—"} icon={<Waves className="h-3.5 w-3.5 text-accent" />} />
        </div>

        {/* premium actions */}
        <h3 className="font-display font-bold text-sm mb-2 px-1">Premium</h3>
        <div className="space-y-2 mb-4">
          <PremiumRow icon={<Eye className="h-4 w-4" />} title="Voir les likes reçus" desc="Dévoile un profil qui t'a déjà liké" cost={GEM_ACTIONS.seeLikes} onClick={() => spend("seeLikes")} loading={busy === "seeLikes"} />
          <PremiumRow icon={<Plane className="h-4 w-4" />} title="Passport" desc="Swipe dans une autre ville 24h" cost={GEM_ACTIONS.passport} onClick={() => spend("passport")} loading={busy === "passport"} />
        </div>

        {/* settings */}
        <h3 className="font-display font-bold text-sm mb-2 px-1">Réglages</h3>
        <div className="rounded-2xl v-surface-1 ring-1 ring-(--v-divider) divide-y divide-(--v-divider)">
          <Row icon={<Globe className="h-4 w-4" />} label="Devise"><span className="v-fg-muted text-xs">{currency} · auto</span></Row>
          <Row icon={<BadgeCheck className="h-4 w-4" />} label="Compte vérifié">{me?.verified ? <span className="text-cyan-600 dark:text-cyan-300 text-xs">Oui</span> : <span className="v-fg-muted text-xs">En attente</span>}</Row>
          <Row
            icon={sfxOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 v-fg-muted" />}
            label="Sons de l'interface"
          >
            <motion.button
              type="button"
              role="switch"
              aria-checked={sfxOn}
              aria-label="Activer les sons de l'interface"
              onClick={toggleSounds}
              whileTap={{ scale: 0.92 }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${sfxOn ? "bg-vibe-purple/80" : "v-surface-3"}`}
            >
              <motion.span
                animate={{ x: sfxOn ? "110%" : "0%" }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow"
              />
            </motion.button>
          </Row>
          {/* Mode sombre (opt-in) — le thème clair est le rendu par défaut
              de l'app ; ici l'utilisateur active (ou non) le mode nuit au
              fond #09090B. */}
          <Row icon={<Moon className="h-4 w-4" />} label="Mode sombre">
            <span className="text-[10px] v-fg-muted mr-1 hidden sm:inline">Active le fond nuit #09090B. Le thème clair reste le rendu par défaut.</span>
            <motion.button
              type="button"
              role="switch"
              aria-checked={sombreOn}
              aria-label="Activer le mode sombre profond"
              onClick={toggleSombre}
              whileTap={{ scale: 0.92 }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${sombreOn ? "bg-vibe-purple/80" : "v-surface-3"}`}
            >
              <motion.span
                animate={{ x: sombreOn ? "110%" : "0%" }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow"
              />
            </motion.button>
          </Row>
        </div>

        {/* Admin panel access — ONLY rendered for admin accounts (the sole
            admin being the owner's account). Elegant gradient CTA with a
            subtle animated glow, placed above logout. */}
        {me?.role === "admin" && (
          <motion.button
            onClick={() => { sfx.play("chime"); haptic(12); setView("admin"); }}
            whileTap={{ scale: 0.97 }}
            className="mt-4 w-full h-12 rounded-2xl vibe-gradient text-white font-semibold text-sm flex items-center justify-center gap-2 relative overflow-hidden"
          >
            <ShieldCheck className="h-4 w-4" /> Panneau Administrateur
            <motion.span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
            />
          </motion.button>
        )}

        <motion.button
          onClick={handleLogoutClick}
          disabled={exiting}
          whileTap={{ scale: 0.97, opacity: 0.85 }}
          className="mt-4 w-full h-11 rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 dark:ring-red-400/30 text-red-600 dark:text-red-300 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" /> {exiting ? "Déconnexion…" : "Se déconnecter"}
        </motion.button>
        <p className="text-[10px] v-fg-muted text-center mt-4">Vivilov · PWA démo</p>
      </div>
      {/* Modale de confirmation de suppression */}
      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 flex items-end justify-center p-4 backdrop-blur-sm"
            onClick={() => !deleting && setConfirmDelete(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="w-full max-w-sm rounded-3xl v-surface-solid ring-1 ring-(--v-divider) p-6 shadow-2xl mb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center gap-3 mb-6">
                <div className="h-14 w-14 rounded-full bg-red-500/15 grid place-items-center">
                  <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg v-fg">Supprimer la vidéo {confirmDelete} ?</h3>
                  <p className="text-sm v-fg-muted mt-1">Cette action est irréversible. La vidéo sera définitivement supprimée de ton profil.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 h-12 rounded-2xl v-surface-1 v-fg-muted font-semibold hover:v-surface-2 transition disabled:opacity-50"
                >
                  Annuler
                </motion.button>
                <button
                  onClick={() => deleteVideo(confirmDelete)}
                  disabled={deleting}
                  className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95 transition disabled:opacity-60"
                >
                  {deleting ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <><Trash2 className="h-4 w-4" /> Oui, supprimer</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl v-surface-solid ring-1 ring-(--v-divider) p-6 shadow-2xl"
            >
              <h3 className="font-display font-bold text-lg mb-4 v-fg">
                {editingField === "bio_filled" && "Modifier ta bio"}
                {editingField === "city_set" && "Modifier ta ville"}
                {editingField === "age_set" && "Modifier ton âge"}
                {editingField === "gender_set" && "Modifier ton genre"}
                {editingField === "looking_for_set" && "Ce que tu cherches"}
                {editingField === "vibe_answered" && "Ton Vibe Check"}
              </h3>
              
              <div className="mb-6">
                {editingField === "bio_filled" || editingField === "city_set" || editingField === "age_set" || editingField === "vibe_answered" ? (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Saisis ton texte..."
                    className="h-12 rounded-2xl v-surface-2 v-divider v-fg focus:border-vibe-purple"
                    autoFocus
                  />
                ) : editingField === "gender_set" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[{v:"f", l:"Femme"}, {v:"m", l:"Homme"}, {v:"nb", l:"NB"}].map(g => (
                      <motion.button key={g.v} onClick={() => setEditValue(g.v)} whileTap={{ scale: 0.93 }} className={`h-10 rounded-xl text-xs font-semibold transition ${editValue === g.v ? "vibe-gradient text-white vibe-glow" : "v-surface-1 v-fg-muted hover:v-surface-2"}`}>{g.l}</motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {[{v:"f", l:"Femmes"}, {v:"m", l:"Hommes"}, {v:"nb", l:"NB"}, {v:"all", l:"Tous"}].map(g => (
                      <motion.button key={g.v} onClick={() => setEditValue(g.v)} whileTap={{ scale: 0.93 }} className={`h-10 rounded-xl text-xs font-semibold transition ${editValue === g.v ? "vibe-gradient text-white vibe-glow" : "v-surface-1 v-fg-muted hover:v-surface-2"}`}>{g.l}</motion.button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setEditingField(null)}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 h-12 rounded-2xl v-surface-1 v-fg-muted font-semibold hover:v-surface-2 transition"
                >
                  Annuler
                </motion.button>
                <button
                  onClick={() => saveEdit(editingField, editValue)}
                  disabled={editSaving}
                  className="flex-1 h-12 rounded-2xl vibe-gradient text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
                >
                  {editSaving ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <><Check className="h-4 w-4" /> Enregistrer</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProgressRing({ percent, size = 48, strokeWidth = 4 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="upload-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.55 0.24 295)" />
            <stop offset="50%" stopColor="oklch(0.65 0.24 350)" />
            <stop offset="100%" stopColor="oklch(0.72 0.19 55)" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" className="stroke-(--v-divider)" strokeWidth={strokeWidth} />
        <motion.circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="url(#upload-grad)" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: dashOffset }} transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 4px oklch(0.65 0.24 350 / 0.5))" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-black text-xs vibe-text-gradient tabular-nums">{percent}%</span>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl v-surface-1 ring-1 ring-(--v-divider) p-2.5 text-center">
      <p className="text-[10px] v-fg-muted uppercase tracking-wide flex items-center justify-center gap-1">{icon}{label}</p>
      <p className="font-display font-bold text-sm mt-0.5 capitalize truncate">{value}</p>
    </div>
  );
}

function PremiumRow({ icon, title, desc, cost, onClick, loading }: { icon: React.ReactNode; title: string; desc: string; cost: number; onClick: () => void; loading: boolean }) {
  return (
    <motion.button onClick={onClick} disabled={loading} whileTap={{ scale: 0.98 }} className="w-full flex items-center gap-3 rounded-2xl v-surface-1 ring-1 ring-(--v-divider) p-3 hover:v-surface-2 transition text-left disabled:opacity-60">
      <span className="grid place-items-center h-9 w-9 rounded-xl bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{title}</p><p className="text-[11px] v-fg-muted truncate">{desc}</p></div>
      <span className="text-xs text-fuchsia-600 dark:text-fuchsia-300 flex items-center gap-0.5 shrink-0">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>{cost} <GemIcon className="h-3 w-3" /></>}
      </span>
    </motion.button>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (<div className="flex items-center gap-3 p-3"><span className="v-fg-muted">{icon}</span><span className="flex-1 text-sm">{label}</span>{children}</div>);
}
