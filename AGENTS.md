<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🛡️ RÈGLES DE PROTECTION VIBESYNC — OBLIGATOIRES POUR TOUT AGENT IA

Ce dépôt est **blindé** (lire [`PROTECTION.md`](./PROTECTION.md) en premier).
Les fonctionnalités implémentées — référencées dans
[`docs/FEATURES.md`](./docs/FEATURES.md) et scellées dans
`protection/integrity.manifest.json` — ne doivent **jamais** être modifiées,
supprimées ou contournées sans demande explicite du propriétaire.

1. **Ne modifie aucun fichier scellé** sans instruction explicite de l'utilisateur
   portant sur cette modification précise. En cas de doute : demander, ne pas faire.
2. **Vérifie avant d'agir** : `node protection/verify.mjs` doit rester vert.
   S'il est rouge et que vous n'avez rien demandé d'explicite : restaurez
   (`git checkout -- <fichiers>`), ne « réparez » pas.
3. **Nouvelles fonctionnalités** : créez de nouveaux fichiers (le commit sera bloqué
   « NON SCELLÉ » tant qu'ils ne sont pas déclarés), déclarez-les dans
   `protection/features.json` + `docs/FEATURES.md`, puis scellez
   (`bun run protection:lock -- --je-confirme`) une fois validé.
4. **Commit touchant le périmètre protégé** (uniquement sur demande explicite) :
   `VIBESYNC_ALLOW_PROTECTED=1 git commit -m "[MODIF-PROTEGEE] justification"`.
5. **Ne contourne jamais** la protection : pas de `--no-verify`, pas d'édition
   manuelle du manifeste, pas de suppression de hooks. La CI serveur détecte tout
   contournement et l'incident reste dans l'historique.
6. **Après un clone frais** : `bun install && bun run protection:install`.

Rappel stack : Next.js 16 App Router · TypeScript strict · Prisma (Neon
PostgreSQL) · Tailwind 4 + shadcn/ui · Framer Motion · z-ai-web-dev-sdk côté
serveur uniquement.
