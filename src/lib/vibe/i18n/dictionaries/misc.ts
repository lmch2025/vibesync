// Dictionnaire « misc » — coquille de l'app (app-demo : nav basse, redirects),
// notifications (cloche, réglages, prompts de permission), installation PWA.
// Règles :
//  - Préfixe "app." pour app-demo.tsx, "misc." pour tout le reste.
//  - Les objets fr et en ont EXACTEMENT les mêmes clés.
//  - Interpolation : {{param}} (ex "misc.gemsLeft": "Il te reste {{n}} Vibes").
//  - Pluriels : clés distinctes ".one" / ".many".
import { defineDict } from "./shared";

export const misc = defineDict(
  {
    // ── app-demo — coquille + nav basse ────────────────────────────────────
    "app.nav.discover": "Découvrir",
    "app.nav.matches": "Matchs",
    "app.nav.shop": "Boutique",
    "app.nav.profile": "Profil",
    "app.premium": "Premium",
    "app.premiumAria": "Actions premium",
    "app.vibesToastTitle": "Plus assez de Vibes",
    "app.vibesMissing":
      "Il te manque {{missing}} — {{action}} reprendra après recharge ✨",
    "app.vibesMissingFallback": "cette action",

    // ── Cloche à notifications (notification-bell) ─────────────────────────
    "misc.bellAria": "Notifications",
    "misc.title": "Notifications",
    "misc.empty": "Aucune notification",
    "misc.markAllRead": "Tout marquer comme lu",
    "misc.time.now": "à l'instant",
    "misc.time.min": "il y a {{n}} min",
    "misc.time.hour": "il y a {{n}} h",

    // ── Réglages notifications (notification-settings) ─────────────────────
    "misc.pushTitle": "Push navigateur",
    "misc.permGranted": "✅ Accordé",
    "misc.permDenied": "❌ Refusé",
    "misc.permUnsupported": "Non supporté",
    "misc.permToAsk": "À demander",
    "misc.allow": "Autoriser",
    "misc.test": "Tester",
    "misc.enabledToast": "Notifications activées",
    "misc.testSentTitle": "Test envoyé",
    "misc.testSentSub": "Vérifie tes notifications",
    "misc.testFailed": "Test échoué",
    "misc.catMatches": "Matchs",
    "misc.catMatchesDesc": "Nouveau match mutuel",
    "misc.catMessages": "Messages",
    "misc.catMessagesDesc": "Quelqu'un t'écrit",
    "misc.catGifts": "Cadeaux",
    "misc.catGiftsDesc": "Tu reçois un cadeau",
    "misc.catLikes": "Likes",
    "misc.catLikesDesc": "Quelqu'un t'a liké",
    "misc.catMarketing": "Marketing",
    "misc.catMarketingDesc": "News, promos, nouveautés",

    // ── Prompt d'activation des notifications ──────────────────────────────
    "misc.catStreak": "Série",
    "misc.catStreakDesc": "Rappel streak quotidien",
    "misc.permPrevMatches": "Nouveau match immédiat",
    "misc.permTitle": "Reste connecté·e",
    "misc.permBody":
      "Active les notifications pour ne rien manquer de tes rencontres. On ne spamme jamais — promis.",
    "misc.permActivating": "Activation…",
    "misc.permEnable": "Activer les notifications",
    "misc.later": "Plus tard",

    // ── Prompt d'installation PWA ──────────────────────────────────────────
    "misc.pwaTitle": "Installe Vivilov",
    "misc.pwaBody":
      "Lance-toi en 1 tap — pas de store, pas d'attente. Ton app plein écran, notifications incluses.",
    "misc.pwaIosShare": "Tape le bouton Partager",
    "misc.pwaIosHome": "Puis « Sur l'écran d'accueil »",
    "misc.pwaAndroidMenu": "Menu ⋮ → Installer l'application",
    "misc.pwaDesktop": "Icône d'installation dans la barre d'adresse",
    "misc.pwaInstallNow": "Installer maintenant",
    "misc.pwaGotIt": "J'ai compris",
  },
  {
    // ── app-demo — app shell + bottom nav ──────────────────────────────────
    "app.nav.discover": "Discover",
    "app.nav.matches": "Matches",
    "app.nav.shop": "Shop",
    "app.nav.profile": "Profile",
    "app.premium": "Premium",
    "app.premiumAria": "Premium actions",
    "app.vibesToastTitle": "Not enough Vibes",
    "app.vibesMissing":
      "You're missing {{missing}} — {{action}} will resume after you recharge ✨",
    "app.vibesMissingFallback": "this action",

    // ── Notification bell (notification-bell) ──────────────────────────────
    "misc.bellAria": "Notifications",
    "misc.title": "Notifications",
    "misc.empty": "No notifications",
    "misc.markAllRead": "Mark all as read",
    "misc.time.now": "just now",
    "misc.time.min": "{{n}} min ago",
    "misc.time.hour": "{{n}} h ago",

    // ── Notification settings (notification-settings) ──────────────────────
    "misc.pushTitle": "Browser push",
    "misc.permGranted": "✅ Granted",
    "misc.permDenied": "❌ Denied",
    "misc.permUnsupported": "Not supported",
    "misc.permToAsk": "Not requested yet",
    "misc.allow": "Allow",
    "misc.test": "Test",
    "misc.enabledToast": "Notifications enabled",
    "misc.testSentTitle": "Test sent",
    "misc.testSentSub": "Check your notifications",
    "misc.testFailed": "Test failed",
    "misc.catMatches": "Matches",
    "misc.catMatchesDesc": "New mutual match",
    "misc.catMessages": "Messages",
    "misc.catMessagesDesc": "Someone messages you",
    "misc.catGifts": "Gifts",
    "misc.catGiftsDesc": "You receive a gift",
    "misc.catLikes": "Likes",
    "misc.catLikesDesc": "Someone liked you",
    "misc.catMarketing": "Marketing",
    "misc.catMarketingDesc": "News, promos, new features",

    // ── Notification opt-in prompt ─────────────────────────────────────────
    "misc.catStreak": "Streak",
    "misc.catStreakDesc": "Daily streak reminder",
    "misc.permPrevMatches": "Instant new match",
    "misc.permTitle": "Stay connected",
    "misc.permBody":
      "Turn on notifications so you never miss a thing from your matches. We never spam — promise.",
    "misc.permActivating": "Enabling…",
    "misc.permEnable": "Enable notifications",
    "misc.later": "Later",

    // ── PWA install prompt ─────────────────────────────────────────────────
    "misc.pwaTitle": "Install Vivilov",
    "misc.pwaBody":
      "Get started in one tap — no app store, no waiting. Your full-screen app, notifications included.",
    "misc.pwaIosShare": "Tap the Share button",
    "misc.pwaIosHome": "Then “Add to Home Screen”",
    "misc.pwaAndroidMenu": "Menu ⋮ → Install app",
    "misc.pwaDesktop": "Install icon in the address bar",
    "misc.pwaInstallNow": "Install now",
    "misc.pwaGotIt": "Got it",
  },
);
