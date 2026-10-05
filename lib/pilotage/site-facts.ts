// Faits de sante du site (oct. 2026) : derniere sauvegarde R2, echeance du
// nom de domaine, dernier deploiement.
import { isBackupR2Configured, listBackupR2Objects } from "@/lib/r2";
import {
  BACKUP_MAX_AGE_DAYS,
  DOMAIN_ALERT_MONTHS,
  DOMAIN_EXPIRY_DATE,
  DOMAIN_NAME,
} from "@/lib/pilotage/config";

export type BackupStatus =
  | { status: "not_configured" }
  | { status: "error"; code: string }
  | { status: "none" }
  | { status: "ok" | "late"; lastAt: string; sizeBytes: number | null; count: number };

/** Prefixe du script scripts/backup-supabase-to-r2.mjs (PREFIX = "backups/"). */
const BACKUP_PREFIX = "backups/";

export async function loadBackupStatus(): Promise<BackupStatus> {
  if (!isBackupR2Configured()) return { status: "not_configured" };
  try {
    const objects = (await listBackupR2Objects(BACKUP_PREFIX)).filter((o) => o.lastModified);
    if (objects.length === 0) return { status: "none" };
    objects.sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime());
    const last = objects[0];
    const ageDays = (Date.now() - last.lastModified!.getTime()) / 86400_000;
    return {
      status: ageDays > BACKUP_MAX_AGE_DAYS ? "late" : "ok",
      lastAt: last.lastModified!.toISOString(),
      sizeBytes: last.size ?? null,
      count: objects.length,
    };
  } catch (e) {
    return { status: "error", code: (e as { name?: string })?.name ?? "unknown_error" };
  }
}

export type DomainStatus = {
  domain: string;
  expiresOn: string;
  daysLeft: number;
  alert: boolean;
};

export function domainStatus(now = new Date()): DomainStatus {
  const exp = new Date(`${DOMAIN_EXPIRY_DATE}T00:00:00Z`);
  const alertFrom = new Date(exp);
  alertFrom.setUTCMonth(alertFrom.getUTCMonth() - DOMAIN_ALERT_MONTHS);
  return {
    domain: DOMAIN_NAME,
    expiresOn: DOMAIN_EXPIRY_DATE,
    daysLeft: Math.ceil((exp.getTime() - now.getTime()) / 86400_000),
    alert: now >= alertFrom,
  };
}

export type DeployInfo = {
  commit: string | null;
  message: string | null;
  builtAt: string | null;
  environment: string | null;
};

/**
 * Variables systeme Vercel (VERCEL_GIT_COMMIT_SHA, VERCEL_GIT_COMMIT_MESSAGE,
 * VERCEL_ENV) et date de construction inscrite au build (next.config.ts).
 */
export function deployInfo(): DeployInfo {
  return {
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    message: process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0]?.slice(0, 120) ?? null,
    builtAt: process.env.BUILD_TIMESTAMP ?? null,
    environment: process.env.VERCEL_ENV ?? null,
  };
}
