// Dictionnaire « onboarding » — flux d'onboarding (onboarding-flow.tsx).
// Règles :
//  - TOUTES les clés sont préfixées par "onb." (ex "onb.nameTitle") — le
//    préfixe court « onb. » est celui demandé par le plan de traduction.
//  - Les objets fr et en ont EXACTEMENT les mêmes clés.
//  - Interpolation : {{param}} (ex "onb.step": "Étape {{n}} / {{total}}").
//  - fr = copie EXACTE du texte français d'origine.
import { defineDict } from "./shared";

export const onboarding = defineDict(
  {
    // ── Progression ───────────────────────────────────────────────────────
    "onb.step": "Étape {{n}} / {{total}} — {{title}}",
    "onb.step1Title": "Ton identité",
    "onb.step2Title": "Toi en bref",
    "onb.step3Title": "Ta recherche",
    "onb.step4Title": "Ta présentation",

    // ── Étape 1 : identité ────────────────────────────────────────────────
    "onb.nameTitle": "Comment tu t'appelles ?",
    "onb.nameHint": "Ton pseudo sera visible par les autres membres.",
    "onb.pseudoPlaceholder": "ex. Alex, Léa, Marco…",
    "onb.genderLabel": "Tu es…",
    "onb.genderF": "Femme",
    "onb.genderM": "Homme",
    "onb.genderNB": "Non-binaire",
    "onb.lookingForLabel": "Tu cherches…",
    "onb.seekF": "Femmes",
    "onb.seekM": "Hommes",
    "onb.seekNB": "NB",
    "onb.seekAll": "Tous",

    // ── Étape 2 : âge + ville ─────────────────────────────────────────────
    "onb.ageAndCityHint": "Ton âge et ta ville — le reste viendra en douceur.",
    "onb.ageLabel": "Âge",
    "onb.ageSelect": "Sélectionne ton âge",
    "onb.ageValue": "{{n}} ans",
    "onb.cityLabel": "Ville",
    "onb.cityPlaceholder": "Tape ta ville…",
    "onb.keepTyping": "Continue à taper…",
    "onb.noCity": "Aucune ville trouvée",
    "onb.cityHint": "Sélectionne ta ville dans la liste — la saisie libre n'est pas acceptée.",

    // ── Étape 3 : type de relation ────────────────────────────────────────
    "onb.relTitle": "Que cherches-tu ?",
    "onb.relHint": "Sois honnête — ça aide à matcher avec les bonnes personnes.",
    "onb.relSerious": "Relation sérieuse",
    "onb.relSeriousDesc": "Mariage, amour durable, construire ensemble",
    "onb.relCasual": "Relation sans lendemain",
    "onb.relCasualDesc": "Fun, spontané, sans engagement",
    "onb.relFriendship": "Amitié",
    "onb.relFriendshipDesc": "Rencontrer des gens, partager des moments",

    // ── Étape 4 : vidéo + photos ──────────────────────────────────────────
    "onb.videoTitle": "Ta vidéo de présentation",
    "onb.videoHint": "15 secondes, portrait. Optionnelle mais puissante.",
    "onb.processing": "Traitement…",
    "onb.addVideo": "Ajouter ma vidéo",
    "onb.videoSpec": "Portrait · 15s · MP4/MOV",
    "onb.videoPreviewAlt": "Aperçu vidéo",
    "onb.change": "Changer",
    "onb.lockedTitle": "Sans vidéo, bloqué :",
    "onb.lockSwipe": "• Apparaître dans le swipe",
    "onb.lockSuperlike": "• Super-liker",
    "onb.lockGifts": "• Recevoir des cadeaux",
    "onb.lockBoost": "• Booster ton profil",
    "onb.photosHope": "Pas de vidéo ? Jusqu'à 5 photos permettent quand même de te découvrir.",
    "onb.photosLabel": "Tes photos",
    "onb.photosHint": "Optionnel — utile surtout si tu n'ajoutes pas de vidéo.",

    // ── Boutons ───────────────────────────────────────────────────────────
    "onb.continue": "Continuer",
    "onb.back": "Retour",
    "onb.finish": "Terminer",
    "onb.skipFinish": "Passer & terminer",
    "onb.creating": "Création…",

    // ── Vidéo : upload / compression / toasts ─────────────────────────────
    "onb.videoFormatRequired": "Format vidéo requis",
    "onb.videoTooLarge": "Vidéo trop lourde (max 50 Mo)",
    "onb.videoLoading": "Chargement de la vidéo…",
    "onb.compressing": "Compression ({{w}}px, {{d}}s)…",
    "onb.videoCompressed": "Vidéo compressée ! {{w}}×{{h}}, {{dur}} 🎬",
    "onb.compressFailed": "Compression échouée. Réessaie.",
    "onb.profileCreatedVideo": "Profil créé ! Bienvenue 🎉",
    "onb.profileCreatedNoVideo": "Profil créé — ajoute ta vidéo plus tard pour débloquer tout.",
    "onb.error": "Erreur",
  },
  {
    // ── Progress ──────────────────────────────────────────────────────────
    "onb.step": "Step {{n}} of {{total}} — {{title}}",
    "onb.step1Title": "Your identity",
    "onb.step2Title": "You in a nutshell",
    "onb.step3Title": "Your search",
    "onb.step4Title": "Your intro",

    // ── Step 1: identity ──────────────────────────────────────────────────
    "onb.nameTitle": "What's your name?",
    "onb.nameHint": "Your username will be visible to other members.",
    "onb.pseudoPlaceholder": "e.g. Alex, Mia, Marco…",
    "onb.genderLabel": "You are…",
    "onb.genderF": "Woman",
    "onb.genderM": "Man",
    "onb.genderNB": "Non-binary",
    "onb.lookingForLabel": "You're looking for…",
    "onb.seekF": "Women",
    "onb.seekM": "Men",
    "onb.seekNB": "NB",
    "onb.seekAll": "All",

    // ── Step 2: age + city ────────────────────────────────────────────────
    "onb.ageAndCityHint": "Your age and your city — the rest will come naturally.",
    "onb.ageLabel": "Age",
    "onb.ageSelect": "Select your age",
    "onb.ageValue": "{{n}} years old",
    "onb.cityLabel": "City",
    "onb.cityPlaceholder": "Type your city…",
    "onb.keepTyping": "Keep typing…",
    "onb.noCity": "No city found",
    "onb.cityHint": "Pick your city from the list — free-typed entries aren't accepted.",

    // ── Step 3: relationship type ─────────────────────────────────────────
    "onb.relTitle": "What are you looking for?",
    "onb.relHint": "Be honest — it helps you match with the right people.",
    "onb.relSerious": "Serious relationship",
    "onb.relSeriousDesc": "Marriage, lasting love, building together",
    "onb.relCasual": "Casual relationship",
    "onb.relCasualDesc": "Fun, spontaneous, no strings attached",
    "onb.relFriendship": "Friendship",
    "onb.relFriendshipDesc": "Meeting people, sharing moments",

    // ── Step 4: video + photos ────────────────────────────────────────────
    "onb.videoTitle": "Your intro video",
    "onb.videoHint": "15 seconds, portrait. Optional but powerful.",
    "onb.processing": "Processing…",
    "onb.addVideo": "Add my video",
    "onb.videoSpec": "Portrait · 15s · MP4/MOV",
    "onb.videoPreviewAlt": "Video preview",
    "onb.change": "Change",
    "onb.lockedTitle": "Without a video, you can't:",
    "onb.lockSwipe": "• Show up in the swipe",
    "onb.lockSuperlike": "• Super-like",
    "onb.lockGifts": "• Receive gifts",
    "onb.lockBoost": "• Boost your profile",
    "onb.photosHope": "No video? Up to 5 photos still let people discover you.",
    "onb.photosLabel": "Your photos",
    "onb.photosHint": "Optional — especially useful if you don't add a video.",

    // ── Buttons ───────────────────────────────────────────────────────────
    "onb.continue": "Continue",
    "onb.back": "Back",
    "onb.finish": "Finish",
    "onb.skipFinish": "Skip & finish",
    "onb.creating": "Creating…",

    // ── Video: upload / compression / toasts ──────────────────────────────
    "onb.videoFormatRequired": "Video format required",
    "onb.videoTooLarge": "Video too large (max 50 MB)",
    "onb.videoLoading": "Loading video…",
    "onb.compressing": "Compressing ({{w}}px, {{d}}s)…",
    "onb.videoCompressed": "Video compressed! {{w}}×{{h}}, {{dur}} 🎬",
    "onb.compressFailed": "Compression failed. Try again.",
    "onb.profileCreatedVideo": "Profile created! Welcome 🎉",
    "onb.profileCreatedNoVideo": "Profile created — add your video later to unlock everything.",
    "onb.error": "Error",
  },
);
