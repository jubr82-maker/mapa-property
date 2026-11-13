// Purge automatique des journaux et statistiques (oct. 2026), lancee par la
// tache quotidienne. Supprime seulement les lignes plus anciennes que la
// duree acceptee (RETENTION_RULES) ; une table absente est ignoree.
import { supabaseService } from "@/lib/supabase-service";
import { RETENTION_RULES } from "@/lib/pilotage/config";
import { isMissingRelation } from "@/lib/pilotage/controle-core";

/**
 * Date limite : maintenant moins `months` mois civils, jour ramene au
 * dernier jour du mois cible si besoin (comme `now() - interval` en SQL).
 */
export function retentionCutoff(months: number, now = new Date()): Date {
  const d = new Date(now);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

// Table absente : meme regle que le controle quotidien (controle-core).
const isMissingTable = (code: string | undefined) => isMissingRelation(code);

export async function purgeExpiredRows(now = new Date()): Promise<{ ok: boolean; detail: string }> {
  const svc = supabaseService();
  const parts: string[] = [];
  let ok = true;
  for (const rule of RETENTION_RULES) {
    const cutoff = (rule.days !== undefined ? new Date(now.getTime() - rule.days * 86400_000) : retentionCutoff(rule.months, now)).toISOString();
    const { count, error } = await svc
      .from(rule.table)
      .delete({ count: "exact" })
      .lt(rule.column, cutoff);
    if (error && isMissingTable(error.code)) {
      parts.push(`${rule.table}:absente`);
    } else if (error) {
      ok = false;
      parts.push(`${rule.table}:erreur ${error.code ?? "inconnue"}`);
    } else {
      parts.push(`${rule.table}:${count ?? 0}`);
    }
  }
  return { ok, detail: parts.join(",") };
}
