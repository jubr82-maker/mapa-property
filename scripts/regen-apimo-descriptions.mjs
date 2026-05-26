// Sprint HTML-RENDERING C5 — Régénération conditionnelle des descriptions
// Apimo EN/DE depuis FR via Mistral.
//
// Règle business Julien :
//   - FR = source de vérité
//   - EN/DE héritent de la mise en page FR (paragraphes, gras, listes)
//   - On ne régénère QUE si la mise en page diffère (FR HTML, EN/DE PLAIN)
//   - Si déjà cohérent (les 3 langues ont du HTML OU les 3 sont en PLAIN)
//     -> on respecte ce qu'Apimo a livré, SKIP.
//   - Si FR vide ou PLAIN -> SKIP (pas de source riche à propager).
//
// Pré-requis (.env.local) :
//   - MISTRAL_API_KEY
//   - SUPABASE_SERVICE_ROLE_KEY (bypass RLS)
//   - NEXT_PUBLIC_SUPABASE_URL
//
// Usage : pnpm tsx scripts/regen-apimo-descriptions.mjs
//
// Rate limit : 500ms entre 2 calls Mistral.

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[regen-apimo] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}
if (!MISTRAL_API_KEY) {
  console.error("[regen-apimo] Missing MISTRAL_API_KEY in .env.local");
  process.exit(1);
}

// Import dynamique APRES dotenv pour que lib/translate.ts capte la cle.
const { translateText } = await import("../lib/translate.ts");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** true si la string contient au moins un tag HTML d'ouverture. */
function hasHtml(s) {
  if (typeof s !== "string" || s.trim().length === 0) return false;
  return /<[a-z]+[\s>]/i.test(s);
}

async function main() {
  console.log("[regen-apimo] Fetching properties rows...");
  const { data: rows, error } = await supabase
    .from("properties")
    .select(
      "id, apimo_id, slug, description_fr, description_en, description_de",
    );
  if (error) {
    console.error("[regen-apimo] SELECT failed:", error.message);
    process.exit(1);
  }

  const total = rows.length;
  console.log(`[regen-apimo] ${total} rows fetched\n`);

  let translatedEn = 0;
  let translatedDe = 0;
  let skippedNoFrHtml = 0;
  let skippedAlreadyCoherent = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    const ref = row.slug ?? row.apimo_id ?? row.id;
    const frHtml = hasHtml(row.description_fr);
    const enHtml = hasHtml(row.description_en);
    const deHtml = hasHtml(row.description_de);

    if (!frHtml) {
      skippedNoFrHtml++;
      console.log(
        `[${i + 1}/${total}] id=${row.id} ref=${ref} — SKIP (FR pas HTML : source pauvre)`,
      );
      continue;
    }

    if (enHtml && deHtml) {
      skippedAlreadyCoherent++;
      console.log(
        `[${i + 1}/${total}] id=${row.id} ref=${ref} — SKIP (FR+EN+DE deja HTML coherents)`,
      );
      continue;
    }

    const update = {};

    if (!enHtml) {
      try {
        const en = await translateText(row.description_fr, "EN");
        if (en && en.trim().length > 0) {
          update.description_en = en;
          translatedEn++;
        }
        await sleep(500);
      } catch (e) {
        console.error(
          `[${i + 1}/${total}] id=${row.id} ref=${ref} FR->EN ERROR: ${e.message}`,
        );
        errors++;
      }
    }

    if (!deHtml) {
      try {
        const de = await translateText(row.description_fr, "DE");
        if (de && de.trim().length > 0) {
          update.description_de = de;
          translatedDe++;
        }
        await sleep(500);
      } catch (e) {
        console.error(
          `[${i + 1}/${total}] id=${row.id} ref=${ref} FR->DE ERROR: ${e.message}`,
        );
        errors++;
      }
    }

    if (Object.keys(update).length === 0) {
      console.log(
        `[${i + 1}/${total}] id=${row.id} ref=${ref} — no update applied`,
      );
      continue;
    }

    const { error: updateErr } = await supabase
      .from("properties")
      .update(update)
      .eq("id", row.id);

    if (updateErr) {
      console.error(
        `[${i + 1}/${total}] id=${row.id} ref=${ref} UPDATE failed: ${updateErr.message}`,
      );
      errors++;
      continue;
    }

    console.log(
      `[${i + 1}/${total}] id=${row.id} ref=${ref} ✓ fields=${Object.keys(update).join(",")}`,
    );
  }

  console.log("\n========== SUMMARY ==========");
  console.log(`Total rows                  : ${total}`);
  console.log(`Translated EN               : ${translatedEn}`);
  console.log(`Translated DE               : ${translatedDe}`);
  console.log(`Skipped (FR pas HTML)       : ${skippedNoFrHtml}`);
  console.log(`Skipped (deja coherent)     : ${skippedAlreadyCoherent}`);
  console.log(`Errors                      : ${errors}`);
  console.log("=============================\n");
}

main().catch((e) => {
  console.error("[regen-apimo] FATAL:", e);
  process.exit(1);
});
