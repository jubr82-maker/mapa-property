// Export Excel de la liste des leads — respecte les memes filtres que
// app/admin/leads/page.tsx (tab/type/status/q), pas seulement la page
// affichee (limit 500, comme la page admin elle-meme).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, fullName, orDash } from "@/lib/admin/exports/format";
import { rawTypeLabel, subjectLabel, sourceLabel, workflowStatusLabel } from "@/lib/admin/exports/labels";

interface LeadExportRow {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  type: string | null;
  source: string | null;
  country: string | null;
  city: string | null;
  message: string | null;
  status: string | null;
  property_ref: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
  subject?: string | null;
}

const COLUMNS: ExcelColumn<LeadExportRow>[] = [
  { header: "Date", key: "date", type: "date", value: (r) => toDateOrNull(r.created_at) },
  { header: "Nom", key: "nom", type: "text", value: (r) => fullName(r.first_name, r.last_name) },
  { header: "Email", key: "email", type: "text", width: 28, value: (r) => r.email },
  { header: "Téléphone", key: "tel", type: "text", value: (r) => orDash(r.phone) },
  { header: "Type", key: "type", type: "text", value: (r) => rawTypeLabel(r.type) },
  { header: "Sujet", key: "sujet", type: "text", value: (r) => subjectLabel(r.subject) },
  { header: "Source", key: "source", type: "text", value: (r) => sourceLabel(r.source) },
  { header: "Pays", key: "pays", type: "text", value: (r) => orDash(r.country) },
  { header: "Ville", key: "ville", type: "text", value: (r) => orDash(r.city) },
  { header: "Bien référencé", key: "bien", type: "text", value: (r) => orDash(r.property_ref) },
  { header: "Statut workflow", key: "workflow", type: "text", value: (r) => workflowStatusLabel(r.workflow_status) },
  { header: "Prochain suivi", key: "suivi", type: "date", value: (r) => toDateOrNull(r.next_follow_up) },
  { header: "Message", key: "message", type: "longText", value: (r) => orDash(r.message) },
];

export async function GET(req: Request) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "all";
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");

  const supabase = supabaseService();

  let migrationApplied = true;
  let leads: LeadExportRow[] = [];

  const tryC3 = await supabase
    .from("leads")
    .select(
      "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,status,property_ref,workflow_status,next_follow_up,subject",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (!tryC3.error) {
    leads = (tryC3.data ?? []) as LeadExportRow[];
  } else {
    migrationApplied = false;
    const fallback = await supabase
      .from("leads")
      .select(
        "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,status,property_ref",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    leads = (fallback.data ?? []) as LeadExportRow[];
  }

  let filtered = leads;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter((l) => (l.workflow_status ?? "new") === tab);
  }
  if (type) filtered = filtered.filter((l) => l.type === type);
  if (status) filtered = filtered.filter((l) => l.status === status);
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((l) => {
      const hay = `${l.email} ${l.first_name ?? ""} ${l.last_name ?? ""} ${l.phone ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  const buffer = await buildExcelWorkbook({
    sheetName: "Leads",
    columns: COLUMNS,
    rows: filtered,
  });

  return excelResponse(buffer, exportListFilename("leads"));
}
