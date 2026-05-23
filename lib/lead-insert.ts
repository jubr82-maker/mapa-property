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

/** Code Postgres / PostgREST signifiant "colonne inconnue". */
function isUnknownColumnError(err: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!err) return false;
  // 42703 = undefined_column (Postgres) ; PGRST204 = colonne absente du
  // cache de schéma PostgREST.
  return err.code === "42703" || err.code === "PGRST204";
}

/**
 * Extrait le nom de colonne fautif d'un message d'erreur PostgREST.
 * Format observé : 'Could not find the \'X\' column' / 'column "X" of
 * relation "Y" does not exist'.
 */
function extractMissingColumn(message: string | undefined): string | null {
  if (!message) return null;
  const m1 = message.match(/find the '([\w_]+)' column/i);
  if (m1) return m1[1];
  const m2 = message.match(/column "([\w_]+)" of relation/i);
  if (m2) return m2[1];
  return null;
}

/**
 * Insère `row` dans `table`, en degradation gracieuse face aux colonnes
 * absentes (migrations Julien appliquees a posteriori).
 *
 * Sprint C3 : generalisation du pattern RGPD (BUG 7) a toutes les
 * colonnes optionnelles. Si l'INSERT echoue avec "colonne inconnue",
 * on retire la colonne fautive et on retente — jusqu'a 3 essais
 * (assez pour rgpd_consent_at + subject + autres futures).
 *
 * Pas de .select()/RETURNING (tables privées : pas de policy SELECT
 * anon — cf. /api/nda-request). Retourne { ok, degraded }.
 */
export async function insertLeadWithConsent(
  sb: SupabaseClient,
  table: string,
  row: Row,
  consentAt?: string,
): Promise<{ ok: boolean; degraded: boolean; error?: string }> {
  let payload: Row = consentAt
    ? { ...row, rgpd_consent_at: consentAt }
    : { ...row };
  let degraded = false;

  // Jusqu'a 3 tentatives : chaque iteration retire la colonne signalee
  // inconnue. Au-dela, on echoue proprement.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await sb.from(table).insert(payload as never);
    if (!error) {
      return { ok: true, degraded };
    }
    if (!isUnknownColumnError(error)) {
      return { ok: false, degraded, error: error.message };
    }
    const col = extractMissingColumn(error.message);
    if (!col || !(col in payload)) {
      // Erreur "unknown column" sans nom extractible → on abandonne.
      return { ok: false, degraded, error: error.message };
    }
    console.warn(
      `[lead-insert] ${table}.${col} absente (migration a appliquer) — ` +
        `retry sans cette colonne.`,
    );
    const next: Row = { ...payload };
    delete next[col];
    payload = next;
    degraded = true;
  }
  return { ok: false, degraded, error: "too_many_unknown_column_retries" };
}
