// Export PDF de la fiche d'un mandat.
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfFicheSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
import { fmtDateFr, fmtEuro, orDash } from "@/lib/admin/exports/format";

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
}

const FULL_SELECT =
  "id,created_at,client_name,client_email,client_phone,client_country,client_city," +
  "property_type,type_transaction,type_mandat,bien_adresse,bien_type,prix_mise_en_vente," +
  "commission,date_debut,date_fin,budget_min,budget_max,zones,status,notes,workflow_status," +
  "admin_notes,next_follow_up";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const supabase = supabaseService();

  const { data: row } = await supabase
    .from("mandats")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const mandat = row as unknown as MandatFull;

  const sections: PdfFicheSection[] = [
    {
      heading: "Client",
      fields: [
        { label: "Nom", value: orDash(mandat.client_name) },
        { label: "Email", value: orDash(mandat.client_email) },
        { label: "Téléphone", value: orDash(mandat.client_phone) },
        { label: "Pays", value: orDash(mandat.client_country) },
        { label: "Ville", value: orDash(mandat.client_city) },
      ],
    },
    {
      heading: "Mandat",
      fields: [
        { label: "Type de transaction", value: orDash(mandat.type_transaction) },
        { label: "Type de mandat", value: orDash(mandat.type_mandat) },
        { label: "Type de bien", value: orDash(mandat.property_type ?? mandat.bien_type) },
        { label: "Adresse du bien", value: orDash(mandat.bien_adresse) },
        { label: "Prix mise en vente", value: fmtEuro(mandat.prix_mise_en_vente) },
        { label: "Commission", value: orDash(mandat.commission) },
        { label: "Date de début", value: fmtDateFr(mandat.date_debut) },
        { label: "Date de fin", value: fmtDateFr(mandat.date_fin) },
      ],
    },
    {
      heading: "Recherche (si mandat de recherche)",
      fields: [
        { label: "Budget min", value: fmtEuro(mandat.budget_min) },
        { label: "Budget max", value: fmtEuro(mandat.budget_max) },
        { label: "Zones", value: (mandat.zones ?? []).join(", ") || "—" },
      ],
    },
    {
      heading: "Suivi interne",
      fields: [
        { label: "Statut", value: orDash(mandat.status) },
        { label: "Statut workflow", value: orDash(mandat.workflow_status ?? "new") },
        { label: "Prochain suivi", value: fmtDateFr(mandat.next_follow_up) },
        { label: "Notes", value: orDash(mandat.admin_notes ?? mandat.notes) },
      ],
    },
  ];

  const buffer = await buildFichePdf({
    documentTitle: "Fiche mandat",
    reference: orDash(mandat.client_name ?? mandat.client_email),
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("mandat", mandat.id));
}
