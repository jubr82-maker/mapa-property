// Export Excel de la liste d'attente — memes filtres que
// app/admin/liste-attente/page.tsx (tab/q). Table `leads` filtree
// type='waitlist' (pas une table dediee).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull, fullName, orDash } from "@/lib/admin/exports/format";
import { workflowStatusLabel } from "@/lib/admin/exports/labels";

interface WaitlistExportRow {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  message: string | null;
  source: string | null;
  status: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
}

function extractTag(message: string | null, tag: string): string | null {
  if (!message) return null;
  const inline = message.match(new RegExp(`\\[${tag}\\][ \\t]+([^\\n]+)`, "i"));
  if (inline) return inline[1].trim();
  const block = message.match(
    new RegExp(`\\[${tag}\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[A-Z_]+\\]|$)`, "i"),
  );
  if (block) return block[1].trim();
  return null;
}

const COLUMNS: ExcelColumn<WaitlistExportRow>[] = [
  { header: "Date", key: "date", type: "date", value: (r) => toDateOrNull(r.created_at) },
  { header: "Nom", key: "nom", type: "text", value: (r) => fullName(r.first_name, r.last_name) },
  { header: "Email", key: "email", type: "text", width: 28, value: (r) => r.email },
  { header: "Budget", key: "budget", type: "text", value: (r) => orDash(extractTag(r.message, "BUDGET")) },
  { header: "Budget validé", key: "budget_valide", type: "text", value: (r) => orDash(extractTag(r.message, "BUDGET_VALIDE")) },
  { header: "Recherche", key: "recherche", type: "longText", value: (r) => orDash(extractTag(r.message, "RECHERCHE")) },
  { header: "Source", key: "source", type: "text", value: (r) => orDash(r.source) },
  { header: "Statut workflow", key: "workflow", type: "text", value: (r) => workflowStatusLabel(r.workflow_status) },
  { header: "Prochain suivi", key: "suivi", type: "date", value: (r) => toDateOrNull(r.next_follow_up) },
];

export async function GET(req: Request) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "all";
  const q = url.searchParams.get("q");

  const supabase = supabaseService();

  let migrationApplied = true;
  let rows: WaitlistExportRow[] = [];

  const tryNew = await supabase
    .from("leads")
    .select(
      "id,created_at,first_name,last_name,email,message,source,status,workflow_status,next_follow_up",
    )
    .eq("type", "waitlist")
    .order("created_at", { ascending: false })
    .limit(500);

  if (tryNew.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("leads")
      .select("id,created_at,first_name,last_name,email,message,source,status")
      .eq("type", "waitlist")
      .order("created_at", { ascending: false })
      .limit(500);
    rows = (fallback.data ?? []) as WaitlistExportRow[];
  } else {
    rows = (tryNew.data ?? []) as WaitlistExportRow[];
  }

  let filtered = rows;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter((r) => (r.workflow_status ?? "new") === tab);
  }
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter((r) =>
      `${r.email} ${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase().includes(needle),
    );
  }

  const buffer = await buildExcelWorkbook({
    sheetName: "Liste d'attente",
    columns: COLUMNS,
    rows: filtered,
  });

  return excelResponse(buffer, exportListFilename("liste-attente"));
}
