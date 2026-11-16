// Slug unique d'un bien saisi dans l'admin (deplace de
// app/admin/properties/actions.ts en nov. 2026 pour servir aussi a l'import
// d'une annonce collee). Serveur seulement.
import type { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export function slugify(input: string): string {
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
 * base avant de retourner, retry avec un nouveau suffixe en cas de
 * collision (improbable, mais vérifié plutôt que supposé).
 */
export async function generateUniquePropertySlug(
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

