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

  /// Insufficient-Vibes modal: shown when a user tries a premium action
  /// without enough balance. `pendingProceed` runs after a successful purchase
  /// (so the action completes automatically once refilled).
  insufficient: {
    open: boolean;
    needed: number;
    have: number;
    actionLabel: string;
    pendingProceed: (() => void) | null;
  } | null;
  openInsufficient: (needed: number, have: number, actionLabel: string, proceed: () => void) => void;
  closeInsufficient: () => void;
  /// Run a gated premium action: if balance is enough, run `proceed`;
  /// otherwise open the insufficient modal with a pending callback.
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
  openInsufficient: (needed, have, actionLabel, proceed) =>
    set({
      insufficient: { open: true, needed, have, actionLabel, pendingProceed: proceed },
    }),
  closeInsufficient: () =>
    set((s) => (s.insufficient ? { insufficient: { ...s.insufficient, open: false } } : {})),
  requireVibes: (cost, actionLabel, proceed) => {
    const me = get().me;
    const have = me?.gems ?? 0;
    if (have >= cost) {
      proceed();
    } else {
      get().openInsufficient(cost, have, actionLabel, proceed);
    }
  },
}));
