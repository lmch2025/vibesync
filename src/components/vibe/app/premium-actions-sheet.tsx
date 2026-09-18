"use client";
// PremiumActionsSheet — elegant bottom sheet showing all premium actions.
// Appears when the user taps a "✨ Premium" button (generic) or the ✨ button
// on a deck card (CONTEXTUAL mode — carries profileId/profileName so
// profile-targeted actions really land on the chosen profile).
//
// Correctness guarantees (each action does exactly what it promises):
//   • Profile-targeted actions (Cœur d'Or, Crush Alert, Anneau d'Humeur,
//     Rapport Compatibilité) only execute WITH a target — in generic mode
//     they show a "depuis un profil" hint instead of charging for a no-op.
//   • Super-Like + Boost Message are flow-specific (swipe-up gesture / chat ⚡)
//     and never charge from this sheet.
//   • Passport opens an inline city picker before activation.
//   • Actions that change the deck (rewind, superRewind, passport, boost)
//     dispatch `vivilov:deck-refresh` so the Découvrir tab reloads instantly.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X, Zap, MapPin, Copy, Check } from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { PREMIUM_ACTIONS, type PremiumAction } from "@/lib/vibe/constants";
import { CITIES } from "@/lib/vibe/cities";
import { useVibe } from "@/lib/vibe/store";
import { toast } from "sonner";
import { ActionSuccessModal } from "./action-success-modal";
import { celebrate } from "./interactive-animations";
import type { BuffType } from "@/lib/vibe/use-active-buffs";

/// Result payload returned by POST /api/vibe/gems/spend — the shape varies
/// per action (peek list, online list, likers, compatibility score, mood…).
export type ActionResult = {
  message?: string;
  gems?: number;
  freeGems?: number;
  peek?: { id: string; displayName: string; age: number; city: string; posterUrl?: string }[];
  online?: { id: string; displayName: string; age: number; city: string; posterUrl?: string; distanceKm: number; lastActive: string }[];
  likers?: { id: string; displayName: string; age: number; city: string; posterUrl?: string; direction: string }[];
  ghostTease?: number;
  hiddenByGhost?: number;
  score?: number;
  aiAnalysis?: string;
  profileName?: string;
  report?: { vibe: string; ageGap: string; location: string; recommendation: string };
  mood?: string;
  undoneCount?: number;
  active?: boolean;
  expiresAt?: string;
  city?: string;
  targetName?: string;
  deckRefresh?: boolean;
  icebreaker?: string;
  error?: string;
};

type ActiveEffect = {
  action: PremiumAction;
  result: ActionResult;
} | null;

/// Premium actions that grant a timed buff — mapped onto the shared BuffType
/// union so ActionSuccessModal shows its countdown ring preview.
const BUFF_ACTION_KEYS: Partial<Record<PremiumAction["key"], BuffType>> = {
  boost: "boost",
  spotlight: "spotlight",
  ghostMode: "ghostMode",
  passport: "passport",
  timeFreeze: "timeFreeze",
  crushAlert: "crushAlert",
  goldenHeart: "goldenHeart",
};

/// Actions that need a target profile — executable only in contextual mode.
const NEEDS_PROFILE: PremiumAction["key"][] = ["goldenHeart", "crushAlert", "moodRing", "compatibilityReport"];
/// Flow-specific actions — always shown as hints, never charged from here.
const FLOW_HINTS: Partial<Record<PremiumAction["key"], string>> = {
  superlike: "Glisse la carte vers le haut ⬆️ pour Super-Liker",
  messageBoost: "Active l'éclair ⚡ dans une conversation",
};

