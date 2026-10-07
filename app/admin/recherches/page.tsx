import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE, formatDateTimeShort } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";

type Row = { id: string; reference: string; status: string; property_type: string; communes: string[] | null; consent_anonymous: boolean; updated_at: string | null };
type MandateRow = { id: string; client_name: string | null; zones: string[] | null; created_at: string };

// Gestion > Recherches (oct. 2026) : recherches en cours et mandats de
// recherche actifs dont on peut creer une recherche publique.
export default async function SearchesAdminPage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_searches" });
  const tp = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });
  const supabase = await createSupabaseServerClient();
  const [searchesRes, mandatesRes] = await Promise.all([
    supabase.from("property_searches").select("id, reference, status, property_type, communes, consent_anonymous, updated_at").order("updated_at", { ascending: false }).limit(300),
    supabase.from("mandats").select("id, client_name, zones, created_at").eq("type_transaction", "recherche").eq("status", "actif").order("created_at", { ascending: false }).limit(50),
  ]);
  const unavailable = Boolean(searchesRes.error);
  const rows = (searchesRes.data as Row[] | null) ?? [];
  const mandates = (mandatesRes.data as MandateRow[] | null) ?? [];
  const typeLabel = (v: string) => (tp.has(`ptype_${v}`) ? tp(`ptype_${v}`) : tp.has(`family_${v}`) ? tp(`family_${v}`) : v);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">{t("eyebrow")}</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/70">{t("intro")}</p>
        </div>
        <Link href="/admin/recherches/new" className="rounded-full bg-[#3D4F63] px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#e0af6e]">
          {t("new_button")}
        </Link>
      </header>

      {unavailable && <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">{t("unavailable")}</p>}

      <section className="overflow-x-auto rounded-2xl border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">{t("col_reference")}</th>
              <th className="px-4 py-3">{t("col_type")}</th>
              <th className="px-4 py-3">{t("col_communes")}</th>
              <th className="px-4 py-3">{t("col_status")}</th>
              <th className="px-4 py-3">{t("col_consent")}</th>
              <th className="px-4 py-3">{t("col_updated")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-[#3D4F63]/70">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[#3D4F63]/10">
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/admin/recherches/${r.id}`} className="text-[#3D4F63] underline">
                      {r.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{typeLabel(r.property_type)}</td>
                  <td className="px-4 py-3">{(r.communes ?? []).join(", ")}</td>
                  <td className="px-4 py-3">{t(`status_${r.status}`)}</td>
                  <td className="px-4 py-3">{r.consent_anonymous ? t("consent_yes") : t("consent_no")}</td>
                  <td className="px-4 py-3 text-[#3D4F63]/70">{r.updated_at ? formatDateTimeShort(r.updated_at) : ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {mandates.length > 0 && (
        <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-[#3D4F63]">{t("mandates_title")}</h2>
          <p className="mt-1 text-xs text-[#3D4F63]/70">{t("mandates_hint")}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {mandates.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#3D4F63]/10 pt-2">
                <span>
                  {m.client_name ?? m.id}
                  {m.zones?.length ? <span className="text-[#3D4F63]/70"> ({m.zones.join(", ")})</span> : null}
                </span>
                <Link href={`/admin/recherches/new?mandat=${m.id}`} className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63] underline">
                  {t("from_mandate_button")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
