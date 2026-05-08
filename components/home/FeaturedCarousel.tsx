import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PropertyCard } from "@/components/property/PropertyCard";
import type { PropertyWithCover } from "@/lib/data";
import type { Locale } from "@/lib/types";

interface Props {
  properties: PropertyWithCover[];
  locale: Locale;
}

export function FeaturedCarousel({ properties, locale }: Props) {
  const t = useTranslations("featured");

  if (properties.length === 0) {
    return null;
  }

  return (
    <section className="px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
              {t("eyebrow")}
            </p>
            <h2 className="mt-2 font-display text-4xl font-black leading-tight tracking-tight text-ink sm:text-5xl">
              {t("title")}
            </h2>
            <p className="mt-3 max-w-xl text-base text-ink-mid">{t("subtitle")}</p>
          </div>
          <Link
            href="/biens"
            className="self-start font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-deep transition-colors hover:text-gold sm:self-end"
          >
            {t("see_all")} →
          </Link>
        </div>

        <div className="-mx-6 overflow-x-auto pb-4 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:-mx-10">
          <div className="flex w-max gap-5 px-6 lg:px-10">
            {properties.map((p, i) => (
              <article
                key={p.id}
                className="w-[80vw] max-w-sm shrink-0 snap-center sm:w-[420px]"
              >
                <PropertyCard property={p} locale={locale} priority={i === 0} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
