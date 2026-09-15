# 🛡️ PROTECTION DES FONCTIONNALITÉS VIBESYNC

> **Charte de blindage du code.** Ce dépôt contient l'application VibeSync dans un état
> considéré comme **acquis et stable**. Les fonctionnalités implémentées — présentes
> **et futures** — ne doivent pouvoir être modifiées, supprimées ou détournées **que
> sur demande explicite du propriétaire du projet**, jamais « par accident ».

Ce document est **lui-même un fichier protégé** : il ne peut pas être modifié sans la
procédure de déblocage décrite ci-dessous.

---

## 1. Principe

Trois couches de défense indépendantes se relaient pour qu'aucune modification d'une
fonctionnalité ne passe inaperçue :

| Couche | Où | Ce qu'elle bloque |
|---|---|---|
| **1. Hooks git locaux** (`githooks/`) | Machine du développeur / agent IA | Le `git commit` et le `git push` eux-mêmes |
| **2. CI GitHub** (`.github/workflows/guard.yml`) | Serveur GitHub | Tout ce qui est poussé, même en contournant les hooks (`--no-verify`) |
| **3. Conventions traçables** (marqueur `[MODIF-PROTEGEE]`, CODEOWNERS, protection de branche) | Historique git + GitHub | Les modifications non justifiées, sans relecture |

Le verrou technique repose sur un **scellé cryptographique** : l'empreinte SHA-256 de
chaque fichier du périmètre protégé est enregistrée dans
`protection/integrity.manifest.json`. Toute divergence entre le code réel et le scellé
est une violation, où qu'elle soit détectée.

---

## 2. Périmètre protégé

Défini dans `protection/config.json` (`protectedGlobs`). En résumé :

