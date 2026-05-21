import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickLang, type BlogPost, type Locale } from "@/lib/types";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";

interface Props {
  posts: BlogPost[];
  locale: Locale;
}

export function BlogTeaser({ posts, locale }: Props) {
  const t = useTranslations("blog_teaser");

  if (posts.length === 0) return null;

  return (
    <section className="px-6 py-5 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-12">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
              {t("eyebrow")}
            </p>
            <h2 className="mt-2 t-h2">
              {t("title")}
            </h2>
            <SignatureLine />
          </div>
          <Link
            href="/blog"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep hover:text-gold md:text-xs"
          >
            {t("see_all")} →
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-6 lg:grid-cols-3">
          {posts.map((post, idx) => {
            const title = pickLang(post, "title", locale);
            const excerpt = pickLang(post, "excerpt", locale);
            return (
              <FadeInOnScroll key={post.id} delay={idx * 250}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg transition-colors hover:border-gold"
              >
                <div className="relative h-24 overflow-hidden bg-bg-deep sm:h-auto sm:aspect-[4/3]">
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
                <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4 md:gap-3 md:p-6">
                  {post.primary_tag && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                      {post.primary_tag}
                    </span>
                  )}
                  <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-ink group-hover:text-gold-deep md:text-xl">
                    {title}
                  </h3>
                  {excerpt && (
                    <p className="hidden text-sm leading-relaxed text-ink-mid sm:line-clamp-3 sm:block">
                      {excerpt}
                    </p>
                  )}
                  {post.published_at && (
                    <time
                      dateTime={post.published_at}
                      className="mt-auto font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft"
                    >
                      {new Date(post.published_at).toLocaleDateString("fr-LU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  )}
                </div>
              </Link>
              </FadeInOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
