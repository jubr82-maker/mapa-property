import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "./supabase-server";
import { getLocalizedField } from "./i18n-field";
import { publicCoverUrl, selectPublicImages } from "./property-images";
import { effectiveBadge } from "./listing/families";
import type {
  BlogPost,
  InterestRates,
  Property,
  PropertyImage,
  PropertyOffmarket,
  Review,
} from "./types";

const safeArray = <T>(value: T[] | null | undefined): T[] => value ?? [];

export async function fetchFeaturedProperties(limit = 6): Promise<Property[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("featured_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[data] fetchFeaturedProperties", error.message);
    return [];
  }
  return safeArray<Property>(data as Property[] | null);
}

export type PropertyWithCover = Property & { cover_url: string | null };

export async function fetchFeaturedPropertiesWithCover(
  limit = 6,
): Promise<PropertyWithCover[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*, property_images(url, sort)")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("featured_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[data] fetchFeaturedPropertiesWithCover", error.message);
    return [];
  }
  type Row = Property & { property_images: { url: string; sort: number | null }[] | null };
  return ((data as Row[] | null) ?? []).map((row) => ({
    ...row,
    cover_url: publicCoverUrl(row.property_images),
  }));
}

// Coups de cœur unifiés (CHANTIER 5 V3) : Apimo is_featured + Off-Market
// is_coup_de_coeur, limité à 6, classés par created_at DESC. Type pivot
// "HomeFeatured" pour permettre des liens distincts (/biens/[slug] vs
// /off-market/[id]).
export type HomeFeatured = {
  id: string;
  kind: "apimo" | "offmarket";
  slug: string | null;
  title: string | null;
  city: string | null;
  country: string | null;
  price: number | null;
  price_label: string | null;
  cover_url: string | null;
  surface: number | null;
  bedrooms: number | null;
  created_at: string | null;
  // Sprint badges commerciaux : badge admin-driven sur biens apimo. Pour
  // offmarket : toujours null (offmarket conserve sa pilule cuivre dédiée
  // côté FeaturedCarousel, géré séparément).
  badge: string | null;
  badge_size: "S" | "M" | "L" | null;
  badge_position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | null;
};

