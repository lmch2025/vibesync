# 📋 REGISTRE DES FONCTIONNALITÉS VIBESYNC

> **Source de vérité** de l'inventaire fonctionnel de l'application, établi par
> analyse exhaustive du code au moment du blindage (voir `PROTECTION.md`).
> Version machine (fichiers ↔ fonctionnalités, utilisée par les outils de
> protection) : `protection/features.json`.
>
> Ce fichier est **protégé** : toute évolution du registre est une modification
> volontaire (`[MODIF-PROTEGEE]`).

**Application monopage** (route unique `/`) à 3 vues commutées côté client via
Zustand : `landing` / `app` / `admin`. Backend : routes API sous `/api/vibe/**`
avec Prisma (Neon PostgreSQL). Auth custom par cookie httpOnly.

---

## ✅ Fonctionnalités implémentées

### 1. Authentification téléphone + PIN (`auth-tel-pin`)
Flux « phone-first » : sélection du code pays, saisie du numéro, vérification
d'existence du compte, puis création de PIN (create + confirm) ou login par PIN.
Bonus de bienvenue de 25 Vibes à l'inscription. Session cookie httpOnly 30 j,
support headers mobile (`Authorization: Bearer` / `x-vibe-session`).
- **Fichiers** : `auth-modal.tsx`, `app/auth-screen.tsx`, `lib/vibe/session.ts`,
  `lib/vibe/country-codes.ts`
- **API** : `POST /auth/check-phone`, `POST /auth/register`, `POST /auth/login`,
  `POST /auth/logout`, `GET /me`
- ⚠️ *Nota* : hash PIN réversible (démo sandbox) ; l'écran `auth-screen.tsx`
  référence une route OTP inexistante (voir « Trous connus »).

### 2. Connexion admin démo (`demo-admin-login`)
Raccourci sandbox : loggue en tant que premier `role=admin` trouvé en base, pour
rendre le dashboard accessible depuis le bouton « Admin » de la landing.
- **API** : `POST /auth/demo-admin` — explicitement non-production.

### 3. Orchestration des vues (`orchestration-vues`)
`page.tsx` (Server Component) lit le cookie de session, pré-charge utilisateur +
taux de change, choisit la vue initiale. `client-page.tsx` monte le shell
correspondant, détecte la devise, charge les rates. Splash anti-flash « VS ».
- ⚠️ *Nota* : comparaison `role === "ADMIN"` (majuscules) alors que la base
  contient `"admin"` — un admin retombe sur la vue `app` au refresh (bug connu).

### 4. Onboarding 4 étapes (`onboarding-3-etapes`)
Tunnel immersif : pseudo/genre/recherche → âge + ville (recherche prédictive sur
~130 villes, sélection obligatoire) → type de relation → vidéo optionnelle.
Crée le `Profile`, passe `onboardingComplete=true`, `modStatus=pending` si vidéo.
- **API** : `POST /onboarding`, `GET /cities?q=`

### 5. Vidéos de profil 15 s — 3 slots (`video-profil-15s`)
Jusqu'à 3 vidéos par profil. Compression client (canvas + MediaRecorder WebM,
config admin : 480 px, qualité, 15 s max, poster JPEG) OU poster seul + original.
Upload direct navigateur→Cloudinary (preset non-signé, progression octets réels),
fallback base64 si Cloudinary injoignable. Trim 15 s et poster par transformation
d'URL Cloudinary (`eo_15`, `so_1,f_jpg`). Remplacement/suppression par slot.
- **API** : `POST /profile/video`, `DELETE /profile/video?slot=`,
  `POST /upload`, `GET /video-config`

### 6. Deck de swipe (`swipe-deck`)
Cartes empilées draggables (physique spring Framer Motion), tampons LIKE/NOPE/
SUPER, badge vérifié, vidéo autoplay avec poster — carte épurée (l'overlay Vibe
Check a été retiré pour laisser la vidéo respirer). Barre d'actions : Rewind (2),
Pass, Cadeau, Like (Super-Like via geste ⬆️ ; actions premium via le bouton 👑
Premium du header, contextuel à la carte du dessus). Deck : 12 profils
`approved` non swipés. Match réciproque détecté + simulation sandbox (~45 %,
70 % super-like) faute de réciprocité réelle.
- **API** : `GET /profiles/deck`, `POST /swipe`

