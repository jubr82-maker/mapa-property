// Export Excel de la liste des leads : respecte les memes filtres que
// app/admin/leads/page.tsx (tab/type/status/q), pas seulement la page
// affichee (limit 500, comme la page admin elle-meme).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, toLuxembourgDateTimeCell } from "@/lib/admin/exports/format";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { sourceLabel, workflowLabelKey, type AdminTranslator } from "@/components/admin/WorkflowBadge";

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

// Valeur absente : cellule vide.
const text = (v: string | null | undefined): string => v ?? "";

// Libelle traduit d'une valeur enregistree (cle `${prefix}${valeur}`), sinon la valeur.
function labelOf(t: AdminTranslator, prefix: string, v: string | null | undefined): string {
  if (!v) return "";
  return t.has(`${prefix}${v}`) ? t(`${prefix}${v}`) : v;
}

// En-tetes et libelles traduits (namespaces "admin_leads" et "admin_workflow").
function buildColumns(t: AdminTranslator, tw: AdminTranslator): ExcelColumn<LeadExportRow>[] {
  return [
    { header: tw("col_date"), key: "date", type: "datetime", value: (r) => toLuxembourgDateTimeCell(r.created_at) },
    { header: tw("col_name"), key: "nom", type: "text", value: (r) => [r.first_name, r.last_name].filter(Boolean).join(" ") },
    { header: tw("field_email"), key: "email", type: "text", width: 28, value: (r) => r.email },
    { header: tw("field_phone"), key: "tel", type: "text", value: (r) => text(r.phone) },
    { header: t("field_type"), key: "type", type: "text", value: (r) => labelOf(t, "type_", r.type) },
    { header: t("field_subject"), key: "sujet", type: "text", value: (r) => labelOf(t, "subject_", r.subject) },
    { header: tw("field_source"), key: "source", type: "text", value: (r) => sourceLabel(tw, r.source) },
    { header: tw("field_country"), key: "pays", type: "text", value: (r) => text(r.country) },
    { header: tw("field_city"), key: "ville", type: "text", value: (r) => text(r.city) },
    { header: t("field_property_ref"), key: "bien", type: "text", value: (r) => text(r.property_ref) },
    { header: tw("select_title"), key: "workflow", type: "text", value: (r) => tw(workflowLabelKey(r.workflow_status ?? "new")) },
    { header: tw("followup_title"), key: "suivi", type: "date", value: (r) => toDateOrNull(r.next_follow_up) },
    { header: tw("field_message"), key: "message", type: "longText", value: (r) => text(r.message) },
  ];
}

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

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_leads" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  const buffer = await buildExcelWorkbook({
    sheetName: t("title"),
    columns: buildColumns(t, tw),
    rows: filtered,
  });

  return excelResponse(buffer, exportListFilename("leads"));
}
