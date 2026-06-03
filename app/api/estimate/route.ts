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
import {
  validateFirstName,
  validateLastName,
  validateEmail,
  validatePhone,
} from "@/lib/validators/contact";

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

// Sprint C2 : 13 = nb max de categories engine EVS POL3-6 (1 entry par cat
// max). Year clampe [1900, annee courante + 1] pour empecher des saisies
// aberrantes (utilisateur qui tape 2025 par erreur a la place de 1995
// reste accepte ; mais 99999 est rejete via year_max).
const MAX_WORK_ITEMS = 13;
const WORK_YEAR_MIN = 1900;
const WORK_YEAR_MAX = new Date().getFullYear() + 1;
const WORK_AMOUNT_MAX = 1_000_000;

/** Parse + valide les postes de travaux reçus du formulaire. */
function parseWorks(raw: unknown): WorkItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: WorkItem[] = [];
  const seenCategories = new Set<string>();
  for (const r of raw.slice(0, MAX_WORK_ITEMS)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const category = String(o.category ?? "");
    if (!WORK_CATEGORIES.has(category)) continue;
    // Sprint C2 : pas de doublons categorie (UI envoie 1 entry max par cat).
    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    const year = Number(o.year);
    const amount = Number(o.amount);
    const clampedYear =
      Number.isFinite(year) && year >= WORK_YEAR_MIN && year <= WORK_YEAR_MAX
        ? year
        : 2024;
    const clampedAmount =
      Number.isFinite(amount) && amount > 0 && amount <= WORK_AMOUNT_MAX
        ? amount
        : 0;
    items.push({
      category: category as WorkCategory,
      year: clampedYear,
      amount: clampedAmount,
    });
  }
  return items.length > 0 ? items : undefined;
}

/**
 * Sprint 2 estimations — Lookup donnees marche commune pour la methode
 * capitalisation locative. Lecture seule sur lu_market_prices_by_commune,
 * client Supabase anon (policy public_read).
 *
 * Normalisation : trim + lowercase + tirets -> espaces, cote SQL aussi
 * (lower(replace(commune, '-', ' '))) pour matcher "Esch-sur-Alzette" avec
 * "esch sur alzette" ou "ESCH-SUR-ALZETTE". Si plusieurs trimestres pour
 * la meme commune, on prend le plus recent (ORDER BY trimestre DESC).
 *
 * Best-effort : toute erreur DB -> {null, null}, le moteur fallback dessus.
 * Jamais de throw, jamais de blocage de l'estimation.
 *
 * Conversion : rendement_locatif en base est en POURCENTAGE (ex 3.49) ->
 * on divise par 100 pour fournir le DECIMAL attendu par le moteur (0.0349).
 */
