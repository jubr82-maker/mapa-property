// Remise a zero du cookie d'activite a toute nouvelle connexion (oct.
// 2026) : mot de passe, code a 6 chiffres, Passkey, lien e-mail. Le cookie
// est lie a la session qui vient de s'ouvrir (session_id du jeton valide),
// cf. lib/admin/idle.ts. N'echoue jamais : le proxy retombe de toute facon
// sur l'heure d'ouverture de la session.
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_ACTIVITY_COOKIE, ADMIN_ACTIVITY_COOKIE_MAX_AGE_SECONDS } from "@/lib/admin/security-config";
import { formatActivityCookie } from "@/lib/admin/idle";

export async function resetAdminActivity(supabase: SupabaseClient): Promise<void> {
  try {
    const { data } = await supabase.auth.getClaims();
    const sessionId = typeof data?.claims?.session_id === "string" ? data.claims.session_id : null;
    (await cookies()).set(ADMIN_ACTIVITY_COOKIE, formatActivityCookie(sessionId, Date.now()), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/admin",
      maxAge: ADMIN_ACTIVITY_COOKIE_MAX_AGE_SECONDS,
    });
  } catch (e) {
    console.warn("[admin-activity] remise a zero impossible", e instanceof Error ? e.name : "unknown");
  }
}
