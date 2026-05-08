import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchBlogPostBySlug } from "@/lib/data";
import { pickLang, type Locale } from "@/lib/types";
import { BookletReader } from "@/components/blog/BookletReader";

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

  return (
    <div className="px-6 pt-24 pb-16 lg:px-10 lg:pt-32">
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
