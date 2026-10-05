// Invalidation des pages publiques d'un bien (oct. 2026). A appeler par
// toute action admin qui modifie un bien, ses photos ou sa video.
//
// Cause corrigee : les actions n'invalidaient que /fr/biens/<slug>. Une
// fiche est aussi servie sous /en et /de, et sous son identifiant Apimo
// numerique (ex. /fr/biens/86388715, resolu par fetchPropertyByIdOrSlug) :
// ces pages restaient en cache jusqu'a 24 h (revalidate = 86400). Le motif
// de route "/[locale]/biens/[slug]" avec le type "page" invalide toutes les
// fiches, toutes langues et tous identifiants confondus
// (node_modules/next/dist/docs/.../revalidatePath.md) ; chacune n'est
// regeneree qu'a sa prochaine visite.
import { revalidatePath, revalidateTag } from "next/cache";
import { PROPERTIES_LIST_TAG } from "@/lib/data";
import { localizedUrls, scheduleIndexNow } from "@/lib/indexnow";
import { supabaseService } from "@/lib/supabase-service";

/**
 * `propertyId` (facultatif) : bien publie ou modifie, signale a IndexNow
 * (fiche dans les trois langues et liste des biens) apres la reponse.
 */
export function revalidatePublicPropertyPages(propertyId?: string | null): void {
  if (propertyId) {
    scheduleIndexNow(async () => {
      const { data } = await supabaseService()
        .from("properties")
        .select("slug,is_published")
        .eq("id", propertyId)
        .maybeSingle();
      const row = data as { slug: string | null; is_published: boolean | null } | null;
      const urls = localizedUrls("/biens");
      if (row?.slug) urls.push(...localizedUrls(`/biens/${row.slug}`));
      return urls;
    });
  }
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/[locale]/biens/[slug]", "page");
  revalidatePath("/[locale]/biens", "page");
  revalidatePath("/[locale]/villes/[ville]", "page");
  revalidatePath("/[locale]", "page");
}

/** Articles du blog : liste, articles, accueil (apercu) ; IndexNow si `postId`. */
export function revalidatePublicBlogPages(postId?: string | null): void {
  revalidatePath("/[locale]/blog", "page");
  revalidatePath("/[locale]/blog/[slug]", "page");
  revalidatePath("/[locale]", "page");
  if (postId) {
    scheduleIndexNow(async () => {
      const { data } = await supabaseService()
        .from("blog_posts")
        .select("slug")
        .eq("id", postId)
        .maybeSingle();
      const slug = (data as { slug: string | null } | null)?.slug;
      return [...localizedUrls("/blog"), ...(slug ? localizedUrls(`/blog/${slug}`) : [])];
    });
  }
}