export async function fetchHomeFeatured(
  limit = 6,
  locale = "fr",
): Promise<HomeFeatured[]> {
  const sb = supabaseServer();

  // Sprint sécurisation off-market (étape 2) : lecture publique via la VIEW
  // redactée properties_offmarket_public (jamais la table brute côté anon).
  // La VIEW filtre déjà is_published + status='published', gate les médias
  // sur photos_locked et anonymise la ville. Colonnes renommées :
  // city_label->city_anonymized, surface_hab->surface_habitable,
  // bedrooms->chambres. Les title_en/_de existent toujours dans la VIEW.
  const offmarketColsView =
    "id,reference,title,title_en,title_de,city_anonymized,country,price_label,price_display,surface_habitable,chambres,cover_image_url,created_at,is_coup_de_coeur,status";

  const [apimoRes, offmarketRes] = await Promise.all([
    withMandateColumn((extra) =>
      sb
        .from("properties")
        .select(`id,slug,title_fr,title_en,title_de,city,country,price,surface,bedrooms,created_at,badge,badge_size,badge_position${extra},property_images(url,sort)`)
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(limit),
    ),
    sb
      .from("properties_offmarket_public")
      .select(offmarketColsView)
      .eq("is_coup_de_coeur", true)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (apimoRes.error) console.error("[data] fetchHomeFeatured apimo", apimoRes.error.message);
  if (offmarketRes.error) console.error("[data] fetchHomeFeatured offmarket", offmarketRes.error.message);

  type ApimoRow = {
    id: string;
    slug: string | null;
    title_fr: string | null;
    title_en: string | null;
    title_de: string | null;
    city: string | null;
    country: string | null;
    price: number | null;
    surface: number | null;
    bedrooms: number | null;
    created_at: string | null;
    badge: string | null;
    badge_size: "S" | "M" | "L" | null;
    badge_position:
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right"
      | null;
    mandate_type?: string | null;
    property_images: { url: string; sort: number | null }[] | null;
  };
  type OffmarketRow = {
    id: string;
    reference: string | null;
    title: string | null;
    title_en?: string | null;
    title_de?: string | null;
    city_anonymized: string | null;
    country: string | null;
    price_label: string | null;
    price_display: string | null;
    surface_habitable: number | null;
    chambres: number | null;
    cover_image_url: string | null;
    created_at: string | null;
    is_coup_de_coeur: boolean | null;
    status: string | null;
  };

  const apimo: HomeFeatured[] = ((apimoRes.data as ApimoRow[] | null) ?? []).map((row) => {
    return {
      id: row.id,
      kind: "apimo",
      slug: row.slug,
      title: getLocalizedField(row, "title", locale) || row.title_fr,
      city: row.city,
      country: row.country,
      price: row.price,
      price_label: row.price
        ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(row.price) + " €"
        : null,
      cover_url: publicCoverUrl(row.property_images),
      surface: row.surface,
      bedrooms: row.bedrooms,
      created_at: row.created_at,
      badge: effectiveBadge(row.badge, row.mandate_type),
      badge_size: row.badge_size,
      badge_position: row.badge_position,
    };
  });

  const offmarket: HomeFeatured[] = ((offmarketRes.data as OffmarketRow[] | null) ?? [])
    // La VIEW garantit deja is_published + status='published' et filtre
    // is_coup_de_coeur (.eq ci-dessus) ; filtre JS defensif conserve.
    .filter((row) => row.is_coup_de_coeur === true)
    .map((row) => ({
      id: row.id,
      kind: "offmarket",
      slug: row.reference,
      title: getLocalizedField(row, "title", locale) || row.title,
      city: row.city_anonymized,
      country: row.country,
      price: null,
      price_label: "Prix sur demande", // BUG 1 : off-market confidentiel — jamais le prix réel
      cover_url: row.cover_image_url,
      surface: row.surface_habitable,
      bedrooms: row.chambres,
      created_at: row.created_at,
      // Offmarket : aucun badge commercial (signalétique Off-Market
      // cuivre top-right gérée séparément dans FeaturedCarousel).
      badge: null,
      badge_size: null,
      badge_position: null,
    }));

  const all = [...apimo, ...offmarket]
    .sort((a, b) => {
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bd - ad;
    })
    .slice(0, limit);

  return all;
}

// Tag de cache pour l'ensemble "liste + cartes" des biens publiés. Toute
// Server Action admin qui modifie un bien (properties/actions.ts,
// properties/[id]/photos/actions.ts) doit appeler
// revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 }) après écriture, sinon
// le site public sert des données périmées jusqu'à un redéploiement.
export const PROPERTIES_LIST_TAG = "properties";

// Colonnes réellement consommées par PropertyCard (grille /biens, biens
// similaires sur la fiche) : identité + i18n titre + specs affichées +
// champs de filtrage (property_type, transaction, country, city, price,
// bedrooms, surface). PAS les descriptions FR/EN/DE (inutiles en liste,
// coûteuses en payload) ni les autres colonnes de `properties`. Si un
// composant listé ci-dessus a besoin d'un champ absent d'ici, l'ajouter
// explicitement — ne pas revenir à select("*").
const PROPERTY_CARD_COLUMNS =
  "id, slug, transaction, property_type, country, city, title_fr, title_en, title_de, price, surface, bedrooms, bathrooms, energy, badge, badge_size, badge_position, updated_at";

// Type de mandat (SQL 16) : demande en plus des colonnes de la liste ; tant
// que la colonne manque (PGRST204 / 42703), nouvel essai sans elle plutot
// qu'une liste vide.
const MISSING_COLUMN_CODES = new Set(["PGRST204", "42703"]);
async function withMandateColumn<R extends { error: { code?: string } | null }>(run: (extra: string) => PromiseLike<R>): Promise<R> {
  const first = await run(",mandate_type");
  if (first.error && MISSING_COLUMN_CODES.has(first.error.code ?? "")) return run("");
  return first;
}

/**
 * Sprint OPTIM-BIENS-1 — mise en cache (tag-only invalidation, comme
 * lib/site-content.ts) : sans ça, chaque changement de filtre sur /biens
 * refaisait un aller-retour Supabase complet. `select` allégé aux seules
 * colonnes de PROPERTY_CARD_COLUMNS + url et ordre des photos (pas de
 * limite a 1 : la photo principale publique est la premiere photo de
 * l'admin, images Apimo ecartees, cf. lib/property-images.ts).
 */
const fetchPropertiesWithCoverCached = unstable_cache(
  async (): Promise<PropertyWithCover[]> => {
    const sb = supabaseServer();
    const { data, error } = await withMandateColumn((extra) =>
      sb
        .from("properties")
        .select(`${PROPERTY_CARD_COLUMNS}${extra}, property_images(url, sort)`)
        .eq("is_published", true),
    );
    if (error) {
      console.error("[data] fetchAllPropertiesWithCover", error.message);
      return [];
    }
    // Row = forme réelle du select allégé (pas Property complet — cf.
    // commentaire PROPERTY_CARD_COLUMNS). Cast final assumé : les
    // consommateurs de PropertyWithCover issus de cette fonction ne
    // doivent lire que les champs de PROPERTY_CARD_COLUMNS + cover_url.
    type Row = Pick<
      Property,
      | "id"
      | "slug"
      | "transaction"
      | "property_type"
      | "country"
      | "city"
      | "title_fr"
      | "title_en"
      | "title_de"
      | "price"
      | "surface"
      | "bedrooms"
      | "bathrooms"
      | "energy"
      | "badge"
      | "badge_size"
      | "badge_position"
      | "mandate_type"
    > & { property_images: { url: string; sort: number | null }[] | null };
    return ((data as unknown as Row[] | null) ?? []).map(
      (row) =>
        ({
          ...row,
          badge: effectiveBadge(row.badge, row.mandate_type),
          cover_url: publicCoverUrl(row.property_images),
        }) as unknown as PropertyWithCover,
    );
  },
  ["properties-with-cover"],
  { revalidate: false, tags: [PROPERTIES_LIST_TAG] },
);

export async function fetchAllPropertiesWithCover(): Promise<PropertyWithCover[]> {
  return fetchPropertiesWithCoverCached();
}

export async function fetchPublishedProperties(): Promise<Property[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[data] fetchPublishedProperties", error.message);
    return [];
  }
  return safeArray<Property>(data as Property[] | null);
}

export async function fetchPropertyBySlug(slug: string): Promise<Property | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[data] fetchPropertyBySlug", error.message);
    return null;
  }
  return (data as Property | null) ?? null;
}

