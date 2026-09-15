#!/usr/bin/env node
/**
 * VibeSync — protection/lock.mjs
 * ------------------------------
 * Régénère protection/integrity.manifest.json en scellant l'état ACTUEL
 * du périmètre protégé (empreinte SHA-256 de chaque fichier).
 *
 * ⚠️ C'est une ACTION EXPLICITE ET IRREVERSIBLE DANS LE PRINCIPE :
 *    sceller de nouveaux contenu valide les modifications en cours.
 *    Ne lancez ce script QUE sur demande explicite du propriétaire
 *    (ex : nouvelle fonctionnalité validée, correction volontaire).
 *
 * Sécurités :
 *   - Refuse de s'exécuter sans le drapeau --je-confirme OU la variable
 *     d'environnement VIBESYNC_EXPLICIT_LOCK=1 (sauf toute première initialisation).
 *   - Affiche un diff complet de ce qui va être scellé/retiré avant d'écrire.
 *   - Journalise le commit HEAD et l'horodatage dans le manifeste.
 *
 * Après le lock, commitez le manifeste mis à jour :
 *   git add protection/integrity.manifest.json
 *   VIBESYNC_ALLOW_PROTECTED=1 git commit -m "[MODIF-PROTEGEE] Scellage : <raison>"
 *   (le marqueur n'est exigé que si d'autres fichiers protégés changent dans le même commit)
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const CFG_PATH = path.join(ROOT, "protection", "config.json");
const MANIFEST_PATH = path.join(ROOT, "protection", "integrity.manifest.json");
const FIRST_TIME = !fs.existsSync(MANIFEST_PATH);

const confirmed =
  FIRST_TIME ||
  process.argv.includes("--je-confirme") ||
  process.env.VIBESYNC_EXPLICIT_LOCK === "1";

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function globToRegex(glob) {
  let re = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        let j = i + 2;
        if (glob[j] === "/") j++;
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

const config = readJson(CFG_PATH, null);
if (!config) {
  console.error("⛔ protection/config.json introuvable ou invalide.");
  process.exit(2);
}

if (!confirmed) {
  console.error("");
  console.error("⛔  REFUS : sceller un nouveau baseline est une action explicite.");
  console.error("");
  console.error("    Ce script validerait l'état actuel du code comme nouvelle référence");
  console.error("    d'intégrité. Il ne doit être lancé que sur décision du propriétaire.");
  console.error("");
  console.error("    Pour confirmer :");
  console.error("      bun run protection:lock -- --je-confirme");
  console.error("    ou :");
  console.error("      VIBESYNC_EXPLICIT_LOCK=1 bun run protection:lock");
  console.error("");
  process.exit(1);
}

const PROTECTED_RES = (config.protectedGlobs || []).map(globToRegex);
const EXCLUDED_RES = (config.excludedGlobs || []).map(globToRegex);
const isProtected = (p) =>
  !EXCLUDED_RES.some((r) => r.test(p)) && PROTECTED_RES.some((r) => r.test(p));

const oldManifest = readJson(MANIFEST_PATH, { files: {} });
const oldFiles = oldManifest.files || {};

// Scan du worktree : fichiers suivis + nouveaux non-ignorés
const all = git(["ls-files", "--cached", "--others", "--exclude-standard"])
  .split("\n")
  .filter(Boolean)
  .filter(isProtected)
  .sort();

const files = {};
for (const rel of all) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue; // supprimé mais encore dans l'index
  files[rel] = createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

// Diff lisible avant écriture
const added = Object.keys(files).filter((p) => !oldFiles[p]);
const removed = Object.keys(oldFiles).filter((p) => !files[p]);
const changed = Object.keys(files).filter((p) => oldFiles[p] && oldFiles[p] !== files[p]);

console.log("🔐 Scellage du périmètre protégé VibeSync");
console.log(`   Fichiers scellés au total : ${Object.keys(files).length}`);
if (!FIRST_TIME) {
  if (added.length) {
    console.log(`\n   ➕ Nouveaux fichiers scellés (${added.length}) :`);
    added.slice(0, 20).forEach((p) => console.log(`      + ${p}`));
    if (added.length > 20) console.log(`      … et ${added.length - 20} autre(s)`);
  }
  if (changed.length) {
    console.log(`\n   ✏️  Contenus re-scellés — les modifications suivantes deviennent la nouvelle référence (${changed.length}) :`);
    changed.slice(0, 20).forEach((p) => console.log(`      ~ ${p}`));
    if (changed.length > 20) console.log(`      … et ${changed.length - 20} autre(s)`);
  }
  if (removed.length) {
    console.log(`\n   🗑️  Retirés du scellé (${removed.length}) :`);
    removed.slice(0, 20).forEach((p) => console.log(`      - ${p}`));
  }
  if (!added.length && !changed.length && !removed.length) {
    console.log("   Aucun changement par rapport au manifeste actuel.");
  }
}

const manifest = {
  version: config.version,
  algorithm: "sha256",
  generatedAt: new Date().toISOString(),
  headCommit: git(["rev-parse", "--short", "HEAD"]) || "(worktree sans commit)",
  fileCount: Object.keys(files).length,
  files,
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`\n✅ Manifeste écrit : protection/integrity.manifest.json (${Object.keys(files).length} fichiers scellés)`);
console.log("   Pensez à committer le manifeste pour que la CI protège ce nouveau baseline.");
