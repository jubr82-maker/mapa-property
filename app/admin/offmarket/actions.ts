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

// Colonnes potentiellement absentes selon l'état d'application des migrations.
// Si Postgres remonte "column does not exist" sur l'une d'elles, on la retire
// du payload et on réessaie — permet au BO de fonctionner même si Julien
// n'a pas encore appliqué les dernières migrations SQL.
const OPTIONAL_OFFMARKET_COLUMNS = [
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
  const priceMode = (str(formData.get("price_mode")) ?? "exact") as
    | "exact"
    | "range"
    | "custom"
    | "on_request";
  const priceLabelByMode = computePriceLabel(priceMode, formData);

  return {
    reference,
    status,
    title: str(formData.get("title")) ?? "Sans titre",
    internal_ref: reference,
    property_type: propertyType,
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
    price_label: priceLabelByMode,
    price_display: priceLabelByMode,

    // Contenu
    short_pitch: str(formData.get("short_description")),
    description: str(formData.get("full_description")),

    // Workflow
    photos_locked: bool(formData.get("photos_locked")),
    is_published: status === "published",
    exclusive_until: str(formData.get("exclusive_until")),
    display_order: num(formData.get("display_order")) ?? 100,
    is_coup_de_coeur: bool(formData.get("is_coup_de_coeur")),
  };
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
  mode: "exact" | "range" | "custom" | "on_request",
  formData: FormData,
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";

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

  const reference = str(formData.get("reference")) ?? generateOffmarketReference();
  const payload: Record<string, unknown> = buildOffmarketPayload(formData, propertyType, status, reference);
  Object.assign(payload, parseCompositionFromFormData(formData));

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
  revalidatePath("/fr/off-market");
  revalidatePath(`/fr/off-market/${id}`);
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
