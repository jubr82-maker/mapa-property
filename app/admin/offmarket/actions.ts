"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import {
  generateOffmarketReference,
  PROPERTY_TYPES,
  type OffmarketStatus,
  type PropertyType,
  type RequestStatus,
} from "@/lib/admin/offmarket";
import { translateBatch } from "@/lib/translate";

// Colonnes potentiellement absentes selon l'état d'application des migrations.
// Si Postgres remonte "column does not exist" sur l'une d'elles, on la retire
// du payload et on réessaie — permet au BO de fonctionner même si Julien
// n'a pas encore appliqué les dernières migrations SQL.
const OPTIONAL_OFFMARKET_COLUMNS = [
  // Sprint I18N : colonnes traduites auto (migration 20260526_offmarket_i18n_full).
  // Tolerance retry si la migration n'a pas encore ete appliquee.
  "title_en",
  "title_de",
  "description_en",
  "description_de",
  "short_pitch_en",
  "short_pitch_de",
  "sub_type",
  "surface_utile",
  "surface_ponderee",
  "bureaux",
  "wc",
  "douches",
  "cuisine",
  "cuisine_m2",
  "locaux_stockage",
  "buanderie",
  "dressing",
  "terrasse_m2",
  "balcon_m2",
  "jardin_m2",
  "has_piscine",
  "parking_exterieur",
  "parking_interieur",
  "box",
  "garage",
  "price_mode",
  "price_min",
  "price_max",
  "price_custom_text",
  "price_on_demand",
  "video_url",
  "is_coup_de_coeur",
  "composition_commerces",
  "composition_bureaux",
  "composition_logements",
  "prestations",
  "features",
  "photo_urls",
  "exclusive_until",
  "signed_mandate_url",
  "city_real",
  "region",
  "surface_terrain_ares",
  "price_estimate",
  "price_label",
  "reference",
  "status",
  "property_type",
  "photos_locked",
];

function extractMissingColumn(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/column "?([a-z_]+)"? .* does not exist/i);
  return m?.[1] ?? null;
}

async function insertWithRetry(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  payload: Record<string, unknown>,
) {
  let attempt = { ...payload };
  for (let i = 0; i < 10; i++) {
    const { data, error } = await supabase.from(table).insert(attempt).select("id").single();
    if (!error) return { data, error: null };
    const col = extractMissingColumn(error);
    if (col && OPTIONAL_OFFMARKET_COLUMNS.includes(col)) {
      console.warn(`[insertWithRetry] colonne ${col} absente — retry sans`);
      delete attempt[col];
      continue;
    }
    return { data: null, error };
  }
  return { data: null, error: new Error("Trop de tentatives") };
}

async function updateWithRetry(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  payload: Record<string, unknown>,
  id: string,
) {
  let attempt = { ...payload };
  for (let i = 0; i < 10; i++) {
    const { error } = await supabase.from(table).update(attempt).eq("id", id);
    if (!error) return { error: null };
    const col = extractMissingColumn(error);
    if (col && OPTIONAL_OFFMARKET_COLUMNS.includes(col)) {
      console.warn(`[updateWithRetry] colonne ${col} absente — retry sans`);
      delete attempt[col];
      continue;
    }
    return { error };
  }
  return { error: new Error("Trop de tentatives") };
}

