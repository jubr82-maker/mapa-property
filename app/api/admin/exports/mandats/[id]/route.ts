// Export PDF de la fiche d'un mandat, sur le modèle validé.
// Dates : formatteurs PDF de format.ts (heure de Luxembourg, via
// lib/datetime.ts), construits sans Intl pour rester compatibles avec
// l'encodage des polices PDF.
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
import { fmtDateShort, fmtDateTimeShort, fmtEuro } from "@/lib/admin/exports/format";
import { propertyTypeLabel } from "@/lib/admin/exports/labels";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { workflowLabelKey } from "@/components/admin/WorkflowBadge";

interface HistoryEntry {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
}

interface MandatFull {
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
  bien_type: string | null;
  prix_mise_en_vente: number | null;
  commission: string | null;
  date_debut: string | null;
  date_fin: string | null;
  budget_min: number | null;
  budget_max: number | null;
  zones: string[] | null;
  status: string | null;
  notes: string | null;
  workflow_status?: string | null;
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
}

const FULL_SELECT =
  "id,created_at,client_name,client_email,client_phone,client_country,client_city," +
  "property_type,type_transaction,type_mandat,bien_adresse,bien_type,prix_mise_en_vente," +
  "commission,date_debut,date_fin,budget_min,budget_max,zones,status,notes,workflow_status," +
  "admin_notes,next_follow_up,workflow_history";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const supabase = supabaseService();

  const { data: row } = await supabase.from("mandats").select(FULL_SELECT).eq("id", id).maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const mandat = row as unknown as MandatFull;
  const history: HistoryEntry[] = Array.isArray(mandat.workflow_history) ? mandat.workflow_history : [];
  const isRecherche = mandat.type_transaction === "recherche";
  const montantCle = isRecherche ? mandat.budget_max : mandat.prix_mise_en_vente;

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_mandats" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  const notProvided = tw("not_provided");
  // Valeur absente : libelle traduit "Non renseigne".
  const v = (x: string | null | undefined): string => (x && x.trim() ? x : notProvided);
  const euro = (n: number | null | undefined): string => (n == null ? notProvided : fmtEuro(n));
  const date = (x: string | null | undefined): string => (x ? fmtDateShort(x) : notProvided);
  const labelOf = (prefix: string, x: string | null | undefined): string => {
    if (!x) return notProvided;
    const key = `${prefix}${x.replace(/-/g, "_")}`;
    return t.has(key) ? t(key) : x;
  };
  const status = (x: string | null | undefined): string => tw(workflowLabelKey(x ?? "new"));
  const propertyType = mandat.property_type ?? mandat.bien_type;

  const sections: PdfSection[] = [
    {
      kind: "table",
      heading: t("col_client"),
      rows: [
        { label: tw("col_name"), value: v(mandat.client_name) },
        { label: tw("field_email"), value: v(mandat.client_email) },
        { label: tw("field_phone"), value: v(mandat.client_phone) },
        { label: tw("field_country"), value: v(mandat.client_country) },
        { label: tw("field_city"), value: v(mandat.client_city) },
      ],
    },
    {
      kind: "table",
      heading: t("pdf_section_mandat"),
      rows: [
        { label: t("col_transaction"), value: labelOf("section_", mandat.type_transaction) },
        { label: t("form_type_mandat"), value: labelOf("type_mandat_", mandat.type_mandat) },
        { label: t("form_property_type"), value: propertyType ? propertyTypeLabel(propertyType) : notProvided },
        { label: t("form_address"), value: v(mandat.bien_adresse) },
        { label: t("field_price"), value: euro(mandat.prix_mise_en_vente) },
        { label: t("form_commission"), value: v(mandat.commission) },
        { label: t("form_date_start"), value: date(mandat.date_debut) },
        { label: t("form_date_end"), value: date(mandat.date_fin) },
      ],
    },
    {
      kind: "table",
      heading: t("pdf_section_search"),
      rows: [
        { label: t("col_budget_min"), value: euro(mandat.budget_min) },
        { label: t("col_budget_max"), value: euro(mandat.budget_max) },
        { label: t("field_zones"), value: v((mandat.zones ?? []).join(", ")) },
      ],
    },
    {
      kind: "table",
      heading: tw("internal_title"),
      rows: [
        { label: t("form_status"), value: labelOf("status_", mandat.status) },
        { label: tw("select_title"), value: status(mandat.workflow_status) },
        { label: tw("followup_title"), value: date(mandat.next_follow_up) },
        { label: t("notes_title"), value: v(mandat.admin_notes ?? mandat.notes) },
      ],
    },
  ];

  if (history.length > 0) {
    sections.push({
      kind: "timeline",
      heading: tw("history_heading"),
      entries: history.map((h) => ({
        date: fmtDateTimeShort(h.at),
        text: [
          h.from && h.to ? tw("history_transition", { from: status(h.from), to: status(h.to) }) : null,
          h.note ? tw("history_note", { note: h.note }) : null,
          h.reason ? tw("history_reason", { reason: h.reason }) : null,
        ]
          .filter(Boolean)
          .join(" ; ") || notProvided,
      })),
    });
  }

  const buffer = await buildFichePdf({
    documentTitle: t("pdf_title"),
    subtitle: v(mandat.client_name ?? mandat.client_email),
    reference: `MANDAT-${mandat.id.slice(0, 8).toUpperCase()}`,
    kpis: [
      { label: isRecherche ? t("col_budget_max") : t("pdf_kpi_sale_price"), value: euro(montantCle) },
      { label: t("pdf_kpi_type"), value: labelOf("section_", mandat.type_transaction) },
      { label: t("form_status"), value: labelOf("status_", mandat.status) },
    ],
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("mandat", mandat.id));
}
