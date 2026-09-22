/**
 * Scoring de marque — classe les domaines 5 lettres DISPONIBLES par
 * « brandabilité » pour une app de rencontre FR/EN (audience francophone).
 * Usage : bun run branding/naming/score.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const DIR = new URL(".", import.meta.url).pathname;
const data = JSON.parse(readFileSync(DIR + "results.json", "utf8"));
const available = Object.entries(data.results as Record<string, string>)
  .filter(([, s]) => s === "available")
  .map(([w]) => w);

console.log(`📊 ${available.length} noms disponibles à scorer…`);

const V = new Set(["a", "e", "i", "o", "u"]);
const PRETTY_CLUSTERS = new Set(["br", "cr", "dr", "fr", "gr", "pr", "tr", "bl", "cl", "fl", "gl", "kl", "pl", "sm", "tw", "sw", "sh", "ch", "th"]);
const HARD_CLUSTERS = new Set(["sv", "zw", "vl", "vr", "zr", "sk", "sc", "sn", "sp", "st"]);
const SOFT_DOUBLES = new Set(["ll", "mm", "nn", "rr", "ss"]);
const NICE_SYL = new Set(["lo", "la", "li", "lu", "le", "mo", "me", "mi", "ma", "ro", "ra", "ri", "so", "sa", "si", "va", "ve", "vi", "vo", "za", "ze", "zi", "zo", "no", "na", "ni", "nu", "ta", "te", "to", "da", "do", "de", "ba", "bo", "be", "jo", "ju", "je", "gi", "go"]);

function score(w: string): number {
  let s = 0;
  const letters = w.split("");

  // ── Forme générale ──
  if (V.has(w[4])) s += 3; // finale voyelle (très « app »)
  else if ("lmnrs".includes(w[4])) s += 1;
  else s -= 2; // -g -k -b -d -t -p -v -z -w finales dures

  if (V.has(w[0])) s += 2; // initiale voyelle (douceur)

  // ── Lettres de marque ──
  if (w.includes("v")) s += 2; // V de Vibe
  if (w.includes("w")) s += 1;
  if (w.includes("l") || w.includes("m")) s += 1;
  if (w.includes("r") || w.includes("n")) s += 1;

  // ── Sens caché (amour/mouvement) ──
  if (/lov|luv|mov|vib/.test(w)) s += 4;
  else if (/amo/.test(w)) s += 3;
  if (/^me[lr]|mel|amou?r/.test(w)) s += 1;

  // ── Voyelle y (diphtongues) ──
  const m = w.match(/([aeiou])y([aeiou])/);
  if (m) {
    if ("aeo".includes(m[1])) s += 1; // ay/ey/oy — joli (maylo)
    else s -= 3; // uy/iy — dur en français
  }
  if (/y/.test(w) && !m) s -= 1;

  // ── Voyelles doublées ──
  const dm = w.match(/(aa|ee|ii|oo|uu)/);
  if (dm) s += dm[1] === "aa" || dm[1] === "oo" || dm[1] === "ee" ? 1 : -1;

  // ── Lettres délicates ──
  if (w.includes("h")) s -= 2; // muet/awkward en FR
  if (/q(?!u)/.test(w)) s -= 3;
  if (w[0] === "x") s -= 2;
  if (w[0] === "q") s -= 1;

  // ── Clusters ──
  for (let i = 0; i < 4; i++) {
    const pair = w.slice(i, i + 2);
    if (!V.has(pair[0]) && !V.has(pair[1])) {
      if (PRETTY_CLUSTERS.has(pair)) s += 1;
      else if (HARD_CLUSTERS.has(pair)) s -= 2;
      else s -= 1;
    }
  }
  // w/v entre voyelles (VwV) — passable mais moins fluide
  if (/[aeiou][wv][aeiou]/.test(w)) s -= 1;

  // ── Doubles consonnes ──
  const dm2 = w.match(/(.)\1/);
  if (dm2) s += SOFT_DOUBLES.has(dm2[1] + dm2[1]) ? 1 : -1;

  // ── Reduplication type ziziz/jigig ──
  if (/^(.).\1.\1/.test(w) || /^(..)\1/.test(w)) s -= 4;

  // ── Syllabes reconnaissables ──
  let nice = 0;
  for (let i = 0; i < 4; i++) if (NICE_SYL.has(w.slice(i, i + 2))) nice++;
  s += Math.min(nice, 3);

  // ── Rhythm CVCV parfait (zuma-like) ──
  if (!V.has(w[0]) && V.has(w[1]) && !V.has(w[2]) && V.has(w[3]) && !V.has(w[4])) s += 0; // neutre

  return s;
}

const scored = available
  .map((w) => ({ w, s: score(w) }))
  .sort((a, b) => b.s - a.s || a.w.localeCompare(b.w));

writeFileSync(DIR + "scored.txt", scored.map((x) => `${String(x.s).padStart(3)}  ${x.w}`).join("\n") + "\n");

console.log("\n🏆 TOP 120 :");
scored.slice(0, 120).forEach((x, i) => console.log(`${String(i + 1).padStart(3)}. ${x.w}  (${x.s})`));

// Statut des loteries à sens (vagues 2-4)
const LOTTERY = ["munya", "azuri", "azora", "jamba", "zambe", "zamia", "nzame", "mboka", "mbala", "ndula", "kanda", "jovan", "novan", "dejuv", "ezawi", "uwelu", "ruuzi", "xozie", "miyvi", "osewi", "taawo", "svulu", "tivaj", "damvy", "jaawe", "guuwi", "smumi", "wiyli", "xizea", "niigu", "doruu", "tiluu", "raduu", "ruylu", "luyvi", "juyva", "vuwii", "kuzij", "gevuz"];
console.log("\n🎯 Loteries à sens :");
for (const w of LOTTERY) console.log(`   ${w}: ${data.results[w] ?? "non-vérifié"}`);