// Sprint I18N-Mistral — Auto-traduction des champs FR -> EN + DE au save.
// Lecture des champs FR depuis le payload (title, description, short_pitch),
// appel Mistral en parallele (2 langues), ajout des 6 colonnes _en/_de dans
// le payload. Si Mistral fail : console.warn + payload non modifie -> les
// anciennes valeurs EN/DE en DB sont preservees (updateWithRetry ne touche
// pas ce qui n'est pas dans le payload). Jamais bloquant pour le save FR.
//
// Pour UPDATE partiel : ne traduit QUE les champs presents dans le payload
// (formData a explicitement envoye ces fields, donc edition delibérée).
async function attachI18nTranslations(
  payload: Record<string, unknown>,
): Promise<void> {
  const fr: Record<string, string | null | undefined> = {};
  if ("title" in payload && typeof payload.title === "string") {
    fr.title = payload.title;
  }
  if ("description" in payload && typeof payload.description === "string") {
    fr.description = payload.description;
  }
  if ("short_pitch" in payload && typeof payload.short_pitch === "string") {
    fr.short_pitch = payload.short_pitch;
  }
  if (Object.keys(fr).length === 0) return;

  try {
    const [en, de] = await Promise.all([
      translateBatch(fr, "EN"),
      translateBatch(fr, "DE"),
    ]);
    for (const key of Object.keys(fr)) {
      if (en[key]) payload[`${key}_en`] = en[key];
      if (de[key]) payload[`${key}_de`] = de[key];
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(
      `[translate] Mistral failed for offmarket: ${msg} — keeping previous EN/DE values in DB.`,
    );
    // Pas de modification du payload : les colonnes _en/_de NE sont PAS
    // ajoutees -> updateWithRetry ne les touchera pas, les valeurs DB
    // existantes sont preservees.
  }
}

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const ALLOWED_STATUSES: OffmarketStatus[] = ["draft", "published", "sold", "withdrawn"];

function num(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function arr(value: FormDataEntryValue | null): string[] {
  if (!value) return [];
  return String(value)
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function bool(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true";
}

function buildOffmarketPayload(formData: FormData, propertyType: PropertyType, status: OffmarketStatus, reference: string) {
  const surfaceTerrain = num(formData.get("surface_terrain"));
  const rawPriceMode = (str(formData.get("price_mode")) ?? "exact") as
    | "exact"
    | "range"
    | "custom"
    | "on_request"
    | "on_demand";
  const priceOnDemandFlag = bool(formData.get("price_on_demand"));
  // POL3-5 : la case « Prix sur demande » prime et synchronise price_mode.
  //   cochée   → price_on_demand=true,  price_mode='on_demand'
  //   décochée → price_on_demand=false, price_mode='exact'
  //              (sauf si déjà 'range' → on conserve 'range')
  const priceMode: "exact" | "range" | "custom" | "on_request" | "on_demand" =
    priceOnDemandFlag
      ? "on_demand"
      : rawPriceMode === "on_demand"
        ? "exact"
        : rawPriceMode;
  const priceLabelByMode = computePriceLabel(priceMode, formData);

  return {
    reference,
    status,
    title: str(formData.get("title")) ?? "Sans titre",
    internal_ref: reference,
    property_type: propertyType,
    type: propertyType,
    sub_type: str(formData.get("sub_type")),
    country: str(formData.get("country")) ?? "LU",
    region: str(formData.get("region")),
    city_label: str(formData.get("city_anonymized")) ?? "Confidentiel",
    city_real: str(formData.get("city_real")),

    // Surfaces
    surface_hab: num(formData.get("surface_habitable")),
    surface_utile: num(formData.get("surface_utile")),
    surface_ponderee: num(formData.get("surface_ponderee")),
    surface_terrain: surfaceTerrain,
    surface_terrain_ares: surfaceTerrain ? surfaceTerrain / 100 : null,

    // Pièces
    bedrooms: num(formData.get("chambres")),
    bureaux: num(formData.get("bureaux")),
    bathrooms: num(formData.get("salles_de_bain")),
    douches: num(formData.get("douches")),
    wc: num(formData.get("wc")),
    locaux_stockage: num(formData.get("locaux_stockage")),
    buanderie: bool(formData.get("buanderie")),
    dressing: bool(formData.get("dressing")),
    cuisine: bool(formData.get("cuisine")),
    cuisine_m2: num(formData.get("cuisine_m2")),

    // Extérieurs
    terrasse_m2: num(formData.get("terrasse_m2")),
    balcon_m2: num(formData.get("balcon_m2")),
    jardin_m2: num(formData.get("jardin_m2")),
    has_piscine: bool(formData.get("has_piscine")),

    // Stationnement
    parking_exterieur: num(formData.get("parking_exterieur")),
    parking_interieur: num(formData.get("parking_interieur")),
    box: num(formData.get("box")),
    garage: num(formData.get("garage")),

    // Énergie + prestations
    energy_class: str(formData.get("classe_energetique")),
    highlights: arr(formData.get("prestations")),
    prestations: arr(formData.get("prestations")),

    // Prix : mode + champs liés
    price_mode: priceMode,
    price_estimate: num(formData.get("price_estimate")),
    price_min: num(formData.get("price_min")),
    price_max: num(formData.get("price_max")),
    price_custom_text: str(formData.get("price_custom_text")),
    // price_label : conservé pour compat back-office / exports, JAMAIS lu
    // par l'affichage public (POL3-5 — PropertyPrice ignore price_label).
    price_label: priceLabelByMode,
    // POL3-5 : price_display devient strictement numérique (prix exact)
    // ou null. PropertyPrice ne s'en sert qu'en dernier recours (étape 6)
    // et parse un nombre — plus jamais de libellé legacy stocké ici.
    price_display:
      priceMode === "exact"
        ? (num(formData.get("price_estimate"))?.toString() ?? null)
        : null,
    // POL2-9 / POL3-5 : drapeau "Prix sur demande" (masque le prix
    // public). Décoché par défaut ⇒ false ⇒ prix réel affiché.
    price_on_demand: priceOnDemandFlag,

    // Contenu
    short_pitch: str(formData.get("short_description")),
    description: str(formData.get("full_description")),
    // POL2-10 : URL vidéo de présentation (colonne optionnelle tolérante).
    video_url: str(formData.get("video_url")),

    // Workflow
    photos_locked: bool(formData.get("photos_locked")),
    is_published: status === "published",
    exclusive_until: str(formData.get("exclusive_until")),
    display_order: num(formData.get("display_order")) ?? 100,
    is_coup_de_coeur: bool(formData.get("is_coup_de_coeur")),
  };
}

// ─── Update payload (non destructif) ─────────────────────────────────────────
// Construit un payload UPDATE qui ne contient QUE les champs réellement
// présents dans formData. Les onglets démontés ne wipent plus les colonnes
// hors-onglet. La reference est conservée depuis existing, jamais régénérée.
function buildOffmarketUpdatePayload(
  formData: FormData,
  existing: Record<string, unknown>,
  propertyType: PropertyType,
  status: OffmarketStatus,
): Record<string, unknown> {
  // Génère le payload "naïf" (avec fallbacks destructifs)
  const naive: Record<string, unknown> = buildOffmarketPayload(formData, propertyType, status, String(existing.reference ?? ""));

  // Map des colonnes DB qui sont écrites depuis un champ form au nom différent.
  // Sans ça, formData.has(columnKey) renvoie false → la valeur de l'édition
  // est ignorée et on garde stupidement existing.
  const COLUMN_TO_FORM_FIELD: Record<string, string> = {
    city_label: "city_anonymized",
    surface_hab: "surface_habitable",
    bedrooms: "chambres",
    bathrooms: "salles_de_bain",
    energy_class: "classe_energetique",
    highlights: "prestations",
    short_pitch: "short_description",
    description: "full_description",
  };

  // Clés purement calculées (pas de champ form correspondant) : il faut TOUJOURS
  // prendre la valeur recalculée de naive, jamais existing (sinon figées/stale).
  const ALWAYS_FROM_NAIVE = new Set([
    "surface_terrain_ares",
    "is_published",
    "type",
  ]);

  // Liste des champs qu'on doit comparer entre formData et existing.
  // Pour chaque champ : si la clé n'est PAS présente dans formData, on garde
  // existing[key] au lieu d'écraser avec le fallback.
  const payload: Record<string, unknown> = {};
  for (const key of Object.keys(naive)) {
    // Clés purement calculées : toujours la valeur fraîche de naive.
    if (ALWAYS_FROM_NAIVE.has(key)) {
      payload[key] = naive[key];
      continue;
    }
    // Pour les autres, tester la présence du champ form (avec mapping si besoin).
    const formField = COLUMN_TO_FORM_FIELD[key] ?? key;
    const formHasField = formData.has(formField);
    if (formHasField) {
      payload[key] = naive[key];
    } else if (key in existing) {
      payload[key] = existing[key];
    }
    // sinon : on n'ajoute rien (Supabase ne touche pas la colonne)
  }

  // POL2-9 : price_on_demand. Une case décochée n'envoie AUCUNE entrée
  // FormData → la boucle ci-dessus garderait existing. La sentinelle
  // `price_on_demand_present` (hidden, toujours soumise quand l'onglet
  // Prix est monté) permet de distinguer "case décochée" (→ false) d'un
  // onglet jamais affiché (→ valeur DB conservée).
  if (formData.has("price_on_demand_present")) {
    payload.price_on_demand = bool(formData.get("price_on_demand"));
  } else if ("price_on_demand" in existing) {
    payload.price_on_demand = existing.price_on_demand;
  } else {
    delete payload.price_on_demand;
  }

  // reference : TOUJOURS utiliser existing.reference en édition
  // (sécurité même si formData.has("reference") par accident)
  if (existing.reference) {
    payload.reference = existing.reference;
    payload.internal_ref = existing.reference;
  }

  // status : toujours utiliser la valeur résolue côté action
  payload.status = status;
  payload.property_type = propertyType;
  payload.type = propertyType;

  return payload;
}

function parseCompositionFromFormData(formData: FormData): {
  composition_commerces: unknown[];
  composition_bureaux: unknown[];
  composition_logements: unknown[];
} {
  const parse = (key: string): unknown[] => {
    const raw = str(formData.get(key));
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };
  return {
    composition_commerces: parse("composition_commerces"),
    composition_bureaux: parse("composition_bureaux"),
    composition_logements: parse("composition_logements"),
  };
}

function computePriceLabel(
  mode: "exact" | "range" | "custom" | "on_request" | "on_demand",
  formData: FormData,
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";

  if (mode === "on_demand") {
    return "Prix sur demande";
  }
  if (mode === "exact") {
    const estimate = num(formData.get("price_estimate"));
    return estimate ? fmt(estimate) : "Prix sur demande";
  }
  if (mode === "range") {
    const min = num(formData.get("price_min"));
    const max = num(formData.get("price_max"));
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `À partir de ${fmt(min)}`;
    if (max) return `Jusqu'à ${fmt(max)}`;
    return "Prix sur demande";
  }
  if (mode === "custom") {
    return str(formData.get("price_custom_text")) ?? "Prix sur demande";
  }
  return "Prix sur demande";
}

async function audit(
  propertyId: string | null,
  action: string,
  details?: Record<string, unknown>,
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("offmarket_audit_log").insert({
      property_id: propertyId,
      user_id: user?.id ?? null,
      action,
      details: details ?? null,
    });
  } catch (error) {
    console.error("[audit] failed", error);
  }
}

export async function createOffmarket(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  const propertyType = str(formData.get("property_type")) as PropertyType | null;
  if (!propertyType || !PROPERTY_TYPES.includes(propertyType)) {
    return { ok: false, error: "Type de bien invalide." };
  }

  const requestedStatus = str(formData.get("status"));
  const status: OffmarketStatus = ALLOWED_STATUSES.includes(
    requestedStatus as OffmarketStatus,
  )
    ? (requestedStatus as OffmarketStatus)
    : "draft";

  const reference = str(formData.get("reference")) ?? generateOffmarketReference();
  const payload: Record<string, unknown> = {
    ...buildOffmarketPayload(formData, propertyType, status, reference),
    created_by: user!.id,
  };

  Object.assign(payload, parseCompositionFromFormData(formData));

  // Sprint I18N-Mistral : auto-traduction des champs FR vers EN+DE
  // avant l'INSERT. Idempotent et tolerant (cf. attachI18nTranslations).
  await attachI18nTranslations(payload);

  const { data, error } = await insertWithRetry(supabase, "properties_offmarket", payload);

  if (error || !data) {
    console.error("[admin] createOffmarket", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur d'enregistrement (vérifier que toutes les migrations SQL sont appliquées).",
    };
  }

  await audit(data.id, "offmarket.create", { reference, status });
  revalidatePath("/admin/offmarket");
  redirect(`/admin/offmarket/${data.id}/edit?created=1`);
}

export async function updateOffmarket(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const propertyType = str(formData.get("property_type")) as PropertyType | null;
  if (!propertyType || !PROPERTY_TYPES.includes(propertyType)) {
    return { ok: false, error: "Type de bien invalide." };
  }

  const requestedStatus = str(formData.get("status"));
  const status: OffmarketStatus = ALLOWED_STATUSES.includes(
    requestedStatus as OffmarketStatus,
  )
    ? (requestedStatus as OffmarketStatus)
    : "draft";

  // Garde serveur — refuse status='published' sans champs critiques.
  // On lit la base (et non le formData), car le formData ne contient que
  // les champs de l'onglet actif (cf. OffmarketForm.tsx).
  if (status === "published") {
    const { data: existing } = await supabase
      .from("properties_offmarket")
      .select("title, country, property_type, price_estimate, price_min, price_custom_text, price_mode")
      .eq("id", id)
      .maybeSingle();
    const missing: string[] = [];
    if (!existing?.title) missing.push("Titre");
    if (!existing?.country) missing.push("Pays");
    if (!existing?.property_type) missing.push("Type");
    const hasPriceInfo =
      existing?.price_mode === "on_request" ||
      !!existing?.price_estimate ||
      !!existing?.price_min ||
      !!existing?.price_custom_text;
    if (!hasPriceInfo) missing.push("Prix (ou mode « Sur demande »)");
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Publication bloquée — champ(s) manquant(s) : ${missing.join(", ")}. La fiche reste en brouillon jusqu'à complétion.`,
      };
    }
  }

  const reference = str(formData.get("reference")) ?? generateOffmarketReference();
  // Lecture de la row existante pour merge non destructif
  const { data: existing, error: fetchErr } = await supabase
    .from("properties_offmarket")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !existing) {
    return { ok: false, error: "Fiche introuvable ou inaccessible. Rechargez la page." };
  }
  const payload = buildOffmarketUpdatePayload(
    formData,
    existing as Record<string, unknown>,
    propertyType,
    status,
  );
  Object.assign(payload, parseCompositionFromFormData(formData));

  // Sprint I18N-Mistral : auto-traduction des champs FR vers EN+DE.
  // buildOffmarketUpdatePayload n'inclut un champ que si formData l'a
  // soumis (edition deliberee), donc attachI18nTranslations ne retraduit
  // pas les champs inchanges -> economie de calls Mistral.
  await attachI18nTranslations(payload);

  const { error } = await updateWithRetry(supabase, "properties_offmarket", payload, id);

  if (error) {
    console.error("[admin] updateOffmarket", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur d'enregistrement (vérifier que toutes les migrations SQL sont appliquées).",
    };
  }

  await audit(id, "offmarket.update", { reference, status });
  revalidatePath("/admin/offmarket");
  revalidatePath(`/admin/offmarket/${id}/edit`);
  // Sprint OPTIM-1B C3 : invalidation cross-locale (faille notee dans
  // l'audit OPTIM-1B — auparavant SEUL /fr etait invalide -> EN et DE
  // restaient figes jusqu'a expiration revalidate 1800s).
  for (const locale of ["fr", "en", "de"]) {
    revalidatePath(`/${locale}/off-market`);
    revalidatePath(`/${locale}/off-market/${id}`);
  }
  return { ok: true, id };
}