### 7. Vibe Check (`vibe-check`)
5 questions binaires tirées par session, champs `vibeQuestion/vibeAnswer` sur le
profil. L'overlay sur carte a été retiré (vidéo dégagée) : la compatibilité
alimente désormais les recommandations contextuelles (nudges Super-Like /
compatibilité / Rewind-rescue).
- ⚠️ Affichage client uniquement — le filtrage serveur « réponse partagée
  requise pour se voir » n'est pas implémenté (trou connu).

### 8. Messagerie anti-spam (`messagerie-anti-spam`)
Chat par match style WhatsApp. L'initiateur peut envoyer au maximum
`maxMessagesBeforeReply` (setting admin, défaut 3) messages tant que le receveur
n'a pas répondu — ensuite 403 « Anti-spam ». Première réponse = déverrouillage
définitif. Accusés de lecture. Timeline fusionnée messages + cadeaux. Liste des
matchs triée par dernière activité, priorité 2 h aux messages boostés.
- **API** : `GET /matches`, `GET|POST|PATCH /matches/[id]/messages`

### 9. Notes vocales (`messages-vocaux`)
Enregistrement MediaRecorder avec waveform live, timer, annulation ; lecture avec
progression et marquage « écouté ». Les vocaux ne comptent pas dans le quota
anti-spam. Sélecteur d'emojis (84, 5 catégories).
- ⚠️ Audio stocké base64 en DB (sandbox).

### 10. Cadeaux virtuels (`cadeaux-virtuels`)
Catalogue (8 constants + 10 seedés). Envoi avec note optionnelle. **Règle
critique : seules les Vibes ACHETÉES financent les cadeaux** (`gems - freeGems ≥
coût`), commission plateforme (30 % défaut), crédit wallet € du receveur. Cadeau
« emballé », révélation au tap (animation 3 phases + confetti).
- **API** : `POST /matches/[id]/gift`, `GET /gifts`, `POST /gifts/[id]/open`

### 11. Partage social (`partage-social`)
Carte de partage premium post-ouverture de cadeau (WhatsApp, Facebook, X, copie
de lien). Modale de parrainage (+10 Vibes promises) après claim de streak.
- ⚠️ UI seulement — aucun tracking de parrainage (trou connu).

### 12. Économie de Vibes (`economie-vibes`)
`User.gems` (total) + `User.freeGems` (gratuites — inutilisables pour les
cadeaux). 3 packs avec prix fixes par devise (tiers style App Store). Achat
simulant un webhook Stripe : crédite, journalise la GemTx (montant payé), notifie.
Modale « Plus assez de Vibes » recommandant le plus petit pack suffisant et
**relançant l'action premium en attente** après achat.
- **API** : `GET /gem-packs`, `POST /gems/purchase`, `POST /gems/spend`
- ⚠️ Paiement simulé (sandbox).

### 13. Actions premium (`actions-premium`)
17 actions : Super-Like 5, Rewind 2, Boost 50, Passport 30, Icebreaker IA 3
(LLM z-ai-web-dev-sdk), Voir les likes 20, Boost message 10, Projecteur 40,
Super Rewind 15, Vibe Radar 25, Crush Alert 35, Cœur d'Or 60, Temps Gelé 45,
Rapport Compatibilité 20, Anneau d'Humeur 15, Mode Fantôme 35, Double
Quotidien 10. Bottom-sheet par catégorie + modale de résultat.
- ⚠️ Effets hétérogènes : certains réels en DB, d'autres simulés.

### 14. Buffs actifs (`buffs-actifs`)
Route listant les buffs actifs avec temps restant/progression (boost via table
`Boost`, ghostMode/spotlight via colonnes User). Hook polling 15 s + event
`vivilov:buff-activated`. Anneaux SVG avec gradient, rouge pulsant sous 60 s.
- ⚠️ La section UI `active-buffs-section.tsx` n'est pas branchée (orpheline).

