import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { seoPageMetadata } from "@/lib/seo-page-meta";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { SearchCard } from "@/components/searches/SearchCard";
import { fetchPublicSearches } from "@/lib/searches/data";

// Nos recherches en cours (oct. 2026) : recherches publiees avec l'accord
// des clients (anonymes, budget en fourchette). Mise a jour a chaque
// changement dans l'admin (etiquette property-searches) et au plus tard
// toutes les heures.
// Quotas Vercel (oct. 2026, docs/vercel-quotas.md) : revalidation a la
// demande quand le contenu change ; minuterie de secours de 30 jours seulement.
export const revalidate = 2592000;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return seoPageMetadata(locale, "searches", "/recherches");
}

export default async function SearchesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "searches_page" });
  const searches = await fetchPublicSearches();

  return (
    <>
      <PageBreadcrumb locale={locale} path="/recherches" />
      <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
        <div className="mx-auto max-w-6xl">
          <header className="mb-12 max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">{t("eyebrow")}</p>
            <h1 className="mt-2 t-h1">{t("title")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-mid sm:text-lg">{t("intro")}</p>
            <p className="mt-3 text-sm text-ink-soft">{t("anonymous_note")}</p>
          </header>
          {searches.length === 0 ? (
            <div className="rounded-2xl border border-line bg-bg-soft p-8">
              <p className="text-base text-ink-mid">{t("empty")}</p>
              <Link
                href="/mandats/recherche"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 font-sans text-[13px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-navy-deep"
              >
                {t("empty_cta")}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
              {searches.map((s) => (
                <li key={s.id}>
                  <SearchCard search={s} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
