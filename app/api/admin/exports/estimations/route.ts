// Export Excel de la liste des demandes d'estimation : memes
// donnees/tri que app/admin/estimations/page.tsx (pas de filtre sur
// cette page a ce jour : neq status 'deleted', limit 100).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toLuxembourgDateTimeCell, orDash } from "@/lib/admin/exports/format";
import { propertyTypeLabel, engineLabel, estimationStatusLabel, confidenceLabel } from "@/lib/admin/exports/labels";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

interface EstimationExportRow {
  id: string;
  inputs: Record<string, unknown>;
  client_output: {
    price_low?: number;
    price_mid?: number;
    price_high?: number;
    confidence?: string;
  } | null;
  contact_email: string | null;
  contact_phone: string | null;
  engine: string;
  status: string;
  created_at: string;
}

type ExportT = Awaited<ReturnType<typeof getTranslations>>;

const buildColumns = (t: ExportT): ExcelColumn<EstimationExportRow>[] => [
  { header: t("export.date"), key: "date", type: "datetime", value: (r) => toLuxembourgDateTimeCell(r.created_at) },
  {
    header: t("export.propertyType"),
    key: "type",
    type: "text",
    value: (r) => propertyTypeLabel((r.inputs as { type?: string })?.type),
  },
  {
    header: t("export.location"),
    key: "commune",
    type: "text",
    value: (r) => {
      const i = r.inputs as { commune?: string; country?: string };
      return orDash(i?.commune ?? i?.country);
    },
  },
  { header: t("export.email"), key: "email", type: "text", width: 28, value: (r) => orDash(r.contact_email) },
  { header: t("export.phone"), key: "tel", type: "text", value: (r) => orDash(r.contact_phone) },
  { header: t("export.low"), key: "low", type: "amount", value: (r) => r.client_output?.price_low ?? null },
  { header: t("export.mid"), key: "mid", type: "amount", value: (r) => r.client_output?.price_mid ?? null },
  { header: t("export.high"), key: "high", type: "amount", value: (r) => r.client_output?.price_high ?? null },
  { header: t("export.confidence"), key: "confidence", type: "text", value: (r) => confidenceLabel(r.client_output?.confidence) },
  { header: t("export.engine"), key: "engine", type: "text", value: (r) => engineLabel(r.engine) },
  { header: t("export.status"), key: "statut", type: "text", value: (r) => estimationStatusLabel(r.status) },
];

export async function GET() {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const supabase = supabaseService();
  const { data: rows } = await supabase
    .from("estimation_requests")
    .select("id, inputs, client_output, contact_email, contact_phone, engine, status, created_at")
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(100);

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_estimations" });
  const buffer = await buildExcelWorkbook({
    sheetName: t("export.sheetName"),
    columns: buildColumns(t),
    rows: (rows ?? []) as EstimationExportRow[],
  });

  return excelResponse(buffer, exportListFilename("estimations"));
}
