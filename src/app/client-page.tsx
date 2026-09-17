"use client";

import { useEffect, useRef, useState } from "react";
import { useVibe, View } from "@/lib/vibe/store";
import { ImmersiveLanding } from "@/components/vibe/landing/immersive-landing";
import { AppDemo } from "@/components/vibe/app/app-demo";
import AdminDashboard from "@/components/vibe/admin/admin-dashboard";
import { toast } from "sonner";

// Branded splash shown during the initial session-hydration fetch.
// Prevents ANY flash of the landing page for authenticated users.
// Funnel pré-app : ambiance immersif sombre permanente (classe .immersive),
// quel que soit le thème choisi par l'utilisateur dans l'app.
function AuthSplash() {
  return (
    <div className="immersive min-h-dvh flex flex-col items-center justify-center v-bg-page gap-4">
      <div className="relative flex items-center justify-center">
        {/* Outer glow ring */}
        <span className="absolute h-20 w-20 rounded-full bg-[#9B51E0]/30 animate-ping" />
        {/* Logo mark */}
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/40">
          <span className="text-white text-2xl font-bold select-none">VS</span>
        </div>
      </div>
      <p className="text-white/70 text-sm tracking-widest uppercase animate-pulse">Connexion en cours…</p>
    </div>
  );
}

export function ClientHome({ initialView, initialUser, initialRates, initialLandingVideo }: { initialView: View, initialUser?: any, initialRates?: any, initialLandingVideo?: string }) {
  const view = useVibe((s) => s.view);
  const setView = useVibe((s) => s.setView);
  const setMe = useVibe((s) => s.setMe);

  // Pattern « init once » conforme à react-hooks/refs : ref initialisée à null
  // et testée avec == null (accès ref pendant le rendu autorisé par la règle).
  const storeInitialized = useRef<boolean | null>(null);
  if (storeInitialized.current == null) {
    storeInitialized.current = true;
    useVibe.setState({ view: initialView });
    if (initialUser) {
      useVibe.setState({ me: initialUser });
    }
    if (initialRates) {
      useVibe.setState({ rates: initialRates });
    }
  }

  useEffect(() => {
    fetch("/api/vibe/detect")
      .then((r) => r.json())
      .then((d) => {
        if (d.currency) useVibe.getState().setActiveCurrency(d.currency);
      })
      .catch(() => {});
    fetch("/api/vibe/rates")
      .then((r) => r.json())
      .then((d) => useVibe.getState().setRates(d.rates ?? {}))
      .catch(() => {});
  }, []);

  // SESSION SAFETY NET — guarantees that an authenticated user NEVER falls
  // back to the landing page on refresh. The normal flow is the server-side
  // cookie check in page.tsx (initialView="app"), but certain contexts can
  // serve a stale/cached landing HTML (edge cache, iframe reload timing…).
  // This background probe re-hydrates the session from the cookie if one
  // exists, silently switching to the app. No visual change when logged out.
  useEffect(() => {
    if (useVibe.getState().view !== "landing") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vibe/me", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.user) {
          setMe(data.user);
          useVibe.getState().setRates(data.rates ?? {});
          // Only override the view if we're STILL on the landing (the user may
          // have clicked "Connexion" and be mid-auth-flow by now). Admins too
          // resume into the app — the admin panel opens from the profile tab.
          if (useVibe.getState().view === "landing") {
            useVibe.getState().setView("app");
          }
        }
      } catch {
        /* ignore — offline or no session */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setMe]);

  // Admin access is EXCLUSIVELY via the profile tab (role === "admin").
  // The public "Admin" landing button and the demo-admin shortcut were
  // removed — see immersive-landing.tsx and the deleted demo-admin route.

  const activeView = view;

  return (
    <div className="min-h-dvh flex flex-col v-bg-page">
      {activeView === "landing" && (
        <ImmersiveLanding videoUrl={initialLandingVideo} onEnterApp={() => setView("app")} />
      )}
      {activeView === "app" && <AppDemo onExit={() => setView("landing")} />}
      {activeView === "admin" && <AdminDashboard onExit={() => setView("app")} />}
    </div>
  );
}
