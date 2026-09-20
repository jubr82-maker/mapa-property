// Export Excel de la liste des leads — respecte les memes filtres que
// app/admin/leads/page.tsx (tab/type/status/q), pas seulement la page
// affichee (limit 500, comme la page admin elle-meme).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, fullName, orDash } from "@/lib/admin/exports/format";

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
  { header: "Date", key: "date", format: "date", value: (r) => toDateOrNull(r.created_at) },
  { header: "Nom", key: "nom", value: (r) => fullName(r.first_name, r.last_name) },
  { header: "Email", key: "email", value: (r) => r.email, width: 28 },
  { header: "Téléphone", key: "tel", value: (r) => orDash(r.phone) },
  { header: "Type", key: "type", value: (r) => orDash(r.type) },
  { header: "Sujet", key: "sujet", value: (r) => orDash(r.subject) },
  { header: "Source", key: "source", value: (r) => orDash(r.source) },
  { header: "Pays", key: "pays", value: (r) => orDash(r.country) },
  { header: "Ville", key: "ville", value: (r) => orDash(r.city) },
  { header: "Bien référencé", key: "bien", value: (r) => orDash(r.property_ref) },
  { header: "Statut workflow", key: "workflow", value: (r) => orDash(r.workflow_status ?? "new") },
  { header: "Prochain suivi", key: "suivi", format: "date", value: (r) => toDateOrNull(r.next_follow_up) },
  { header: "Message", key: "message", width: 50, value: (r) => orDash(r.message) },
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
