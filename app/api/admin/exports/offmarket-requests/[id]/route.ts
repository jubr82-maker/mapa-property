// Export PDF de la fiche d'une demande d'accès off-market — sur le
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

  const history: HistoryEntry[] = Array.isArray(row.workflow_history) ? row.workflow_history : [];
  const property = row.properties_offmarket;

  const sections: PdfSection[] = [
    {
      kind: "table",
      heading: "Demandeur",
      rows: [
        { label: "Nom", value: fullName(row.prenom, row.nom) },
        { label: "Email", value: orDash(row.email) },
        { label: "Téléphone", value: orDash(row.telephone) },
        { label: "Reçue le", value: fmtDateTimeShort(row.created_at) },
      ],
    },
    {
      kind: "table",
      heading: "Bien off-market concerné",
      rows: [
        { label: "Référence", value: orDash(property?.reference) },
        { label: "Titre", value: orDash(property?.title) },
        { label: "Ville", value: orDash(property?.city_label) },
      ],
    },
    {
      kind: "table",
      heading: "Critères de recherche",
      rows: [
        { label: "Pays recherché", value: orDash(row.pays_recherche) },
        { label: "Ville / quartier", value: orDash(row.ville_quartier) },
        { label: "Budget max", value: fmtEuro(row.budget_max_eur) },
        { label: "Surface souhaitée", value: row.surface_souhaitee_m2 ? fmtSurface(row.surface_souhaitee_m2) : "—" },
        { label: "Critères précis", value: orDash(row.criteres_precis) },
      ],
    },
    {
      kind: "table",
      heading: "Suivi interne",
      rows: [
        { label: "Statut", value: requestStatusLabel(row.status) },
        { label: "Statut workflow", value: workflowStatusLabel(row.workflow_status) },
        { label: "Prochain suivi", value: row.next_follow_up ? fmtDateShort(row.next_follow_up) : "—" },
        { label: "Notes admin", value: orDash(row.admin_notes ?? row.notes_admin) },
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
    documentTitle: "Fiche demande off-market",
    subtitle: property?.reference ? `Bien ${property.reference}` : undefined,
    reference: `OFFMKT-${row.id.slice(0, 8).toUpperCase()}`,
    kpis: [
      { label: "Budget max", value: fmtEuro(row.budget_max_eur) },
      { label: "Surface", value: row.surface_souhaitee_m2 ? fmtSurface(row.surface_souhaitee_m2) : "—" },
      { label: "Statut", value: workflowStatusLabel(row.workflow_status) },
    ],
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("offmarket-demande", row.id));
}
