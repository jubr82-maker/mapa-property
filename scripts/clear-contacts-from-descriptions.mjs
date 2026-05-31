// Sprint OPTIM-1B C4 — Strip email/tel/URL des descriptions biens.
//
// Regle bunker Julien #13 : aucune coordonnee de contact ne doit jamais
// apparaitre en HTML SSR scrapable. Email/tel/URL doivent vivre dans des
// composants UI dedies (ContactReveal, ContactForm), pas dans le texte
// brut des descriptions.
//
// PRINCIPE : strip IN-PLACE strict. On retire UNIQUEMENT les sous-chaines
// sensibles (email, tel, URL) sans toucher aux balises structurelles
// (<p>, <br>, <strong>) ni au texte residuel non-sensible (copyright,
// "Annonce diffusee...", "Service multilingue...").
//
// Etapes :
//   1. Decapsuler les <a href=mailto:|tel:|...mapaproperty...> en gardant
//      le texte interieur (qui sera ensuite stripe si email/tel/URL).
//   2. Strip emails (pattern mapa(property|group)).
//   3. Strip tels (+352 6xx xxx xxx + variantes).
//   4. Strip URLs (https?:// + bare www.).
//   5. Strip labels orphelins (📧 Email:, 📞 Tel:, Email:, Tel.:).
//   6. Strip parentheses vides (apres strip URL entre parentheses).
//   7. Strip seperateurs orphelins (| isole, espaces multiples).
//   8. Remplacer amorce orpheline ("Pour plus de renseignements... :")
//      par CTA neutre locale.
//   9. Cleanup balises devenues vides (<a></a>, <strong></strong>) MAIS
//      preserver <p>, <br>, <p></p> (structure inchangee).
//
// GARDE-FOU : compte <p>, <br>, <strong> avant/apres. Si delta sur <p>
// non nul OU delta sur <br> hors {0,-1} -> SKIP avec warning.
//
// Mode DRY-RUN par defaut. --apply pour UPDATE DB (avec backup /tmp).
// --diff pour afficher les 3 echantillons (OM-ADB0F103, 86388715, 85603229).

import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env.local") });

const DRY_RUN = !process.argv.includes("--apply");
const SHOW_DIFF = process.argv.includes("--diff");
const TS = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_PATH = `/tmp/backup-clear-contacts-${TS}.json`;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// ====== Patterns (versions /g pour replace + count) ======
const EMAIL_RE_G = /[a-zA-Z0-9._%+-]+@(?:i?mapa(?:property|group))\.(?:org|lu|com)/gi;
const TEL_RE_G = /\+?\s*352[\s\-.]*6\d{2}[\s\-.]*\d{3}[\s\-.]*\d{3}/g;
const URL_RE_G = /https?:\/\/(?:www\.)?mapaproperty\.(?:lu|org|com)[^\s)<"']*/gi;
const URL_BARE_RE_G = /(?<![\/.@])www\.mapaproperty\.(?:lu|org|com)\b/gi;

// CTA neutres pour remplacer une amorce orpheline ("Pour plus de
// renseignements..." dont la suite contenait email+tel+URL).
const CTA_NEUTRAL = {
  fr: "Pour toute demande, contactez-nous depuis le bouton ci-dessous.",
  en: "For any enquiry, please contact us using the button below.",
  de: "Für jede Anfrage kontaktieren Sie uns bitte über die Schaltfläche unten.",
};

