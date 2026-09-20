// i18n core — logique PURE partagée client/serveur (aucun import React).
// La langue de l'app : "fr" | "en". Toute la détection et la résolution de
// clés passe par ce module ; le store client (i18n.ts) et les helpers
// serveur (server.ts) s'appuient dessus.
import { DICTS } from "./dictionaries";
import { API_ERROR_KEYS, API_ERROR_PATTERNS } from "./api-errors";

export type Lang = "fr" | "en";
export const LANGS: Lang[] = ["fr", "en"];

/// Cookie « langue effective » — celle avec laquelle le serveur rend la page.
/// Écrit par le client à chaque résolution (auto-détection OU compte OU choix).
export const LANG_COOKIE = "vibe_lang";

/// Cookie « choix explicite » — écrit UNIQUEMENT quand l'utilisateur touche
/// le sélecteur de langue. C'est la priorité maximale (il écrase la langue
/// du compte et celle du navigateur).
export const LANG_CHOICE_COOKIE = "vibe_lang_choice";

export function isValidLang(v: unknown): v is Lang {
  return v === "fr" || v === "en";
}

/// Détection navigateur depuis l'en-tête Accept-Language (première visite).
/// fr* → fr, en* → en, sinon fr (marché principal francophone — Cameroun).
export function detectLangFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return "fr";
  const first = header.split(",")[0]?.trim() ?? "";
  const lang = first.split(";")[0]?.trim().toLowerCase() ?? "";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("en")) return "en";
  return "fr";
}

/// Traduction d'une clé "ns.clé" avec interpolation {{param}}.
/// Ordre de repli : dictionnaire de la langue → dictionnaire fr → la clé
/// elle-même (visible en dev, jamais un crash en production).
export function translate(
  lang: Lang,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = DICTS[lang] ?? DICTS.fr;
  let value = dict[key] ?? DICTS.fr[key];
  if (value === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] clé manquante: "${key}" (${lang})`);
    }
    return key;
  }
  if (params) {
    value = value.replace(/\{\{(\w+)\}\}/g, (_, p: string) =>
      params[p] !== undefined ? String(params[p]) : `{{${p}}}`,
    );
  }
  return value;
}

/// Traduit un message d'erreur renvoyé par une API (stocké en français côté
/// serveur). Correspondance exacte d'abord, puis motifs dynamiques, sinon le
/// message original est renvoyé tel quel (repli français acceptable).
export function apiErrorText(lang: Lang, message: string | null | undefined): string {
  if (!message) return "";
  const key = API_ERROR_KEYS[message];
  if (key) return translate(lang, key);
  for (const { pattern, key: k, params } of API_ERROR_PATTERNS) {
    const m = message.match(pattern);
    if (m) return translate(lang, k, params(m));
  }
  return message;
}
