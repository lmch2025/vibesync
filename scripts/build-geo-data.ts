// One-shot preprocessing: country-state-city dataset (dr5hn data, npm package
// `country-state-city`) → compact committed data files under src/lib/vibe/geo/data.
//   • countries.json — [{ i: ISO2, n: english name, p: phone code digits }] (~250)
//   • cities.json    — [[name, regionName, ISO2, lat, lng], ...] (~148k, deduped,
//                      coords rounded to 4 decimals ≈ 11 m)
// NOTE: the package's city.json is ALREADY compact rows
// [name, ISO2, stateCode, lat, lng] — we pre-resolve stateCode → region name
// so the runtime search needs a single file. Run: bun scripts/build-geo-data.ts
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(__dirname, "../node_modules/country-state-city/lib/assets");
const OUT = resolve(__dirname, "../src/lib/vibe/geo/data");
mkdirSync(OUT, { recursive: true });

type RawCountry = { name: string; isoCode: string; phonecode: string };
type RawState = { name: string; isoCode: string; countryCode: string };
type RawCityRow = [string, string, string, string, string]; // name, cc, stateCode, lat, lng

const countries: RawCountry[] = JSON.parse(readFileSync(resolve(SRC, "country.json"), "utf8"));
const states: RawState[] = JSON.parse(readFileSync(resolve(SRC, "state.json"), "utf8"));
const cities: RawCityRow[] = JSON.parse(readFileSync(resolve(SRC, "city.json"), "utf8"));

// ── Countries: keep the ones with a usable dial code, sorted by ISO. ──────
const outCountries = countries
  .filter((c) => c.isoCode && c.phonecode)
  .map((c) => ({ i: c.isoCode, n: c.name, p: c.phonecode.replace(/[^0-9]/g, "") }))
  .filter((c) => c.p.length > 0)
  .sort((a, b) => a.i.localeCompare(b.i));
writeFileSync(resolve(OUT, "countries.json"), JSON.stringify(outCountries));

// ── States: map `${cc}-${stateCode}` → region display name. ───────────────
const stateNames = new Map<string, string>();
for (const s of states) {
  if (s.countryCode && s.isoCode && s.name) stateNames.set(`${s.countryCode}-${s.isoCode}`, s.name);
}

// ── Cities: compact rows, deduped on name+region+country. ─────────────────
const seen = new Set<string>();
const outCities: [string, string, string, number, number][] = [];
let dupes = 0;
for (const c of cities) {
  const [name, cc, sc, latStr, lngStr] = c;
  if (!name || !cc) continue;
  const region = stateNames.get(`${cc}-${sc}`) ?? "";
  const key = `${name}∣${region}∣${cc}`;
  if (seen.has(key)) {
    dupes++;
    continue;
  }
  seen.add(key);
  const lat = Math.round(parseFloat(latStr) * 1e4) / 1e4;
  const lng = Math.round(parseFloat(lngStr) * 1e4) / 1e4;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  outCities.push([name, region, cc, lat, lng]);
}
// Stable order: country, then name — friendlier to diffs and caches.
outCities.sort((a, b) => a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]));
writeFileSync(resolve(OUT, "cities.json"), JSON.stringify(outCities));

const mb = (p: string) => `${(statSync(p).size / 1e6).toFixed(1)} MB`;
console.log(`countries.json: ${outCountries.length} entries (${mb(resolve(OUT, "countries.json"))})`);
console.log(`cities.json: ${outCities.length} entries, ${dupes} dupes removed (${mb(resolve(OUT, "cities.json"))})`);
