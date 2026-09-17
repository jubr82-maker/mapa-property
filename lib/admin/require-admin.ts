// lib/admin/require-admin.ts — garde admin serveur, à appeler dans la
// MÊME fonction que tout usage de supabaseService() côté admin.
//
// Modèle de sécurité actuel (cf. proxy.ts:52-57, app/admin/layout.tsx:54) :
// TOUT utilisateur Supabase Auth authentifié est considéré admin — aucune
// allowlist d'emails ni de rôle pour l'espace admin général (contrairement
// à /admin/ventes-realisees, qui a sa propre allowlist dans
// lib/admin/sales-auth.ts). requireAdmin() reproduit fidèlement ce modèle
// existant, il ne le durcit pas.
//
// Toujours supabase.auth.getUser() (revalide le JWT côté serveur Supabase),
// jamais getSession() seul (getSession ne fait que lire le cookie, sans
// revalidation — usurpable si le cookie est forgé).
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

async function getAdminUser(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * À appeler en tête d'une page admin (Server Component). Redirige vers
 * /admin/login si non authentifié — ne retourne jamais dans ce cas.
 */
export async function requireAdminPage(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const { supabase, user } = await getAdminUser();
  if (!user) redirect("/admin/login");
  return { supabase, user };
}

export type RequireAdminResult =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false };

/**
 * À appeler en tête d'une Server Action admin. Retourne { ok: false } si
 * non authentifié — à l'appelant de renvoyer son propre type d'erreur
 * (cohérent avec les Result types déjà en place, ex. ConvertResult).
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const { supabase, user } = await getAdminUser();
  if (!user) return { ok: false };
  return { ok: true, supabase, user };
}

/**
 * À appeler en tête d'une route app/api/admin/*. Retourne une NextResponse
 * 401 prête à renvoyer si non authentifié.
 */
export async function requireAdminRoute(): Promise<
  { ok: true; supabase: SupabaseClient; user: User } | { ok: false; response: NextResponse }
> {
  const { supabase, user } = await getAdminUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, supabase, user };
}