// Resolver générique pour la route /biens/[slug]. Accepte slug textuel,
// UUID Supabase (id) ou identifiant numérique Apimo (apimo_ref). Si rien
// ne matche dans `properties`, tente un fallback off-market par id ou
// reference, et renvoie une struct Property minimale shape-compatible.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^[0-9]+$/;

// Codes d'erreur Postgres/PostgREST « bénins » = la ligne n'existe
// simplement pas / requête inapplicable (PAS une panne) : on les traite
// comme « introuvable », jamais comme erreur transitoire.
//   PGRST116 = 0 ligne (maybeSingle)   22P02 = uuid/text invalide
//   PGRST204 / 42703 = colonne absente
const BENIGN_PG_CODES = new Set(["PGRST116", "22P02", "PGRST204", "42703"]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Un passage de résolution. `transient` = au moins une requête a échoué
// pour une raison NON bénigne (timeout 57014, réseau, 5xx, RLS, …) ->
// l'appelant doit retenter avant de conclure à un 404 (BUG T1 : la
// fiche s'ouvrait au reload car le 1er SSR tombait sur un échec
// transitoire silencieusement transformé en notFound()).
async function resolvePropertyOnce(
  identifier: string,
): Promise<{ data: Property | null; transient: boolean }> {
  const sb = supabaseServer();
  const isNumeric = NUMERIC_RE.test(identifier);
  let transient = false;

  const note = (where: string, error: { code?: string; message: string }) => {
    if (error.code && BENIGN_PG_CODES.has(error.code)) return;
    transient = true;
    console.error(`[data] fetchPropertyByIdOrSlug ${where}`, error.message);
  };

  // 1) Match strict slug (cas majoritaire)
  {
    const { data, error } = await sb
      .from("properties")
      .select("*")
      .eq("slug", identifier)
      .eq("is_published", true)
      .maybeSingle();
    if (!error && data) return { data: data as Property, transient: false };
    if (error) note("slug", error);
  }

  // 2) Match direct sur `id` (UUID Supabase ou identifiant Apimo numérique)
  {
    const { data, error } = await sb
      .from("properties")
      .select("*")
      .eq("id", identifier)
      .eq("is_published", true)
      .maybeSingle();
    if (!error && data) return { data: data as Property, transient: false };
    if (error) note("id", error);
  }

  // 3) Numérique → potentiel apimo_ref / apimo_id
  if (isNumeric) {
    for (const col of ["apimo_ref", "apimo_id"] as const) {
      const { data, error } = await sb
        .from("properties")
        .select("*")
        .eq(col, identifier)
        .eq("is_published", true)
        .maybeSingle();
      if (!error && data) return { data: data as Property, transient: false };
      if (error) note(col, error);
    }
  }

  return { data: null, transient };
}

// Sprint OPTIM-SEO-1 : cache() React — biens/[slug]/page.tsx appelle cette
// fonction à la fois depuis generateMetadata() et depuis le composant de
// page (pour la même requête). Sans ce cache request-scope, chaque visite
// de fiche bien déclencherait 2 aller-retours Supabase identiques.
export const fetchPropertyByIdOrSlug = cache(
  async (identifier: string): Promise<Property | null> => {
    let res = await resolvePropertyOnce(identifier);
    if (res.data) return res.data;

    // BUG T1 : on ne renvoie `null` (→ notFound) QUE si la résolution est
    // « propre et vide ». En cas d'échec transitoire, un seul retry après
    // un court délai (cold start Supabase / pic réseau) avant d'abandonner.
    if (res.transient) {
      await sleep(300);
      res = await resolvePropertyOnce(identifier);
      if (res.data) return res.data;
      if (res.transient) {
        console.error(
          `[data] fetchPropertyByIdOrSlug "${identifier}" — échec transitoire après retry`,
        );
      }
    }
    return null;
  },
);

// Idem : cache() request-scope, même raison que fetchPropertyByIdOrSlug
// (generateMetadata a besoin de l'image de cover pour openGraph).
export const fetchPropertyImages = cache(
  async (propertyId: string): Promise<PropertyImage[]> => {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("property_images")
      .select("*")
      .eq("property_id", propertyId)
      .order("sort", { ascending: true });
    if (error) {
      console.error("[data] fetchPropertyImages", error.message);
      return [];
    }
    return selectPublicImages(safeArray<PropertyImage>(data as PropertyImage[] | null));
  },
);

export async function fetchOffmarketList(
  locale = "fr",
): Promise<PropertyOffmarket[]> {
  const sb = supabaseServer();
  // Lecture publique EXCLUSIVEMENT via la VIEW redactée (jamais la table
  // brute côté anon). Sprint sécurisation off-market étape 2.
  const { data, error } = await sb
    .from("properties_offmarket_public")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[data] fetchOffmarketList", error.message);
    return [];
  }
  return mapPublicRows(data, locale);
}

