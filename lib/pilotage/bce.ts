// Veille des taux BCE (nov. 2026). Avant : une seule serie (moyenne) inseree
// le 1er du mois dans interest_rates.rate, alors que le simulateur lit
// interest_rates.rates (fixed_5 a fixed_30, variable), jamais rempli : le site
// affichait toujours les valeurs de secours.
// Desormais : 8 series officielles MIR (Luxembourg, nouveaux credits
// immobiliers aux menages), lues TOUS les jours par la tache quotidienne
// (deux requetes legeres, sans en-tete identifiant). Une ligne par mois de
// reference publie, jamais de doublon, jamais d'effacement. Si la BCE ne
// repond pas, rien n'est modifie et l'echec est journalise (cron_runs).
import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase-service";
import {
  ECB_REQUEST_URLS,
  ECB_SOURCE,
  buildRatesJson,
  latestCompleteMonth,
  parseEcbCsv,
} from "@/lib/rates";

export type BceResult = { ok: boolean; detail: string; month?: string; rate?: number };

/** Lecture des 8 series. Injectable pour les tests (aucun reseau). */
export type EcbFetcher = (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

const defaultFetcher: EcbFetcher = (url) =>
  fetch(url, { headers: { Accept: "text/csv" }, cache: "no-store", signal: AbortSignal.timeout(20_000) });

/** Store minimal (Supabase en production, simule dans les tests). */
export type RatesStore = {
  monthExists: (month: string) => Promise<{ exists: boolean; error?: string }>;
  insert: (row: Record<string, unknown>) => Promise<{ error?: { code?: string; message?: string } }>;
};

function supabaseStore(): RatesStore {
  const sb = supabaseService();
  return {
    async monthExists(month) {
      const { data, error } = await sb
        .from("interest_rates")
        .select("reference_month")
        .eq("reference_month", month)
        .eq("source", ECB_SOURCE)
        .limit(1);
      if (error) return { exists: false, error: error.code ?? "select_error" };
      return { exists: (data ?? []).length > 0 };
    },
    async insert(row) {
      const { error } = await sb.from("interest_rates").insert(row as never);
      return { error: error ? { code: error.code, message: error.message } : undefined };
    },
  };
}

export async function fetchEcbRates(fetcher: EcbFetcher = defaultFetcher) {
  const merged = new Map<string, Map<string, number>>();
  for (const url of ECB_REQUEST_URLS) {
    const res = await fetcher(url);
    if (!res.ok) return { ok: false as const, detail: `ecb_http_${res.status}` };
    for (const [k, v] of parseEcbCsv(await res.text())) merged.set(k, v);
  }
  const latest = latestCompleteMonth(merged);
  if (!latest) return { ok: false as const, detail: "parse_failed" };
  return { ok: true as const, ...latest };
}

export async function refreshBceRate(opts: { fetcher?: EcbFetcher; store?: RatesStore } = {}): Promise<BceResult> {
  let ecb: Awaited<ReturnType<typeof fetchEcbRates>>;
  try {
    ecb = await fetchEcbRates(opts.fetcher);
  } catch (e) {
    return { ok: false, detail: `ecb_unreachable${e instanceof Error && e.name === "TimeoutError" ? "_timeout" : ""}` };
  }
  if (!ecb.ok) return { ok: false, detail: ecb.detail };
  const { month, official } = ecb;

  if (!opts.store && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, detail: `stubbed_${month}`, month, rate: official.average };
  }
  const store = opts.store ?? supabaseStore();

  const existing = await store.monthExists(month);
  if (existing.error) return { ok: false, detail: `db_error_${existing.error}`, month };
  if (existing.exists) return { ok: true, detail: `unchanged_${month}`, month, rate: official.average };

  const base = {
    reference_month: month,
    source: ECB_SOURCE,
    rates: buildRatesJson(official),
    // Compatibilite : colonne historique, moyenne toutes durees (serie A).
    rate: official.average,
  };
  let { error } = await store.insert({
    ...base,
    series: "MIR.M.LU.B.A2C.*.R.A.2250.EUR.*",
    captured_at: new Date().toISOString(),
  });
  // Colonne facultative absente (series, captured_at) : nouvel essai avec
  // les seules colonnes utiles (cf. supabase/sql/41_taux_par_duree.sql).
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    ({ error } = await store.insert(base));
  }
  // Mois deja insere entre-temps (index unique du SQL 41) : pas un echec.
  if (error?.code === "23505") return { ok: true, detail: `unchanged_${month}`, month, rate: official.average };
  if (error) {
    console.error("[bce] insertion", { code: error.code });
    return { ok: false, detail: `db_error_${error.code ?? "insert"}`, month };
  }
  refreshRatePages();
  return { ok: true, detail: `inserted_${month}`, month, rate: official.average };
}

/** Pages qui affichent un taux : regenerees des qu'un nouveau mois arrive. */
export const RATE_PAGES = [
  "/[locale]/services/simulateurs",
  "/[locale]/services/rendement-locatif",
  "/[locale]/biens/[slug]",
] as const;

function refreshRatePages(): void {
  for (const p of RATE_PAGES) {
    try {
      revalidatePath(p, "page");
    } catch {
      // Hors requete Next (tests) : sans effet, la regeneration quotidienne prend le relais.
    }
  }
}
