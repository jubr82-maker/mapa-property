// Export Excel de la liste des demandes d'estimation — memes
// donnees/tri que app/admin/estimations/page.tsx (pas de filtre sur
// cette page a ce jour : neq status 'deleted', limit 100).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, orDash } from "@/lib/admin/exports/format";
import { propertyTypeLabel, engineLabel, estimationStatusLabel, confidenceLabel } from "@/lib/admin/exports/labels";

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

const COLUMNS: ExcelColumn<EstimationExportRow>[] = [
  { header: "Date", key: "date", type: "date", value: (r) => toDateOrNull(r.created_at) },
  {
    header: "Type de bien",
    key: "type",
    type: "text",
    value: (r) => propertyTypeLabel((r.inputs as { type?: string })?.type),
  },
  {
    header: "Commune / pays",
    key: "commune",
    type: "text",
    value: (r) => {
      const i = r.inputs as { commune?: string; country?: string };
      return orDash(i?.commune ?? i?.country);
    },
  },
  { header: "Email", key: "email", type: "text", width: 28, value: (r) => orDash(r.contact_email) },
  { header: "Téléphone", key: "tel", type: "text", value: (r) => orDash(r.contact_phone) },
  { header: "Estimation basse", key: "low", type: "amount", value: (r) => r.client_output?.price_low ?? null },
  { header: "Estimation médiane", key: "mid", type: "amount", value: (r) => r.client_output?.price_mid ?? null },
  { header: "Estimation haute", key: "high", type: "amount", value: (r) => r.client_output?.price_high ?? null },
  { header: "Confiance", key: "confidence", type: "text", value: (r) => confidenceLabel(r.client_output?.confidence) },
  { header: "Moteur", key: "engine", type: "text", value: (r) => engineLabel(r.engine) },
  { header: "Statut", key: "statut", type: "text", value: (r) => estimationStatusLabel(r.status) },
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

  const buffer = await buildExcelWorkbook({
    sheetName: "Estimations",
    columns: COLUMNS,
    rows: (rows ?? []) as EstimationExportRow[],
  });

  return excelResponse(buffer, exportListFilename("estimations"));
}
