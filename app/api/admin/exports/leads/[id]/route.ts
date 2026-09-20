// Export PDF de la fiche d'un lead — sur le modèle validé (bandeau,
// cartouches, sections, historique, pied de page).
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
import { fmtDateTimeShort, fmtDateShort, fullName, orDash } from "@/lib/admin/exports/format";
import { rawTypeLabel, subjectLabel, sourceLabel, workflowStatusLabel } from "@/lib/admin/exports/labels";

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

  const consent = rgpdConsentAt(row);
  const history: HistoryEntry[] = Array.isArray(row.workflow_history) ? row.workflow_history : [];

  const sections: PdfSection[] = [
    {
      kind: "table",
      heading: "Prospect",
      rows: [
        { label: "Nom", value: fullName(row.first_name, row.last_name) },
        { label: "Email", value: orDash(row.email) },
        { label: "Téléphone", value: orDash(row.phone) },
        { label: "Pays", value: orDash(row.country) },
        { label: "Ville", value: orDash(row.city) },
      ],
    },
    {
      kind: "table",
      heading: "Demande",
      rows: [
        { label: "Type", value: rawTypeLabel(row.type) },
        { label: "Sujet", value: subjectLabel(row.subject) },
        { label: "Source", value: sourceLabel(row.source) },
        { label: "Bien référencé", value: orDash(row.property_ref) },
        { label: "Reçue le", value: fmtDateTimeShort(row.created_at) },
        { label: "Consentement RGPD", value: consent ? `Oui, le ${fmtDateShort(consent)}` : "Non" },
      ],
    },
    {
      kind: "table",
      heading: "Suivi interne",
      rows: [
        { label: "Statut workflow", value: workflowStatusLabel(row.workflow_status) },
        { label: "Prochain suivi", value: row.next_follow_up ? fmtDateShort(row.next_follow_up) : "—" },
        { label: "Notes admin", value: orDash(row.admin_notes ?? row.notes) },
      ],
    },
  ];

  if (history.length > 0) {
    sections.push({
      kind: "timeline",
      heading: "Historique du workflow",
      entries: history.map((h) => ({
        date: fmtDateTimeShort(h.at),
        text: [
          h.from && h.to ? `${workflowStatusLabel(h.from)} -> ${workflowStatusLabel(h.to)}` : null,
          h.note ? `Note : ${h.note}` : null,
          h.reason ? `Motif : ${h.reason}` : null,
        ]
          .filter(Boolean)
          .join(" — ") || "—",
      })),
    });
  }

  sections.push({
    kind: "freetext",
    heading: "Message",
    text: orDash(row.message),
  });

  const buffer = await buildFichePdf({
    documentTitle: "Fiche lead",
    subtitle: fullName(row.first_name, row.last_name) !== "—" ? fullName(row.first_name, row.last_name) : row.email,
    reference: `LEAD-${row.id.slice(0, 8).toUpperCase()}`,
    kpis: [
      { label: "Reçu le", value: fmtDateShort(row.created_at) },
      { label: "Statut", value: workflowStatusLabel(row.workflow_status) },
      { label: "RGPD", value: consent ? "Oui" : "Non" },
    ],
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("lead", row.id));
}
