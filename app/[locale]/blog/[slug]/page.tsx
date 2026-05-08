import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchBlogPostBySlug } from "@/lib/data";
import { pickLang, type Locale } from "@/lib/types";
import { BookletReader } from "@/components/blog/BookletReader";
import { JsonLd } from "@/components/seo/JsonLd";
import { blogPosting, breadcrumb } from "@/lib/seo";

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
  const description =
    post.meta_description ?? pickLang(post, "excerpt", locale as Locale);
  return {
    title: `${title} — MAPA Property`,
    description,
    openGraph: post.cover_image
      ? { images: [{ url: post.cover_image }] }
      : undefined,
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
  const breadcrumbJsonLd = breadcrumb([
    { name: "MAPA Property", url: `${SITE_URL}/${locale}` },
    { name: "Blog", url: `${SITE_URL}/${locale}/blog` },
    { name: title, url: `${SITE_URL}/${locale}/blog/${post.slug}` },
  ]);

  return (
    <div className="px-6 pt-24 pb-16 lg:px-10 lg:pt-32">
      <JsonLd data={[articleJsonLd, breadcrumbJsonLd]} />
      <div className="mx-auto max-w-4xl">
        <BookletReader
          title={title}
          coverImage={post.cover_image}
          author={post.author}
          publishedAt={post.published_at}
          primaryTag={post.primary_tag}
          contentHtml={content}
        />
      </div>
    </div>
  );
}
