import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { estimateProperty, type EstimateInput, type EstimateResult } from "@/lib/estimate";
import { fetchLatestInterestRates } from "@/lib/data";
import { shouldDropTestLead } from "@/lib/test-email";
import { sendEstimationEmails } from "@/lib/email/estimation-emails";
import {
  estimate as estimateEvs,
  isCountryNotCoveredError,
  type EstimationInputs,
  type EnergyClass,
  type PropertyState,
  type PropertyType,
  type WorkItem,
  type WorkCategory,
} from "@/lib/estimation/engine";

const WORK_CATEGORIES: ReadonlySet<string> = new Set([
  "toiture",
  "facade_isolation",
  "pac",
  "chauffage",
  "photovoltaique",
  "electricite",
  "menuiseries",
  "cuisine",
  "salle_de_bain",
  "peinture",
  "sols_revetements",
  "amenagement_exterieur",
  "piscine",
]);

/** Parse + valide les postes de travaux reçus du formulaire. */
function parseWorks(raw: unknown): WorkItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: WorkItem[] = [];
  for (const r of raw.slice(0, 10)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const category = String(o.category ?? "");
    if (!WORK_CATEGORIES.has(category)) continue;
    const year = Number(o.year);
    const amount = Number(o.amount);
    items.push({
      category: category as WorkCategory,
      year: Number.isFinite(year) ? year : 2024,
      amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    });
  }
  return items.length > 0 ? items : undefined;
}

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
  // Sprint B1 : nouveaux champs lead qualifie (migration 20260523).
  contact_name?: string;
  surface_total?: number;
  works_level?: string;
  message?: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  // BUG T7 : en prod, ne pas persister les estimations de test E2E
  // (le calcul/résultat est tout de même renvoyé à l'appelant).
  if (shouldDropTestLead(args.contact_email)) return;
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
    // Sprint B1 : tentative AVEC les nouvelles colonnes. Fallback ci-dessous
    // si la migration 20260523 n'est pas encore appliquee.
    contact_name: args.contact_name ?? null,
    surface_total: args.surface_total ?? null,
    works_level: args.works_level ?? null,
    message: args.message ?? null,
  };
  // Snapshot SANS les nouvelles colonnes B1 (fallback si migration absente).
  const baseLegacy = {
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
        "[api/estimate] insert dégradé (colonnes B1 ou rgpd absentes):",
        error.message,
      );
    }
    // Premier fallback : avec colonnes B1 mais sans RGPD.
    const { error: e2 } = await supabase
      .from("estimation_requests")
      .insert(base);
    if (!e2) return;
    // Second fallback : schema legacy strict (migration B1 non appliquée).
    await supabase.from("estimation_requests").insert(baseLegacy);
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
function mapToEvsInputs(
  body: EstimateInput & {
    quartier?: string;
    parkingInterior?: number;
    parkingExterior?: number;
    works?: unknown;
  },
): EstimationInputs | null {
  if (body.country !== "LU") return null;
  if (!body.commune || !body.type || !body.state || !body.livingSurface) return null;

  // Mapping types : appartement/maison/penthouse/duplex/villa supportés en EVS.
  // immeuble + terrain : fallback ancien moteur (pas dans EVS V1).
  const t = body.type as string;
  if (!["appartement", "maison", "penthouse", "duplex", "villa"].includes(t))
    return null;

  return {
    country: "LU",
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
    parkingInterior:
      body.parkingInterior !== undefined
        ? Number(body.parkingInterior)
        : undefined,
    parkingExterior:
      body.parkingExterior !== undefined
        ? Number(body.parkingExterior)
        : undefined,
    works: parseWorks(body.works),
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
    parkingInterior?: number;
    parkingExterior?: number;
    works?: unknown;
    // Sprint B1 : nouveaux champs lead generator.
    contactName?: string;
    surfaceTotal?: number;
    worksLevel?: string;
    message?: string;
  };

  const rgpdConsentAt =
    body.rgpdConsent === true ? new Date().toISOString() : undefined;

  // BUG T4 : un terrain n'a pas de surface habitable — la surface
  // utile est la surface de terrain. On valide la bonne selon le type.
  const isLand = body.type === "terrain";
  const usefulSurface = isLand
    ? Number(body.landSurface)
    : Number(body.livingSurface);
  if (
    !body.country ||
    !body.type ||
    !body.state ||
    !usefulSurface ||
    usefulSurface <= 0
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "0.0.0.0";
  const ipHash = hashIp(ip);

  // Tente le moteur EVS pour LU résidentiel.
  const evsInputs = mapToEvsInputs(
    body as EstimateInput & {
      quartier?: string;
      parkingInterior?: number;
      parkingExterior?: number;
      works?: unknown;
    },
  );
  if (evsInputs) {
    try {
      const evs = estimateEvs(evsInputs);
      // GARDE LU-ONLY (POL3-6) : le moteur EVS = Luxembourg uniquement.
      // On renvoie le message + un flag pour que le formulaire affiche le
      // CTA « Contactez-nous » — JAMAIS un nombre pour l'international.
      if (isCountryNotCoveredError(evs)) {
        return NextResponse.json(
          {
            error: "COUNTRY_NOT_COVERED",
            message: evs.message,
            engine: "evs_5_methods",
          },
          { status: 422 },
        );
      }
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
        // Sprint B1 : lead qualifie
        contact_name: body.contactName,
        surface_total: typeof body.surfaceTotal === "number" ? body.surfaceTotal : undefined,
        works_level: body.worksLevel,
        message: body.message,
      });

      // Sprint B1 : emails client (confirmation + promesse rapport 24h) +
      // interne (notification lead Julien/Frederic). Best-effort, jamais bloquant.
      void sendEstimationEmails({
        contactEmail: body.contactEmail,
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        message: body.message,
        commune: body.commune,
        type: body.type,
        surfaceLiving:
          typeof body.livingSurface === "number" ? body.livingSurface : undefined,
        range: result.range,
        engine: "evs_5_methods",
        locale: body.locale,
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
    // Sprint B1 : lead qualifie
    contact_name: body.contactName,
    surface_total: typeof body.surfaceTotal === "number" ? body.surfaceTotal : undefined,
    works_level: body.worksLevel,
    message: body.message,
  });

  // Sprint B1 : emails client + interne (cf. branche EVS ci-dessus).
  void sendEstimationEmails({
    contactEmail: body.contactEmail,
    contactName: body.contactName,
    contactPhone: body.contactPhone,
    message: body.message,
    commune: body.commune,
    type: body.type,
    surfaceLiving:
      typeof body.livingSurface === "number" ? body.livingSurface : undefined,
    range: result.range,
    engine: "hedonic_legacy",
    locale: body.locale,
  });

  return NextResponse.json({ result, rate, engine: "hedonic_legacy" });
}

export const dynamic = "force-dynamic";
