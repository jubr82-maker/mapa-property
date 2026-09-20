// Export PDF de la fiche d'un lead.
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfFicheSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
import { fmtDateTimeFr, fullName, orDash } from "@/lib/admin/exports/format";

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
}

const FULL_SELECT =
  "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,subject,status,property_ref,notes,workflow_status,admin_notes,next_follow_up";
const FALLBACK_SELECT =
  "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,subject,status,property_ref,notes";

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
    const fallback = await supabase
      .from("leads")
      .select(FALLBACK_SELECT)
      .eq("id", id)
      .maybeSingle();
    row = (fallback.data as LeadFull | null) ?? null;
  }

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const sections: PdfFicheSection[] = [
    {
      heading: "Prospect",
      fields: [
        { label: "Nom", value: fullName(row.first_name, row.last_name) },
        { label: "Email", value: row.email },
        { label: "Téléphone", value: orDash(row.phone) },
        { label: "Pays", value: orDash(row.country) },
        { label: "Ville", value: orDash(row.city) },
      ],
    },
    {
      heading: "Demande",
      fields: [
        { label: "Type", value: orDash(row.type) },
        { label: "Sujet", value: orDash(row.subject) },
        { label: "Source", value: orDash(row.source) },
        { label: "Bien référencé", value: orDash(row.property_ref) },
        { label: "Reçu le", value: fmtDateTimeFr(row.created_at) },
      ],
    },
    {
      heading: "Suivi interne",
      fields: [
        { label: "Statut workflow", value: orDash(row.workflow_status ?? "new") },
        { label: "Prochain suivi", value: orDash(row.next_follow_up) },
        { label: "Notes admin", value: orDash(row.admin_notes ?? row.notes) },
      ],
    },
    {
      heading: "Message",
      fields: [{ label: "", value: orDash(row.message) }],
    },
  ];

  const buffer = await buildFichePdf({
    documentTitle: "Fiche lead",
    reference: fullName(row.first_name, row.last_name) || row.email,
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("lead", row.id));
}
