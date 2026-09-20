// Export PDF de la fiche d'un mandat — sur le modèle validé.
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
import { fmtDateShort, fmtDateTimeShort, fmtEuro, orDash } from "@/lib/admin/exports/format";
import {
  propertyTypeLabel,
  typeTransactionLabel,
  typeMandatLabel,
  mandatStatusLabel,
  workflowStatusLabel,
} from "@/lib/admin/exports/labels";

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

  const sections: PdfSection[] = [
    {
      kind: "table",
      heading: "Client",
      rows: [
        { label: "Nom", value: orDash(mandat.client_name) },
        { label: "Email", value: orDash(mandat.client_email) },
        { label: "Téléphone", value: orDash(mandat.client_phone) },
        { label: "Pays", value: orDash(mandat.client_country) },
        { label: "Ville", value: orDash(mandat.client_city) },
      ],
    },
    {
      kind: "table",
      heading: "Mandat",
      rows: [
        { label: "Type de transaction", value: typeTransactionLabel(mandat.type_transaction) },
        { label: "Type de mandat", value: typeMandatLabel(mandat.type_mandat) },
        { label: "Type de bien", value: propertyTypeLabel(mandat.property_type ?? mandat.bien_type) },
        { label: "Adresse du bien", value: orDash(mandat.bien_adresse) },
        { label: "Prix mise en vente", value: fmtEuro(mandat.prix_mise_en_vente) },
        { label: "Commission", value: orDash(mandat.commission) },
        { label: "Date de début", value: mandat.date_debut ? fmtDateShort(mandat.date_debut) : "—" },
        { label: "Date de fin", value: mandat.date_fin ? fmtDateShort(mandat.date_fin) : "—" },
      ],
    },
    {
      kind: "table",
      heading: "Recherche (si mandat de recherche)",
      rows: [
        { label: "Budget min", value: fmtEuro(mandat.budget_min) },
        { label: "Budget max", value: fmtEuro(mandat.budget_max) },
        { label: "Zones", value: (mandat.zones ?? []).join(", ") || "—" },
      ],
    },
    {
      kind: "table",
      heading: "Suivi interne",
      rows: [
        { label: "Statut", value: mandatStatusLabel(mandat.status) },
        { label: "Statut workflow", value: workflowStatusLabel(mandat.workflow_status) },
        { label: "Prochain suivi", value: mandat.next_follow_up ? fmtDateShort(mandat.next_follow_up) : "—" },
        { label: "Notes", value: orDash(mandat.admin_notes ?? mandat.notes) },
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

  const buffer = await buildFichePdf({
    documentTitle: "Fiche mandat",
    subtitle: orDash(mandat.client_name ?? mandat.client_email),
    reference: `MANDAT-${mandat.id.slice(0, 8).toUpperCase()}`,
    kpis: [
      { label: isRecherche ? "Budget max" : "Prix de vente", value: fmtEuro(montantCle) },
      { label: "Type", value: typeTransactionLabel(mandat.type_transaction) },
      { label: "Statut", value: mandatStatusLabel(mandat.status) },
    ],
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("mandat", mandat.id));
}
