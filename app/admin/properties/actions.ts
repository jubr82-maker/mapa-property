"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { PROPERTIES_LIST_TAG } from "@/lib/data";
import { invalidateArchivedPropertyKeys } from "@/lib/archived-properties";
import { deleteFromR2, isR2Configured, R2_PUBLIC_URL_BASE } from "@/lib/r2";
import {
  PROPERTY_TYPE_FAMILIES,
  PROPERTY_STATES,
  TRANSACTION_TYPES,
  transactionToBase,
} from "@/lib/taxonomy/property-types";
import { assertAdminAction } from "@/lib/admin/require-admin";

/**
 * Sprint OPTIM-1A : helper de lecture du slug d'un bien par id. Utilise
 * pour cibler revalidatePath sur la fiche SSG generee par C2
 * generateStaticParams. Si fetch echoue OU slug null : retourne null,
 * le caller console.warn + skip l'invalidation de la fiche (la liste
 * /fr/biens reste invalidee, et la fiche se rafraichit au revalidate
 * 30min ou via le bouton refresh admin C5).
 */
async function fetchPropertySlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("[admin/properties] fetchSlug error:", error.message);
    return null;
  }
  const slug = (data as { slug: string | null } | null)?.slug;
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}

export async function setPropertyPublished(id: string, isPublished: boolean) {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const slug = await fetchPropertySlug(supabase, id);
  const { error } = await supabase
    .from("properties")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  revalidatePath("/fr/biens");
  // Sprint OPTIM-1A : invalide la fiche SSG (C2) pour fraicheur immediate.
  if (slug) revalidatePath(`/fr/biens/${slug}`);
}

export async function setPropertyFeatured(id: string, isFeatured: boolean) {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const slug = await fetchPropertySlug(supabase, id);
  const { error } = await supabase
    .from("properties")
    .update({ is_featured: isFeatured })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  revalidatePath("/fr");
  // Sprint OPTIM-1A : la fiche elle-meme peut afficher un badge featured
  // dans certains rendus -> on l'invalide aussi par securite (cout marginal).
  if (slug) revalidatePath(`/fr/biens/${slug}`);
}

/**
 * POL4-A2 (AGENT CAMILLE) — Met à jour titre FR, description FR (HTML
 * formaté via RichTextEditor TipTap d'ELISE) et prix d'un bien Apimo.
 * Garde rétrocompat avec updatePropertyVideoUrl (form vidéo séparé).
 *
 * Champ vide ('') → null (respecte les colonnes nullable). Tous les
 * champs sont OPTIONNELS : seul ce qui est passé est mis à jour.
 */