export async function deleteOffmarket(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("properties_offmarket")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[admin] deleteOffmarket", error);
    throw new Error(error.message);
  }
  await audit(id, "offmarket.delete");
  revalidatePath("/admin/offmarket");
  redirect("/admin/offmarket");
}

export async function duplicateOffmarket(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: source, error: fetchErr } = await supabase
    .from("properties_offmarket")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !source) throw new Error(fetchErr?.message ?? "Bien introuvable");

  const { id: _omit, created_at: _ca, updated_at: _ua, ...rest } = source as Record<
    string,
    unknown
  >;
  const reference = generateOffmarketReference();
  const payload = {
    ...rest,
    reference,
    internal_ref: reference,
    status: "draft",
    is_published: false,
    title: `${(source as { title?: string }).title ?? "Sans titre"} (copie)`,
  };
  const { data, error } = await supabase
    .from("properties_offmarket")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await audit(data.id, "offmarket.duplicate", { source_id: id });
  revalidatePath("/admin/offmarket");
  redirect(`/admin/offmarket/${data.id}/edit`);
}

export async function uploadOffmarketPhotos(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const files = formData.getAll("photos") as File[];
  if (files.length === 0) return;

  const uploaded: string[] = [];
  for (const file of files) {
    if (!file || !(file instanceof File) || file.size === 0) continue;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("offmarket-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[admin] uploadOffmarketPhotos", error);
      continue;
    }
    const { data: publicUrl } = supabase.storage
      .from("offmarket-photos")
      .getPublicUrl(path);
    uploaded.push(publicUrl.publicUrl);
  }

  if (uploaded.length === 0) return;

  const { data: current } = await supabase
    .from("properties_offmarket")
    .select("cover_image_url,gallery_urls")
    .eq("id", id)
    .maybeSingle();

  const existingGallery = (current?.gallery_urls as string[] | null) ?? [];
  const newGallery = [...existingGallery, ...uploaded];
  const newCover = current?.cover_image_url ?? uploaded[0];

  await supabase
    .from("properties_offmarket")
    .update({
      cover_image_url: newCover,
      gallery_urls: newGallery,
      photo_urls: newGallery,
    })
    .eq("id", id);

  await audit(id, "offmarket.photos.upload", { count: uploaded.length });
  revalidatePath(`/admin/offmarket/${id}/edit`);
}