async function fetchRentDataForCommune(
  commune: string,
): Promise<{ rentPerM2Month: number | null; yieldRate: number | null }> {
  const empty = { rentPerM2Month: null, yieldRate: null };
  if (!commune || typeof commune !== "string") return empty;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return empty;
    const sb = createClient(url, key);
    // Recupere toutes les rows segment='global' puis matche cote JS avec
    // la meme normalisation que le moteur (normCommune) — evite la
    // dependance a une fonction SQL custom et reste tolerant aux
    // variations de casse/tirets.
    const norm = commune.trim().toLowerCase().replace(/-/g, " ");
    const { data, error } = await sb
      .from("lu_market_prices_by_commune")
      .select("commune,loyer_median_m2_mensuel,rendement_locatif,trimestre")
      .eq("segment", "global")
      .order("trimestre", { ascending: false });
    if (error || !data) return empty;
    const row = (data as Array<{
      commune: string;
      loyer_median_m2_mensuel: number | null;
      rendement_locatif: number | null;
      trimestre: string;
    }>).find(
      (r) => r.commune.trim().toLowerCase().replace(/-/g, " ") === norm,
    );
    if (!row) return empty;
    return {
      rentPerM2Month: row.loyer_median_m2_mensuel,
      yieldRate:
        row.rendement_locatif != null ? row.rendement_locatif / 100 : null,
    };
  } catch {
    return empty;
  }
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
  // Sprint C10 : separation prenom / nom (migration 20260528).
  first_name?: string;
  last_name?: string;
  surface_total?: number;
  works_level?: string;
  message?: string;
  // Sprint C1 : Travaux detailles (migration 20260525).
  works_details?: unknown;
  works_year?: number;
  works_amount?: number;
  // Sprint C7 : 11 colonnes Observatoire LU (migration 20260525_c7).
  energy_class?: string;
  condition?: string;
  floor_type?: string;
  atypical_type?: string;
  vefa?: boolean;
  parking_indoor?: number;
  parking_outdoor?: number;
  cellar?: boolean;
  terrace_area?: number;
  balcony_area?: number;
  garden_area?: number;
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
    // Sprint C10 : 2 colonnes prenom / nom (migration 20260528). Si la
    // migration n'est pas appliquee, le fallback baseB1C1 ci-dessous
    // (qui delete ces cles) prend le relais.
    first_name: args.first_name ?? null,
    last_name: args.last_name ?? null,
    surface_total: args.surface_total ?? null,
    works_level: args.works_level ?? null,
    message: args.message ?? null,
    // Sprint C1 : 3 colonnes Travaux detaillees (migration 20260525).
    // Si la migration n'est pas encore appliquee, le fallback cascade
    // ci-dessous (base sans B1 ni C1) sera utilise.
    works_details: args.works_details ?? null,
    works_year: args.works_year ?? null,
    works_amount: args.works_amount ?? null,
    // Sprint C7 : 11 colonnes Observatoire LU (migration 20260525_c7).
    // Defaut FALSE/0 dans la migration → si args absents on n'envoie pas
    // null pour les booleens/numeriques (laisse le default jouer).
    energy_class: args.energy_class ?? null,
    condition: args.condition ?? null,
    floor_type: args.floor_type ?? null,
    atypical_type: args.atypical_type ?? null,
    vefa: args.vefa ?? null,
    parking_indoor: args.parking_indoor ?? null,
    parking_outdoor: args.parking_outdoor ?? null,
    cellar: args.cellar ?? null,
    terrace_area: args.terrace_area ?? null,
    balcony_area: args.balcony_area ?? null,
    garden_area: args.garden_area ?? null,
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
    // Premier fallback : avec toutes les colonnes B1+C1+C7 mais sans RGPD.
    const { error: e2 } = await supabase
      .from("estimation_requests")
      .insert(base);
    if (!e2) return;
    // Sprint C7 : 2eme fallback intermediaire avec B1+C1 mais SANS les
    // 11 colonnes C7 (cas migration 20260525_c7 pas encore appliquee).
    // Sprint C10 : on enleve aussi first_name/last_name au cas ou la
    // migration 20260528 ne serait pas encore appliquee.
    const baseB1C1 = { ...base } as Record<string, unknown>;
    delete baseB1C1.energy_class;
    delete baseB1C1.condition;
    delete baseB1C1.floor_type;
    delete baseB1C1.atypical_type;
    delete baseB1C1.vefa;
    delete baseB1C1.parking_indoor;
    delete baseB1C1.parking_outdoor;
    delete baseB1C1.cellar;
    delete baseB1C1.terrace_area;
    delete baseB1C1.balcony_area;
    delete baseB1C1.garden_area;
    delete baseB1C1.first_name;
    delete baseB1C1.last_name;
    const { error: e3 } = await supabase
      .from("estimation_requests")
      .insert(baseB1C1);
    if (!e3) return;
    // Dernier fallback : schema legacy strict (migration B1 non appliquée).
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
    // Sprint C7 : 11 champs Observatoire (apartment).
    condition?: string;
    floorType?: string;
    atypicalType?: string;
    vefa?: boolean;
    parkingIndoor?: number;
    parkingOutdoor?: number;
    cellar?: boolean;
    terraceArea?: number;
    balconyArea?: number;
    gardenArea?: number;
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
    // Sprint C7 : champs Observatoire propages au moteur. Tous optionnels,
    // les casts string suffisent (engine valide via les Records typed).
    condition: c7Cast(body as unknown as Record<string, unknown>, "condition") as EstimationInputs["condition"],
    floorType: c7Cast(body as unknown as Record<string, unknown>, "floorType") as EstimationInputs["floorType"],
    atypicalType: c7Cast(body as unknown as Record<string, unknown>, "atypicalType") as EstimationInputs["atypicalType"],
    vefa: typeof body.vefa === "boolean" ? body.vefa : undefined,
    parkingIndoor:
      typeof body.parkingIndoor === "number" ? body.parkingIndoor : undefined,
    parkingOutdoor:
      typeof body.parkingOutdoor === "number" ? body.parkingOutdoor : undefined,
    cellar: typeof body.cellar === "boolean" ? body.cellar : undefined,
    terraceArea:
      typeof body.terraceArea === "number" ? body.terraceArea : undefined,
    balconyArea:
      typeof body.balconyArea === "number" ? body.balconyArea : undefined,
    gardenArea:
      typeof body.gardenArea === "number" ? body.gardenArea : undefined,
  };
}

