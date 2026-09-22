/**
 * VibeSync — vague 2 : générateur de masse + vérification RDAP Verisign.
 *
 * La vague 1 (248 candidats "évidents") est à 100% prise : tout l'espace
 * prononçable classique des 5 lettres .com est squatté par les domainers.
 * Stratégie vague 2 : cibler les niches moins squattées —
 *   • voyelles doublées (zuuma, naavi…)          [motifs CVVCV / CVCVV]
 *   • attaques consonantiques (krilo, svila…)    [motif CCVCV]
 *   • lettres rares v/z/w/j/k/x/y dans les motifs classiques
 *   • codas sonores (-l,-r,-m,-n,-v…)
 *
 * Usage : bun run branding/naming/check-batch.ts [nombre-a-generer]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const DIR = new URL(".", import.meta.url).pathname;
const WAVE2_FILE = DIR + "wave2.txt";
const RESULTS_FILE = DIR + "results.json";
const RESULTS_W1_FILE = DIR + "results.json"; // fusion dans le même fichier
const AVAILABLE_FILE = DIR + "available.txt";

const CONCURRENCY = 6;
const TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 5;
const POLITENESS_MS = 70;
const GENERATE_COUNT = Number(process.argv[2] ?? "3000");

type Status = "available" | "taken" | "error";

// ── PRNG déterministe (mulberry32) ─────────────────────────────────────────
let seed = 20260921;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

// ── Pools de lettres (biaisées vers les sons doux/mémorables) ──────────────
const ONSETS = ["b", "d", "g", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z", "f", "h"];
const CODAS = ["l", "r", "m", "n", "v", "k", "s", "t", "d", "g", "z", "w"];
const VOWELS = ["a", "e", "i", "o", "u"];
const DOUBLES = ["aa", "ee", "ii", "oo", "uu"];
const CLUSTERS = [
  "br", "cr", "dr", "fr", "gr", "kr", "pr", "tr", "vr",
  "bl", "cl", "fl", "gl", "kl", "pl", "sl", "vl",
  "sv", "zv", "sh", "ch", "th", "sn", "sm", "sp", "st", "sw", "tw", "zw", "sk",
];
const RARE = new Set(["v", "z", "w", "j", "k", "x", "y", "q"]);
const CODA_PAIRS = ["lv", "rv", "nv", "mv", "lk", "rk", "nt", "nd", "ng", "mp"];

// ── Modèles de génération ───────────────────────────────────────────────────
const TEMPLATES: Array<() => string> = [
  // 1. CVVCV — zuuma, naavi, vooma
  () => pick(ONSETS) + pick(DOUBLES) + pick(CODAS) + pick(VOWELS),
  // 2. CVCVV — zuraa, lavii
  () => pick(ONSETS) + pick(VOWELS) + pick(CODAS) + pick(DOUBLES),
  // 3. CCVCV — krilo, svila
  () => pick(CLUSTERS) + pick(VOWELS) + pick(CODAS) + pick(VOWELS),
  // 4. VCVCV — uvida
  () => pick(VOWELS) + pick(ONSETS) + pick(VOWELS) + pick(CODAS) + pick(VOWELS),
  // 5. CVCVC avec ≥1 consonne rare — vylka, zenko
  () => {
    for (let i = 0; i < 50; i++) {
      const c1 = pick(ONSETS), c2 = pick(ONSETS), c3 = pick(CODAS);
      if (RARE.has(c1) || RARE.has(c2) || RARE.has(c3))
        return c1 + pick(VOWELS) + c2 + pick(VOWELS) + c3;
    }
    return "";
  },
  // 6. CVCCV avec ≥1 consonne rare — zimba-like (milvo, tanza)
  () => {
    for (let i = 0; i < 50; i++) {
      const c1 = pick(ONSETS), c2 = pick(CODAS), c3 = pick(ONSETS);
      if (RARE.has(c1) || RARE.has(c2) || RARE.has(c3))
        return c1 + pick(VOWELS) + c2 + pick(VOWELS) + c3;
    }
    return "";
  },
  // 7. CVCCy — zelvy, marvy
  () => pick(ONSETS) + pick(VOWELS) + pick(CODA_PAIRS) + "y",
  // 8. CVyVC — zaylo, mayvi
  () => pick(ONSETS) + pick(VOWELS) + "y" + pick(CODAS) + pick(VOWELS),
  // 9. Q — qelio, quvia
  () => (rnd() < 0.5 ? "q" + pick(VOWELS) + pick(ONSETS) + pick(VOWELS) + pick(VOWELS)
                     : "q" + pick(VOWELS) + pick(ONSETS) + pick(VOWELS) + pick(CODAS)),
  // 10. X — xelia, xamvo
  () => (rnd() < 0.5 ? "x" + pick(VOWELS) + pick(ONSETS) + pick(VOWELS) + pick(VOWELS)
                     : "x" + pick(VOWELS) + pick(ONSETS) + pick(VOWELS) + pick(CODAS)),
];

// Pondération vague 4 : biais vers les niches QUI LIBÈRENT des noms
// (VCVCV, CVyVC, CCVCV clusters libres, CVVCV) d'après les vagues 2-3.
// Ordre : [CVVCV, CVCVV, CCVCV, VCVCV, CVCVC-rare, CVCCV-rare, CVCCy, CVyVC, Q, X]
const WEIGHTS = [0.12, 0.06, 0.16, 0.28, 0.08, 0.06, 0.02, 0.20, 0.01, 0.01];
function weightedTemplate(): () => string {
  let r = rnd();
  for (let i = 0; i < TEMPLATES.length; i++) {
    if (r < WEIGHTS[i]) return TEMPLATES[i];
    r -= WEIGHTS[i];
  }
  return TEMPLATES[0];
}

const BLACKLIST = /(sex|cum|anal|piss|poop|cunt|dick|cock|penis|vagin|nigg|fagg|rape|nazi|kkk|whor|slut|porn|fuck|shit|bitch|scat|porn|suicid|hitl|fecal|urin)/;

// ── Chargement des résultats existants (vague 1) ───────────────────────────
const results = new Map<string, Status>();
if (existsSync(RESULTS_FILE)) {
  try {
    const prev = JSON.parse(readFileSync(RESULTS_FILE, "utf8"));
    for (const [w, s] of Object.entries(prev.results ?? {})) results.set(w, s as Status);
    console.log(`↩︎  ${results.size} résultats précédents chargés (ignorés lors du re-test).`);
  } catch { /* repart de zéro */ }
}

