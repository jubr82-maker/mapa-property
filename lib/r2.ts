// Sprint C11-bis — Helper Cloudflare R2 (S3-compatible API) pour migration
// des videos depuis Supabase Storage (egress 5 GB/mois Free) vers R2
// (egress illimite gratuit, 10 GB stockage). Consomme par :
//  - scripts/migrate-videos-supabase-to-r2.mjs (migration initiale)
//  - app/api/admin/upload-video/route.ts (uploads futurs depuis /admin)
//  - components/media/VideoR2.tsx (rendu cote client via getR2Url)
//
// Degradation gracieuse : si les env vars R2_* manquent (dev local sans
// .env.local R2), on log un warn et les fonctions throw a l'usage. Pas
// d'exception au module load -> next build reste vert meme sans creds.

import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "";

const r2Configured = Boolean(
  R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_PUBLIC_URL &&
    R2_BUCKET_NAME,
);

if (!r2Configured && typeof process !== "undefined") {
  // Warn une seule fois au module load. En prod Vercel, toutes les vars
  // sont presentes -> aucun warning. En dev sans creds, le warn signale
  // que R2 est desactive sans bloquer le build.
  console.warn(
    "[R2] Missing env vars — R2 features disabled (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL, R2_BUCKET_NAME)",
  );
}

// Client S3 toujours instancie (les credentials peuvent etre vides, les
// fonctions ci-dessous garderont contre l'usage non configure).
export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "https://invalid.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = R2_BUCKET_NAME;
export const R2_PUBLIC_URL_BASE = R2_PUBLIC_URL.replace(/\/$/, "");

export function isR2Configured(): boolean {
  return r2Configured;
}

function requireR2(): void {
  if (!r2Configured) {
    throw new Error(
      "R2 not configured — set R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_PUBLIC_URL/R2_BUCKET_NAME",
    );
  }
}

/** URL publique d'un objet R2 (consommee par <video src=...>). */
export function getR2Url(filename: string): string {
  const key = filename.startsWith("/") ? filename.slice(1) : filename;
  return `${R2_PUBLIC_URL_BASE}/${key}`;
}

/** Upload multipart (resilient aux gros fichiers, retry interne SDK). */
export async function uploadToR2(
  file: Buffer | Uint8Array,
  filename: string,
  contentType: string,
): Promise<{ filename: string; publicUrl: string; size: number }> {
  requireR2();
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: R2_BUCKET,
      Key: filename,
      Body: file,
      ContentType: contentType,
    },
  });
  await upload.done();
  return {
    filename,
    publicUrl: getR2Url(filename),
    size: file.byteLength,
  };
}

export async function deleteFromR2(filename: string): Promise<void> {
  requireR2();
  await r2Client.send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: filename }),
  );
}

/** Idempotence : true si l'objet existe deja dans R2 (skip migration). */
export async function checkR2Object(filename: string): Promise<boolean> {
  if (!r2Configured) return false;
  try {
    await r2Client.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: filename }),
    );
    return true;
  } catch {
    return false;
  }
}

export type VideoMetadata = {
  filename: string;
  publicUrl: string;
  contentType: string;
  size: number;
};
