// Rotation des sauvegardes nocturnes (oct. 2026) : les 30 plus recentes
// sont gardees, les plus anciennes supprimees par la tache elle-meme.
// Chaque sauvegarde = un fichier chiffre (.json.gz.enc) et son resume
// (.counts.json, nombres de lignes par table, sans contenu).
export const NIGHTLY_PREFIX = "backups/nightly/";
export const KEEP_BACKUPS = 30;

export type StoredObject = { key: string; lastModified?: Date; size?: number };

/** Horodatage du nom de fichier : backups/nightly/2026-10-08T01-00-04Z.json.gz.enc */
export function backupStamp(key: string): string | null {
  return key.match(/^backups\/nightly\/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z)\.(json\.gz\.enc|counts\.json)$/)?.[1] ?? null;
}

/** Sauvegardes presentes, de la plus recente a la plus ancienne. */
export function listStamps(objects: StoredObject[]): string[] {
  const stamps = new Set(objects.filter((o) => o.key.endsWith(".json.gz.enc")).map((o) => backupStamp(o.key)).filter((s): s is string => !!s));
  return [...stamps].sort().reverse();
}

/** Objets a supprimer pour ne garder que les `keep` sauvegardes les plus recentes. */
export function keysToDelete(objects: StoredObject[], keep = KEEP_BACKUPS): string[] {
  const keepStamps = new Set(listStamps(objects).slice(0, keep));
  return objects.filter((o) => {
    const s = backupStamp(o.key);
    return s !== null && !keepStamps.has(s);
  }).map((o) => o.key);
}

export function stampOf(now: Date): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
}
