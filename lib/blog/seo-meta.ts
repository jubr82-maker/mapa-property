// Titre et description Google d'un article, par langue (oct. 2026).
// Ordre : "Titre Google" / "Description Google" de la langue de la page
// (admin, formulaire Blog), sinon titre et resume de l'article dans CETTE
// langue, sinon titre et description de la page Blog dans cette langue.
// Jamais de repli sur le francais pour EN et DE (avant : meta_title, en
// francais, servait aux trois langues). Jamais de "..." ajoute : le texte
// est repris entier, seuls les blancs sont normalises.
import { brandedTitle, htmlToPlainText } from "@/lib/meta-text";

export type BlogSeoLang = "fr" | "en" | "de";

export type BlogSeoFields = Partial<
  Record<`${"seo_title" | "seo_description" | "title" | "excerpt"}_${BlogSeoLang}`, string | null>
>;

export const SEO_TITLE_ADVISED = 60;
export const SEO_DESCRIPTION_ADVISED = 155;

export function blogLang(locale: string): BlogSeoLang {
  return locale === "en" || locale === "de" ? locale : "fr";
}

export function blogSeoMeta(
  post: BlogSeoFields,
  locale: string,
  fallback: { title: string; description: string },
): { title: string; description: string } {
  const l = blogLang(locale);
  const seoTitle = htmlToPlainText(post[`seo_title_${l}`]);
  const title = seoTitle || (htmlToPlainText(post[`title_${l}`]) ? brandedTitle(post[`title_${l}`]) : fallback.title);
  const description =
    htmlToPlainText(post[`seo_description_${l}`]) || htmlToPlainText(post[`excerpt_${l}`]) || fallback.description;
  return { title, description };
}