export async function reorderOffmarketPhotos(id: string, urls: string[]) {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("properties_offmarket")
    .update({
      cover_image_url: urls[0] ?? null,
      gallery_urls: urls,
      photo_urls: urls,
    })
    .eq("id", id);
  await audit(id, "offmarket.photos.reorder");
  revalidatePath(`/admin/offmarket/${id}/edit`);
}

const ALLOWED_REQUEST_STATUSES: RequestStatus[] = [
  "pending",
  "qualified",
  "nda_sent",
  "nda_signed",
  "dossier_sent",
  "visit_scheduled",
  "rejected",
];

export async function updateRequestStatus(
  requestId: string,
  status: string,
  notes: string | null = null,
) {
  if (!ALLOWED_REQUEST_STATUSES.includes(status as RequestStatus)) {
    throw new Error("Statut invalide.");
  }
  const supabase = await createSupabaseServerClient();
  const update: Record<string, unknown> = { status };
  if (notes !== null) update.notes_admin = notes;

  const { data, error } = await supabase
    .from("offmarket_requests")
    .update(update)
    .eq("id", requestId)
    .select("property_id")
    .single();

  if (error) throw new Error(error.message);
  await audit(data?.property_id ?? null, "request.status_change", {
    request_id: requestId,
    status,
  });
  revalidatePath("/admin/offmarket/requests");
  if (data?.property_id) {
    revalidatePath(`/admin/offmarket/${data.property_id}/requests`);
  }
}

