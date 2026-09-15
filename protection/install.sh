#!/bin/bash
# ============================================================================
# VibeSync Protection — installation des gardes locales
# ----------------------------------------------------------------------------
# Active les hooks git versionnés du dépôt (githooks/) via core.hooksPath,
# puis affiche l'état du blindage. À lancer après chaque clone frais :
#
#   bun run protection:install
#
# Les hooks ne pouvant pas être versionnés dans .git/hooks nativement,
# ce mécanisme (core.hooksPath) garantit que TOUT le monde qui clone le dépôt
# utilise exactement les mêmes gardes, versionnées et protégées elles-mêmes.
# ============================================================================
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "❌ Pas un dépôt git — lancez ce script depuis le repo VibeSync."
  exit 1
}

echo "🛡️  Installation de la protection VibeSync…"

if [ ! -d githooks ]; then
  echo "❌ Dossier githooks/ introuvable."
  exit 1
fi

chmod +x githooks/pre-commit githooks/commit-msg githooks/pre-push 2>/dev/null || true
git config core.hooksPath githooks
echo "   ✓ Hooks activés (core.hooksPath = githooks) : pre-commit, commit-msg, pre-push"

if [ ! -f protection/integrity.manifest.json ]; then
  echo "   ⚠️  Aucun manifeste d'intégrité trouvé."
  echo "     Première initialisation du scellé :"
  echo "       bun run protection:lock -- --je-confirme"
else
  echo "   ✓ Manifeste d'intégrité présent"
fi

echo ""
node protection/verify.mjs --status 2>/dev/null || true
echo ""
echo "ℹ️  Rappel — pour modifier légitimement une fonctionnalité protégée :"
echo "     VIBESYNC_ALLOW_PROTECTED=1 git commit -m \"[MODIF-PROTEGEE] justification\""
echo "    Documentation complète : PROTECTION.md"
