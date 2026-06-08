// Sprint Apimo Lot B — Mapper Apimo -> properties (transformation pure).
//
// Fonctions PURES, sans effet de bord, sans I/O. Prennent un ApimoProperty
// renvoye par l'API Apimo, retournent un objet pret pour UPSERT dans
// public.properties (Supabase). Le cron Lot C exploitera ces helpers.
//
// Robustesse : chaque champ optionnel/manquant -> defaut sense, JAMAIS de
// crash. Champs critiques manquants (price, city) -> warn discret + valeur
// par defaut, sans bloquer le flux de sync.
//
// IMPORTANT : ce mapping est base sur la doc Apimo officielle + observation
// communaute. Les vraies reponses Apimo peuvent contenir des variantes
// (selon configuration du compte). A re-valider sur les vraies donnees a
// l'activation des cles.

import type {
  ApimoComment,
  ApimoPicture,
  ApimoProperty,
} from "./client";

// ============================================================================
// Helpers internes (lowercase utilities, slug, date normalization).
// ============================================================================

/** Normalise une chaine en kebab-case ASCII (slug-safe). */
function kebab(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Apimo renvoie ses dates au format "YYYY-MM-DD HH:MM:SS" (timezone Europe).
 * On normalise en ISO 8601 UTC. Si la chaine est deja ISO, on la retourne
 * telle quelle. Si non parsable, on retourne null.
 */
export function apimoDateToIso(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  // Si deja ISO (contient 'T' ou se termine par 'Z'), on tente Date direct.
  const tryDirect = new Date(input);
  if (!Number.isNaN(tryDirect.getTime())) {
    return tryDirect.toISOString();
  }
  // Format Apimo "YYYY-MM-DD HH:MM:SS" -> ajouter le 'T' separateur.
  const replaced = input.replace(" ", "T");
  const tryReplaced = new Date(replaced);
  if (!Number.isNaN(tryReplaced.getTime())) {
    return tryReplaced.toISOString();
  }
  return null;
}

/**
 * Extrait le commentaire (description + titre) Apimo pour une langue donnee.
 * Tolere les langages cases mixtes. Retourne null si absent.
 */
function pickComment(
  comments: ApimoComment[] | undefined,
  lang: "fr" | "en" | "de",
): { title: string | null; comment: string | null } {
  if (!Array.isArray(comments)) return { title: null, comment: null };
  const match = comments.find(
    (c) => (c.language ?? "").toLowerCase() === lang,
  );
  if (!match) return { title: null, comment: null };
  return {
    title: match.title?.trim() || null,
    comment: match.comment?.trim() || null,
  };
}

// ============================================================================
// Mappings catalogues (transaction, property_type, publish status).
// ============================================================================

/**
 * Apimo category.id : 1 = Vente, 2 = Location, 3 = Viager, 4 = Location vacances.
 * On garde 'sale' / 'rent' qui correspondent aux valeurs de notre colonne
 * `transaction`. Defaut 'sale' avec log discret en cas d'inconnu.
 */
export function mapTransaction(
  catId: number | undefined,
): "sale" | "rent" {
  if (catId === 2 || catId === 4) return "rent";
  if (catId === 1 || catId === 3) return "sale";
  if (catId !== undefined) {
    console.warn(`[apimo/mapper] category.id ${catId} inconnu, fallback "sale".`);
  }
  return "sale";
}

/**
 * Apimo type.id principal -> label FR (10 categories principales + variantes
 * frequentes). Source : doc Apimo + observation communaute. Le mapping est
 * SOUPLE (fallback "appartement"), reajustable sur les vraies donnees.
 */
const APIMO_TYPE_TO_LABEL: Record<number, string> = {
  1: "appartement",
  2: "maison",
  3: "terrain",
  4: "commerce",
  5: "parking",
  6: "immeuble",
  7: "bureau",
  8: "bateau",
  9: "locaux",
  10: "cave",
  11: "vignoble",
  12: "loft",
  13: "chateau",
};

export function mapPropertyType(typeId: number | undefined): string {
  if (typeId === undefined) return "appartement";
  const label = APIMO_TYPE_TO_LABEL[typeId];
  if (!label) {
    console.warn(
      `[apimo/mapper] type.id ${typeId} inconnu, fallback "appartement".`,
    );
    return "appartement";
  }
  return label;
}

/**
 * Apimo subtype.id : trop variable selon la configuration agence pour un
 * mapping exhaustif. On preserve le nom textuel si Apimo le fournit dans
 * subtype.name, sinon null. A enrichir en V2 si besoin.
 */
export function mapBuildingSubtype(
  subtype: { id?: number; name?: string } | undefined,
): string | null {
  if (!subtype) return null;
  const name = subtype.name?.trim();
  if (name) return kebab(name) || name;
  return null;
}

/**
 * Mappe le statut Apimo (step + status) vers nos flags is_active / is_published.
 *
 * Heuristique conservatrice :
 *  - status.active === false  -> is_active=false, is_published=false
 *  - step.id 3 (compromis) / 4 (vendu) / 5+ -> is_published=false
 *  - sinon publie (is_published=true, is_active=true)
 *
 * A reajuster sur les vraies valeurs Apimo (la nomenclature step varie selon
 * configuration du compte).
 */
export function mapPublishStatus(
  step: { id?: number } | undefined,
  status: { id?: number; active?: boolean } | undefined,
): { is_active: boolean; is_published: boolean } {
  if (status?.active === false) {
    return { is_active: false, is_published: false };
  }
  const stepId = step?.id;
  if (stepId !== undefined && stepId >= 3) {
    return { is_active: true, is_published: false };
  }
  return { is_active: true, is_published: true };
}

// ============================================================================
// Slug + images
// ============================================================================

/**
 * Genere un slug unique non-null pour properties.slug (NOT NULL en DB).
 * Pattern : `<property_type>-<city>-<apimo_id>`.
 * L'apimo_id en suffixe garantit l'unicite meme si 2 biens partagent type+ville.
 */
export function buildApimoSlug(apimo: ApimoProperty): string {
  const propertyType = mapPropertyType(apimo.type?.id);
  const cityName =
    apimo.city?.name ?? apimo.address?.city ?? apimo.district?.name ?? "lu";
  const parts = [kebab(propertyType), kebab(cityName), String(apimo.id)];
  return parts.filter(Boolean).join("-");
}

/**
 * Extrait les images depuis ApimoProperty.pictures[] sous la forme
 * { url, sort } prete pour INSERT dans property_images.
 * Prefere url_large > url > url_medium > url_small. Filtre les entries
 * sans URL exploitable.
 */
export function extractApimoImages(
  apimo: ApimoProperty,
): Array<{ url: string; sort: number }> {
  const pictures = apimo.pictures;
  if (!Array.isArray(pictures)) return [];
  return pictures
    .map((p: ApimoPicture, idx: number) => {
      const url = p.url_large || p.url || p.url_medium || p.url_small || "";
      const sort = typeof p.rank === "number" ? p.rank : idx;
      return { url: url.trim(), sort };
    })
    .filter((img) => img.url.length > 0);
}

// ============================================================================
// Mapping principal Apimo -> ligne properties (UPSERT-ready).
// ============================================================================

/** Forme du payload pour UPSERT dans public.properties (colonnes reelles). */
export interface PropertyUpsertRow {
  apimo_id: number;
  slug: string;
  transaction: "sale" | "rent";
  property_type: string;
  building_subtype: string | null;
  country: string;
  city: string;
  title_fr: string;
  title_en: string | null;
  title_de: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_de: string | null;
  price: number | null;
  price_value: number | null;
  surface: number | null;
  living_surface: number | null;
  land_surface: number | null;
  terrace_surface: number | null;
  usable_surface: number | null;
  area_total: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  floor: string | null;
  year: number | null;
  year_built: number | null;
  energy: string | null;
  thermal: string | null;
  ges: string | null;
  is_active: boolean;
  is_published: boolean;
  updated_at: string | null;
}

/**
 * Transforme un ApimoProperty en ligne properties UPSERT-ready.
 *
 * Robustesse : tout champ optionnel -> defaut sense. Les seuls champs NOT NULL
 * cote DB (slug, transaction, property_type, country, city, title_fr) sont
 * TOUJOURS remplis (titre auto-genere si pas de comments Apimo).
 *
 * @param apimo - bien Apimo brut (forme partielle, voir client.ts)
 * @returns objet pret pour `.upsert(payload, { onConflict: "apimo_id" })`
 */
export function mapApimoToProperty(apimo: ApimoProperty): PropertyUpsertRow {
  // --- Identite ---
  const apimo_id = apimo.id;
  const transaction = mapTransaction(apimo.category?.id);
  const property_type = mapPropertyType(apimo.type?.id);
  const building_subtype = mapBuildingSubtype(apimo.subtype);

  // --- Localisation ---
  const country = (apimo.address?.country ?? "LU").trim().toUpperCase().slice(0, 2);
  const city =
    apimo.city?.name?.trim() ||
    apimo.address?.city?.trim() ||
    apimo.district?.name?.trim() ||
    "Luxembourg";

  // --- i18n title + description ---
  const fr = pickComment(apimo.comments, "fr");
  const en = pickComment(apimo.comments, "en");
  const de = pickComment(apimo.comments, "de");
  // title_fr est NOT NULL -> fallback auto si comments absents.
  const title_fr =
    fr.title || `${property_type.charAt(0).toUpperCase()}${property_type.slice(1)} à ${city}`;

  // --- Prix ---
  const price = typeof apimo.price?.value === "number" ? apimo.price.value : null;
  if (price === null) {
    console.warn(
      `[apimo/mapper] Bien ${apimo_id} sans price.value, price=null.`,
    );
  }

  // --- Surfaces ---
  const livingArea =
    typeof apimo.area?.value === "number" ? apimo.area.value : null;
  const land_surface =
    typeof apimo.area_land?.value === "number"
      ? apimo.area_land.value
      : typeof apimo.plot?.net_floor === "number"
        ? apimo.plot.net_floor
        : null;
  const terrace_surface =
    typeof apimo.area_terrace?.value === "number"
      ? apimo.area_terrace.value
      : null;
  const usable_surface =
    typeof apimo.area_usable?.value === "number"
      ? apimo.area_usable.value
      : null;
  const area_total =
    typeof apimo.area_total?.value === "number"
      ? apimo.area_total.value
      : null;

  // --- Pieces / parking ---
  const bedrooms = typeof apimo.bedrooms === "number" ? apimo.bedrooms : null;
  const bathrooms = typeof apimo.bathrooms === "number" ? apimo.bathrooms : null;
  const parking = typeof apimo.parkings === "number" ? apimo.parkings : null;

  // --- Etage ---
  const floor =
    apimo.floor?.name?.trim() ||
    (typeof apimo.floor?.value === "number"
      ? String(apimo.floor.value)
      : null);

  // --- Annee + energie ---
  const year = typeof apimo.year === "number" ? apimo.year : null;
  const energy = apimo.energy?.value?.trim() || null;
  const thermal = apimo.energy?.thermal?.trim() || null;
  const ges = apimo.energy?.ges?.trim() || null;

  // --- Statut publie ---
  const { is_active, is_published } = mapPublishStatus(apimo.step, apimo.status);

  // --- Slug + updated_at ---
  const slug = buildApimoSlug(apimo);
  const updated_at = apimoDateToIso(apimo.updated_at);

  // Warn discret si city absente initialement (fallback "Luxembourg" applique).
  if (!apimo.city?.name && !apimo.address?.city && !apimo.district?.name) {
    console.warn(
      `[apimo/mapper] Bien ${apimo_id} sans city, fallback "Luxembourg".`,
    );
  }

  return {
    apimo_id,
    slug,
    transaction,
    property_type,
    building_subtype,
    country,
    city,
    title_fr,
    title_en: en.title,
    title_de: de.title,
    description_fr: fr.comment,
    description_en: en.comment,
    description_de: de.comment,
    price,
    price_value: price,
    surface: livingArea,
    living_surface: livingArea,
    land_surface,
    terrace_surface,
    usable_surface,
    area_total,
    bedrooms,
    bathrooms,
    parking,
    floor,
    year,
    year_built: year,
    energy,
    thermal,
    ges,
    is_active,
    is_published,
    updated_at,
  };
}
