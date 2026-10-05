// Export Excel de la liste des mandats — respecte les memes filtres que
// app/admin/mandats/page.tsx (section/tab/q), pas seulement la page
// affichee (limit 500, comme la page admin elle-meme).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, toLuxembourgDateTimeCell, orDash } from "@/lib/admin/exports/format";
import {
  propertyTypeLabel,
  typeTransactionLabel,
  typeMandatLabel,
  mandatStatusLabel,
  workflowStatusLabel,
} from "@/lib/admin/exports/labels";

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

const COLUMNS: ExcelColumn<MandatExportRow>[] = [
  { header: "Date", key: "date", type: "datetime", value: (r) => toLuxembourgDateTimeCell(r.created_at) },
  { header: "Client", key: "client", type: "text", value: (r) => orDash(r.client_name) },
  { header: "Email", key: "email", type: "text", width: 28, value: (r) => orDash(r.client_email) },
  { header: "Téléphone", key: "tel", type: "text", value: (r) => orDash(r.client_phone) },
  { header: "Pays", key: "pays", type: "text", value: (r) => orDash(r.client_country) },
  { header: "Ville", key: "ville", type: "text", value: (r) => orDash(r.client_city) },
  { header: "Type transaction", key: "transaction", type: "text", value: (r) => typeTransactionLabel(r.type_transaction) },
  { header: "Type mandat", key: "type_mandat", type: "text", value: (r) => typeMandatLabel(r.type_mandat) },
  { header: "Type de bien", key: "type_bien", type: "text", value: (r) => propertyTypeLabel(r.property_type) },
  { header: "Adresse du bien", key: "adresse", type: "text", width: 30, value: (r) => orDash(r.bien_adresse) },
  { header: "Prix mise en vente", key: "prix", type: "amount", value: (r) => r.prix_mise_en_vente },
  { header: "Budget min", key: "budget_min", type: "amount", value: (r) => r.budget_min },
  { header: "Budget max", key: "budget_max", type: "amount", value: (r) => r.budget_max },
  { header: "Zones recherchées", key: "zones", type: "text", width: 28, value: (r) => (r.zones ?? []).join(", ") || "—" },
  { header: "Statut", key: "statut", type: "text", value: (r) => mandatStatusLabel(r.status) },
  { header: "Statut workflow", key: "workflow", type: "text", value: (r) => workflowStatusLabel(r.workflow_status) },
  { header: "Prochain suivi", key: "suivi", type: "date", value: (r) => toDateOrNull(r.next_follow_up) },
  { header: "Notes", key: "notes", type: "longText", value: (r) => orDash(r.notes) },
];

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

  const buffer = await buildExcelWorkbook({
    sheetName: "Mandats",
    columns: COLUMNS,
    rows: filtered,
  });

  return excelResponse(buffer, exportListFilename("mandats"));
}
