"use client";
// ActiveBuffsSection — l'espace réservé aux actions premium ACTIVES,
// dans l'onglet Profil. Chaque action à durée (Boost, Projecteur, Mode
// Fantôme, Passport, Temps Gelé, Double Quotidien, Crush Alert, Cœur
// d'Or) y apparaît automatiquement dès son activation, avec :
//
//   - un anneau de compte à rebours circulaire au dégradé propre à
//     chaque action (CountdownRing), qui tic en direct ;
//   - une carte « ultra épurée » : liseré dégradé, halo ambiant,
//     balayage lumineux discret, entrée en ressort décalée ;
//   - un état urgent (< 60 s) : l'anneau passe au rouge et pulse ;
//   - une interaction : toucher une carte ouvre un panneau de détail
//     immersif (grand anneau, heure d'expiration, CTA « Prolonger »).
//
// Données : hook `useActiveBuffs` — rafraîchi instantanément via
// l'événement `vivilov:buff-activated` (émis par ActionSuccessModal
// dès qu'une action premium est activée) + poll de sécurité 15 s.
//
// Thème : tokens v-surface / v-fg — impeccable en clair comme en nuit.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useActiveBuffs, type ActiveBuff, type BuffType } from "@/lib/vibe/use-active-buffs";
import { CountdownRing } from "./countdown-ring";
import { haptic } from "./interactive-animations";

/// Palette par type — reprend les dégradés de CountdownRing pour le
/// liseré de carte et le halo ambiant (couleurs pleines, opacité gérée
/// par les classes / styles).
const BUFF_COLORS: Record<BuffType, { edge: string; glow: string; soft: string }> = {
  boost:      { edge: "oklch(0.72 0.19 55)",  glow: "oklch(0.72 0.19 55 / 0.16)",  soft: "oklch(0.72 0.19 55 / 0.08)" },
  spotlight:  { edge: "oklch(0.65 0.24 350)", glow: "oklch(0.65 0.24 350 / 0.16)", soft: "oklch(0.65 0.24 350 / 0.08)" },
  ghostMode:  { edge: "oklch(0.55 0.24 295)", glow: "oklch(0.55 0.24 295 / 0.16)", soft: "oklch(0.55 0.24 295 / 0.08)" },
  passport:   { edge: "oklch(0.7 0.15 230)",  glow: "oklch(0.7 0.15 230 / 0.16)",  soft: "oklch(0.7 0.15 230 / 0.08)" },
  timeFreeze: { edge: "oklch(0.78 0.12 210)", glow: "oklch(0.78 0.12 210 / 0.18)", soft: "oklch(0.78 0.12 210 / 0.10)" },
  dailyDouble:{ edge: "oklch(0.65 0.24 350)", glow: "oklch(0.6 0.22 320 / 0.16)",  soft: "oklch(0.6 0.22 320 / 0.08)" },
  crushAlert: { edge: "oklch(0.65 0.25 15)",  glow: "oklch(0.65 0.25 15 / 0.16)",  soft: "oklch(0.65 0.25 15 / 0.08)" },
  goldenHeart:{ edge: "oklch(0.82 0.16 85)",  glow: "oklch(0.82 0.16 85 / 0.20)",  soft: "oklch(0.82 0.16 85 / 0.10)" },
};

