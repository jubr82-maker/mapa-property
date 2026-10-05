// Export PDF de la fiche d'un lead, sur le modèle validé (bandeau,
// cartouches, sections, historique, pied de page).
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
// Dates : formatteurs PDF de format.ts (heure de Luxembourg, via
// lib/datetime.ts), construits sans Intl pour rester compatibles avec
// l'encodage des polices PDF.
import { fmtDateTimeShort, fmtDateShort } from "@/lib/admin/exports/format";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { sourceLabel, workflowLabelKey } from "@/components/admin/WorkflowBadge";

interface HistoryEntry {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
}

interface LeadFull {
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
  subject: string | null;
  status: string | null;
  property_ref: string | null;
  notes: string | null;
  workflow_status?: string | null;
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
  rgpd_consent_at?: string | null;
}

const FULL_SELECT =
  "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,subject,status,property_ref,notes,workflow_status,admin_notes,next_follow_up,workflow_history,rgpd_consent_at";
const FALLBACK_SELECT =
  "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,subject,status,property_ref,notes";

function rgpdConsentAt(l: { rgpd_consent_at?: string | null; message: string | null }): string | null {
  if (l.rgpd_consent_at) return l.rgpd_consent_at;
  const m = l.message?.match(/\[RGPD\]\s*consentement accordé le\s*(\S+)/i);
  return m ? m[1] : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const supabase = supabaseService();

  let row: LeadFull | null = null;
  const tryFull = await supabase.from("leads").select(FULL_SELECT).eq("id", id).maybeSingle();
  if (!tryFull.error) {
    row = tryFull.data as LeadFull | null;
  } else {
    const fallback = await supabase.from("leads").select(FALLBACK_SELECT).eq("id", id).maybeSingle();
    row = (fallback.data as LeadFull | null) ?? null;
  }

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_leads" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  const notProvided = tw("not_provided");
  // Valeur absente : libelle traduit "Non renseigne".
  const v = (x: string | null | undefined): string => (x && x.trim() ? x : notProvided);
  const labelOf = (prefix: string, x: string | null | undefined): string =>
    !x ? notProvided : t.has(`${prefix}${x}`) ? t(`${prefix}${x}`) : x;
  const status = (x: string | null | undefined): string => tw(workflowLabelKey(x ?? "new"));
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ");

  const consent = rgpdConsentAt(row);
  const history: HistoryEntry[] = Array.isArray(row.workflow_history) ? row.workflow_history : [];

  const sections: PdfSection[] = [
    {
      kind: "table",
      heading: t("pdf_section_prospect"),
      rows: [
        { label: tw("col_name"), value: v(name) },
        { label: tw("field_email"), value: v(row.email) },
        { label: tw("field_phone"), value: v(row.phone) },
        { label: tw("field_country"), value: v(row.country) },
        { label: tw("field_city"), value: v(row.city) },
      ],
    },
    {
      kind: "table",
      heading: t("pdf_section_request"),
      rows: [
        { label: t("field_type"), value: labelOf("type_", row.type) },
        { label: t("field_subject"), value: labelOf("subject_", row.subject) },
        { label: tw("field_source"), value: v(sourceLabel(tw, row.source)) },
        { label: t("field_property_ref"), value: v(row.property_ref) },
        { label: t("pdf_received_on"), value: fmtDateTimeShort(row.created_at) },
        { label: t("pdf_rgpd_consent"), value: consent ? tw("yes_on", { date: fmtDateShort(consent) }) : tw("no") },
      ],
    },
    {
      kind: "table",
      heading: tw("internal_title"),
      rows: [
        { label: tw("select_title"), value: status(row.workflow_status) },
        { label: tw("followup_title"), value: row.next_follow_up ? fmtDateShort(row.next_follow_up) : notProvided },
        { label: tw("internal_notes"), value: v(row.admin_notes ?? row.notes) },
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

  sections.push({
    kind: "freetext",
    heading: tw("field_message"),
    text: v(row.message),
  });

  const buffer = await buildFichePdf({
    documentTitle: t("pdf_title"),
    subtitle: name || row.email,
    reference: `LEAD-${row.id.slice(0, 8).toUpperCase()}`,
    kpis: [
      { label: t("pdf_received_on"), value: fmtDateShort(row.created_at) },
      { label: tw("col_status"), value: status(row.workflow_status) },
      { label: t("pdf_rgpd"), value: consent ? tw("yes") : tw("no") },
    ],
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("lead", row.id));
}
