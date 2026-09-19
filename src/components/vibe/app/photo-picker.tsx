"use client";
// PhotoPicker — le composant partagé « photos de profil » (max 5). Utilisé à
// la fois dans l'onboarding (fond sombre) et l'onglet Profil (thème clair) :
// tout passe par les utilitaires v-* (thème-aware), SAUF les overlays posés
// SUR les images qui restent noir/blanc constants.
//
// Design : sobre et tactile — une grille de 5 tuiles, un bouton « + »
// discret, un X par photo. Le compteur « n/max » est rendu par le PARENT
// pour rester flexible selon le contexte d'appel.
//
// Sélection (optionnelle) : quand `onSelect` est fourni (onglet Profil), un
// toc sur une tuile l'affiche dans le grand cadre parent — l'anneau violet
// (`activeIndex`) marque la photo affichée, comme les miniatures vidéo.
// Sans `onSelect` (onboarding), les tuiles restent de simples vignettes.
//
// Pipeline picking : compressImage (canvas, EXIF-safe, long côté ≤ 1080) →
// uploadToCloudinary (image) → fallback data URL si l'upload échoue (bac à
// sable — toast UNE seule fois par session de picking).

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/vibe/image-compress";
import { uploadToCloudinary } from "@/lib/cloudinary-client";
import { cn } from "@/lib/utils";

export type PhotoPickerProps = {
  photos: string[];
  /** Nouveau set compacté après chaque opération (ajout / retrait) */
  onChange: (next: string[]) => void;
  max?: number;
  disabled?: boolean;
  /** Ajustement d'aspect / style de tuile selon le contexte d'appel */
  tileClassName?: string;
  /** Notifie le parent qu'un upload est en cours (pour verrouiller un CTA
   *  pendant la transaction — ex. bouton Terminer de l'onboarding). */
  onUploadingChange?: (uploading: boolean) => void;
  /** Toc sur une photo existante — l'affiche dans le grand cadre parent. */
  onSelect?: (index: number) => void;
  /** Index de la photo affichée dans le grand cadre (anneau violet), -1 si aucune. */
  activeIndex?: number;
};

export function PhotoPicker({
  photos,
  onChange,
  max = 5,
  disabled = false,
  tileClassName,
  onUploadingChange,
  onSelect,
  activeIndex = -1,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  // « Mode bac à sable » : un seul toast par session de picking (pas par photo).
  const sandboxToastRef = useRef(false);
  const busy = disabled || uploading;

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // Reset immédiat : permettre de re-choisir le même fichier juste après.
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0 || busy) return;

    const room = max - photos.length;
    if (room <= 0) return;

    const picked = files.slice(0, room);
    if (files.length > room) {
      toast.info(
        room === 1
          ? `Maximum ${max} photos — seule la première sera ajoutée.`
          : `Maximum ${max} photos — seules les ${room} premières seront ajoutées.`,
      );
    }

    setUploading(true);
    setProgress(0);
    sandboxToastRef.current = false;
    const uploaded: string[] = [];
    try {
      for (const file of picked) {
        // 1. Compression locale — EXIF-safe, jamais d'agrandissement, JPEG 0.85.
        const { dataUrl, blob } = await compressImage(file);
        setProgress(0);
        // 2. Upload CDN — fallback data URL si Cloudinary est injoignable.
        try {
          const jpeg = new File([blob], `photo-${Date.now()}-${uploaded.length + 1}.jpg`, {
            type: "image/jpeg",
          });
          const res = await uploadToCloudinary(jpeg, "image", (p) => setProgress(p));
          uploaded.push(res.url);
        } catch {
          if (!sandboxToastRef.current) {
            sandboxToastRef.current = true;
            toast.info("Mode bac à sable : photo sauvegardée localement.");
          }
          uploaded.push(dataUrl);
        }
      }
      if (uploaded.length > 0) onChange([...photos, ...uploaded]);
    } catch (err: any) {
      // Erreurs de compression déjà formulées : format invalide, > 15 Mo,
      // image illisible… On les affiche telles quelles, en élégant.
      toast.error(err?.message || "Impossible d'ajouter cette photo.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function removeAt(index: number) {
    if (busy) return;
    // Compaction automatique : filter recolle le set sans trou.
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div
      className="grid grid-cols-5 gap-2"
      role="group"
      aria-label={`Photos de profil (${photos.length}/${max})`}
    >
      {photos.map((src, i) => (
        <div
          key={`${i}-${src.slice(0, 24)}-${src.slice(-16)}`}
          className={cn(
            "relative aspect-[3/4] rounded-xl overflow-hidden bg-v-surface-2",
            // Anneau de sélection — même langage visuel que les miniatures
            // vidéo (violet + halo doux) quand la photo est au grand cadre.
            activeIndex === i
              ? "ring-2 ring-vibe-purple shadow-[0_0_12px_rgba(192,38,211,0.5)]"
              : "ring-1 ring-(--v-divider)",
            tileClassName,
          )}
        >
          <img
            src={src}
            alt={`Photo ${i + 1}`}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Voile bas constant (sur l'image) — lisible clair comme sombre */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent pointer-events-none"
          />
          {/* Toc sur la tuile → sélection (grand cadre parent). Calque plein
              cadre SOUS le X : les deux restent des cibles distinctes. */}
          {onSelect && (
            <motion.button
              type="button"
              onClick={() => { if (!busy) onSelect(i); }}
              disabled={busy}
              whileTap={busy ? undefined : { scale: 0.94 }}
              aria-label={`Afficher la photo ${i + 1}`}
              className="absolute inset-0 z-10 cursor-pointer"
            />
          )}
          <motion.button
            type="button"
            onClick={() => removeAt(i)}
            disabled={busy}
            whileTap={busy ? undefined : { scale: 0.9 }}
            aria-label={`Retirer la photo ${i + 1}`}
            className="absolute top-1 right-1 z-20 h-5 w-5 grid place-items-center rounded-full bg-black/50 backdrop-blur text-white/90 hover:bg-black/70 hover:text-white transition disabled:opacity-40"
          >
            <X className="h-3 w-3" />
          </motion.button>
        </div>
      ))}

      {/* Tuile « + » — absente quand le maximum est atteint */}
      {photos.length < max && (
        <motion.button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          whileTap={busy ? undefined : { scale: 0.94 }}
          aria-label={
            photos.length === 0
              ? "Ajouter des photos"
              : `Ajouter des photos (${photos.length}/${max})`
          }
          className={cn(
            "relative aspect-[3/4] rounded-xl grid place-items-center border-2 border-dashed border-(--v-divider) transition",
            tileClassName,
            busy
              ? "v-surface-1 cursor-not-allowed"
              : "v-surface-1 hover:v-surface-2 hover:border-vibe-purple/60",
          )}
        >
          {uploading ? (
            <span className="flex flex-col items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin v-fg-muted" />
              {progress > 0 && (
                <span className="text-[9px] v-fg-muted tabular-nums leading-none">{progress}%</span>
              )}
            </span>
          ) : (
            <ImagePlus className="h-4 w-4 v-fg-muted" />
          )}
        </motion.button>
      )}

      {/* Input fichier caché — multiple, images uniquement */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
        disabled={busy}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
