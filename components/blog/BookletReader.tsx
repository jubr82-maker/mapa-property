"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

interface Props {
  title: string;
  coverImage: string | null;
  author: string | null;
  publishedAt: string | null;
  primaryTag: string | null;
  contentHtml: string;
}

// BUG T6 : l'ancien « booklet » paginait l'article horizontalement
// (translateX) -> sur desktop le corps de l'article était décalé hors
// écran à droite => perçu comme « 2 colonnes, la 2e coupée, contenu
// invisible ». Remplacé par une lecture verticale classique, mono-
// colonne, largeur de lecture confortable, typo réduite sur mobile.

export function BookletReader({
  title,
  coverImage,
  author,
  publishedAt,
  primaryTag,
  contentHtml,
}: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("booklet");

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString(
        locale === "fr" ? "fr-LU" : locale === "de" ? "de-LU" : "en-US",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : "";

  return (
    <div className="relative">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/blog`)}
          aria-label={t("close")}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mid transition-colors hover:border-gold hover:text-gold"
        >
          ← {t("close")}
        </button>
      </div>

      <article className="overflow-hidden rounded-2xl border border-line bg-bg shadow-lg shadow-ink/5">
        {/* En-tête / cover */}
        <header className="px-5 py-8 sm:px-10 sm:py-14">
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 sm:gap-6">
            {primaryTag && (
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                {primaryTag}
              </span>
            )}
            <h1 className="font-display text-2xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            {coverImage && (
              // eslint-disable-next-line @next/next/no-img-element -- cover dans l'article, pas LCP above-the-fold
              <img
                src={coverImage}
                alt={title}
                className="aspect-[16/9] w-full rounded-xl object-cover"
                loading="eager"
              />
            )}
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft sm:text-[11px]">
              {[author, formattedDate].filter(Boolean).join(" · ")}
            </p>
          </div>
        </header>

        {/* Corps de l'article — lecture verticale mono-colonne */}
        <div
          className="prose-mapa px-5 pb-12 sm:px-10 sm:pb-16"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </div>
  );
}
