// Export Excel de la liste des demandes d'acces off-market : memes
// filtres que app/admin/offmarket/requests/page.tsx (tab/q/property).
// Aucune photo/visuel de bien off-market dans cet export (donnees
// tabulaires uniquement, cf. politique OFF MARKET sans visuel).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, fullName, orDash } from "@/lib/admin/exports/format";
import { workflowStatusLabel, requestStatusLabel } from "@/lib/admin/exports/labels";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

interface RequestExportRow {
  id: string;
  created_at: string;
  property_id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  pays_recherche: string | null;
  ville_quartier: string | null;
  budget_max_eur: number | null;
  surface_souhaitee_m2: number | null;
  status: string | null;
  notes_admin: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
  properties_offmarket?: {
    reference: string;
    title: string | null;
  } | null;
}

type ExportT = Awaited<ReturnType<typeof getTranslations>>;

function buildColumns(t: ExportT): ExcelColumn<RequestExportRow>[] {
  return [
    { header: t("export.date"), key: "date", type: "date", value: (r) => toDateOrNull(r.created_at) },
    { header: t("export.applicant"), key: "nom", type: "text", value: (r) => fullName(r.prenom, r.nom) },
    { header: t("export.email"), key: "email", type: "text", width: 28, value: (r) => orDash(r.email) },
    { header: t("export.phone"), key: "tel", type: "text", value: (r) => orDash(r.telephone) },
    { header: t("export.propertyReference"), key: "ref", type: "text", value: (r) => orDash(r.properties_offmarket?.reference) },
    { header: t("export.propertyTitle"), key: "titre", type: "text", width: 28, value: (r) => orDash(r.properties_offmarket?.title) },
    { header: t("export.country"), key: "pays", type: "text", value: (r) => orDash(r.pays_recherche) },
    { header: t("export.city"), key: "ville", type: "text", value: (r) => orDash(r.ville_quartier) },
    { header: t("export.budget"), key: "budget", type: "amount", value: (r) => r.budget_max_eur },
    { header: t("export.surfaceM2"), key: "surface", type: "number", value: (r) => r.surface_souhaitee_m2 },
    { header: t("export.dossierStatus"), key: "statut", type: "text", value: (r) => requestStatusLabel(r.status) },
    { header: t("export.followStatus"), key: "workflow", type: "text", value: (r) => workflowStatusLabel(r.workflow_status) },
    { header: t("export.nextFollowUp"), key: "suivi", type: "date", value: (r) => toDateOrNull(r.next_follow_up) },
    { header: t("export.notes"), key: "notes", type: "longText", value: (r) => orDash(r.notes_admin) },
  ];
}

export async function GET(req: Request) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "all";
  const property = url.searchParams.get("property");
  const q = url.searchParams.get("q");

  const supabase = supabaseService();

  const FULL_SELECT =
    "id,created_at,property_id,prenom,nom,email,telephone,pays_recherche,ville_quartier,budget_max_eur,surface_souhaitee_m2,status,notes_admin,workflow_status,next_follow_up,properties_offmarket!inner(reference,title)";
  const FALLBACK_SELECT =
    "id,created_at,property_id,prenom,nom,email,telephone,pays_recherche,ville_quartier,budget_max_eur,surface_souhaitee_m2,status,notes_admin,properties_offmarket!inner(reference,title)";

  let migrationApplied = true;
  let list: RequestExportRow[] = [];

  const tryNew = await supabase
    .from("offmarket_requests")
    .select(FULL_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (tryNew.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("offmarket_requests")
      .select(FALLBACK_SELECT)
      .order("created_at", { ascending: false })
      .limit(500);
    list = (fallback.data ?? []) as unknown as RequestExportRow[];
  } else {
    list = (tryNew.data ?? []) as unknown as RequestExportRow[];
  }

  let filtered = list;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter((r) => (r.workflow_status ?? "new") === tab);
  }
  if (property) filtered = filtered.filter((r) => r.property_id === property);
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((r) => {
      const hay = `${r.email ?? ""} ${r.prenom ?? ""} ${r.nom ?? ""} ${r.telephone ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_offmarket" });
  const buffer = await buildExcelWorkbook({
    sheetName: t("export.sheetName"),
    columns: buildColumns(t),
    rows: filtered,
  });

  return excelResponse(buffer, exportListFilename("demandes-off-market"));
}
