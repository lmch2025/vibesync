/**
 * VibeSync — vérificateur de disponibilité .com via RDAP Verisign
 * (source officielle : le registre .com lui-même).
 *   HTTP 200 → domaine enregistré (pris)
 *   HTTP 404 → domaine absent du registre (disponible)
 * Usage : bun run branding/naming/check-domains.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const CANDIDATES_FILE = new URL("./candidates.txt", import.meta.url).pathname;
const RESULTS_FILE = new URL("./results.json", import.meta.url).pathname;
const AVAILABLE_FILE = new URL("./available.txt", import.meta.url).pathname;
const TAKEN_FILE = new URL("./taken.txt", import.meta.url).pathname;

const CONCURRENCY = 5;
const TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 5;

type Status = "available" | "taken" | "error";

// 1) Lecture + validation stricte : exactement 5 lettres ASCII minuscules
const raw = readFileSync(CANDIDATES_FILE, "utf8");
const seen = new Map<string, string>(); // word -> first family line
for (const line of raw.split("\n")) {
  const word = line.split("#")[0].trim().toLowerCase();
  if (!word) continue;
  if (!/^[a-z]{5}$/.test(word)) {
    console.warn(`⚠️  IGNORÉ (pas 5 lettres a-z) : "${word}"`);
    continue;
  }
  if (!seen.has(word)) seen.set(word, line.split("#")[1]?.trim() ?? "");
}
const candidates = [...seen.keys()];
console.log(`📋 ${candidates.length} candidats uniques à vérifier (RDAP Verisign)…`);

// 2) Vérification RDAP avec rétentatives
const results = new Map<string, Status>();
let done = 0;

async function checkOne(word: string, attempt = 1): Promise<Status> {
  try {
    const res = await fetch(`https://rdap.verisign.com/com/v1/domain/${word}.com`, {
      headers: {
        Accept: "application/rdap+json",
        "User-Agent": "VibeSync-Naming-Research/1.0",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 200) return "taken";
    if (res.status === 404) return "available";
    // 429 (throttling), 5xx (erreur serveur) → rétentative
    if (attempt >= MAX_ATTEMPTS) return "error";
    const wait = attempt * 1800 + Math.random() * 800;
    await new Promise((r) => setTimeout(r, wait));
    return checkOne(word, attempt + 1);
  } catch {
    if (attempt >= MAX_ATTEMPTS) return "error";
    const wait = attempt * 1800 + Math.random() * 800;
    await new Promise((r) => setTimeout(r, wait));
    return checkOne(word, attempt + 1);
  }
}

let cursor = 0;
async function worker() {
  while (cursor < candidates.length) {
    const word = candidates[cursor++];
    const status = await checkOne(word);
    results.set(word, status);
    done++;
    if (done % 25 === 0 || done === candidates.length) {
      const availSoFar = [...results.values()].filter((s) => s === "available").length;
      console.log(`   ${done}/${candidates.length} vérifiés — ${availSoFar} disponibles pour l'instant`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// 3) Écriture des sorties
const available = [...results.entries()].filter(([, s]) => s === "available").map(([w]) => w).sort();
const taken = [...results.entries()].filter(([, s]) => s === "taken").map(([w]) => w).sort();
const errored = [...results.entries()].filter(([, s]) => s === "error").map(([w]) => w).sort();

writeFileSync(
  RESULTS_FILE,
  JSON.stringify(
    { checkedAt: new Date().toISOString(), source: "RDAP Verisign (registre .com)", results: Object.fromEntries([...results.entries()].sort()) },
    null,
    2,
  ) + "\n",
);
writeFileSync(AVAILABLE_FILE, available.join("\n") + (available.length ? "\n" : ""));
writeFileSync(TAKEN_FILE, taken.join("\n") + (taken.length ? "\n" : ""));

console.log("\n════════════════════════════════════════");
console.log(`✅ DISPONIBLES : ${available.length}`);
console.log(`❌ Pris       : ${taken.length}`);
console.log(`⚠️  Erreurs    : ${errored.length}${errored.length ? " → " + errored.join(", ") : ""}`);
console.log("════════════════════════════════════════");
if (available.length) console.log("\nDisponibles :\n" + available.map((w) => `  ${w}.com`).join("\n"));
