// Export Excel de la liste des mandats : respecte les memes filtres que
// app/admin/mandats/page.tsx (section/tab/q), pas seulement la page
// affichee (limit 500, comme la page admin elle-meme).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, toLuxembourgDateTimeCell } from "@/lib/admin/exports/format";
import { propertyTypeLabel } from "@/lib/admin/exports/labels";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { workflowLabelKey, type AdminTranslator } from "@/components/admin/WorkflowBadge";

interface MandatExportRow {
  id: string;
  created_at: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_country: string | null;
  client_city: string | null;
  property_type: string | null;
  type_transaction: string;
  type_mandat: string | null;
  bien_adresse: string | null;
  prix_mise_en_vente: number | null;
  budget_min: number | null;
  budget_max: number | null;
  zones: string[] | null;
  status: string | null;
  notes: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
}

// Valeur absente : cellule vide.
const text = (v: string | null | undefined): string => v ?? "";

// Libelle traduit d'une valeur enregistree ("semi-exclusif" -> cle "..._semi_exclusif").
function labelOf(t: AdminTranslator, prefix: string, v: string | null | undefined): string {
  if (!v) return "";
  const key = `${prefix}${v.replace(/-/g, "_")}`;
  return t.has(key) ? t(key) : v;
}

// En-tetes et libelles traduits (namespaces "admin_mandats" et "admin_workflow").
function buildColumns(t: AdminTranslator, tw: AdminTranslator): ExcelColumn<MandatExportRow>[] {
  return [
    { header: tw("col_date"), key: "date", type: "datetime", value: (r) => toLuxembourgDateTimeCell(r.created_at) },
    { header: t("col_client"), key: "client", type: "text", value: (r) => text(r.client_name) },
    { header: tw("field_email"), key: "email", type: "text", width: 28, value: (r) => text(r.client_email) },
    { header: tw("field_phone"), key: "tel", type: "text", value: (r) => text(r.client_phone) },
    { header: tw("field_country"), key: "pays", type: "text", value: (r) => text(r.client_country) },
    { header: tw("field_city"), key: "ville", type: "text", value: (r) => text(r.client_city) },
    { header: t("col_transaction"), key: "transaction", type: "text", value: (r) => labelOf(t, "section_", r.type_transaction) },
    { header: t("form_type_mandat"), key: "type_mandat", type: "text", value: (r) => labelOf(t, "type_mandat_", r.type_mandat) },
    { header: t("form_property_type"), key: "type_bien", type: "text", value: (r) => (r.property_type ? propertyTypeLabel(r.property_type) : "") },
    { header: t("form_address"), key: "adresse", type: "text", width: 30, value: (r) => text(r.bien_adresse) },
    { header: t("field_price"), key: "prix", type: "amount", value: (r) => r.prix_mise_en_vente },
    { header: t("col_budget_min"), key: "budget_min", type: "amount", value: (r) => r.budget_min },
    { header: t("col_budget_max"), key: "budget_max", type: "amount", value: (r) => r.budget_max },
    { header: t("col_zones"), key: "zones", type: "text", width: 28, value: (r) => (r.zones ?? []).join(", ") },
    { header: t("form_status"), key: "statut", type: "text", value: (r) => labelOf(t, "status_", r.status) },
    { header: tw("select_title"), key: "workflow", type: "text", value: (r) => tw(workflowLabelKey(r.workflow_status ?? "new")) },
    { header: tw("followup_title"), key: "suivi", type: "date", value: (r) => toDateOrNull(r.next_follow_up) },
    { header: t("notes_title"), key: "notes", type: "longText", value: (r) => text(r.notes) },
  ];
}

export async function GET(req: Request) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const url = new URL(req.url);
  const section = ["vente", "recherche", "location"].includes(
    url.searchParams.get("section") ?? "",
  )
    ? (url.searchParams.get("section") as "vente" | "recherche" | "location")
    : null;
  const tab = url.searchParams.get("tab") ?? "all";
  const q = url.searchParams.get("q");

  const supabase = supabaseService();

  const fullSelect =
    "id,created_at,client_name,client_email,client_phone,client_country,client_city," +
    "property_type,type_transaction,type_mandat,bien_adresse,prix_mise_en_vente," +
    "budget_min,budget_max,zones,status,notes,workflow_status,next_follow_up";
  const fallbackSelect =
    "id,created_at,client_name,client_email,client_phone,client_country,client_city," +
    "property_type,type_transaction,type_mandat,bien_adresse,prix_mise_en_vente," +
    "budget_min,budget_max,zones,status,notes";

  let migrationApplied = true;
  let mandats: MandatExportRow[] = [];

  const tryNew = await supabase
    .from("mandats")
    .select(fullSelect)
    .order("created_at", { ascending: false })
    .limit(500);

  if (tryNew.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("mandats")
      .select(fallbackSelect)
      .order("created_at", { ascending: false })
      .limit(500);
    mandats = (fallback.data ?? []) as unknown as MandatExportRow[];
  } else {
    mandats = (tryNew.data ?? []) as unknown as MandatExportRow[];
  }

  let filtered = section ? mandats.filter((m) => m.type_transaction === section) : mandats;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter((m) => (m.workflow_status ?? "new") === tab);
  }
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((m) => {
      const hay =
        `${m.client_email ?? ""} ${m.client_name ?? ""} ${m.client_phone ?? ""} ${m.client_city ?? ""} ${m.bien_adresse ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_mandats" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  const buffer = await buildExcelWorkbook({
    sheetName: t("title"),
    columns: buildColumns(t, tw),
    rows: filtered,
  });

  return excelResponse(buffer, exportListFilename("mandats"));
}
