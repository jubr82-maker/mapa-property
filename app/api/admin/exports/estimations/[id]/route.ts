// Export PDF de la fiche d'une estimation (Avis de Valeur interne) — sur
// le modèle validé.
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { buildFichePdf, type PdfSection } from "@/lib/admin/exports/pdf";
import { pdfResponse, exportFicheFilename } from "@/lib/admin/exports/http";
import { fmtDateTimeShort, fmtEuro, fmtSurface, orDash } from "@/lib/admin/exports/format";
import {
  etatLabel,
  engineLabel,
  estimationStatusLabel,
  methodLabel,
  confidenceLabel,
  propertyTypeLabel,
} from "@/lib/admin/exports/labels";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  const supabase = supabaseService();

  const { data: row } = await supabase.from("estimation_requests").select("*").eq("id", id).maybeSingle();
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

  const sections: PdfSection[] = [
    {
      kind: "table",
      heading: "Prospect",
      rows: [
        { label: "Nom", value: orDash(est.contact_name) },
        { label: "Email", value: orDash(est.contact_email) },
        { label: "Téléphone", value: orDash(est.contact_phone) },
        { label: "Reçue le", value: fmtDateTimeShort(est.created_at) },
      ],
    },
    {
      kind: "table",
      heading: "Bien estimé",
      rows: [
        { label: "Type", value: propertyTypeLabel(inputs.type) },
        { label: "Commune / pays", value: orDash(inputs.commune ?? inputs.country) },
        {
          label: "Surface habitable",
          value: inputs.livingSurface ? fmtSurface(Number(inputs.livingSurface)) : "—",
        },
        { label: "État", value: etatLabel(inputs.state) },
        { label: "Classe énergie", value: orDash(inputs.energy) },
      ],
    },
    {
      kind: "table",
      heading: "Estimation (fourchette client)",
      rows: [
        { label: "Basse", value: fmtEuro(est.client_output?.price_low) },
        { label: "Médiane", value: fmtEuro(est.client_output?.price_mid) },
        { label: "Haute", value: fmtEuro(est.client_output?.price_high) },
        { label: "Confiance", value: confidenceLabel(est.client_output?.confidence) },
        { label: "Moteur", value: engineLabel(est.engine) },
      ],
    },
    {
      kind: "table",
      heading: "Suivi interne",
      rows: [
        { label: "Statut", value: estimationStatusLabel(est.status) },
        { label: "Notes", value: orDash(est.notes) },
      ],
    },
  ];

  const methodEntries = Object.entries(methods).filter(([, m]) => m.applicable);
  if (methodEntries.length > 0) {
    sections.splice(3, 0, {
      kind: "table",
      heading: "Détail des méthodes (usage interne)",
      rows: methodEntries.map(([key, m]) => ({
        label: methodLabel(key),
        value: fmtEuro(m.price),
      })),
    });
  }

  const buffer = await buildFichePdf({
    documentTitle: "Fiche estimation",
    subtitle: orDash(inputs.commune ?? inputs.country),
    reference: `ESTIM-${est.id.slice(0, 8).toUpperCase()}`,
    kpis: [
      { label: "Estimation médiane", value: fmtEuro(est.client_output?.price_mid) },
      {
        label: "Fourchette",
        value: `${fmtEuro(est.client_output?.price_low)} – ${fmtEuro(est.client_output?.price_high)}`,
      },
      { label: "Confiance", value: confidenceLabel(est.client_output?.confidence) },
    ],
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("estimation", est.id));
}
