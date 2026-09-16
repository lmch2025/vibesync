import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Résout l'URL PostgreSQL effective pour la datasource `db`.
 *
 * Contexte : certains environnements d'exécution (sandbox/CI) injectent une
 * variable `DATABASE_URL` dans l'environnement du processus, et Next.js donne
 * priorité aux variables existantes sur le fichier `.env`. Si la valeur injectée
 * n'est pas une URL PostgreSQL, on retombe sur celle déclarée dans le `.env`
 * du projet (fichier ignoré par git — aucun secret n'est embarqué dans le code).
 */
function resolveDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL
  if (envUrl && (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://'))) {
    return envUrl // URL PostgreSQL valide déjà présente dans l'environnement
  }
  // Repli 1 : lire DATABASE_URL (PostgreSQL) dans le .env du projet.
  // Repli 2 : .env.neon — copie de secours que la sandbox ne réécrit PAS
  //   (la sandbox réinitialise périodiquement .env vers une URL SQLite,
  //   ce qui cassait le serveur à chaque redémarrage à chaud).
  for (const file of ['.env', '.env.neon']) {
    try {
      const envFile = readFileSync(join(process.cwd(), file), 'utf8')
      const match = envFile.match(/^DATABASE_URL=["']?(postgresql:\/\/[^"'\r\n]+)["']?\s*$/m)
      if (match) return match[1]
    } catch {
      // fichier absent ou illisible : essayer le suivant
    }
  }
  return undefined
}

const databaseUrl = resolveDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  (databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
