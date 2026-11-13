// Invalidation des pages publiques (oct. 2026, quotas Vercel, voir
// docs/vercel-quotas.md). Regle : ne regenerer QUE les pages qui affichent
// le contenu modifie. Jamais le layout entier, jamais toutes les fiches ni
// toutes les villes d'un coup : chaque page regeneree est une ecriture ISR
// facturee (Vercel Hobby : 200 000 par mois).
//
// Bien modifie :
//   - sa fiche dans les trois langues (adresse actuelle, et l'ancienne si
//     elle change) ;
//   - sa page de ville, et l'ancienne si elle change (etiquette
//     city-properties:<ville>) : une ville etrangere devient indexable des
//     son premier bien publie et repasse en noindex sans bien
//     (lib/city-indexing.ts) ;
//   - la liste des biens et le sitemap (etiquette "properties") ; depuis
//     nov. 2026 aussi la page des marches actifs (3 pages : elle ne liste
//     que les villes indexables, qui dependent des biens publies) ;
//   - l'accueil seulement si le bien y figure (mis en avant) ;
//   - les blocs "biens similaires" et "Autres biens" seulement des fiches
//     qui montrent le bien (avant ou apres), et seulement si un champ des
//     cartes change (etiquette similar-of:<bien>).
import { revalidatePath, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROPERTIES_LIST_TAG, PROPERTIES_SIMILAR_TAG, cityPropertiesTag, fetchOthersFor, fetchPublishedPropertiesFresh, fetchSimilarFor, similarTag } from "@/lib/data";
import { pickSimilar } from "@/lib/similar-properties";
import { pickOtherProperties } from "@/lib/other-properties";
import { localizedUrls, scheduleIndexNow } from "@/lib/indexnow";
import { blogSlugLower } from "@/lib/blog/slug";
import { revalidateSitemaps } from "@/lib/sitemaps";
import { propertyPaths } from "@/lib/listing/property-paths";
import { cityForPlace, cityForProperty } from "@/lib/internal-links";

const LOCALES = ["fr", "en", "de"] as const;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

/** Colonnes lues avant et apres une modification (fiche, ville, cartes). */
export const PROPERTY_REVAL_COLUMNS =
  "id, slug, transaction, property_type, country, city, title_fr, title_en, title_de, price, price_on_demand, surface, living_surface, bedrooms, bathrooms, energy, badge, badge_size, badge_position, mandate_type, is_published, is_featured, city_page:listing_data->facts->>city_page, city_commune:listing_data->facts->>city_commune";

export type PropertyRevalRow = {
  id: string;
  slug: string | null;
  property_type: string | null;
  transaction: string | null;
  bedrooms: number | null;
  surface: number | null;
  living_surface?: number | null;
  city: string | null;
  price: number | null;
  price_on_demand?: boolean | null;
  is_published?: boolean | null;
  is_featured?: boolean | null;
  city_page?: string | null;
  city_commune?: string | null;
  [k: string]: unknown;
};

/** Etat d'un bien, lu avec le client de l'admin (jamais la cle serveur). */
export async function readPropertyRevalRow(supabase: SupabaseClient, id: string): Promise<PropertyRevalRow | null> {
  // Bandeaux (SQL 35) lus en plus pour detecter leur changement sur les
  // cartes ; tant que les colonnes manquent, lecture sans elles.
  let { data, error } = await supabase.from("properties").select(`${PROPERTY_REVAL_COLUMNS}, status_banner, banner_position, banner_color`).eq("id", id).maybeSingle();
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    ({ data, error } = await supabase.from("properties").select(PROPERTY_REVAL_COLUMNS).eq("id", id).maybeSingle());
  }
  if (error) {
    console.error("[revalidate] lecture du bien", { code: error.code ?? null });
    return null;
  }
  return (data as PropertyRevalRow | null) ?? null;
}

/** Un champ affiche sur les cartes (biens similaires) a-t-il change ? */
export function cardFieldsChanged(before: PropertyRevalRow | null, after: PropertyRevalRow | null): boolean {
  if (!before || !after) return true;
  const pick = (r: PropertyRevalRow) => JSON.stringify({ ...r, is_featured: undefined });
  return pick(before) !== pick(after);
}

/**
 * Regenere seulement les pages publiques d'un bien modifie. `rows` : etat
 * avant et apres (l'un peut manquer : creation, suppression). Sans ligne
 * lisible, repli prudent : liste, sitemap et biens similaires.
 */
