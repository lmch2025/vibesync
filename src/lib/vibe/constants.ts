// Vivilov "Vibes" economy (the convivial name for the in-app currency),
// gift catalog, Vibes packs, price tiers, vibe questions.
// Source of truth for both server (API routes) and client (UI display).

export const GEM_ACTIONS = {
  // Existing actions
  superlike: 5,
  boost: 50,
  rewind: 2,
  passport: 30,
  icebreaker: 3,
  seeLikes: 20,
  messageBoost: 10,
  // 10 new premium actions
  spotlight: 40,       // Profile spotlight — appear in 20 decks for 1h
  superRewind: 15,     // Rewind 5 swipes at once
  vibeRadar: 25,       // See who's online near you right now
  crushAlert: 35,      // Send a special notification to someone you haven't matched yet
  goldenHeart: 60,     // Super super-like with golden visual + priority queue
  timeFreeze: 45,      // Pause the deck timer + see next 3 profiles
  compatibilityReport: 20, // AI-generated compatibility report for a profile
  moodRing: 15,        // Reveal the current mood/vibe of a profile
  ghostMode: 35,       // Browse profiles invisibly for 1h (no "viewed" trace)
  dailyDouble: 10,     // Double your streak reward today
} as const;

export type GemActionKey = keyof typeof GEM_ACTIONS;

/// Premium action metadata for UI display.
export type PremiumAction = {
  key: GemActionKey;
  label: string;
  description: string;
  emoji: string;
  cost: number;
  category: "swipe" | "profile" | "social" | "meta";
};

export const PREMIUM_ACTIONS: PremiumAction[] = [
  { key: "superlike", label: "Super-Like", description: "Apparaît en haut de sa file d'attente", emoji: "⭐", cost: 5, category: "swipe" },
  { key: "rewind", label: "Rewind", description: "Annule ton dernier swipe et récupère le profil", emoji: "↩️", cost: 2, category: "swipe" },
  { key: "boost", label: "Boost", description: "Sois en haut de la file de 20 profils pendant 30 min", emoji: "🚀", cost: 50, category: "swipe" },
  { key: "superRewind", label: "Super Rewind", description: "Annule tes 5 derniers swipes d'un coup", emoji: "⚡", cost: 15, category: "swipe" },
  { key: "goldenHeart", label: "Cœur d'Or", description: "Super-like doré + tête de sa file avec badge spécial", emoji: "💛", cost: 60, category: "swipe" },
  { key: "timeFreeze", label: "Temps Gelé", description: "Voir les 3 prochains profils avant de swiper", emoji: "❄️", cost: 45, category: "swipe" },
  { key: "vibeRadar", label: "Vibe Radar", description: "Vois qui est en ligne près de toi en ce moment", emoji: "📍", cost: 25, category: "social" },
  { key: "crushAlert", label: "Crush Alert", description: "Envoie une notification spéciale à ton crush", emoji: "💘", cost: 35, category: "social" },
  { key: "seeLikes", label: "Voir les Likes", description: "Dévoile les profils qui t'ont déjà liké", emoji: "👁️", cost: 20, category: "social" },
  { key: "icebreaker", label: "Icebreaker IA", description: "Génère une phrase d'accroche personnalisée par IA", emoji: "✨", cost: 3, category: "social" },
  { key: "messageBoost", label: "Boost Message", description: "Ton message remonte en haut de sa boîte de réception", emoji: "⚡", cost: 10, category: "social" },
  { key: "passport", label: "Passport", description: "Swipe dans une autre ville pendant 24h", emoji: "✈️", cost: 30, category: "profile" },
  { key: "spotlight", label: "Projecteur", description: "Ton profil apparaît dans 20 decks pendant 1h", emoji: "🔦", cost: 40, category: "profile" },
  { key: "compatibilityReport", label: "Rapport Compatibilité", description: "Analyse IA de ta compatibilité avec un profil", emoji: "🧬", cost: 20, category: "profile" },
  { key: "moodRing", label: "Anneau d'Humeur", description: "Révèle l'humeur actuelle d'un profil", emoji: "🎭", cost: 15, category: "profile" },
  { key: "ghostMode", label: "Mode Fantôme", description: "Navigue les profils invisiblement pendant 1h", emoji: "👻", cost: 35, category: "meta" },
  { key: "dailyDouble", label: "Double Quotidien", description: "Double ta récompense de série du jour", emoji: "🎲", cost: 10, category: "meta" },
];

/// Welcome bonus given on signup so the demo is immediately playable.
export const WELCOME_GEMS = 25;

/// Anti-spam messaging: max messages the match initiator can send before reply.
export const MAX_MESSAGES_BEFORE_REPLY = 3;

/// Withdrawal threshold (€) for Stripe Connect payout.
export const WITHDRAWAL_THRESHOLD_EUR = 20;

/// Platform commission on gifts (30%).
export const PLATFORM_COMMISSION = 0.3;

/// Currency price tiers per Vibes pack (App-Store style fixed regional pricing).
/// Packs start at 100 FCFA (≈ €0.15) — affordable for the FCFA target market.
export type PriceTier = { currency: string; amount: number };