// Sprint badges commerciaux : allowlists strictes. Toute valeur hors
// liste -> null (pas d'erreur, dégradation gracieuse).
const BADGE_LABELS: readonly string[] = [
  "Exclusivité",
  "Nouveau",
  "Nouveau prix",
  "Opportunité",
  "Investissement",
  "À découvrir",
];
const BADGE_SIZES: readonly string[] = ["S", "M", "L"];
const BADGE_POSITIONS: readonly string[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

// Sprint SAISIE-MANUELLE étape B : statut riche, cohabite avec is_published
// (CHECK constraint SQL properties_status_check, cf. migration
// 20260904_properties_saisie_manuelle.sql). Le pont vers is_published se
// fait ICI, jamais côté client : published -> true, tout le reste -> false.
const PROPERTY_STATUSES = ["draft", "published", "sold", "withdrawn"] as const;

// Colonnes INTEGER en base (douches/wc/bureaux/locaux_stockage confirmées
// par la migration 20260904_properties_saisie_manuelle.sql ; bedrooms/
// bathrooms/parking/year/year_built préexistantes, traitées pareil par
// prudence). Un décimal saisi par erreur y est arrondi plutôt que de
// planter l'update (invalid input syntax for type integer). Les colonnes
// NUMERIC (surfaces, prix) gardent leurs décimales.
const INTEGER_COLUMNS = new Set([
  "bedrooms",
  "bathrooms",
  "douches",
  "wc",
  "bureaux",
  "locaux_stockage",
  "parking",
  "year",
  "year_built",
]);

/**
 * Point unique de normalisation numérique — NaN/Infinity -> null, arrondi
 * optionnel (colonnes INTEGER). Utilisé par createProperty (num()) et
 * updateProperty (setNum()) pour un comportement identique.
 */
function parseNumOrNull(n: number, round: boolean): number | null {
  if (!Number.isFinite(n)) return null;
  return round ? Math.round(n) : n;
}

export type UpdatePropertyResult = { ok: true } | { ok: false; error: string };

export async function updateProperty(
  id: string,
  data: {
    title_fr?: string | null;
    title_en?: string | null;
    title_de?: string | null;
    description_fr?: string | null;
    description_en?: string | null;
    description_de?: string | null;
    short_description_fr?: string | null;
    short_description_en?: string | null;
    short_description_de?: string | null;
    surface?: number | null;
    living_surface?: number | null;
    usable_surface?: number | null;
    land_surface?: number | null;
    terrace_surface?: number | null;
    balcony_surface?: number | null;
    garden_surface?: number | null;
    kitchen_surface?: number | null;
    area_total?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    douches?: number | null;
    wc?: number | null;
    bureaux?: number | null;
    locaux_stockage?: number | null;
    floor?: string | null;
    has_laundry?: boolean;
    has_dressing?: boolean;
    has_pool?: boolean;
    parking?: number | null;
    energy?: string | null;
    thermal?: string | null;
    ges?: string | null;
    year?: number | null;
    year_built?: number | null;
    price?: number | null;
    price_on_demand?: boolean;
    price_min?: number | null;
    price_max?: number | null;
    amenities?: string | null;
    current_use?: string | null;
    potential_use?: string | null;
    status?: string;
    badge?: string | null;
    badge_size?: string | null;
    badge_position?: string | null;
  },
): Promise<UpdatePropertyResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const update: Record<string, unknown> = {};

  // --- Titre FR : NOT NULL en base (cf. lib/apimo/mapper.ts) — jamais
  // écrasé par null. Bloqué AVANT toute écriture, message clair plutôt
  // qu'une violation de contrainte Postgres masquée en production.
  if (data.title_fr !== undefined) {
    const t = (data.title_fr ?? "").trim();
    if (t.length === 0) {
      return { ok: false, error: "Le titre (FR) est requis." };
    }
    update.title_fr = t;
  }

  const setText = (key: string, value: string | null | undefined) => {
    if (value === undefined) return;
    const t = (value ?? "").trim();
    update[key] = t.length > 0 ? t : null;
  };
  const setNum = (key: string, value: number | null | undefined) => {
    if (value === undefined) return;
    update[key] = value == null ? null : parseNumOrNull(value, INTEGER_COLUMNS.has(key));
  };

  // --- Descriptions ---
  setText("title_en", data.title_en);
  setText("title_de", data.title_de);
  setText("description_fr", data.description_fr);
  setText("description_en", data.description_en);
  setText("description_de", data.description_de);
  setText("short_description_fr", data.short_description_fr);
  setText("short_description_en", data.short_description_en);
  setText("short_description_de", data.short_description_de);

  // --- Surfaces ---
  setNum("surface", data.surface);
  setNum("living_surface", data.living_surface);
  setNum("usable_surface", data.usable_surface);
  setNum("land_surface", data.land_surface);
  setNum("terrace_surface", data.terrace_surface);
  setNum("balcony_surface", data.balcony_surface);
  setNum("garden_surface", data.garden_surface);
  setNum("kitchen_surface", data.kitchen_surface);
  setNum("area_total", data.area_total);

  // --- Pièces ---
  setNum("bedrooms", data.bedrooms);
  setNum("bathrooms", data.bathrooms);
  setNum("douches", data.douches);
  setNum("wc", data.wc);
  setNum("bureaux", data.bureaux);
  setNum("locaux_stockage", data.locaux_stockage);
  setText("floor", data.floor);

  // --- Équipements ---
  if (data.has_laundry !== undefined) update.has_laundry = data.has_laundry;
  if (data.has_dressing !== undefined) update.has_dressing = data.has_dressing;
  if (data.has_pool !== undefined) update.has_pool = data.has_pool;
  setNum("parking", data.parking);

  // --- Énergie ---
  setText("energy", data.energy);
  setText("thermal", data.thermal);
  setText("ges", data.ges);
  setNum("year", data.year);
  setNum("year_built", data.year_built);

  // --- Prix ---
  setNum("price", data.price);
  if (data.price_on_demand !== undefined) {
    update.price_on_demand = data.price_on_demand;
  }
  setNum("price_min", data.price_min);
  setNum("price_max", data.price_max);

  // --- Prestations & usage ---
  setText("amenities", data.amenities);
  setText("current_use", data.current_use);
  setText("potential_use", data.potential_use);

  // --- Statut + pont is_published ---
  if (data.status !== undefined) {
    if (!PROPERTY_STATUSES.includes(data.status as (typeof PROPERTY_STATUSES)[number])) {
      return { ok: false, error: "Statut invalide." };
    }
    update.status = data.status;
    update.is_published = data.status === "published";
  }

  // --- Badges (existant, inchangé) ---
  if (data.badge !== undefined) {
    const b = (data.badge ?? "").trim();
    update.badge = b.length > 0 && BADGE_LABELS.includes(b) ? b : null;
  }
  if (data.badge_size !== undefined) {
    const s = (data.badge_size ?? "").trim();
    update.badge_size = s.length > 0 && BADGE_SIZES.includes(s) ? s : null;
  }
  if (data.badge_position !== undefined) {
    const p = (data.badge_position ?? "").trim();
    update.badge_position =
      p.length > 0 && BADGE_POSITIONS.includes(p) ? p : null;
  }

  if (Object.keys(update).length === 0) return { ok: true };
  const slug = await fetchPropertySlug(supabase, id);
  const { error } = await supabase
    .from("properties")
    .update(update)
    .eq("id", id);
  if (error) {
    console.error("[admin] updateProperty", error);
    return { ok: false, error: error.message };
  }
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}`);
  revalidatePath("/fr/biens");
  // Sprint OPTIM-1A : invalide la fiche SSG (C2) pour fraicheur immediate.
  if (slug) revalidatePath(`/fr/biens/${slug}`);
  return { ok: true };
}

/**
 * Met à jour l'URL vidéo de présentation d'un bien (passe ?? null pour vider).
 * Pas d'upload natif dans cette passe — Phase B (Supabase Storage + signed URLs).
 */
export async function updatePropertyVideoUrl(
  propertyId: string,
  videoUrl: string | null,
) {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const normalized =
    typeof videoUrl === "string" && videoUrl.trim().length > 0
      ? videoUrl.trim()
      : null;
  const slug = await fetchPropertySlug(supabase, propertyId);
  const { error } = await supabase
    .from("properties")
    .update({ video_url: normalized })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  // PAS de revalidatePath sur /admin/properties/{propertyId} — même
  // raison que savePropertyPhotos (photos/actions.ts) : cette page
  // héberge PropertyEditForm, dont la saisie en cours non enregistrée
  // serait effacée à l'affichage par le refresh RSC immédiat.
  // PropertyVideoForm reflète déjà l'URL sauvée localement.
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  revalidatePath("/fr/biens");
  // Sprint OPTIM-1A : invalide la fiche SSG (C2) pour fraicheur immediate.
  if (slug) revalidatePath(`/fr/biens/${slug}`);
}

// ============================================================================
// Sprint SAISIE-MANUELLE — Étape A : création d'un bien de zéro (socle).
// Calqué sur createOffmarket (app/admin/offmarket/actions.ts) pour la
// structure : check auth serveur, insert, revalidate, redirect vers l'édition.
// Périmètre volontairement minimal (champs de base) — le formulaire
// d'édition sera enrichi dans une étape ultérieure avec les 23 colonnes de
// la migration 20260904_properties_saisie_manuelle.sql.
// ============================================================================

export type PropertyActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string };

function str(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

// round=true pour les colonnes INTEGER (cf. INTEGER_COLUMNS plus haut) —
// même logique de normalisation que updateProperty, via parseNumOrNull.
function num(value: FormDataEntryValue | null, round = false): number | null {
  if (value == null || value === "") return null;
  return parseNumOrNull(Number(value), round);
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Génère un slug unique à partir du titre + un suffixe court (pas
 * d'apimo_id disponible pour une saisie manuelle). Vérifie l'unicité en
 * base avant de retourner — retry avec un nouveau suffixe en cas de
 * collision (improbable, mais vérifié plutôt que supposé).
 */
async function generateUniquePropertySlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  title: string,
): Promise<string> {
  const base = slugify(title) || "bien";
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    const candidate = `${base}-${suffix}`;
    const { data } = await supabase
      .from("properties")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // Filet de sécurité improbable : uuid complet, unicité quasi-garantie.
  return `${base}-${crypto.randomUUID()}`;
}

export async function createProperty(
  formData: FormData,
): Promise<PropertyActionResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  const titleFr = str(formData.get("title_fr"));
  if (!titleFr) {
    return { ok: false, error: "Le titre (FR) est requis." };
  }

  const transaction = str(formData.get("transaction"));
  if (!transaction || !TRANSACTION_TYPES.some((t) => t.slug === transaction)) {
    return { ok: false, error: "Transaction invalide." };
  }
  // properties.transaction reste le binaire sale/rent (CHECK constraint SQL
  // existante) ; le slug riche choisi (ex. "vente-en-viager") est conservé
  // dans transaction_detail pour l'affichage fiche, jamais à la place.
  const transactionBase = transactionToBase(transaction);
  if (!transactionBase) {
    return { ok: false, error: "Transaction invalide." };
  }

  const propertyType = str(formData.get("property_type"));
  const knownType = PROPERTY_TYPE_FAMILIES.some((f) =>
    f.types.some((t) => t.slug === propertyType),
  );
  if (!propertyType || !knownType) {
    return { ok: false, error: "Type de bien invalide." };
  }

  const propertyState = str(formData.get("property_state"));
  if (propertyState && !PROPERTY_STATES.some((s) => s.slug === propertyState)) {
    return { ok: false, error: "État du bien invalide." };
  }

  const priceOnDemand = formData.get("price_on_demand") === "on";
  const price = priceOnDemand ? null : num(formData.get("price"));

  const slug = await generateUniquePropertySlug(supabase, titleFr);

  // status='draft' fixe à la création (jamais choisi par l'utilisateur ici)
  // + is_published=false en miroir : le pont status<->is_published n'est
  // fait qu'au sens "draft => pas publié" pour cette étape ; la logique
  // complète (published/sold/withdrawn => is_published) viendra avec le
  // formulaire d'édition.
  const payload = {
    slug,
    title_fr: titleFr,
    title_en: str(formData.get("title_en")),
    title_de: str(formData.get("title_de")),
    transaction: transactionBase,
    transaction_detail: transaction,
    property_type: propertyType,
    property_state: propertyState,
    country: str(formData.get("country")) ?? "LU",
    city: str(formData.get("city")),
    price,
    price_on_demand: priceOnDemand,
    internal_ref: str(formData.get("internal_ref")),
    status: "draft",
    is_published: false,
    created_by: user!.id,
  };

  const { data, error } = await supabase
    .from("properties")
    .insert(payload)
    .select("id, slug")
    .single();

  if (error || !data) {
    console.error("[admin] createProperty", error);
    return {
      ok: false,
      error:
        error?.message ?? "save_failed",
    };
  }

  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  redirect(`/admin/properties/${data.id}?created=1`);
}

// ---------------------------------------------------------------------------
// Archivage et suppression des biens (oct. 2026)
// ---------------------------------------------------------------------------
// Archiver = depublier (is_published = false) + horodater archived_at : le
// site public ne lit que les biens publies (lib/data.ts), le bien disparait
// donc partout ; sa fiche repond 410 (proxy.ts + app/api/property-gone).
// Restaurer = remettre en ligne tel quel (is_published = true).
// Supprimer = UNIQUEMENT un bien deja archive, apres saisie de sa reference
// (slug, sinon id), verifiee ICI cote serveur. Les fichiers (photos du
// bucket property-images, video R2) ne sont jamais supprimes avec le bien :
// action separee purgePropertyMedia, declenchee explicitement.

export type PropertyLifecycleResult =
  | { ok: true; media?: string[]; purged?: number }
  | { ok: false; error: string };

const PHOTO_BUCKET = "property-images";

function revalidatePropertyPaths(slug: string | null) {
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  for (const l of ["fr", "en", "de"]) {
    revalidatePath(`/${l}`);
    revalidatePath(`/${l}/biens`);
    if (slug) revalidatePath(`/${l}/biens/${slug}`);
  }
  invalidateArchivedPropertyKeys();
}

async function readLifecycleRow(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
) {
  const { data, error } = await supabase
    .from("properties")
    .select("id,slug,archived_at,video_url")
    .eq("id", id)
    .maybeSingle();
  if (error) return { row: null, error: error.message };
  return {
    row: data as { id: string; slug: string | null; archived_at: string | null; video_url: string | null } | null,
    error: null,
  };
}

export async function archiveProperty(id: string): Promise<PropertyLifecycleResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const { row, error } = await readLifecycleRow(supabase, id);
  if (error || !row) return { ok: false, error: error ?? "not_found" };
  const { error: upErr } = await supabase
    .from("properties")
    .update({ is_published: false, archived_at: new Date().toISOString() })
    .eq("id", id);
  if (upErr) return { ok: false, error: upErr.message };
  revalidatePropertyPaths(row.slug);
  return { ok: true };
}

export async function restoreProperty(id: string): Promise<PropertyLifecycleResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const { row, error } = await readLifecycleRow(supabase, id);
  if (error || !row) return { ok: false, error: error ?? "not_found" };
  const { error: upErr } = await supabase
    .from("properties")
    .update({ is_published: true, archived_at: null })
    .eq("id", id);
  if (upErr) return { ok: false, error: upErr.message };
  revalidatePropertyPaths(row.slug);
  return { ok: true };
}

/** Fichiers du bien : chemins du bucket property-images et video R2. */
async function listPropertyMedia(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
  videoUrl: string | null,
): Promise<string[]> {
  const { data } = await supabase.from("property_images").select("url").eq("property_id", id);
  const urls = ((data ?? []) as { url: string }[]).map((r) => r.url);
  if (videoUrl) urls.push(videoUrl);
  return urls;
}

export async function deleteProperty(
  id: string,
  typedReference: string,
): Promise<PropertyLifecycleResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const { row, error } = await readLifecycleRow(supabase, id);
  if (error || !row) return { ok: false, error: error ?? "not_found" };
  // Garde serveur : jamais depuis la liste active, jamais sans la reference.
  if (!row.archived_at) return { ok: false, error: "not_archived" };
  const expected = row.slug || row.id;
  if (typedReference.trim() !== expected) return { ok: false, error: "reference_mismatch" };

  const media = await listPropertyMedia(supabase, id, row.video_url);
  const { error: imgErr } = await supabase.from("property_images").delete().eq("property_id", id);
  if (imgErr) return { ok: false, error: imgErr.message };
  const { error: delErr } = await supabase.from("properties").delete().eq("id", id);
  if (delErr) return { ok: false, error: delErr.message };
  console.info("[admin/properties] bien supprime, fichiers conserves", { id, files: media.length });
  revalidatePropertyPaths(row.slug);
  return { ok: true, media };
}

/**
 * ACTION SEPAREE, jamais appelee par deleteProperty : supprime les fichiers
 * d'un bien ARCHIVE (photos du bucket property-images, video sur R2). Les
 * photos hebergees ailleurs (media.apimo.pro) ne sont pas touchees.
 */
export async function purgePropertyMedia(id: string): Promise<PropertyLifecycleResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const { row, error } = await readLifecycleRow(supabase, id);
  if (error || !row) return { ok: false, error: error ?? "not_found" };
  if (!row.archived_at) return { ok: false, error: "not_archived" };
  const media = await listPropertyMedia(supabase, id, row.video_url);
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const paths = media
    .filter((u) => u.includes(marker))
    .map((u) => decodeURIComponent(u.split(marker)[1].split("?")[0]));
  let purged = 0;
  if (paths.length) {
    const { data, error: rmErr } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    if (rmErr) return { ok: false, error: rmErr.message };
    purged += data?.length ?? 0;
  }
  const r2Base = R2_PUBLIC_URL_BASE;
  if (row.video_url && r2Base && row.video_url.startsWith(`${r2Base}/`) && isR2Configured()) {
    await deleteFromR2(row.video_url.slice(r2Base.length + 1));
    purged += 1;
  }
  return { ok: true, purged };
}
