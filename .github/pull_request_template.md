<!--
Modèle de pull request VibeSync — à remplir explicitement.
Toute PR modifiant des fichiers protégés (voir PROTECTION.md) sera bloquée
par la CI « VibeSync Guard » si l'intention n'est pas clairement déclarée.
-->

## 🎯 Objet de la PR

<!-- Décrivez précisément ce que fait cette PR. -->

## 🛡️ Impact sur les fonctionnalités protégées

<!-- OBLIGATOIRE — cochez la case qui correspond -->

- [ ] **Aucune** : cette PR ne modifie aucun fichier scellé (nouveaux fichiers uniquement, ou fichiers hors périmètre).
- [ ] **Oui, modification volontaire** : cette PR modifie des fichiers protégés **à la demande explicite du propriétaire**.
  - Lien vers la demande / issue / conversation : <!-- ... -->
  - Fonctionnalités impactées (voir docs/FEATURES.md) : <!-- ... -->
  - Tous les commits concernés portent le marqueur `[MODIF-PROTEGEE]` : <!-- [ ] -->
  - Le manifeste a été re-scellé volontairement (`bun run protection:lock -- --je-confirme`) si nécessaire : <!-- [ ] -->

## ✅ Checklist qualité

- [ ] `bun run lint` passe sans erreur.
- [ ] Aucune régression TypeScript (baseline : `protection/typecheck-baseline.txt`).
- [ ] `node protection/verify.mjs` passe localement.
- [ ] Testé manuellement sur la/les page(s) concernée(s).

## 📸 Captures / preuves (si UI)

<!-- Avant / après pour tout changement visuel. -->
