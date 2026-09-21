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
//   • Passport opens an inline WORLDWIDE city picker (predictive search on
//     /api/vibe/cities — same service as onboarding) before activation.
//   • Actions that change the deck (rewind, superRewind, passport, boost)
//     dispatch `vivilov:deck-refresh` so the Découvrir tab reloads instantly.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X, Zap, MapPin, Copy, Check, Search } from "lucide-react";
import { GemIcon } from "@/components/vibe/gem-badge";
import { Input } from "@/components/ui/input";
import { PREMIUM_ACTIONS, type PremiumAction } from "@/lib/vibe/constants";
import { countryNameLocalized, flagEmoji } from "@/lib/vibe/geo/countries";
import { useVibe } from "@/lib/vibe/store";
import { toast } from "sonner";
import { ActionSuccessModal } from "./action-success-modal";
import { celebrate } from "./interactive-animations";
import { useI18n } from "@/lib/vibe/i18n";
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

/// Ville du dataset mondial servie par /api/vibe/cities (même forme que le
/// champ prédictif de l'onboarding — sélection stricte dans la liste).
type CitySel = {
  name: string;
  region: string;
  countryCode: string;
  country: string; // nom anglais du dataset (parité avec la réponse API)
  lat: number;
  lng: number;
};

/// Subtle combo tips (« 💡 Astuce ») shown inside the success modal at the
/// moment of highest delight — one muted line suggesting the complementary
/// action, never a button. Only the natural pairs are mapped; everything
/// else stays clean (no forced cross-sell).
const COMBO_TIP_KEYS: Partial<Record<PremiumAction["key"], string>> = {
  boost: "premium.tip.boost",
  spotlight: "premium.tip.spotlight",
  superlike: "premium.tip.superlike",
  passport: "premium.tip.passport",
  rewind: "premium.tip.rewind",
  seeLikes: "premium.tip.seeLikes",
};

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
/// Flow-specific actions — always shown as hints, never charged from here
/// (clés i18n, traduites au rendu).
const FLOW_HINT_KEYS: Partial<Record<PremiumAction["key"], string>> = {
  superlike: "premium.flow.superlike",
  messageBoost: "premium.flow.messageBoost",
};

/// Libellés & descriptions des actions premium — constants.ts reste la
/// source de vérité (FR, coûts, emojis) ; on traduit au rendu via ces clés,
/// avec repli sur le libellé d'origine si l'action n'est pas mappée.
const ACTION_LABEL_KEYS: Partial<Record<PremiumAction["key"], string>> = {
  superlike: "premium.action.superlike",
  rewind: "premium.action.rewind",
  boost: "premium.action.boost",
  superRewind: "premium.action.superRewind",
  goldenHeart: "premium.action.goldenHeart",
  timeFreeze: "premium.action.timeFreeze",
  vibeRadar: "premium.action.vibeRadar",
  crushAlert: "premium.action.crushAlert",
  seeLikes: "premium.action.seeLikes",
  icebreaker: "premium.action.icebreaker",
  messageBoost: "premium.action.messageBoost",
  passport: "premium.action.passport",
  spotlight: "premium.action.spotlight",
  compatibilityReport: "premium.action.compatibilityReport",
  moodRing: "premium.action.moodRing",
  ghostMode: "premium.action.ghostMode",
  dailyDouble: "premium.action.dailyDouble",
};
const ACTION_DESC_KEYS: Partial<Record<PremiumAction["key"], string>> = {
  superlike: "premium.action.superlike.desc",
  rewind: "premium.action.rewind.desc",
  boost: "premium.action.boost.desc",
  superRewind: "premium.action.superRewind.desc",
  goldenHeart: "premium.action.goldenHeart.desc",
  timeFreeze: "premium.action.timeFreeze.desc",
  vibeRadar: "premium.action.vibeRadar.desc",
  crushAlert: "premium.action.crushAlert.desc",
  seeLikes: "premium.action.seeLikes.desc",
  icebreaker: "premium.action.icebreaker.desc",
  messageBoost: "premium.action.messageBoost.desc",
  passport: "premium.action.passport.desc",
  spotlight: "premium.action.spotlight.desc",
  compatibilityReport: "premium.action.compatibilityReport.desc",
  moodRing: "premium.action.moodRing.desc",
  ghostMode: "premium.action.ghostMode.desc",
  dailyDouble: "premium.action.dailyDouble.desc",
};