export function PremiumActionsSheet({
  open,
  onOpenChange,
  category,
  profileId,
  profileName,
  startInPassportPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category?: "swipe" | "profile" | "social" | "meta" | "all";
  profileId?: string;
  profileName?: string;
  /// Open directly on the passport city picker (e.g. from the empty deck).
  startInPassportPick?: boolean;
}) {
  const me = useVibe((s) => s.me);
  const patchMe = useVibe((s) => s.patchMe);
  const requireVibes = useVibe((s) => s.requireVibes);
  const [activeEffect, setActiveEffect] = useState<ActiveEffect>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Inline passport city picker (replaces the grid until a city is chosen).
  const [passportPick, setPassportPick] = useState(false);
  // Stable closer — keeps ActionSuccessModal's auto-dismiss timer untouched
  // across parent re-renders.
  const closeSuccess = useCallback(() => setActiveEffect(null), []);

  // "Explore another city" entries open straight on the city picker.
  useEffect(() => {
    if (open && startInPassportPick) setPassportPick(true);
    if (!open) setPassportPick(false);
  }, [open, startInPassportPick]);

  const actions = category
    ? category === "all"
      ? PREMIUM_ACTIONS
      : PREMIUM_ACTIONS.filter((a) => a.category === category)
    : PREMIUM_ACTIONS;

  const contextual = !!profileId;
  // In contextual mode, group by executable vs flow-hint; in generic mode,
  // show profile-targeted actions in a dedicated "contextuelles" group.
  const executable = actions.filter(
    (a) => !FLOW_HINTS[a.key] && (!NEEDS_PROFILE.includes(a.key) || contextual),
  );
  const contextualOnly = actions.filter((a) => NEEDS_PROFILE.includes(a.key) && !contextual);
  const flowHinted = actions.filter((a) => FLOW_HINTS[a.key]);

  const grouped = {
    swipe: executable.filter((a) => a.category === "swipe"),
    social: executable.filter((a) => a.category === "social"),
    profile: executable.filter((a) => a.category === "profile"),
    meta: executable.filter((a) => a.category === "meta"),
  };

  const cityOptions = (() => {
    const myCity = me?.profile?.city;
    const seen = new Set<string>();
    return CITIES.filter((c) => {
      if (c.name === myCity || seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    }).slice(0, 18);
  })();

  async function execute(action: PremiumAction, extra?: Record<string, unknown>) {
    setBusy(action.key);
    // requireVibes invokes `proceed` synchronously when the balance is enough,
    // and redirects to the Vibes purchase page otherwise. Track which one
    // happened so busy is released by the async flow's `finally` (the spinner
    // now really shows) — or immediately when the action never started.
    let started = false;
    requireVibes(action.cost, `${action.emoji} ${action.label} (${action.cost} Vibes)`, async () => {
      started = true;
      // Light launch feedback — the real celebration lives in ActionSuccessModal.
      celebrate({ sound: "pop", confettiCount: 0, hapticPattern: 10 });
      try {
        const res = await fetch("/api/vibe/gems/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: action.key,
            ...(NEEDS_PROFILE.includes(action.key) && profileId ? { profileId } : {}),
            ...extra,
          }),
        });
        const data: ActionResult = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        patchMe({ gems: data.gems, freeGems: data.freeGems });
        if (data.message) toast.success(data.message);
        // The deck changed (rewind, passport, boost…) — reload it instantly.
        if (data.deckRefresh && typeof window !== "undefined") {
          window.dispatchEvent(new Event("vivilov:deck-refresh"));
        }
        // Celebrate through the shared success modal (emoji, label, buff countdown).
        setActiveEffect({ action, result: data });
        setPassportPick(false);
        onOpenChange(false);
      } catch (e: any) {
        toast.error(e.message || "Erreur");
      } finally {
        setBusy(null);
      }
    });
    if (!started) setBusy(null);
  }

  function tap(action: PremiumAction) {
    // Passport → inline city picker first.
    if (action.key === "passport") {
      setPassportPick(true);
      return;
    }
    // Flow-specific actions redirect with a hint (never charge).
    const hint = FLOW_HINTS[action.key];
    if (hint) {
      toast.info(`${action.emoji} ${action.label}`, { description: hint, duration: 4000 });
      return;
    }
    // Profile-targeted action without context → explain where to use it.
    if (NEEDS_PROFILE.includes(action.key) && !contextual) {
      toast.info(`${action.emoji} ${action.label}`, {
        description: "Ouvre ✨ sur une carte dans Découvrir pour cibler un profil.",
        duration: 4000,
      });
      return;
    }
    execute(action);
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setPassportPick(false); onOpenChange(false); }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              role="dialog"
              aria-label="Actions premium"
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl v-surface-solid v-fg ring-1 ring-(--v-divider) p-4 pb-6 max-h-[74vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-lg flex items-center gap-1.5">
                    <Crown className="h-5 w-5 text-accent" /> Actions Premium
                  </h3>
                  {contextual && profileName && (
                    <p className="text-[11px] v-fg-muted truncate">
                      pour <span className="font-semibold v-fg">{profileName}</span>
                    </p>
                  )}
                </div>
                <motion.button
                  onClick={() => { setPassportPick(false); onOpenChange(false); }}
                  whileTap={{ scale: 0.88 }}
                  aria-label="Fermer"
                  className="h-8 w-8 grid place-items-center rounded-full hover:v-surface-2 shrink-0"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              <div className="flex items-center gap-1.5 mb-4 rounded-full v-surface-1 ring-1 ring-(--v-divider) px-3 py-1.5 w-fit">
                <GemIcon className="h-4 w-4" />
                <span className="text-sm font-bold tabular-nums">{me?.gems ?? 0}</span>
                <span className="text-xs v-fg-muted">Vibes</span>
              </div>

              {passportPick ? (
                /* ── Passport city picker ─────────────────────────────── */
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => setPassportPick(false)}
                      className="text-[11px] v-fg-muted font-medium hover:v-fg transition"
                    >
                      ← Retour
                    </button>
                  </div>
                  <p className="font-display font-bold text-sm mb-0.5">✈️ Choisis ta destination</p>
                  <p className="text-[11px] v-fg-muted mb-3">
                    Tu découvriras les profils de cette ville pendant 24h.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {cityOptions.map((c) => (
                      <motion.button
                        key={c.name}
                        whileTap={{ scale: 0.95 }}
                        disabled={busy === "passport"}
                        onClick={() => execute(PREMIUM_ACTIONS.find((a) => a.key === "passport")!, { city: c.name })}
                        className="flex items-center gap-2 rounded-2xl v-surface-1 ring-1 ring-(--v-divider) px-3 py-2.5 hover:v-surface-2 transition text-left disabled:opacity-50"
                      >
                        <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold truncate">{c.name}</span>
                          <span className="block text-[10px] v-fg-muted truncate">{c.country}</span>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {Object.entries(grouped).map(([cat, items]) => items.length > 0 && (
                    <div key={cat} className="mb-4">
                      <p className="text-[10px] uppercase tracking-wide v-fg-muted font-semibold mb-2">
                        {cat === "swipe" ? "🎯 Swipe" : cat === "social" ? "💬 Social" : cat === "profile" ? "👤 Profil" : "⚙️ Méta"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map((action) => (
                          <ActionTile
                            key={action.key}
                            action={action}
                            busy={busy === action.key}
                            highlight={contextual && NEEDS_PROFILE.includes(action.key)}
                            onClick={() => tap(action)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Profile-targeted actions — context required */}
                  {contextualOnly.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-wide v-fg-muted font-semibold mb-2">
                        ✨ À utiliser depuis un profil
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {contextualOnly.map((action) => (
                          <ActionTile key={action.key} action={action} busy={false} dimmed onClick={() => tap(action)} />
                        ))}
                      </div>
                      <p className="text-[10px] v-fg-faint mt-2 px-1">
                        Astuce : touche ✨ sur une carte dans Découvrir pour cibler un profil.
                      </p>
                    </div>
                  )}

                  {/* Flow-specific actions — redirect hints */}
                  {flowHinted.length > 0 && (
                    <div className="mb-1">
                      <p className="text-[10px] uppercase tracking-wide v-fg-muted font-semibold mb-2">
                        🔎 Où les trouver ?
                      </p>
                      <div className="space-y-1.5">
                        {flowHinted.map((action) => (
                          <button
                            key={action.key}
                            onClick={() => tap(action)}
                            className="w-full flex items-center gap-2.5 rounded-2xl v-surface-1 ring-1 ring-(--v-divider) px-3 py-2.5 hover:v-surface-2 transition text-left"
                          >
                            <span className="text-xl shrink-0">{action.emoji}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold">{action.label}</span>
                              <span className="block text-[10px] v-fg-muted truncate">{FLOW_HINTS[action.key]}</span>
                            </span>
                            <Zap className="h-3 w-3 v-fg-faint shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success modal — celebrates the executed action (emoji, label,
          buff countdown ring) and carries the action-specific result. */}
      <ActionSuccessModal
        open={activeEffect !== null}
        onOpenChange={closeSuccess}
        emoji={activeEffect?.action.emoji ?? "✨"}
        title={activeEffect?.action.label ?? ""}
        message={activeEffect?.action.description}
        buffType={activeEffect ? BUFF_ACTION_KEYS[activeEffect.action.key] : undefined}
        result={activeEffect ? <EffectResult result={activeEffect.result} /> : undefined}
      />
    </>
  );
}

/// One premium action tile. `dimmed` = context required (generic mode),
/// `highlight` = targeting the contextual profile.
function ActionTile({
  action,
  busy,
  dimmed,
  highlight,
  onClick,
}: {
  action: PremiumAction;
  busy: boolean;
  dimmed?: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={busy}
      whileTap={{ scale: 0.95 }}
      aria-label={`${action.label} — ${action.cost} Vibes${dimmed ? " (depuis un profil)" : ""}`}
      className={`relative flex flex-col items-start gap-1 rounded-2xl p-3 text-left transition disabled:opacity-50 ring-1 ${
        highlight
          ? "v-surface-2 ring-accent/40 hover:v-surface-3"
          : "v-surface-1 ring-(--v-divider) hover:v-surface-2"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      <span className="text-2xl">{action.emoji}</span>
      <span className="text-xs font-bold leading-tight flex items-center gap-1">
        {action.label}
        {highlight && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" aria-hidden />}
      </span>
      <span className="text-[10px] v-fg-muted leading-tight">{action.description}</span>
      <span className="flex items-center gap-0.5 text-[10px] text-fuchsia-600 dark:text-fuchsia-300 font-semibold mt-1">
        <GemIcon className="h-2.5 w-2.5" /> {action.cost}
      </span>
      {busy && (
        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/50">
          <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-vibe-purple animate-spin" />
        </div>
      )}
    </motion.button>
  );
}

/// EffectResult — rich, action-specific result content rendered inside
/// ActionSuccessModal's `result` slot (peek lists, online list, likers,
/// compatibility score, AI analysis, mood, rewind count, icebreaker…).
export function EffectResult({ result }: { result: ActionResult }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      {result.message && (
        <div className="rounded-xl v-surface-1 ring-1 ring-white/10 px-3 py-2 text-sm text-white/80 text-center">
          {result.message}
        </div>
      )}

      {result.peek && result.peek.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">❄️ Aperçu des 3 prochains</p>
          {result.peek.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 rounded-xl v-surface-1 px-3 py-2">
              <ProfileThumb posterUrl={p.posterUrl} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.displayName}, {p.age}</p>
                <p className="text-[10px] text-white/70">{p.city}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.online && result.online.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold">📍 En ligne maintenant</p>
          {result.online.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 rounded-xl v-surface-1 px-3 py-2">
              <ProfileThumb posterUrl={p.posterUrl} online />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.displayName}, {p.age}</p>
                <p className="text-[10px] text-white/70">{p.city} · {p.distanceKm} km · {p.lastActive}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.likers && result.likers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-amber-300 font-semibold">👁️ Ils t'ont liké</p>
          {result.likers.map((l) => (
            <div key={l.id} className="flex items-center gap-2.5 rounded-xl v-surface-1 px-3 py-2">
              <ProfileThumb posterUrl={l.posterUrl} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{l.displayName}, {l.age}</p>
                <p className="text-[10px] text-white/70">{l.city} · {l.direction === "superlike" ? "Super-Like ⭐" : "Like ❤️"}</p>
              </div>
            </div>
          ))}
          {result.hiddenByGhost ? (
            <p className="text-[10px] text-white/60 text-center px-2">
              + {result.hiddenByGhost} visiteur{result.hiddenByGhost > 1 ? "s" : ""} en Mode Fantôme 👻 (invisible{result.hiddenByGhost > 1 ? "s" : ""})
            </p>
          ) : null}
        </div>
      )}

      {result.ghostTease ? (
        <div className="rounded-xl bg-vibe-gradient-soft ring-1 ring-white/10 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-white/90">👻 {result.ghostTease} personne{result.ghostTease > 1 ? "s" : ""} te parcoure{result.ghostTease > 1 ? "nt" : ""} en Mode Fantôme…</p>
          <p className="text-[11px] text-white/70 mt-0.5">Invisible{result.ghostTease > 1 ? "s" : ""} jusqu&apos;à la fin de leur buff — reviens plus tard !</p>
        </div>
      ) : null}

      {result.score !== undefined && (
        <div className="space-y-2">
          <div className="rounded-xl bg-gradient-to-br from-vibe-purple/20 to-vibe-pink/20 ring-1 ring-white/10 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-white/70">
              Compatibilité avec {result.profileName ?? "ce profil"}
            </p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="font-display text-4xl font-black vibe-text-gradient"
            >
              {result.score}%
            </motion.p>
          </div>
          {result.report && (
            <div className="space-y-1 text-[11px] text-white/70">
              <p>🎯 {result.report.vibe}</p>
              <p>🎂 {result.report.ageGap}</p>
              <p>📍 {result.report.location}</p>
              <p className="font-medium text-white/80 mt-1">{result.report.recommendation}</p>
            </div>
          )}
          {result.aiAnalysis && (
            <div className="rounded-xl v-surface-1 ring-1 ring-white/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/70 font-semibold mb-1">🧬 Analyse IA</p>
              <p className="text-[12px] text-white/85 leading-relaxed">{result.aiAnalysis}</p>
            </div>
          )}
          {result.score >= 80 && (
            <p className="text-[10px] text-amber-200/80 text-center px-2 leading-relaxed">
              💛 Envie de te démarquer ? Le Cœur d'Or place ton profil en tête de sa file avec un badge doré.
            </p>
          )}
        </div>
      )}

      {result.mood && (
        <div className="rounded-xl bg-gradient-to-br from-vibe-purple/20 to-vibe-pink/20 ring-1 ring-white/10 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-white/70">
            Humeur de {result.profileName ?? "aujourd'hui"}
          </p>
          <p className="font-display text-2xl font-bold">{result.mood}</p>
        </div>
      )}

      {result.undoneCount !== undefined && result.undoneCount > 0 && (
        <div className="rounded-xl v-surface-1 ring-1 ring-white/10 px-3 py-2 text-sm text-white/80 text-center">
          ↩️ {result.undoneCount} swipe{result.undoneCount > 1 ? "s" : ""} annulé{result.undoneCount > 1 ? "s" : ""} — le{result.undoneCount > 1 ? "s" : ""} profil{result.undoneCount > 1 ? "s" : ""} revient{result.undoneCount > 1 ? "ent" : ""} dans ton deck !
        </div>
      )}

      {result.active && !result.message && (
        <div className="rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/30 px-3 py-2 text-sm text-emerald-300 text-center">
          ✅ Action activée avec succès !
        </div>
      )}

      {result.icebreaker && (
        <div className="rounded-xl bg-vibe-gradient-soft ring-1 ring-white/10 px-3 py-3">
          <p className="text-sm text-white/90 italic text-center">&ldquo;{result.icebreaker}&rdquo;</p>
          <div className="flex justify-center mt-2">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.icebreaker!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                } catch {
                  /* clipboard unavailable */
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full v-surface-2 ring-1 ring-white/10 px-3 py-1 text-[11px] font-semibold text-white/85 hover:v-surface-3 transition"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/// Small round profile thumbnail with poster fallback + optional online dot.
function ProfileThumb({ posterUrl, online }: { posterUrl?: string; online?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span className="block h-9 w-9 rounded-full overflow-hidden ring-1 ring-white/15 bg-vibe-gradient-soft grid place-items-center">
        {posterUrl ? (
          <img src={posterUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm">👤</span>
        )}
      </span>
      {online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-1 ring-zinc-900" />}
    </span>
  );
}
