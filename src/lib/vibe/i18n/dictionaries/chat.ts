// Dictionnaire « chat » — écran de chat, liste des matchs, composants vocaux/vidéo.
// Règles :
//  - TOUTES les clés sont préfixées par "chat." (ex "chat.title").
//  - Les objets fr et en ont EXACTEMENT les mêmes clés.
//  - Interpolation : {{param}} (ex "chat.antiSpam.body": "... tes {{n}} messages").
//  - Pluriels : clés distinctes ".one" / ".many".
//  - fr = copie EXACTE des textes français d'origine ; en = traduction naturelle
//    (tutoiement FR → "you" EN). Noms de cadeaux/Vibes/durées : non traduits.
import { defineDict } from "./shared";

export const chat = defineDict(
  {
    // ── Header du chat ─────────────────────────────────────────────────────
    "chat.header.typing": "écrit…",
    "chat.header.online": "en ligne",
    "chat.header.giftAria": "Offrir un cadeau",

    // ── État vide (début de conversation) ─────────────────────────────────
    "chat.empty.secure": "🔒 Les messages sont sécurisés. Sois toi-même. 👋",

    // ── Bannière anti-spam ────────────────────────────────────────────────
    "chat.antiSpam.title": "Anti-spam actif",
    "chat.antiSpam.body": "Tu as envoyé tes {{n}} messages. Attends une réponse — ou perç̧e avec le Boost.",
    "chat.antiSpam.boostCta": "⚡ Booster (10 💎)",
    "chat.antiSpam.giftCta": "🎁 Cadeau",
    "chat.antiSpam.boostArmed": "✅ Ton prochain message passera et sera épinglé en haut de sa boîte.",

    // ── Nudges contextuels (conversation silencieuse / liste verrouillée / match froid) ──
    "chat.nudge.quiet": "{{name}} ne t'a pas encore répondu — un message boosté repasse en tête de sa boîte.",
    "chat.nudge.lockedList": "Ton message à {{name}} attend une réponse — le Boost passe l'anti-spam et l'épingle en tête.",
    "chat.nudge.coldMatch": "Ton match avec {{name}} attend un premier signe — un cadeau fait toujours mouche avant le premier mot.",
    "chat.nudge.open": "Ouvrir",
    "chat.matchFallback": "ton match",
    "chat.matchFallbackCap": "Ton match",

    // ── Icebreaker IA ─────────────────────────────────────────────────────
    "chat.icebreaker.label": "Icebreaker IA",
    "chat.icebreaker.confirm": "Icebreaker IA (3 Vibes)",
    "chat.icebreaker.done": "Accroche générée par IA",

    // ── Boost message ─────────────────────────────────────────────────────
    "chat.boost.confirm": "Booster ce message (10 Vibes)",
    "chat.boost.cta": "Booster (10 💎)",
    "chat.boost.titleAttr": "Booster — 10 Vibes",
    "chat.boost.title": "Message boosté",
    "chat.boost.toastSub": "En tête de sa boîte de réception",
    "chat.boost.subtitle": "· mis en haut de sa boîte ⚡ 2h",
    "chat.boost.fullBefore": "Ton message sera mis en",
    "chat.boost.fullHighlight": "haut de sa boîte de réception",
    "chat.boost.fullAfter": "avec un badge ⚡ visible pendant 2h.",
    "chat.boost.compact": "Remonte en haut + notification visuelle",
    "chat.boost.gotIt": "Compris",

    // ── Barre de saisie ───────────────────────────────────────────────────
    "chat.input.placeholder": "Écris un message…",
    "chat.input.placeholderLocked": "En attente…",
    "chat.input.placeholderBoosted": "✨ Message boosté…",
    "chat.input.emojisAria": "Emojis",
    "chat.input.sendAria": "Envoyer",
    "chat.input.micAria": "Enregistrer un vocal",
    "chat.input.remaining.one": "Reste {{n}} message sur {{max}} avant blocage anti-spam",
    "chat.input.remaining.many": "Reste {{n}} messages sur {{max}} avant blocage anti-spam",

    // ── Cadeaux (noms de cadeaux DB : non traduits) ────────────────────────
    "chat.gift.trayTitle": "Offrir un cadeau 🎁",
    "chat.gift.trayHint": "Le destinataire découvrira le cadeau en l'ouvrant. 70% de la valeur lui est créditée.",
    "chat.gift.notePlaceholder": "Ajoute un petit mot (optionnel)…",
    "chat.gift.hot": "HOT",
    "chat.gift.sentTitle": "{{gift}} pour {{name}}",
    "chat.gift.sentSub": "Il/elle le découvrira en l'ouvrant",
    "chat.gift.sent": "Cadeau envoyé",
    "chat.gift.fromName": "Cadeau de {{name}}",
    "chat.gift.offersYou": "{{name}} t'offre",
    "chat.gift.surprise": "Un cadeau surprise",
    "chat.gift.tapToOpen": "👆 Tape pour ouvrir",

    // ── Erreurs génériques ────────────────────────────────────────────────
    "chat.error.generic": "Erreur",

    // ── Sélecteur d'emojis ────────────────────────────────────────────────
    "chat.emoji.title": "Emojis",
    "chat.emoji.pickVibe": "Choisis un vibe",
    "chat.emoji.closeAria": "Fermer le sélecteur d'emojis",
    "chat.emoji.insert": "Insérer {{emoji}}",
    "chat.emoji.cat.love": "Coeurs & Love",
    "chat.emoji.cat.expressions": "Réactions",
    "chat.emoji.cat.flirt": "Flirt & Fun",
    "chat.emoji.cat.food": "Nourriture",
    "chat.emoji.cat.travel": "Voyage",

    // ── Liste des matchs ──────────────────────────────────────────────────
    "chat.matches.title": "Matchs",
    "chat.matches.boosted.one": "{{n}} boosté",
    "chat.matches.boosted.many": "{{n}} boostés",
    "chat.matches.pending": "{{n}} en attente",
    "chat.matches.loading": "Chargement des matchs",
    "chat.matches.empty.title": "Aucun match pour l'instant",
    "chat.matches.empty.sub": "Continue à swiper — ton premier match est tout proche.",
    "chat.matches.newMatch": "Nouveau match — dis bonjour ! 👋",
    "chat.matches.antiSpam": "Anti-spam {{n}}/3",

    // ── Notes vocales ─────────────────────────────────────────────────────
    "chat.voice.micDenied": "Microphone inaccessible. Vérifie les permissions.",
    "chat.voice.micLoading": "Micro…",
    "chat.voice.send": "Envoyer le vocal",
    "chat.voice.play": "Lire",
    "chat.voice.pause": "Pause",

    // ── Lecteur vidéo ─────────────────────────────────────────────────────
    "chat.video.none": "Aucune vidéo",
    "chat.video.unmute": "Activer le son",
    "chat.video.mute": "Couper le son",
    "chat.video.error": "Lecture impossible",
    "chat.video.retry": "Appuie pour réessayer",
  },
  {
    // ── Chat header ───────────────────────────────────────────────────────
    "chat.header.typing": "typing…",
    "chat.header.online": "online",
    "chat.header.giftAria": "Send a gift",

    // ── Empty state (conversation start) ──────────────────────────────────
    "chat.empty.secure": "🔒 Messages are secure. Just be yourself. 👋",

    // ── Anti-spam banner ──────────────────────────────────────────────────
    "chat.antiSpam.title": "Anti-spam on",
    "chat.antiSpam.body": "You've sent your {{n}} messages. Wait for a reply — or break through with Boost.",
    "chat.antiSpam.boostCta": "⚡ Boost (10 💎)",
    "chat.antiSpam.giftCta": "🎁 Gift",
    "chat.antiSpam.boostArmed": "✅ Your next message will go through and be pinned to the top of their inbox.",

    // ── Contextual nudges (quiet conversation / locked list / cold match) ──
    "chat.nudge.quiet": "{{name}} hasn't replied yet — a boosted message jumps back to the top of their inbox.",
    "chat.nudge.lockedList": "Your message to {{name}} is still waiting for a reply — Boost gets past anti-spam and pins it to the top.",
    "chat.nudge.coldMatch": "Your match with {{name}} is waiting for a first sign — a gift always hits the mark before the first word.",
    "chat.nudge.open": "Open",
    "chat.matchFallback": "your match",
    "chat.matchFallbackCap": "Your match",

    // ── AI icebreaker ─────────────────────────────────────────────────────
    "chat.icebreaker.label": "AI Icebreaker",
    "chat.icebreaker.confirm": "AI Icebreaker (3 Vibes)",
    "chat.icebreaker.done": "AI-generated opener",

    // ── Message boost ─────────────────────────────────────────────────────
    "chat.boost.confirm": "Boost this message (10 Vibes)",
    "chat.boost.cta": "Boost (10 💎)",
    "chat.boost.titleAttr": "Boost — 10 Vibes",
    "chat.boost.title": "Message boosted",
    "chat.boost.toastSub": "At the top of their inbox",
    "chat.boost.subtitle": "· pinned to the top of their inbox ⚡ 2h",
    "chat.boost.fullBefore": "Your message will be placed at the",
    "chat.boost.fullHighlight": "top of their inbox",
    "chat.boost.fullAfter": "with a ⚡ badge visible for 2h.",
    "chat.boost.compact": "Back to the top + visual notification",
    "chat.boost.gotIt": "Got it",

    // ── Input bar ─────────────────────────────────────────────────────────
    "chat.input.placeholder": "Type a message…",
    "chat.input.placeholderLocked": "Waiting…",
    "chat.input.placeholderBoosted": "✨ Boosted message…",
    "chat.input.emojisAria": "Emojis",
    "chat.input.sendAria": "Send",
    "chat.input.micAria": "Record a voice note",
    "chat.input.remaining.one": "{{n}} message left out of {{max}} before the anti-spam lock",
    "chat.input.remaining.many": "{{n}} messages left out of {{max}} before the anti-spam lock",

    // ── Gifts (DB gift names: not translated) ─────────────────────────────
    "chat.gift.trayTitle": "Send a gift 🎁",
    "chat.gift.trayHint": "The recipient will discover the gift when they open it. 70% of its value is credited to them.",
    "chat.gift.notePlaceholder": "Add a little note (optional)…",
    "chat.gift.hot": "HOT",
    "chat.gift.sentTitle": "{{gift}} for {{name}}",
    "chat.gift.sentSub": "They'll discover it when they open it",
    "chat.gift.sent": "Gift sent",
    "chat.gift.fromName": "Gift from {{name}}",
    "chat.gift.offersYou": "{{name}} got you",
    "chat.gift.surprise": "A surprise gift",
    "chat.gift.tapToOpen": "👆 Tap to open",

    // ── Generic errors ────────────────────────────────────────────────────
    "chat.error.generic": "Error",

    // ── Emoji picker ──────────────────────────────────────────────────────
    "chat.emoji.title": "Emojis",
    "chat.emoji.pickVibe": "Pick a vibe",
    "chat.emoji.closeAria": "Close the emoji picker",
    "chat.emoji.insert": "Insert {{emoji}}",
    "chat.emoji.cat.love": "Hearts & Love",
    "chat.emoji.cat.expressions": "Reactions",
    "chat.emoji.cat.flirt": "Flirt & Fun",
    "chat.emoji.cat.food": "Food",
    "chat.emoji.cat.travel": "Travel",

    // ── Matches list ──────────────────────────────────────────────────────
    "chat.matches.title": "Matches",
    "chat.matches.boosted.one": "{{n}} boosted",
    "chat.matches.boosted.many": "{{n}} boosted",
    "chat.matches.pending": "{{n}} waiting",
    "chat.matches.loading": "Loading matches",
    "chat.matches.empty.title": "No matches yet",
    "chat.matches.empty.sub": "Keep swiping — your first match is just around the corner.",
    "chat.matches.newMatch": "New match — say hello! 👋",
    "chat.matches.antiSpam": "Anti-spam {{n}}/3",

    // ── Voice notes ───────────────────────────────────────────────────────
    "chat.voice.micDenied": "Microphone unavailable. Check your permissions.",
    "chat.voice.micLoading": "Mic…",
    "chat.voice.send": "Send voice note",
    "chat.voice.play": "Play",
    "chat.voice.pause": "Pause",

    // ── Video player ──────────────────────────────────────────────────────
    "chat.video.none": "No video",
    "chat.video.unmute": "Unmute",
    "chat.video.mute": "Mute",
    "chat.video.error": "Can't play video",
    "chat.video.retry": "Tap to retry",
  },
);
