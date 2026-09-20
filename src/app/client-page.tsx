"use client";

import { useEffect, useRef, useState } from "react";
import { useVibe, View } from "@/lib/vibe/store";
import { I18nProvider } from "@/lib/vibe/i18n";
import type { Lang } from "@/lib/vibe/i18n/core";
import { ImmersiveLanding } from "@/components/vibe/landing/immersive-landing";
import { AppDemo } from "@/components/vibe/app/app-demo";
import AdminDashboard from "@/components/vibe/admin/admin-dashboard";
import { toast } from "sonner";

export function ClientHome({ initialView, initialUser, initialRates, initialLandingVideo, initialLang }: { initialView: View, initialUser?: any, initialRates?: any, initialLandingVideo?: string, initialLang?: Lang }) {
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
    // NOTE : la langue N'EST PAS initialisée ici — un store zustand est un
    // singleton de module dont le getServerSnapshot vaut toujours l'état
    // initial (« fr ») : le corps SSR serait resté français avec flash de
    // correction. La langue vit dans <I18nProvider initialLang={…}> (React
    // Context → état initial PAR REQUÊTE, SSR correct, zéro flash).
  }

  // NOTE : la synchro de l'attribut <html lang> vit dans <I18nProvider> —
  // ce composant étant AU-DESSUS du provider qu'il rend, un useI18n() ici
  // recevrait le repli statique et ne réagirait jamais aux changements.

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
    <I18nProvider initialLang={initialLang}>
      <div className="min-h-dvh flex flex-col v-bg-page">
        {activeView === "landing" && (
          <ImmersiveLanding videoUrl={initialLandingVideo} onEnterApp={() => setView("app")} />
        )}
        {activeView === "app" && <AppDemo onExit={() => setView("landing")} />}
        {activeView === "admin" && <AdminDashboard onExit={() => setView("app")} />}
      </div>
    </I18nProvider>
  );
}
