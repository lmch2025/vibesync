// Pays du monde — client-safe (légé : ~10 Ko de données).
// Source : dataset dr5hn (country-state-city), prétraité par scripts/build-geo-data.ts.
// Noms localisés via Intl.DisplayNames (ICU natif Node ≥18 et navigateurs
// modernes) — zéro donnée de traduction embarquée. Le nom anglais du dataset
// sert de repli.
//
// Contraignances volontaires :
//  • ~250 pays avec indicatif téléphonique (dial) — le sélecteur d'authentification.
//  • Ordre : pays prioritaires pour l'audience de l'app d'abord (voyageurs
//    francophones + Afrique centrale/ouest), puis le reste par nom anglais.
//  • `dial` est unique PAR PAYS mais plusieurs pays partagent un même indicatif
//    (+1, +7…) — la sélection se fait toujours par ISO.

import countriesRaw from "./data/countries.json";

export type GeoCountry = {
  iso: string; // ISO 3166-1 alpha-2
  name: string; // nom anglais (repli d'affichage)
  dial: string; // "+237"
};

type RawCountry = { i: string; n: string; p: string };

const ALL: GeoCountry[] = (countriesRaw as RawCountry[]).map((c) => ({
  iso: c.i,
  name: c.n,
  dial: `+${c.p}`,
}));

/// Pays d'abord dans le sélecteur (audience de l'app — francophonie + Afrique).
const PRIORITY_ISO = [
  "FR", "CM", "CI", "SN", "BE", "CH", "CA", "MA", "DZ", "TN", "LU", "MC",
  "GA", "CG", "CD", "ML", "BF", "BJ", "TG", "NE", "TD", "MG", "GN", "US",
  "GB", "DE", "ES", "IT", "PT", "NL",
];

const byPriority = new Map(PRIORITY_ISO.map((iso, i) => [iso, i]));

/// Liste complète ordonnée : prioritaires puis reste alphabétique.
export const GEO_COUNTRIES: GeoCountry[] = [...ALL].sort((a, b) => {
  const pa = byPriority.get(a.iso) ?? 999;
  const pb = byPriority.get(b.iso) ?? 999;
  if (pa !== pb) return pa - pb;
  if (pa === 999) return a.name.localeCompare(b.name);
  return 0;
});

const byIso = new Map(ALL.map((c) => [c.iso, c]));

export function getCountry(iso: string | null | undefined): GeoCountry | null {
  if (!iso) return null;
  return byIso.get(iso.toUpperCase()) ?? null;
}

/// Drapeau emoji dérivé de l'ISO (aucune donnée stockée nécessaire).
export function flagEmoji(iso: string): string {
  return String.fromCodePoint(
    ...iso
      .toUpperCase()
      .split("")
      .map((ch) => 0x1f1e6 + (ch.charCodeAt(0) - 65)),
  );
}

const displayNames = new Map<string, Intl.DisplayNames>();
function dn(lang: string): Intl.DisplayNames | null {
  try {
    let d = displayNames.get(lang);
    if (!d) {
      d = new Intl.DisplayNames([lang], { type: "region" });
      displayNames.set(lang, d);
    }
    return d;
  } catch {
    return null; // environnement sans ICU complet
  }
}

/// Nom du pays dans la langue de l'app ("fr" | "en"…). Repli : nom anglais
/// du dataset, puis l'ISO brut — JAMAIS d'échec silencieux différent.
export function countryNameLocalized(iso: string, lang: string): string {
  const c = byIso.get(iso.toUpperCase());
  const fallback = c?.name ?? iso;
  try {
    const d = dn(lang === "en" ? "en" : "fr");
    const n = d?.of(iso.toUpperCase());
    if (n && n !== iso.toUpperCase()) return n;
  } catch {
    /* repli */
  }
  return fallback;
}

/// Nom + drapeau, format court pour les libellés ("🇨🇲 Cameroun").
export function countryLabel(iso: string, lang: string): string {
  return `${flagEmoji(iso)} ${countryNameLocalized(iso, lang)}`;
}
