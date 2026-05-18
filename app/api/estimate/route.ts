import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { estimateProperty, type EstimateInput, type EstimateResult } from "@/lib/estimate";
import { fetchLatestInterestRates } from "@/lib/data";
import {
  estimate as estimateEvs,
  type EstimationInputs,
  type EnergyClass,
  type PropertyState,
  type PropertyType,
} from "@/lib/estimation/engine";

/** Best-effort persistance dans estimation_requests. Silencieux en cas d'échec. */
async function persistEstimationRequest(args: {
  inputs: unknown;
  client_output: unknown;
  internal_output: unknown;
  engine: string;
  contact_email?: string;
  contact_phone?: string;
  session_id?: string;
  ip_hash?: string;
  locale?: string;
  rgpd_consent_at?: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  const base = {
    inputs: args.inputs,
    client_output: args.client_output,
    internal_output: args.internal_output,
    engine: args.engine,
    contact_email: args.contact_email ?? null,
    contact_phone: args.contact_phone ?? null,
    session_id: args.session_id ?? null,
    ip_hash: args.ip_hash ?? null,
    locale: args.locale ?? null,
  };
  try {
    const supabase = createClient(url, key);
    // Consentement RGPD (BUG 7) : on tente AVEC les colonnes
    // rgpd_consent_at/consent ; si la migration 20260518_rgpd_consent.sql
    // n'est pas encore appliquée (colonne inconnue), on retente SANS
    // (l'audit trail reste persisté). Jamais d'échec bloquant.
    if (args.rgpd_consent_at) {
      const { error } = await supabase.from("estimation_requests").insert({
        ...base,
        consent: true,
        rgpd_consent_at: args.rgpd_consent_at,
      });
      if (!error) return;
      console.warn(
        "[api/estimate] rgpd_consent_at absente — migration à appliquer, persist dégradé:",
        error.message,
      );
    }
    await supabase.from("estimation_requests").insert(base);
  } catch (err) {
    console.error("[api/estimate] persist failed:", err);
  }
}

function hashIp(ip: string): string {
  const salt = process.env.TRACKING_IP_SALT ?? "mapa_default_salt_change_me_2026";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 32);
}

/**
 * Mapping EstimateInput (legacy, multi-pays) → EstimationInputs (nouveau moteur EVS LU).
 * Le moteur EVS est utilisé UNIQUEMENT pour country='LU'. Pour les autres pays,
 * on retombe sur l'ancien moteur hédoniste (qui couvre 10 pays).
 */
function mapToEvsInputs(body: EstimateInput & { quartier?: string }): EstimationInputs | null {
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
    quartier: body.quartier, // 25 quartiers VDL si commune = Luxembourg
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
    quartier?: string;
    contactEmail?: string;
    contactPhone?: string;
    sessionId?: string;
    locale?: string;
    rgpdConsent?: boolean;
  };

  const rgpdConsentAt =
    body.rgpdConsent === true ? new Date().toISOString() : undefined;

  if (
    !body.country ||
    !body.type ||
    !body.state ||
    !body.livingSurface ||
    Number(body.livingSurface) <= 0
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "0.0.0.0";
  const ipHash = hashIp(ip);

  // Tente le moteur EVS pour LU résidentiel.
  const evsInputs = mapToEvsInputs(body as EstimateInput & { quartier?: string });
  if (evsInputs) {
    try {
      const evs = estimateEvs(evsInputs);
      const pricePerSqm = Math.round(
        evs.internal_output.weighted_price / evsInputs.surfaceLiving,
      );
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

      // Persistance audit trail (best-effort)
      void persistEstimationRequest({
        inputs: body,
        client_output: evs.client_output,
        internal_output: evs.internal_output,
        engine: "evs_5_methods",
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone,
        session_id: body.sessionId,
        ip_hash: ipHash,
        locale: body.locale,
        rgpd_consent_at: rgpdConsentAt,
      });

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

  void persistEstimationRequest({
    inputs: body,
    client_output: result.range,
    internal_output: { rate_used: rate, helps: result.helps, financing: result.financing },
    engine: "hedonic_legacy",
    contact_email: body.contactEmail,
    contact_phone: body.contactPhone,
    session_id: body.sessionId,
    ip_hash: ipHash,
    locale: body.locale,
    rgpd_consent_at: rgpdConsentAt,
  });

  return NextResponse.json({ result, rate, engine: "hedonic_legacy" });
}

export const dynamic = "force-dynamic";
