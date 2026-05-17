import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchAllBlogPosts } from "@/lib/data";
import { pickLang, type Locale } from "@/lib/types";

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const posts = await fetchAllBlogPosts();
  const t = await getTranslations({ locale, namespace: "blog_page" });

  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-14 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-mid">
            {t("intro")}
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-line bg-bg-soft px-6 py-16 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("empty")}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const title = pickLang(post, "title", locale as Locale);
              const excerpt = pickLang(post, "excerpt", locale as Locale);
              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-line bg-bg transition-colors hover:border-gold"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-bg-deep">
                    {post.cover_image ? (
                      <Image
                        src={post.cover_image}
                        alt={title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    {post.primary_tag && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                        {post.primary_tag}
                      </span>
                    )}
                    <h2 className="line-clamp-2 font-display text-xl font-bold leading-tight text-ink group-hover:text-gold-deep">
                      {title}
                    </h2>
                    {excerpt && (
                      <p className="line-clamp-3 text-sm leading-relaxed text-ink-mid">
                        {excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      {post.published_at && (
                        <time
                          dateTime={post.published_at}
                          className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft"
                        >
                          {new Date(post.published_at).toLocaleDateString(
                            locale === "fr" ? "fr-LU" : locale === "de" ? "de-LU" : "en-US",
                            { year: "numeric", month: "long", day: "numeric" },
                          )}
                        </time>
                      )}
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep group-hover:text-gold">
                        {t("read")} →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
