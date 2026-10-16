import { notFound } from "next/navigation";
import { sanitizeArticleHtml } from "@/lib/security/sanitize";
import { brandedTitle, metaDescription } from "@/lib/meta-text";
import { siteShareImage } from "@/lib/og";
import { displayableImageSrc } from "@/lib/image-hosts";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchBlogPostBySlug } from "@/lib/data";
import { pickLang, type Locale } from "@/lib/types";
import { BookletReader } from "@/components/blog/BookletReader";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { blogPosting, pageAlternates } from "@/lib/seo";
import { FaqSection } from "@/components/faq/FaqSection";
import { withSocial } from "@/lib/seo-page-meta";
import { blogFaqKey } from "@/lib/faq/keys";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await fetchBlogPostBySlug(slug);
  if (!post) return {};
  const title = post.meta_title ?? pickLang(post, "title", locale as Locale);
  const description = metaDescription(
    post.meta_description ?? pickLang(post, "excerpt", locale as Locale),
  );
  // og:image : la couverture de l'article (adresse verifiee), sinon l'image du site.
  const shareImage = displayableImageSrc(post.cover_image) ?? siteShareImage();
  // Balises de partage = titre et description de la page (withSocial).
  return withSocial(locale, {
    // SEO oct. 2026 : certains meta_title en base finissent deja par
    // "| Mapa Property" ; brandedTitle retire tout suffixe de marque avant
    // d'ajouter l'unique ", MAPA Property". La base n'est pas modifiee.
    title: brandedTitle(title),
    description: description || undefined,
    alternates: pageAlternates(locale, `/blog/${post.slug}`),
  }, { type: "article", image: shareImage });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await fetchBlogPostBySlug(slug);
  if (!post) notFound();

  await getTranslations({ locale, namespace: "booklet" });
  const tAi = await getTranslations({ locale, namespace: "ai_transparency" });

  const title = pickLang(post, "title", locale as Locale);
  const content = pickLang(post, "content", locale as Locale);
  const excerpt = pickLang(post, "excerpt", locale as Locale);

  const articleJsonLd = blogPosting({
    title,
    description: excerpt || title,
    url: `${SITE_URL}/${locale}/blog/${post.slug}`,
    image: displayableImageSrc(post.cover_image) ?? undefined,
    publishedAt: post.published_at,
    author: post.author,
  });
  return (
    <div className="px-6 pt-24 pb-16 lg:px-10 lg:pt-32">
      <JsonLd data={articleJsonLd} />
      <PageBreadcrumb locale={locale} path={`/blog/${post.slug}`} current={title} />
      {/* NAV6 : sur Mac le conteneur respire (90% viewport) ; le texte
          reste lisible (prose-mapa cappe à 65ch en interne). */}
      <div className="mx-auto max-w-4xl lg:max-w-[90vw] xl:max-w-[1400px]">
        <BookletReader
          title={title}
          coverImage={post.cover_image}
          author={post.author}
          publishedAt={post.published_at}
          primaryTag={post.primary_tag}
          // Assaini cote serveur (OWASP ASVS 5.2.1) avant injection.
          contentHtml={sanitizeArticleHtml(content)}
        />
        <FaqSection pageKey={blogFaqKey(post.slug)} locale={locale} className="mx-auto mt-16 max-w-[65ch]" />
        <p className="mx-auto mt-8 max-w-[65ch] font-mono text-[10px] leading-snug text-ink-soft">
          <Link href="/legal/intelligence-artificielle" className="hover:underline">
            {tAi("note_journal")}
          </Link>
        </p>
      </div>
    </div>
  );
}
