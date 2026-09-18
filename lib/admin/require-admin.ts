// lib/admin/require-admin.ts — garde admin serveur, à appeler dans la
// MÊME fonction que tout usage de supabaseService() côté admin.
//
// Modèle de sécurité : session Supabase authentifiée + email présent dans
// l'allowlist lib/admin/admin-emails.ts (source unique, partagée avec
// lib/admin/sales-auth.ts). Avant durcissement (cf. commit précédent),
// TOUT utilisateur Supabase Auth authentifié était considéré admin, sans
// vérification d'adresse — un compte créé pour un autre projet sur la
// même base Supabase passait donc requireAdmin/requireAdminPage/
// requireAdminRoute et voyait les données lues en service_role (hors RLS).
//
// Toujours supabase.auth.getUser() (revalide le JWT côté serveur Supabase),
// jamais getSession() seul (getSession ne fait que lire le cookie, sans
// revalidation — usurpable si le cookie est forgé).
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { isAdminEmail } from "@/lib/admin/admin-emails";

async function getAdminUser(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && !isAdminEmail(user.email)) {
    // Jamais l'adresse en clair dans les logs.
    console.warn("admin access denied");
    return { supabase, user: null };
  }
  return { supabase, user };
}

/**
 * À appeler en tête d'une page admin (Server Component). Redirige vers
 * /admin/login si non authentifié OU si l'email n'est pas dans
 * l'allowlist — ne retourne jamais dans ce cas.
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
 * non authentifié ou hors allowlist — à l'appelant de renvoyer son propre
 * type d'erreur (cohérent avec les Result types déjà en place, ex.
 * ConvertResult).
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const { supabase, user } = await getAdminUser();
  if (!user) return { ok: false };
  return { ok: true, supabase, user };
}

/**
 * À appeler en tête d'une route app/api/admin/*. Retourne une NextResponse
 * 403 prête à renvoyer si non authentifié ou hors allowlist.
 */
export async function requireAdminRoute(): Promise<
  { ok: true; supabase: SupabaseClient; user: User } | { ok: false; response: NextResponse }
> {
  const { supabase, user } = await getAdminUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, supabase, user };
}
