import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

export const dynamic = "force-dynamic";
import {
  OFFMARKET_STATUS_TONES,
  PROPERTY_TYPES,
  type OffmarketStatus,
  type OffmarketTransaction,
} from "@/lib/admin/offmarket";
import { fetchOffmarketAdminList } from "@/lib/admin/offmarket-server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { formatPrice } from "@/lib/format/numbers";
import { OffmarketListFilters } from "@/components/admin/OffmarketListFilters";

export default async function AdminOffmarketListPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    type?: string;
    transaction?: string;
    q?: string;
  }>;
}) {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_offmarket" });
  const sp = await searchParams;
  const all = await fetchOffmarketAdminList();

  const filtered = all.filter((row) => {
    if (sp.status && row.status !== sp.status) return false;
    if (sp.type && row.property_type !== sp.type) return false;
    if (sp.transaction && (row.transaction ?? "sale") !== sp.transaction) return false;
    if (sp.q) {
      const needle = sp.q.toLowerCase();
      const hay = `${row.reference ?? ""} ${row.title ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("list.eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {t("list.title")}
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {t("list.count", { count: filtered.length, total: all.length })}
          </p>
        </div>
        <Link
          href="/admin/offmarket/new"
          className="inline-flex items-center gap-2 rounded-full bg-[#e0af6e] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white shadow-md shadow-[#e0af6e]/30 transition-colors hover:bg-[#9d6e44]"
        >
          + {t("list.new")}
        </Link>
      </header>

      <OffmarketListFilters />

      <div className="overflow-hidden rounded-2xl border border-[#3D4F63]/15 bg-white">
        <table data-card-primary="2" data-card-keep="1,2,4,5,8" className="w-full text-sm">
          <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">{t("list.col_reference")}</th>
              <th className="px-4 py-3">{t("list.col_title")}</th>
              <th className="px-4 py-3">{t("list.col_type")}</th>
              <th className="px-4 py-3 text-right">{t("list.col_price")}</th>
              <th className="px-4 py-3">{t("list.col_status")}</th>
              <th className="px-4 py-3 text-right">{t("list.col_views")}</th>
              <th className="px-4 py-3 text-right">{t("list.col_requests")}</th>
              <th className="px-4 py-3 text-right">{t("list.col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D4F63]/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                  {all.length === 0 ? t("list.empty") : t("list.emptyFiltered")}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const city = row.city_label ?? row.city_anonymized ?? "";
                const typeKey = (PROPERTY_TYPES as readonly string[]).includes(row.property_type ?? "")
                  ? (row.property_type as string)
                  : null;
                const status = (row.status ?? "draft") as OffmarketStatus;
                return (
                  <tr key={row.id} className="hover:bg-[#3D4F63]/5">
                    <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#e0af6e]">
                      {row.reference}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1A1F2A]">{row.title ?? t("untitled")}</p>
                      <p className="text-xs text-[#3D4F63]/60">
                        {[row.country, city].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wide text-[#3D4F63]/80">
                      {typeKey ? t(`propertyType.${typeKey}`) : (row.property_type ?? t("propertyType.unknown"))}
                      <span className="ml-1.5 text-[#e0af6e]">
                        · {t(`transaction.${(row.transaction ?? "sale") as OffmarketTransaction}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#3D4F63]">
                      {row.price_estimate
                        ? formatPrice(row.price_estimate, "fr")
                        : t("list.priceNone")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${OFFMARKET_STATUS_TONES[status]}`}
                      >
                        {t(`status.${status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#3D4F63]/70">
                      {row.views_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/offmarket/${row.id}/requests`}
                        className="font-mono text-xs font-bold text-[#e0af6e] hover:underline"
                      >
                        {row.requests_count ?? 0}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Link
                          href={`/admin/offmarket/${row.id}/edit`}
                          className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
                        >
                          {t("list.edit")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
