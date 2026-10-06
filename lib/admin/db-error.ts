// Motif clair d'un echec d'ecriture en base dans l'admin (oct. 2026).
// Module pur : traduit l'erreur renvoyee par Supabase (PostgREST ou
// Postgres) en cle de message du namespace next-intl "admin_notices"
// (db_*) et en valeur a inserer (colonne, detail). Jamais de message
// generique : a defaut de cas connu, le code et le texte de la base sont
// montres tels quels.

/** Erreur renvoyee par Supabase (PostgREST ou Postgres). */
export type DbError = { code?: string | null; message?: string | null; details?: string | null };

export function dbErrorReason(e: DbError): { key: string; value: string } {
  const code = e.code ?? "";
  const msg = `${e.message ?? ""} ${e.details ?? ""}`;
  const col = msg.match(/'([a-z_0-9]+)' column|column "([a-z_0-9]+)"|column ([a-z_0-9]+)/i);
  const column = col ? (col[1] ?? col[2] ?? col[3] ?? "") : "";
  if (code === "PGRST204" || /could not find the .* column|column .* does not exist/i.test(msg)) return { key: "db_unknown_column", value: column };
  if (code === "42501" || /row-level security|permission denied/i.test(msg)) return { key: "db_forbidden", value: "" };
  if (code === "23502") return { key: "db_missing_value", value: column };
  if (code === "23505") return { key: "db_duplicate", value: (e.details ?? "").slice(0, 160) };
  if (code === "22P02" || code === "22007" || code === "22008" || code === "22003") return { key: "db_invalid_value", value: (e.message ?? "").slice(0, 160) };
  if (code === "23514") return { key: "db_check", value: (e.message ?? "").slice(0, 160) };
  if (code === "PGRST116") return { key: "db_not_found", value: "" };
  return { key: "db_other", value: `${code ? `${code} : ` : ""}${(e.message ?? "").slice(0, 200)}`.trim() || "?" };
}
