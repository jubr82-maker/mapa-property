// Sprint OPTIM-1B C3 — Purge ISR cache d'une fiche off-market sur les 3
// locales. Indispensable quand on UPDATE Supabase via script direct (ex.
// scripts/translate-existing-offmarket.mjs --force) — le revalidatePath
// n'est pas declenche automatiquement, le cache ISR reste fige sur la
// version pre-update jusqu'au TTL revalidate (1800s) ou redeploy.
//
// Pre-requis (.env.local) :
//   - REVALIDATE_SECRET   (meme valeur que dans Vercel env vars)
//
// Usage :
//   pnpm purge:offmarket <id> [base_url]
//
// Exemples :
//   pnpm purge:offmarket 84bb5a23-edbe-43f5-817f-1c3f86eaa13a
//     -> purge contre http://localhost:3000 (defaut)
//   pnpm purge:offmarket 84bb5a23-... https://beta.mapaproperty.lu
//     -> purge contre staging Vercel
//
// L'endpoint /api/admin/revalidate (OPTIM-1B C3) accepte le header
// X-Revalidate-Secret en alternative a l'auth admin SSR (cookies).

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const ID = process.argv[2];
const BASE_URL = process.argv[3] ?? "http://localhost:3000";

if (!ID) {
  console.error("Usage: pnpm purge:offmarket <id> [base_url]");
  console.error("  ex: pnpm purge:offmarket 84bb5a23-... https://beta.mapaproperty.lu");
  process.exit(1);
}

const SECRET = process.env.REVALIDATE_SECRET;
if (!SECRET) {
  console.error("[purge] REVALIDATE_SECRET manquant dans .env.local");
  console.error("[purge] Generer une valeur aleatoire et l'ajouter aussi dans Vercel env vars.");
  process.exit(1);
}

// Liste des paths a invalider : fiches detail + listes pour les 3 locales.
const PATHS = [];
for (const locale of ["fr", "en", "de"]) {
  PATHS.push(`/${locale}/off-market`);
  PATHS.push(`/${locale}/off-market/${ID}`);
}

console.log(`[purge] Base URL : ${BASE_URL}`);
console.log(`[purge] ID       : ${ID}`);
console.log(`[purge] Paths    :`);
PATHS.forEach((p) => console.log(`           ${p}`));
console.log();

const endpoint = `${BASE_URL.replace(/\/$/, "")}/api/admin/revalidate`;

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Revalidate-Secret": SECRET,
  },
  body: JSON.stringify({ paths: PATHS }),
});

const json = await res.json().catch(() => ({}));
console.log(`[purge] POST ${endpoint}`);
console.log(`[purge] HTTP ${res.status} ${res.statusText}`);
console.log(`[purge] Response :`, JSON.stringify(json, null, 2));

if (!res.ok) {
  console.error("\n[purge] ECHEC. Verifier :");
  console.error("  - REVALIDATE_SECRET present cote serveur ?");
  console.error("  - URL de base correcte ?");
  process.exit(1);
}

// ---- HEAD verification sur les 3 fiches detail.
console.log("\n[purge] Verification headers Cache-Control / Age sur les 3 fiches :\n");
for (const locale of ["fr", "en", "de"]) {
  const url = `${BASE_URL.replace(/\/$/, "")}/${locale}/off-market/${ID}`;
  try {
    const headRes = await fetch(url, { method: "HEAD", redirect: "manual" });
    const cacheControl = headRes.headers.get("cache-control") ?? "—";
    const age = headRes.headers.get("age") ?? "—";
    const xVercelCache = headRes.headers.get("x-vercel-cache") ?? "—";
    console.log(`  ${url}`);
    console.log(`    HTTP ${headRes.status}`);
    console.log(`    Cache-Control  : ${cacheControl}`);
    console.log(`    Age            : ${age}`);
    console.log(`    X-Vercel-Cache : ${xVercelCache}`);
    console.log();
  } catch (e) {
    console.log(`  ${url} — HEAD ERROR: ${e instanceof Error ? e.message : e}`);
  }
}

console.log("[purge] Termine.");
