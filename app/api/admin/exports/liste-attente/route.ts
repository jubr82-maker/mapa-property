// Export Excel de la liste d'attente : memes filtres que
// app/admin/liste-attente/page.tsx (tab/q). Table `leads` filtree
// type='waitlist' (pas une table dediee).
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildExcelWorkbook, type ExcelColumn } from "@/lib/admin/exports/excel";
import { excelResponse, exportListFilename } from "@/lib/admin/exports/http";
import { toDateOrNull } from "@/lib/admin/exports/format";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { sourceLabel, workflowLabelKey, type AdminTranslator } from "@/components/admin/WorkflowBadge";

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

// En-tetes et libelles traduits (namespaces "admin_waitlist" et "admin_workflow").
// Valeur absente : cellule vide.
function buildColumns(t: AdminTranslator, tw: AdminTranslator): ExcelColumn<WaitlistExportRow>[] {
  return [
    { header: tw("col_date"), key: "date", type: "date", value: (r) => toDateOrNull(r.created_at) },
    { header: tw("col_name"), key: "nom", type: "text", value: (r) => [r.first_name, r.last_name].filter(Boolean).join(" ") },
    { header: tw("field_email"), key: "email", type: "text", width: 28, value: (r) => r.email },
    { header: t("budget"), key: "budget", type: "text", value: (r) => extractTag(r.message, "BUDGET") ?? "" },
    { header: t("budget_validated"), key: "budget_valide", type: "text", value: (r) => extractTag(r.message, "BUDGET_VALIDE") ?? "" },
    { header: t("search"), key: "recherche", type: "longText", value: (r) => extractTag(r.message, "RECHERCHE") ?? "" },
    { header: tw("field_source"), key: "source", type: "text", value: (r) => sourceLabel(tw, r.source) },
    { header: tw("select_title"), key: "workflow", type: "text", value: (r) => tw(workflowLabelKey(r.workflow_status ?? "new")) },
    { header: tw("followup_title"), key: "suivi", type: "date", value: (r) => toDateOrNull(r.next_follow_up) },
  ];
}

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

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_waitlist" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  const buffer = await buildExcelWorkbook({
    sheetName: t("title"),
    columns: buildColumns(t, tw),
    rows: filtered,
  });

  return excelResponse(buffer, exportListFilename("liste-attente"));
}
