// Sprint I18N-Mistral + OPTIM-1B C2 — Re-traduction des biens off-market.
//
// Modes :
//   (defaut)       Idempotent. Skip ce qui est deja traduit (sprint
//                  HTML-RENDERING).
//   --force-dry    DRY-RUN : liste les biens, affiche length FR/EN/DE
//                  actuelles, calcule les ratios EN/FR et DE/FR. Flag
//                  les biens suspects (ratio <70% ou >130%). AUCUN
//                  appel Mistral, AUCUN UPDATE DB.
//   --force        Re-genere TOUT (ignore idempotence). Backup AVANT
//                  dans /tmp, log ratio temps reel, alerte si ratio
//                  anormal. UPDATE DB.
//
// Pre-requis (.env.local) :
//   - MISTRAL_API_KEY
//   - SUPABASE_SERVICE_ROLE_KEY (bypass RLS)
//   - NEXT_PUBLIC_SUPABASE_URL
//
// Pre-requis SQL : migration 20260526_offmarket_i18n_full.sql.
//
// Usage :
//   pnpm tsx scripts/translate-existing-offmarket.mjs              (idempotent)
//   pnpm tsx scripts/translate-existing-offmarket.mjs --force-dry  (DRY-RUN)
//   pnpm tsx scripts/translate-existing-offmarket.mjs --force      (regenere tout)
//
// Rate limit : 800ms entre 2 calls Mistral (nouveau prompt plus long
// peut throttle sur le free tier).

import { config } from "dotenv";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

// CLI parsing
const ARGS = new Set(process.argv.slice(2));
const FORCE_DRY = ARGS.has("--force-dry");
const FORCE = ARGS.has("--force") && !FORCE_DRY;
const MODE = FORCE_DRY ? "force-dry" : FORCE ? "force" : "idempotent";

const RATE_LIMIT_MS = 800;
const RATIO_LOW = 0.7; // alerte si output < 70% input
const RATIO_HIGH = 1.3; // alerte si output > 130% input

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[translate-existing] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}
if (!MISTRAL_API_KEY && MODE !== "force-dry") {
  console.error("[translate-existing] Missing MISTRAL_API_KEY in .env.local");
  process.exit(1);
}

// Import dynamique APRES dotenv pour que lib/translate.ts capte la cle.
// En mode force-dry on n'appelle pas Mistral mais on garde l'import pour
// rester coherent (et detecter une eventuelle import error precocement).
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

function len(s) {
  return typeof s === "string" ? s.length : 0;
}

function ratio(out, src) {
  if (!src) return null;
  return out / src;
}

function flagRatio(r) {
  if (r === null) return "—";
  if (r < RATIO_LOW) return `⚠ LOW ${(r * 100).toFixed(0)}%`;
  if (r > RATIO_HIGH) return `⚠ HIGH ${(r * 100).toFixed(0)}%`;
  return `✓ ${(r * 100).toFixed(0)}%`;
}

