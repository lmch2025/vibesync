"use client";
// i18n client — provider React + hook useI18n().
//
// ARCHITECTURE (anti-flash, anti-mismatch) :
//  1. page.tsx (serveur) résout la langue de la requête : choix explicite
//     (cookie) → langue du compte (User.lang) → dernière langue effective
//     (cookie) → Accept-Language → "fr".
//  2. La langue est passée en PROPS à <I18nProvider initialLang={…}> dans
//     ClientHome. Un React Context est la SEULE façon d'obtenir un état
//     initial PAR REQUÊTE rendu côté serveur (un store zustand est un
//     singleton de module : son getServerSnapshot vaut toujours l'état
//     initial du module — ici "fr" — et provoquerait un corps de page
//     français + flash de correction pour les visiteurs anglophones).
//  3. SSR et hydratation utilisent la MÊME prop → zéro flash, zéro
//     mismatch, et deux visiteurs simultanés (fr + en) ne se battent pas.
//
// Cycle de vie de la langue :
//  - setLang (choix explicite, sélecteur FR/EN) → cookies (vibe_lang +
//    vibe_lang_choice) + PATCH /me → suit le compte sur tous ses appareils.
//  - Langue du compte (login/register/refresh) : appliquée automatiquement
//    SAUF si le visiteur a fait un choix explicite (cookie de choix).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,

  useState,
} from "react";
import {
  Lang,
  LANG_COOKIE,
  LANG_CHOICE_COOKIE,
  apiErrorText,
  isValidLang,
  translate,
} from "./core";
import { useVibe } from "../store";

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /// Traduit un message d'erreur renvoyé par une API (français serveur).
  apiErr: (message?: string | null) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* contexte sans cookies (iframe stricte) — la session en cours suffit */
  }
}

function hasExplicitChoice(): boolean {
  try {
    return /(?:^|;\s*)vibe_lang_choice=/.test(document.cookie);
  } catch {
    return false;
  }
}

/// Langue lue depuis les cookies côté client (choix explicite puis langue
/// effective). Sert de repli quand la prop serveur est absente.
function readCookieLang(): Lang | null {
  try {
    const m =
      document.cookie.match(/(?:^|;\s*)vibe_lang_choice=(fr|en)(?:;|$)/) ??
      document.cookie.match(/(?:^|;\s*)vibe_lang=(fr|en)(?:;|$)/);
    return (m?.[1] as Lang) ?? null;
  } catch {
    return null;
  }
}

/// Persiste le choix explicite sur le compte (cross-appareils) — fire-and-forget.
function patchAccountLang(l: Lang) {
  if (useVibe.getState().me) {
    fetch("/api/vibe/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: l }),
    }).catch(() => {});
  }
}

/// Fallback hors provider (ne devrait pas arriver — ClientHome enveloppe
/// toute l'app) : rendu français statique, sans crash.
const FALLBACK: I18nContextValue = {
  lang: "fr",
  setLang: () => {},
  t: (key, params) => translate("fr", key, params),
  apiErr: (message) => apiErrorText("fr", message),
};

export function I18nProvider({
  initialLang,
  children,
}: {
  initialLang?: Lang;
  children: React.ReactNode;
}) {
  // SSR et premier rendu client utilisent la MÊME valeur (prop serveur) ;
  // repli : cookie client, sinon "fr".
  const [lang, setLangState] = useState<Lang>(() => initialLang ?? readCookieLang() ?? "fr");

  /// Choix EXPLICITE (sélecteur FR/EN) : store + cookies + compte.
  const setLang = useCallback((l: Lang) => {
    if (!isValidLang(l)) return;
    setLangState(l);
    writeCookie(LANG_COOKIE, l);
    writeCookie(LANG_CHOICE_COOKIE, l);
    patchAccountLang(l);
  }, []);

  /// Langue du compte (login/register/hydratation de session) : appliquée
  /// automatiquement tant que le visiteur n'a pas choisi explicitement.
  // (useEffect plutôt qu'au rendu : le setMe de ClientHome arrive en phase
  // de rendu — abonné dès le montage, on couvre aussi les /me asynchrones.)
  useEffect(() => {
    const applyAccount = (accountLang: string | null | undefined) => {
      if (!isValidLang(accountLang)) return;
      if (hasExplicitChoice()) return;
      // setLangState avec la même valeur est un no-op React ; l'écriture du
      // cookie est idempotente — pas besoin de déduplication par ref.
      setLangState(accountLang as Lang);
      writeCookie(LANG_COOKIE, accountLang);
    };
    // Session déjà hydratée au montage (render-phase setState de ClientHome
    // — aucun événement ne sera émis pour elle) :
    const me = useVibe.getState().me;
    if (me?.lang) applyAccount(me.lang);
    // Puis chaque changement de session (login, register, /me) :
    return useVibe.subscribe((state, prev) => {
      if (state.me !== prev.me && state.me?.lang) applyAccount(state.me.lang);
    });
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
      apiErr: (message?: string | null) => apiErrorText(lang, message),
    }),
    [lang, setLang],
  );

  // Synchronise l'attribut <html lang> (SEO/accessibilité) — vit ICI (dans
  // le provider) : un consommateur situé au-dessus du provider recevrait le
  // repli statique et ne réagirait jamais aux changements de langue.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/// Hook principal — tout composant client :
///   const { t, apiErr, lang, setLang } = useI18n();
export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? FALLBACK;
}
