// Chiffrement des sauvegardes (oct. 2026) : AES-256-GCM, cle de 32 octets
// en base64 lue dans BACKUP_ENCRYPTION_KEY (jamais ecrite ailleurs).
// Format du fichier : "MAPABK1" (7 octets) + vecteur d'initialisation (12)
// + etiquette d'authentification (16) + donnees chiffrees. Toute
// alteration du fichier fait echouer le dechiffrement.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("MAPABK1", "ascii");
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Forme normalisee de la valeur saisie (oct. 2026) : tous les blancs retires
 * (espaces, tabulations, retours a la ligne, y compris au milieu et les
 * sequences litterales \n ou \r d'un copier-coller), guillemets
 * englobants retires, prefixe "BACKUP_ENCRYPTION_KEY=" retire.
 */
function normalizeKeyText(raw: string | undefined | null): string {
  let v = String(raw ?? "").replace(/\\[nrt]/g, "").replace(/\s+/g, "");
  v = v.replace(/^BACKUP_ENCRYPTION_KEY=/, "");
  if (/^(["'`]).*\1$/.test(v)) v = v.slice(1, -1);
  return v;
}

const B64_STRICT = /^[A-Za-z0-9+/]+={0,2}$/;
const B64_URL = /^[A-Za-z0-9_-]+={0,2}$/;
const HEX_64 = /^[0-9a-fA-F]{64}$/;

/**
 * Cle depuis sa forme texte. Formats acceptes : base64 standard (sortie de
 * "openssl rand -base64 32", 44 caracteres dont "=" final), base64 sans
 * "=" final ou en variante URL (- et _), ou 64 caracteres hexadecimaux
 * ("openssl rand -hex 32"). Le decodage doit donner exactement 32 octets et
 * se reencoder a l'identique (pas de decodage permissif qui ignorerait des
 * caracteres). Erreurs : backup_key_missing, ou backup_key_invalid suivi
 * d'un diagnostic qui ne contient JAMAIS la cle ni aucun de ses caracteres.
 */
export function parseBackupKey(raw: string | undefined | null): Buffer {
  const v = normalizeKeyText(raw);
  if (!v) throw new Error("backup_key_missing");
  if (HEX_64.test(v)) return Buffer.from(v, "hex");
  if (B64_STRICT.test(v) || B64_URL.test(v)) {
    const std = v.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    const key = Buffer.from(std, "base64");
    if (key.length === 32 && key.toString("base64").replace(/=+$/, "") === std) return key;
  }
  throw new Error(`backup_key_invalid (${describeBackupKey(raw)})`);
}

/**
 * Diagnostic sans secret : longueur brute et normalisee, blancs retires,
 * familles de caracteres presentes, octets obtenus au decodage base64.
 * Jamais la valeur ni un extrait.
 */
export function describeBackupKey(raw: string | undefined | null): string {
  const s = String(raw ?? "");
  const v = normalizeKeyText(raw);
  const families = [
    /[A-Za-z0-9]/.test(v) && "alphanum",
    /[+/]/.test(v) && "+/",
    /[-_]/.test(v) && "-_",
    /=/.test(v) && "=",
    /[^A-Za-z0-9+/=_-]/.test(v) && `autres:${(v.match(/[^A-Za-z0-9+/=_-]/g) ?? []).length}`,
  ].filter(Boolean);
  const midPad = /=[^=]/.test(v);
  const decoded = Buffer.from(v.replace(/-/g, "+").replace(/_/g, "/"), "base64").length;
  return [
    `longueur ${s.length}`,
    `apres nettoyage ${v.length}`,
    `blancs ${s.length - s.replace(/\s/g, "").length}`,
    `caracteres ${families.join(",") || "aucun"}`,
    midPad ? "signe = au milieu" : null,
    `octets decodes ${decoded}`,
    "attendu 44 caracteres base64 ou 64 hexadecimaux, 32 octets",
  ].filter(Boolean).join(", ");
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
