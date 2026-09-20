// Helpers i18n côté SERVEUR (routes API, notifications).
import { db } from "@/lib/db";
import { Lang, detectLangFromAcceptLanguage, isValidLang, translate } from "./core";

/// Langue enregistrée sur le compte d'un utilisateur (repli "fr").
export async function getUserLang(userId: string): Promise<Lang> {
  try {
    const u = await db.user.findUnique({ where: { id: userId }, select: { lang: true } });
    return isValidLang(u?.lang) ? (u.lang as Lang) : "fr";
  } catch {
    return "fr";
  }
}

/// Traduction serveur : même dictionnaire que le client.
export function tFor(lang: Lang, key: string, params?: Record<string, string | number>): string {
  return translate(lang, key, params);
}

/// Résout la langue d'une requête entrante (inscription…) :
/// choix explicite (cookie) → dernière langue effective (cookie) →
/// Accept-Language → "fr".
export function resolveRequestLang(req: Request): Lang {
  const cookie = req.headers.get("cookie") ?? "";
  const choice = cookie.match(/(?:^|;\s*)vibe_lang_choice=(fr|en)(?:;|$)/);
  if (choice) return choice[1] as Lang;
  const effective = cookie.match(/(?:^|;\s*)vibe_lang=(fr|en)(?:;|$)/);
  if (effective) return effective[1] as Lang;
  return detectLangFromAcceptLanguage(req.headers.get("accept-language"));
}
