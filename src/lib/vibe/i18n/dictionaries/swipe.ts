// Dictionnaire « swipe » — écran Découvrir + modales associées (Task 2-b).
// Règles :
//  - TOUTES les clés sont préfixées par "swipe." (ex "swipe.title").
//  - Les objets fr et en ont EXACTEMENT les mêmes clés.
//  - Interpolation : {{param}} (ex "swipe.rewind.sub": "{{name}} est de retour…").
//  - Pluriels : clés distinctes ".one" / ".many".
//  - fr = copie EXACTE du texte français d'origine ; en = traduction naturelle
//    (ton app de rencontre chaleureuse, tutoiement FR → "you" EN).
//  - Non traduit (marque) : Vivilov, Vibes, Super-Like, Passport, Boost,
//    Rewind, Icebreaker, Golden Heart, emojis, villes, contenus utilisateur.
import { defineDict } from "./shared";

export const swipe = defineDict(
  {
    // ── Barre du haut ────────────────────────────────────────────────────
    "swipe.title": "Découvrir",
    "swipe.loading": "Chargement des profils",
    "swipe.passport.chipAria": "Passport actif — afficher la destination",
    "swipe.passport.toastTitle": "✈️ Passport actif — tu découvres {{city}}",
    "swipe.passport.hoursLeft": " · encore {{n}} h",
    "swipe.passport.toastDesc":
      "Ta destination et son compte à rebours restent visibles dans Profil → Actions premium.",

    // ── Barre d'actions ──────────────────────────────────────────────────
    "swipe.action.rewind": "Rewind",
    "swipe.action.pass": "Pass",
    "swipe.action.gift": "Cadeau",
    "swipe.action.like": "Like",

    // ── Carte du deck ────────────────────────────────────────────────────
    "swipe.stamp.like": "LIKE",
    "swipe.stamp.nope": "NOPE",
    "swipe.stamp.super": "SUPER",
    "swipe.chip.goldenHeart": "Cœur d'Or",
    "swipe.chip.spotlight": "Projecteur",
    "swipe.chip.boost": "Boost",
    "swipe.chip.passport": "Passport",
    "swipe.card.photoAlt": "Photo de {{name}}",
    "swipe.card.openDetailAria": "Voir le profil détaillé",
    "swipe.card.gestureHint": "Glisse ← pass · → like · ↑ super-like",

    // ── File vide ────────────────────────────────────────────────────────
    "swipe.empty.title": "C'est tout pour aujourd'hui !",
    "swipe.empty.sub": "Reviens demain ou explore une autre ville avec ton Passport.",
    "swipe.empty.passportCta": "✈️ Explorer une autre ville",
    "swipe.empty.reload": "Recharger la file",

    // ── Labels de coût (requireVibes — affichés plus tard dans un toast) ─
    "swipe.cost.superlike": "Super-Like (5 Vibes)",
    "swipe.cost.rewind": "Rewind (2 Vibes)",

    // ── Toasts & retours d'action ────────────────────────────────────────
    "swipe.nothingToRewind": "Rien à annuler",
    "swipe.rewind.title": "Swipe annulé",
    "swipe.rewind.sub": "{{name}} est de retour dans ton deck",
    "swipe.giftSent.title": "{{gift}} pour {{name}}",
    "swipe.giftSent.sub": "Notification envoyée 🎁",

    // ── Suggestions contextuelles (SmartNudge) ───────────────────────────
    "swipe.nudge.lowBalance.text":
      "Ton stock de Vibes est presque à sec — garde ton élan pour les Super-Likes et cadeaux.",
    "swipe.nudge.lowBalance.cta": "Recharger",
    "swipe.nudge.superlikeVibe.text":
      "Ta vibe matche avec {{name}} — un Super-Like te place en haut de sa file.",
    "swipe.nudge.superlikeVibe.cta": "Super-Liker (5 💎)",
    "swipe.nudge.compatCheck.text":
      "{{name}} garde son mystère — vérifie votre compatibilité avant de swiper.",
    "swipe.nudge.compatCheck.cta": "Analyser (20 💎)",
    "swipe.nudge.eveningRadar.text":
      "C'est l'heure où le monde est en ligne — vois qui est près de toi en ce moment.",
    "swipe.nudge.eveningRadar.cta": "Radar (25 💎)",
    "swipe.nudge.giftStandout.text":
      "Sors du lot auprès de {{name}} — un cadeau attire l'œil avant même le premier message.",
    "swipe.nudge.giftStandout.cta": "Offrir (dès 10 💎)",
    "swipe.nudge.seeLikes.text": "Quelqu'un t'a liké récemment — dévoile qui.",
    "swipe.nudge.seeLikes.cta": "Dévoiler (20 💎)",
    "swipe.nudge.rewindRescue.text":
      "{{name}} était très compatible… un Rewind le/la ramène dans ton deck.",
    "swipe.nudge.rewindRescue.cta": "Annuler (2 💎)",
    "swipe.nudge.timeFreeze.text":
      "Trois passes d'affilée ? Aperçois les 3 prochains profils avant de décider.",
    "swipe.nudge.timeFreeze.cta": "Apercevoir (45 💎)",
    "swipe.nudge.boostStreak.text":
      "{{n}} likes sans match ? Les profils Boostés sont vus en premier — passe devant tout le monde.",
    "swipe.nudge.boostStreak.cta": "Booster (50 💎)",
    "swipe.nudge.spotlight.text":
      "Tu swipes beaucoup — fais-toi voir : ton profil en tête de 20 decks pendant 1h.",
    "swipe.nudge.spotlight.cta": "Briller (40 💎)",
    "swipe.nudge.dismissAria": "Masquer la suggestion",

    // ── Cadeau depuis le deck (GiftTraySheet) ────────────────────────────
    "swipe.giftTray.aria": "Offrir un cadeau à {{name}}",
    "swipe.giftTray.title": "Offrir un cadeau",
    "swipe.giftTray.to": "à",
    "swipe.giftTray.closeAria": "Fermer",
    "swipe.giftTray.notice":
      "Il/elle recevra une notification avec ton prénom — un cadeau attire l'œil bien avant le premier message. ✨",
    "swipe.giftTray.notePlaceholder":
      "Ajoute un petit mot qui accompagnera ton cadeau (optionnel)…",
    "swipe.giftTray.giftAria": "Offrir {{name}} — {{cost}} Vibes",
    "swipe.giftTray.shareValue": "≈ {{value}} pour lui/elle",
    "swipe.giftTray.rechargeNeeded": "recharge requise",
    "swipe.giftTray.footnote":
      "Les cadeaux s'offrent avec des Vibes achetées (les Vibes gratuites sont réservées aux actions premium). Le destinataire touche 70% de la valeur.",

    // ── Filtres de découverte (FilterSheet) ──────────────────────────────
    "swipe.filters.title": "Filtres de découverte",
    "swipe.filters.sub":
      "Affine les profils recommandés. Les changements s'appliquent immédiatement à ta file.",
    "swipe.filters.distance": "Distance max",
    "swipe.filters.distanceAria": "Distance maximum",
    "swipe.filters.age": "Âge recherché",
    "swipe.filters.ageAria": "Tranche d'âge",
    "swipe.filters.yearsShort": "ans",
    "swipe.filters.lookingFor": "Je cherche",
    "swipe.filters.showAll": "Tout afficher",
    "swipe.filters.saving": "Enregistrement…",
    "swipe.filters.apply": "Appliquer",
    "swipe.filters.saved.title": "Filtres enregistrés",
    "swipe.filters.saved.desc": "Ta file de découverte a été mise à jour.",
    "swipe.filters.gender.f": "Femmes",
    "swipe.filters.gender.m": "Hommes",
    "swipe.filters.gender.nb": "NB",
    "swipe.filters.gender.all": "Tous",

    // ── Vue détaillée du profil (ProfileDetailModal) ─────────────────────
    "swipe.detail.aria": "Profil de {{name}}",
    "swipe.detail.photoAlt": "Photo {{n}} de {{name}}",
    "swipe.detail.closeAria": "Fermer le profil",
    "swipe.detail.verifiedAria": "Profil vérifié",
    "swipe.detail.lookingForPrefix": "Recherche\u00A0:",
    "swipe.detail.theirAnswer": "Sa réponse :",
    "swipe.detail.pass": "Pass",
    "swipe.detail.passAria": "Passer ce profil",
    "swipe.detail.gift": "Cadeau",
    "swipe.detail.giftAria": "Offrir un cadeau",
    "swipe.detail.like": "Like",
    "swipe.detail.likeAria": "Liker ce profil",
    "swipe.detail.superlike": "Super-Like ·{{cost}}",
    "swipe.detail.superlikeAria": "Super-Liker ce profil",
    "swipe.detail.lookingFor.f": "Femmes",
    "swipe.detail.lookingFor.m": "Hommes",
    "swipe.detail.lookingFor.nb": "Personnes non-binaires",
    "swipe.detail.lookingFor.all": "Tout le monde",
    "swipe.detail.relationship.serious": "Relation sérieuse",
    "swipe.detail.relationship.casual": "Sans lendemain",
    "swipe.detail.relationship.friendship": "Amitié",

    // ── Match overlay ────────────────────────────────────────────────────
    "swipe.match.title": "C'est un match !",
    "swipe.match.sub": "Vous vous êtes swipés mutuellement. 🎉",
    "swipe.match.you": "Toi",
    "swipe.match.sendMessage": "Envoyer un message",
    "swipe.match.keepSwiping": "Continuer à swiper",
    "swipe.match.antispam.one":
      "⚠️ Anti-spam : tu peux envoyer {{n}} message max tant que {{name}} ne répond pas.",
    "swipe.match.antispam.many":
      "⚠️ Anti-spam : tu peux envoyer {{n}} messages max tant que {{name}} ne répond pas.",
  },
  {
    // ── Top bar ──────────────────────────────────────────────────────────
    "swipe.title": "Discover",
    "swipe.loading": "Loading profiles",
    "swipe.passport.chipAria": "Passport active — show destination",
    "swipe.passport.toastTitle": "✈️ Passport active — you're discovering {{city}}",
    "swipe.passport.hoursLeft": " · {{n}} h left",
    "swipe.passport.toastDesc":
      "Your destination and its countdown stay visible in Profile → Premium actions.",

    // ── Action bar ───────────────────────────────────────────────────────
    "swipe.action.rewind": "Rewind",
    "swipe.action.pass": "Pass",
    "swipe.action.gift": "Gift",
    "swipe.action.like": "Like",

    // ── Deck card ────────────────────────────────────────────────────────
    "swipe.stamp.like": "LIKE",
    "swipe.stamp.nope": "NOPE",
    "swipe.stamp.super": "SUPER",
    "swipe.chip.goldenHeart": "Golden Heart",
    "swipe.chip.spotlight": "Spotlight",
    "swipe.chip.boost": "Boost",
    "swipe.chip.passport": "Passport",
    "swipe.card.photoAlt": "Photo of {{name}}",
    "swipe.card.openDetailAria": "View full profile",
    "swipe.card.gestureHint": "Swipe ← pass · → like · ↑ super-like",

    // ── Empty deck ───────────────────────────────────────────────────────
    "swipe.empty.title": "That's all for today!",
    "swipe.empty.sub": "Come back tomorrow or explore another city with your Passport.",
    "swipe.empty.passportCta": "✈️ Explore another city",
    "swipe.empty.reload": "Refresh the queue",

    // ── Cost labels (requireVibes — shown later in a toast) ──────────────
    "swipe.cost.superlike": "Super-Like (5 Vibes)",
    "swipe.cost.rewind": "Rewind (2 Vibes)",

    // ── Toasts & action feedback ─────────────────────────────────────────
    "swipe.nothingToRewind": "Nothing to undo",
    "swipe.rewind.title": "Swipe undone",
    "swipe.rewind.sub": "{{name}} is back in your deck",
    "swipe.giftSent.title": "{{gift}} for {{name}}",
    "swipe.giftSent.sub": "Notification sent 🎁",

    // ── Contextual nudges (SmartNudge) ───────────────────────────────────
    "swipe.nudge.lowBalance.text":
      "Your Vibes stash is running low — keep your momentum for Super-Likes and gifts.",
    "swipe.nudge.lowBalance.cta": "Top up",
    "swipe.nudge.superlikeVibe.text":
      "Your vibe matches {{name}}'s — a Super-Like puts you at the top of their queue.",
    "swipe.nudge.superlikeVibe.cta": "Super-Like (5 💎)",
    "swipe.nudge.compatCheck.text":
      "{{name}} is keeping the mystery — check your compatibility before swiping.",
    "swipe.nudge.compatCheck.cta": "Analyze (20 💎)",
    "swipe.nudge.eveningRadar.text":
      "This is when everyone's online — see who's near you right now.",
    "swipe.nudge.eveningRadar.cta": "Radar (25 💎)",
    "swipe.nudge.giftStandout.text":
      "Stand out to {{name}} — a gift catches the eye well before the first message.",
    "swipe.nudge.giftStandout.cta": "Send a gift (from 10 💎)",
    "swipe.nudge.seeLikes.text": "Someone liked you recently — reveal who.",
    "swipe.nudge.seeLikes.cta": "Reveal (20 💎)",
    "swipe.nudge.rewindRescue.text":
      "{{name}} was highly compatible… a Rewind brings them back to your deck.",
    "swipe.nudge.rewindRescue.cta": "Undo (2 💎)",
    "swipe.nudge.timeFreeze.text":
      "Three passes in a row? Peek at the next 3 profiles before deciding.",
    "swipe.nudge.timeFreeze.cta": "Peek (45 💎)",
    "swipe.nudge.boostStreak.text":
      "{{n}} likes, no match? Boosted profiles get seen first — get ahead of everyone.",
    "swipe.nudge.boostStreak.cta": "Boost (50 💎)",
    "swipe.nudge.spotlight.text":
      "You've been swiping a lot — get noticed: your profile at the top of 20 decks for 1 hour.",
    "swipe.nudge.spotlight.cta": "Shine (40 💎)",
    "swipe.nudge.dismissAria": "Hide suggestion",

    // ── Deck gift tray (GiftTraySheet) ───────────────────────────────────
    "swipe.giftTray.aria": "Send a gift to {{name}}",
    "swipe.giftTray.title": "Send a gift",
    "swipe.giftTray.to": "to",
    "swipe.giftTray.closeAria": "Close",
    "swipe.giftTray.notice":
      "They'll get a notification with your first name — a gift catches the eye well before the first message. ✨",
    "swipe.giftTray.notePlaceholder": "Add a little note to go along with your gift (optional)…",
    "swipe.giftTray.giftAria": "Send {{name}} — {{cost}} Vibes",
    "swipe.giftTray.shareValue": "≈ {{value}} for them",
    "swipe.giftTray.rechargeNeeded": "top-up needed",
    "swipe.giftTray.footnote":
      "Gifts are sent with purchased Vibes (free Vibes are reserved for premium actions). The recipient keeps 70% of the value.",

    // ── Discovery filters (FilterSheet) ──────────────────────────────────
    "swipe.filters.title": "Discovery filters",
    "swipe.filters.sub":
      "Refine the recommended profiles. Changes apply to your queue right away.",
    "swipe.filters.distance": "Max distance",
    "swipe.filters.distanceAria": "Maximum distance",
    "swipe.filters.age": "Age range",
    "swipe.filters.ageAria": "Age range",
    "swipe.filters.yearsShort": "yrs",
    "swipe.filters.lookingFor": "I'm looking for",
    "swipe.filters.showAll": "Show all",
    "swipe.filters.saving": "Saving…",
    "swipe.filters.apply": "Apply",
    "swipe.filters.saved.title": "Filters saved",
    "swipe.filters.saved.desc": "Your discovery queue has been updated.",
    "swipe.filters.gender.f": "Women",
    "swipe.filters.gender.m": "Men",
    "swipe.filters.gender.nb": "NB",
    "swipe.filters.gender.all": "Everyone",

    // ── Detailed profile view (ProfileDetailModal) ───────────────────────
    "swipe.detail.aria": "{{name}}'s profile",
    "swipe.detail.photoAlt": "Photo {{n}} of {{name}}",
    "swipe.detail.closeAria": "Close profile",
    "swipe.detail.verifiedAria": "Verified profile",
    "swipe.detail.lookingForPrefix": "Looking for:",
    "swipe.detail.theirAnswer": "Their answer:",
    "swipe.detail.pass": "Pass",
    "swipe.detail.passAria": "Pass on this profile",
    "swipe.detail.gift": "Gift",
    "swipe.detail.giftAria": "Send a gift",
    "swipe.detail.like": "Like",
    "swipe.detail.likeAria": "Like this profile",
    "swipe.detail.superlike": "Super-Like ·{{cost}}",
    "swipe.detail.superlikeAria": "Super-Like this profile",
    "swipe.detail.lookingFor.f": "Women",
    "swipe.detail.lookingFor.m": "Men",
    "swipe.detail.lookingFor.nb": "Non-binary people",
    "swipe.detail.lookingFor.all": "Everyone",
    "swipe.detail.relationship.serious": "Serious relationship",
    "swipe.detail.relationship.casual": "Casual",
    "swipe.detail.relationship.friendship": "Friendship",

    // ── Match overlay ────────────────────────────────────────────────────
    "swipe.match.title": "It's a match!",
    "swipe.match.sub": "You swiped right on each other. 🎉",
    "swipe.match.you": "You",
    "swipe.match.sendMessage": "Send a message",
    "swipe.match.keepSwiping": "Keep swiping",
    "swipe.match.antispam.one":
      "⚠️ Anti-spam: you can send up to {{n}} message until {{name}} replies.",
    "swipe.match.antispam.many":
      "⚠️ Anti-spam: you can send up to {{n}} messages until {{name}} replies.",
  },
);
