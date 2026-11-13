// Bloc « Autres recherches en cours » d'une page de recherche (nov. 2026,
// controle Google du 13/11 : R-2026-002 ne recevait qu'un lien). Module
// pur : les autres recherches ouvertes (statut "published"), 4 au plus,
// dans l'ordre de la liste en repartant apres la recherche courante, pour
// que chacune soit montree par les autres.
export const OTHER_SEARCHES_MAX = 4;

export function otherSearches<T extends { reference: string; status?: string | null }>(list: T[], currentRef: string, max = OTHER_SEARCHES_MAX): T[] {
  const open = list.filter((s) => s.status === "published");
  const i = open.findIndex((s) => s.reference === currentRef);
  const rotated = i >= 0 ? [...open.slice(i + 1), ...open.slice(0, i)] : open;
  return rotated.filter((s) => s.reference !== currentRef).slice(0, max);
}
