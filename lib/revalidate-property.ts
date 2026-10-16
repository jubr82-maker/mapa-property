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
import { blogSlugLower } from "@/lib/blog/slug";
import { propertyPaths } from "@/lib/listing/property-paths";

/**
 * `propertyId` (facultatif) : bien publie ou modifie, signale a IndexNow
 * (fiche dans les trois langues et liste des biens) apres la reponse.
 */
export function revalidatePublicPropertyPages(propertyId?: string | null): void {
  if (propertyId) {
    scheduleIndexNow(async () => {
      const { data } = await supabaseService()
        .from("properties")
        .select("slug,is_published,property_type,transaction,bedrooms,surface,city,price")
        .eq("id", propertyId)
        .maybeSingle();
      const row = data as ({ slug: string | null; is_published: boolean | null } & Record<string, unknown>) | null;
      const urls = localizedUrls("/biens");
      if (row?.slug) {
        // Adresse lisible de chaque langue (lib/listing/property-paths.ts).
        const paths = propertyPaths({
          slug: row.slug,
          property_type: (row.property_type as string | null) ?? null,
          transaction: (row.transaction as string | null) ?? null,
          bedrooms: (row.bedrooms as number | null) ?? null,
          surface: (row.surface as number | null) ?? null,
          city: (row.city as string | null) ?? null,
          price: (row.price as number | null) ?? null,
        });
        for (const l of ["fr", "en", "de"] as const) {
          const u = localizedUrls(paths[l]).find((x) => x.includes(`/${l}/`));
          if (u) urls.push(u);
        }
      }
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
  // Sitemap : un article publie ou modifie y apparait sans nouveau build.
  revalidatePath("/sitemap.xml");
  if (postId) {
    scheduleIndexNow(async () => {
      const { data } = await supabaseService()
        .from("blog_posts")
        .select("slug")
        .eq("id", postId)
        .maybeSingle();
      const raw = (data as { slug: string | null } | null)?.slug;
      const slug = raw ? blogSlugLower(raw) : null;
      return [...localizedUrls("/blog"), ...(slug ? localizedUrls(`/blog/${slug}`) : [])];
    });
  }
}
