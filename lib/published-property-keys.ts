// Identifiants publics des biens publies (oct. 2026) -> adresse actuelle de
// la fiche dans chaque langue. Utilise par proxy.ts pour rediriger les
// anciennes fiches (identifiant Apimo en fin d'adresse) directement vers la
// fiche actuelle, en une seule redirection, ou vers la liste des biens si
// le bien n'est plus publie.
//
// Lecture anonyme (biens publies seulement). Cache memoire de 5 minutes par
// instance : simple optimisation. Toute erreur -> table vide (journalisee) :
// l'ancienne adresse mene alors a la liste des biens, jamais a une erreur.
//
// Oct. 2026 : la colonne apimo_ref n'existe pas (erreur 42703) ; sa lecture
// faisait echouer la requete entiere, et toutes les anciennes fiches
// menaient a la liste des biens.
import { createClient } from "@supabase/supabase-js";
import { propertyPaths } from "@/lib/listing/property-paths-core";
import type { ListingLang } from "@/lib/listing/listing-data";

export type PropertyPathsByLang = Record<ListingLang, string>;

const TTL_MS = 5 * 60_000;
const COLUMNS = "id,slug,apimo_id,property_type,transaction,bedrooms,surface,living_surface,city,price,price_on_demand";
let cache: { at: number; map: Map<string, PropertyPathsByLang> } | null = null;

type Row = {
  id: string;
  slug: string | null;
  apimo_id: string | number | null;
  property_type: string | null;
  transaction: string | null;
  bedrooms: number | null;
  surface: number | null;
  living_surface: number | null;
  city: string | null;
  price: number | null;
  price_on_demand: boolean | null;
};

export async function getPublishedPropertyPathsByKey(): Promise<Map<string, PropertyPathsByLang>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const map = new Map<string, PropertyPathsByLang>();
  let ok = false;
  if (url && key) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await sb.from("properties").select(COLUMNS).eq("is_published", true);
      if (error) console.error("[legacy] biens publies : lecture impossible", { code: error.code ?? null });
      else {
        ok = true;
        for (const r of (data as Row[] | null) ?? []) {
          const slug = r.slug || r.id;
          const paths = propertyPaths({
            slug,
            property_type: r.property_type,
            transaction: r.transaction,
            bedrooms: r.bedrooms,
            surface: r.surface,
            living_surface: r.living_surface,
            city: r.city,
            price: r.price,
            price_on_demand: r.price_on_demand ?? false,
          });
          map.set(r.id, paths);
          if (r.slug) map.set(r.slug, paths);
          if (r.apimo_id !== null && r.apimo_id !== undefined) map.set(String(r.apimo_id), paths);
          // Adresses actuelles des trois langues (oct. 2026) : le proxy
          // reconnait ainsi une fiche existante sans la rendre.
          for (const l of ["fr", "en", "de"] as const) map.set(paths[l].replace(/^\/biens\//, ""), paths);
        }
      }
    } catch (e) {
      console.error("[legacy] biens publies : lecture impossible", e instanceof Error ? e.message : String(e));
    }
  }
  // Echec : pas de cache, nouvel essai a la requete suivante.
  if (ok) cache = { at: Date.now(), map };
  return map;
}

// --- Adresses inconnues (oct. 2026, quotas Vercel) ---------------------------
// Une fiche ou un bien off-market inexistant ne doit plus creer d'entree de
// cache ISR (une 404 mise en cache par adresse essayee par un robot). Le
// proxy les reconnait ici et sert une 404 rendue a la demande, non mise en
// cache. Une adresse absente est relue une fois (30 s au plus entre deux
// relectures) pour qu'un bien tout juste publie soit reconnu aussitot.
const MISS_REFRESH_MS = 30_000;
let lastMissRefresh = 0;

export type PropertyLookup =
  | { kind: "canonical" }
  | { kind: "alias"; paths: PropertyPathsByLang }
  | { kind: "unknown" }
  | { kind: "unavailable" };

/** Segment d'adresse /<langue>/biens/<segment> : adresse actuelle, ancienne adresse, inconnue. */
export async function lookupPublishedProperty(locale: ListingLang, segment: string): Promise<PropertyLookup> {
  let map = await getPublishedPropertyPathsByKey();
  let paths = map.get(segment);
  if (!paths && Date.now() - lastMissRefresh > MISS_REFRESH_MS) {
    lastMissRefresh = Date.now();
    cache = null;
    map = await getPublishedPropertyPathsByKey();
    paths = map.get(segment);
  }
  if (!cache) return { kind: "unavailable" };
  if (!paths) return { kind: "unknown" };
  return paths[locale] === `/biens/${segment}` ? { kind: "canonical" } : { kind: "alias", paths };
}

let offCache: { at: number; ids: Set<string> } | null = null;
let lastOffMissRefresh = 0;

async function loadOffmarketIds(): Promise<Set<string> | null> {
  if (offCache && Date.now() - offCache.at < TTL_MS) return offCache.ids;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await sb.from("properties_offmarket_public").select("id");
    if (error) {
      console.error("[legacy] biens off-market : lecture impossible", { code: error.code ?? null });
      return null;
    }
    offCache = { at: Date.now(), ids: new Set(((data as { id: string }[] | null) ?? []).map((r) => r.id)) };
    return offCache.ids;
  } catch (e) {
    console.error("[legacy] biens off-market : lecture impossible", e instanceof Error ? e.message : String(e));
    return null;
  }
}

/** Bien off-market publie ? null si la liste est illisible (la page decide alors). */
export async function isPublishedOffmarketId(id: string): Promise<boolean | null> {
  let ids = await loadOffmarketIds();
  if (ids && !ids.has(id) && Date.now() - lastOffMissRefresh > MISS_REFRESH_MS) {
    lastOffMissRefresh = Date.now();
    offCache = null;
    ids = await loadOffmarketIds();
  }
  return ids ? ids.has(id) : null;
}