export function ActiveBuffsSection({ onOpenPremium }: { onOpenPremium?: () => void }) {
  const { buffs, loading } = useActiveBuffs();
  const [detail, setDetail] = useState<ActiveBuff | null>(null);

  return (
    <section aria-label="Actions premium actives" className="mb-5">
      {/* ── En-tête de l'espace réservé ─────────────────────────── */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                buffs.length > 0 ? "bg-vibe-purple animate-ping opacity-60" : "bg-zinc-400/50"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                buffs.length > 0 ? "bg-vibe-purple" : "bg-zinc-400/60"
              }`}
            />
          </span>
          <h3 className="font-display font-bold text-sm tracking-tight">
            Actions actives
          </h3>
          {buffs.length > 0 && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="rounded-full vibe-gradient text-white text-[10px] font-bold px-2 py-0.5 leading-none tabular-nums"
            >
              {buffs.length}
            </motion.span>
          )}
        </div>
        <span className="text-[10px] v-fg-faint font-medium">
          {buffs.length > 0 ? "en direct · toc pour détails" : loading ? "…" : "aucune"}
        </span>
      </div>

      {/* ── Squelettes de chargement (premier rendu) ─────────────── */}
      {loading && buffs.length === 0 && (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[76px] rounded-2xl v-surface-1 ring-1 ring-(--v-divider) animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {/* ── État vide : sobre, élégant, avec CTA ─────────────────── */}
      {!loading && buffs.length === 0 && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onClick={() => {
            haptic(8);
            onOpenPremium?.();
          }}
          whileTap={{ scale: 0.98 }}
          className="group relative w-full rounded-2xl v-surface-1 ring-1 ring-(--v-divider) overflow-hidden p-4 flex items-center gap-3.5 text-left"
        >
          {/* Halo doux + anneau décoratif */}
          <div
            aria-hidden
            className="absolute -top-8 -right-8 h-28 w-28 rounded-full blur-2xl pointer-events-none"
            style={{ background: "oklch(0.55 0.24 295 / 0.10)" }}
          />
          <div className="relative shrink-0 h-12 w-12 rounded-full grid place-items-center vibe-gradient-soft ring-1 ring-(--v-divider)">
            <Sparkles className="h-5 w-5 text-vibe-purple dark:text-vibe-pink" />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="font-display font-bold text-[13px] leading-tight">
              Aucune action active
            </p>
            <p className="text-[11px] v-fg-muted leading-snug mt-0.5">
              Boost, Projecteur, Passport… tes actions premium actives
              s'afficheront ici avec leur compte à rebours.
            </p>
          </div>
          <span className="relative shrink-0 text-[11px] font-semibold text-vibe-purple dark:text-vibe-pink group-active:scale-95 transition-transform">
            Découvrir →
          </span>
        </motion.button>
      )}

      {/* ── Cartes des actions actives ───────────────────────────── */}
      {buffs.length > 0 && (
        <div className="space-y-2">
          {buffs.map((buff, i) => (
            <BuffCard key={buff.type + buff.expiresAt} buff={buff} index={i} onOpen={() => {
              haptic(10);
              setDetail(buff);
            }} />
          ))}
        </div>
      )}

      {/* ── Panneau de détail immersif ───────────────────────────── */}
      <BuffDetailSheet
        buff={detail}
        onClose={() => setDetail(null)}
        onExtend={() => {
          setDetail(null);
          onOpenPremium?.();
        }}
      />
    </section>
  );
}

/// ─────────────────────────────────────────────────────────────────
/// BuffCard — une action active : anneau dégradé à gauche, infos à
/// droite, liseré dégradé vertical sur le bord gauche, halo ambiant et
/// balayage lumineux périodique. Toc → panneau de détail.
/// ─────────────────────────────────────────────────────────────────
function BuffCard({
  buff,
  index,
  onOpen,
}: {
  buff: ActiveBuff;
  index: number;
  onOpen: () => void;
}) {
  const colors = BUFF_COLORS[buff.type] ?? BUFF_COLORS.ghostMode;
  const urgent = buff.remainingMs < 60_000;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{
        delay: Math.min(index * 0.07, 0.35),
        type: "spring",
        stiffness: 300,
        damping: 26,
      }}
      whileTap={{ scale: 0.985 }}
      onClick={onOpen}
      aria-label={`${buff.label} actif — ${formatExpiryLabel(buff)} — voir les détails`}
      className="group relative w-full rounded-2xl v-surface-1 ring-1 ring-(--v-divider) overflow-hidden text-left"
    >
      {/* Liseré dégradé vertical (signature du type) */}
      <span
        aria-hidden
        className="absolute left-0 inset-y-0 w-[3px]"
        style={{ background: `linear-gradient(to bottom, ${colors.edge}, transparent 130%)` }}
      />

      {/* Halo ambiant — teinte le coin supérieur selon le type */}
      <span
        aria-hidden
        className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl pointer-events-none"
        style={{ background: colors.glow }}
      />

      {/* Balayage lumineux — discret, une fois toutes les ~4 s */}
      <motion.span
        aria-hidden
        className="absolute inset-y-0 w-1/3 pointer-events-none"
        style={{
          background:
            "linear-gradient(100deg, transparent 0%, oklch(1 0 0 / 0.07) 50%, transparent 100%)",
        }}
        initial={{ x: "-120%" }}
        animate={{ x: ["-120%", "360%"] }}
        transition={{
          duration: 2.6,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 3.4,
          delay: index * 0.4,
        }}
      />

      <div className="relative flex items-center gap-3.5 p-3.5 pl-4">
        {/* Anneau de compte à rebours au dégradé */}
        <CountdownRing
          type={buff.type}
          remainingMs={buff.remainingMs}
          totalMs={buff.totalMs}
          progress={buff.progress}
          size={56}
          strokeWidth={4.5}
        />

        {/* Infos essentielles — épurées */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] leading-none" aria-hidden>
              {buff.emoji}
            </span>
            <p className="font-display font-bold text-[13px] truncate">{buff.label}</p>
            {urgent && (
              <span className="shrink-0 rounded-full bg-red-500/15 text-red-500 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 leading-none">
                BIENTÔT FINI
              </span>
            )}
          </div>
          <p className="text-[11px] v-fg-muted leading-snug mt-0.5 line-clamp-2">
            {buff.desc}
          </p>
          <p className="text-[10px] v-fg-faint mt-1 tabular-nums">
            expire à {formatExpiryClock(buff.expiresAt)}
          </p>
        </div>

        {/* Chevron discret */}
        <span
          aria-hidden
          className="shrink-0 v-fg-faint text-xs group-hover:translate-x-0.5 transition-transform"
        >
          ›
        </span>
      </div>
    </motion.button>
  );
}

/// ─────────────────────────────────────────────────────────────────
/// BuffDetailSheet — panneau de détail immersif d'une action active :
/// grand anneau dégradé qui tic en direct, description, heure
/// d'expiration précise, et CTA « Prolonger l'action ».
/// ─────────────────────────────────────────────────────────────────
function BuffDetailSheet({
  buff,
  onClose,
  onExtend,
}: {
  buff: ActiveBuff | null;
  onClose: () => void;
  onExtend: () => void;
}) {
  const colors = buff ? (BUFF_COLORS[buff.type] ?? BUFF_COLORS.ghostMode) : BUFF_COLORS.ghostMode;

  return (
    <AnimatePresence>
      {buff && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            role="dialog"
            aria-label={`Détails de l'action ${buff.label}`}
            className="fixed bottom-0 inset-x-0 z-[71] rounded-t-3xl v-surface-solid v-fg ring-1 ring-(--v-divider) overflow-hidden max-h-[80vh]"
          >
            {/* Poignée de glissement */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="h-1 w-10 rounded-full v-surface-3" />
            </div>

            {/* Halo d'ambiance du type */}
            <div
              aria-hidden
              className="absolute -top-16 left-1/2 -translate-x-1/2 h-48 w-72 rounded-full blur-3xl pointer-events-none"
              style={{ background: colors.glow }}
            />

            <button
              onClick={onClose}
              aria-label="Fermer les détails"
              className="absolute top-3 right-3 z-10 h-9 w-9 grid place-items-center rounded-full v-surface-2 v-fg-muted hover:v-surface-3 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-6 pb-8 pt-3 flex flex-col items-center text-center">
              {/* Grand anneau de compte à rebours */}
              <div className="relative mb-4">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{ background: colors.soft }}
                />
                <CountdownRing
                  type={buff.type}
                  remainingMs={buff.remainingMs}
                  totalMs={buff.totalMs}
                  progress={buff.progress}
                  size={110}
                  strokeWidth={7}
                />
              </div>

              {/* Identité de l'action */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 mb-1"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {buff.emoji}
                </span>
                <h4 className="font-display font-bold text-lg tracking-tight">
                  {buff.label}
                </h4>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.16 }}
                className="text-sm v-fg-muted max-w-[280px] leading-snug mb-4"
              >
                {buff.desc}
              </motion.p>

              {/* Métadonnées : activation / expiration */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="grid grid-cols-2 gap-2 w-full max-w-xs mb-5"
              >
                <div className="rounded-xl v-surface-1 ring-1 ring-(--v-divider) px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-wide v-fg-faint font-semibold">
                    Activée
                  </p>
                  <p className="text-xs font-bold tabular-nums mt-0.5">
                    il y a {formatElapsedLabel(buff)}
                  </p>
                </div>
                <div className="rounded-xl v-surface-1 ring-1 ring-(--v-divider) px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-wide v-fg-faint font-semibold">
                    Expire
                  </p>
                  <p className="text-xs font-bold tabular-nums mt-0.5">
                    à {formatExpiryClock(buff.expiresAt)}
                  </p>
                </div>
              </motion.div>

              {/* CTA : prolonger l'action */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                onClick={() => {
                  haptic(12);
                  onExtend();
                }}
                whileTap={{ scale: 0.97 }}
                className="w-full max-w-xs h-12 rounded-2xl vibe-gradient text-white font-display font-bold text-sm relative overflow-hidden"
              >
                Prolonger l'action
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{
                    animation: "shimmerSweep 2.8s ease-in-out infinite",
                  }}
                />
              </motion.button>

              <button
                onClick={onClose}
                className="mt-2 text-[12px] v-fg-muted font-medium hover:v-fg transition-colors py-1.5"
              >
                Fermer
              </button>
            </div>

            {/* Keyframes du balayage du CTA */}
            <style>{`
              @keyframes shimmerSweep {
                0% { transform: translateX(-100%); }
                55%, 100% { transform: translateX(100%); }
              }
            `}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/// Heure d'expiration au format local fr (« à 14:32 »).
function formatExpiryClock(expiresAt: string): string {
  try {
    return new Date(expiresAt).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/// Libellé court du temps restant (« ~30 min », « ~2 h »).
function formatExpiryLabel(buff: ActiveBuff): string {
  const min = Math.max(0, Math.round(buff.remainingMs / 60000));
  if (min < 60) return `reste ~${min} min`;
  const h = Math.round(min / 60);
  return `reste ~${h} h`;
}

/// « 12 min », « 1 h 05 »… depuis l'activation (totalMs − remainingMs).
function formatElapsedLabel(buff: ActiveBuff): string {
  const min = Math.max(0, Math.round((buff.totalMs - buff.remainingMs) / 60000));
  if (min < 1) return "quelques secondes";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