export async function revalidatePropertyChange(
  rows: (PropertyRevalRow | null | undefined)[],
  opts: { cards?: boolean } = {},
): Promise<void> {
  const list = rows.filter((r): r is PropertyRevalRow => Boolean(r));
  const fichePaths = new Set<string>();
  const citySlugs = new Set<string>();
  for (const r of list) {
    if (r.slug) {
      const paths = propertyPaths({
        slug: r.slug,
        property_type: r.property_type,
        transaction: r.transaction,
        bedrooms: r.bedrooms,
        surface: r.surface,
        living_surface: r.living_surface ?? null,
        city: r.city,
        price: r.price,
        price_on_demand: r.price_on_demand ?? false,
      });
      for (const l of LOCALES) fichePaths.add(`/${l}${paths[l]}`);
    }
    const city = cityForProperty({ city: r.city, country: typeof r.country === "string" ? r.country : null, city_page: r.city_page ?? null, city_commune: r.city_commune ?? null });
    if (city) citySlugs.add(city.slug);
  }
  for (const p of fichePaths) revalidatePath(p);
  for (const slug of citySlugs) revalidateTag(cityPropertiesTag(slug), { expire: 0 });
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  // Sitemaps par type (nov. 2026) : biens et villes (indexabilite).
  revalidateSitemaps(["biens", "villes"]);
  if (list.some((r) => r.is_featured)) for (const l of LOCALES) revalidatePath(`/${l}`);
  if (list.length === 0) revalidateTag(PROPERTIES_SIMILAR_TAG, { expire: 0 });
  else if (opts.cards) await revalidateSimilarContaining(list.map((r) => r.id));

  // IndexNow : fiches publiees et liste des biens, apres la reponse.
  if (list.some((r) => r.is_published)) {
    scheduleIndexNow([...localizedUrls("/biens"), ...[...fichePaths].map((p) => `${SITE_URL}${p}`)]);
  }
}

/**
 * Bloc "biens similaires" : la fiche du bien elle-meme et seulement les
 * fiches dont le bloc contient le bien, avant (cache actuel) ou apres
 * (liste fraiche) la modification. Liste illisible : toutes, par prudence.
 */
async function revalidateSimilarContaining(ids: string[]): Promise<void> {
  const changed = new Set(ids);
  for (const id of ids) revalidateTag(similarTag(id), { expire: 0 });
  let fresh;
  try {
    fresh = await fetchPublishedPropertiesFresh();
  } catch {
    revalidateTag(PROPERTIES_SIMILAR_TAG, { expire: 0 });
    return;
  }
  for (const f of fresh) {
    if (changed.has(f.id)) continue;
    // Sans type : la fiche calcule son bloc avec le badge brut, la liste
    // des cartes porte le badge affiche ; cle de cache differente, donc
    // regeneree par prudence.
    if (!f.property_type) {
      revalidateTag(similarTag(f.id), { expire: 0 });
      continue;
    }
    // Biens similaires et « Autres biens » (nov. 2026), meme etiquette.
    const similarAfter = pickSimilar(f, fresh);
    const othersAfter = pickOtherProperties(f, fresh, { exclude: similarAfter.map((p) => p.id) });
    const after = [...similarAfter, ...othersAfter].some((p) => changed.has(p.id));
    // Avant : lu dans le cache des blocs (lecture en base seulement si absent).
    const before = after || (await fetchSimilarFor(f)).some((p) => changed.has(p.id)) || (await fetchOthersFor(f)).some((p) => changed.has(p.id));
    if (after || before) revalidateTag(similarTag(f.id), { expire: 0 });
  }
}

/** Accueil seul (bien mis en avant ou retire de l'accueil). */
export function revalidateHomePages(): void {
  for (const l of LOCALES) revalidatePath(`/${l}`);
}

/**
 * Article du blog modifie : liste du blog, l'article (avant et apres un
 * changement d'adresse), l'accueil (apercu du blog), le sitemap et
 * seulement les pages des communes de l'article (avant et apres).
 */
export function revalidateBlogChange(change: { slugs?: (string | null | undefined)[]; communes?: (string | null | undefined)[] } = {}): void {
  const slugs = [...new Set((change.slugs ?? []).filter((s): s is string => Boolean(s)).map(blogSlugLower))];
  for (const l of LOCALES) {
    revalidatePath(`/${l}/blog`);
    revalidatePath(`/${l}`);
    for (const s of slugs) revalidatePath(`/${l}/blog/${s}`);
  }
  const cities = new Set((change.communes ?? []).map((c) => cityForPlace(c)?.slug).filter((s): s is string => Boolean(s)));
  for (const slug of cities) for (const l of LOCALES) revalidatePath(`/${l}/villes/${slug}`);
  revalidateSitemaps(["journal"]);
  if (slugs.length) scheduleIndexNow([...localizedUrls("/blog"), ...slugs.flatMap((s) => localizedUrls(`/blog/${s}`))]);
}
