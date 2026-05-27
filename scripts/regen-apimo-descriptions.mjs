// Sprint HTML-RENDERING C5 + OPTIM-1B C2 — Regeneration des descriptions
// Apimo EN/DE depuis FR via Mistral.
//
// Modes :
//   (defaut)       Conditionnel : ne regenere QUE si FR HTML et EN/DE
//                  PLAIN (heritage mise en page). Sprint HTML-RENDERING.
//   --force-dry    DRY-RUN : liste les biens, affiche length FR/EN/DE
//                  actuelles, calcule les ratios EN/FR et DE/FR. Flag
//                  les biens suspects (ratio <70% ou >130%). AUCUN
//                  appel Mistral, AUCUN UPDATE DB.
//   --fill-missing Ciblee : traduit UNIQUEMENT les langues vides
//                  (description_en ou description_de absent / chaine
//                  vide). Skip si EN et DE sont tous deux remplis,
//                  peu importe leur ratio. Cas d'usage : combler les
//                  trous DE post-OPTIM-1B sans retraduire les langues
//                  saines (economie de quota Mistral).
//   --force        Re-genere TOUT (tout bien avec description_fr).
//                  Ignore le check HTML. Backup AVANT dans /tmp, log
//                  ratio temps reel. UPDATE DB.
//
// Regle business Julien (mode defaut conditionnel) :
//   - FR = source de verite
//   - EN/DE heritent de la mise en page FR (paragraphes, gras, listes)
//   - Si deja coherent (les 3 langues ont du HTML OU les 3 sont PLAIN)
//     -> SKIP.
//   - Si FR vide ou PLAIN -> SKIP (pas de source riche).
//
// Pre-requis (.env.local) :
//   - MISTRAL_API_KEY
//   - SUPABASE_SERVICE_ROLE_KEY (bypass RLS)
//   - NEXT_PUBLIC_SUPABASE_URL
//
// Usage :
//   pnpm tsx scripts/regen-apimo-descriptions.mjs                  (conditionnel)
//   pnpm tsx scripts/regen-apimo-descriptions.mjs --force-dry      (DRY-RUN)
//   pnpm tsx scripts/regen-apimo-descriptions.mjs --fill-missing   (langues vides only)
//   pnpm tsx scripts/regen-apimo-descriptions.mjs --force          (regenere tout)
//
// Rate limit : 800ms entre 2 calls Mistral.

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
const FILL_MISSING = ARGS.has("--fill-missing") && !FORCE_DRY;
const FORCE = ARGS.has("--force") && !FORCE_DRY && !FILL_MISSING;
const MODE = FORCE_DRY
  ? "force-dry"
  : FILL_MISSING
    ? "fill-missing"
    : FORCE
      ? "force"
      : "conditional";

