// Export complet du schema public (oct. 2026), par la cle de service :
// structure (fonction public.mapa_backup_catalog, SQL 22) et toutes les
// lignes de chaque table, lues par pages de 1 000 dans l'ordre de la cle
// primaire. Respecte un budget de temps : au-dela, l'export s'arrete avec
// une cause explicite plutot que d'etre coupe par l'hebergeur.
import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogTable = {
  name: string;
  rls: boolean;
  columns: { name: string; type: string; not_null: boolean; default: string | null; identity: string | null }[];
  primary_key: string[] | null;
  constraints: { name: string; type: string; def: string }[];
  indexes: string[];
  policies: { name: string; permissive: string; cmd: string; roles: string[]; using: string | null; check: string | null }[];
};
export type Catalog = { tables: CatalogTable[]; sequences: { name: string; last_value: number | null }[]; generated_at: string };

export type BackupPayload = {
  format: "mapa-backup-v1";
  created_at: string;
  catalog: Catalog;
  data: Record<string, Record<string, unknown>[]>;
};

const PAGE = 1000;

export async function exportDatabase(sb: SupabaseClient, opts: { deadlineMs: number; now?: () => number }): Promise<BackupPayload> {
  const now = opts.now ?? Date.now;
  const { data: catalog, error } = await sb.rpc("mapa_backup_catalog");
  if (error || !catalog) throw new Error(`catalog_unavailable${error?.code ? `_${error.code}` : ""}`);
  const cat = catalog as Catalog;
  const out: BackupPayload = { format: "mapa-backup-v1", created_at: new Date(now()).toISOString(), catalog: cat, data: {} };
  for (const table of cat.tables) {
    const order = table.primary_key?.[0] ?? table.columns[0]?.name;
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      if (now() > opts.deadlineMs) throw new Error(`time_budget_exceeded_at_${table.name}`);
      let q = sb.from(table.name).select("*").range(from, from + PAGE - 1);
      if (order) q = q.order(order, { ascending: true });
      const { data, error: e } = await q;
      if (e) throw new Error(`read_failed_${table.name}${e.code ? `_${e.code}` : ""}`);
      rows.push(...((data as Record<string, unknown>[] | null) ?? []));
      if (!data || data.length < PAGE) break;
    }
    out.data[table.name] = rows;
  }
  return out;
}

export function rowCounts(p: BackupPayload): Record<string, number> {
  return Object.fromEntries(Object.entries(p.data).map(([k, v]) => [k, v.length]));
}
