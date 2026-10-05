// Export PDF de la fiche d'une estimation (Avis de Valeur interne), sur
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
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

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
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_estimations" });
  const empty = orDash(null);

  const sections: PdfSection[] = [
    {
      kind: "table",
      heading: t("export.prospect"),
      rows: [
        { label: t("export.name"), value: orDash(est.contact_name) },
        { label: t("export.email"), value: orDash(est.contact_email) },
        { label: t("export.phone"), value: orDash(est.contact_phone) },
        { label: t("export.receivedOn"), value: fmtDateTimeShort(est.created_at) },
      ],
    },
    {
      kind: "table",
      heading: t("export.property"),
      rows: [
        { label: t("export.type"), value: propertyTypeLabel(inputs.type) },
        { label: t("export.location"), value: orDash(inputs.commune ?? inputs.country) },
        {
          label: t("export.livingSurface"),
          value: inputs.livingSurface ? fmtSurface(Number(inputs.livingSurface)) : empty,
        },
        { label: t("export.state"), value: etatLabel(inputs.state) },
        { label: t("export.energy"), value: orDash(inputs.energy) },
      ],
    },
    {
      kind: "table",
      heading: t("export.clientRange"),
      rows: [
        { label: t("export.lowShort"), value: fmtEuro(est.client_output?.price_low) },
        { label: t("export.midShort"), value: fmtEuro(est.client_output?.price_mid) },
        { label: t("export.highShort"), value: fmtEuro(est.client_output?.price_high) },
        { label: t("export.confidence"), value: confidenceLabel(est.client_output?.confidence) },
        { label: t("export.engine"), value: engineLabel(est.engine) },
      ],
    },
    {
      kind: "table",
      heading: t("export.internalFollowUp"),
      rows: [
        { label: t("export.status"), value: estimationStatusLabel(est.status) },
        { label: t("export.notes"), value: orDash(est.notes) },
      ],
    },
  ];

  const methodEntries = Object.entries(methods).filter(([, m]) => m.applicable);
  if (methodEntries.length > 0) {
    sections.splice(3, 0, {
      kind: "table",
      heading: t("export.methods"),
      rows: methodEntries.map(([key, m]) => ({
        label: methodLabel(key),
        value: fmtEuro(m.price),
      })),
    });
  }

  const buffer = await buildFichePdf({
    documentTitle: t("export.documentTitle"),
    subtitle: orDash(inputs.commune ?? inputs.country),
    reference: `ESTIM-${est.id.slice(0, 8).toUpperCase()}`,
    kpis: [
      { label: t("export.mid"), value: fmtEuro(est.client_output?.price_mid) },
      {
        label: t("export.range"),
        value: t("range", {
          low: fmtEuro(est.client_output?.price_low),
          high: fmtEuro(est.client_output?.price_high),
        }),
      },
      { label: t("export.confidence"), value: confidenceLabel(est.client_output?.confidence) },
    ],
    sections,
  });

  return pdfResponse(buffer, exportFicheFilename("estimation", est.id));
}
