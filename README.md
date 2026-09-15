# VibeSync 💜

**PWA mobile-first de rencontre par vidéo** : les photos de profil statiques sont
remplacées par des **vidéos de présentation de 15 secondes**. Freemium par Vibes
(gemmes, zéro abonnement), messagerie anti-spam à déblocage, cadeaux virtuels
monétisables en vie réelle, multi-devises, streak quotidien, dashboard admin.

> 📖 **Cahier des charges** : voir le document VibeSync (vision produit complète).
> 📋 **Fonctionnalités implémentées** : [`docs/FEATURES.md`](./docs/FEATURES.md)
> 🛡️ **Ce code est blindé** : [`PROTECTION.md`](./PROTECTION.md) — à lire avant
> toute contribution. Les fonctionnalités ne se modifient que sur demande
> explicite du propriétaire.

## Stack

Next.js 16 (App Router) · TypeScript · Prisma (Neon PostgreSQL) · Tailwind CSS 4 +
shadcn/ui · Framer Motion · Cloudinary (vidéos) · PWA.

## Démarrage

```bash
bun install
bun run db:generate      # client Prisma (aucune DB requise pour cette étape)
bun run protection:install  # 🛡️ active les hooks git de protection (après un clone frais)
bun run dev              # http://localhost:3000
```

### Variables d'environnement (`.env`, non versionné — voir `.env.example`)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Neon PostgreSQL (pooled / migrations) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Upload direct navigateur→Cloudinary |
| `CLOUDINARY_URL` ou `CLOUDINARY_CLOUD_NAME`+`_API_KEY`+`_API_SECRET` | Fallback upload serveur |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |

La landing est consultable sans base de données ; les fonctionnalités
(auth, swipe, chat, admin…) requièrent `DATABASE_URL`.

## Scripts utiles

| Commande | Description |
|---|---|
| `bun run dev` | Serveur de développement (port 3000) |
| `bun run lint` | ESLint (zéro erreur exigé par la CI) |
| `bun run db:push` / `db:generate` / `db:seed` | Prisma |
| `bun run protection:install` | Active les hooks git de protection |
| `bun run protection:verify` | Vérifie l'intégrité des fonctionnalités scellées |
| `bun run protection:status` | État du blindage (synthèse) |
| `bun run protection:lock` | Re-scelle le baseline (action explicite : `-- --je-confirme`) |

## Protection des fonctionnalités

Trois couches de défense : **hooks git locaux** (pre-commit / commit-msg /
pre-push), **CI GitHub Actions** (« VibeSync Guard »), et **conventions
traçables** (marqueur `[MODIF-PROTEGEE]`, CODEOWNERS, protection de branche).

Toute modification d'un fichier scellé exige :

```bash
VIBESYNC_ALLOW_PROTECTED=1 git commit -m "[MODIF-PROTEGEE] <justification>"
```

➡️ Procédure complète : [`PROTECTION.md`](./PROTECTION.md).
