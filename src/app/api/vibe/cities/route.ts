// GET /api/vibe/cities?q=<query>&cc=<ISO2>&limit=<n>
// Recherche prédictive MONDIALE (148 038 villes/districts — dataset dr5hn).
// Seule une sélection dans les propositions est valide côté client ; ce
// endpoint sert l'autocomplétion (onboarding, Passport…).
//   • q      : début de nom de ville (insensible casse/accents)
//   • cc     : code pays ISO optionnel → ses villes sont favorisées au
//              classement (défaut : en-tête x-vercel-ip-country)
//   • limit  : 8 par défaut, plafonné à 20
// Réponse : { cities: [{ name, region, countryCode, country, lat, lng }] }
//   — `country` est le nom anglais (repli d'affichage) ; le client localise
//     via Intl.DisplayNames (FR/EN) avec le countryCode.
import { NextResponse } from "next/server";
import { searchGeoCities } from "@/lib/vibe/geo/city-search";
import { getCountry } from "@/lib/vibe/geo/countries";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 8;
  const boost =
    url.searchParams.get("cc") ||
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("x-country") ||
    null;

  const cities = searchGeoCities(q, { limit, boostCountry: boost }).map((c) => ({
    name: c.name,
    region: c.region,
    countryCode: c.countryCode,
    country: getCountry(c.countryCode)?.name ?? c.countryCode,
    lat: c.lat,
    lng: c.lng,
  }));
  return NextResponse.json({ cities });
}
