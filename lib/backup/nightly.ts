// Sauvegarde nocturne de la base (oct. 2026), lancee par /api/cron/backup.
// Etapes : export complet du schema public (structure et lignes), gzip,
// chiffrement AES-256-GCM (BACKUP_ENCRYPTION_KEY), depot dans le bucket R2
// prive des sauvegardes sous backups/nightly/, resume des nombres de lignes
// a cote, puis rotation (30 sauvegardes gardees). Resultat dans cron_runs
// (tache "backup"). Dependances injectees : testable sans reseau.
import { gzipSync } from "node:zlib";
import { encryptBackup, parseBackupKey } from "@/lib/backup/crypto";
import { rowCounts, type BackupPayload } from "@/lib/backup/export";
import { KEEP_BACKUPS, NIGHTLY_PREFIX, keysToDelete, listStamps, stampOf, type StoredObject } from "@/lib/backup/rotation";

export type NightlyDeps = {
  exportDb: () => Promise<BackupPayload>;
  put: (key: string, body: Buffer, contentType: string) => Promise<void>;
  list: (prefix: string) => Promise<StoredObject[]>;
  remove: (key: string) => Promise<void>;
  record: (task: string, ok: boolean, detail: string) => Promise<void>;
  keyBase64: string | undefined;
  now?: () => Date;
};

export type NightlyResult = { ok: boolean; detail: string; key?: string; sizeBytes?: number; counts?: Record<string, number>; kept?: number; deleted?: number };

export type BackupSummary = { stamp: string; created_at: string; size_bytes: number; counts: Record<string, number> };

export async function runNightlyBackup(deps: NightlyDeps): Promise<NightlyResult> {
  const now = deps.now?.() ?? new Date();
  let result: NightlyResult;
  try {
    // Cle verifiee AVANT l'export : jamais de fichier non chiffre.
    const key = parseBackupKey(deps.keyBase64);
    const payload = await deps.exportDb();
    const counts = rowCounts(payload);
    const encrypted = encryptBackup(gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9 }), key);
    const stamp = stampOf(now);
    const fileKey = `${NIGHTLY_PREFIX}${stamp}.json.gz.enc`;
    await deps.put(fileKey, encrypted, "application/octet-stream");
    const summary: BackupSummary = { stamp, created_at: now.toISOString(), size_bytes: encrypted.length, counts };
    await deps.put(`${NIGHTLY_PREFIX}${stamp}.counts.json`, Buffer.from(JSON.stringify(summary)), "application/json");
    const objects = await deps.list(NIGHTLY_PREFIX);
    const toDelete = keysToDelete(objects, KEEP_BACKUPS);
    for (const k of toDelete) await deps.remove(k);
    const kept = Math.min(listStamps(objects).length, KEEP_BACKUPS);
    const rows = Object.values(counts).reduce((a, b) => a + b, 0);
    result = { ok: true, key: fileKey, sizeBytes: encrypted.length, counts, kept, deleted: toDelete.length, detail: `ok taille=${encrypted.length} tables=${Object.keys(counts).length} lignes=${rows} gardees=${kept} supprimees=${toDelete.length}` };
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    result = { ok: false, detail: `echec ${cause}`.slice(0, 300) };
  }
  await deps.record("backup", result.ok, result.detail);
  return result;
}