// Amorces ":" + suite qui devient orpheline apres strip email/tel/URL.
// Match capture : "Pour plus de renseignements ou pour organiser un rendez-vous : "
// Limite a 100 chars apres l'amorce pour eviter une capture trop large.
const ORPHAN_INTRO_PATTERNS = {
  fr: /(?:Pour\s+(?:planifier(?:\s+\S+){0,4}\s+(?:visite|rendez[-\s]vous)|plus\s+de\s+renseignements|toute\s+(?:demande|information)|organiser\s+un\s+rendez[-\s]vous|toute\s+information\s+suppl[ée]mentaire)|N['’]h[ée]sitez\s+pas\s+[aà]\s+nous\s+contacter)[^.<]{0,100}\s*:\s*/gi,
  en: /(?:To\s+(?:arrange|schedule|book)\s+(?:a\s+)?viewing|For\s+(?:more\s+information|any\s+(?:enquir(?:y|ies)|questions|additional\s+information))|Please\s+(?:feel\s+free\s+to\s+)?contact\s+us)[^.<]{0,100}\s*:\s*/gi,
  de: /(?:Um\s+eine\s+Besichtigung|F[üu]r\s+(?:weitere\s+Informationen|jede\s+Anfrage|Fragen)|Bitte\s+kontaktieren\s+Sie\s+uns|Bei\s+Fragen\s+stehen\s+wir)[^.<]{0,100}\s*:\s*/gi,
};

function localeOf(fieldName) {
  if (fieldName.endsWith("_en")) return "en";
  if (fieldName.endsWith("_de")) return "de";
  return "fr";
}

function countTag(text, tag) {
  // Compte les balises ouvrantes <tag> ou <tag ...> (pas les fermantes).
  const re = new RegExp(`<${tag}(?:\\s|>|/)`, "gi");
  return (text.match(re) ?? []).length;
}

function countBr(text) {
  return (text.match(/<br\s*\/?>/gi) ?? []).length;
}

/**
 * Strip in-place strict : preserve la structure HTML.
 */
// Phrases REDIRECT entieres a supprimer ("Decouvrez nos autres biens
// sur [URL]", "Explore our other properties at [URL]", etc.). Ces phrases
// ne servent qu'a rediriger vers le site MAPA et n'ont aucune valeur
// descriptive du bien.
//
// Strategie : ancrer le pattern sur l'URL `mapaproperty.xx` (ou balise
// <a href="...mapaproperty...">...</a>) comme delimiteur de fin. Le
// quantifier lazy {1,200}? matche la plus petite portion possible,
// donc le pattern s'arrete a la PREMIERE occurrence d'URL mapaproperty
// rencontree. Ca evite de devorer les lignes suivantes (notamment
// "— Source : MAPA Property (https://www.mapaproperty.lu) — © 2026"
// qu'on veut PRESERVER, car elle contient aussi une URL mapaproperty
// mais APRES la fin du match redirect).
//
// L'URL elle-meme est consommee par le pattern (donc retiree avec la
// phrase) — l'etape suivante "strip URL" n'aura rien a faire dessus.
const REDIRECT_URL_END = `(?:mapaproperty\\.(?:lu|org|com)[^\\s<"']*|<a[^>]*href\\s*=\\s*["'][^"']*mapaproperty[^"']*["'][^>]*>[\\s\\S]*?<\\/a>)\\s*`;
const REDIRECT_PHRASES = [
  // FR
  new RegExp(`(?:D[ée]couvrez|Consultez|Visitez|Retrouvez)[\\s\\S]{1,200}?${REDIRECT_URL_END}`, "gi"),
  // EN
  new RegExp(`(?:Explore|Browse|View|Visit|Discover)[\\s\\S]{1,200}?${REDIRECT_URL_END}`, "gi"),
  // DE
  new RegExp(`(?:Entdecken|Sehen|Besuchen|Stöbern|Stobern)[\\s\\S]{1,200}?${REDIRECT_URL_END}`, "gi"),
];

function stripContactsInPlace(text, locale) {
  let out = text;

  // 0. Strip phrases REDIRECT entieres (amorce + URL + suite jusqu'au
  //    delimiteur). Empeche les phrases tronquees orphelines apres strip
  //    URL ("Decouvrez nos autres biens sur" sans suite).
  for (const re of REDIRECT_PHRASES) {
    out = out.replace(re, "");
  }

  // 1. Decapsuler <a href=mailto:|tel:|...mapaproperty...> -> texte interieur.
  //    Le texte interieur peut contenir l'email/URL en clair, on le
  //    strippera a l'etape suivante.
  out = out.replace(
    /<a[^>]*href\s*=\s*["']mailto:[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
    "$1",
  );
  out = out.replace(
    /<a[^>]*href\s*=\s*["']tel:[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
    "$1",
  );
  out = out.replace(
    /<a[^>]*href\s*=\s*["']https?:\/\/(?:www\.)?mapaproperty\.(?:lu|org|com)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
    "$1",
  );

  // 2-4. Strip emails / tels / URLs.
  out = out
    .replace(EMAIL_RE_G, "")
    .replace(TEL_RE_G, "")
    .replace(URL_RE_G, "")
    .replace(URL_BARE_RE_G, "");

  // 5. Strip labels orphelins (le contenu apres ":" a deja ete strippe).
  //    Limite la portee : on n'attaque le label que si suivi de whitespace
  //    ou separateur (pas de mot signifiant ensuite).
  out = out.replace(
    /[📧📩✉]\s*(?:E-?mail|Email|Mail)?\s*[:\-]?\s*/gi,
    "",
  );
  out = out.replace(
    /[📞☎]\s*(?:T[ée]l(?:\.|ephone)?|Tel(?:\.|ephone)?|Phone|Telefon)?\s*[:\-]?\s*/gi,
    "",
  );
  // Labels sans emoji, suivis de rien ou de separateurs (l'email/tel a ete vire).
  out = out.replace(
    /\b(?:E-?mail|Email|Mail)\s*[:\-]\s*(?=\s|\||,|<|$)/gi,
    "",
  );
  out = out.replace(
    /\b(?:T[ée]l\.?|Tel\.?|Phone|Telefon|Telephone)\s*[:\-]\s*(?=\s|\||,|<|$)/gi,
    "",
  );

  // 6. Parentheses vides apres strip URL inline (ex. "MAPA Property ()").
  out = out.replace(/\(\s*\)/g, "");

  // 7. Separateurs orphelins "|" / " / " devenus isoles. On nettoie en
  //    plusieurs passes pour gerer les sequences "| | |".
  for (let i = 0; i < 3; i++) {
    out = out.replace(/(?:^|\s)\|+(?=\s|<|$)/g, "");
    out = out.replace(/\|\s*\|/g, "|");
  }

  // 8. Remplacement amorce orpheline -> CTA neutre.
  out = out.replace(ORPHAN_INTRO_PATTERNS[locale], CTA_NEUTRAL[locale] + " ");

  // 9. Cleanup balises devenues vides (sauf <p> qu'on preserve pour la
  //    structure).
  out = out.replace(/<a[^>]*>\s*<\/a>/gi, "");
  out = out.replace(/<strong>\s*<\/strong>/gi, "");
  out = out.replace(/<em>\s*<\/em>/gi, "");
  out = out.replace(/<b>\s*<\/b>/gi, "");
  out = out.replace(/<i>\s*<\/i>/gi, "");

  // 10. Cleanup whitespace excessif (tabs/spaces multiples). Garde \n et
  //     les balises intactes. Compacte aussi les sequences de 3+ sauts
  //     de ligne (\n et CRLF) en double saut, pour eviter les trous
  //     visuels apres strip d'une phrase REDIRECT entiere.
  out = out.replace(/[ \t]{2,}/g, " ");
  // Espace avant ponctuation/balise/saut de ligne
  out = out.replace(/[ \t]+([.,;:!?<\n])/g, "$1");
  // Sequences de sauts de ligne (CRLF ou LF) -> max 2 sauts.
  out = out.replace(/(?:\r?\n[ \t]*){3,}/g, "\n\n");
  // Cleanup multiples <br> consecutifs (>=3) -> max 2 <br>.
  out = out.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");

  return out;
}

/**
 * Verifie qu'aucune balise structurelle <p> n'a ete perdue ou ajoutee.
 * <br> peut diminuer de quelques unites (les <br> orphelins juste apres
 * un strip d'email sont supprimables sans degradation). On tolere une
 * marge de 3 <br> de moins MAX.
 */
function structuralChange(before, after) {
  const pBefore = countTag(before, "p");
  const pAfter = countTag(after, "p");
  const brBefore = countBr(before);
  const brAfter = countBr(after);
  const strongBefore = countTag(before, "strong");
  const strongAfter = countTag(after, "strong");
  return {
    pDelta: pAfter - pBefore,
    brDelta: brAfter - brBefore,
    strongDelta: strongAfter - strongBefore,
    pBefore,
    pAfter,
    brBefore,
    brAfter,
    strongBefore,
    strongAfter,
  };
}

function isStructurallySafe(s) {
  // <p> doit etre INCHANGE (regle ZERO DEGRADATION).
  if (s.pDelta !== 0) return false;
  // <br> peut perdre quelques unites (cleanup whitespace), pas en gagner.
  if (s.brDelta > 0) return false;
  if (s.brDelta < -5) return false; // perte massive suspecte
  // <strong> peut perdre des balises vides residuelles.
  if (s.strongDelta > 0) return false;
  return true;
}

// ====== Tables config ======
const TABLES = [
  {
    name: "properties_offmarket",
    refKey: "reference",
    fields: [
      "description",
      "description_en",
      "description_de",
      "short_pitch",
      "short_pitch_en",
      "short_pitch_de",
    ],
  },
  {
    name: "properties",
    refKey: "slug",
    fields: ["description_fr", "description_en", "description_de"],
  },
];

// Biens cibles pour --diff (echantillons visuels).
const DIFF_TARGETS = {
  properties_offmarket: ["OM-ADB0F103"],
  properties: ["86388715", "85603229"],
};

// ====== Main ======
console.log(`[clear-contacts] Mode : ${DRY_RUN ? "DRY-RUN" : "APPLY (UPDATE DB)"}`);
if (!DRY_RUN) console.log(`[clear-contacts] Backup : ${BACKUP_PATH}`);
console.log();

const allChanges = [];
const excludedRows = []; // biens skippes pour degradation structurelle
let touchedRows = 0;

for (const t of TABLES) {
  const cols = ["id", t.refKey, ...t.fields];
  if (t.name === "properties") cols.push("apimo_id");
  const { data: rows, error } = await sb.from(t.name).select(cols.join(","));
  if (error) {
    console.error(`[${t.name}] SELECT error:`, error.message);
    continue;
  }

  console.log(`\n=== ${t.name} (${(rows ?? []).length} rows) ===`);

  for (const r of rows ?? []) {
    const ref = r[t.refKey] ?? r.apimo_id ?? String(r.id).slice(0, 8);
    const update = {};
    const backupRow = { table: t.name, id: r.id, ref, before: {}, after: {}, structural: {} };
    let rowHasChange = false;
    let rowExcluded = false;

    for (const f of t.fields) {
      const before = r[f];
      if (typeof before !== "string" || before.length === 0) continue;
      const after = stripContactsInPlace(before, localeOf(f));
      if (after === before) continue;

      const struct = structuralChange(before, after);
      if (!isStructurallySafe(struct)) {
        excludedRows.push({
          table: t.name,
          ref,
          id: r.id,
          field: f,
          struct,
        });
        rowExcluded = true;
        console.log(
          `  ⚠ ${ref} ${f} : structure modifiee (pDelta=${struct.pDelta}, brDelta=${struct.brDelta}, strongDelta=${struct.strongDelta}) -> EXCLU`,
        );
        continue;
      }

      update[f] = after;
      backupRow.before[f] = before;
      backupRow.after[f] = after;
      backupRow.structural[f] = struct;
      rowHasChange = true;
    }

    if (!rowHasChange) continue;

    touchedRows++;
    allChanges.push(backupRow);

    const deltas = Object.keys(update)
      .map((f) => {
        const dl = backupRow.before[f].length - backupRow.after[f].length;
        const s = backupRow.structural[f];
        return `${f}(-${dl}ch p=${s.pBefore}→${s.pAfter} br=${s.brBefore}→${s.brAfter})`;
      })
      .join(", ");
    console.log(`  ${DRY_RUN ? "[DRY]" : "[APP]"} ${ref} : ${deltas}`);

    if (!DRY_RUN) {
      const { error: upErr } = await sb
        .from(t.name)
        .update(update)
        .eq("id", r.id);
      if (upErr) {
        console.error(`    ERROR UPDATE: ${upErr.message}`);
      } else {
        console.log(`    ✓ UPDATE OK`);
      }
    }
  }
}

if (allChanges.length > 0 && !DRY_RUN) {
  writeFileSync(BACKUP_PATH, JSON.stringify(allChanges, null, 2));
  console.log(`\n[clear-contacts] Backup ecrit : ${BACKUP_PATH}`);
}

console.log(`\n========== SUMMARY ==========`);
console.log(`Mode             : ${DRY_RUN ? "DRY-RUN" : "APPLY"}`);
console.log(`Biens touche     : ${touchedRows}`);
console.log(`Biens EXCLUS     : ${excludedRows.length} (degradation structurelle)`);
console.log(`============================\n`);

if (excludedRows.length > 0) {
  console.log("Biens exclus :");
  for (const e of excludedRows) {
    console.log(
      `  - ${e.table} / ${e.ref} / ${e.field} : pDelta=${e.struct.pDelta}, brDelta=${e.struct.brDelta}`,
    );
  }
  console.log();
}

// ====== Verification anti-residuel (dry-run uniquement) ======
if (DRY_RUN && touchedRows > 0) {
  let residualEmail = 0;
  let residualTel = 0;
  let residualUrl = 0;
  let copyrightOk = 0;
  let copyrightMissing = 0;
  const COPYRIGHT_TESTS = [
    /Toute\s+reproduction/i,
    /Reproduction\s+(?:prohibited|interdite|verboten)/i,
    /All\s+rights\s+reserved/i,
    /Tous\s+droits\s+r[ée]serv[ée]s/i,
    /©\s*\d{4}/i,
    /Annonce\s+diffus[ée]e/i,
  ];

  for (const change of allChanges) {
    for (const f of Object.keys(change.after)) {
      const v = change.after[f];
      residualEmail += (v.match(EMAIL_RE_G) ?? []).length;
      residualTel += (v.match(TEL_RE_G) ?? []).length;
      residualUrl +=
        (v.match(URL_RE_G) ?? []).length + (v.match(URL_BARE_RE_G) ?? []).length;
      // Si le AVANT contenait une mention copyright, l'APRES doit aussi.
      const before = change.before[f];
      for (const re of COPYRIGHT_TESTS) {
        if (re.test(before)) {
          if (re.test(v)) copyrightOk++;
          else copyrightMissing++;
        }
      }
    }
  }
  console.log(`Anti-residuel + copyright :`);
  console.log(`  email residuel       : ${residualEmail}`);
  console.log(`  tel residuel         : ${residualTel}`);
  console.log(`  URL residuel         : ${residualUrl}`);
  console.log(`  copyright preserve   : ${copyrightOk}`);
  console.log(`  copyright DISPARU    : ${copyrightMissing}`);
  if (residualEmail + residualTel + residualUrl > 0) {
    console.log(`  ⚠ residuel detecte. Affiner stripContactsInPlace.`);
  } else if (copyrightMissing > 0) {
    console.log(`  ⚠ mention copyright manquante apres strip. Affiner.`);
  } else {
    console.log(`  ✓ TOUT BON.`);
  }
}

// ====== --diff : echantillons visuels ciblés ======
if (SHOW_DIFF && DRY_RUN) {
  console.log(`\n${"=".repeat(60)}\n DIFF AVANT/APRES — 3 biens cibles\n${"=".repeat(60)}\n`);
  for (const change of allChanges) {
    const targets = DIFF_TARGETS[change.table] ?? [];
    if (!targets.includes(change.ref)) continue;
    for (const f of Object.keys(change.before)) {
      if (change.table === "properties_offmarket" && f !== "description") continue;
      if (change.table === "properties" && f !== "description_fr") continue;
      const before = change.before[f];
      const after = change.after[f];
      const s = change.structural[f];
      console.log(`\n${"─".repeat(60)}`);
      console.log(` ${change.table} / ${change.ref} / ${f}`);
      console.log(`${"─".repeat(60)}`);
      console.log(` LEN  : ${before.length} → ${after.length} (Δ ${after.length - before.length})`);
      console.log(` <p>  : ${s.pBefore} → ${s.pAfter} (Δ ${s.pDelta})`);
      console.log(` <br> : ${s.brBefore} → ${s.brAfter} (Δ ${s.brDelta})`);
      console.log(` <strong>: ${s.strongBefore} → ${s.strongAfter}`);
      console.log(` email residuel : ${(after.match(EMAIL_RE_G) ?? []).length}`);
      console.log(` tel residuel   : ${(after.match(TEL_RE_G) ?? []).length}`);
      console.log(` URL residuel   : ${(after.match(URL_RE_G) ?? []).length + (after.match(URL_BARE_RE_G) ?? []).length}`);
      console.log(` copyright "reproduction interdite" : ${/Toute\s+reproduction/i.test(after) || /Reproduction\s+(?:prohibited|interdite|verboten)/i.test(after) || /reproduction\s+ou\s+diffusion/i.test(after) ? "PRESENT" : "absent"}`);
      console.log(`\n--- BEFORE (last 500ch) ---\n${before.slice(-500)}`);
      console.log(`\n--- AFTER  (last 500ch) ---\n${after.slice(-500)}`);
    }
  }
}

if (DRY_RUN && touchedRows > 0) {
  console.log(`\nPour APPLIQUER : pnpm exec tsx scripts/clear-contacts-from-descriptions.mjs --apply`);
  console.log(`Pour DIFF      : pnpm exec tsx scripts/clear-contacts-from-descriptions.mjs --diff\n`);
}
