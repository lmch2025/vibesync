// Dictionnaire « landing » — rempli par l'agent Landing (Task 2-a).
// Règles :
//  - TOUTES les clés sont préfixées par "landing." (ex "landing.hero.title").
//  - Les objets fr et en ont EXACTEMENT les mêmes clés.
//  - Interpolation : {{param}} (ex "landing.pricing.bonus": "+ {{n}} Vibes bonus").
//  - fr = copie EXACTE du texte français d'origine (typos incluses).
import { defineDict } from "./shared";

export const landing = defineDict(
  {
    // ── Navigation (clés requises par nav.tsx) ──────────────────────────────
    "landing.nav.concept": "Concept",
    "landing.nav.features": "Fonctionnalités",
    "landing.nav.pricing": "Tarifs",
    "landing.nav.faq": "FAQ",
    "landing.nav.admin": "Espace Admin",
    "landing.nav.cta": "Rejoins l'expérience",
    "landing.nav.openMenu": "Ouvrir le menu",
    "landing.nav.closeMenu": "Fermer le menu",

    // ── Immersive landing (vidéo plein écran) ───────────────────────────────
    "landing.im.myAccount": "Mon compte",
    "landing.im.login": "Connexion",
    "landing.im.taglineA": "La rencontre authentique,",
    "landing.im.taglineB": "en vidéo de 15 secondes.",
    "landing.im.pillVerified": "Profils vérifiés",
    "landing.im.pillVideo": "Vidéo 15s",
    "landing.im.pillVibeCheck": "Vibe Check",
    "landing.im.pillNoSub": "Zéro abonnement",
    "landing.im.live": "342 Vibes en cours",
    "landing.im.backToApp": "Retour à l'app",
    "landing.im.metaA": "Inscription en 30s ·",
    "landing.im.metaHighlight": "25 Vibes offertes",
    "landing.im.metaB": "· Sans engagement",

    // ── Hero ────────────────────────────────────────────────────────────────
    "landing.hero.starsAria": "4.8 étoiles sur 5",
    "landing.hero.chipPack": "Pack 100 Vibes",
    "landing.hero.chipNote": "— prix fixe par région",
    "landing.hero.badge": "La rencontre authentique, en vidéo",
    "landing.hero.titleA": "Rencontre authentique par",
    "landing.hero.titleB": "vidéo de 15s",
    "landing.hero.titleC": "Zéro abonnement, juste des Vibes.",
    "landing.hero.subtitle":
      "Fini les catfish. Enregistre une vidéo de 15 secondes, swipe, match, passe le Vibe Check et commence à vibrer sur la bonne fréquence. Reçois des cadeaux. Encaisse en €.",
    "landing.hero.seeDemo": "Voir la démo",
    "landing.hero.reviews": "· 12 840 avis",
    "landing.hero.platforms": "Dispo sur iOS, Android & Web",
    "landing.hero.scroll": "Découvre l'expérience",

    // ── Démo swipe du hero (téléphone) ─────────────────────────────────────
    "landing.demo.q1": "Plage ou Montagne ?",
    "landing.demo.q2": "Chien ou Chat ?",
    "landing.demo.q3": "Aventure ou Confort ?",
    "landing.demo.q4": "Café ou Thé ?",
    "landing.demo.q5": "Ville ou Nature ?",
    "landing.demo.alt": "{{name}}, {{age}} ans, {{city}}",
    "landing.demo.skip": "Passer",
    "landing.demo.superlike": "Super-like",

    // ── Fonctionnalités ─────────────────────────────────────────────────────
    "landing.features.eyebrow": "Pourquoi Vivilov",
    "landing.features.titleA": "Le dating repensé pour la",
    "landing.features.titleB": "vraie vie",
    "landing.features.subtitle":
      "Six briques qui cassent le modèle de l'abonnement et réinventent la rencontre en ligne.",
    "landing.features.f1.title": "Vidéo 15s authentique",
    "landing.features.f1.body":
      "Une vidéo mouvante plutôt que 6 photos figées. Fini le catfish et les fausses identités.",
    "landing.features.f2.title": "Vibe Check",
    "landing.features.f2.body":
      "Mini-jeu de compatibilité avant le match. Vous voyez la réponse de l'autre seulement si vous répondez pareil.",
    "landing.features.f3.title": "Audio Dating / Blind Swipe",
    "landing.features.f3.body":
      "Mode voix + flou artistique pour découvrir la personnalité avant le visage. Le slow dating version sonore.",
    "landing.features.f4.title": "IA de modération",
    "landing.features.f4.body":
      "Rejet automatique des contenus inappropriés (nudité, mineurs, deepfakes). La sécurité avant tout.",
    "landing.features.f5.title": "Messagerie anti-spam",
    "landing.features.f5.body":
      "Tu peux ouvrir la conversation, mais pour la poursuivre il faut un match réel. Débloque avec quelques Vibes.",
    "landing.features.f6.title": "Cadeaux virtuels monétisables",
    "landing.features.f6.body":
      "Offre une Rose, un Dîner Romantique ou un Weekend. Chaque cadeau reçu = valeur en € dans ton wallet.",

    // ── Comment ça marche ───────────────────────────────────────────────────
    "landing.how.eyebrow": "Comment ça marche",
    "landing.how.titleA": "3 vibrations pour passer du swipe au",
    "landing.how.titleB": "match réel",
    "landing.how.subtitle":
      "Vivilov remplace le profil figé par une vidéo vivante. Trois étapes, c'est tout.",
    "landing.how.s1.title": "Enregistre ta vidéo 15s",
    "landing.how.s1.body":
      "Présente-toi en mouvement, sans filtre ni photo retouchée. Une vidéo brute = zéro catfish.",
    "landing.how.s2.title": "Swipe, match, vibe check",
    "landing.how.s2.body":
      "Like les profils qui te font vibrer. Réponds au Vibe Check : si vous choisissez pareil, le match s'ouvre.",
    "landing.how.s3.title": "Offre des cadeaux, gagne des €",
    "landing.how.s3.body":
      "Envoie des cadeaux virtuels payés en Vibes. Reçois-en ? Ils se convertissent en € retirable via Stripe.",

    // ── Vibe Check (vitrine) ────────────────────────────────────────────────
    "landing.vibecheck.q": "Plage ou Montagne ?",
    "landing.vibecheck.beach": "Plage",
    "landing.vibecheck.mountain": "Montagne",
    "landing.vibecheck.titleA": "Le match qui",
    "landing.vibecheck.titleB": "communique vraiment",
    "landing.vibecheck.subtitle":
      "Avant d'ouvrir une conversation, vous répondez tous les deux à une question légère. La réponse de l'autre ne s'affiche que si elle correspond à la tienne. 87 % des matchs viennent d'ici.",
    "landing.vibecheck.b1": "Pas de mauvaises surprises : tu sais déjà si vous partagez une vibe.",
    "landing.vibecheck.b2": "Aucune réponse forcée : tu peux skipper la question si elle ne te parle pas.",
    "landing.vibecheck.b3": "Plus de 50 questions rotatives pour garder la fraîcheur.",

    // ── Stats ───────────────────────────────────────────────────────────────
    "landing.stats.activeUsers": "utilisateurs actifs",
    "landing.stats.swipes": "swipes cette semaine",
    "landing.stats.matchRate": "de matchs via Vibe Check",
    "landing.stats.zero": "/ mois — zéro abonnement",

    // ── Tarifs ──────────────────────────────────────────────────────────────
    "landing.pricing.ribbonPopular": "POPULAIRE",
    "landing.pricing.ribbonBest": "MEILLEURE VALEUR",
    "landing.pricing.packLabel": "Pack {{name}}",
    "landing.pricing.pack.decouverte": "Découverte",
    "landing.pricing.pack.populaire": "Populaire",
    "landing.pricing.pack.premium": "Premium",
    "landing.pricing.bonus": "+ {{n}} Vibes bonus",
    "landing.pricing.fixedPrice": "prix fixe {{currency}}",
    "landing.pricing.noSub": "Sans abonnement",
    "landing.pricing.lifetime": "Valable à vie",
    "landing.pricing.localCurrency": "Paiement dans ta devise",
    "landing.pricing.buy": "Acheter",
    "landing.pricing.titleA": "Zéro abonnement.",
    "landing.pricing.titleB": "Juste des Vibes.",
    "landing.pricing.subtitle":
      "Tu ne paies que si tu veux accélérer — sinon, swip' and vibe gratuitement. Les Vibes ne sont jamais perdues : elles dorment dans ton wallet.",
    "landing.pricing.actionsTitle": "À quoi servent les Vibes ?",
    "landing.pricing.actionsSub": "8 actions, prix transparent. Aucune surprise.",
    "landing.pricing.action.superlike": "Super-Like",
    "landing.pricing.action.boost": "Boost de profil (30 min)",
    "landing.pricing.action.gifts": "Cadeaux virtuels",
    "landing.pricing.action.seeLikes": "Voir les likes reçus",
    "landing.pricing.action.rewind": "Rewind",
    "landing.pricing.action.passport": "Passport (changer de ville)",
    "landing.pricing.action.icebreaker": "Icebreaker IA",
    "landing.pricing.action.messageBoost": "Boost de message",
    "landing.pricing.wGift": "1 cadeau reçu",
    "landing.pricing.wBody": "= valeur en € affichée dans TA devise, retirable via",
    "landing.pricing.wFrom": "dès",

    // ── Multi-devises ───────────────────────────────────────────────────────
    "landing.mc.eyebrow": "Multi-devises",
    "landing.mc.titleA": "Paiement dans ta devise,",
    "landing.mc.titleB": "partout",
    "landing.mc.subtitle":
      "Détection automatique du pays via l'en-tête x-vercel-ip-country, prix fixes par région pour les Vibes, conversion temps réel pour les cadeaux et le wallet.",
    "landing.mc.detectTitle": "Détection silencieuse de ton pays",
    "landing.mc.detectA": "On lit l'en-tête HTTP",
    "landing.mc.detectB":
      "dès ta première visite pour afficher les prix dans ta devise locale — EUR, USD, GBP, CAD, XAF ou JPY. Aucun réglage à faire, c'est automatique.",
    "landing.mc.fixedTitle": "Prix fixes par région",
    "landing.mc.fixedBody":
      "Style App Store : 1,99 € en zone euro, $1.99 aux US, £1.79 au UK, 1 300 FCFA en Afrique centrale, 250 ¥ au Japon. Aucune mauvaise surprise de change.",
    "landing.mc.giftTitle": "Conversion dynamique des cadeaux",
    "landing.mc.giftBody":
      "La valeur € d'un cadeau reçu est convertie au taux du jour dans TA devise pour l'affichage, puis crédité en € sur ton wallet Stripe Connect.",
    "landing.mc.detected": "Devise détectée",
    "landing.mc.exampleGift": "Cadeau exemple :",
    "landing.mc.displayedValue": "Valeur affichée ({{currency}})",
    "landing.mc.credited": "≈ 0,75 € · crédité en € sur le wallet Stripe",

    // ── FAQ ─────────────────────────────────────────────────────────────────
    "landing.faq.titleA": "Questions",
    "landing.faq.titleB": "fréquentes",
    "landing.faq.subtitle":
      "Tout ce que tu veux savoir avant de vibrer. Reste une question ? Notre équipe répond en moins de 24 h.",
    "landing.faq.q1": "Qu'est-ce que Vivilov ?",
    "landing.faq.a1":
      "Vivilov est une application mobile de rencontre PWA qui met la vidéo de 15 secondes au cœur du profil. Au lieu de photos retouchées, chaque membre présente sa vraie voix, son vrai visage, sa vraie énergie. La plateforme est gratuite, sans abonnement : tu achètes des Vibes optionnelles pour accélérer tes interactions et tu peux encaisser en € les cadeaux virtuels reçus.",
    "landing.faq.q2": "Comment fonctionne la rencontre par vidéo ?",
    "landing.faq.a2":
      "Tu enregistres une vidéo verticale de 15 secondes dans l'app. Elle remplace la photo de profil et passe par notre IA de modération (rejet auto des contenus inappropriés). Les autres membres te découvrent en swipe, voient ta vidéo en mouvement, puis passent le Vibe Check — une question légère à réponse mutuelle. Si tu matchs, la messagerie s'ouvre, et vous pouvez vous envoyer des cadeaux.",
    "landing.faq.q3": "Vivilov est-il payant ?",
    "landing.faq.a3":
      "Non, Vivilov ne fonctionne pas par abonnement. Le swipe, le match, le Vibe Check et la messagerie de base sont gratuits. Tu peux acheter des Vibes pour des actions optionnelles : Super-Like (5), Boost de profil (50), Voir les likes reçus (20), Passport (30), Icebreaker IA (3), Boost de message (10), Rewind (2) ou des cadeaux virtuels de 10 à 500 Vibes. Les Vibes ne sont jamais perdues : elles dorment dans ton wallet.",
    "landing.faq.q4": "Comment monétise-t-on les cadeaux reçus ?",
    "landing.faq.a4":
      "Quand un autre membre t'envoie un cadeau virtuel (Rose, Dîner Romantique, Weekend…), sa valeur en € est créditée sur ton wallet Vivilov. La plateforme prélève une commission de 30 %, le reste t'appartient. Tu peux retirer tes gains via Stripe Connect dès que tu atteins 20 € de solde. Le taux de change appliqué à l'affichage correspond à ta devise locale, mais le crédit est comptabilisé en euros.",
    "landing.faq.q5": "Vivilov est-il disponible dans mon pays / ma devise ?",
    "landing.faq.a5":
      "Oui. Vivilov détecte automatiquement ton pays via l'en-tête x-vercel-ip-country et préselectionne ta devise parmi EUR, USD, GBP, CAD, XAF et JPY. Les prix des Vibes sont fixes par région (style App Store) pour éviter les surprises de change, tandis que la valeur des cadeaux reçus est convertie dynamiquement au taux du jour pour l'affichage. Tu peux à tout moment changer de devise depuis le sélecteur en haut de page.",
    "landing.faq.q6": "Mes données et ma vidéo sont-elles protégées (RGPD) ?",
    "landing.faq.a6":
      "Vivilov est conforme au RGPD. Tes données personnelles (téléphone, profil, vidéo) sont stockées chiffrées dans l'Union européenne. Tu peux exporter, modifier ou supprimer ton compte à tout moment depuis l'app. Les vidéos sont automatiquement supprimées des serveurs si tu désactives ton profil. Notre IA de modération analyse les vidéos en flux sans conservation supplémentaire. Nous ne revendons jamais tes données à des tiers.",

    // ── CTA final ───────────────────────────────────────────────────────────
    "landing.final.badge": "Prêt·e à vibrer ?",
    "landing.final.title": "Prêt·e à vibrer sur la bonne fréquence ?",
    "landing.final.body":
      "Rejoins 12 840 membres qui ont troqué les photos figées pour des vidéos vivantes. Sans abonnement, sans catfish, sans mauvaise surprise.",
    "landing.final.admin": "Voir l'espace admin",
    "landing.final.meta": "Inscription gratuite · 25 Vibes offertes · Sans engagement",

    // ── Footer ──────────────────────────────────────────────────────────────
    "landing.footer.product": "Produit",
    "landing.footer.company": "Entreprise",
    "landing.footer.legal": "Légal",
    "landing.footer.security": "Sécurité",
    "landing.footer.about": "À propos",
    "landing.footer.blog": "Blog",
    "landing.footer.careers": "Carrières",
    "landing.footer.tos": "CGU",
    "landing.footer.gdpr": "RGPD",
    "landing.footer.cookies": "Cookies",
    "landing.footer.tagline":
      "Rencontre authentique par vidéo de 15s. Zéro abonnement, juste des Vibes. Vibrer sur la bonne fréquence, partout dans le monde.",
    "landing.footer.rights": "© {{year}} Vivilov. Tous droits réservés.",
    "landing.footer.madeWith": "Fait avec",
    "landing.footer.andCoffee": "et du bon café",

    // ── Modale de connexion (auth-modal.tsx) ────────────────────────────────
    "landing.auth.stepBadge": "Étape 1/3",
    "landing.auth.security": "Sécurité",
    "landing.auth.titlePhone": "Ton numéro, ta vibe.",
    "landing.auth.titleCreate": "Crée ton code PIN",
    "landing.auth.titleConfirm": "Confirme ton PIN",
    "landing.auth.titleLogin": "Heureux de te revoir",
    "landing.auth.descPhone": "Aucun compte à créer — juste ton numéro et un code.",
    "landing.auth.descCreate": "4 chiffres pour te reconnecter vite. Hashé, jamais partagé.",
    "landing.auth.descConfirm": "Retape les 4 chiffres pour confirmer.",
    "landing.auth.descLogin": "Entre ton PIN à 4 chiffres.",
    "landing.auth.phone": "Téléphone",
    "landing.auth.phonePlaceholder": "6 12 34 56 78",
    "landing.auth.checking": "Vérification…",
    "landing.auth.legal1": "En continuant, tu acceptes nos CGU et notre Politique RGPD.",
    "landing.auth.legal2": "Ton numéro n'est jamais affiché.",
    "landing.auth.creating": "Création du compte…",
    "landing.auth.signIn": "Se connecter",
    "landing.auth.invalidPhone": "Numéro invalide",
    "landing.auth.pinMismatch": "Les codes ne correspondent pas",
    "landing.auth.error": "Erreur",
    "landing.auth.welcome": "Bienvenue sur Vivilov ! +25 Vibes offertes 🎁",
    "landing.auth.welcomeBack": "Content de te revoir 👋",
  },
  {
    // ── Navigation (keys required by nav.tsx) ───────────────────────────────
    "landing.nav.concept": "Concept",
    "landing.nav.features": "Features",
    "landing.nav.pricing": "Pricing",
    "landing.nav.faq": "FAQ",
    "landing.nav.admin": "Admin Area",
    "landing.nav.cta": "Join the experience",
    "landing.nav.openMenu": "Open menu",
    "landing.nav.closeMenu": "Close menu",

    // ── Immersive landing (fullscreen video) ────────────────────────────────
    "landing.im.myAccount": "My account",
    "landing.im.login": "Log in",
    "landing.im.taglineA": "Authentic dating,",
    "landing.im.taglineB": "in a 15-second video.",
    "landing.im.pillVerified": "Verified profiles",
    "landing.im.pillVideo": "15s video",
    "landing.im.pillVibeCheck": "Vibe Check",
    "landing.im.pillNoSub": "No subscription",
    "landing.im.live": "342 Vibes live now",
    "landing.im.backToApp": "Back to the app",
    "landing.im.metaA": "Sign up in 30s ·",
    "landing.im.metaHighlight": "25 free Vibes",
    "landing.im.metaB": "· No commitment",

    // ── Hero ────────────────────────────────────────────────────────────────
    "landing.hero.starsAria": "4.8 out of 5 stars",
    "landing.hero.chipPack": "100 Vibes pack",
    "landing.hero.chipNote": "— fixed price per region",
    "landing.hero.badge": "Authentic dating, on video",
    "landing.hero.titleA": "Authentic dating through",
    "landing.hero.titleB": "15-second video",
    "landing.hero.titleC": "No subscription, just Vibes.",
    "landing.hero.subtitle":
      "Catfish days are over. Record a 15-second video, swipe, match, take the Vibe Check and start vibing on the right frequency. Receive gifts. Cash out in €.",
    "landing.hero.seeDemo": "Watch the demo",
    "landing.hero.reviews": "· 12,840 reviews",
    "landing.hero.platforms": "Available on iOS, Android & Web",
    "landing.hero.scroll": "Discover the experience",

    // ── Hero swipe demo (phone) ─────────────────────────────────────────────
    "landing.demo.q1": "Beach or Mountain?",
    "landing.demo.q2": "Dog or Cat?",
    "landing.demo.q3": "Adventure or Comfort?",
    "landing.demo.q4": "Coffee or Tea?",
    "landing.demo.q5": "City or Nature?",
    "landing.demo.alt": "{{name}}, {{age}}, {{city}}",
    "landing.demo.skip": "Skip",
    "landing.demo.superlike": "Super-Like",

    // ── Features ────────────────────────────────────────────────────────────
    "landing.features.eyebrow": "Why Vivilov",
    "landing.features.titleA": "Dating reimagined for",
    "landing.features.titleB": "real life",
    "landing.features.subtitle":
      "Six building blocks that break the subscription model and reinvent online dating.",
    "landing.features.f1.title": "Authentic 15s video",
    "landing.features.f1.body":
      "A moving video instead of 6 frozen photos. No more catfish, no more fake identities.",
    "landing.features.f2.title": "Vibe Check",
    "landing.features.f2.body":
      "A compatibility mini-game before the match. You only see the other person's answer if you both pick the same.",
    "landing.features.f3.title": "Audio Dating / Blind Swipe",
    "landing.features.f3.body":
      "Voice mode + artistic blur to discover the personality before the face. Slow dating, sound edition.",
    "landing.features.f4.title": "Moderation AI",
    "landing.features.f4.body":
      "Automatic rejection of inappropriate content (nudity, minors, deepfakes). Safety first.",
    "landing.features.f5.title": "Anti-spam messaging",
    "landing.features.f5.body":
      "You can open the conversation, but to keep it going you need a real match. Unlock it with a few Vibes.",
    "landing.features.f6.title": "Monetizable virtual gifts",
    "landing.features.f6.body":
      "Send a Rose, a Romantic Dinner or a Weekend. Every gift received = € value in your wallet.",

    // ── How it works ────────────────────────────────────────────────────────
    "landing.how.eyebrow": "How it works",
    "landing.how.titleA": "3 vibrations from swipe to",
    "landing.how.titleB": "real match",
    "landing.how.subtitle":
      "Vivilov replaces the frozen profile with a living video. Three steps, that's it.",
    "landing.how.s1.title": "Record your 15s video",
    "landing.how.s1.body":
      "Show yourself in motion, no filters, no retouched photos. A raw video = zero catfish.",
    "landing.how.s2.title": "Swipe, match, vibe check",
    "landing.how.s2.body":
      "Like the profiles that resonate with you. Answer the Vibe Check: if you both choose the same, the match opens.",
    "landing.how.s3.title": "Send gifts, earn €",
    "landing.how.s3.body":
      "Send virtual gifts paid for with Vibes. Receive one? It converts into € you can withdraw via Stripe.",

    // ── Vibe Check (showcase) ───────────────────────────────────────────────
    "landing.vibecheck.q": "Beach or Mountain?",
    "landing.vibecheck.beach": "Beach",
    "landing.vibecheck.mountain": "Mountain",
    "landing.vibecheck.titleA": "The match that",
    "landing.vibecheck.titleB": "truly connects",
    "landing.vibecheck.subtitle":
      "Before opening a conversation, you both answer a light question. The other person's answer only appears if it matches yours. 87% of matches start here.",
    "landing.vibecheck.b1": "No bad surprises: you already know if you share a vibe.",
    "landing.vibecheck.b2": "No forced answers: you can skip the question if it doesn't speak to you.",
    "landing.vibecheck.b3": "Over 50 rotating questions to keep things fresh.",

    // ── Stats ───────────────────────────────────────────────────────────────
    "landing.stats.activeUsers": "active users",
    "landing.stats.swipes": "swipes this week",
    "landing.stats.matchRate": "of matches via Vibe Check",
    "landing.stats.zero": "/ month — zero subscription",

    // ── Pricing ─────────────────────────────────────────────────────────────
    "landing.pricing.ribbonPopular": "POPULAR",
    "landing.pricing.ribbonBest": "BEST VALUE",
    "landing.pricing.packLabel": "{{name}} pack",
    "landing.pricing.pack.decouverte": "Discovery",
    "landing.pricing.pack.populaire": "Popular",
    "landing.pricing.pack.premium": "Premium",
    "landing.pricing.bonus": "+ {{n}} bonus Vibes",
    "landing.pricing.fixedPrice": "fixed price {{currency}}",
    "landing.pricing.noSub": "No subscription",
    "landing.pricing.lifetime": "Valid for life",
    "landing.pricing.localCurrency": "Pay in your currency",
    "landing.pricing.buy": "Buy",
    "landing.pricing.titleA": "Zero subscription.",
    "landing.pricing.titleB": "Just Vibes.",
    "landing.pricing.subtitle":
      "You only pay if you want to speed things up — otherwise, swipe and vibe for free. Vibes are never lost: they sleep in your wallet.",
    "landing.pricing.actionsTitle": "What are Vibes for?",
    "landing.pricing.actionsSub": "8 actions, transparent pricing. No surprises.",
    "landing.pricing.action.superlike": "Super-Like",
    "landing.pricing.action.boost": "Profile Boost (30 min)",
    "landing.pricing.action.gifts": "Virtual gifts",
    "landing.pricing.action.seeLikes": "See your likes",
    "landing.pricing.action.rewind": "Rewind",
    "landing.pricing.action.passport": "Passport (change city)",
    "landing.pricing.action.icebreaker": "AI Icebreaker",
    "landing.pricing.action.messageBoost": "Message Boost",
    "landing.pricing.wGift": "1 gift received",
    "landing.pricing.wBody": "= value in € shown in YOUR currency, withdrawable via",
    "landing.pricing.wFrom": "from",

    // ── Multi-currency ──────────────────────────────────────────────────────
    "landing.mc.eyebrow": "Multi-currency",
    "landing.mc.titleA": "Pay in your currency,",
    "landing.mc.titleB": "everywhere",
    "landing.mc.subtitle":
      "Automatic country detection via the x-vercel-ip-country header, fixed regional prices for Vibes, real-time conversion for gifts and the wallet.",
    "landing.mc.detectTitle": "Silent country detection",
    "landing.mc.detectA": "We read the",
    "landing.mc.detectB":
      "HTTP header on your very first visit to show prices in your local currency — EUR, USD, GBP, CAD, XAF or JPY. Nothing to set up, it's automatic.",
    "landing.mc.fixedTitle": "Fixed regional prices",
    "landing.mc.fixedBody":
      "App Store style: €1.99 in the euro zone, $1.99 in the US, £1.79 in the UK, 1,300 FCFA in Central Africa, ¥250 in Japan. No exchange-rate surprises.",
    "landing.mc.giftTitle": "Dynamic gift conversion",
    "landing.mc.giftBody":
      "The € value of a gift you receive is converted at the daily rate into YOUR currency for display, then credited in € to your Stripe Connect wallet.",
    "landing.mc.detected": "Detected currency",
    "landing.mc.exampleGift": "Example gift:",
    "landing.mc.displayedValue": "Displayed value ({{currency}})",
    "landing.mc.credited": "≈ €0.75 · credited in € to the Stripe wallet",

    // ── FAQ ─────────────────────────────────────────────────────────────────
    "landing.faq.titleA": "Frequently",
    "landing.faq.titleB": "asked questions",
    "landing.faq.subtitle":
      "Everything you want to know before you start vibing. Still have a question? Our team replies within 24 hours.",
    "landing.faq.q1": "What is Vivilov?",
    "landing.faq.a1":
      "Vivilov is a PWA mobile dating app that puts the 15-second video at the heart of your profile. Instead of retouched photos, every member shows their real voice, real face, real energy. The platform is free, with no subscription: you buy optional Vibes to speed up your interactions and you can cash out the virtual gifts you receive in €.",
    "landing.faq.q2": "How does video dating work?",
    "landing.faq.a2":
      "You record a 15-second vertical video in the app. It replaces your profile photo and goes through our moderation AI (auto-rejection of inappropriate content). Other members discover you by swiping, watch your video in motion, then take the Vibe Check — a light question with a mutual answer. If you match, messaging opens and you can send each other gifts.",
    "landing.faq.q3": "Does Vivilov cost anything?",
    "landing.faq.a3":
      "No, Vivilov doesn't work on a subscription basis. Swiping, matching, the Vibe Check and basic messaging are free. You can buy Vibes for optional actions: Super-Like (5), Profile Boost (50), See your likes (20), Passport (30), AI Icebreaker (3), Message Boost (10), Rewind (2) or virtual gifts from 10 to 500 Vibes. Vibes are never lost: they sleep in your wallet.",
    "landing.faq.q4": "How do you monetize received gifts?",
    "landing.faq.a4":
      "When another member sends you a virtual gift (Rose, Romantic Dinner, Weekend…), its € value is credited to your Vivilov wallet. The platform takes a 30% commission, the rest is yours. You can withdraw your earnings via Stripe Connect once your balance reaches €20. The exchange rate used for display matches your local currency, but the credit is recorded in euros.",
    "landing.faq.q5": "Is Vivilov available in my country / currency?",
    "landing.faq.a5":
      "Yes. Vivilov automatically detects your country via the x-vercel-ip-country header and preselects your currency from EUR, USD, GBP, CAD, XAF and JPY. Vibes prices are fixed per region (App Store style) to avoid exchange-rate surprises, while the value of received gifts is converted dynamically at the daily rate for display. You can change your currency at any time from the selector at the top of the page.",
    "landing.faq.q6": "Are my data and my video protected (GDPR)?",
    "landing.faq.a6":
      "Vivilov is GDPR-compliant. Your personal data (phone, profile, video) is stored encrypted in the European Union. You can export, edit or delete your account at any time from the app. Videos are automatically removed from the servers if you deactivate your profile. Our moderation AI analyzes videos on the fly with no extra retention. We never resell your data to third parties.",

    // ── Final CTA ───────────────────────────────────────────────────────────
    "landing.final.badge": "Ready to vibe?",
    "landing.final.title": "Ready to vibe on the right frequency?",
    "landing.final.body":
      "Join 12,840 members who've traded frozen photos for living videos. No subscription, no catfish, no nasty surprises.",
    "landing.final.admin": "View the admin area",
    "landing.final.meta": "Free sign-up · 25 free Vibes · No commitment",

    // ── Footer ──────────────────────────────────────────────────────────────
    "landing.footer.product": "Product",
    "landing.footer.company": "Company",
    "landing.footer.legal": "Legal",
    "landing.footer.security": "Security",
    "landing.footer.about": "About",
    "landing.footer.blog": "Blog",
    "landing.footer.careers": "Careers",
    "landing.footer.tos": "Terms of Use",
    "landing.footer.gdpr": "GDPR",
    "landing.footer.cookies": "Cookies",
    "landing.footer.tagline":
      "Authentic dating through 15-second video. No subscription, just Vibes. Vibe on the right frequency, anywhere in the world.",
    "landing.footer.rights": "© {{year}} Vivilov. All rights reserved.",
    "landing.footer.madeWith": "Made with",
    "landing.footer.andCoffee": "and good coffee",

    // ── Login modal (auth-modal.tsx) ────────────────────────────────────────
    "landing.auth.stepBadge": "Step 1/3",
    "landing.auth.security": "Security",
    "landing.auth.titlePhone": "Your number, your vibe.",
    "landing.auth.titleCreate": "Create your PIN code",
    "landing.auth.titleConfirm": "Confirm your PIN",
    "landing.auth.titleLogin": "Great to see you again",
    "landing.auth.descPhone": "No account to create — just your number and a code.",
    "landing.auth.descCreate": "4 digits to sign back in fast. Hashed, never shared.",
    "landing.auth.descConfirm": "Type the 4 digits again to confirm.",
    "landing.auth.descLogin": "Enter your 4-digit PIN.",
    "landing.auth.phone": "Phone",
    "landing.auth.phonePlaceholder": "555 123 4567",
    "landing.auth.checking": "Checking…",
    "landing.auth.legal1": "By continuing, you accept our Terms and our Privacy Policy.",
    "landing.auth.legal2": "Your number is never displayed.",
    "landing.auth.creating": "Creating your account…",
    "landing.auth.signIn": "Sign in",
    "landing.auth.invalidPhone": "Invalid number",
    "landing.auth.pinMismatch": "The codes don't match",
    "landing.auth.error": "Error",
    "landing.auth.welcome": "Welcome to Vivilov! +25 free Vibes 🎁",
    "landing.auth.welcomeBack": "Great to have you back 👋",
  },
);
