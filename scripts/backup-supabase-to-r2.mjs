// Sprint Backup Supabase -> R2 (mode manuel, sans Docker).
//
// Dump la base Supabase via pg_dump (connexion directe Postgres pooler),
// compresse en gzip, upload sur bucket R2 prive "mapa-property-backups",
// rotation 30 jours.
//
// Pre-requis :
//   - .env.local :
//       SUPABASE_DB_URL=postgresql://postgres.dutfkblygfvhhwpzxmfz:PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres
//       R2_ACCOUNT_ID, R2_BACKUP_ACCESS_KEY_ID, R2_BACKUP_SECRET_ACCESS_KEY,
//       R2_BACKUP_BUCKET
//   - pg_dump installe : /opt/homebrew/opt/libpq/bin/pg_dump (libpq 18.4)
//     Override possible via PG_DUMP_BIN env var.
//
// Usage :
//   pnpm backup
//
// Logs verbeux par defaut. Sort en erreur explicite si une etape echoue.
// Le fichier temporaire local est toujours nettoye (succes ou echec).

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, rm, mkdir, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzip } from "node:zlib";
import { config } from "dotenv";

// Charge .env.local AVANT tout import qui consomme process.env.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const execFileP = promisify(execFile);
const gzipP = promisify(gzip);

// Import dynamique APRES dotenv pour que lib/r2.ts capte les env vars.
const {
  uploadBackupToR2,
  listBackupR2Objects,
  deleteBackupFromR2,
  isBackupR2Configured,
} = await import("../lib/r2.ts");

const PROJECT_REF = "dutfkblygfvhhwpzxmfz";
const PREFIX = "backups/";
const RETENTION_DAYS = 30;
const DEFAULT_PG_DUMP_BIN = "/opt/homebrew/opt/libpq/bin/pg_dump";

function log(msg) {
  console.log(`[backup] ${msg}`);
}

function logErr(msg) {
  console.error(`[backup] ${msg}`);
}

function isoNow() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "-")
    .slice(0, 19); // 2026-06-22-14-32-08
}

/**
 * Mask password dans la connection string pour les logs.
 * postgresql://user:PASS@host:port/db -> postgresql://user:***@host:port/db
 */
function maskDbUrl(url) {
  return url.replace(/(:\/\/[^:]+:)[^@]+(@)/, "$1***$2");
}

async function resolvePgDumpBin() {
  const candidate = process.env.PG_DUMP_BIN?.trim() || DEFAULT_PG_DUMP_BIN;
  try {
    await access(candidate);
    return candidate;
  } catch {
    throw new Error(
      `pg_dump introuvable a ${candidate}. Installer libpq : ` +
        `brew install libpq, OU override via PG_DUMP_BIN=/chemin/absolu/pg_dump.`,
    );
  }
}

async function runPgDump({ binary, dbUrl, outFile }) {
  // --no-owner / --no-privileges : evite les ALTER OWNER et GRANT/REVOKE qui
  // ne sont pas valides pour une restauration cross-environnement Supabase
  // (utilisateurs/roles differents entre projets).
  // Format plain SQL (default) : restaurable via psql, lisible, gzip-friendly.
  const args = [
    dbUrl,
    "--no-owner",
    "--no-privileges",
    "--format=plain",
    "--file",
    outFile,
  ];
  log(`> pg_dump ${maskDbUrl(dbUrl)} --no-owner --no-privileges --format=plain --file ${outFile}`);
  try {
    const { stderr } = await execFileP(binary, args, {
      env: process.env,
      maxBuffer: 1024 * 1024 * 1024, // 1 GB safety
    });
    if (stderr) {
      const trimmed = stderr.trim();
      if (trimmed) log(`stderr: ${trimmed.split("\n").slice(0, 3).join(" | ")}`);
    }
  } catch (e) {
    logErr(`pg_dump echec: ${e.message}`);
    if (e.stderr) logErr(`stderr: ${e.stderr.toString().slice(0, 500)}`);
    throw e;
  }
}