export async function updateRequestNotes(requestId: string, notes: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("offmarket_requests")
    .update({ notes_admin: notes })
    .eq("id", requestId)
    .select("property_id")
    .single();
  if (error) throw new Error(error.message);
  await audit(data?.property_id ?? null, "request.notes_update", { request_id: requestId });
  if (data?.property_id) {
    revalidatePath(`/admin/offmarket/${data.property_id}/requests`);
  }
  revalidatePath("/admin/offmarket/requests");
}

// ============================================================================
// Workflow admin générique sur la table `offmarket_requests`.
// Aligné EXACTEMENT sur app/admin/leads/actions.ts (Agent 13, Phase A-quater).
// COHABITATION : `workflow_status` est ajouté en parallèle de `status` (métier
// off-market : pending, qualified, nda_sent, …) sans le remplacer. Idem pour
// `admin_notes` qui coexiste avec `notes_admin`.
// Dégrade gracieusement si la migration 20260512_admin_workflow_offmarket.sql
// n'est pas encore appliquée : remonte l'erreur Supabase telle quelle.
// ============================================================================

type WorkflowHistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

const WORKFLOW_TABLE = "offmarket_requests";
const WORKFLOW_LIST_ROUTE = "/admin/offmarket/requests";

export async function updateRequestWorkflowStatus(
  id: string,
  newStatus: string,
  reason?: string,
) {
  const sb = await createSupabaseServerClient();

  const { data: current } = await sb
    .from(WORKFLOW_TABLE)
    .select("workflow_status, workflow_history, property_id")
    .eq("id", id)
    .maybeSingle();

  const history: WorkflowHistoryEntry[] = Array.isArray(
    (current as { workflow_history?: unknown } | null)?.workflow_history,
  )
    ? ((current as { workflow_history: WorkflowHistoryEntry[] })
        .workflow_history)
    : [];

  history.push({
    at: new Date().toISOString(),
    from:
      (current as { workflow_status?: string } | null)?.workflow_status ??
      "unknown",
    to: newStatus,
    reason: reason ?? null,
  });

  const { error } = await sb
    .from(WORKFLOW_TABLE)
    .update({ workflow_status: newStatus, workflow_history: history })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const propertyId = (current as { property_id?: string } | null)?.property_id;
  revalidatePath(WORKFLOW_LIST_ROUTE);
  revalidatePath(`${WORKFLOW_LIST_ROUTE}/${id}`);
  if (propertyId) {
    revalidatePath(`/admin/offmarket/${propertyId}/requests`);
  }
}