// ── Constitution du lot ─────────────────────────────────────────────────────
const batch: string[] = [];
const seen = new Set(results.keys());

// Vagues curatoriales (prioritaires) — wave2 + wave3
const curated: string[] = [];
for (const f of ["wave2.txt", "wave3.txt", "wave4.txt", "wave5.txt"]) {
  const path = DIR + f;
  if (!existsSync(path)) continue;
  const words = readFileSync(path, "utf8")
    .split("\n").map((l) => l.split("#")[0].trim().toLowerCase())
    .filter((w) => /^[a-z]{5}$/.test(w));
  curated.push(...words);
}
const wave2 = curated.filter((w) => !seen.has(w) && !curated.slice(0, curated.indexOf(w)).includes(w));
for (const w of wave2) { seen.add(w); batch.push(w); }

// Génération de masse
let generated = 0;
while (generated < GENERATE_COUNT) {
  const w = weightedTemplate()();
  if (!w || !/^[a-z]{5}$/.test(w) || seen.has(w) || BLACKLIST.test(w)) continue;
  seen.add(w);
  batch.push(w);
  generated++;
}

console.log(`📋 Lot vague 2 : ${batch.length} candidats (${wave2.length} curatoriaux + ${generated} générés).`);
console.log(`🗂  Total à jour après fusion : ${seen.size} noms uniques.`);

// ── Vérification RDAP ───────────────────────────────────────────────────────
let done = 0;
let snapshotAt = 0;

async function checkOne(word: string, attempt = 1): Promise<Status> {
  try {
    const res = await fetch(`https://rdap.verisign.com/com/v1/domain/${word}.com`, {
      headers: { Accept: "application/rdap+json", "User-Agent": "VibeSync-Naming-Research/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 200) return "taken";
    if (res.status === 404) return "available";
    if (attempt >= MAX_ATTEMPTS) return "error";
    await new Promise((r) => setTimeout(r, attempt * 1800 + Math.random() * 800));
    return checkOne(word, attempt + 1);
  } catch {
    if (attempt >= MAX_ATTEMPTS) return "error";
    await new Promise((r) => setTimeout(r, attempt * 1800 + Math.random() * 800));
    return checkOne(word, attempt + 1);
  }
}

let cursor = 0;
async function worker() {
  while (cursor < batch.length) {
    const word = batch[cursor++];
    const status = await checkOne(word);
    results.set(word, status);
    done++;
    if (done % 50 === 0 || done === batch.length) {
      const avail = [...results.values()].filter((s) => s === "available").length;
      console.log(`   ${done}/${batch.length} vérifiés — ${avail} disponibles cumulés`);
    }
    if (done - snapshotAt >= 200) {
      snapshotAt = done;
      writeFileSync(RESULTS_FILE, JSON.stringify({ checkedAt: new Date().toISOString(), source: "RDAP Verisign (registre .com)", results: Object.fromEntries([...results.entries()].sort()) }, null, 2) + "\n");
    }
    await new Promise((r) => setTimeout(r, POLITENESS_MS));
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// ── Sorties ─────────────────────────────────────────────────────────────────
const available = [...results.entries()].filter(([, s]) => s === "available").map(([w]) => w).sort();
const taken = [...results.entries()].filter(([, s]) => s === "taken").map(([w]) => w).sort();
const errored = [...results.entries()].filter(([, s]) => s === "error").map(([w]) => w).sort();

writeFileSync(RESULTS_FILE, JSON.stringify({ checkedAt: new Date().toISOString(), source: "RDAP Verisign (registre .com)", results: Object.fromEntries([...results.entries()].sort()) }, null, 2) + "\n");
writeFileSync(AVAILABLE_FILE, available.join("\n") + (available.length ? "\n" : ""));

console.log("\n════════════════════════════════════════");
console.log(`✅ DISPONIBLES (cumul toutes vagues) : ${available.length}`);
console.log(`❌ Pris    : ${taken.length}`);
console.log(`⚠️  Erreurs : ${errored.length}${errored.length ? " → " + errored.slice(0, 20).join(", ") : ""}`);
console.log("════════════════════════════════════════");
