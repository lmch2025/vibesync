#!/usr/bin/env node
/**
 * VibeSync — protection/verify.mjs
 * --------------------------------
 * Vérifie l'intégrité des fonctionnalités protégées de VibeSync.
 *
 * Le fichier protection/integrity.manifest.json scelle l'empreinte SHA-256
 * de chaque fichier du périmètre protégé (voir protection/config.json).
 * Ce script détecte trois types de divergence :
 *
 *   ✏️  MODIFIÉ     un fichier scellé dont le contenu a changé
 *   🗑️  SUPPRIMÉ    un fichier scellé qui n'existe plus
 *   ➕  NON SCELLÉ  un fichier du périmètre protégé absent du manifeste
 *                   (fonctionnalité future non déclarée — à sceller via lock)
 *
 * Modes :
 *   (défaut)            vérifie le worktree complet
 *   --staged            vérifie le contenu STAGÉ (index git) — utilisé par les hooks
 *   --staged-paths      sort 1 si le stagé touche LE MOINDRE chemin protégé
 *                       (aligné sur l'audit push/CI — utilisé par commit-msg)
 *   --audit <plage>     audite les commits d'une plage git (ex: origin/main..HEAD) :
 *                       tout commit touchant le périmètre doit porter [MODIF-PROTEGEE]
 *   --status            synthèse lisible (état du blindage)
 *   --quiet             sortie minimale (code retour uniquement)
 *   --json              sortie machine (CI)
 *
 * Codes retour : 0 = intégrité OK · 1 = divergence détectée · 2 = protection non initialisée/erreur
 *
 * Ce script ne modifie JAMAIS le manifeste. Seul protection/lock.mjs (action
 * explicite : --je-confirme) le régénère.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const CFG_PATH = path.join(ROOT, "protection", "config.json");
const MANIFEST_PATH = path.join(ROOT, "protection", "integrity.manifest.json");
const FEATURES_PATH = path.join(ROOT, "protection", "features.json");

const args = process.argv.slice(2);
const OPT = {
  staged: args.includes("--staged"),
  stagedPaths: args.includes("--staged-paths"),
  quiet: args.includes("--quiet"),
  json: args.includes("--json"),
  status: args.includes("--status"),
  audit: null,
};
const auditIdx = args.indexOf("--audit");
if (auditIdx !== -1 && args[auditIdx + 1]) OPT.audit = args[auditIdx + 1];

/* ---------------------------------- utils ---------------------------------- */

