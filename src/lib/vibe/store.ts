"use client";
// Global UI store: which "experience" the visitor is in (landing / app / admin),
// the current user snapshot, currency, and rates. Kept lightweight on purpose.
import { create } from "zustand";

export type View = "landing" | "app" | "admin";

export type MeUser = {
  id: string;
  phone: string;
  name?: string | null;
  role: string;
  currency: string;
  lang?: string | null; // langue UI du compte ("fr" | "en")
  country?: string | null;
  gems: number;
  freeGems: number;
  walletEurCents: number;
  verified: boolean;
  onboardingComplete: boolean;
  profile: {
    id: string;
    displayName: string;
    age: number;
    city: string;
    bio: string;
    videoUrl: string;
    posterUrl: string;
    vibeQuestion: string;
    vibeAnswer: string;
    gender?: string | null;
    lookingFor?: string | null;
    relationshipType?: string | null;
    // Slots vidéo 2 et 3 (renvoyés par /api/vibe/me — évite les casts `as any`)
    videoUrl2?: string;
    posterUrl2?: string;
    videoUrl3?: string;
    posterUrl3?: string;
    // Photos de profil (max 5, set compacté — /api/vibe/me renvoie photos[])
    photos?: string[];
  } | null;
};

type State = {
  view: View;
  setView: (v: View) => void;

  me: MeUser | null;
  setMe: (m: MeUser | null) => void;
  patchMe: (p: Partial<MeUser>) => void;

  rates: Record<string, number>;
  setRates: (r: Record<string, number>) => void;

  // currency override (independent of server user preference for anonymous browsing)
  activeCurrency: string;
  setActiveCurrency: (c: string) => void;

  hydrated: boolean;
  setHydrated: (b: boolean) => void;

  /// Insufficient-Vibes redirect: when a user tries a premium action (or a
  /// gift) without enough balance, the app navigates straight to the Vibes
  /// purchase page (Boutique tab). `pendingProceed` is kept so the ORIGINAL
  /// action resumes automatically after a successful pack purchase.
  insufficient: {
    needed: number;
    have: number;
    actionLabel: string;
    pendingProceed: (() => void) | null;
  } | null;
  /// Store the pending action and ask the app shell to navigate to the
  /// purchase page (dispatches `tiluu:go-buy-vibes` with the deficit info).
  redirectForVibes: (needed: number, have: number, actionLabel: string, proceed: () => void) => void;
  /// Consume + clear the pending action (called by the wallet after a
  /// successful purchase) — returns the callback to re-run, or null.
  takePendingVibes: () => (() => void) | null;
  /// Drop the pending action without running it (e.g. user navigated away
  /// or started something else).
  clearInsufficient: () => void;
  /// Run a gated premium action: if balance is enough, run `proceed`;
  /// otherwise redirect to the Vibes purchase page with a pending callback.
  requireVibes: (cost: number, actionLabel: string, proceed: () => void) => void;
};

export const useVibe = create<State>((set, get) => ({
  view: "landing",
  setView: (view) => set({ view }),

  me: null,
  setMe: (me) => set({ me, activeCurrency: me?.currency ?? useVibe.getState().activeCurrency }),
  patchMe: (p) => set((s) => (s.me ? { me: { ...s.me, ...p } } : {})),

  rates: {},
  setRates: (rates) => set({ rates }),

  activeCurrency: "XAF",
  setActiveCurrency: (activeCurrency) => set({ activeCurrency }),

  hydrated: false,
  setHydrated: (hydrated) => set({ hydrated }),

  insufficient: null,
  redirectForVibes: (needed, have, actionLabel, proceed) => {
    set({
      insufficient: { needed, have, actionLabel, pendingProceed: proceed },
    });
    // The app shell (AppDemo) listens and navigates to the purchase page.
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("tiluu:go-buy-vibes", { detail: { needed, have, actionLabel } }),
      );
    }
  },
  takePendingVibes: () => {
    const pending = get().insufficient?.pendingProceed ?? null;
    if (get().insufficient) set({ insufficient: null });
    return pending;
  },
  clearInsufficient: () => set({ insufficient: null }),
  requireVibes: (cost, actionLabel, proceed) => {
    const me = get().me;
    const have = me?.gems ?? 0;
    if (have >= cost) {
      proceed();
    } else {
      get().redirectForVibes(cost, have, actionLabel, proceed);
    }
  },
}));
