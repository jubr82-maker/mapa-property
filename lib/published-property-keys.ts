// Identifiants publics des biens publies (oct. 2026) -> slug canonique.
// Utilise par proxy.ts pour rediriger les anciennes fiches (identifiant
// Apimo en fin d'adresse) directement vers la fiche actuelle, ou vers la
// liste des biens si le bien n'est plus publie.
//
// Lecture anonyme (biens publies seulement). Cache memoire de 5 minutes par
// instance : simple optimisation. Toute erreur -> table vide : l'ancienne
// adresse mene alors a la liste des biens, jamais a une erreur.
import { createClient } from "@supabase/supabase-js";

const TTL_MS = 5 * 60_000;
let cache: { at: number; map: Map<string, string> } | null = null;

export async function getPublishedPropertySlugByKey(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const map = new Map<string, string>();
  if (url && key) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await sb
        .from("properties")
        .select("id,slug,apimo_id,apimo_ref")
        .eq("is_published", true);
      if (!error && data) {
        for (const r of data as { id: string; slug: string | null; apimo_id: string | number | null; apimo_ref: string | number | null }[]) {
          const slug = r.slug || r.id;
          map.set(r.id, slug);
          if (r.slug) map.set(r.slug, slug);
          if (r.apimo_id !== null && r.apimo_id !== undefined) map.set(String(r.apimo_id), slug);
          if (r.apimo_ref !== null && r.apimo_ref !== undefined) map.set(String(r.apimo_ref), slug);
        }
      }
    } catch {
      // Silencieux : redirection vers la liste des biens.
    }
  }
  cache = { at: Date.now(), map };
  return map;
}