### 15. Wallet & retraits (`wallet-retraits`)
Onglet « Gains » : solde cadeaux en devise locale, progression vers le seuil
(20 € défaut), explication commission. Modale de retrait 5 étapes ; montant débité
immédiatement (escrow), `Withdrawal` créée `pending`. Onglet « Historique » :
transactions fusionnées (Vibes, cadeaux, retraits).
- **API** : `GET|POST /wallet/withdraw`, `GET /wallet/transactions`
- ⚠️ Aucun traitement admin des demandes ; Stripe Connect simulé (trou connu).

### 16. Streak quotidien (`streak-quotidien`)
Récompense jour N = N×2 Vibes (plafond 20), reset si jour manqué, `streakMax`.
Auto-ouverture de la modale (1×/session) si réclamable, barre 7 jours,
animation + confetti, enchaînement parrainage. Les Vibes de streak sont des
freeGems. « Double Quotidien » premium = re-claim doublé.
- **API** : `GET|POST /streak`

### 17. Notifications in-app (`notifications-inapp`)
Table `Notification` typée (match, gift, message, like, superlike, streak,
boost_expired, marketing, system, withdrawal). Librairie serveur centralisée.
Cloche avec badge pulsant, polling 30 s, bottom-sheet, marquage lu.
- **API** : `GET|POST /notifications`

### 18. Préférences de notifications (`parametres-notifications`)
5 interrupteurs (matchs, messages, cadeaux, likes, marketing — opt-out RGPD),
persistés en JSON dans `Setting` (`notif_prefs_{userId}`). Permission navigateur
+ bouton « Tester ».
- ⚠️ UI orpheline ; le bouton Test appelle une route inexistante (trou connu).

### 19. Web Push (`push-web`)
Prompt d'opt-in élégant (après 4 s, 1×/session, max 2 rejets), permission,
enregistrement `/sw.js`, souscription VAPID, upsert dans `Setting`.
- **API** : `GET /push/vapid-key`, `POST|DELETE /push/subscribe`
- ⚠️ Aucun envoi serveur ; `sw.js` absent de `public/` (trou connu).

### 20. PWA (`pwa`)
Manifest « Vivilov » (standalone, portrait, icônes maskable, thème #6b32c4).
Prompt d'installation (Chromium + instructions iOS/Android, max 3 rejets).
Layout avec OpenGraph, Twitter card, JSON-LD (SoftwareApplication, Organization,
FAQPage).
- ✅ `icon-192.png` / `icon-512.png` générées (gradient violet→rose + monogramme
  VS) et versionnées — le manifest ne 404 plus.
- ⚠️ `sw.js` reste absent de `public/` (trou connu).

### 21. Multi-devises (`multidevise`)
Détection pays via `x-vercel-ip-country` (défaut CM→XAF), mapping pays→devise
(EUR/USD/GBP/CAD/XAF/JPY). Taux en DB avec fallback constants. Sélecteur manuel
persisté. Formatage hydration-safe (symboles custom). Prix packs = tiers fixes
par devise ; valeur cadeaux/wallet convertie dynamiquement.
- **API** : `GET /detect`, `GET /rates`, `POST /currency`
- ⚠️ Taux seedés statiques — le cron de rafraîchissement quotidien n'existe pas.

### 22. Complétion de profil (`profil-completion`)
12 tâches (compte, profil, vidéo, vignette, bio ≥ 10, ville, âge, sexe,
recherche, vibe, vérifié, streak). Anneau SVG gradient + count-up + chips
cliquables avec édition inline (`PATCH /profile`) ou upload vidéo. Confetti à
100 %.
- **API** : `GET /completion-rate`, `GET|PATCH /profile`
- ⚠️ `verified` auto-attribuable par l'utilisateur (trou démo).

### 23. Dashboard admin (`admin-dashboard`)
Réservé `role=admin`. **Vue d'ensemble** : 13 KPI + graphiques Recharts (revenu,
rétention et cadeaux 7 j — séries synthétiques). **Utilisateurs** : recherche,
rôles, soldes. **Modération** : file de signalements, approbation/suppression
(`modStatus`). **Cadeaux** : CRUD complet. **Analytics** : mini-KPIs + grille
taraire multi-devises. **Paramètres** : radius, limite anti-spam, commission,
seuil de retrait, Vibes de bienvenue, config vidéo — avec cache invalidé.
- **API** : `GET /admin/stats`, `GET /admin/users`, `GET|POST /admin/reports`,
  `GET|POST /admin/gifts`, `PUT|DELETE /admin/gifts/[id]`, `GET|PUT /admin/settings`

