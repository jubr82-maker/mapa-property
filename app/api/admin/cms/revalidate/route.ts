import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SITE_CONTENT_TAG, SITE_DESIGN_TOKENS_TAG } from "@/lib/site-content";

/**
 * POST /api/admin/cms/revalidate
 * Vide le cache CMS — utilisé depuis le bouton "Vider cache" de
 * /admin/contenu. Force la prochaine requête à recharger les rows
 * site_content + site_design_tokens et invalide le layout racine.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Next 16 : revalidateTag exige un 2e arg `profile`. `{ expire: 0 }`
  // = invalidation immédiate (équivalent ancienne signature 1-arg).
  revalidateTag(SITE_CONTENT_TAG, { expire: 0 });
  revalidateTag(SITE_DESIGN_TOKENS_TAG, { expire: 0 });
  // Invalide le layout racine (couleurs/fonts injectées dans <head>).
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true });
}
