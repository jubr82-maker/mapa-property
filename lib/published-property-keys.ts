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
