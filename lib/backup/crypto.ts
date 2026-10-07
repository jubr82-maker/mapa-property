// Chiffrement des sauvegardes (oct. 2026) : AES-256-GCM, cle de 32 octets
// en base64 lue dans BACKUP_ENCRYPTION_KEY (jamais ecrite ailleurs).
// Format du fichier : "MAPABK1" (7 octets) + vecteur d'initialisation (12)
// + etiquette d'authentification (16) + donnees chiffrees. Toute
// alteration du fichier fait echouer le dechiffrement.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("MAPABK1", "ascii");
const IV_LEN = 12;
const TAG_LEN = 16;

/** Cle depuis sa forme base64 ; erreur explicite si absente ou mal formee. */
export function parseBackupKey(raw: string | undefined | null): Buffer {
  const value = String(raw ?? "").trim();
  if (!value) throw new Error("backup_key_missing");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("backup_key_invalid");
  return key;
}

export function encryptBackup(plain: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

export function decryptBackup(file: Buffer, key: Buffer): Buffer {
  if (file.length < MAGIC.length + IV_LEN + TAG_LEN || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("backup_format_invalid");
  const iv = file.subarray(MAGIC.length, MAGIC.length + IV_LEN);
  const tag = file.subarray(MAGIC.length + IV_LEN, MAGIC.length + IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(file.subarray(MAGIC.length + IV_LEN + TAG_LEN)), decipher.final()]);
}
