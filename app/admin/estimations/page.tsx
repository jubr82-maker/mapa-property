import Link from "next/link";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ExcelExportButton } from "@/components/admin/ExcelExportButton";
import { AdminDateCell } from "@/components/admin/AdminDateCell";
import { DateSortToggle, parseDateSort } from "@/components/admin/DateSortToggle";
import { getAdminDateTimeT } from "@/lib/admin/datetime-labels";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

interface EstimationRow {
  id: string;
  inputs: Record<string, unknown>;
  client_output: { price_low?: number; price_mid?: number; price_high?: number; confidence?: string } | null;
  contact_email: string | null;
  contact_phone: string | null;
  engine: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

const KNOWN_STATUSES = ["new", "in_progress", "avis_sent", "mandate_signed", "closed"];
const KNOWN_ENGINES = ["evs_5_methods", "hedonic_legacy", "manual_admin"];
const KNOWN_CONFIDENCES = ["HIGH", "MEDIUM", "LOW", "MANUAL"];
const KNOWN_TYPES = ["appartement", "maison", "penthouse", "duplex", "villa", "immeuble", "terrain"];
const KNOWN_STATES = ["to_renovate", "good", "renovated", "new", "excellent", "fair", "major_works"];

const STATUS_COLOR: Record<string, string> = {
  new: "bg-[#e0af6e]/15 text-[#9E7B2A]",
  in_progress: "bg-blue-500/15 text-blue-700",
  avis_sent: "bg-purple-500/15 text-purple-700",
  mandate_signed: "bg-emerald-500/15 text-emerald-700",
  closed: "bg-gray-500/15 text-gray-700",
};

function fmtPrice(n?: number) {
  if (!n) return "";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}


export default async function AdminEstimationsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  await requireAdminPage();
  const supabase = supabaseService();
  const sort = parseDateSort((await searchParams).sort);
  const tDate = await getAdminDateTimeT();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_estimations" });
  const unknown = t("notProvided");

  const { data: rows, error } = await supabase
    .from("estimation_requests")
    .select(
      "id, inputs, client_output, contact_email, contact_phone, engine, status, created_at, updated_at",
    )
    .neq("status", "deleted") // masque les estimations supprimées (suppression logique)
    .order("created_at", { ascending: sort === "asc" })
    .limit(100);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#3D4F63]/60">
            {t("list.eyebrow")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#1A1F2A]">
            {t("list.title")}
          </h1>
          <p className="mt-2 text-sm text-[#1A1F2A]/70">
            {t("list.intro")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExcelExportButton exportPath="/api/admin/exports/estimations" />
          <Link
            href="/admin/estimations/new"
            className="rounded-full bg-[#9E7B2A] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#e0af6e]"
          >
            + {t("list.new")}
          </Link>
          <div className="rounded-md border border-[#3D4F63]/15 bg-white px-4 py-2 text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/60">
              {t("list.total")}
            </p>
            <p className="font-display text-2xl font-bold text-[#3D4F63]">
              {rows?.length ?? 0}
            </p>
          </div>
        </div>
      </header>

      <DateSortToggle basePath="/admin/estimations" sort={sort} />

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {t("list.loadError")}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#F5EFE1] text-left font-mono text-[10px] uppercase tracking-widest text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">{tDate("created_col")}</th>
              <th className="px-4 py-3">{t("list.col_property")}</th>
              <th className="px-4 py-3 text-right">{t("list.col_range")}</th>
              <th className="px-4 py-3 text-center">{t("list.col_confidence")}</th>
              <th className="px-4 py-3">{t("list.col_contact")}</th>
              <th className="px-4 py-3">{t("list.col_engine")}</th>
              <th className="px-4 py-3">{t("list.col_status")}</th>
            </tr>
          </thead>
          <tbody>
            {(rows as EstimationRow[] | null)?.map((r) => {
              const inputs = r.inputs as {
                type?: string;
                commune?: string;
                country?: string;
                livingSurface?: number | string;
                surfaceLiving?: number | string;
                state?: string;
                energy?: string;
              };
              const surface = inputs.livingSurface ?? inputs.surfaceLiving;
              const confidence = r.client_output?.confidence;
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer border-t border-[#3D4F63]/10 transition-colors hover:bg-[#F5EFE1]/40"
                  onClick={undefined}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-[#1A1F2A]/70 whitespace-nowrap">
                    <Link
                      href={`/admin/estimations/${r.id}`}
                      className="hover:text-[#9E7B2A] hover:underline"
                    >
                      <AdminDateCell createdAt={r.created_at} updatedAt={r.updated_at} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/estimations/${r.id}`} className="block hover:text-[#9E7B2A]">
                      <div className="font-medium text-[#1A1F2A]">
                        {inputs.type && KNOWN_TYPES.includes(inputs.type)
                          ? t(`propertyType.${inputs.type}`)
                          : (inputs.type ?? unknown)}{" "}
                        · {inputs.commune ?? inputs.country ?? unknown}
                      </div>
                      <div className="text-xs text-[#1A1F2A]/60">
                        {surface != null && surface !== "" ? `${surface} m²` : unknown}
                        {" · "}
                        {inputs.state && KNOWN_STATES.includes(inputs.state)
                          ? t(`state.${inputs.state}`)
                          : (inputs.state ?? unknown)}
                        {" · "}
                        {t("list.energy", { energy: inputs.energy ?? unknown })}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="font-display text-base font-bold text-[#9E7B2A]">
                      {fmtPrice(r.client_output?.price_mid)}
                    </div>
                    <div className="font-mono text-[10px] text-[#1A1F2A]/60">
                      {t("range", {
                        low: fmtPrice(r.client_output?.price_low),
                        high: fmtPrice(r.client_output?.price_high),
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                        confidence === "HIGH"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : confidence === "MEDIUM"
                            ? "bg-[#e0af6e]/15 text-[#9E7B2A]"
                            : "bg-red-500/15 text-red-700"
                      }`}
                    >
                      {confidence && KNOWN_CONFIDENCES.includes(confidence)
                        ? t(`confidence.${confidence}`)
                        : unknown}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.contact_email && (
                      <div className="text-[#1A1F2A] truncate max-w-[180px]">{r.contact_email}</div>
                    )}
                    {r.contact_phone && (
                      <div className="text-[#1A1F2A]/60 font-mono text-[11px]">{r.contact_phone}</div>
                    )}
                    {!r.contact_email && !r.contact_phone && (
                      <span className="text-[#1A1F2A]/40">{t("list.noContact")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] text-[#1A1F2A]/60">
                      {KNOWN_ENGINES.includes(r.engine) ? t(`engineShort.${r.engine}`) : r.engine}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                        STATUS_COLOR[r.status] ?? STATUS_COLOR.new
                      }`}
                    >
                      {KNOWN_STATUSES.includes(r.status) ? t(`status.${r.status}`) : t("status.unknown")}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#1A1F2A]/50">
                  {t("list.empty")}
                  <br />
                  <Link
                    href="/fr/services/estimer"
                    target="_blank"
                    className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-[#9E7B2A] hover:underline"
                  >
                    {t("list.testPublicForm")} →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-[#1A1F2A]/40">
        {t("list.footer")}
      </p>
    </div>
  );
}

export const dynamic = "force-dynamic";
