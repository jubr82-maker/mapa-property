// Export Excel de la liste des mandats — respecte les memes filtres que
// app/admin/mandats/page.tsx (section/tab/q), pas seulement la page
// affichee (limit 500, comme la page admin elle-meme).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, orDash } from "@/lib/admin/exports/format";

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
  { header: "Date", key: "date", format: "date", value: (r) => toDateOrNull(r.created_at) },
  { header: "Client", key: "client", value: (r) => orDash(r.client_name) },
  { header: "Email", key: "email", value: (r) => orDash(r.client_email), width: 28 },
  { header: "Téléphone", key: "tel", value: (r) => orDash(r.client_phone) },
  { header: "Pays", key: "pays", value: (r) => orDash(r.client_country) },
  { header: "Ville", key: "ville", value: (r) => orDash(r.client_city) },
  { header: "Type transaction", key: "transaction", value: (r) => orDash(r.type_transaction) },
  { header: "Type mandat", key: "type_mandat", value: (r) => orDash(r.type_mandat) },
  { header: "Type de bien", key: "type_bien", value: (r) => orDash(r.property_type) },
  { header: "Adresse du bien", key: "adresse", width: 30, value: (r) => orDash(r.bien_adresse) },
  { header: "Prix mise en vente", key: "prix", format: "currency", value: (r) => r.prix_mise_en_vente },
  { header: "Budget min", key: "budget_min", format: "currency", value: (r) => r.budget_min },
  { header: "Budget max", key: "budget_max", format: "currency", value: (r) => r.budget_max },
  { header: "Zones recherchées", key: "zones", width: 28, value: (r) => (r.zones ?? []).join(", ") || "—" },
  { header: "Statut", key: "statut", value: (r) => orDash(r.status) },
  { header: "Statut workflow", key: "workflow", value: (r) => orDash(r.workflow_status ?? "new") },
  { header: "Prochain suivi", key: "suivi", format: "date", value: (r) => toDateOrNull(r.next_follow_up) },
  { header: "Notes", key: "notes", width: 40, value: (r) => orDash(r.notes) },
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

  let filtered = section
    ? mandats.filter((m) => m.type_transaction === section)
    : mandats;
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
