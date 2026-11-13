// Maillage des pages off-market (nov. 2026, controle Google du 13/11 : les
// pages off-market et ARCOVA recevaient 1 ou 2 liens internes). Module pur.
// Bloc « Autres opportunites off-market » : les autres opportunites
// publiees (6 au plus), dans l'ordre de la liste en repartant apres la page
// courante, pour que chacune soit montree par les autres.

export const OTHER_OFFMARKET_MAX = 6;

export function otherOffmarket<T extends { id: string }>(list: T[], currentId: string | null, max = OTHER_OFFMARKET_MAX): T[] {
  const i = currentId ? list.findIndex((p) => p.id === currentId) : -1;
  const rotated = i >= 0 ? [...list.slice(i + 1), ...list.slice(0, i)] : list;
  return rotated.filter((p) => p.id !== currentId).slice(0, max);
}