function die(code, msg) {
  if (!OPT.quiet) process.stderr.write(`⛔ ${msg}\n`);
  process.exit(code);
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** Convertit un glob (**, *, ?) en RegExp. */
function globToRegex(glob) {
  let re = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        let j = i + 2;
        if (glob[j] === "/") j++; // « **/ » peut aussi matcher rien
        re += "(?:.*)";
        i = j;
      } else {
        re += "[^/]*";
        i++;
      }
    } else if (c === "?") {
      re += "[^/]";
      i++;
    } else if ("\\^$.|+()[]{}".includes(c)) {
      re += "\\" + c;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  return new RegExp("^" + re + "$");
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

/** Commande git → sortie trimée (chemins relatifs au root). */
function git(gitArgs) {
  try {
    return execFileSync("git", gitArgs, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/* --------------------------- périmètre & manifeste -------------------------- */

const config = readJson(CFG_PATH);
if (!config) die(2, "protection/config.json introuvable ou invalide.");

const HAS_MANIFEST = fs.existsSync(MANIFEST_PATH);
const manifest = HAS_MANIFEST ? readJson(MANIFEST_PATH) : null;
if (!HAS_MANIFEST && !OPT.status) {
  die(
    2,
    "protection/integrity.manifest.json introuvable.\n" +
      "   La protection n'est pas encore initialisée. Lancez :  bun run protection:lock"
  );
}

const PROTECTED_RES = (config.protectedGlobs || []).map(globToRegex);
const EXCLUDED_RES = (config.excludedGlobs || []).map(globToRegex);

/** Un chemin (posix, relatif au root) appartient-il au périmètre protégé ? */
function isProtected(relPath) {
  const p = toPosix(relPath);
  if (EXCLUDED_RES.some((r) => r.test(p))) return false;
  return PROTECTED_RES.some((r) => r.test(p));
}

/* ------------------------------ cartographie ------------------------------- */

const features = readJson(FEATURES_PATH);
const FILE_TO_FEATURES = new Map(); // fichier → [ {id, nom} ]
if (features) {
  for (const f of features.features || []) {
    for (const file of f.fichiers || []) {
      if (!FILE_TO_FEATURES.has(file)) FILE_TO_FEATURES.set(file, []);
      FILE_TO_FEATURES.get(file).push({ id: f.id, nom: f.nom });
    }
  }
}

function featuresFor(relPath) {
  const p = toPosix(relPath);
  const direct = FILE_TO_FEATURES.get(p);
  if (direct) return direct;
  const top = p.split("/").slice(0, 2).join("/");
  return FILE_TO_FEATURES.get(top) || [];
}

function featureLabel(relPath) {
  const feats = featuresFor(relPath);
  if (!feats.length) return "";
  return feats.map((f) => `« ${f.nom} » (${f.id})`).join(", ");
}

/* --------------------------------- hashing --------------------------------- */

function hashBuffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function hashWorktreeFile(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  return hashBuffer(fs.readFileSync(abs));
}

function hashStagedFile(relPath) {
  // Contenu de l'index git (ce qui sera réellement commité)
  try {
    const buf = execFileSync("git", ["show", `:${relPath}`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
    return hashBuffer(buf);
  } catch {
    return null; // absent de l'index (supprimé)
  }
}

/* --------------------------------- scanning -------------------------------- */

/** Tous les fichiers du worktree (suivis + nouveaux non-ignorés) dans le périmètre. */
function scanWorktree() {
  const out = git(["ls-files", "--cached", "--others", "--exclude-standard"]);
  return out.split("\n").filter(Boolean).filter(isProtected);
}

/** Changements stagés : fichiers à contrôler + ajouts. */
function stagedChanges() {
  const out = git(["diff", "--cached", "--name-status"]);
  const touched = []; // chemins à comparer au manifeste (ancien chemin pour R/D)
  const added = []; // chemins apparaissant (nouveau contenu)
  for (const line of out.split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    const status = parts[0];
    if (status.startsWith("R") || status.startsWith("C")) {
      if (parts[1]) touched.push(parts[1]); // ancien chemin
      if (parts[2]) added.push(parts[2]); // nouveau chemin
    } else if (status.startsWith("D")) {
      if (parts[1]) touched.push(parts[1]);
    } else {
      // A / M
      if (parts[1]) {
        touched.push(parts[1]);
        added.push(parts[1]);
      }
    }
  }
  return {
    toCheck: [...new Set(touched)].filter(isProtected),
    added: [...new Set(added)].filter(isProtected),
  };
}

/* --------------------------------- contrôles ------------------------------- */

function checkWorktree() {
  const violations = [];
  const sealed = (manifest && manifest.files) || {};
  for (const [p, expected] of Object.entries(sealed)) {
    const actual = hashWorktreeFile(p);
    if (actual === null) violations.push({ type: "SUPPRIMÉ", path: p });
    else if (actual !== expected) violations.push({ type: "MODIFIÉ", path: p });
  }
  for (const p of scanWorktree()) {
    if (!sealed[p]) violations.push({ type: "NON SCELLÉ", path: p });
  }
  return { violations };
}

function checkStaged() {
  const { toCheck, added } = stagedChanges();
  const violations = [];
  const sealed = manifest.files || {};
  for (const p of toCheck) {
    if (!sealed[p]) continue; // fichier non scellé : couvert par la règle « NON SCELLÉ »
    const actual = hashStagedFile(p);
    if (actual === null) violations.push({ type: "SUPPRIMÉ", path: p });
    else if (actual !== sealed[p]) violations.push({ type: "MODIFIÉ", path: p });
  }
  for (const p of added) {
    if (!sealed[p]) violations.push({ type: "NON SCELLÉ", path: p });
  }
  return { violations };
}

/* --------------------------------- rapports -------------------------------- */

function reportViolations(violations, modeLabel) {
  const lines = [];
  lines.push("");
  lines.push("  ╔══════════════════════════════════════════════════════════════════╗");
  lines.push("  ║   🛡️  VIBESYNC PROTECTION — CHANGEMENT NON AUTORISÉ DÉTECTÉ      ║");
  lines.push("  ╚══════════════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`  Contexte : ${modeLabel}`);
  lines.push("");
  for (const v of violations.slice(0, 30)) {
    const icon = v.type === "SUPPRIMÉ" ? "🗑️ " : v.type === "NON SCELLÉ" ? "➕ " : "✏️ ";
    lines.push(`  ${icon}${v.type.padEnd(12)} ${v.path}`);
    const fl = featureLabel(v.path);
    if (fl) lines.push(`       ↳ Fonctionnalité concernée : ${fl}`);
    if (v.type === "NON SCELLÉ") {
      lines.push("       ↳ Nouveau fichier dans le périmètre protégé : à déclarer et sceller");
      lines.push("         (protection/features.json + bun run protection:lock -- --je-confirme)");
    }
  }
  if (violations.length > 30) lines.push(`  … et ${violations.length - 30} autre(s)`);
  lines.push("");
  lines.push("  ── Procédure de modification légitime (demande explicite uniquement) ──");
  lines.push("  1. Validation explicite du propriétaire du projet requise.");
  lines.push("  2. Commit avec double signal :");
  lines.push('       VIBESYNC_ALLOW_PROTECTED=1 git commit -m "[MODIF-PROTEGEE] <justification>"');
  lines.push("  3. Puis re-scellage si la modification est acceptée définitivement :");
  lines.push("       bun run protection:lock -- --je-confirme");
  lines.push("  Documentation complète : PROTECTION.md");
  lines.push("");
  return lines.join("\n");
}

/* ---------------------------------- audit ---------------------------------- */

function auditRange(range) {
  const log = git(["log", "--format=%H%x09%s", range]);
  if (!log) die(2, `Plage git introuvable : ${range}`);
  const problems = [];
  for (const line of log.split("\n")) {
    if (!line) continue;
    const [sha, subject] = line.split("\t");
    const files = git(["diff-tree", "--no-commit-id", "--name-status", "-r", sha]).split("\n").filter(Boolean);
    const touchedProtected = [];
    for (const f of files) {
      const parts = f.split("\t");
      // R/C : parts[1] = ancien chemin (celui qui disparaît) ; A/M/D : parts[1]
      const p = parts[1];
      if (p && isProtected(p)) touchedProtected.push(p);
    }
    if (touchedProtected.length && !/\[MODIF-PROTEGEE\]/i.test(subject || "")) {
      problems.push({ sha, subject, files: touchedProtected });
    }
  }
  return problems;
}

/* ---------------------------------- main ----------------------------------- */

if (OPT.status) {
  const files = manifest ? Object.keys(manifest.files || {}) : [];
  const protectedCount = scanWorktree().length;
  const feats = features ? features.features.length : 0;
  console.log("🛡️  VibeSync Protection — état du blindage");
  console.log(`   Périmètre protégé      : ${config.protectedGlobs.length} globs → ${protectedCount} fichiers détectés`);
  console.log(`   Fichiers scellés       : ${files.length}`);
  console.log(`   Fonctionnalités cartographiées : ${feats}`);
  console.log(`   Dernier scellé         : ${manifest ? manifest.generatedAt + " (" + (manifest.headCommit || "?") + ")" : "jamais"}`);
  console.log(`   Hooks git              : ${git(["config", "core.hooksPath"]) || "(non configurés — lancez : bun run protection:install)"}`);
  const v = checkWorktree();
  if (v.violations.length === 0) {
    console.log("   Intégrité              : ✅ aucune divergence");
  } else {
    console.log(`   Intégrité              : ❌ ${v.violations.length} divergence(s) — détail : node protection/verify.mjs`);
  }
  process.exit(0);
}

if (OPT.stagedPaths) {
  // Le stagé touche-t-il au moins un chemin du périmètre protégé ?
  // (sémantique alignée sur l'audit : tout commit touchant le périmètre
  //  doit porter le marqueur [MODIF-PROTEGEE])
  const out = git(["diff", "--cached", "--name-status"]);
  const touched = [];
  for (const line of out.split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    // R/C : ancien chemin (parts[1]) + nouveau (parts[2]) ; A/M/D : parts[1]
    for (const p of [parts[1], parts[2]]) {
      if (p && isProtected(p)) touched.push(p);
    }
  }
  if (touched.length === 0) process.exit(0);
  if (OPT.json) {
    console.log(JSON.stringify({ ok: false, touched }, null, 2));
  } else if (!OPT.quiet) {
    console.log(`Périmètre protégé touché par le stagé (${touched.length}) :`);
    for (const p of touched.slice(0, 15)) console.log(`   • ${p}`);
  }
  process.exit(1);
}

if (OPT.audit) {
  const problems = auditRange(OPT.audit);
  if (OPT.json) {
    console.log(JSON.stringify({ ok: problems.length === 0, problems }, null, 2));
  } else if (problems.length === 0) {
    if (!OPT.quiet) console.log("✅ Audit OK : aucun commit du périmètre protégé sans marqueur [MODIF-PROTEGEE].");
  } else {
    console.error(`❌ Audit : ${problems.length} commit(s) touchent le périmètre protégé SANS le marqueur [MODIF-PROTEGEE] :`);
    for (const p of problems) {
      console.error(`   ${p.sha.slice(0, 8)} « ${p.subject} »`);
      for (const f of p.files.slice(0, 5)) console.error(`      • ${f}`);
      if (p.files.length > 5) console.error(`      … et ${p.files.length - 5} autre(s)`);
    }
    process.exit(1);
  }
  process.exit(0);
}

const { violations } = OPT.staged ? checkStaged() : checkWorktree();

if (OPT.json) {
  console.log(JSON.stringify({ ok: violations.length === 0, violations }, null, 2));
  process.exit(violations.length === 0 ? 0 : 1);
}

if (violations.length === 0) {
  if (!OPT.quiet) {
    const sealedCount = Object.keys(manifest.files || {}).length;
    console.log(`✅ Intégrité VibeSync vérifiée : ${sealedCount} fichiers scellés, aucune divergence.`);
  }
  process.exit(0);
}

if (OPT.quiet) process.exit(1);
process.stderr.write(reportViolations(violations, OPT.staged ? "contenu stagé pour commit" : "worktree complet"));
process.exit(1);