export type GemPack = {
  id: string;
  /// Human-readable label (notifications, receipts, admin reports).
  title: string;
  gems: number;
  bonus: number;
  popular?: boolean;
  bestValue?: boolean;
  tiers: PriceTier[];
  accent: "purple" | "orange" | "pink";
};

export const GEM_PACKS: GemPack[] = [
  {
    id: "decouverte",
    title: "Pack Découverte",
    gems: 100,
    bonus: 0,
    tiers: [
      { currency: "XAF", amount: 100 },
      { currency: "EUR", amount: 0.15 },
      { currency: "USD", amount: 0.16 },
      { currency: "GBP", amount: 0.13 },
      { currency: "CAD", amount: 0.22 },
      { currency: "JPY", amount: 25 },
    ],
    accent: "purple",
  },
  {
    id: "populaire",
    title: "Pack Populaire",
    gems: 600,
    bonus: 50,
    popular: true,
    tiers: [
      { currency: "XAF", amount: 500 },
      { currency: "EUR", amount: 0.76 },
      { currency: "USD", amount: 0.82 },
      { currency: "GBP", amount: 0.65 },
      { currency: "CAD", amount: 1.11 },
      { currency: "JPY", amount: 125 },
    ],
    accent: "orange",
  },
  {
    id: "premium",
    title: "Pack Premium",
    gems: 1500,
    bonus: 300,
    bestValue: true,
    tiers: [
      { currency: "XAF", amount: 1000 },
      { currency: "EUR", amount: 1.52 },
      { currency: "USD", amount: 1.64 },
      { currency: "GBP", amount: 1.29 },
      { currency: "CAD", amount: 2.22 },
      { currency: "JPY", amount: 250 },
    ],
    accent: "pink",
  },
];

export type Gift = {
  id: string;
  key: string;
  name: string;
  emoji: string;
  gemCost: number;
  eurValueCents: number;
  popular?: boolean;
};

export const GIFTS: Gift[] = [
  { id: "g1", key: "rose", name: "Rose Virtuelle", emoji: "🌹", gemCost: 10, eurValueCents: 5, popular: true },
  { id: "g2", key: "cocktail", name: "Cocktail", emoji: "🍹", gemCost: 20, eurValueCents: 10 },
  { id: "g3", key: "chocolate", name: "Chocolats", emoji: "🍫", gemCost: 30, eurValueCents: 15 },
  { id: "g4", key: "cinema", name: "Ticket Cinéma", emoji: "🎬", gemCost: 50, eurValueCents: 25, popular: true },
  { id: "g5", key: "bouquet", name: "Bouquet de Fleurs", emoji: "💐", gemCost: 80, eurValueCents: 40 },
  { id: "g6", key: "dinner", name: "Dîner Romantique", emoji: "🕯️", gemCost: 150, eurValueCents: 75, popular: true },
  { id: "g7", key: "perfume", name: "Parfum", emoji: "🧴", gemCost: 250, eurValueCents: 125 },
  { id: "g8", key: "weekend", name: "Weekend Évasion", emoji: "✈️", gemCost: 500, eurValueCents: 250 },
];

export const VIBE_QUESTIONS = [
  { id: "v1", q: "Plage ou Montagne ?", a: "plage", b: "montagne" },
  { id: "v2", q: "Chien ou Chat ?", a: "chien", b: "chat" },
  { id: "v3", q: "Aventure ou Confort ?", a: "aventure", b: "confort" },
  { id: "v4", q: "Café ou Thé ?", a: "cafe", b: "the" },
  { id: "v5", q: "Ville ou Nature ?", a: "ville", b: "nature" },
];

export type CurrencyConfig = {
  code: string;
  symbol: string;
  flag: string;
  locale: string;
  name: string;
};

export const CURRENCIES: Record<string, CurrencyConfig> = {
  EUR: { code: "EUR", symbol: "€", flag: "🇪🇺", locale: "fr-FR", name: "Euro" },
  USD: { code: "USD", symbol: "$", flag: "🇺🇸", locale: "en-US", name: "US Dollar" },
  GBP: { code: "GBP", symbol: "£", flag: "🇬🇧", locale: "en-GB", name: "Livre Sterling" },
  CAD: { code: "CAD", symbol: "C$", flag: "🇨🇦", locale: "fr-CA", name: "Dollar Canadien" },
  XAF: { code: "XAF", symbol: "FCFA", flag: "🇨🇲", locale: "fr-FR", name: "Franc CFA" },
  JPY: { code: "JPY", symbol: "¥", flag: "🇯🇵", locale: "ja-JP", name: "Yen" },
};

export const FALLBACK_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  CAD: 1.47,
  XAF: 655.957,
  JPY: 162.5,
};

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", BE: "EUR", PT: "EUR", NL: "EUR", IE: "EUR",
  AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR",
  LT: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
  US: "USD", EC: "USD", SV: "USD", PA: "USD", ZW: "USD",
  GB: "GBP",
  CA: "CAD",
  JP: "JPY",
  CM: "XAF", TD: "XAF", CG: "XAF", GA: "XAF", CF: "XAF", GQ: "XAF",
};

export function detectCurrencyFromCountry(country?: string | null): string {
  if (!country) return "EUR";
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? "EUR";
}
