// Export PDF de la fiche d'une demande d'accès off-market, sur le
// modèle validé. Aucune photo : cette table ne porte aucune colonne
// image, et la politique OFF MARKET sans visuel s'applique de toute
// façon à l'ensemble du module (cf. commit 38509c1).
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
import { fmtDateShort, fmtDateTimeShort, fmtEuro, fmtSurface, fullName, orDash } from "@/lib/admin/exports/format";
import { workflowStatusLabel, requestStatusLabel } from "@/lib/admin/exports/labels";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

interface HistoryEntry {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
}

interface RequestFull {
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
  criteres_precis: string | null;
  status: string | null;
  notes_admin: string | null;
  workflow_status?: string | null;
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
  properties_offmarket?: {
    reference: string;
    title: string | null;
    city_label: string | null;
  } | null;
}

const FULL_SELECT =
  "id,created_at,property_id,prenom,nom,email,telephone,pays_recherche,ville_quartier,budget_max_eur,surface_souhaitee_m2,criteres_precis,status,notes_admin,workflow_status,admin_notes,next_follow_up,workflow_history,properties_offmarket(reference,title,city_label)";
const FALLBACK_SELECT =
  "id,created_at,property_id,prenom,nom,email,telephone,pays_recherche,ville_quartier,budget_max_eur,surface_souhaitee_m2,criteres_precis,status,notes_admin,properties_offmarket(reference,title,city_label)";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const supabase = supabaseService();

  let row: RequestFull | null = null;
  const tryFull = await supabase
    .from("offmarket_requests")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!tryFull.error) {
    row = tryFull.data as unknown as RequestFull | null;
  } else {
    const fallback = await supabase
      .from("offmarket_requests")
      .select(FALLBACK_SELECT)
      .eq("id", id)
      .maybeSingle();
    row = (fallback.data as unknown as RequestFull | null) ?? null;
  }

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_offmarket" });
  const empty = orDash(null);
  const history: HistoryEntry[] = Array.isArray(row.workflow_history) ? row.workflow_history : [];
  const property = row.properties_offmarket;

  const sections: PdfSection[] = [
    {
      kind: "table",
      heading: t("export.applicant"),
      rows: [
        { label: t("export.name"), value: fullName(row.prenom, row.nom) },
        { label: t("export.email"), value: orDash(row.email) },
        { label: t("export.phone"), value: orDash(row.telephone) },
        { label: t("export.receivedOn"), value: fmtDateTimeShort(row.created_at) },
      ],
    },
    {
      kind: "table",
      heading: t("export.propertySection"),
      rows: [
        { label: t("export.reference"), value: orDash(property?.reference) },
        { label: t("export.title"), value: orDash(property?.title) },
        { label: t("export.town"), value: orDash(property?.city_label) },
      ],
    },
    {
      kind: "table",
      heading: t("export.searchCriteria"),
      rows: [
        { label: t("export.country"), value: orDash(row.pays_recherche) },
        { label: t("export.city"), value: orDash(row.ville_quartier) },
        { label: t("export.budget"), value: fmtEuro(row.budget_max_eur) },
        { label: t("export.surface"), value: row.surface_souhaitee_m2 ? fmtSurface(row.surface_souhaitee_m2) : empty },
        { label: t("export.criteria"), value: orDash(row.criteres_precis) },
      ],
    },
    {
      kind: "table",
      heading: t("export.internalFollowUp"),
      rows: [
        { label: t("export.dossierStatus"), value: requestStatusLabel(row.status) },
        { label: t("export.followStatus"), value: workflowStatusLabel(row.workflow_status) },
        { label: t("export.nextFollowUp"), value: row.next_follow_up ? fmtDateShort(row.next_follow_up) : empty },
        { label: t("export.notes"), value: orDash(row.admin_notes ?? row.notes_admin) },
      ],
    },
  ];

  if (history.length > 0) {
    sections.push({
      kind: "timeline",
      heading: t("export.history"),
      entries: history.map((h) => ({
        date: fmtDateTimeShort(h.at),
        text: [
          h.from && h.to ? `${workflowStatusLabel(h.from)} -> ${workflowStatusLabel(h.to)}` : null,
          h.note ? t("export.historyNote", { note: h.note }) : null,
          h.reason ? t("export.historyReason", { reason: h.reason }) : null,
        ]
          .filter(Boolean)
          .join(" · ") || empty,
      })),
    });
  }

  const buffer = await buildFichePdf({
    documentTitle: t("export.documentTitle"),
    subtitle: property?.reference ? t("export.subtitle", { reference: property.reference }) : undefined,
    reference: `OFFMKT-${row.id.slice(0, 8).toUpperCase()}`,
    kpis: [
      { label: t("export.budget"), value: fmtEuro(row.budget_max_eur) },
      { label: t("export.surface"), value: row.surface_souhaitee_m2 ? fmtSurface(row.surface_souhaitee_m2) : empty },
      { label: t("export.followStatus"), value: workflowStatusLabel(row.workflow_status) },
    ],
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("demande-off-market", row.id));
}
