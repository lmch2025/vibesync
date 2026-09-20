// Fusion de tous les dictionnaires bilingues. Les clés sont préfixées par
// namespace ("landing.", "auth.", "swipe."…) donc la fusion plate est sans
// collision. Chaque agent ne remplit que SON fichier de namespace.
import { common } from "./common";
import { apiErrorDict as api } from "../api-errors";
import { landing } from "./landing";
import { auth } from "./auth";
import { onboarding } from "./onboarding";
import { swipe } from "./swipe";
import { chat } from "./chat";
import { wallet } from "./wallet";
import { profile } from "./profile";
import { misc } from "./misc";
import type { Lang } from "../core";

const ALL = [api, common, landing, auth, onboarding, swipe, chat, wallet, profile, misc];

export const DICTS: Record<Lang, Record<string, string>> = {
  fr: Object.assign({}, ...ALL.map((d) => d.fr)),
  en: Object.assign({}, ...ALL.map((d) => d.en)),
};

// Vérification de parité (dev uniquement) : signale les clés présentes en fr
// mais manquantes en en (et réciproquement) — les oublis tombent ici.
if (process.env.NODE_ENV !== "production") {
  for (const { fr, en } of ALL) {
    for (const k of Object.keys(fr)) if (!(k in en)) console.warn(`[i18n] "${k}" absent du dictionnaire EN`);
    for (const k of Object.keys(en)) if (!(k in fr)) console.warn(`[i18n] "${k}" absent du dictionnaire FR`);
  }
}
