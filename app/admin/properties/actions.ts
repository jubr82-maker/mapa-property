"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { PROPERTIES_LIST_TAG } from "@/lib/data";
import {
  PROPERTY_TYPE_FAMILIES,
  PROPERTY_STATES,
  TRANSACTION_TYPES,
} from "@/lib/taxonomy/property-types";

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

export async function updateProperty(
  id: string,
  data: {
    title_fr?: string | null;
    description_fr?: string | null;
    price?: number | null;
    badge?: string | null;
    badge_size?: string | null;
    badge_position?: string | null;
  },
) {
  const supabase = await createSupabaseServerClient();
  const update: Record<string, unknown> = {};
  if (data.title_fr !== undefined) {
    const t = (data.title_fr ?? "").trim();
    update.title_fr = t.length > 0 ? t : null;
  }
  if (data.description_fr !== undefined) {
    const d = (data.description_fr ?? "").trim();
    update.description_fr = d.length > 0 ? d : null;
  }
  if (data.price !== undefined) {
    update.price =
      data.price == null || Number.isNaN(data.price) ? null : data.price;
  }
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
  if (error) throw new Error(error.message);
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
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
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

function num(value: FormDataEntryValue | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    transaction,
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
        error?.message ??
        "Erreur d'enregistrement (vérifier que la migration 20260904_properties_saisie_manuelle.sql est appliquée).",
    };
  }

  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  redirect(`/admin/properties/${data.id}?created=1`);
}
