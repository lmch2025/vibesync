// Dictionnaire « auth » — écran d'authentification (auth-screen.tsx).
// Règles :
//  - TOUTES les clés sont préfixées par "auth." (ex "auth.title").
//  - Les objets fr et en ont EXACTEMENT les mêmes clés.
//  - Interpolation : {{param}} (ex "auth.otpSentTo": "SMS envoyé au {{phone}}.").
//  - fr = copie EXACTE du texte français d'origine.
import { defineDict } from "./shared";

export const auth = defineDict(
  {
    // ── Étape 1 : téléphone ───────────────────────────────────────────────
    "auth.title": "Ton numéro, ta vibe.",
    "auth.subtitle": "On t'envoie un code par SMS. Aucune photo de profil à remplir — juste toi, en vidéo.",
    "auth.phonePlaceholder": "+33 6 12 34 56 78",
    "auth.phoneInvalid": "Numéro invalide",
    "auth.receiveCode": "Recevoir le code",
    "auth.sendingCode": "Envoi du code…",
    "auth.legal": "En continuant, tu acceptes nos CGU et notre Politique RGPD. Ton numéro n'est jamais affiché publiquement.",

    // ── Étape 2 : code OTP ────────────────────────────────────────────────
    "auth.otpTitle": "Entre le code",
    "auth.otpSentTo": "SMS envoyé au {{phone}}.",
    "auth.otpDemo": "(Démo : 4242)",
    "auth.otpWrong": "Code incorrect",
    "auth.otpSentToast": "Code envoyé par SMS (démo : {{code}})",

    // ── Étape 3a : création du PIN ────────────────────────────────────────
    "auth.pinCreateTitle": "Crée ton code PIN",
    "auth.pinCreateHint": "4 chiffres. Sert à te reconnecter vite. Hashé en base, jamais partagé.",
    "auth.continue": "Continuer",

    // ── Étape 3b : confirmation du PIN ────────────────────────────────────
    "auth.pinConfirmTitle": "Confirme ton PIN",
    "auth.pinConfirmHint": "Retape les 4 chiffres.",
    "auth.pinMismatch": "Les codes ne correspondent pas",
    "auth.creatingAccount": "Création du compte…",

    // ── Étape 3c : connexion par PIN ──────────────────────────────────────
    "auth.pinLoginTitle": "Ton code PIN",
    "auth.pinLoginHint": "Heureux de te revoir. Entre ton PIN à 4 chiffres.",
    "auth.signIn": "Se connecter",
    "auth.signingIn": "Connexion…",

    // ── Transverse ────────────────────────────────────────────────────────
    "auth.back": "Retour",
    "auth.error": "Erreur",
    "auth.welcomeToast": "Bienvenue sur Vivilov ! +25 Vibes offertes 🎁",
    "auth.welcomeBackToast": "Content de te revoir 👋",
  },
  {
    // ── Step 1: phone ─────────────────────────────────────────────────────
    "auth.title": "Your number, your vibe.",
    "auth.subtitle": "We'll text you a code. No profile picture to fill in — just you, on video.",
    "auth.phonePlaceholder": "+1 555 000 1234",
    "auth.phoneInvalid": "Invalid phone number",
    "auth.receiveCode": "Send me the code",
    "auth.sendingCode": "Sending the code…",
    "auth.legal": "By continuing, you accept our Terms and our Privacy Policy. Your number is never shown publicly.",

    // ── Step 2: OTP code ──────────────────────────────────────────────────
    "auth.otpTitle": "Enter the code",
    "auth.otpSentTo": "SMS sent to {{phone}}.",
    "auth.otpDemo": "(Demo: 4242)",
    "auth.otpWrong": "Wrong code",
    "auth.otpSentToast": "Code sent by SMS (demo: {{code}})",

    // ── Step 3a: PIN creation ─────────────────────────────────────────────
    "auth.pinCreateTitle": "Create your PIN code",
    "auth.pinCreateHint": "4 digits. Lets you sign back in fast. Hashed in our database, never shared.",
    "auth.continue": "Continue",

    // ── Step 3b: PIN confirmation ─────────────────────────────────────────
    "auth.pinConfirmTitle": "Confirm your PIN",
    "auth.pinConfirmHint": "Type the 4 digits again.",
    "auth.pinMismatch": "The codes don't match",
    "auth.creatingAccount": "Creating your account…",

    // ── Step 3c: PIN sign-in ──────────────────────────────────────────────
    "auth.pinLoginTitle": "Your PIN code",
    "auth.pinLoginHint": "Great to see you again. Enter your 4-digit PIN.",
    "auth.signIn": "Sign in",
    "auth.signingIn": "Signing in…",

    // ── Cross-step ────────────────────────────────────────────────────────
    "auth.back": "Back",
    "auth.error": "Error",
    "auth.welcomeToast": "Welcome to Vivilov! +25 free Vibes 🎁",
    "auth.welcomeBackToast": "Great to have you back 👋",
  },
);
