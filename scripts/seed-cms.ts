#!/usr/bin/env -S node --import tsx
/**
 * MAPA Property — Seeder bootstrap CMS site_content
 * --------------------------------------------------
 * Initialise la table `site_content` à partir de
 * `messages/{fr,en,de}.json`. Idempotent : ON CONFLICT DO NOTHING.
 *
 * Stratégie clés :
 * - On extrait les clés des composants pivots refactorés (Hero,
 *   StatsBand, ContactCTA) sous un mapping explicite. Ainsi le
 *   namespace next-intl `hero.title_line_1` devient la clé CMS
 *   `home.hero.title_line_1`.
 * - Les autres composants continuent d'utiliser next-intl directement
 *   tant qu'ils ne sont pas refactorés. Élargir le mapping ci-dessous
 *   au fil des migrations.
 *
 * Variables d'env requises :
 *   NEXT_PUBLIC_SUPABASE_URL (obligatoire)
 *   SUPABASE_SERVICE_ROLE_KEY (recommandé, pour bypass RLS) — sinon
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY (warning : nécessite une session
 *   admin authentifiée, ne marche pas en stand-alone).
 *
 * Lancement :
 *   pnpm exec tsx scripts/seed-cms.ts
 *   # ou
 *   node --import tsx scripts/seed-cms.ts
 *
 * NE PAS exécuter en production sans relecture.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------
// Mapping namespace next-intl → clé CMS
// -----------------------------------------------------------------
// Format : { cmsKey: "namespace.key" } où namespace.key référence
// la valeur dans messages/{locale}.json.
//
// AJOUTER ici au fil du refactor des composants home.
const MAPPING: Record<string, { section: string; description: string }> = {
  // Hero
  "home.hero.pill": { section: "home", description: "Pastille au-dessus du titre" },
  "home.hero.eyebrow": { section: "home", description: "Eyebrow Hero" },
  "home.hero.title_line_1": { section: "home", description: "Titre Hero ligne 1" },
  "home.hero.title_line_2": { section: "home", description: "Titre Hero ligne 2" },
  "home.hero.title_line_3": { section: "home", description: "Titre Hero ligne 3" },
  "home.hero.subtitle": { section: "home", description: "Sous-titre Hero" },
  "home.hero.meta_catalog": { section: "home", description: "Meta Hero — Catalogue" },
  "home.hero.meta_segments": { section: "home", description: "Meta Hero — Segments" },
  "home.hero.meta_coverage": { section: "home", description: "Meta Hero — Couverture" },
  "home.hero.meta_status": { section: "home", description: "Meta Hero — Statut" },
  "home.hero.scroll": { section: "home", description: "Lien Hero scroll" },
  // Stats
  "home.stats.eyebrow": { section: "home", description: "Stats — eyebrow" },
  "home.stats.experience_label": { section: "home", description: "Stats — Expérience label" },
  "home.stats.experience_text": { section: "home", description: "Stats — Expérience texte" },
  "home.stats.communes_label": { section: "home", description: "Stats — Communes label" },
  "home.stats.communes_text": { section: "home", description: "Stats — Communes texte" },
  "home.stats.cities_label": { section: "home", description: "Stats — Cities label" },
  "home.stats.cities_text": { section: "home", description: "Stats — Cities texte" },
  "home.stats.transactions_label": { section: "home", description: "Stats — Transactions label" },
  "home.stats.transactions_text": { section: "home", description: "Stats — Transactions texte" },
  // Contact CTA
  "home.contact_cta.eyebrow": { section: "home", description: "Contact CTA — eyebrow" },
  "home.contact_cta.title": { section: "home", description: "Contact CTA — titre" },
  "home.contact_cta.description": { section: "home", description: "Contact CTA — description" },
  "home.contact_cta.cta": { section: "home", description: "Contact CTA — bouton" },
};

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Pour une clé CMS comme "home.hero.title_line_1", renvoie la clé i18n correspondante. */
function cmsKeyToIntlPath(cmsKey: string): string {
  // home.hero.title_line_1 → hero.title_line_1
  // home.stats.eyebrow → stats.eyebrow
  // home.contact_cta.title → contact_cta.title
  return cmsKey.replace(/^home\./, "");
}

// -----------------------------------------------------------------
// Main
// -----------------------------------------------------------------
async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    console.error("[seed-cms] NEXT_PUBLIC_SUPABASE_URL manquant — abandon.");
    process.exit(1);
  }
  const key = serviceKey ?? anonKey;
  if (!key) {
    console.error("[seed-cms] Aucune clé Supabase (service_role ou anon) — abandon.");
    process.exit(1);
  }
  if (!serviceKey) {
    console.warn(
      "[seed-cms] WARNING: SUPABASE_SERVICE_ROLE_KEY absent → utilisation anon key.\n" +
        "  L'insert échouera si la session courante n'est pas authentifiée (RLS).",
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Charger les 3 locales
  const locales = ["fr", "en", "de"] as const;
  const messagesByLocale: Record<string, unknown> = {};
  for (const l of locales) {
    const p = resolve(root, "messages", `${l}.json`);
    messagesByLocale[l] = JSON.parse(readFileSync(p, "utf-8"));
  }

  // Construire les rows
  const rows: Array<{
    key: string;
    locale: string;
    content: string;
    section: string;
    description: string;
  }> = [];

  for (const [cmsKey, meta] of Object.entries(MAPPING)) {
    const intlPath = cmsKeyToIntlPath(cmsKey);
    for (const locale of locales) {
      const value = getByPath(messagesByLocale[locale], intlPath);
      if (typeof value !== "string") {
        console.warn(`[seed-cms] clé i18n introuvable: ${locale}/${intlPath}`);
        continue;
      }
      rows.push({
        key: cmsKey,
        locale,
        content: value,
        section: meta.section,
        description: meta.description,
      });
    }
  }

  console.log(`[seed-cms] ${rows.length} rows prêtes à insérer.`);

  // Upsert idempotent (ON CONFLICT (key, locale) DO NOTHING)
  // Supabase JS ne propose pas DO NOTHING natif → on filtre les rows
  // déjà présentes pour ne PAS overwrite si déjà éditées.
  const { data: existing, error: selErr } = await supabase
    .from("site_content")
    .select("key,locale");
  if (selErr) {
    console.error("[seed-cms] erreur SELECT site_content:", selErr.message);
    process.exit(1);
  }
  const existingSet = new Set((existing ?? []).map((r) => `${r.key}::${r.locale}`));
  const toInsert = rows.filter((r) => !existingSet.has(`${r.key}::${r.locale}`));

  console.log(`[seed-cms] ${toInsert.length} nouvelles rows à insérer (skip ${rows.length - toInsert.length} déjà présentes).`);

  if (toInsert.length === 0) {
    console.log("[seed-cms] Rien à faire — terminé.");
    return;
  }

  const { error: insErr } = await supabase.from("site_content").insert(toInsert);
  if (insErr) {
    console.error("[seed-cms] erreur INSERT:", insErr.message);
    process.exit(1);
  }
  console.log("[seed-cms] OK.");
}

main().catch((e) => {
  console.error("[seed-cms] crash:", e);
  process.exit(1);
});