export async function fetchOffmarketById(
  id: string,
  locale = "fr",
): Promise<PropertyOffmarket | null> {
  const sb = supabaseServer();
  // Lecture publique EXCLUSIVEMENT via la VIEW redactée (jamais la table
  // brute). La VIEW filtre deja is_published + status='published' : un id
  // non publié ou inexistant -> maybeSingle renvoie null -> on renvoie null
  // proprement (pas d'erreur). Sprint sécurisation off-market étape 2.
  const { data, error } = await sb
    .from("properties_offmarket_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[data] fetchOffmarketById", error.message);
    return null;
  }
  if (!data) return null;
  return mapPublicRows([data], locale)[0] ?? null;
}

/**
 * Sprint UI-I18N : helper local pour servir highlights_en/_de selon la
 * locale. Fallback cascade :
 *   highlights_<locale> non-vide -> highlights (base FR) -> null.
 * Note : "fr" lit `highlights` directement (la base est en FR, pas de
 * colonne highlights_fr).
 */
function getLocalizedHighlights(
  r: Record<string, unknown>,
  locale: string,
): string[] | null {
  const loc = ["en", "de"].includes(locale) ? locale : null;
  if (loc) {
    const candidate = r[`highlights_${loc}`];
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate as string[];
    }
  }
  return (r.highlights as string[] | null) ?? null;
}

