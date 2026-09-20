// Export Excel de la liste des demandes d'estimation — memes
// donnees/tri que app/admin/estimations/page.tsx (pas de filtre sur
// cette page a ce jour : neq status 'deleted', limit 100).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, orDash } from "@/lib/admin/exports/format";

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

const STATUS_LABEL: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  avis_sent: "Avis envoyé",
  mandate_signed: "Mandat signé",
  closed: "Clos",
};

const COLUMNS: ExcelColumn<EstimationExportRow>[] = [
  { header: "Date", key: "date", format: "date", value: (r) => toDateOrNull(r.created_at) },
  {
    header: "Type de bien",
    key: "type",
    value: (r) => orDash((r.inputs as { type?: string })?.type),
  },
  {
    header: "Commune / pays",
    key: "commune",
    value: (r) => {
      const i = r.inputs as { commune?: string; country?: string };
      return orDash(i?.commune ?? i?.country);
    },
  },
  { header: "Email", key: "email", value: (r) => orDash(r.contact_email), width: 28 },
  { header: "Téléphone", key: "tel", value: (r) => orDash(r.contact_phone) },
  { header: "Estimation basse", key: "low", format: "currency", value: (r) => r.client_output?.price_low ?? null },
  { header: "Estimation médiane", key: "mid", format: "currency", value: (r) => r.client_output?.price_mid ?? null },
  { header: "Estimation haute", key: "high", format: "currency", value: (r) => r.client_output?.price_high ?? null },
  { header: "Confiance", key: "confidence", value: (r) => orDash(r.client_output?.confidence) },
  { header: "Moteur", key: "engine", value: (r) => (r.engine === "evs_5_methods" ? "EVS" : "Hédoniste") },
  { header: "Statut", key: "statut", value: (r) => STATUS_LABEL[r.status] ?? orDash(r.status) },
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
