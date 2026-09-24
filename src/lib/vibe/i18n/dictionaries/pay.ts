// Dictionnaire « pay » — paiements My-CoolPay (retour de paiement, retraits
// Mobile Money). Règles identiques aux autres namespaces : préfixe "pay.",
// parité stricte fr/en, interpolation {{param}}.
import { defineDict } from "./shared";

export const pay = defineDict(
  {
    // ── Redirection vers la page de paiement hébergée ────────────────────
    "pay.redirecting": "Redirection vers la page de paiement…",
    "pay.redirectingSub": "Orange Money, MTN MoMo ou carte — choisis ton moyen de paiement, on t'attend ici.",

    // ── Overlay de retour de paiement (polling du statut) ────────────────
    "pay.return.title": "Paiement",
    "pay.return.checking": "Vérification du paiement…",
    "pay.return.checkingSub": "Ça ne prendra qu'un instant",
    "pay.return.success": "Paiement confirmé !",
    "pay.return.successSub": "+{{n}} Vibes créditées sur ton compte 💎",
    "pay.return.canceled": "Paiement annulé",
    "pay.return.canceledSub": "Aucun montant n'a été débité. Tu peux réessayer quand tu veux.",
    "pay.return.failed": "Paiement échoué",
    "pay.return.failedSub": "Aucun montant n'a été débité. Réessaie ou change de moyen de paiement.",
    "pay.return.pending": "Paiement en cours de validation…",
    "pay.return.pendingSub": "Ton solde sera mis à jour dès que c'est confirmé.",
    "pay.return.timeout": "Ça prend plus de temps que prévu…",
    "pay.return.timeoutSub": "Si ton paiement aboutit, tes Vibes seront créditées automatiquement.",
    "pay.return.close": "Fermer",
    "pay.return.wallet": "Voir mon portefeuille",

    // ── Retrait Mobile Money (WithdrawModal) ─────────────────────────────
    "pay.wd.operator": "Opérateur Mobile Money",
    "pay.wd.om": "Orange Money",
    "pay.wd.momo": "MTN MoMo",
    "pay.wd.phone": "Numéro Mobile Money",
    "pay.wd.phonePlaceholder": "6XX XX XX XX",
    "pay.wd.autoNote": "Le transfert part automatiquement sur ton compte {{operator}}.",
    "pay.wd.manualNote": "Les retraits bancaires sont traités sous 48 h.",
    "pay.wd.processing": "Transfert en cours…",
    "pay.wd.processingSub": "Nous envoyons les fonds sur ton numéro Mobile Money.",

    // ── Notification de crédit d'achat (serveur, bilingue) ───────────────
    "pay.notifPurchase.title": "Recharge réussie ! +{{n}} Vibes 💎",
    "pay.notifPurchase.body": "Ton compte a été crédité de {{n}} Vibes ({{pack}}). Profite de tes super-pouvoirs !",

    // ── Erreurs API (apiErr) ─────────────────────────────────────────────
    "api.payProvider": "Le prestataire de paiement a refusé la transaction. Réessaie.",
    "api.payNotFound": "Paiement introuvable",
    "api.payInitFailed": "Impossible de lancer le paiement. Réessaie dans un instant.",
    "api.payPayoutFailed": "Le transfert Mobile Money a échoué. Tes gains restent sur ton portefeuille.",
    "api.payPhoneInvalid": "Numéro Mobile Money invalide (6XXXXXXXX)",
    "api.payOperatorMissing": "Choisis ton opérateur Mobile Money",
  },
  {
    // ── English ──────────────────────────────────────────────────────────
    "pay.redirecting": "Redirecting to the payment page…",
    "pay.redirectingSub": "Orange Money, MTN MoMo or card — pick your payment method, we'll be right here.",

    "pay.return.title": "Payment",
    "pay.return.checking": "Checking your payment…",
    "pay.return.checkingSub": "This will only take a moment",
    "pay.return.success": "Payment confirmed!",
    "pay.return.successSub": "+{{n}} Vibes added to your balance 💎",
    "pay.return.canceled": "Payment cancelled",
    "pay.return.canceledSub": "You haven't been charged. You can try again whenever you want.",
    "pay.return.failed": "Payment failed",
    "pay.return.failedSub": "You haven't been charged. Try again or use another payment method.",
    "pay.return.pending": "Payment being processed…",
    "pay.return.pendingSub": "Your balance will update as soon as it's confirmed.",
    "pay.return.timeout": "It's taking longer than expected…",
    "pay.return.timeoutSub": "If your payment goes through, your Vibes will be added automatically.",
    "pay.return.close": "Close",
    "pay.return.wallet": "View my wallet",

    "pay.wd.operator": "Mobile Money operator",
    "pay.wd.om": "Orange Money",
    "pay.wd.momo": "MTN MoMo",
    "pay.wd.phone": "Mobile Money number",
    "pay.wd.phonePlaceholder": "6XX XX XX XX",
    "pay.wd.autoNote": "The transfer is sent automatically to your {{operator}} account.",
    "pay.wd.manualNote": "Bank withdrawals are processed within 48h.",
    "pay.wd.processing": "Transfer in progress…",
    "pay.wd.processingSub": "We're sending the funds to your Mobile Money number.",

    "pay.notifPurchase.title": "Top-up successful! +{{n}} Vibes 💎",
    "pay.notifPurchase.body": "Your account has been credited with {{n}} Vibes ({{pack}}). Enjoy your superpowers!",

    "api.payProvider": "The payment provider declined the transaction. Please try again.",
    "api.payNotFound": "Payment not found",
    "api.payInitFailed": "Couldn't start the payment. Try again in a moment.",
    "api.payPayoutFailed": "The Mobile Money transfer failed. Your earnings stay in your wallet.",
    "api.payPhoneInvalid": "Invalid Mobile Money number (6XXXXXXXX)",
    "api.payOperatorMissing": "Choose your Mobile Money operator",
  }
);