export async function addRequestAdminNote(id: string, noteText: string) {
  const trimmed = noteText.trim();
  if (!trimmed) return;

  const sb = await createSupabaseServerClient();

  const { data: current } = await sb
    .from(WORKFLOW_TABLE)
    .select("workflow_history, property_id")
    .eq("id", id)
    .maybeSingle();

  const history: WorkflowHistoryEntry[] = Array.isArray(
    (current as { workflow_history?: unknown } | null)?.workflow_history,
  )
    ? ((current as { workflow_history: WorkflowHistoryEntry[] })
        .workflow_history)
    : [];

  history.push({ at: new Date().toISOString(), note: trimmed });

  const { error } = await sb
    .from(WORKFLOW_TABLE)
    .update({ workflow_history: history, admin_notes: trimmed })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const propertyId = (current as { property_id?: string } | null)?.property_id;
  revalidatePath(`${WORKFLOW_LIST_ROUTE}/${id}`);
  if (propertyId) {
    revalidatePath(`/admin/offmarket/${propertyId}/requests`);
  }
}

export async function setRequestNextFollowUp(
  id: string,
  date: string | null,
) {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from(WORKFLOW_TABLE)
    .update({ next_follow_up: date })
    .eq("id", id)
    .select("property_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  revalidatePath(`${WORKFLOW_LIST_ROUTE}/${id}`);
  revalidatePath(WORKFLOW_LIST_ROUTE);
  const propertyId = (data as { property_id?: string } | null)?.property_id;
  if (propertyId) {
    revalidatePath(`/admin/offmarket/${propertyId}/requests`);
  }
}
