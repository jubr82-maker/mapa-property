// Enregistrement des photos d'un bien sans effacement prealable (nov. 2026).
// Avant : toutes les lignes property_images du bien etaient effacees puis
// reinserees ; un enregistrement interrompu entre les deux laissait la
// galerie vide. Ici : ajout des nouvelles photos, mise a jour de l'ordre,
// puis retrait des SEULES photos supprimees par Julien. Une ligne inconnue
// de l'ecran (ancienne image Apimo masquee, photo ajoutee ailleurs) n'est
// jamais retiree : elle est rangee apres les photos de l'ecran.
// Module pur (serveur et tests).

export type DbPhotoRow = { url: string; sort: number | null };
export type PhotoSavePlan = {
  insert: { url: string; sort: number }[];
  update: { url: string; sort: number }[];
  remove: string[];
  /** Lignes du bien apres l'enregistrement, dans l'ordre. */
  after: { url: string; sort: number }[];
};

export function planPhotoSave(db: DbPhotoRow[], desired: string[], removed: string[]): PhotoSavePlan {
  const wanted = [...new Set(desired.filter((u) => typeof u === "string" && u.trim()))];
  const wantedSet = new Set(wanted);
  const removeSet = new Set(removed.filter((u) => !wantedSet.has(u)));
  const current = new Map<string, number | null>();
  for (const r of db) if (!current.has(r.url)) current.set(r.url, r.sort);

  const after: { url: string; sort: number }[] = wanted.map((url, i) => ({ url, sort: i }));
  // Lignes hors ecran et non supprimees : gardees, apres, dans leur ordre.
  const others = db
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !wantedSet.has(r.url) && !removeSet.has(r.url))
    .sort((a, b) => (a.r.sort ?? 0) - (b.r.sort ?? 0) || a.i - b.i)
    .map(({ r }) => r.url);
  for (const url of [...new Set(others)]) after.push({ url, sort: after.length });

  const insert = after.filter((a) => wantedSet.has(a.url) && !current.has(a.url));
  const update = after.filter((a) => current.has(a.url) && current.get(a.url) !== a.sort);
  const remove = [...removeSet].filter((u) => current.has(u));
  return { insert, update, remove, after };
}
