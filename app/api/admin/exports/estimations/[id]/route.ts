// Export PDF de la fiche d'une estimation (Avis de Valeur interne).
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfFicheSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
import { fmtDateTimeFr, fmtEuro, orDash } from "@/lib/admin/exports/format";

interface EstimationFull {
  id: string;
  inputs: Record<string, unknown>;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  client_output: {
    price_low: number;
    price_mid: number;
    price_high: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  } | null;
  internal_output: {
    methods?: Record<string, { applicable: boolean; price: number | null }>;
    inputs_snapshot?: Record<string, unknown>;
  } | null;
  engine: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const METHOD_LABEL: Record<string, string> = {
  observatoire: "Référentiel MAPA (calibré)",
  sales_comparison: "Comparaison directe",
  hedonic: "Hédoniste enrichi",
  income_capitalization: "Capitalisation locative",
  depreciated_replacement: "Coût de remplacement",
  statec_reference: "STATEC référentiel",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  avis_sent: "Avis envoyé",
  mandate_signed: "Mandat signé",
  closed: "Clos",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const supabase = supabaseService();

  const { data: row } = await supabase
    .from("estimation_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const est = row as unknown as EstimationFull;
  const inputs = (est.internal_output?.inputs_snapshot ?? est.inputs ?? {}) as {
    type?: string;
    commune?: string;
    country?: string;
    livingSurface?: number | string;
    state?: string;
    energy?: string;
  };
  const methods = est.internal_output?.methods ?? {};

  const sections: PdfFicheSection[] = [
    {
      heading: "Prospect",
      fields: [
        { label: "Nom", value: orDash(est.contact_name) },
        { label: "Email", value: orDash(est.contact_email) },
        { label: "Téléphone", value: orDash(est.contact_phone) },
        { label: "Reçue le", value: fmtDateTimeFr(est.created_at) },
      ],
    },
    {
      heading: "Bien estimé",
      fields: [
        { label: "Type", value: orDash(inputs.type) },
        { label: "Commune / pays", value: orDash(inputs.commune ?? inputs.country) },
        { label: "Surface habitable", value: inputs.livingSurface ? `${inputs.livingSurface} m²` : "—" },
        { label: "État", value: orDash(inputs.state) },
        { label: "Classe énergie", value: orDash(inputs.energy) },
      ],
    },
    {
      heading: "Estimation (fourchette client)",
      fields: [
        { label: "Basse", value: fmtEuro(est.client_output?.price_low) },
        { label: "Médiane", value: fmtEuro(est.client_output?.price_mid) },
        { label: "Haute", value: fmtEuro(est.client_output?.price_high) },
        { label: "Confiance", value: orDash(est.client_output?.confidence) },
        { label: "Moteur", value: est.engine === "evs_5_methods" ? "EVS 5 méthodes" : "Hédoniste legacy" },
      ],
    },
    {
      heading: "Suivi interne",
      fields: [
        { label: "Statut", value: STATUS_LABEL[est.status] ?? orDash(est.status) },
        { label: "Notes", value: orDash(est.notes) },
      ],
    },
  ];

  const methodEntries = Object.entries(methods).filter(([, m]) => m.applicable);
  if (methodEntries.length > 0) {
    sections.splice(3, 0, {
      heading: "Détail des méthodes (usage interne)",
      fields: methodEntries.map(([key, m]) => ({
        label: METHOD_LABEL[key] ?? key,
        value: fmtEuro(m.price),
      })),
    });
  }

  const buffer = await buildFichePdf({
    documentTitle: "Fiche estimation",
    reference: `Estimation #${est.id.slice(0, 8)}`,
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("estimation", est.id));
}
