// Export Excel de la liste des demandes d'acces off-market — memes
// filtres que app/admin/offmarket/requests/page.tsx (tab/q/property).
// Aucune photo/visuel de bien off-market dans cet export (donnees
// tabulaires uniquement, cf. politique OFF MARKET sans visuel).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, fullName, orDash } from "@/lib/admin/exports/format";

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

const COLUMNS: ExcelColumn<RequestExportRow>[] = [
  { header: "Date", key: "date", format: "date", value: (r) => toDateOrNull(r.created_at) },
  { header: "Demandeur", key: "nom", value: (r) => fullName(r.prenom, r.nom) },
  { header: "Email", key: "email", value: (r) => orDash(r.email), width: 28 },
  { header: "Téléphone", key: "tel", value: (r) => orDash(r.telephone) },
  { header: "Référence bien", key: "ref", value: (r) => orDash(r.properties_offmarket?.reference) },
  { header: "Titre bien", key: "titre", width: 28, value: (r) => orDash(r.properties_offmarket?.title) },
  { header: "Pays recherché", key: "pays", value: (r) => orDash(r.pays_recherche) },
  { header: "Ville / quartier", key: "ville", value: (r) => orDash(r.ville_quartier) },
  { header: "Budget max", key: "budget", format: "currency", value: (r) => r.budget_max_eur },
  { header: "Surface souhaitée (m²)", key: "surface", value: (r) => r.surface_souhaitee_m2 },
  { header: "Statut", key: "statut", value: (r) => orDash(r.status) },
  { header: "Statut workflow", key: "workflow", value: (r) => orDash(r.workflow_status ?? "new") },
  { header: "Prochain suivi", key: "suivi", format: "date", value: (r) => toDateOrNull(r.next_follow_up) },
  { header: "Notes admin", key: "notes", width: 40, value: (r) => orDash(r.notes_admin) },
];

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

  const buffer = await buildExcelWorkbook({
    sheetName: "Demandes off-market",
    columns: COLUMNS,
    rows: filtered,
  });

  return excelResponse(buffer, exportListFilename("offmarket-requests"));
}