/** Sprint C7 — string-or-undefined cast pour les champs enumeratif body. */
function c7Cast(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<EstimateInput> & {
    quartier?: string;
    contactEmail?: string;
    contactPhone?: string;
    // Sprint C9 : ISO pays du PhoneInput pour validation libphonenumber.
    contactPhoneCountry?: string;
    sessionId?: string;
    locale?: string;
    rgpdConsent?: boolean;
    parkingInterior?: number;
    parkingExterior?: number;
    works?: unknown;
    // Sprint B1 : nouveaux champs lead generator.
    contactName?: string;
    // Sprint C10 : separation prenom / nom (Step 3 EstimateForm).
    contactFirstName?: string;
    contactLastName?: string;
    surfaceTotal?: number;
    worksLevel?: string;
    message?: string;
    // Sprint C1→C2 : detail des travaux. C1 envoyait string[] (cats nues),
    // C2 envoie WorkItem[] enrichi ({category, year, amount}). On accepte
    // les deux formats pour retro-compat (clients caches anciens) ; la
    // persistance JSONB accepte n'importe quoi.
    worksDetails?: unknown;
    worksYear?: number;
    worksAmount?: number;
    // Sprint C7 : 11 champs Observatoire (apartment).
    energyClass?: string;
    condition?: string;
    floorType?: string;
    atypicalType?: string;
    vefa?: boolean;
    parkingIndoor?: number;
    parkingOutdoor?: number;
    cellar?: boolean;
    terraceArea?: number;
    balconyArea?: number;
    gardenArea?: number;
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

  // Sprint C9 + C10 — validation contact server-side avant toute persistance.
  // Doublonne le gating client (Step 3 disabled) pour bloquer les leads
  // forges (DevTools, scripts) qui contourneraient le bouton disabled.
  // Tolerant si les 4 champs sont vides (estimation anonyme possible),
  // mais STRICT si au moins un est renseigne -> les 4 doivent etre valides.
  //
  // Back-compat C10 : si seul contactName arrive (client cache pre-C10),
  // on splitte au premier espace -> first/last. Fallback last_name = ''
  // si pas d'espace (la validation rejettera alors, OK).
  const rawFirst = (body.contactFirstName ?? "").trim();
  const rawLast = (body.contactLastName ?? "").trim();
  const rawName = (body.contactName ?? "").trim();
  let firstName = rawFirst;
  let lastName = rawLast;
  if (!firstName && !lastName && rawName) {
    const parts = rawName.split(/\s+/);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ");
  }
  const fullName = `${firstName} ${lastName}`.trim();

  const hasAnyContact = Boolean(
    firstName || lastName || body.contactEmail || body.contactPhone,
  );
  if (hasAnyContact) {
    const firstRes = validateFirstName(firstName);
    const lastRes = validateLastName(lastName);
    const emailRes = validateEmail(body.contactEmail ?? "");
    const phoneRes = validatePhone(
      body.contactPhone ?? "",
      body.contactPhoneCountry ?? "LU",
    );
    if (!firstRes.valid || !lastRes.valid || !emailRes.valid || !phoneRes.valid) {
      const field = !firstRes.valid
        ? "contactFirstName"
        : !lastRes.valid
          ? "contactLastName"
          : !emailRes.valid
            ? "contactEmail"
            : "contactPhone";
      const reason =
        (firstRes.error ??
          lastRes.error ??
          emailRes.error ??
          phoneRes.error) ?? "unknown";
      const valueByField: Record<string, string> = {
        contactFirstName: firstName,
        contactLastName: lastName,
        contactEmail: body.contactEmail ?? "",
        contactPhone: body.contactPhone ?? "",
      };
      console.warn(
        `[api/estimate] Validation failed: field=${field} value=${valueByField[
          field
        ].slice(0, 30)} reason=${reason}`,
      );
      return NextResponse.json(
        { error: "invalid_payload", field, reason },
        { status: 400 },
      );
    }
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
    // Sprint 2 : lookup donnees marche commune AVANT estimateEvs (le moteur
    // reste pur, sans I/O DB). Best-effort : toute erreur DB -> rentData
    // {null, null} -> moteur retombe sur son fallback hardcode.
    evsInputs.rentData = await fetchRentDataForCommune(evsInputs.commune);
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
        contact_name: fullName || body.contactName || undefined,
        // Sprint C10 : prenom / nom separes (back-compat split fait plus haut).
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        surface_total: typeof body.surfaceTotal === "number" ? body.surfaceTotal : undefined,
        works_level: body.worksLevel,
        message: body.message,
        // Sprint C1 : Travaux detailles (3 colonnes plates pour stats admin).
        works_details: Array.isArray(body.worksDetails) ? body.worksDetails : undefined,
        works_year: typeof body.worksYear === "number" ? body.worksYear : undefined,
        works_amount: typeof body.worksAmount === "number" ? body.worksAmount : undefined,
        // Sprint C7 : 11 colonnes Observatoire (apartment).
        energy_class: typeof body.energy === "string" ? body.energy : undefined,
        condition: typeof body.condition === "string" ? body.condition : undefined,
        floor_type: typeof body.floorType === "string" ? body.floorType : undefined,
        atypical_type: typeof body.atypicalType === "string" ? body.atypicalType : undefined,
        vefa: typeof body.vefa === "boolean" ? body.vefa : undefined,
        parking_indoor: typeof body.parkingIndoor === "number" ? body.parkingIndoor : undefined,
        parking_outdoor: typeof body.parkingOutdoor === "number" ? body.parkingOutdoor : undefined,
        cellar: typeof body.cellar === "boolean" ? body.cellar : undefined,
        terrace_area: typeof body.terraceArea === "number" ? body.terraceArea : undefined,
        balcony_area: typeof body.balconyArea === "number" ? body.balconyArea : undefined,
        garden_area: typeof body.gardenArea === "number" ? body.gardenArea : undefined,
      });

      // Sprint B1 : emails client (confirmation + promesse rapport 48h ouvrees) +
      // interne (notification lead Julien/Frederic). Best-effort, jamais bloquant.
      void sendEstimationEmails({
        contactEmail: body.contactEmail,
        contactName: fullName || body.contactName,
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
    contact_name: fullName || body.contactName,
    // Sprint C10 : prenom / nom separes.
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    surface_total: typeof body.surfaceTotal === "number" ? body.surfaceTotal : undefined,
    works_level: body.worksLevel,
    message: body.message,
  });

  // Sprint B1 : emails client + interne (cf. branche EVS ci-dessus).
  void sendEstimationEmails({
    contactEmail: body.contactEmail,
    contactName: fullName || body.contactName,
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
