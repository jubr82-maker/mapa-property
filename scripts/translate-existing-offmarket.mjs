// Sprint I18N-Mistral — Migration backfill : traduit les biens
// off-market existants qui n'ont pas encore leurs colonnes _en/_de
// remplies. Idempotent (skip ce qui est deja traduit).
//
// Pre-requis (.env.local) :
//  - MISTRAL_API_KEY  (pour lib/translate.ts)
//  - SUPABASE_SERVICE_ROLE_KEY  (bypass RLS pour read/write toutes les rows)
//  - NEXT_PUBLIC_SUPABASE_URL
//
// Pre-requis SQL : migration 20260526_offmarket_i18n_full.sql appliquee
// (colonnes description_en/_de + short_pitch_en/_de presentes).
//
// Usage : pnpm tsx scripts/translate-existing-offmarket.mjs
//
// Rate limit : 500ms entre 2 rows pour ne pas spammer Mistral free tier.

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
    "[translate-existing] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}
if (!MISTRAL_API_KEY) {
  console.error("[translate-existing] Missing MISTRAL_API_KEY in .env.local");
  process.exit(1);
}

// Import dynamique APRES dotenv pour que lib/translate.ts capte la cle.
const { translateText } = await import("../lib/translate.ts");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FIELDS_FR = ["title", "description", "short_pitch"];
const TARGET_LANGS = ["EN", "DE"];

function hasFr(row, field) {
  const v = row[field];
  return typeof v === "string" && v.trim().length > 0;
}

function needsTranslation(row, field, lang) {
  if (!hasFr(row, field)) return false;
  const targetKey = `${field}_${lang.toLowerCase()}`;
  const existing = row[targetKey];
  return typeof existing !== "string" || existing.trim().length === 0;
}

async function main() {
  console.log("[translate-existing] Fetching offmarket rows...");
  const { data: rows, error } = await supabase
    .from("properties_offmarket")
    .select(
      "id, reference, title, title_en, title_de, description, description_en, description_de, short_pitch, short_pitch_en, short_pitch_de",
    );
  if (error) {
    console.error("[translate-existing] SELECT failed:", error.message);
    process.exit(1);
  }

  const total = rows.length;
  console.log(`[translate-existing] ${total} rows fetched`);

  let translated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    const ref = row.reference ?? row.id;
    const update = {};

    for (const field of FIELDS_FR) {
      for (const lang of TARGET_LANGS) {
        if (!needsTranslation(row, field, lang)) continue;
        try {
          const t = await translateText(row[field], lang);
          if (t && t.trim().length > 0) {
            update[`${field}_${lang.toLowerCase()}`] = t;
          }
          // Rate limit doux entre chaque call Mistral.
          await sleep(500);
        } catch (e) {
          console.error(
            `[translate-existing] [${i + 1}/${total}] id=${row.id} ref=${ref} field=${field} lang=${lang} ERROR: ${e.message}`,
          );
          errors++;
        }
      }
    }

    if (Object.keys(update).length === 0) {
      skipped++;
      console.log(
        `[${i + 1}/${total}] id=${row.id} ref=${ref} — skip (already done or no FR source)`,
      );
      continue;
    }

    const { error: updateErr } = await supabase
      .from("properties_offmarket")
      .update(update)
      .eq("id", row.id);

    if (updateErr) {
      console.error(
        `[${i + 1}/${total}] id=${row.id} ref=${ref} UPDATE failed: ${updateErr.message}`,
      );
      errors++;
      continue;
    }

    translated++;
    console.log(
      `[${i + 1}/${total}] id=${row.id} ref=${ref} ✓ fields=${Object.keys(update).join(",")}`,
    );
  }

  console.log("\n========== SUMMARY ==========");
  console.log(`Total rows  : ${total}`);
  console.log(`Translated  : ${translated}`);
  console.log(`Skipped     : ${skipped} (already done or no FR source)`);
  console.log(`Errors      : ${errors}`);
  console.log("=============================\n");
}

main().catch((e) => {
  console.error("[translate-existing] FATAL:", e);
  process.exit(1);
});
