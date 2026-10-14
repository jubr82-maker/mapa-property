// Verification locale d'une cle de sauvegarde (oct. 2026), avant de
// l'enregistrer dans Vercel. Lit le fichier donne en argument, applique la
// meme regle que la sauvegarde (lib/backup/crypto.ts) et n'affiche JAMAIS
// la cle : seulement "cle valide : 32 octets" ou le diagnostic sans secret.
// Usage : node --import tsx scripts/check-backup-key.mts ~/mapa-cle-sauvegarde.txt
import { readFileSync } from "node:fs";
import { parseBackupKey } from "../lib/backup/crypto";

const file = process.argv[2];
if (!file) {
  console.error("usage : node --import tsx scripts/check-backup-key.mts <fichier contenant la cle>");
  process.exit(2);
}
try {
  const key = parseBackupKey(readFileSync(file, "utf8"));
  console.log(`cle valide : ${key.length} octets`);
} catch (e) {
  console.error(`cle refusee : ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
