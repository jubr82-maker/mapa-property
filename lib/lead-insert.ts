// lib/lead-insert.ts — insertion résiliente avec colonne de consentement
// RGPD (BUG 7).
//
// Problème : `rgpd_consent_at` est ajoutée par une migration appliquée
// MANUELLEMENT par Julien (règle inviolable : pas d'écriture/migration
// auto). Si le code déployé écrit cette colonne AVANT que la migration
// soit appliquée, PostgREST renvoie une erreur "column not found" et
// TOUT le formulaire 500 → on perd des leads. Inacceptable.
//
// Solution : on tente l'INSERT AVEC `rgpd_consent_at` ; si l'erreur
// indique que la colonne est inconnue, on retente SANS (le consentement
// reste tracé dans `message`). Post-migration : la 1re tentative passe.
// Aucune dépendance au schéma au runtime, jamais de lead perdu.

import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

function isUnknownColumnError(err: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!err) return false;
  // 42703 = undefined_column (Postgres) ; PGRST204 = colonne absente du
  // cache de schéma PostgREST. On filtre aussi sur le nom de colonne.
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    /rgpd_consent_at/i.test(err.message ?? "")
  );
}

/**
 * Insère `row` dans `table`. Si `consentAt` est fourni, ajoute
 * `rgpd_consent_at` ; en cas de colonne absente, retente sans.
 * Pas de .select()/RETURNING (tables privées : pas de policy SELECT
 * anon — cf. /api/nda-request). Retourne { ok, degraded }.
 */
export async function insertLeadWithConsent(
  sb: SupabaseClient,
  table: string,
  row: Row,
  consentAt?: string,
): Promise<{ ok: boolean; degraded: boolean; error?: string }> {
  if (consentAt) {
    const { error } = await sb
      .from(table)
      .insert({ ...row, rgpd_consent_at: consentAt } as never);
    if (!error) return { ok: true, degraded: false };
    if (!isUnknownColumnError(error)) {
      return { ok: false, degraded: false, error: error.message };
    }
    console.warn(
      `[lead-insert] ${table}.rgpd_consent_at absente — migration ` +
        `20260518_rgpd_consent.sql à appliquer ; insertion dégradée ` +
        `(consentement conservé dans message).`,
    );
  }
  const { error } = await sb.from(table).insert(row as never);
  if (error) return { ok: false, degraded: Boolean(consentAt), error: error.message };
  return { ok: true, degraded: Boolean(consentAt) };
}
