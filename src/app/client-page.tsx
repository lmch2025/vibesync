"use client";

import { useEffect, useRef, useState } from "react";
import { useVibe, View } from "@/lib/vibe/store";
import { ImmersiveLanding } from "@/components/vibe/landing/immersive-landing";
import { AppDemo } from "@/components/vibe/app/app-demo";
import AdminDashboard from "@/components/vibe/admin/admin-dashboard";
import { toast } from "sonner";

// Branded splash shown during the initial session-hydration fetch.
// Prevents ANY flash of the landing page for authenticated users.
function AuthSplash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="relative flex items-center justify-center">
        {/* Outer glow ring */}
        <span className="absolute h-20 w-20 rounded-full bg-violet-500/20 animate-ping" />
        {/* Logo mark */}
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/40">
          <span className="text-white text-2xl font-bold select-none">VS</span>
        </div>
      </div>
      <p className="text-white/40 text-sm tracking-widest uppercase animate-pulse">Connexion en cours…</p>
    </div>
  );
}

export function ClientHome({ initialView, initialUser, initialRates }: { initialView: View, initialUser?: any, initialRates?: any }) {
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

  async function enterAdmin() {
    try {
      const res = await fetch("/api/vibe/auth/demo-admin", { method: "POST" });
      const data = await res.json();
      if (data.user) {
        setMe(data.user);
        useVibe.getState().setRates(data.rates ?? {});
      }
      setView("admin");
      toast.success("Connecté en admin (démo)");
    } catch {
      setView("admin");
    }
  }

  const activeView = view;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {activeView === "landing" && (
        <ImmersiveLanding onEnterApp={() => setView("app")} onEnterAdmin={enterAdmin} />
      )}
      {activeView === "app" && <AppDemo onExit={() => setView("landing")} />}
      {activeView === "admin" && <AdminDashboard onExit={() => setView("landing")} />}
    </div>
  );
}
