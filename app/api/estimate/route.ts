import { NextResponse } from "next/server";
import { estimateProperty, type EstimateInput, type EstimateResult } from "@/lib/estimate";
import { fetchLatestInterestRates } from "@/lib/data";
import {
  estimate as estimateEvs,
  type EstimationInputs,
  type EnergyClass,
  type PropertyState,
  type PropertyType,
} from "@/lib/estimation/engine";

/**
 * Mapping EstimateInput (legacy, multi-pays) → EstimationInputs (nouveau moteur EVS LU).
 * Le moteur EVS est utilisé UNIQUEMENT pour country='LU'. Pour les autres pays,
 * on retombe sur l'ancien moteur hédoniste (qui couvre 10 pays).
 */
function mapToEvsInputs(body: EstimateInput): EstimationInputs | null {
  if (body.country !== "LU") return null;
  if (!body.commune || !body.type || !body.state || !body.livingSurface) return null;

  // Mapping types : appartement/maison/penthouse/duplex/villa supportés en EVS.
  // immeuble + terrain : fallback ancien moteur (pas dans EVS V1).
  const t = body.type as string;
  if (!["appartement", "maison", "penthouse", "duplex", "villa"].includes(t))
    return null;

  return {
    type: t as PropertyType,
    commune: body.commune,
    surfaceLiving: Number(body.livingSurface),
    surfaceLand: body.landSurface ? Number(body.landSurface) : undefined,
    bedrooms: body.bedrooms ? Number(body.bedrooms) : undefined,
    yearBuilt: body.year ? Number(body.year) : undefined,
    state: body.state as PropertyState,
    energy: body.energy as EnergyClass | undefined,
    terrace: body.terraceSurface ? Number(body.terraceSurface) : undefined,
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<EstimateInput> & {
    contactEmail?: string;
    contactPhone?: string;
  };

  if (
    !body.country ||
    !body.type ||
    !body.state ||
    !body.livingSurface ||
    Number(body.livingSurface) <= 0
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Tente le moteur EVS pour LU résidentiel.
  const evsInputs = mapToEvsInputs(body as EstimateInput);
  if (evsInputs) {
    try {
      const evs = estimateEvs(evsInputs);
      const pricePerSqm = Math.round(
        evs.internal_output.weighted_price / evsInputs.surfaceLiving,
      );
      // Adapter au format EstimateResult attendu par le tunnel public.
      // financing + helps : volontairement null/[] — déplacés sur /services/capacite-emprunt.
      const result: EstimateResult = {
        range: {
          low: evs.client_output.price_low,
          mid: evs.client_output.price_mid,
          high: evs.client_output.price_high,
        },
        pricePerSqm,
        financing: null,
        helps: [],
      };
      // TODO V2 : si SUPABASE_SERVICE_ROLE_KEY dispo, persister evs.internal_output
      // dans table estimation_requests pour le BO admin (Phase 4).
      return NextResponse.json({
        result,
        rate: null,
        engine: "evs_5_methods",
        confidence: evs.client_output.confidence,
      });
    } catch (err) {
      console.error("[api/estimate] EVS engine failed, fallback legacy:", err);
      // Fallback gracieux : moteur hédoniste legacy.
    }
  }

  // Fallback : moteur hédoniste legacy (multi-pays + immeuble/terrain).
  const rates = await fetchLatestInterestRates();
  const rate =
    rates?.rates?.fixed_25 ??
    rates?.rates?.fixed_20 ??
    rates?.rates?.fixed_30 ??
    3.6;

  const result = estimateProperty(body as EstimateInput, Number(rate));

  return NextResponse.json({ result, rate, engine: "hedonic_legacy" });
}

export const dynamic = "force-dynamic";
