"use client";
// Store i18n côté client + hook useI18n().
//
// Cycle de vie de la langue :
//  1. page.tsx (serveur) résout la langue : choix explicite (cookie) →
//     langue du compte (User.lang) → dernière langue effective (cookie) →
//     Accept-Language → "fr", puis la passe via <ClientHome initialLang>.
//  2. ClientHome initialise CE store en phase de rendu (avant les enfants)
//     → zéro flash, zéro mismatch d'hydratation.
//  3. useI18n() expose { lang, setLang, t, apiErr } — tout composant
//     s'abonne et se re-rend instantanément au changement de langue.
//  4. setLang (choix explicite) écrit le cookie de choix + PATCH /me pour
//     persister sur le compte (multi-appareils).
//  5. L'abonnement au store vibe (setMe) applique la langue du compte à
//     chaque connexion/rafraîchissement, sauf choix explicite du visiteur.
import { create } from "zustand";
import {
  Lang,
  LANG_COOKIE,
  LANG_CHOICE_COOKIE,
  apiErrorText,
  isValidLang,
  translate,
} from "./core";
import { useVibe } from "../store";

type I18nState = {
  lang: Lang;
  /// Changement interne : met à jour le store + le cookie de langue effective.
  /// `choice: true` ⇒ écrit AUSSI le cookie de choix explicite.
  _apply: (l: Lang, opts: { choice?: boolean }) => void;
};

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* contexte sans cookies (iframe stricte) — le store suffit pour la session */
  }
}

function hasExplicitChoice(): boolean {
  try {
    return /(?:^|;\s*)vibe_lang_choice=/.test(document.cookie);
  } catch {
    return false;
  }
}

/// Langue initiale du store : cookie de choix → cookie effectif → "fr".
/// En SSR le store démarre à "fr" puis ClientHome applique la langue résolue
/// serveur AVANT le rendu des enfants. Sur le client, cette lecture rend le
/// store auto-résilient (rechargement à chaud du module, re-init hors
/// montage) sans jamais causer de mismatch d'hydratation.
function readInitialLang(): Lang {
  if (typeof document === "undefined") return "fr";
  try {
    const m =
      document.cookie.match(/(?:^|;\s*)vibe_lang_choice=(fr|en)(?:;|$)/) ??
      document.cookie.match(/(?:^|;\s*)vibe_lang=(fr|en)(?:;|$)/);
    return (m?.[1] as Lang) ?? "fr";
  } catch {
    return "fr";
  }
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: readInitialLang(),
  _apply: (l, opts) => {
    if (!isValidLang(l)) return;
    set({ lang: l });
    writeCookie(LANG_COOKIE, l);
    if (opts.choice) writeCookie(LANG_CHOICE_COOKIE, l);
  },
}));

/// Langue effective du compte appliquée automatiquement (login/refresh).
/// Ne fait RIEN si le visiteur a déjà fait un choix explicite de langue.
export function applyAccountLang(lang: string | null | undefined) {
  if (!isValidLang(lang)) return;
  if (hasExplicitChoice()) return;
  useI18nStore.getState()._apply(lang, {});
}

/// Changement EXPLICITE par l'utilisateur (sélecteur FR/EN) :
/// cookie de choix + persistance sur le compte si connecté.
export function setAppLang(l: Lang) {
  useI18nStore.getState()._apply(l, { choice: true });
  // Persistance compte (cross-device) — fire-and-forget, sans blocage.
  if (useVibe.getState().me) {
    fetch("/api/vibe/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: l }),
    }).catch(() => {});
  }
}

// La langue du compte s'applique à chaque changement de session utilisateur
// (login, register, hydratation /me) tant qu'aucun choix explicite n'existe.
useVibe.subscribe((state, prev) => {
  if (state.me !== prev.me && state.me?.lang) applyAccountLang(state.me.lang);
});

/// Hook principal — s'utilise dans tout composant client :
///   const { t, apiErr, lang, setLang } = useI18n();
export function useI18n() {
  const lang = useI18nStore((s) => s.lang);
  return {
    lang,
    setLang: setAppLang,
    t: (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    /// Traduit un message d'erreur renvoyé par une API (français serveur).
    apiErr: (message?: string | null) => apiErrorText(lang, message),
  };
}
