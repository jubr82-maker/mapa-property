// Biens archives (oct. 2026) : identifiants publics (slug, id, apimo_id)
// des biens dont `archived_at` est renseigne. Utilise par le proxy pour
// repondre 410 sur leur fiche publique. Lecture service_role (les biens
// archives sont depublies, donc invisibles en lecture anonyme).
//
// Cache memoire de 60 s par instance : simple optimisation, jamais une
// source de verite. Toute erreur (colonne absente avant le SQL, reseau,
// cle manquante) -> ensemble vide : le site se comporte comme avant.

import { createClient } from "@supabase/supabase-js";

const TTL_MS = 60_000;
let cache: { at: number; keys: Set<string> } | null = null;

export async function getArchivedPropertyKeys(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.keys;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keys = new Set<string>();
  if (url && key) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await sb
        .from("properties")
        .select("id,slug,apimo_id")
        .not("archived_at", "is", null);
      if (!error && data) {
        for (const r of data as { id: string; slug: string | null; apimo_id: string | number | null }[]) {
          keys.add(r.id);
          if (r.slug) keys.add(r.slug);
          if (r.apimo_id !== null && r.apimo_id !== undefined) keys.add(String(r.apimo_id));
        }
      }
    } catch {
      // Silencieux : aucun bien considere comme archive.
    }
  }
  cache = { at: Date.now(), keys };
  return keys;
}

/** A appeler apres archivage, restauration ou suppression (meme instance). */
export function invalidateArchivedPropertyKeys(): void {
  cache = null;
}
