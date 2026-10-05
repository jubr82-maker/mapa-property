import { notFound } from "next/navigation";
import { sanitizeArticleHtml } from "@/lib/security/sanitize";
import { brandedTitle, htmlToPlainText, metaDescription } from "@/lib/meta-text";
import { siteShareImage } from "@/lib/og";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchBlogPostBySlug } from "@/lib/data";
import { pickLang, type Locale } from "@/lib/types";
import { BookletReader } from "@/components/blog/BookletReader";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { blogPosting, pageAlternates } from "@/lib/seo";

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
  const shareImage = post.cover_image || siteShareImage();
  return {
    // SEO oct. 2026 : certains meta_title en base finissent deja par
    // "| Mapa Property" ; brandedTitle retire tout suffixe de marque avant
    // d'ajouter l'unique ", MAPA Property". La base n'est pas modifiee.
    title: brandedTitle(title),
    description: description || undefined,
    alternates: pageAlternates(locale, `/blog/${post.slug}`),
    // Open Graph et carte X identiques (titre, description, image).
    openGraph: {
      title: htmlToPlainText(title),
      description: description || undefined,
      url: `/${locale}/blog/${post.slug}`,
      siteName: "MAPA Property",
      type: "article",
      images: [{ url: shareImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: htmlToPlainText(title),
      description: description || undefined,
      images: [shareImage],
    },
  };
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
    image: post.cover_image ?? undefined,
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
        <p className="mx-auto mt-8 max-w-[65ch] font-mono text-[10px] leading-snug text-ink-soft">
          <Link href="/legal/intelligence-artificielle" className="hover:underline">
            {tAi("note_journal")}
          </Link>
        </p>
      </div>
    </div>
  );
}