function mapPublicRows(
  rows: unknown[] | null,
  locale = "fr",
): PropertyOffmarket[] {
  if (!rows) return [];
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      // BUG T5 : titre localisé si title_en/title_de présents (migration
      // 20260518_offmarket_i18n_titles), sinon fallback FR.
      title:
        getLocalizedField(r, "title", locale) ||
        (r.title as string | null) ||
        null,
      internal_ref: (r.reference as string | null) ?? (r.internal_ref as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      city_label:
        (r.city_anonymized as string | null) ??
        (r.city_label as string | null) ??
        null,
      surface_hab:
        (r.surface_habitable as number | null) ??
        (r.surface_hab as number | null) ??
        null,
      surface_terrain: (r.surface_terrain as number | null) ?? null,
      bedrooms:
        (r.chambres as number | null) ?? (r.bedrooms as number | null) ?? null,
      bathrooms:
        (r.salles_de_bain as number | null) ??
        (r.bathrooms as number | null) ??
        null,
      energy_class:
        (r.classe_energetique as string | null) ??
        (r.energy_class as string | null) ??
        null,
      // POL3-5 : NE lit JAMAIS price_label (legacy "Prix sur demande" en
      // dur) ni price_custom_text. Le composant PropertyPrice calcule le
      // libellé à partir des champs bruts (price_on_demand/mode/min/max/
      // estimate). price_display n'est conservé que s'il est numérique ;
      // une chaîne non numérique legacy est ignorée.
      price_display:
        r.price_display == null
          ? null
          : typeof r.price_display === "number"
            ? String(r.price_display)
            : (r.price_display as string),
      // Sprint HTML-RENDERING C4 : utiliser getLocalizedField pour
      // selectionner la variante locale (short_pitch_en/_de,
      // description_en/_de — colonnes ajoutees migration
      // 20260526_offmarket_i18n_full). Fallback cascade : <field>_<locale>
      // -> <field>_fr -> <field>. Permet a la page detail de servir
      // EN/DE sur /en /de au lieu du FR systematique.
      // Les colonnes legacy short_description / full_description (FR
      // uniquement) restent une derniere ligne de defense.
      short_pitch:
        getLocalizedField(r, "short_pitch", locale) ||
        (r.short_description as string | null) ||
        (r.short_pitch as string | null) ||
        null,
      description:
        getLocalizedField(r, "description", locale) ||
        (r.full_description as string | null) ||
        (r.description as string | null) ||
        null,
      // Sprint UI-I18N : highlights traduits via colonnes highlights_en/_de
      // (migration UI-I18N + backfill Mistral). Fallback cascade :
      //   highlights_<locale> non-vide -> base highlights (FR) -> null.
      highlights: getLocalizedHighlights(r, locale),
      cover_image_url: (r.cover_image_url as string | null) ?? null,
      gallery_urls: (r.gallery_urls as string[] | null) ?? null,
      // POL2-10 : tolérant — colonne absente (migration non appliquée)
      // ⇒ undefined ⇒ null ⇒ le composant PropertyVideo ne rend rien.
      video_url: (r.video_url as string | null) ?? null,
      is_published: true,
      display_order: (r.display_order as number | null) ?? null,
      price_mode: (r.price_mode as string | null) ?? null,
      price_estimate: (r.price_estimate as number | null) ?? null,
      price_min: (r.price_min as number | null) ?? null,
      price_max: (r.price_max as number | null) ?? null,
      price_custom_text: (r.price_custom_text as string | null) ?? null,
      // POL2-9 : tolérant — colonne absente (migration non appliquée) ⇒
      // undefined ⇒ null ⇒ traité comme false (prix réel affiché).
      price_on_demand:
        typeof r.price_on_demand === "boolean"
          ? (r.price_on_demand as boolean)
          : null,
      // AJOUT 2026-09-08 : tolérant — colonne absente (migration non
      // appliquée) ⇒ undefined ⇒ null ⇒ la fiche retombe sur "Off-Market"
      // via le fallback côté page.
      transaction:
        r.transaction === "sale" || r.transaction === "rent"
          ? (r.transaction as "sale" | "rent")
          : null,
    };
  });
}

export async function fetchPublishedReviews(limit = 12): Promise<Review[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("reviews")
    .select("id,name,rating,comment,comment_en,comment_de,source_lang,review_date,is_published")
    .eq("is_published", true)
    .order("review_date", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data] fetchPublishedReviews", error.message);
    return [];
  }
  return safeArray<Review>(data as Review[] | null);
}

export async function fetchLatestBlogPosts(limit = 3): Promise<BlogPost[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data] fetchLatestBlogPosts", error.message);
    return [];
  }
  return safeArray<BlogPost>(data as BlogPost[] | null);
}

export async function fetchAllBlogPosts(): Promise<BlogPost[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) {
    console.error("[data] fetchAllBlogPosts", error.message);
    return [];
  }
  return safeArray<BlogPost>(data as BlogPost[] | null);
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[data] fetchBlogPostBySlug", error.message);
    return null;
  }
  return (data as BlogPost | null) ?? null;
}

export async function fetchLatestInterestRates(): Promise<InterestRates | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("interest_rates")
    .select("*")
    .order("reference_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[data] fetchLatestInterestRates", error.message);
    return null;
  }
  return (data as InterestRates | null) ?? null;
}
