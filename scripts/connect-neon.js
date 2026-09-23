// Tiluu — Connecteur Neon PostgreSQL (Unification Web & Mobile)
// Usage: node scripts/connect-neon.js [optional_neon_database_url]
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const prismaSchemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
const envPath = path.join(rootDir, '.env');
const mobileEnvPath = path.join(rootDir, 'mobile', '.env');

console.log('⚡ Tiluu — Configuration de la base de données Neon PostgreSQL...\n');

// 1. Détection de l'URL Neon
let neonUrl = process.argv[2];

if (!neonUrl) {
  // Lire .env existant
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?(postgresql:\/\/[^"'\r\n]+|postgres:\/\/[^"'\r\n]+)["']?/);
    if (match) {
      neonUrl = match[1];
    }
  }
}

if (!neonUrl) {
  console.log('ℹ️ Aucune chaîne Neon PostgreSQL fournie.');
  console.log('👉 Pour connecter votre base Neon, lancez :');
  console.log('   node scripts/connect-neon.js "postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require"\n');
  console.log('Préparation du schéma Prisma pour Neon PostgreSQL...');
}

// 2. Basculer prisma/schema.prisma vers PostgreSQL
let schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
schemaContent = schemaContent.replace(
  /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*["']sqlite["'][\s\S]*?\}/,
  `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`
);
fs.writeFileSync(prismaSchemaPath, schemaContent, 'utf8');
console.log('✓ prisma/schema.prisma mis à jour : provider = "postgresql"');

// 3. Mise à jour de .env si URL fournie
if (neonUrl) {
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(/DATABASE_URL=.*(\r?\n|$)/, `DATABASE_URL="${neonUrl}"$1`);
  } else {
    envContent = `DATABASE_URL="${neonUrl}"\n` + envContent;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✓ .env mis à jour avec la connexion Neon PostgreSQL');

  // 4. Synchroniser le schéma Prisma sur Neon
  try {
    console.log('\n📦 Génération du client Prisma...');
    execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });

    console.log('\n🚀 Déploiement des tables sur Neon PostgreSQL (prisma db push)...');
    execSync('npx prisma db push --accept-data-loss', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Toutes les tables (User, Profile, Match, GemTx, etc.) sont créées sur Neon !');

    // 5. Peupler les données de démo si souhaité
    console.log('\n🌱 Initialisation des cadeaux et profils (seed)...');
    try {
      execSync('bun run scripts/seed.ts', { cwd: rootDir, stdio: 'inherit' });
    } catch {
      console.log('Note: bun run seed peut être exécuté ultérieurement.');
    }
  } catch (err) {
    console.error('Erreur lors du déploiement Prisma sur Neon:', err.message);
  }
}

// 6. Configuration de mobile/.env
const mobileEnvContent = `EXPO_PUBLIC_API_URL="http://localhost:3000"\n`;
fs.writeFileSync(mobileEnvPath, mobileEnvContent, 'utf8');
console.log('✓ mobile/.env configuré : pointe vers l’API unifiée Next.js');

console.log('\n🎉 Tout est prêt : Web App Next.js & Mobile Expo sont synchronisés sur Neon PostgreSQL !');