- **Tout `src/**`** — composants, routes API, libs, styles (le cœur applicatif)
- **`prisma/**`** — schéma de données et seeds
- **`public/**`** — manifest PWA, robots, logo
- **`scripts/**`** — outilage (seed, génération d'images, connecteur Neon)
- **Config critique** : `package.json`, `next.config.ts`, `tsconfig.json`,
  `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`,
  `Caddyfile`, `.gitignore`
- **Gouvernance** : `README.md`, `PROTECTION.md`, `docs/FEATURES.md`, `AGENTS.md`,
  `CLAUDE.md`, `.github/**` (CI, CODEOWNERS, template PR), `protection/config.json`,
  `protection/features.json`, `protection/typecheck-baseline.txt`

**Cartographie fonctionnalités ↔ fichiers** : `protection/features.json`
(registre machine) et `docs/FEATURES.md` (registre humain commenté). Quand un
fichier protégé est modifié, les outils identifient **la ou les fonctionnalités
impactées** par leur nom.

**Ce qui reste libre** (aucun scellé) : la documentation annexe, les nouveaux
fichiers hors périmètre, `protection/integrity.manifest.json` (auto-référent :
il ne peut pas contenir son propre hash), `githooks/`, `protection/*.mjs`
(l'outillage du blindage — sensé évoluer avec parcimonie).

---

## 3. Comment travaillent les gardes

### 3.1 `pre-commit` (local)
Au moment du `git commit` :
1. **Intégrité du contenu stagé** — trois familles de blocage :
   - ✏️ **MODIFIÉ** : un fichier scellé dont le contenu stagé diverge du manifeste ;
   - 🗑️ **SUPPRIMÉ** : un fichier scellé retiré (suppression ou renommage) ;
   - ➕ **NON SCELLÉ** : un fichier **nouveau** dans le périmètre protégé (ex. un
     nouveau composant dans `src/`) qui n'a pas encore été déclaré et scellé —
     c'est la protection des **fonctionnalités futures**.
   → **commit bloqué** dans tous les cas, sauf `VIBESYNC_ALLOW_PROTECTED=1`.
2. **ESLint** sur les fichiers stagés : zéro erreur tolérée.

### 3.2 `commit-msg` (local)
Si le commit modifie des fichiers protégés, le message **doit** contenir le marqueur :

```
[MODIF-PROTEGEE] <justification claire>
```

→ Double confirmation (variable d'environnement **et** marqueur), et **traçabilité
permanente** dans l'historique : `git log --grep="MODIF-PROTEGEE"` liste toutes les
modifications volontaires jamais effectuées.

### 3.3 `pre-push` (local)
Dernière garde avant publication :
1. **Audit des commits sortants** : rattrape les commits faits avec `--no-verify` —
   tout commit touchant le périmètre sans marqueur bloque le push.
2. **Intégrité du worktree** : aucun fichier scellé divergent.
3. **Typecheck « ratchet »** : le nombre d'erreurs TypeScript dans `src/` ne peut pas
   dépasser `protection/typecheck-baseline.txt` (actuellement 3 erreurs historiques
   connues — voir le fichier).

### 3.4 CI « VibeSync Guard » (GitHub Actions)
Rejoue côté serveur, sur chaque push et PR : intégrité du scellé (y compris le
refus des fichiers non scellés du périmètre), audit des marqueurs, lint,
typecheck ratchet. **C'est la seule couche réellement incontournable** — d'où
l'importance du §4 ci-dessous.

---

## 4. ⚠️ À faire UNE FOIS sur GitHub (5 minutes, indispensable)

Les réglages serveur ne peuvent être activés que par le propriétaire du dépôt
(`Settings` du repo) — personne d'autre, aucun script ne peut le faire à sa place :

1. **Settings → General → Danger Zone** :
   - ne **jamais** permettre le force-push sur `main` (`Do not allow force pushes`).
2. **Settings → Branches → Add branch ruleset** (ou « Add rule ») pour `main` :
   - ☑ `Require a pull request before merging`
     - ☑ `Require approvals: 1` (minimum)
     - ☑ `Require review from Code Owners` (grâce à `.github/CODEOWNERS`)
   - ☑ `Require status checks to pass before merging`
     - ajouter le check **« VibeSync Guard »** (il apparaît après le premier push
       de cette CI — attendez son premier run puis revenez l'activer)
   - ☑ `Block force pushes`
   - ☑ `Restrict deletions`
3. **Settings → Actions → General** : s'assurer que les workflows du dépôt
   (`Require approval for all outside collaborators` au minimum) sont protégés.

Sans ces réglages, un push direct sur `main` reste techniquement possible pour le
propriétaire — la CI le signalera quand même en échec, mais après coup.

---

## 5. 🔓 Modifier légitimement une fonctionnalité (procédure de déblocage)

Seulement sur **demande explicite** du propriétaire (« change X », « corrige Y ») :

```bash
# 1. Apportez votre modification au(x) fichier(s) protégé(s)
# 2. Stagez puis committez avec le double signal explicite :
git add <fichiers>
VIBESYNC_ALLOW_PROTECTED=1 git commit -m "[MODIF-PROTEGEE] <justification précise>"
```

Puis, selon le cas :
- **Correction ponctuelle d'un fichier existant** : c'est tout. Le push passera
  (l'audit verra le marqueur) mais **la CI d'intégrité échouera** jusqu'au re-scellé —
  c'est voulu : elle vous rappelle que le baseline doit être validé.
- **Nouvelle fonctionnalité / changement accepté définitivement** : re-scellez pour
  faire de l'état actuel la nouvelle référence :

```bash
bun run protection:lock -- --je-confirme   # régénère le manifeste (action explicite)
git add protection/integrity.manifest.json
git commit -m "🔐 Re-scellage post-évolution : <fonctionnalité>"
git push
```

Le script `lock` affiche toujours **la liste exacte** de ce qui va être scellé,
re-scellé ou retiré avant d'écrire — lisez-la attentivement.

> 💡 **Agents IA / développeurs**: si un `commit` est bloqué et que vous n'avez **pas**
> de demande explicite du propriétaire, la bonne action est de **restaurer** :
> `git restore --staged <fichiers> && git checkout -- <fichiers>`. Ne cherchez pas
> à contourner (`--no-verify`, édition du manifeste à la main…) : la CI vous rattrapera
> et l'incident sera visible dans l'historique.

---

## 6. Ajouter une nouvelle fonctionnalité (workflow nominal)

C'est le chemin prévu pour faire grandir l'app — chaque étape reste sous contrôle :

1. Développez dans de **nouveaux fichiers** (composants, routes, libs…). Tant qu'ils
   ne sont pas scellés, tout commit qui les contient est bloqué avec le statut
   ➕ **NON SCELLÉ** — c'est voulu : rien n'entre dans `src/` sans être tracé.
2. Si vous devez **modifier un fichier existant**, appliquez la procédure §5.
3. Une fois la fonctionnalité validée :
   - déclarez-la dans `protection/features.json` + `docs/FEATURES.md`
     (fichiers protégés → procédure §5),
   - scellez les nouveaux fichiers : `bun run protection:lock -- --je-confirme`,
   - livrez le tout dans un commit unique portant le marqueur :
     `VIBESYNC_ALLOW_PROTECTED=1 git commit -m "[MODIF-PROTEGEE] Nouvelle fonctionnalité : <nom>"`.

**Règle d'or : toute PR/commit qui modifie `src/**`, `prisma/**` ou la config
critique sans marqueur `[MODIF-PROTEGEE]` est un incident, pas un détail.**

---

## 7. Cartographie du système de protection

| Fichier | Rôle |
|---|---|
| `protection/config.json` | Périmètre protégé (globs) — protégé lui-même |
| `protection/features.json` | Registre machine des fonctionnalités ↔ fichiers |
| `protection/integrity.manifest.json` | **Le scellé** : SHA-256 de chaque fichier protégé |
| `protection/verify.mjs` | Vérification (worktree / stagé / audit de plage git) |
| `protection/lock.mjs` | Re-scellé explicite du manifeste |
| `protection/install.sh` | Active les hooks (`git config core.hooksPath githooks`) |
| `protection/typecheck-baseline.txt` | Seuil d'erreurs TS toléré (ratchet) |
| `githooks/pre-commit` | Bloque les commits non autorisés + lint |
| `githooks/commit-msg` | Exige le marqueur `[MODIF-PROTEGEE]` |
| `githooks/pre-push` | Audit des commits + intégrité + typecheck |
| `.github/workflows/guard.yml` | CI serveur — la garde incontournable |
| `.github/CODEOWNERS` | Exige la review du propriétaire sur les chemins protégés |
| `.github/pull_request_template.md` | Force la déclaration d'intention |
| `docs/FEATURES.md` | Registre humain des fonctionnalités |
| `AGENTS.md` | Règles de conduite des agents IA |

Après un **clone frais** : `bun install && bun run protection:install`.

---

## 8. FAQ

**Q. J'ai un nouveau fichier dans `src/` — pourquoi le commit est bloqué
avec « NON SCELLÉ » ?**
R. C'est la protection des fonctionnalités **futures** : rien n'entre dans le
périmètre sans être déclaré. Terminez la fonctionnalité, déclarez-la
(`protection/features.json` + `docs/FEATURES.md`), scellez
(`bun run protection:lock -- --je-confirme`) et livrez avec le marqueur
`[MODIF-PROTEGEE]` (§6).

**Q. Le manifeste peut-il être falsifié pour masquer une modification ?**
R. Modifier `protection/integrity.manifest.json` à la main est possible localement,
mais ce fichier est versionné : toute divergence avec la version validée sur GitHub
apparaît dans le diff de la PR, et la CI compare le code au manifeste **du dépôt**.
La falsification exige donc de pousser un manifeste différent — visible dans
l'historique et soumis aux règles de branche.

**Q. `git commit --no-verify` ?**
R. Passe localement, mais le `pre-push` audite les commits et la CI rejoue tout
côté serveur. Le contournement laisse des traces.

**Q. Pourquoi 3 erreurs TypeScript sont-elles tolérées ?**
R. Elles préexistent au blindage (voir `protection/typecheck-baseline.txt`). Les faire
disparaître est une amélioration bienvenue ; en créer de nouvelles est interdit.

**Q. Les hooks ne se déclenchent pas chez moi.**
R. Lancez `bun run protection:install` (à faire une fois par clone). Vérifiez avec
`git config core.hooksPath` → doit répondre `githooks`.