async function main() {
  console.log(`[translate-existing] MODE = ${MODE}`);
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
  console.log(`[translate-existing] ${total} rows fetched\n`);

  // ============== MODE force-dry ==============
  if (MODE === "force-dry") {
    let suspectCount = 0;
    for (let i = 0; i < total; i++) {
      const row = rows[i];
      const ref = row.reference ?? row.id;
      let rowSuspect = false;
      const lines = [];
      for (const field of FIELDS_FR) {
        if (!hasFr(row, field)) continue;
        const frLen = len(row[field]);
        const enLen = len(row[`${field}_en`]);
        const deLen = len(row[`${field}_de`]);
        const rEn = ratio(enLen, frLen);
        const rDe = ratio(deLen, frLen);
        const fEn = flagRatio(rEn);
        const fDe = flagRatio(rDe);
        if (
          (rEn !== null && (rEn < RATIO_LOW || rEn > RATIO_HIGH)) ||
          (rDe !== null && (rDe < RATIO_LOW || rDe > RATIO_HIGH))
        ) {
          rowSuspect = true;
        }
        lines.push(
          `    ${field.padEnd(13)} FR=${String(frLen).padStart(6)}  EN=${String(enLen).padStart(6)} [${fEn.padEnd(10)}]  DE=${String(deLen).padStart(6)} [${fDe.padEnd(10)}]`,
        );
      }
      const marker = rowSuspect ? "⚠" : " ";
      console.log(
        `${marker} [${i + 1}/${total}] id=${row.id} ref=${ref}`,
      );
      lines.forEach((l) => console.log(l));
      if (rowSuspect) suspectCount++;
    }
    console.log("\n========== DRY-RUN SUMMARY ==========");
    console.log(`Total rows         : ${total}`);
    console.log(`Suspect rows (⚠)   : ${suspectCount}`);
    console.log(`Mode               : --force-dry (no API call, no DB update)`);
    console.log(`Ratio thresholds   : low<${RATIO_LOW * 100}% / high>${RATIO_HIGH * 100}%`);
    console.log("======================================\n");
    console.log("Pour regenerer TOUT (ignore idempotence) :");
    console.log("  pnpm tsx scripts/translate-existing-offmarket.mjs --force\n");
    return;
  }

  // ============== MODES idempotent + force ==============
  // En mode force : backup AVANT toute mutation.
  if (MODE === "force") {
    const TS = new Date().toISOString().replace(/[:.]/g, "-");
    const BACKUP_PATH = `/tmp/backup-translations-offmarket-${TS}.json`;
    const backup = rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      title: r.title,
      title_en: r.title_en,
      title_de: r.title_de,
      description: r.description,
      description_en: r.description_en,
      description_de: r.description_de,
      short_pitch: r.short_pitch,
      short_pitch_en: r.short_pitch_en,
      short_pitch_de: r.short_pitch_de,
    }));
    await writeFile(BACKUP_PATH, JSON.stringify(backup, null, 2), "utf8");
    console.log(`[translate-existing] Backup ecrit : ${BACKUP_PATH}\n`);
  }

  let translated = 0;
  let skipped = 0;
  let errors = 0;
  let suspectOutputs = 0;

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    const ref = row.reference ?? row.id;
    const update = {};

    for (const field of FIELDS_FR) {
      for (const lang of TARGET_LANGS) {
        if (!hasFr(row, field)) continue;
        // En mode force : on ignore l'idempotence.
        if (MODE === "idempotent" && !needsTranslation(row, field, lang)) {
          continue;
        }
        const frLen = len(row[field]);
        try {
          const t = await translateText(row[field], lang);
          if (t && t.trim().length > 0) {
            const outLen = len(t);
            const r = ratio(outLen, frLen);
            const flag = flagRatio(r);
            if (r !== null && (r < RATIO_LOW || r > RATIO_HIGH)) {
              suspectOutputs++;
            }
            update[`${field}_${lang.toLowerCase()}`] = t;
            console.log(
              `[${i + 1}/${total}] id=${row.id} ref=${ref} ${field} FR→${lang}  FR=${frLen} → ${lang}=${outLen}  [${flag}]`,
            );
          }
          await sleep(RATE_LIMIT_MS);
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
      `[${i + 1}/${total}] id=${row.id} ref=${ref} ✓ UPDATE fields=${Object.keys(update).join(",")}`,
    );
  }

  console.log("\n========== SUMMARY ==========");
  console.log(`Mode             : ${MODE}`);
  console.log(`Total rows       : ${total}`);
  console.log(`Translated       : ${translated}`);
  console.log(`Skipped          : ${skipped} (already done or no FR source)`);
  console.log(`Suspect outputs  : ${suspectOutputs} (ratio <${RATIO_LOW * 100}% ou >${RATIO_HIGH * 100}%)`);
  console.log(`Errors           : ${errors}`);
  console.log("=============================\n");
}

main().catch((e) => {
  console.error("[translate-existing] FATAL:", e);
  process.exit(1);
});
