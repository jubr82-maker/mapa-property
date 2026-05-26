// Sprint C11-bis — Migration videos Supabase Storage -> Cloudflare R2
// avec compression FFmpeg automatisee (4K -> 1080p, -85% taille).
//
// Workflow par video :
//  1. checkR2Object(key) -> skip si deja migre (idempotent)
//  2. fetch Supabase Storage public URL
//  3. ffmpeg compresse en mp4 H264 1080p faststart
//  4. uploadToR2 buffer compresse
//  5. log dans mapping JSON scripts/output/r2-url-mapping.json
//
// Pre-requis :
//  - .env.local AVEC R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//    R2_PUBLIC_URL, R2_BUCKET_NAME, NEXT_PUBLIC_SUPABASE_URL
//  - ffmpeg installe localement (which ffmpeg)
//  - Bucket R2 'mapa-property-videos' cree en public dans Cloudflare
//
// Usage : pnpm tsx scripts/migrate-videos-supabase-to-r2.mjs

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { config } from "dotenv";

// Charge .env.local avant tout import qui consomme process.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const execFileP = promisify(execFile);

// Import dynamique APRES dotenv pour que lib/r2.ts capte les env vars.
const { uploadToR2, checkR2Object, getR2Url, isR2Configured } = await import(
  "../lib/r2.ts"
);

if (!isR2Configured()) {
  console.error(
    "[migration] R2 not configured. Fill .env.local with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL, R2_BUCKET_NAME.",
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!SUPABASE_URL) {
  console.error(
    "[migration] NEXT_PUBLIC_SUPABASE_URL missing in .env.local",
  );
  process.exit(1);
}

// ----------------------------------------------------------------------
// Inventaire des videos a migrer. Chaque entree :
//  - srcBucket / srcKey : path dans Supabase Storage
//  - dstKey : nom du fichier dans R2 (sera l'URL R2 publique)
//  - ffmpegArgs : args specifiques (resolution / crf / preset)
// ----------------------------------------------------------------------
const MIGRATIONS = [
  {
    srcBucket: "property-videos",
    srcKey: "mapa_video_2026-05-19T16-17-29.webm",
    dstKey: "mapa-hero-video.mp4",
    ffmpegArgs: [
      "-vf", "scale=1920:-2,fps=30",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "25",
      "-c:a", "aac",
      "-b:a", "96k",
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
    ],
  },
  {
    srcBucket: "Videos",
    srcKey: "mapa_showcase_desktop.mp4",
    dstKey: "mapa-showcase-desktop.mp4",
    ffmpegArgs: [
      "-vf", "scale=1920:-2,fps=30",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "26",
      "-c:a", "aac",
      "-b:a", "96k",
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
    ],
  },
  {
    srcBucket: "Videos",
    srcKey: "mapa_showcase_mobile.mp4",
    dstKey: "mapa-showcase-mobile.mp4",
    ffmpegArgs: [
      "-vf", "scale=720:-2,fps=30",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "27",
      "-c:a", "aac",
      "-b:a", "64k",
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
    ],
  },
];

function supabasePublicUrl(bucket, key) {
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${key}`;
}

async function downloadToFile(url, destPath) {
  console.log(`[migration]   download ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed ${res.status} ${res.statusText} (${url})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
  return buf.byteLength;
}

async function compressVideo(srcPath, dstPath, ffmpegArgs) {
  console.log(`[migration]   ffmpeg compress -> ${dstPath}`);
  const args = ["-y", "-i", srcPath, ...ffmpegArgs, dstPath];
  const { stderr } = await execFileP("ffmpeg", args, { maxBuffer: 1024 * 1024 * 50 });
  // ffmpeg ecrit son progress sur stderr ; on log juste la derniere ligne
  // utile (size + bitrate final).
  const lastLines = stderr.trim().split("\n").slice(-2).join(" | ");
  console.log(`[migration]   ffmpeg ok: ${lastLines.slice(0, 200)}`);
}

async function migrate() {
  const tmpRoot = join(tmpdir(), `mapa-r2-migration-${Date.now()}`);
  await mkdir(tmpRoot, { recursive: true });

  const mapping = { supabase_to_r2: {}, stats: {} };
  let totalBefore = 0;
  let totalAfter = 0;

  for (const m of MIGRATIONS) {
    console.log(`\n[migration] ${m.srcBucket}/${m.srcKey} -> R2:${m.dstKey}`);
    const already = await checkR2Object(m.dstKey);
    if (already) {
      console.log(`[migration]   skip (R2 object already present)`);
      mapping.supabase_to_r2[supabasePublicUrl(m.srcBucket, m.srcKey)] =
        getR2Url(m.dstKey);
      continue;
    }

    const srcPath = join(tmpRoot, `src-${m.dstKey.replace(/\.mp4$/, "")}.bin`);
    const dstPath = join(tmpRoot, m.dstKey);

    try {
      const sizeBefore = await downloadToFile(
        supabasePublicUrl(m.srcBucket, m.srcKey),
        srcPath,
      );
      totalBefore += sizeBefore;
      await compressVideo(srcPath, dstPath, m.ffmpegArgs);
      const sizeAfter = (await stat(dstPath)).size;
      totalAfter += sizeAfter;
      const compressedBuf = await readFile(dstPath);
      const result = await uploadToR2(compressedBuf, m.dstKey, "video/mp4");
      console.log(
        `[migration]   uploaded ${result.publicUrl} (${(sizeBefore / 1024 / 1024).toFixed(1)} MB -> ${(sizeAfter / 1024 / 1024).toFixed(1)} MB, -${Math.round((1 - sizeAfter / sizeBefore) * 100)}%)`,
      );
      mapping.supabase_to_r2[supabasePublicUrl(m.srcBucket, m.srcKey)] =
        result.publicUrl;
    } catch (err) {
      console.error(`[migration]   FAILED on ${m.srcKey}:`, err.message);
      throw err;
    }
  }

  mapping.stats = {
    total_size_before_mb: +(totalBefore / 1024 / 1024).toFixed(1),
    total_size_after_mb: +(totalAfter / 1024 / 1024).toFixed(1),
    reduction_percent:
      totalBefore > 0
        ? Math.round((1 - totalAfter / totalBefore) * 100)
        : 0,
    migrated_at: new Date().toISOString(),
  };

  const outDir = join(__dirname, "output");
  await mkdir(outDir, { recursive: true });
  const mappingPath = join(outDir, "r2-url-mapping.json");
  await writeFile(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`\n[migration] mapping ecrit dans ${mappingPath}`);

  // Cleanup tmp
  await rm(tmpRoot, { recursive: true, force: true });
  console.log(`[migration] DONE — ${mapping.stats.total_size_before_mb} MB -> ${mapping.stats.total_size_after_mb} MB (-${mapping.stats.reduction_percent}%)`);
}

migrate().catch((err) => {
  console.error("[migration] FATAL:", err);
  process.exit(1);
});