async function main() {
  // --- Verifs preliminaires ---
  if (!isBackupR2Configured()) {
    logErr(
      "R2 backup non configure. Verifier .env.local : R2_ACCOUNT_ID, R2_BACKUP_ACCESS_KEY_ID, R2_BACKUP_SECRET_ACCESS_KEY, R2_BACKUP_BUCKET.",
    );
    process.exit(1);
  }
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) {
    logErr(
      "SUPABASE_DB_URL absent de .env.local. Format attendu : " +
        "postgresql://postgres.dutfkblygfvhhwpzxmfz:PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres",
    );
    process.exit(1);
  }
  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    logErr("SUPABASE_DB_URL doit commencer par postgresql:// ou postgres://");
    process.exit(1);
  }

  const pgDumpBin = await resolvePgDumpBin();
  log(`pg_dump binary : ${pgDumpBin}`);

  const stamp = isoNow();
  const tmpDir = join(tmpdir(), `mapa-backup-${stamp}`);
  const dumpFile = join(tmpDir, "backup.sql");

  await mkdir(tmpDir, { recursive: true });
  log(`tmp dir : ${tmpDir}`);

  try {
    // --- 1. Dump complet (schema + data) ---
    log("etape 1/4 : pg_dump complet (schema + data)");
    await runPgDump({ binary: pgDumpBin, dbUrl, outFile: dumpFile });

    // --- 2. Lecture + entete metadata ---
    log("etape 2/4 : lecture dump + ajout entete metadata");
    const dumpBuf = await readFile(dumpFile);
    const header = Buffer.from(
      `-- MAPA Property — Supabase backup\n-- generated_at: ${new Date().toISOString()}\n-- project_ref: ${PROJECT_REF}\n-- dump_bytes:   ${dumpBuf.byteLength}\n-- tool:         pg_dump (libpq direct, no Docker)\n\n`,
      "utf-8",
    );
    const combined = Buffer.concat([header, dumpBuf]);
    log(`  total brut : ${(combined.byteLength / 1024 / 1024).toFixed(2)} MB`);

    // --- 3. Compression gzip ---
    log("etape 3/4 : compression gzip");
    const gzipped = await gzipP(combined, { level: 9 });
    log(
      `  gzip       : ${(gzipped.byteLength / 1024 / 1024).toFixed(2)} MB ` +
        `(ratio ${(gzipped.byteLength / combined.byteLength * 100).toFixed(1)}%)`,
    );

    // --- 4. Upload R2 ---
    const key = `${PREFIX}backup-${stamp}.sql.gz`;
    log(`etape 4/4 : upload R2 -> ${key}`);
    const result = await uploadBackupToR2(gzipped, key, "application/gzip");
    log(`  uploaded   : ${result.key} (${result.size} bytes)`);

    // --- Rotation 30 jours ---
    log(`rotation : suppression des backups > ${RETENTION_DAYS} jours`);
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const all = await listBackupR2Objects(PREFIX);
    log(`  ${all.length} objets dans ${PREFIX}`);
    let deleted = 0;
    for (const obj of all) {
      if (!obj.lastModified) continue;
      if (obj.lastModified.getTime() < cutoff) {
        await deleteBackupFromR2(obj.key);
        log(
          `  - delete ${obj.key} (${obj.lastModified.toISOString().slice(0, 10)})`,
        );
        deleted++;
      }
    }
    const kept = all.length - deleted;
    log(`  rotation terminee : ${deleted} supprime(s), ${kept} conserve(s) (incluant celui qu'on vient d'uploader)`);

    log("OK — backup termine avec succes.");
  } catch (e) {
    logErr(`ECHEC : ${e.message}`);
    process.exitCode = 1;
  } finally {
    // Cleanup tmp dir (toujours, succes ou echec).
    try {
      await rm(tmpDir, { recursive: true, force: true });
      log(`cleanup : ${tmpDir} supprime`);
    } catch {
      // silencieux
    }
  }
}

await main();
