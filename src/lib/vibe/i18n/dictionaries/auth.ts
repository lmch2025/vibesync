// Dictionnaire « auth » — écran d'authentification in-app (auth-screen.tsx)
// + champ téléphone partagé (phone-field.tsx : clés auth.chooseCountry /
// auth.searchCountry / auth.noCountry utilisées sur les 2 surfaces d'auth).
// Règles :
//  - TOUTES les clés sont préfixées par "auth." (ex "auth.title").
//  - Les objets fr et en ont EXACTEMENT les mêmes clés.
//  - fr = copie EXACTE du texte français d'origine.
import { defineDict } from "./shared";

export const auth = defineDict(
  {
    // ── Étape 1 : téléphone (indicatif intégré au champ, numéro local) ────
    "auth.title": "Ton numéro, ta vibe.",
    "auth.subtitle": "Ton numéro et un code PIN à 4 chiffres — c'est tout. Aucune photo de profil à remplir, juste toi, en vidéo.",
    "auth.phone": "Téléphone",
    "auth.phonePlaceholder": "6 12 34 56 78",
    "auth.phoneInvalid": "Numéro invalide",
    "auth.checking": "Vérification…",
    "auth.legal": "En continuant, tu acceptes nos CGU et notre Politique RGPD. Ton numéro n'est jamais affiché publiquement.",

    // ── Sélecteur de pays (phone-field.tsx — 250 pays) ────────────────────
    "auth.chooseCountry": "Choisir le pays",
    "auth.searchCountry": "Rechercher un pays…",
    "auth.noCountry": "Aucun pays trouvé.",

    // ── Étape 2a : création du PIN ────────────────────────────────────────
    "auth.pinCreateTitle": "Crée ton code PIN",
    "auth.pinCreateHint": "4 chiffres. Sert à te reconnecter vite. Hashé en base, jamais partagé.",
    "auth.continue": "Continuer",

    // ── Étape 2b : confirmation du PIN ────────────────────────────────────
    "auth.pinConfirmTitle": "Confirme ton PIN",
    "auth.pinConfirmHint": "Retape les 4 chiffres.",
    "auth.pinMismatch": "Les codes ne correspondent pas",
    "auth.creatingAccount": "Création du compte…",

    // ── Étape 2c : connexion par PIN ──────────────────────────────────────
    "auth.pinLoginTitle": "Ton code PIN",
    "auth.pinLoginHint": "Heureux de te revoir. Entre ton PIN à 4 chiffres.",
    "auth.signIn": "Se connecter",
    "auth.signingIn": "Connexion…",

    // ── Transverse ────────────────────────────────────────────────────────
    "auth.back": "Retour",
    "auth.error": "Erreur",
    "auth.welcomeToast": "Bienvenue sur Tiluu ! +25 Vibes offertes 🎁",
    "auth.welcomeBackToast": "Content de te revoir 👋",
  },
  {
    // ── Step 1: phone (dial code built into the field, local number) ──────
    "auth.title": "Your number, your vibe.",
    "auth.subtitle": "Your number and a 4-digit PIN — that's it. No profile picture to fill in, just you, on video.",
    "auth.phone": "Phone",
    "auth.phonePlaceholder": "555 123 4567",
    "auth.phoneInvalid": "Invalid phone number",
    "auth.checking": "Checking…",
    "auth.legal": "By continuing, you accept our Terms and our Privacy Policy. Your number is never shown publicly.",

    // ── Country selector (phone-field.tsx — 250 countries) ────────────────
    "auth.chooseCountry": "Choose country",
    "auth.searchCountry": "Search for a country…",
    "auth.noCountry": "No country found.",

    // ── Step 2a: PIN creation ─────────────────────────────────────────────
    "auth.pinCreateTitle": "Create your PIN code",
    "auth.pinCreateHint": "4 digits. Lets you sign back in fast. Hashed in our database, never shared.",
    "auth.continue": "Continue",

    // ── Step 2b: PIN confirmation ─────────────────────────────────────────
    "auth.pinConfirmTitle": "Confirm your PIN",
    "auth.pinConfirmHint": "Type the 4 digits again.",
    "auth.pinMismatch": "The codes don't match",
    "auth.creatingAccount": "Creating your account…",

    // ── Step 2c: PIN sign-in ──────────────────────────────────────────────
    "auth.pinLoginTitle": "Your PIN code",
    "auth.pinLoginHint": "Great to see you again. Enter your 4-digit PIN.",
    "auth.signIn": "Sign in",
    "auth.signingIn": "Signing in…",

    // ── Cross-step ────────────────────────────────────────────────────────
    "auth.back": "Back",
    "auth.error": "Error",
    "auth.welcomeToast": "Welcome to Tiluu! +25 free Vibes 🎁",
    "auth.welcomeBackToast": "Great to have you back 👋",
  },
);
