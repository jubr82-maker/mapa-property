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

export async function createOffmarket(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const propertyType = str(formData.get("property_type")) as PropertyType | null;
  if (!propertyType || !PROPERTY_TYPES.includes(propertyType)) {
    throw new Error("Type de bien invalide.");
  }

  const requestedStatus = str(formData.get("status"));
  const status: OffmarketStatus = ALLOWED_STATUSES.includes(
    requestedStatus as OffmarketStatus,
  )
    ? (requestedStatus as OffmarketStatus)
    : "draft";

  const reference = str(formData.get("reference")) ?? generateOffmarketReference();
  const surfaceTerrain = num(formData.get("surface_terrain"));

  const payload = {
    reference,
    status,
    title: str(formData.get("title")) ?? "Sans titre",
    internal_ref: reference,
    property_type: propertyType,
    country: str(formData.get("country")) ?? "LU",
    region: str(formData.get("region")),
    city_label: str(formData.get("city_anonymized")) ?? "Confidentiel",
    city_real: str(formData.get("city_real")),
    surface_hab: num(formData.get("surface_habitable")),
    surface_terrain: surfaceTerrain,
    surface_terrain_ares: surfaceTerrain ? surfaceTerrain / 100 : null,
    bedrooms: num(formData.get("chambres")),
    bathrooms: num(formData.get("salles_de_bain")),
    energy_class: str(formData.get("classe_energetique")),
    price_estimate: num(formData.get("price_estimate")),
    price_label: str(formData.get("price_label")) ?? "Prix sur demande",
    price_display: str(formData.get("price_label")) ?? "Prix sur demande",
    short_pitch: str(formData.get("short_description")),
    description: str(formData.get("full_description")),
    highlights: arr(formData.get("prestations")),
    prestations: arr(formData.get("prestations")),
    photos_locked: formData.get("photos_locked") === "on",
    is_published: status === "published",
    exclusive_until: str(formData.get("exclusive_until")),
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("properties_offmarket")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[admin] createOffmarket", error);
    throw new Error(error.message);
  }

  await audit(data.id, "offmarket.create", { reference, status });
  revalidatePath("/admin/offmarket");
  redirect(`/admin/offmarket/${data.id}/edit?created=1`);
}

export async function updateOffmarket(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const propertyType = str(formData.get("property_type")) as PropertyType | null;
  if (!propertyType || !PROPERTY_TYPES.includes(propertyType)) {
    throw new Error("Type de bien invalide.");
  }

  const requestedStatus = str(formData.get("status"));
  const status: OffmarketStatus = ALLOWED_STATUSES.includes(
    requestedStatus as OffmarketStatus,
  )
    ? (requestedStatus as OffmarketStatus)
    : "draft";

  const reference = str(formData.get("reference")) ?? generateOffmarketReference();
  const surfaceTerrain = num(formData.get("surface_terrain"));

  const payload = {
    reference,
    status,
    title: str(formData.get("title")) ?? "Sans titre",
    internal_ref: reference,
    property_type: propertyType,
    country: str(formData.get("country")) ?? "LU",
    region: str(formData.get("region")),
    city_label: str(formData.get("city_anonymized")) ?? "Confidentiel",
    city_real: str(formData.get("city_real")),
    surface_hab: num(formData.get("surface_habitable")),
    surface_terrain: surfaceTerrain,
    surface_terrain_ares: surfaceTerrain ? surfaceTerrain / 100 : null,
    bedrooms: num(formData.get("chambres")),
    bathrooms: num(formData.get("salles_de_bain")),
    energy_class: str(formData.get("classe_energetique")),
    price_estimate: num(formData.get("price_estimate")),
    price_label: str(formData.get("price_label")) ?? "Prix sur demande",
    price_display: str(formData.get("price_label")) ?? "Prix sur demande",
    short_pitch: str(formData.get("short_description")),
    description: str(formData.get("full_description")),
    highlights: arr(formData.get("prestations")),
    prestations: arr(formData.get("prestations")),
    photos_locked: formData.get("photos_locked") === "on",
    is_published: status === "published",
    exclusive_until: str(formData.get("exclusive_until")),
  };

  const { error } = await supabase
    .from("properties_offmarket")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[admin] updateOffmarket", error);
    throw new Error(error.message);
  }

  await audit(id, "offmarket.update", { reference, status });
  revalidatePath("/admin/offmarket");
  revalidatePath(`/admin/offmarket/${id}/edit`);
  revalidatePath("/fr/off-market");
  revalidatePath(`/fr/off-market/${id}`);
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