/// Fonction t() du hook useI18n (pour les helpers module-level).
type TFunc = ReturnType<typeof useI18n>["t"];

function actionLabel(t: TFunc, a: PremiumAction): string {
  const k = ACTION_LABEL_KEYS[a.key];
  return k ? t(k) : a.label;
}

function actionDesc(t: TFunc, a: PremiumAction): string {
  const k = ACTION_DESC_KEYS[a.key];
  return k ? t(k) : a.description;
}

function comboTip(t: TFunc, key: PremiumAction["key"]): string | undefined {
  const k = COMBO_TIP_KEYS[key];
  return k ? t(k) : undefined;
}

function flowHint(t: TFunc, key: PremiumAction["key"]): string | undefined {
  const k = FLOW_HINT_KEYS[key];
  return k ? t(k) : undefined;
}

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
  const { t, apiErr, lang } = useI18n();
  const [activeEffect, setActiveEffect] = useState<ActiveEffect>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Inline passport city picker (replaces the action grid until a city is chosen).
  const [passportPick, setPassportPick] = useState(false);
  // Passport — recherche prédictive mondiale (même service que l'onboarding).
  const [passportQuery, setPassportQuery] = useState("");
  const [passportResults, setPassportResults] = useState<CitySel[]>([]);
  const [passportSearching, setPassportSearching] = useState(false);
  const [passportFocused, setPassportFocused] = useState(false);
  // Stable closer — keeps ActionSuccessModal's auto-dismiss timer untouched
  // across parent re-renders.
  const closeSuccess = useCallback(() => setActiveEffect(null), []);

  // "Explore another city" entries open straight on the city picker.
  useEffect(() => {
    if (open && startInPassportPick) setPassportPick(true);
    if (!open) setPassportPick(false);
  }, [open, startInPassportPick]);

  // Champ de recherche vierge à chaque (ré)ouverture du picker Passport.
  useEffect(() => {
    if (passportPick) {
      setPassportQuery("");
      setPassportResults([]);
      setPassportSearching(false);
      setPassportFocused(false);
    }
  }, [passportPick]);

  // Recherche prédictive MONDIALE via /api/vibe/cities — debounce 180 ms +
  // AbortController (chaque frappe annule la requête périmée). Pas de boost
  // pays explicite : le Passport sert à explorer le monde entier (le serveur
  // applique déjà son boost IP par défaut).
  useEffect(() => {
    if (!passportPick) return;
    const q = passportQuery.trim();
    if (q.length < 2) {
      setPassportResults([]);
      setPassportSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setPassportSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vibe/cities?q=${encodeURIComponent(q)}&limit=8`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setPassportResults(Array.isArray(data?.cities) ? data.cities : []);
      } catch {
        /* requête annulée ou réseau indisponible — on garde les résultats précédents */
      } finally {
        if (!ctrl.signal.aborted) setPassportSearching(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [passportQuery, passportPick]);

  const actions = category
    ? category === "all"
      ? PREMIUM_ACTIONS
      : PREMIUM_ACTIONS.filter((a) => a.category === category)
    : PREMIUM_ACTIONS;

  const contextual = !!profileId;
  // In contextual mode, group by executable vs flow-hint; in generic mode,
  // show profile-targeted actions in a dedicated "contextuelles" group.
  const executable = actions.filter(
    (a) => !FLOW_HINT_KEYS[a.key] && (!NEEDS_PROFILE.includes(a.key) || contextual),
  );
  const contextualOnly = actions.filter((a) => NEEDS_PROFILE.includes(a.key) && !contextual);
  const flowHinted = actions.filter((a) => FLOW_HINT_KEYS[a.key]);

  const grouped = {
    swipe: executable.filter((a) => a.category === "swipe"),
    social: executable.filter((a) => a.category === "social"),
    profile: executable.filter((a) => a.category === "profile"),
    meta: executable.filter((a) => a.category === "meta"),
  };

  async function execute(action: PremiumAction, extra?: Record<string, unknown>) {
    setBusy(action.key);
    // requireVibes invokes `proceed` synchronously when the balance is enough,
    // and redirects to the Vibes purchase page otherwise. Track which one
    // happened so busy is released by the async flow's `finally` (the spinner
    // now really shows) — or immediately when the action never started.
    let started = false;
    requireVibes(action.cost, `${action.emoji} ${actionLabel(t, action)} (${action.cost} Vibes)`, async () => {
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
        // No toast here — the shared ActionSuccessModal below IS the
        // celebration (emoji, label, buff countdown + combo tip). A stacked
        // toast would only duplicate the message over the header.
        // The deck changed (rewind, passport, boost…) — reload it instantly.
        if (data.deckRefresh && typeof window !== "undefined") {
          window.dispatchEvent(new Event("vivilov:deck-refresh"));
        }
        // Celebrate through the shared success modal (emoji, label, buff countdown).
        setActiveEffect({ action, result: data });
        setPassportPick(false);
        onOpenChange(false);
      } catch (e: any) {
        toast.error(apiErr(e.message) || t("premium.error"));
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
    const hint = flowHint(t, action.key);
    if (hint) {
      toast.info(`${action.emoji} ${actionLabel(t, action)}`, { description: hint, duration: 4000 });
      return;
    }
    // Profile-targeted action without context → explain where to use it.
    if (NEEDS_PROFILE.includes(action.key) && !contextual) {
      toast.info(`${action.emoji} ${actionLabel(t, action)}`, {
        description: t("premium.needsProfile"),
        duration: 4000,
      });
      return;
    }
    execute(action);
  }

  /// Sélection d'une destination Passport → exécution immédiate. On envoie
  /// le NOM SEUL de la ville : le deck serveur matche user.passportCity par
  /// égalité de chaîne avec profile.city (format historique = nom seul).
  function pickPassportCity(c: CitySel) {
    execute(PREMIUM_ACTIONS.find((a) => a.key === "passport")!, { city: c.name });
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
              aria-label={t("premium.sheet.aria")}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl v-surface-solid v-fg ring-1 ring-(--v-divider) p-4 pb-6 max-h-[74vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-lg flex items-center gap-1.5">
                    <Crown className="h-5 w-5 text-accent" /> {t("premium.sheet.title")}
                  </h3>
                  {contextual && profileName && (
                    <p className="text-[11px] v-fg-muted truncate">
                      {t("premium.sheet.for")} <span className="font-semibold v-fg">{profileName}</span>
                    </p>
                  )}
                </div>
                <motion.button
                  onClick={() => { setPassportPick(false); onOpenChange(false); }}
                  whileTap={{ scale: 0.88 }}
                  aria-label={t("common.close")}
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
                /* ── Passport city picker — recherche prédictive mondiale ── */
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => setPassportPick(false)}
                      className="text-[11px] v-fg-muted font-medium hover:v-fg transition"
                    >
                      ← {t("common.back")}
                    </button>
                  </div>
                  <p className="font-display font-bold text-sm mb-0.5">{t("premium.passport.title")}</p>
                  <p className="text-[11px] v-fg-muted mb-3">
                    {t("premium.passport.sub")}
                  </p>

                  {/* Champ prédictif — même service que l'onboarding
                      (/api/vibe/cities), sélection stricte dans la liste. */}
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 v-fg-muted pointer-events-none z-10" />
                    <Input
                      value={passportQuery}
                      onChange={(e) => setPassportQuery(e.target.value)}
                      onFocus={() => setPassportFocused(true)}
                      onBlur={() => setTimeout(() => setPassportFocused(false), 200)}
                      placeholder={t("premium.passport.searchPlaceholder")}
                      inputMode="search"
                      aria-label={t("premium.passport.searchPlaceholder")}
                      className="pl-10 h-12 rounded-2xl v-surface-1 border-transparent ring-1 ring-(--v-divider) v-fg placeholder:v-fg-faint focus-visible:border-transparent focus-visible:ring-vibe-purple/40"
                    />
                    <AnimatePresence>
                      {passportFocused && passportQuery.trim().length >= 2 && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute z-30 mt-1.5 inset-x-0 max-h-56 overflow-y-auto scrollbar-vibe rounded-2xl v-surface-solid ring-1 ring-(--v-divider) shadow-2xl p-1.5"
                        >
                          {passportSearching ? (
                            /* Recherche en cours — rangées de squelettes */
                            <div aria-live="polite">
                              <span className="sr-only">{t("premium.passport.searching")}</span>
                              {[0, 1, 2].map((i) => (
                                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl animate-pulse">
                                  <div className="h-4 w-5 rounded-md v-surface-2 shrink-0" />
                                  <div className="h-3.5 w-2/3 rounded-md v-surface-2" />
                                </div>
                              ))}
                            </div>
                          ) : passportResults.length === 0 ? (
                            <div className="px-3 py-3 text-sm v-fg-muted flex items-center gap-2">
                              <Search className="h-3.5 w-3.5" />
                              {t("premium.passport.noCity")}
                            </div>
                          ) : (
                            passportResults.map((c) => (
                              <motion.button
                                key={`${c.countryCode}-${c.name}`}
                                whileTap={{ scale: 0.98 }}
                                disabled={busy === "passport"}
                                onMouseDown={(e) => { e.preventDefault(); pickPassportCity(c); }}
                                onClick={() => pickPassportCity(c)}
                                className="w-full text-left px-3 py-2.5 rounded-xl text-sm hover:v-surface-2 transition flex items-center gap-2.5 disabled:opacity-50"
                              >
                                <span className="text-base leading-none shrink-0" aria-hidden>
                                  {flagEmoji(c.countryCode)}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                  <span className="font-bold v-fg">{c.name}</span>{" "}
                                  <span className="text-xs v-fg-muted">
                                    {c.region ? `${c.region} · ` : ""}
                                    {countryNameLocalized(c.countryCode, lang)}
                                  </span>
                                </span>
                              </motion.button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="text-[10px] v-fg-faint mt-2 px-0.5">
                    🌍 {t("premium.passport.worldwide")}
                  </p>
                </div>
              ) : (
                <>
                  {Object.entries(grouped).map(([cat, items]) => items.length > 0 && (
                    <div key={cat} className="mb-4">
                      <p className="text-[10px] uppercase tracking-wide v-fg-muted font-semibold mb-2">
                        {cat === "swipe" ? t("premium.cat.swipe") : cat === "social" ? t("premium.cat.social") : cat === "profile" ? t("premium.cat.profile") : t("premium.cat.meta")}
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
                        {t("premium.contextual.title")}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {contextualOnly.map((action) => (
                          <ActionTile key={action.key} action={action} busy={false} dimmed onClick={() => tap(action)} />
                        ))}
                      </div>
                      <p className="text-[10px] v-fg-faint mt-2 px-1">
                        {t("premium.contextual.hint")}
                      </p>
                    </div>
                  )}

                  {/* Flow-specific actions — redirect hints */}
                  {flowHinted.length > 0 && (
                    <div className="mb-1">
                      <p className="text-[10px] uppercase tracking-wide v-fg-muted font-semibold mb-2">
                        {t("premium.flow.title")}
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
                              <span className="block text-xs font-bold">{actionLabel(t, action)}</span>
                              <span className="block text-[10px] v-fg-muted truncate">{flowHint(t, action.key)}</span>
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
        title={activeEffect ? actionLabel(t, activeEffect.action) : ""}
        message={activeEffect ? actionDesc(t, activeEffect.action) : undefined}
        buffType={activeEffect ? BUFF_ACTION_KEYS[activeEffect.action.key] : undefined}
        result={activeEffect ? <EffectResult result={activeEffect.result} /> : undefined}
        tip={activeEffect ? comboTip(t, activeEffect.action.key) : undefined}
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
  const { t } = useI18n();
  return (
    <motion.button
      onClick={onClick}
      disabled={busy}
      whileTap={{ scale: 0.95 }}
      aria-label={`${actionLabel(t, action)} — ${action.cost} Vibes${dimmed ? t("premium.tile.fromProfileSuffix") : ""}`}
      className={`relative flex flex-col items-start gap-1 rounded-2xl p-3 text-left transition disabled:opacity-50 ring-1 ${
        highlight
          ? "v-surface-2 ring-accent/40 hover:v-surface-3"
          : "v-surface-1 ring-(--v-divider) hover:v-surface-2"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      <span className="text-2xl">{action.emoji}</span>
      <span className="text-xs font-bold leading-tight flex items-center gap-1">
        {actionLabel(t, action)}
        {highlight && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" aria-hidden />}
      </span>
      <span className="text-[10px] v-fg-muted leading-tight">{actionDesc(t, action)}</span>
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
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      {result.message && (
        <div className="rounded-xl v-surface-1 ring-1 ring-white/10 px-3 py-2 text-sm text-white/80 text-center">
          {result.message}
        </div>
      )}

      {result.peek && result.peek.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">{t("premium.result.peek")}</p>
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
          <p className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold">{t("premium.result.online")}</p>
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
          <p className="text-[10px] uppercase tracking-wide text-amber-300 font-semibold">{t("premium.result.likers")}</p>
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
              {t(result.hiddenByGhost > 1 ? "premium.result.ghostVisitors.many" : "premium.result.ghostVisitors.one", { n: result.hiddenByGhost })}
            </p>
          ) : null}
        </div>
      )}

      {result.ghostTease ? (
        <div className="rounded-xl bg-vibe-gradient-soft ring-1 ring-white/10 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-white/90">{t(result.ghostTease > 1 ? "premium.result.ghostTease.many" : "premium.result.ghostTease.one", { n: result.ghostTease })}</p>
          <p className="text-[11px] text-white/70 mt-0.5">{t(result.ghostTease > 1 ? "premium.result.ghostTeaseHidden.many" : "premium.result.ghostTeaseHidden.one")}</p>
        </div>
      ) : null}

      {result.score !== undefined && (
        <div className="space-y-2">
          <div className="rounded-xl bg-gradient-to-br from-vibe-purple/20 to-vibe-pink/20 ring-1 ring-white/10 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-white/70">
              {t("premium.result.compatWith", { name: result.profileName ?? t("premium.result.thisProfile") })}
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
              <p className="text-[10px] uppercase tracking-wide text-white/70 font-semibold mb-1">{t("premium.result.aiAnalysis")}</p>
              <p className="text-[12px] text-white/85 leading-relaxed">{result.aiAnalysis}</p>
            </div>
          )}
          {result.score >= 80 && (
            <p className="text-[10px] text-amber-200/80 text-center px-2 leading-relaxed">
              {t("premium.result.goldenHeartTip")}
            </p>
          )}
        </div>
      )}

      {result.mood && (
        <div className="rounded-xl bg-gradient-to-br from-vibe-purple/20 to-vibe-pink/20 ring-1 ring-white/10 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-white/70">
            {t("premium.result.moodOf", { name: result.profileName ?? t("premium.result.today") })}
          </p>
          <p className="font-display text-2xl font-bold">{result.mood}</p>
        </div>
      )}

      {result.undoneCount !== undefined && result.undoneCount > 0 && (
        <div className="rounded-xl v-surface-1 ring-1 ring-white/10 px-3 py-2 text-sm text-white/80 text-center">
          {t(result.undoneCount > 1 ? "premium.result.undone.many" : "premium.result.undone.one", { n: result.undoneCount })}
        </div>
      )}

      {result.active && !result.message && (
        <div className="rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/30 px-3 py-2 text-sm text-emerald-300 text-center">
          ✅ {t("premium.result.activated")}
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
              {copied ? t("premium.icebreaker.copied") : t("premium.icebreaker.copy")}
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
