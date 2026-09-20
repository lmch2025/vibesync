// Helper de définition de dictionnaire bilingue.
// Chaque namespace exporte `defineDict(fr, en)` où les DEUX objets ont
// exactement les mêmes clés (préfixées par le namespace, ex "swipe.title").

export type DictEntries = Record<string, string>;
export type BilingualDict = { fr: DictEntries; en: DictEntries };

export function defineDict(fr: DictEntries, en: DictEntries): BilingualDict {
  return { fr, en };
}
