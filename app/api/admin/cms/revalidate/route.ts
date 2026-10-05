import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SITE_CONTENT_TAG, SITE_DESIGN_TOKENS_TAG } from "@/lib/site-content";
import { requireAdminRoute } from "@/lib/admin/require-admin";

/**
 * POST /api/admin/cms/revalidate
 * Vide le cache CMS, utilisé depuis le bouton "Actualiser le site" de
 * /admin/contenu. Force la prochaine requête à recharger les rows
 * site_content + site_design_tokens.
 *
 * Sprint OPTIM-1A : suppression de revalidatePath("/", "layout") qui
 * invalidait les 261 pages SSG d'un coup (bombe nucleaire). Les 2
 * revalidateTag suffisent : les Server Components qui consomment
 * siteContent()/siteDesignTokens() relisent au prochain render, et
 * comme le cache est en revalidate: false (cf. lib/site-content.ts),
 * c'est strictement le tag-invalidate qui pilote la fraicheur.
 */
export async function POST() {
  // Messages d'erreur affiches a l'ecran, dans la langue de l'admin.
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_cms" });
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t("api_unauthorized") }, { status: 401 });
  }
  // Oct. 2026 : connecte ne suffit pas. Compte de la liste admin ET
  // session aal2 (double authentification), comme le reste de l'admin.
  const adminCheck = await requireAdminRoute();
  if (!adminCheck.ok) return adminCheck.response;

  // Next 16 : revalidateTag exige un 2e arg `profile`. `{ expire: 0 }`
  // = invalidation immédiate (équivalent ancienne signature 1-arg).
  revalidateTag(SITE_CONTENT_TAG, { expire: 0 });
  revalidateTag(SITE_DESIGN_TOKENS_TAG, { expire: 0 });

  return NextResponse.json({ ok: true });
}