### 24. Landing immersive (`landing-immersive`)
Plein écran non scrollable : vidéo de fond (respect data-saver), Ken Burns,
vignette, titre « Vivilov » avec glow, pills de features, preuve sociale, CTA
shimmer, bouton Admin discret. Ouvre la modale d'auth.

### 25. Landing marketing — héritée (`landing-marketing-legacy`)
Landing longue complète (nav, hero avec démo swipe auto dans maquette téléphone,
stats count-up, 3 étapes, 6 features, showcase Vibe Check, pricing, multi-devises,
FAQ accordéon, CTA final, footer, typewriter). **Non routée** (remplacée par
l'immersive) — conservée volontairement comme code mort documenté.

### 26. Animations transverses (`animations-transverses`)
Variants motion, wrappers (PulseGlow, Shimmer, Floating, SuccessBounce,
TabIndicator), AnimatedNumber, haptique mobile, ConfettiBurst, presets toast +
`center-feedback.tsx` : retours d'action élégants — carte glass centrée (emoji +
titre + sous-titre, auto-dismiss, pointer-events-none) via `vibeToast()`,
remplace les toasts de succès qui obstruaient le header (Sonner repositionné
sous le header pour les infos/erreurs).

### 27. Socle technique (`socle-transverse`)
Store Zustand global (vue, `me`, rates, devise, machinerie `requireVibes`),
session, constants (source de vérité économie), settings DB avec cache, notify,
singleton PrismaClient, `cn()`, hooks shadcn, design system CSS
(`globals.css` : vibe-gradient, glass-dark, ken-burns, scrollbar-vibe…), 48
composants shadcn/ui.

### 28. Schéma de données (`schema-donnees`)
Prisma/Neon PostgreSQL : `User`, `Profile`, `Swipe`, `Match`, `Message`, `Gift`,
`GiftTx`, `GemTx`, `Boost`, `VideoReport`, `ExchangeRate`, `Setting`,
`Withdrawal`, `Notification`. Seeds : `scripts/seed.ts` (principal) et
`prisma/seed.js` (alternatif) — ⚠️ valeurs partiellement contradictoires.

---

## 🔍 Trous connus (prévu au cahier des charges, absent du code)

À traiter comme **fonctionnalités futures** — toute implementation devra suivre
le workflow du §6 de `PROTECTION.md` :

1. **OTP SMS réel** (Twilio/MessageBird) — `auth-screen.tsx` appelle une route
   inexistante ; seule la modale sans OTP fonctionne.
2. **Envoi Web Push serveur** (lib web-push) + `sw.js` + icônes PWA dans `public/`.
3. **Filtrage géographique Haversine** du deck + effet réel du Passport.
4. **Filtrage serveur Vibe Check** (visibilité mutuelle conditionnée à la réponse).
5. **Effet Boost sur le tri du deck.**
6. **Traitement admin des retraits** (pending→processing→completed/rejected) et
   **ban/unban** utilisateur côté admin.
7. **Paiement Stripe réel** (checkout + webhook signé) et **Stripe Connect**.
8. **Signalement utilisateur de vidéos** (`VideoReport source:"user"`).
9. **Parrainage tracké** (+10 Vibes attribuées).
10. **Temps réel** (websocket) — `examples/websocket/` non branché.
11. **Modération IA des vidéos** (Cloudinary/AWS Rekognition).
12. **i18n** (next-intl installé, app 100 % FR en dur).
13. **Vérification d'identité réelle** du badge vérifié.
14. **Cron de rafraîchissement des taux** (Open Exchange Rates).
15. Composants orphelins à brancher : `notification-settings.tsx`,
    `active-buffs-section.tsx`, `action-success-modal.tsx`,
    `upload-progress-ring.tsx`, landing legacy.

---

*Dernière mise à jour du registre : lors de la mise en place du blindage
(`protection/integrity.manifest.json` — voir la date dans le manifeste).*