const RATE_LIMIT_MS = 800;
const RATIO_LOW = 0.7;
const RATIO_HIGH = 1.3;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[regen-apimo] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}
if (!MISTRAL_API_KEY && MODE !== "force-dry") {
  console.error("[regen-apimo] Missing MISTRAL_API_KEY in .env.local");
  process.exit(1);
}

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
  console.log(`[regen-apimo] MODE = ${MODE}`);
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

  // ============== MODE force-dry ==============
  if (MODE === "force-dry") {
    let suspectCount = 0;
    let withFrCount = 0;
    for (let i = 0; i < total; i++) {
      const row = rows[i];
      const ref = row.slug ?? row.apimo_id ?? row.id;
      const frLen = len(row.description_fr);
      if (frLen === 0) continue;
      withFrCount++;
      const enLen = len(row.description_en);
      const deLen = len(row.description_de);
      const rEn = ratio(enLen, frLen);
      const rDe = ratio(deLen, frLen);
      const fEn = flagRatio(rEn);
      const fDe = flagRatio(rDe);
      const suspect =
        (rEn !== null && (rEn < RATIO_LOW || rEn > RATIO_HIGH)) ||
        (rDe !== null && (rDe < RATIO_LOW || rDe > RATIO_HIGH));
      if (suspect) suspectCount++;
      const marker = suspect ? "⚠" : " ";
      console.log(
        `${marker} [${i + 1}/${total}] id=${row.id} ref=${ref}  FR=${String(frLen).padStart(6)}  EN=${String(enLen).padStart(6)} [${fEn.padEnd(10)}]  DE=${String(deLen).padStart(6)} [${fDe.padEnd(10)}]`,
      );
    }
    console.log("\n========== DRY-RUN SUMMARY ==========");
    console.log(`Total rows         : ${total}`);
    console.log(`Rows with FR       : ${withFrCount}`);
    console.log(`Suspect rows (⚠)   : ${suspectCount}`);
    console.log(`Mode               : --force-dry (no API call, no DB update)`);
    console.log(`Ratio thresholds   : low<${RATIO_LOW * 100}% / high>${RATIO_HIGH * 100}%`);
    console.log("======================================\n");
    console.log("Pour regenerer TOUT (ignore conditionnel) :");
    console.log("  pnpm tsx scripts/regen-apimo-descriptions.mjs --force\n");
    return;
  }

  // ============== MODES conditional + fill-missing + force ==============
  // Backup AVANT mutation pour fill-missing et force.
  if (MODE === "force" || MODE === "fill-missing") {
    const TS = new Date().toISOString().replace(/[:.]/g, "-");
    const BACKUP_PATH = `/tmp/backup-translations-apimo-${TS}.json`;
    const backup = rows.map((r) => ({
      id: r.id,
      apimo_id: r.apimo_id,
      slug: r.slug,
      description_fr: r.description_fr,
      description_en: r.description_en,
      description_de: r.description_de,
    }));
    await writeFile(BACKUP_PATH, JSON.stringify(backup, null, 2), "utf8");
    console.log(`[regen-apimo] Backup ecrit : ${BACKUP_PATH}\n`);
  }

  let translatedEn = 0;
  let translatedDe = 0;
  let skippedNoFr = 0;
  let skippedNoFrHtml = 0;
  let skippedAlreadyCoherent = 0;
  let skippedAllFilled = 0;
  let errors = 0;
  let suspectOutputs = 0;

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    const ref = row.slug ?? row.apimo_id ?? row.id;
    const frLen = len(row.description_fr);

    if (frLen === 0) {
      skippedNoFr++;
      continue; // silencieux pour ne pas spammer
    }

    // En mode conditional : check HTML coherence.
    if (MODE === "conditional") {
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
    }

    // En mode fill-missing : skip si EN et DE sont tous deux remplis.
    if (MODE === "fill-missing") {
      const enFilled = len(row.description_en) > 0;
      const deFilled = len(row.description_de) > 0;
      if (enFilled && deFilled) {
        skippedAllFilled++;
        continue; // silencieux
      }
    }

    const update = {};
    // Selection des langues cibles selon le mode :
    //   force        : EN + DE systematiquement
    //   fill-missing : uniquement les langues vides (length 0)
    //   conditional  : uniquement les langues non-HTML (heritage HTML)
    const targets = [];
    if (MODE === "force") {
      targets.push("EN", "DE");
    } else if (MODE === "fill-missing") {
      if (len(row.description_en) === 0) targets.push("EN");
      if (len(row.description_de) === 0) targets.push("DE");
    } else {
      if (!hasHtml(row.description_en)) targets.push("EN");
      if (!hasHtml(row.description_de)) targets.push("DE");
    }

    for (const lang of targets) {
      try {
        const t = await translateText(row.description_fr, lang);
        if (t && t.trim().length > 0) {
          const outLen = len(t);
          const r = ratio(outLen, frLen);
          const flag = flagRatio(r);
          if (r !== null && (r < RATIO_LOW || r > RATIO_HIGH)) {
            suspectOutputs++;
          }
          if (lang === "EN") {
            update.description_en = t;
            translatedEn++;
          } else {
            update.description_de = t;
            translatedDe++;
          }
          console.log(
            `[${i + 1}/${total}] id=${row.id} ref=${ref} FR→${lang}  FR=${frLen} → ${lang}=${outLen}  [${flag}]`,
          );
        }
        await sleep(RATE_LIMIT_MS);
      } catch (e) {
        console.error(
          `[${i + 1}/${total}] id=${row.id} ref=${ref} FR→${lang} ERROR: ${e.message}`,
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
      `[${i + 1}/${total}] id=${row.id} ref=${ref} ✓ UPDATE fields=${Object.keys(update).join(",")}`,
    );
  }

  console.log("\n========== SUMMARY ==========");
  console.log(`Mode                        : ${MODE}`);
  console.log(`Total rows                  : ${total}`);
  console.log(`Translated EN               : ${translatedEn}`);
  console.log(`Translated DE               : ${translatedDe}`);
  console.log(`Skipped (no FR)             : ${skippedNoFr}`);
  console.log(`Skipped (FR pas HTML)       : ${skippedNoFrHtml}`);
  console.log(`Skipped (deja coherent)     : ${skippedAlreadyCoherent}`);
  console.log(`Skipped (EN+DE deja remplis): ${skippedAllFilled}`);
  console.log(`Suspect outputs             : ${suspectOutputs} (ratio <${RATIO_LOW * 100}% ou >${RATIO_HIGH * 100}%)`);
  console.log(`Errors                      : ${errors}`);
  console.log("=============================\n");
}

main().catch((e) => {
  console.error("[regen-apimo] FATAL:", e);
  process.exit(1);
});
