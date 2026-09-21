// Recherche de villes MONDIALES côté serveur — 148 038 villes et districts
// (dataset dr5hn, prétraité par scripts/build-geo-data.ts). Ce module est
// réservé au serveur (fichier de données de 7,7 Mo) : les clients passent par
// GET /api/vibe/cities.
//
// Index paresseux + recherche linéaire scorée (~5-15 ms par requête sur
// serverless — aucun besoin de trie pour ce volume). Normalisation
// insensible aux accents/casse pour que « yaounde » trouve « Yaoundé ».

import citiesRaw from "./data/cities.json";

export type GeoCity = {
  name: string; // "Yaoundé"
  region: string; // "Centre" (région/état/département — "" si inconnu)
  countryCode: string; // "CM"
  lat: number;
  lng: number;
};

type IndexedCity = GeoCity & { norm: string };

type RawCityRow = [string, string, string, number, number];

let INDEX: IndexedCity[] | null = null;

function getIndex(): IndexedCity[] {
  if (INDEX) return INDEX;
  INDEX = (citiesRaw as RawCityRow[]).map((r) => ({
    norm: normalize(r[0]),
    name: r[0],
    region: r[1],
    countryCode: r[2],
    lat: r[3],
    lng: r[4],
  }));
  return INDEX;
}

/// Normalisation : NFD, suppression des diacritiques, casse basse, apostrophes
/// typographiques ramenées à l'apostrophe droite (les variantes du dataset
/// mélangeent les deux formes).
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .toLowerCase()
    .trim();
}

export type SearchOptions = {
  limit?: number;
  /// Code pays ISO (ex. "CM") dont les villes sont favorisées au classement.
  boostCountry?: string | null;
};

/// Recherche prédictive : correspondance exacte > préfixe > début de mot >
/// sous-chaîne ; bonus pays boosté ; égalité → nom le plus court d'abord
/// (les grandes villes ont des noms courts). Dédupliqué par nom+pays.
export function searchGeoCities(query: string, opts: SearchOptions = {}): GeoCity[] {
  const q = normalize(query);
  if (q.length < 1) return [];
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 20);
  const boost = opts.boostCountry ? opts.boostCountry.toUpperCase() : null;
  const idx = getIndex();

  type Scored = { s: number; c: IndexedCity };
  const scored: Scored[] = [];
  for (const e of idx) {
    let s: number;
    if (e.norm === q) s = 100;
    else if (e.norm.startsWith(q)) s = 60;
    else if (e.norm.startsWith(`${q} `)) s = 58;
    else {
      const w = e.norm.indexOf(` ${q}`);
      if (w === 0) s = 55;
      else if (w > 0) s = 40;
      else if (e.norm.includes(q)) s = 20;
      else continue;
    }
    if (boost && e.countryCode === boost) s += 18;
    s -= Math.min(e.name.length, 40) * 0.05; // noms courts = villes notables
    scored.push({ s, c: e });
  }
  scored.sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name) || a.c.region.localeCompare(b.c.region));

  const out: GeoCity[] = [];
  const seen = new Set<string>();
  for (const { c } of scored) {
    const key = `${c.name}∣${c.countryCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: c.name, region: c.region, countryCode: c.countryCode, lat: c.lat, lng: c.lng });
    if (out.length >= limit) break;
  }
  return out;
}

/// Validation serveur d'une ville sélectionnée (onboarding, passport…) :
/// retrouve l'entrée exacte par nom (insensible aux accents) + pays. Si
/// plusieurs villes homonymes existent dans le pays, la plus proche des
/// coordonnées fournies gagne ; sinon la première. Retourne null si la
/// combinaison nom+pays n'existe pas dans le dataset mondial.
export function findGeoCity(name: string, countryCode: string, lat?: number, lng?: number): GeoCity | null {
  const q = normalize(name);
  if (!q || !countryCode) return null;
  const cc = countryCode.toUpperCase();
  const idx = getIndex();
  let candidates: IndexedCity[] = [];
  for (const e of idx) {
    if (e.countryCode !== cc) continue;
    if (e.norm !== q) continue;
    candidates.push(e);
  }
  if (candidates.length === 0) return null;
  if (candidates.length > 1 && typeof lat === "number" && typeof lng === "number") {
    candidates.sort(
      (a, b) =>
        (a.lat - lat) ** 2 + (a.lng - lng) ** 2 - ((b.lat - lat) ** 2 + (b.lng - lng) ** 2),
    );
  }
  const c = candidates[0];
  return { name: c.name, region: c.region, countryCode: c.countryCode, lat: c.lat, lng: c.lng };
}
